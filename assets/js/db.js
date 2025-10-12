// C:\laragon\www\tenrusl-snipvault\assets\js\db.js
/*!
 * TenRusl SnipVault — DB Abstraction (SAVE pasti jalan)
 * - Primary: SnipVaultDB (Dexie wrapper)
 * - Fallback 1: idb-keyval (via window.SnipVaultKV atau window.idbKeyval)
 * - Fallback 2: localStorage (shim)
 *
 * Ekspor:
 *   window.SVDB      : API modern
 *   window.SVDBInit  : Promise init()
 *
 * Kompat lama: shim SnipVaultDB jika tidak tersedia.
 */
(function (global) {
    "use strict";

    /* ========= Util ========= */
    var LS_SNIPS = "sv.snippets";
    var LS_SET_APP = "sv.settings.app";
    var LS_SET_DBV = "sv.settings.db_version";
    var EXPORT_TYPE = "snipvault.export";
    var DEFAULT_SETTINGS_URL = "/assets/json/settings.json";

    function now() {
        return Date.now();
    }
    function bool01(v) {
        return v ? 1 : 0;
    }
    function clone(x) {
        return x == null ? x : JSON.parse(JSON.stringify(x));
    }
    function uid() {
        try {
            return crypto.randomUUID();
        } catch (_) {}
        return "id-" + now() + "-" + Math.random().toString(16).slice(2);
    }
    function deepMerge(a, b) {
        var out = Array.isArray(a) ? a.slice() : Object.assign({}, a || {});
        if (!b || typeof b !== "object") return out;
        Object.keys(b).forEach(function (k) {
            if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k])) out[k] = deepMerge(out[k] || {}, b[k]);
            else out[k] = b[k];
        });
        return out;
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
        if (!s.id) s.id = uid();
        s.favorite = bool01(s.favorite);
        s.pinned = bool01(s.pinned);
        if (!Array.isArray(s.tags)) s.tags = [];
        s.tags = s.tags
            .map(function (x) {
                return String(x || "").trim();
            })
            .filter(Boolean);
        s.created_at = Number(s.created_at || t);
        s.updated_at = Number(s.updated_at || s.created_at || t);
        return s;
    }

    function parseTagsFilter(x) {
        if (!x) return [];
        if (Array.isArray(x))
            return x
                .map(String)
                .map(function (s) {
                    return s.trim();
                })
                .filter(Boolean);
        return String(x)
            .split(",")
            .map(function (s) {
                return s.trim();
            })
            .filter(Boolean);
    }
    function filterAndSort(arr, query) {
        var q = query || {};
        var out = arr.slice();

        var qq = String(q.q || "")
            .toLowerCase()
            .trim();
        if (qq) {
            out = out.filter(function (s) {
                return (
                    String(s.title || "")
                        .toLowerCase()
                        .includes(qq) ||
                    String(s.content || "")
                        .toLowerCase()
                        .includes(qq) ||
                    (s.tags || []).join(",").toLowerCase().includes(qq)
                );
            });
        }
        if (q.lang) {
            out = out.filter(function (s) {
                return String(s.language || "") === String(q.lang);
            });
        }
        if (q.fav) {
            out = out.filter(function (s) {
                return !!s.favorite;
            });
        }
        if (q.pin) {
            out = out.filter(function (s) {
                return !!s.pinned;
            });
        }

        var needed = parseTagsFilter(q.tags);
        if (needed.length) {
            out = out.filter(function (s) {
                var has = (s.tags || []).map(function (x) {
                    return String(x).toLowerCase();
                });
                return q.andMode
                    ? needed.every(function (t) {
                          return has.includes(t.toLowerCase());
                      })
                    : needed.some(function (t) {
                          return has.includes(t.toLowerCase());
                      });
            });
        }

        var sortKey = q.sort || q.sortBy || "updated_at";
        var dir = (q.dir || "desc").toLowerCase();
        out.sort(function (a, b) {
            var av = a[sortKey],
                bv = b[sortKey];
            if (av == null && bv == null) return 0;
            if (av == null) return 1;
            if (bv == null) return -1;
            if (av > bv) return dir === "asc" ? 1 : -1;
            if (av < bv) return dir === "asc" ? -1 : 1;
            return 0;
        });

        if (q.pinnedFirst)
            out.sort(function (a, b) {
                return (b.pinned === true) - (a.pinned === true);
            });
        if ((q.limit | 0) > 0) out = out.slice(0, q.limit | 0);
        return out;
    }

    /* ========= Fallback LocalStorage layer ========= */
    function lsGetSnips() {
        try {
            return JSON.parse(localStorage.getItem(LS_SNIPS) || "[]");
        } catch (_) {
            return [];
        }
    }
    function lsSetSnips(arr) {
        try {
            localStorage.setItem(LS_SNIPS, JSON.stringify(Array.isArray(arr) ? arr : []));
        } catch (_) {}
    }
    function lsGetSetting(key) {
        try {
            if (key === "app") return JSON.parse(localStorage.getItem(LS_SET_APP) || "{}");
            if (key === "db_version") return JSON.parse(localStorage.getItem(LS_SET_DBV) || "0");
            return JSON.parse(localStorage.getItem("sv.settings." + key) || "null");
        } catch (_) {
            return key === "app" ? {} : 0;
        }
    }
    function lsSetSetting(key, val) {
        try {
            if (key === "app") localStorage.setItem(LS_SET_APP, JSON.stringify(val || {}));
            else if (key === "db_version") localStorage.setItem(LS_SET_DBV, JSON.stringify(val | 0));
            else localStorage.setItem("sv.settings." + key, JSON.stringify(val));
        } catch (_) {}
    }

    /* ========= SnipVaultDB SHIM ========= */
    if (!global.SnipVaultDB) {
        global.SnipVaultDB = {
            ready: async function () {
                return { __shim: true };
            },
            getSetting: async function (_h, key) {
                return { json: lsGetSetting(key) };
            },
            setSetting: async function (_h, key, val) {
                lsSetSetting(key, val);
                return true;
            },
            upsertSnippet: async function (_h, item) {
                var arr = lsGetSnips();
                var i = arr.findIndex(function (x) {
                    return x.id === item.id;
                });
                if (i >= 0) arr[i] = item;
                else arr.push(item);
                lsSetSnips(arr);
                return item.id;
            },
            getSnippet: async function (_h, id) {
                var arr = lsGetSnips();
                return (
                    arr.find(function (x) {
                        return x.id === id;
                    }) || null
                );
            },
            deleteSnippet: async function (_h, id) {
                var arr = lsGetSnips().filter(function (x) {
                    return x.id !== id;
                });
                lsSetSnips(arr);
            },
            list: async function (_h, query) {
                var arr = lsGetSnips();
                return filterAndSort(arr, query || {});
            },
            exportJSON: async function (_h, ids) {
                var rows = lsGetSnips();
                if (Array.isArray(ids) && ids.length) {
                    var set = new Set(ids);
                    rows = rows.filter(function (x) {
                        return set.has(x.id);
                    });
                }
                return { version: 1, type: EXPORT_TYPE, items: rows, generated_at: now() };
            },
            importJSON: async function (_h, payload, opts) {
                opts = opts || {};
                var strategy = String(opts.strategy || "skip");
                if (!payload || payload.type !== EXPORT_TYPE || !Array.isArray(payload.items))
                    throw new Error("Format impor tidak valid.");
                var cur = lsGetSnips();
                var map = Object.create(null);
                cur.forEach(function (x) {
                    map[x.id] = 1;
                });
                payload.items.forEach(function (raw) {
                    var it = normalizeSnippet(raw);
                    if (map[it.id]) {
                        if (strategy === "overwrite-id") {
                            var idx = cur.findIndex(function (x) {
                                return x.id === it.id;
                            });
                            if (idx >= 0) cur[idx] = it;
                        } else if (strategy === "always-insert") {
                            it.id = uid();
                            cur.push(it);
                        }
                    } else {
                        cur.push(it);
                    }
                });
                lsSetSnips(cur);
                return { applied: true };
            },
        };
        if (!global.SnipVaultDexie) global.SnipVaultDexie = { __shim: true };
    }

    /* ========= idb-keyval helper ========= */
    function hasKV() {
        return !!(global.SnipVaultKV || global.idbKeyval);
    }
    async function kvGetSnips() {
        if (global.SnipVaultKV && typeof global.SnipVaultKV.getAll === "function")
            return await global.SnipVaultKV.getAll({});
        if (global.idbKeyval) {
            var v = await global.idbKeyval.get(LS_SNIPS);
            return Array.isArray(v) ? v : [];
        }
        return [];
    }
    async function kvSetSnips(arr) {
        if (global.SnipVaultKV && typeof global.SnipVaultKV.setAll === "function")
            return await global.SnipVaultKV.setAll({}, arr);
        if (global.idbKeyval) return await global.idbKeyval.set(LS_SNIPS, Array.isArray(arr) ? arr : []);
    }
    async function kvGetSetting(key) {
        if (global.SnipVaultKV && typeof global.SnipVaultKV.getSetting === "function")
            return await global.SnipVaultKV.getSetting({}, key);
        if (global.idbKeyval) {
            var map = { app: LS_SET_APP, db_version: LS_SET_DBV };
            return await global.idbKeyval.get(map[key] || "sv.settings." + key);
        }
        return undefined;
    }
    async function kvSetSetting(key, val) {
        if (global.SnipVaultKV && typeof global.SnipVaultKV.setSetting === "function")
            return await global.SnipVaultKV.setSetting({}, key, val);
        if (global.idbKeyval) {
            var map = { app: LS_SET_APP, db_version: LS_SET_DBV };
            return await global.idbKeyval.set(map[key] || "sv.settings." + key, val);
        }
    }

    /* ========= Defaults ========= */
    var _defaults = null;
    async function loadDefaults() {
        if (_defaults) return _defaults;
        try {
            var res = await fetch(DEFAULT_SETTINGS_URL, { cache: "no-cache" });
            if (!res.ok) throw 0;
            _defaults = await res.json();
        } catch (_) {
            _defaults = {
                theme: "system",
                editor_opts: {
                    lineNumbers: true,
                    lineWrapping: true,
                    tabSize: 2,
                    fontSize: 14,
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
                    themeLight: "eclipse",
                    themeDark: "monokai",
                },
                secure_mode: false,
            };
        }
        return _defaults;
    }

    /* ========= Backend selection ========= */
    var _backend = null; // "dexie"|"kv"|"ls"
    var _handle = null;
    var _settingsCache = null;

    async function pickBackend() {
        if (_backend) return { type: _backend, handle: _handle };
        try {
            var db = await global.SnipVaultDB.ready();
            _backend = "dexie";
            _handle = db;
            return { type: _backend, handle: _handle };
        } catch (e) {
            /* fallback */
        }
        if (hasKV()) {
            _backend = "kv";
            _handle = { __kv: true };
            return { type: _backend, handle: _handle };
        }
        _backend = "ls";
        _handle = { __ls: true };
        return { type: _backend, handle: _handle };
    }

    async function readDbVersion() {
        await pickBackend();
        if (_backend === "dexie") {
            var row = await global.SnipVaultDB.getSetting(_handle, "db_version");
            return (row && row.json) || 0;
        } else if (_backend === "kv") {
            return (await kvGetSetting("db_version")) || 0;
        } else {
            return lsGetSetting("db_version") || 0;
        }
    }
    async function writeDbVersion(v) {
        await pickBackend();
        if (_backend === "dexie") return global.SnipVaultDB.setSetting(_handle, "db_version", v | 0);
        else if (_backend === "kv") return kvSetSetting("db_version", v | 0);
        else return lsSetSetting("db_version", v | 0);
    }
    async function migrateV1() {
        var v = await readDbVersion();
        if ((v | 0) < 1) await writeDbVersion(1);
    }

    async function getUserSettings() {
        if (_settingsCache) return _settingsCache;
        await pickBackend();
        if (_backend === "dexie") {
            var row = await global.SnipVaultDB.getSetting(_handle, "app");
            _settingsCache = (row && row.json) || {};
        } else if (_backend === "kv") {
            _settingsCache = (await kvGetSetting("app")) || {};
        } else {
            _settingsCache = lsGetSetting("app") || {};
        }
        return _settingsCache;
    }
    async function setUserSettings(obj) {
        _settingsCache = obj || {};
        await pickBackend();
        if (_backend === "dexie") return global.SnipVaultDB.setSetting(_handle, "app", _settingsCache);
        else if (_backend === "kv") return kvSetSetting("app", _settingsCache);
        else return lsSetSetting("app", _settingsCache);
    }

    /* ========= CRUD facade ========= */
    async function saveItem(data) {
        await pickBackend();
        var item = normalizeSnippet(clone(data) || {});
        if (_backend === "dexie") {
            await global.SnipVaultDB.upsertSnippet(_handle, item);
            return item.id;
        } else if (_backend === "kv") {
            var arr = await kvGetSnips();
            var i = arr.findIndex(function (x) {
                return x.id === item.id;
            });
            if (i >= 0) arr[i] = item;
            else arr.push(item);
            await kvSetSnips(arr);
            return item.id;
        } else {
            var arr2 = lsGetSnips();
            var j = arr2.findIndex(function (x) {
                return x.id === item.id;
            });
            if (j >= 0) arr2[j] = item;
            else arr2.push(item);
            lsSetSnips(arr2);
            return item.id;
        }
    }
    async function getItem(id) {
        await pickBackend();
        if (_backend === "dexie") return global.SnipVaultDB.getSnippet(_handle, id);
        else if (_backend === "kv") {
            var arr = await kvGetSnips();
            return (
                arr.find(function (x) {
                    return x.id === id;
                }) || null
            );
        } else {
            var arr2 = lsGetSnips();
            return (
                arr2.find(function (x) {
                    return x.id === id;
                }) || null
            );
        }
    }
    async function delItem(id) {
        await pickBackend();
        if (_backend === "dexie") return global.SnipVaultDB.deleteSnippet(_handle, id);
        else if (_backend === "kv") {
            var arr = await kvGetSnips();
            arr = arr.filter(function (x) {
                return x.id !== id;
            });
            await kvSetSnips(arr);
        } else {
            var arr2 = lsGetSnips();
            arr2 = arr2.filter(function (x) {
                return x.id !== id;
            });
            lsSetSnips(arr2);
        }
    }
    async function listItems(query) {
        await pickBackend();
        if (_backend === "dexie") return global.SnipVaultDB.list(_handle, query || {});
        else if (_backend === "kv") {
            var arr = await kvGetSnips();
            return filterAndSort(arr, query || {});
        } else {
            var arr2 = lsGetSnips();
            return filterAndSort(arr2, query || {});
        }
    }

    /* ========= Import/Export ========= */
    async function doExport(ids) {
        var rows = await listItems({});
        if (Array.isArray(ids) && ids.length) {
            var set = new Set(ids);
            rows = rows.filter(function (x) {
                return set.has(x.id);
            });
        }
        return { version: 1, type: EXPORT_TYPE, items: rows, generated_at: now() };
    }
    async function doImport(payload, opts) {
        opts = opts || {};
        var mode = String(opts.mode || "apply");
        var strategy = String(opts.strategy || "skip");
        var dedupByTitle = !!opts.dedupByTitle;

        if (!payload || payload.type !== "snipvault.export" || !Array.isArray(payload.items))
            throw new Error("Format impor tidak valid.");

        if (mode === "preview") {
            var exist = await listItems({});
            var ids = new Set(
                exist.map(function (x) {
                    return x.id;
                })
            );
            var rep = { total: payload.items.length, willInsert: 0, willOverwrite: 0, willSkip: 0 };
            payload.items.forEach(function (it) {
                var has = it && it.id && ids.has(it.id);
                if (has) {
                    if (strategy === "overwrite-id") rep.willOverwrite++;
                    else if (strategy === "always-insert") rep.willInsert++;
                    else rep.willSkip++;
                } else rep.willInsert++;
            });
            return rep;
        }

        var existing = await listItems({});
        var byId = new Map(
            existing.map(function (r) {
                return [r.id, r];
            })
        );
        var byTitle = new Set(
            existing
                .map(function (r) {
                    return String(r.title || "")
                        .toLowerCase()
                        .trim();
                })
                .filter(Boolean)
        );

        for (var i = 0; i < payload.items.length; i++) {
            var raw = payload.items[i];
            var it = normalizeSnippet(raw);
            var titleKey = it.title.toLowerCase().trim();
            var already = byId.get(it.id);

            if (dedupByTitle && titleKey && byTitle.has(titleKey)) continue;

            if (already) {
                if (strategy === "overwrite-id") {
                    await saveItem(it);
                    byId.set(it.id, it);
                    if (titleKey) byTitle.add(titleKey);
                } else if (strategy === "always-insert") {
                    it.id = uid();
                    await saveItem(it);
                    byId.set(it.id, it);
                    if (titleKey) byTitle.add(titleKey);
                } else {
                    /* skip */
                }
            } else {
                await saveItem(it);
                byId.set(it.id, it);
                if (titleKey) byTitle.add(titleKey);
            }
        }
        return { applied: true };
    }

    /* ========= Public API ========= */
    var SVDB = {
        init: async function () {
            await pickBackend();
            var v = await readDbVersion();
            if ((v | 0) < 1) await writeDbVersion(1);
            return { backend: _backend, handle: _handle };
        },
        backend: function () {
            return _backend;
        },
        raw: function () {
            return _handle;
        },
        resetSettingsCache: function () {
            _settingsCache = null;
        },

        // settings
        getSettings: async function () {
            return deepMerge(await loadDefaults(), await getUserSettings());
        },
        setSettings: async function (obj) {
            await setUserSettings(obj || {});
            return obj || {};
        },
        updateSettings: async function (patch) {
            var merged = deepMerge(await SVDB.getSettings(), patch || {});
            await setUserSettings(merged);
            return merged;
        },

        // CRUD
        saveSnippet: saveItem,
        getSnippet: getItem,
        deleteSnippet: delItem,
        listSnippets: listItems,

        duplicateSnippet: async function (id, overrides) {
            var src = await getItem(id);
            if (!src) throw new Error("Snippet tidak ditemukan: " + id);
            var c = Object.assign({}, src, overrides || {});
            delete c.id;
            c.title = (overrides && overrides.title) || (src.title ? src.title + " (copy)" : "Untitled (copy)");
            return saveItem(c);
        },
        toggleFavorite: async function (id, val) {
            var s = await getItem(id);
            if (!s) throw new Error("Snippet tidak ditemukan: " + id);
            s.favorite = val == null ? (s.favorite ? 0 : 1) : val ? 1 : 0;
            return saveItem(s);
        },
        togglePinned: async function (id, val) {
            var s = await getItem(id);
            if (!s) throw new Error("Snippet tidak ditemukan: " + id);
            s.pinned = val == null ? (s.pinned ? 0 : 1) : val ? 1 : 0;
            return saveItem(s);
        },

        // import/export
        exportJSON: doExport,
        importJSON: doImport,

        // bridge kompat lama
        put: saveItem,
        get: getItem,
        delete: delItem,
        all: async function () {
            return listItems({});
        },
        where: async function (q) {
            var map = {
                q: q && q.q,
                lang: q && q.lang,
                tags: q && q.tags,
                andMode: q && q.andMode,
                fav: q && q.fav,
                pin: q && q.pin,
                sort: q && (q.sortBy || q.sort),
                dir: q && q.dir,
                pinnedFirst: q && q.pinnedFirst !== false,
            };
            return listItems(map);
        },
    };

    global.SVDB = SVDB;
    global.SVDBInit = (async function () {
        const info = await SVDB.init();
        try {
            document.dispatchEvent(new CustomEvent("svdb:ready", { detail: info }));
        } catch (_) {}
        return info;
    })();
})(window);
