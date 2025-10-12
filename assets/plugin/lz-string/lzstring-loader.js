/*!
 * TenRusl SnipVault — LZ-String Loader (Self-Host, CSP-friendly)
 * Memuat global `LZString` dari vendor lokal; fallback opsional ke CDN.
 */
(function (global) {
    "use strict";

    var SOURCES = {
        base: "/assets/vendor/lz-string/libs", // ← tempatkan lz-string.min.js di sini
        candidates: ["/lz-string.min.js", "/lz-string.js"],
        // CDN fallback (opsional, pin versi stabil):
        cdn: "https://cdn.jsdelivr.net/npm/lz-string@1.5.0/libs/lz-string.min.js",
    };

    function tryLoad(list, idx) {
        if (idx >= list.length) return Promise.reject(new Error("LZ-String not found"));
        var src = list[idx];
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
                tryLoad(list, idx + 1).then(resolve, reject);
            };
            document.head.appendChild(s);
        });
    }

    var SnipVaultLZ = {
        /**
         * Pastikan `LZString` tersedia.
         * @param {{base?: string, useCdnFallback?: boolean}} opts
         * @returns {Promise<any>} global LZString
         */
        ensure: function (opts) {
            if (global.LZString) return Promise.resolve(global.LZString);
            var base = (opts && opts.base ? opts.base : SOURCES.base).replace(/\/+$/, "");
            var list = SOURCES.candidates.map(function (f) {
                return base + f;
            });
            if (opts && opts.useCdnFallback) list.push(SOURCES.cdn);
            return tryLoad(list, 0).then(function () {
                return global.LZString;
            });
        },

        /** Ganti base path vendor (self-host/CDN). */
        setSourceBase: function (base) {
            SOURCES.base = (base || "").replace(/\/+$/, "");
        },

        sources: SOURCES,
    };

    global.SnipVaultLZ = SnipVaultLZ;
})(window);
