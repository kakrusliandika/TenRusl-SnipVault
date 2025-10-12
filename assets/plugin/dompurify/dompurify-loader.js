/*!
 * TenRusl SnipVault — DOMPurify Loader (Self-Host, CSP-friendly)
 * Versi vendor: DOMPurify 3.2.7 (Apache-2.0)
 * Memuat window.DOMPurify dari vendor lokal; fallback opsional ke CDN.
 */
(function (global) {
    "use strict";

    var SOURCES = {
        base: "/assets/vendor/dompurify3/dist", // ← path vendor barumu
        fileMin: "/purify.min.js",
        fileNonMin: "/purify.js",
        cdn: "https://cdn.jsdelivr.net/npm/dompurify@3.2.7/dist/purify.min.js",
    };

    function loadScript(src, fallback) {
        return new Promise(function (resolve, reject) {
            if (document.querySelector('script[src="' + src + '"]')) return resolve(src);
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

    var SnipVaultDOMPurify = {
        /**
         * Pastikan window.DOMPurify tersedia.
         * @param {{useCdnFallback?: boolean, base?: string}} opts
         */
        ensure: function (opts) {
            if (global.DOMPurify) return Promise.resolve(global.DOMPurify);
            var base = (opts && opts.base ? opts.base : SOURCES.base).replace(/\/+$/, "");
            var primary = base + SOURCES.fileMin;
            var backup = base + SOURCES.fileNonMin;
            var cdn = opts && opts.useCdnFallback ? SOURCES.cdn : null;

            return loadScript(primary, backup)
                .catch(function () {
                    return cdn ? loadScript(cdn) : Promise.reject(new Error("DOMPurify not found"));
                })
                .then(function () {
                    return global.DOMPurify;
                });
        },

        /** Ganti base path sumber (self-host / CDN). */
        setSourceBase: function (base) {
            SOURCES.base = (base || "").replace(/\/+$/, "");
        },

        sources: SOURCES,
    };

    global.SnipVaultDOMPurify = SnipVaultDOMPurify;
})(window);
