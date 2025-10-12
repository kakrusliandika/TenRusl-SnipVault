// C:\laragon\www\tenrusl-snipvault\assets\js\app.js
/*!
 * TenRusl SnipVault — Vendor bootstrap & validator
 * - Set SV_PATHS (lokal/offline-first)
 * - Cek kehadiran script & global minimal (Dexie wrapper)
 * - Expose: window.SV_PATHS, window.SV_VENDOR_OK, window.SV_VENDOR_STATUS
 */
(function (global, doc) {
    "use strict";

    var SV_PATHS = {
        root: "/",
        plugin: "/assets/plugin/",
        dexie: {
            loader: "/assets/plugin/dexie/dexie-loader.js",
            db: "/assets/plugin/dexie/dexie-db.js",
        },
        idbkv: "/assets/plugin/idb-keyval/dist/idb-keyval-iife.min.js",
        lzstring: "/assets/plugin/lz-string/lzstring-loader.js",
        dompurify: "/assets/plugin/dompurify/dompurify-loader.js",
        cm6: "/assets/plugin/codemirror6/codemirror-loader.js",
    };

    try {
        Object.defineProperty(global, "SV_PATHS", {
            value: Object.freeze(SV_PATHS),
            writable: false,
            configurable: false,
            enumerable: true,
        });
    } catch {
        global.SV_PATHS = SV_PATHS;
    }

    function hasScript(src) {
        try {
            return !!doc.querySelector('script[src="' + src + '"]');
        } catch {
            return false;
        }
    }

    function validate() {
        var scripts = {
            dexieLoader: hasScript(SV_PATHS.dexie.loader),
            dexieDB: hasScript(SV_PATHS.dexie.db),
            idbkv: hasScript(SV_PATHS.idbkv),
        };
        var globals = {
            SnipVaultDexie: !!global.SnipVaultDexie,
            SnipVaultDB: !!global.SnipVaultDB,
            SnipVaultKV: !!global.SnipVaultKV || !!global.idbKeyval,
        };

        var ok =
            (scripts.dexieLoader && scripts.dexieDB && (globals.SnipVaultDexie || globals.SnipVaultDB)) ||
            globals.SnipVaultDB;
        global.SV_VENDOR_OK = !!ok;
        global.SV_VENDOR_STATUS = { scripts: scripts, globals: globals };
        return global.SV_VENDOR_STATUS;
    }

    validate();
})(window, document);
