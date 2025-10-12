/*!
 * TenRusl SnipVault — idb-keyval Loader (Self-Host, CSP-friendly)
 * Memuat idb-keyval IIFE dari vendor lokal. Fallback ke CDN jika perlu.
 * Meng-ekspos global: window.idbKeyval
 */
(function (global) {
    "use strict";

    var SOURCES = {
        base: "/assets/plugin/idb-keyval", // letakkan dist/ di sini
        fileMin: "/dist/idb-keyval-iife.min.js",
        fileNonMin: "/dist/idb-keyval-iife.js",
        cdn: "https://cdn.jsdelivr.net/npm/idb-keyval@6.2.1/dist/idb-keyval-iife.min.js",
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

    var SnipVaultIDBLoader = {
        ensure: function (opts) {
            if (global.idbKeyval) return Promise.resolve(global.idbKeyval);
            var base = (opts && opts.base ? opts.base : SOURCES.base).replace(/\/+$/, "");
            var primary = base + SOURCES.fileMin;
            var fallback = base + SOURCES.fileNonMin;
            var cdn = opts && opts.useCdnFallback === false ? null : SOURCES.cdn;

            return _loadScript(primary, fallback)
                .catch(function () {
                    return cdn ? _loadScript(cdn) : Promise.reject(new Error("idb-keyval not found"));
                })
                .then(function () {
                    return global.idbKeyval;
                });
        },
        setSourceBase: function (base) {
            SOURCES.base = (base || "").replace(/\/+$/, "");
        },
        sources: SOURCES,
    };

    // optional namespace (tidak wajib dipakai)
    global.SnipVaultIDBLoader = SnipVaultIDBLoader;
})(window);
