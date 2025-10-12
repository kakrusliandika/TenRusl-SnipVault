/* TenRusl SnipVault — idb-keyval store helper (fallback backend) */
(function (global) {
    "use strict";
    var LIB = global.idbKeyval || global.idb || null;
    if (!LIB) {
        global.SnipVaultKV = {
            ready: function () {
                return Promise.reject(new Error("idb-keyval belum termuat."));
            },
        };
        return;
    }
    var createStore = LIB.createStore;
    var get = LIB.get,
        set = LIB.set,
        del = LIB.del;

    var STORE;
    var INDEX_KEY = "__snippets_index__";

    function ensure() {
        if (STORE) return Promise.resolve(STORE);
        STORE = createStore("snipvault", "kv");
        return Promise.resolve(STORE);
    }
    function now() {
        return Date.now();
    }
    function ensureBoolish(v) {
        return v ? 1 : 0;
    }
    function normTags(arr) {
        if (!Array.isArray(arr)) return [];
        return arr
            .map(function (x) {
                return String(x || "").trim();
            })
            .filter(Boolean);
    }
    function normalizeSnippet(s) {
        var t = now();
        s = Object.assign(
            {
                id: undefined,
                title: "",
                language: "plaintext",
                content: "",
                tags: [],
                favorite: 0,
                pinned: 0,
                notes: "",
                created_at: t,
                updated_at: t,
            },
            s || {}
        );
        s.favorite = ensureBoolish(s.favorite);
        s.pinned = ensureBoolish(s.pinned);
        s.tags = normTags(s.tags);
        s.updated_at = now();
        return s;
    }
    function readIndex() {
        return get(INDEX_KEY, STORE).then(function (v) {
            return Array.isArray(v) ? v : [];
        });
    }
    function writeIndex(arr) {
        return set(INDEX_KEY, arr, STORE);
    }
    function nextId(list) {
        if (!list.length) return 1;
        return Math.max.apply(null, list) + 1;
    }

    var SnipVaultKV = {
        ready: function () {
            return ensure().then(function () {
                return STORE;
            });
        },

        // CRUD
        upsertSnippet: function (store, data) {
            return readIndex().then(function (idx) {
                var item = normalizeSnippet(data || {});
                if (item.id == null) item.id = nextId(idx);
                if (idx.indexOf(item.id) === -1) idx.push(item.id);
                return set("snippet:" + item.id, item, STORE).then(function () {
                    return writeIndex(idx).then(function () {
                        return item.id;
                    });
                });
            });
        },
        getSnippet: function (store, id) {
            return get("snippet:" + id, STORE);
        },
        deleteSnippet: function (store, id) {
            return readIndex().then(function (idx) {
                var ni = idx.filter(function (x) {
                    return x !== id;
                });
                return del("snippet:" + id, STORE).then(function () {
                    return writeIndex(ni);
                });
            });
        },

        // Import/Export
        exportJSON: function (store, ids) {
            return readIndex().then(function (idx) {
                var pool = Array.isArray(ids) && ids.length ? ids : idx;
                return Promise.all(
                    pool.map(function (id) {
                        return get("snippet:" + id, STORE);
                    })
                ).then(function (rows) {
                    return { version: 1, type: "snipvault.export", items: rows.filter(Boolean) };
                });
            });
        },
        importJSON: function (store, payload, opts) {
            opts = opts || {};
            if (!payload || payload.type !== "snipvault.export" || !Array.isArray(payload.items)) {
                return Promise.reject(new Error("Format impor tidak valid."));
            }
            return readIndex().then(function (idx) {
                var seen = new Set(idx);
                var ops = (payload.items || []).map(function (raw) {
                    var item = normalizeSnippet(raw);
                    if (item.id == null || seen.has(item.id))
                        (item.id = nextId(idx)), seen.add(item.id), idx.push(item.id);
                    return set("snippet:" + item.id, item, STORE);
                });
                return Promise.all(ops).then(function () {
                    return writeIndex(idx);
                });
            });
        },

        // Query/list
        list: function (store, query) {
            query = query || {};
            return readIndex().then(function (idx) {
                return Promise.all(
                    idx.map(function (id) {
                        return get("snippet:" + id, STORE);
                    })
                ).then(function (rows) {
                    rows = rows.filter(Boolean);
                    if (query.language)
                        rows = rows.filter(function (x) {
                            return x.language === query.language;
                        });
                    if (query.favorite === true)
                        rows = rows.filter(function (x) {
                            return x.favorite === 1;
                        });
                    if (query.pinned === true)
                        rows = rows.filter(function (x) {
                            return x.pinned === 1;
                        });
                    if (query.tags && query.tags.length) {
                        if (query.and === true) {
                            rows = rows.filter(function (x) {
                                return (
                                    (x.tags || []).length &&
                                    query.tags.every(function (t) {
                                        return x.tags.indexOf(t) !== -1;
                                    })
                                );
                            });
                        } else {
                            rows = rows.filter(function (x) {
                                return (x.tags || []).some(function (t) {
                                    return query.tags.indexOf(t) !== -1;
                                });
                            });
                        }
                    }
                    if (query.q && String(query.q).trim()) {
                        var s = String(query.q).toLowerCase();
                        rows = rows.filter(function (x) {
                            var txt = (x.title || "") + "\n" + (x.content || "") + "\n" + (x.tags || []).join(" ");
                            return txt.toLowerCase().indexOf(s) !== -1;
                        });
                    }
                    var sort = query.sort || "updated_at",
                        dir = query.dir || "desc";
                    rows.sort(function (a, b) {
                        var av = a[sort],
                            bv = b[sort];
                        if (av === bv) return 0;
                        return (av > bv ? 1 : -1) * (dir === "desc" ? -1 : 1);
                    });
                    if (query.pinnedFirst)
                        rows.sort(function (a, b) {
                            return !!b.pinned - !!a.pinned;
                        });
                    var offset = query.offset | 0,
                        limit = query.limit | 0;
                    if (offset || limit) rows = rows.slice(offset, limit ? offset + limit : undefined);
                    return rows;
                });
            });
        },

        // Settings KV
        getSetting: function (store, key) {
            return get("settings:" + key, STORE);
        },
        setSetting: function (store, key, value) {
            return set("settings:" + key, value, STORE);
        },
        deleteSetting: function (store, key) {
            return del("settings:" + key, STORE);
        },
    };

    global.SnipVaultKV = SnipVaultKV; // nama yang dipakai db.js
})(window);
