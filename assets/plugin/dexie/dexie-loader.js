/*!
 * TenRusl SnipVault — Dexie v4 Loader (Self-Host, CSP-friendly)
 * Memuat Dexie UMD dari vendor lokal. Fallback ke CDN jika diperlukan.
 */
(function (global) {
    "use strict";

    var SOURCES = {
        base: "/assets/plugin/dexie", // letakkan dexie.min.js / dexie.js di folder ini
        fileMin: "/dexie.min.js",
        fileNonMin: "/dexie.js",
        cdn: "https://cdn.jsdelivr.net/npm/dexie@4.2.0/dist/dexie.min.js",
    };

    function _loadScript(src, fallback) {
        return new Promise(function (resolve, reject) {
            var existing = document.querySelector('script[src="' + src + '"]');
            if (existing) return resolve(src);
            var s = document.createElement("script");
            s.src = src;
            s.async = true;
            s.defer = true;
            s.onload = function () {
                resolve(src);
            };
            s.onerror = function () {
                if (fallback) {
                    var s2 = document.createElement("script");
                    s2.src = fallback;
                    s2.async = true;
                    s2.defer = true;
                    s2.onload = function () {
                        resolve(fallback);
                    };
                    s2.onerror = function () {
                        reject(new Error("Script failed: " + src + " & " + fallback));
                    };
                    document.head.appendChild(s2);
                } else {
                    reject(new Error("Script failed: " + src));
                }
            };
            document.head.appendChild(s);
        });
    }

    var SnipVaultDexie = {
        ensure: function (opts) {
            if (global.Dexie) return Promise.resolve(global.Dexie);
            var base = (opts && opts.base ? opts.base : SOURCES.base).replace(/\/+$/, "");
            var primary = base + SOURCES.fileMin;
            var fallback = base + SOURCES.fileNonMin;
            var cdn = opts && opts.useCdnFallback === false ? null : SOURCES.cdn;

            return _loadScript(primary, fallback)
                .catch(function () {
                    return cdn ? _loadScript(cdn) : Promise.reject(new Error("Dexie not found"));
                })
                .then(function () {
                    return global.Dexie;
                });
        },
        setSourceBase: function (base) {
            SOURCES.base = (base || "").replace(/\/+$/, "");
        },
        sources: SOURCES,
    };

    global.SnipVaultDexie = SnipVaultDexie;
})(window);
