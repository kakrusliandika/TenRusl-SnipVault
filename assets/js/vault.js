/*!
 * TenRusl SnipVault — Vault UI Glue (FINAL)
 * Mengikat UI ke SVDB dan SnipVaultTransfer.
 * - Guard bila SVDB tidak tersedia (tampilkan "Gagal inisialisasi" dan "No items")
 * - Query keys diselaraskan dengan SVDB (q, lang, fav, pin, andMode, tags, sort, dir, pinnedFirst)
 */
(function (global, doc) {
    "use strict";

    function $(sel) {
        return doc.querySelector(sel);
    }
    function on(el, ev, fn) {
        if (el) el.addEventListener(ev, fn);
    }
    function debounce(fn, ms) {
        var t;
        return function () {
            var a = arguments;
            clearTimeout(t);
            t = setTimeout(function () {
                fn.apply(null, a);
            }, ms);
        };
    }
    function csvToTags(s) {
        return String(s || "")
            .split(",")
            .map(function (x) {
                return x.trim();
            })
            .filter(Boolean);
    }
    function tagsToCsv(a) {
        return (Array.isArray(a) ? a : []).join(", ");
    }
    function toast(msg) {
        try {
            console.info(msg);
        } catch (_) {}
    }

    // DOM refs
    var elSearch = $("#sv-search");
    var elList = $("#sv-list");
    var elListEmpty = $("#sv-list-empty");
    var elCount = $("#sv-count");

    var elTitle = $("#sv-title");
    var elLang = $("#sv-language");
    var elTags = $("#sv-tags");
    var elFav = $("#sv-favorite");
    var elPin = $("#sv-pinned");
    var elNotes = $("#sv-notes");
    var elPreview = $("#sv-preview-notes");

    var btnNew = $("#sv-btn-new");
    var btnSave = $("#sv-btn-save");
    var btnDup = $("#sv-btn-duplicate");
    var btnDel = $("#sv-btn-delete");
    var btnCopy = $("#sv-btn-copy");

    var fLang = $("#sv-filter-language");
    var fTags = $("#sv-filter-tags");
    var fAnd = $("#sv-filter-and");
    var fFav = $("#sv-filter-fav");
    var fPin = $("#sv-filter-pin");
    var fSort = $("#sv-sort");
    var fDir = $("#sv-sort-dir");
    var fPinnedFirst = $("#sv-pinned-first");

    var btnExport = $("#sv-btn-export");
    var btnImport = $("#sv-btn-import");
    var importPreview = $("#sv-import-preview");

    // Editor fallback (textarea)
    var editorHost = $("#sv-editor-host");
    var Editor = (function () {
        var ta;
        function init() {
            ta = doc.createElement("textarea");
            ta.id = "sv-content";
            ta.setAttribute("aria-label", "Content");
            ta.style.minHeight = "260px";
            ta.style.width = "100%";
            ta.style.boxSizing = "border-box";
            editorHost.innerHTML = "";
            editorHost.appendChild(ta);
        }
        function get() {
            return ta ? ta.value : "";
        }
        function set(v) {
            if (ta) ta.value = String(v || "");
        }
        return { init: init, get: get, set: set };
    })();

    var state = { currentId: null, list: [] };

    // --- list rendering ---
    function renderList(rows) {
        elList.innerHTML = "";
        state.list = rows || [];
        if (elCount) elCount.textContent = state.list.length;
        if (!state.list.length) {
            elListEmpty.hidden = false;
            return;
        }
        elListEmpty.hidden = true;

        for (var i = 0; i < state.list.length; i++) {
            var item = state.list[i];
            var div = doc.createElement("div");
            div.className = "sv-list-item";
            div.setAttribute("role", "option");
            div.dataset.id = item.id;
            div.innerHTML =
                '<div class="sv-li-title">' +
                (item.title || "(untitled)") +
                "</div>" +
                '<div class="sv-li-meta">' +
                (item.language || "plaintext") +
                (item.favorite ? " · ★" : "") +
                (item.pinned ? " · 📌" : "") +
                (item.tags && item.tags.length ? " · " + item.tags.join(", ") : "") +
                "</div>";
            (function (id) {
                on(div, "click", function () {
                    loadItem(id);
                });
            })(item.id);
            elList.appendChild(div);
        }
    }

    function getQuery() {
        return {
            q: (elSearch && elSearch.value) || "",
            lang: (fLang && fLang.value) || "",
            tags: csvToTags(fTags && fTags.value),
            andMode: !!(fAnd && fAnd.checked),
            fav: !!(fFav && fFav.checked),
            pin: !!(fPin && fPin.checked),
            sort: (fSort && fSort.value) || "updated_at",
            dir: (fDir && fDir.getAttribute("data-dir")) || "desc",
            pinnedFirst: !!(fPinnedFirst && fPinnedFirst.checked),
        };
    }

    function refreshList() {
        SVDB.listSnippets(getQuery())
            .then(renderList)
            .catch(function (err) {
                console.error("List error:", err);
                elListEmpty.hidden = false;
                elListEmpty.textContent = "Gagal memuat list.";
            });
    }

    // --- form binding ---
    function clearForm() {
        state.currentId = null;
        elTitle.value = "";
        elLang.value = "plaintext";
        elTags.value = "";
        elFav.checked = false;
        elPin.checked = false;
        Editor.set("");
        elNotes.value = "";
        renderNotesPreview();
    }

    function loadItem(id) {
        SVDB.getSnippet(id)
            .then(function (s) {
                if (!s) return;
                state.currentId = s.id;
                elTitle.value = s.title || "";
                elLang.value = s.language || "plaintext";
                elTags.value = tagsToCsv(s.tags);
                elFav.checked = !!s.favorite;
                elPin.checked = !!s.pinned;
                Editor.set(s.content || "");
                elNotes.value = s.notes || "";
                renderNotesPreview();
                elTitle.focus();
            })
            .catch(function (e) {
                console.error(e);
            });
    }

    function readForm() {
        return {
            id: state.currentId || undefined,
            title: elTitle.value || "",
            language: elLang.value || "plaintext",
            tags: csvToTags(elTags.value),
            favorite: elFav.checked ? 1 : 0,
            pinned: elPin.checked ? 1 : 0,
            content: Editor.get(),
            notes: elNotes.value || "",
        };
    }

    function saveCurrent() {
        var data = readForm();
        return SVDB.saveSnippet(data).then(function (id) {
            state.currentId = id;
            toast("Saved");
            refreshList();
        });
    }

    // --- notes preview ---
    function renderNotesPreview() {
        var md = elNotes.value || "";
        if (global.DOMPurify) elPreview.innerHTML = global.DOMPurify.sanitize(md);
        else elPreview.textContent = md;
    }

    // --- events ---
    on(btnNew, "click", clearForm);
    on(btnSave, "click", function () {
        saveCurrent();
    });
    on(btnDup, "click", function () {
        if (!state.currentId) return;
        SVDB.duplicateSnippet(state.currentId).then(function (id) {
            refreshList();
            loadItem(id);
        });
    });
    on(btnDel, "click", function () {
        if (!state.currentId) return;
        if (!confirm("Hapus snippet ini?")) return;
        SVDB.deleteSnippet(state.currentId).then(function () {
            clearForm();
            refreshList();
        });
    });
    on(btnCopy, "click", function () {
        var txt = Editor.get();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(txt).then(function () {
                toast("Copied");
            });
        }
    });

    on(elNotes, "input", debounce(renderNotesPreview, 120));
    on(elSearch, "input", debounce(refreshList, 180));
    [fLang, fTags, fAnd, fFav, fPin, fSort, fPinnedFirst].forEach(function (el) {
        on(el, "change", refreshList);
    });
    on(fDir, "click", function () {
        var cur = fDir.getAttribute("data-dir") || "desc";
        var next = cur === "desc" ? "asc" : "desc";
        fDir.setAttribute("data-dir", next);
        var lab = fDir.querySelector(".label");
        if (lab) lab.textContent = next;
        refreshList();
    });

    // --- Export/Import: binding tunggal di sini (hindari dialog dobel) ---
    on(btnExport, "click", function () {
        if (!global.SnipVaultTransfer) return alert("Fitur export belum siap.");
        if (global.__SV_EXPORT_BUSY__) return;
        global.__SV_EXPORT_BUSY__ = true;
        global.SnipVaultTransfer.exportAll({ compress: false })
            .catch(function () {
                alert("Export gagal.");
            })
            .finally(function () {
                global.__SV_EXPORT_BUSY__ = false;
            });
    });

    on(btnImport, "click", function () {
        if (!global.SnipVaultTransfer) return alert("Fitur import belum siap.");
        if (global.__SV_IMPORT_BUSY__) return;
        global.__SV_IMPORT_BUSY__ = true;
        global.SnipVaultTransfer.openFileAndImport({
            strategy: "skip",
            dedupByTitle: true,
            previewOnly: false,
        })
            .then(function (sum) {
                if (!sum || sum.ok !== true) {
                    var msg = "Import gagal.";
                    if (sum && sum.reason === "zip-not-supported")
                        msg = "File ZIP belum didukung. Pilih .json / .lzjson.";
                    if (sum && sum.reason === "json-parse") msg = "File tidak valid: gagal parse JSON.";
                    if (sum && sum.reason === "no-file") msg = "Tidak ada file dipilih.";
                    alert(msg);
                    return;
                }
                // refresh & tampilkan ringkasan
                if (global.SnipVaultUI && typeof global.SnipVaultUI.refresh === "function")
                    global.SnipVaultUI.refresh();
                var html = global.SnipVaultTransfer.previewHTML(sum);
                if (importPreview) importPreview.innerHTML = html;
                refreshList();
            })
            .catch(function () {
                alert("Import gagal.");
            })
            .finally(function () {
                global.__SV_IMPORT_BUSY__ = false;
            });
    });

    // --- boot dengan guard SVDB ---
    function boot() {
        Editor.init();

        // Guard: kalau SVDB tidak ada (db.js gagal), tampilkan pesan ramah
        if (!global.SVDB || typeof global.SVDB.init !== "function") {
            console.error("SVDB tidak tersedia. Pastikan assets/js/db.js termuat.");
            elListEmpty.hidden = false;
            elListEmpty.textContent = "Gagal inisialisasi SnipVault. Cek konsol.";
            return;
        }

        // Normal flow
        try {
            SVDB.init()
                .then(function (info) {
                    console.log("SVDB ready:", info.backend);
                    refreshList(); // akan menampilkan "No items" bila kosong
                })
                .catch(function (e) {
                    console.error("Init gagal:", e);
                    elListEmpty.hidden = false;
                    elListEmpty.textContent = "Gagal inisialisasi SnipVault. Cek konsol.";
                });
        } catch (err) {
            console.error("Init error:", err);
            elListEmpty.hidden = false;
            elListEmpty.textContent = "Gagal inisialisasi SnipVault. Cek konsol.";
        }
    }

    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot, { once: true });
    else boot();
})(window, document);
