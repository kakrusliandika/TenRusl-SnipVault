/*!
 * TenRusl SnipVault — Dexie DB helper (v4)
 * Skema & util CRUD + query untuk SnipVault.
 */
(function (global) {
    "use strict";

    var DB_NAME = "snipvault";
    var DB_VERSION = 1;

    function defineSchema(db) {
        db.version(DB_VERSION).stores({
            snippet: "++id, title, *tags, language, updated_at, favorite, pinned",
            settings: "id",
        });
    }

    function openDB() {
        if (!global.Dexie) throw new Error("Dexie belum termuat. Panggil SnipVaultDexie.ensure() dulu.");
        var db = new global.Dexie(DB_NAME);
        defineSchema(db);
        return db.open().then(function () {
            return db;
        });
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

    var SnipVaultDB = {
        ready: function (opts) {
            return window.SnipVaultDexie.ensure(opts).then(openDB);
        },

        // CRUD
        upsertSnippet: function (db, data) {
            return db.table("snippet").put(normalizeSnippet(data));
        },
        getSnippet: function (db, id) {
            return db.table("snippet").get(id);
        },
        deleteSnippet: function (db, id) {
            return db.table("snippet").delete(id);
        },

        bulkUpsert: function (db, items) {
            var t = db.table("snippet");
            var rows = (items || []).map(normalizeSnippet);
            return t.bulkPut(rows);
        },

        // Import/Export
        exportJSON: function (db, ids) {
            var t = db.table("snippet");
            if (Array.isArray(ids) && ids.length) {
                return t
                    .where("id")
                    .anyOf(ids)
                    .toArray()
                    .then(function (rows) {
                        return { version: 1, type: "snipvault.export", items: rows };
                    });
            }
            return t.toArray().then(function (rows) {
                return { version: 1, type: "snipvault.export", items: rows };
            });
        },

        importJSON: function (db, payload, opts) {
            opts = opts || {};
            if (!payload || payload.type !== "snipvault.export" || !Array.isArray(payload.items)) {
                return Promise.reject(new Error("Format impor tidak valid"));
            }
            if (opts.dedupByTitle) {
                var seen = new Set();
                payload.items = payload.items.filter(function (x) {
                    var key = (x.title || "").toLowerCase().trim();
                    if (!key || seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
            }
            return SnipVaultDB.bulkUpsert(db, payload.items);
        },

        // Query/list
        list: function (db, query) {
            query = query || {};
            var t = db.table("snippet");
            var coll;

            if (query.language) coll = t.where("language").equals(query.language);
            else if (query.favorite === true) coll = t.where("favorite").equals(1);
            else if (query.pinned === true) coll = t.where("pinned").equals(1);
            else if (query.tags && query.tags.length) coll = t.where("tags").anyOf(query.tags);
            else coll = t.toCollection();

            if (query.tags && query.tags.length && query.and === true) {
                coll = coll.filter(function (x) {
                    return (
                        (x.tags || []).length &&
                        query.tags.every(function (tg) {
                            return x.tags.indexOf(tg) !== -1;
                        })
                    );
                });
            }

            if (query.q && query.q.trim()) {
                var s = query.q.toLowerCase();
                coll = coll.filter(function (x) {
                    var txt = (x.title || "") + "\n" + (x.content || "") + "\n" + (x.tags || []).join(" ");
                    return txt.toLowerCase().indexOf(s) !== -1;
                });
            }

            var sort = query.sort || "updated_at";
            var dir = query.dir || "desc";
            var sortFn = function (a, b) {
                var av = a[sort],
                    bv = b[sort];
                if (av === bv) return 0;
                return (av > bv ? 1 : -1) * (dir === "desc" ? -1 : 1);
            };
            var offset = query.offset | 0,
                limit = query.limit | 0;

            return coll.toArray().then(function (rows) {
                if (query.pinnedFirst)
                    rows.sort(function (a, b) {
                        return !!b.pinned - !!a.pinned;
                    });
                rows.sort(sortFn);
                if (offset || limit) rows = rows.slice(offset, limit ? offset + limit : undefined);
                return rows;
            });
        },

        // Settings KV on Dexie
        getSetting: function (db, key) {
            return db.table("settings").get(key);
        },
        setSetting: function (db, key, value) {
            return db.table("settings").put({ id: key, json: value });
        },
        deleteSetting: function (db, key) {
            return db.table("settings").delete(key);
        },
    };

    global.SnipVaultDB = SnipVaultDB;
})(window);
