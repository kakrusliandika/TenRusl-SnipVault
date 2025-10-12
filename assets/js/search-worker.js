/*!
 * TenRusl SnipVault — Search Worker (FINAL)
 */
(function () {
    "use strict";

    /** @typedef {{id:string,title:string,language:string,content:string,tags:string[],favorite:0|1,pinned:0|1,updated_at:number,created_at:number,notes?:string}} Snip */

    /** @type {Map<string, Snip>} */ var RECORDS = new Map();
    /** @type {Map<string, Set<string>>} */ var INV = new Map(); // token -> ids
    /** @type {Map<string, Set<string>>} */ var TOKENS_BY_ID = new Map(); // id -> tokens

    function normStr(s) {
        return String(s || "");
    }
    function toText(snip) {
        var parts = [
            normStr(snip.title),
            normStr(snip.content),
            Array.isArray(snip.tags) ? snip.tags.join(" ") : "",
            normStr(snip.language),
        ];
        return parts.join("\n").toLowerCase();
    }
    function tokenize(text) {
        return String(text || "")
            .toLowerCase()
            .split(/[^a-z0-9\u00C0-\u024F]+/i)
            .filter(Boolean);
    }

    function addToInv(id, tokens) {
        TOKENS_BY_ID.set(id, tokens);
        tokens.forEach(function (tk) {
            var bucket = INV.get(tk);
            if (!bucket) {
                bucket = new Set();
                INV.set(tk, bucket);
            }
            bucket.add(id);
        });
    }
    function removeFromInv(id) {
        var toks = TOKENS_BY_ID.get(id);
        if (!toks) return;
        toks.forEach(function (tk) {
            var bucket = INV.get(tk);
            if (!bucket) return;
            bucket.delete(id);
            if (bucket.size === 0) INV.delete(tk);
        });
        TOKENS_BY_ID.delete(id);
    }

    function reindexAll(items) {
        RECORDS.clear();
        INV.clear();
        TOKENS_BY_ID.clear();
        for (var i = 0; i < items.length; i++) {
            var s = items[i];
            if (!s || s.id == null) continue;
            RECORDS.set(s.id, s);
            addToInv(s.id, new Set(tokenize(toText(s))));
        }
    }
    function upsertOne(s) {
        if (!s || s.id == null) return;
        if (RECORDS.has(s.id)) removeFromInv(s.id);
        RECORDS.set(s.id, s);
        addToInv(s.id, new Set(tokenize(toText(s))));
    }
    function removeOne(id) {
        if (!RECORDS.has(id)) return;
        RECORDS.delete(id);
        removeFromInv(id);
    }

    function applyFilters(ids, query) {
        var rows = [];
        ids.forEach(function (id) {
            var s = RECORDS.get(id);
            if (!s) return;
            if (query.language && s.language !== query.language) return;
            if (query.favorite === true && s.favorite !== 1) return;
            if (query.pinned === true && s.pinned !== 1) return;

            // === FIX: tags case-insensitive ===
            if (query.tags && query.tags.length) {
                var st = Array.isArray(s.tags)
                    ? s.tags.map(function (t) {
                          return String(t).toLowerCase();
                      })
                    : [];
                var needed = (query.tags || []).map(function (t) {
                    return String(t).toLowerCase();
                });
                if (query.and === true) {
                    for (var i = 0; i < needed.length; i++) {
                        if (st.indexOf(needed[i]) === -1) return;
                    }
                } else {
                    var ok = false;
                    for (var j = 0; j < st.length; j++) {
                        if (needed.indexOf(st[j]) !== -1) {
                            ok = true;
                            break;
                        }
                    }
                    if (!ok) return;
                }
            }

            rows.push(s);
        });

        var sort = query.sort || "updated_at";
        var dir = query.dir || "desc";
        rows.sort(function (a, b) {
            if (query.pinnedFirst) {
                var pf = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
                if (pf !== 0) return pf;
            }
            var av = a[sort],
                bv = b[sort];
            if (av === bv) return 0;
            var base = av > bv ? 1 : -1;
            return dir === "desc" ? -base : base;
        });

        var offset = query.offset | 0,
            limit = query.limit | 0;
        if (offset || limit) rows = rows.slice(offset, limit ? offset + limit : undefined);
        return rows;
    }

    function search(query) {
        query = query || {};
        var tokens = [];
        if (query.q && String(query.q).trim()) tokens = tokenize(String(query.q));

        var ids;
        if (tokens.length === 0) {
            ids = new Set(RECORDS.keys());
        } else {
            for (var i = 0; i < tokens.length; i++) {
                var tk = tokens[i],
                    bucket = INV.get(tk) || new Set();
                if (i === 0) ids = new Set(bucket);
                else {
                    var next = new Set();
                    ids.forEach(function (id) {
                        if (bucket.has(id)) next.add(id);
                    });
                    ids = next;
                }
            }
        }
        return applyFilters(ids, query);
    }

    self.onmessage = function (e) {
        var msg = e.data || {};
        try {
            switch (msg.type) {
                case "index":
                    reindexAll(Array.isArray(msg.items) ? msg.items : []);
                    self.postMessage({ type: "indexed", count: RECORDS.size });
                    break;
                case "append":
                    (msg.items || []).forEach(upsertOne);
                    self.postMessage({ type: "indexed", count: RECORDS.size });
                    break;
                case "update":
                    upsertOne(msg.item);
                    self.postMessage({ type: "updated", id: msg.item && msg.item.id });
                    break;
                case "remove":
                    removeOne(msg.id);
                    self.postMessage({ type: "removed", id: msg.id });
                    break;
                case "search":
                    var rows = search(msg.query || {}),
                        out = new Array(rows.length);
                    for (var i = 0; i < rows.length; i++) {
                        var s = rows[i];
                        out[i] = {
                            id: s.id,
                            title: s.title,
                            language: s.language,
                            tags: s.tags,
                            favorite: s.favorite,
                            pinned: s.pinned,
                            updated_at: s.updated_at,
                        };
                    }
                    self.postMessage({ type: "result", rows: out, total: rows.length });
                    break;
                case "ping":
                    self.postMessage({ type: "pong", ts: Date.now() });
                    break;
                default:
                    self.postMessage({ type: "error", error: "Unknown message type: " + msg.type });
            }
        } catch (err) {
            self.postMessage({ type: "error", error: String((err && err.message) || err) });
        }
    };
})();
