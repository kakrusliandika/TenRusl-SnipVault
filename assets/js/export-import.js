/*!
 * TenRusl SnipVault — Export/Import Utilities (FINAL+FIX)
 * - Tidak auto-bind tombol; UI binding dipegang vault.js (hindari dialog dobel)
 * - Dedup id+hash+title, parse tolerant (BOM/JSON/LZString)
 * - Ekspor .json atau .lzjson (opsional)
 */
(function (global) {
    "use strict";

    var EXPORT_TYPE = "snipvault.export";
    var VERSION = 1;

    if (global.__SV_IMPORT_BUSY__ == null) global.__SV_IMPORT_BUSY__ = false;
    if (global.__SV_EXPORT_BUSY__ == null) global.__SV_EXPORT_BUSY__ = false;

    function todayISO() {
        return new Date().toISOString().slice(0, 10);
    }
    function toBlob(text, mime) {
        return new Blob([text], { type: mime || "application/json;charset=utf-8" });
    }
    function downloadBlob(filename, blob) {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            URL.revokeObjectURL(a.href);
            a.remove();
        }, 0);
    }

    function djb2(str) {
        var h = 5381,
            i = str.length;
        while (i) h = (h * 33) ^ str.charCodeAt(--i);
        return (h >>> 0).toString(36);
    }
    function hashSnippet(s) {
        var key = [
            String(s.title || "")
                .toLowerCase()
                .trim(),
            s.language || "",
            Array.isArray(s.tags) ? s.tags.slice().sort().join(",") : "",
            s.content || "",
        ].join("|");
        return djb2(key);
    }

    function normalizeImportedSnippet(s) {
        return {
            id: s.id,
            title: String(s.title || "").trim(),
            language: String(s.language || "plaintext"),
            content: String(s.content || ""),
            tags: Array.isArray(s.tags)
                ? s.tags
                      .map(function (x) {
                          return String(x || "").trim();
                      })
                      .filter(Boolean)
                : [],
            notes: String(s.notes || ""),
            favorite: s.favorite === true || s.favorite === 1 ? 1 : 0,
            pinned: s.pinned === true || s.pinned === 1 ? 1 : 0,
            created_at: Number(s.created_at || Date.now()),
            updated_at: Number(s.updated_at || Date.now()),
        };
    }

    function validatePayload(payload) {
        var errors = [];
        if (!payload || typeof payload !== "object") return { valid: false, errors: ["Payload bukan objek"] };
        if (payload.type !== EXPORT_TYPE) errors.push('type harus "' + EXPORT_TYPE + '"');
        if (payload.version !== VERSION) errors.push("version harus " + VERSION);
        if (!Array.isArray(payload.items)) errors.push("items harus array");
        if (Array.isArray(payload.items)) {
            for (var i = 0; i < payload.items.length; i++) {
                var s = payload.items[i];
                if (!s || typeof s !== "object") {
                    errors.push("items[" + i + "] bukan object");
                    continue;
                }
                if (typeof s.title !== "string") errors.push("items[" + i + "].title wajib string");
                if (typeof s.language !== "string") errors.push("items[" + i + "].language wajib string");
                if (typeof s.content !== "string") errors.push("items[" + i + "].content wajib string");
                if (!Array.isArray(s.tags)) errors.push("items[" + i + "].tags wajib array");
                if (typeof s.created_at !== "number") errors.push("items[" + i + "].created_at wajib number");
                if (typeof s.updated_at !== "number") errors.push("items[" + i + "].updated_at wajib number");
            }
        }
        return { valid: errors.length === 0, errors: errors };
    }

    function detectConflicts(items) {
        return SVDB.listSnippets({}).then(function (existing) {
            var titleMap = new Map(),
                hashMap = new Map();
            (existing || []).forEach(function (s) {
                var key = String(s.title || "")
                    .toLowerCase()
                    .trim();
                if (key) titleMap.set(key, s);
                hashMap.set(hashSnippet(s), s);
            });
            var conflicts = [];
            (items || []).forEach(function (x) {
                var norm = normalizeImportedSnippet(x);
                var byTitle = titleMap.get(norm.title.toLowerCase().trim());
                var byHash = hashMap.get(hashSnippet(norm));
                if (byTitle || byHash) {
                    conflicts.push({
                        incoming: norm,
                        exists: byHash || byTitle,
                        reason: byHash ? "hash-match" : "title-match",
                    });
                }
            });
            return { conflicts: conflicts, titleMap: titleMap, hashMap: hashMap };
        });
    }

    function tryParseJSONLoose(text) {
        var t = String(text || "")
            .replace(/^\uFEFF/, "")
            .trim();
        if (!t) return { ok: false, error: new Error("Kosong") };
        if (t[0] === "{" || t[0] === "[") {
            try {
                return { ok: true, value: JSON.parse(t) };
            } catch (e) {}
        }
        if (global.LZString && typeof global.LZString.decompressFromUTF16 === "function") {
            try {
                var dec = global.LZString.decompressFromUTF16(t);
                if (dec && (dec[0] === "{" || dec[0] === "[")) return { ok: true, value: JSON.parse(dec) };
            } catch (_) {}
        }
        try {
            return { ok: true, value: JSON.parse(t) };
        } catch (e) {
            return { ok: false, error: e };
        }
    }

    function importPayload(payload, opts) {
        opts = opts || {};
        var strategy = opts.strategy || "skip";
        var dedupByTitle = !!opts.dedupByTitle;
        var previewOnly = !!opts.previewOnly;

        var v = validatePayload(payload);
        if (!v.valid) return Promise.reject(new Error("Validasi gagal: " + v.errors.join("; ")));

        var items = payload.items.map(normalizeImportedSnippet);

        (function () {
            var seenId = new Set(),
                seenHash = new Set(),
                seenTitle = new Set(),
                cleaned = [];
            for (var i = 0; i < items.length; i++) {
                var it = items[i];
                var idKey = it.id ? String(it.id) : "";
                var hKey = hashSnippet(it);
                var tKey = it.title.toLowerCase().trim();

                if (idKey && seenId.has(idKey)) continue;
                if (seenHash.has(hKey)) continue;
                if (dedupByTitle && tKey && seenTitle.has(tKey)) continue;

                if (idKey) seenId.add(idKey);
                seenHash.add(hKey);
                if (tKey) seenTitle.add(tKey);
                cleaned.push(it);
            }
            items = cleaned;
        })();

        return detectConflicts(items).then(function (res) {
            var conflicts = res.conflicts;
            if (previewOnly) return { ok: true, previewOnly: true, total: items.length, conflicts: conflicts };

            var toImport = [],
                skipped = 0;
            for (var i = 0; i < items.length; i++) {
                var it = items[i];
                var hasConflict = conflicts.find(function (c) {
                    return (
                        c.incoming.title.toLowerCase().trim() === it.title.toLowerCase().trim() ||
                        hashSnippet(c.incoming) === hashSnippet(it)
                    );
                });

                if (!hasConflict) {
                    toImport.push(it);
                    continue;
                }

                if (strategy === "always-insert") {
                    delete it.id;
                    toImport.push(it);
                    continue;
                }
                if (strategy === "overwrite-id") {
                    if (hasConflict.exists && hasConflict.exists.id === it.id && it.id != null) toImport.push(it);
                    else skipped++;
                    continue;
                }
                skipped++; // default: skip
            }

            if (dedupByTitle) {
                var seen = new Set();
                toImport = toImport.filter(function (x) {
                    var key = x.title.toLowerCase().trim();
                    if (!key || seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
            }

            var payload2 = { type: EXPORT_TYPE, version: VERSION, generated_at: Date.now(), items: toImport };
            return SVDB.importJSON(payload2, { mode: "apply", dedupByTitle: dedupByTitle, strategy: strategy }).then(
                function () {
                    return {
                        ok: true,
                        imported: toImport.length,
                        skipped: skipped,
                        total: items.length,
                        conflicts: conflicts,
                    };
                }
            );
        });
    }

    function openFile(accept) {
        return new Promise(function (resolve) {
            var inp = document.createElement("input");
            inp.type = "file";
            inp.accept = accept || ".json,.lzjson,application/json,text/plain";
            inp.addEventListener(
                "change",
                function () {
                    resolve(inp.files && inp.files[0] ? inp.files[0] : null);
                },
                { once: true }
            );
            inp.click();
        });
    }
    function readFileText(file) {
        return new Promise(function (resolve, reject) {
            var r = new FileReader();
            r.onload = function () {
                resolve(String(r.result || ""));
            };
            r.onerror = function (e) {
                reject(e);
            };
            r.readAsText(file, "utf-8");
        });
    }
    function openFileAndImport(opts) {
        opts = opts || {};
        return openFile(".json,.lzjson,application/json,text/plain").then(function (file) {
            if (!file) return { ok: false, reason: "no-file" };
            var name = (file.name || "").toLowerCase();
            if (name.endsWith(".zip")) return { ok: false, reason: "zip-not-supported" };
            return readFileText(file).then(function (txt) {
                var parsed = tryParseJSONLoose(txt);
                if (!parsed.ok) return { ok: false, reason: "json-parse", error: parsed.error && parsed.error.message };
                return importPayload(parsed.value, opts);
            });
        });
    }

    function doExport(ids, opts) {
        opts = opts || {};
        var compress = !!opts.compress;
        return SVDB.exportJSON(Array.isArray(ids) && ids.length ? ids : null).then(function (payload) {
            payload.generated_at = Date.now();
            var json = JSON.stringify(payload, null, 2);
            if (compress && global.LZString && typeof global.LZString.compressToUTF16 === "function") {
                var packed = global.LZString.compressToUTF16(json);
                var name =
                    (opts.filename || (ids ? "snipvault-selection-" : "snipvault-export-")) + todayISO() + ".lzjson";
                downloadBlob(name, toBlob(packed, "text/plain;charset=utf-8"));
                return { ok: true, count: (payload.items || []).length, compressed: true };
            } else {
                var name2 =
                    (opts.filename || (ids ? "snipvault-selection-" : "snipvault-export-")) + todayISO() + ".json";
                downloadBlob(name2, toBlob(json, "application/json;charset=utf-8"));
                return { ok: true, count: (payload.items || []).length, compressed: false };
            }
        });
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>\"']/g, function (ch) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
        });
    }
    function previewHTML(summary) {
        if (!summary) return "<div class='sv-preview-empty'>Tidak ada ringkasan.</div>";
        var html = [];
        html.push("<div class='sv-preview'>");
        html.push("<p><strong>Total:</strong> " + (summary.total | 0) + "</p>");
        if (typeof summary.imported === "number")
            html.push("<p><strong>Diimpor:</strong> " + summary.imported + "</p>");
        if (typeof summary.skipped === "number") html.push("<p><strong>Diskip:</strong> " + summary.skipped + "</p>");
        var conflicts = summary.conflicts || [];
        if (conflicts.length) {
            html.push("<h4>Konflik (" + conflicts.length + ")</h4><ol class='sv-conflicts'>");
            for (var i = 0; i < Math.min(conflicts.length, 50); i++) {
                var c = conflicts[i];
                html.push("<li>");
                html.push(
                    "<div><b>Incoming</b>: " +
                        escapeHtml(c.incoming.title) +
                        " [" +
                        escapeHtml(c.incoming.language) +
                        "]</div>"
                );
                html.push(
                    "<div><b>Existing</b>: " +
                        escapeHtml((c.exists && c.exists.title) || "(tanpa judul)") +
                        " [" +
                        escapeHtml((c.exists && c.exists.language) || "") +
                        "]</div>"
                );
                html.push("<div><i>Reason</i>: " + escapeHtml(c.reason) + "</div>");
                html.push("</li>");
            }
            if (conflicts.length > 50) html.push("<li>… dan " + (conflicts.length - 50) + " lainnya</li>");
            html.push("</ol>");
        } else {
            html.push("<p>Tidak ada konflik terdeteksi.</p>");
        }
        html.push("</div>");
        return html.join("");
    }

    // Expose tanpa auto-binding tombol
    global.SnipVaultTransfer = {
        exportAll: function (opts) {
            return doExport(null, opts || {});
        },
        exportSelection: function (opts) {
            opts = opts || {};
            return doExport(opts.ids || [], opts);
        },
        importPayload: importPayload,
        openFileAndImport: openFileAndImport,
        validatePayload: validatePayload,
        detectConflicts: detectConflicts,
        previewHTML: previewHTML,
        hashSnippet: hashSnippet,
    };
})(window);
