/*!
 * TenRusl SnipVault — LZ Hash helper
 * Encode/Decode JSON → string URL-safe pakai LZ-String (compressToEncodedURIComponent).
 * Cocok untuk "share hash pendek": location.hash = "#s=...."
 *
 * CATATAN:
 * - Simpan metadata minimal saja (tanpa konten sensitif).
 * - Target ukuran < 1KB (default limit 1200 byte).
 * - Versikan payload, contoh: { v:1, ... }.
 */
(function (global) {
    "use strict";

    var DEFAULTS = {
        key: "s", // nama parameter di hash, mis. "#s=....."
        maxBytes: 1200, // batas ukuran aman
    };

    function ensureLib() {
        if (!global.LZString) throw new Error("LZString belum termuat. Panggil SnipVaultLZ.ensure() dulu.");
    }

    function toQuery(obj) {
        var pairs = [];
        for (var k in obj) {
            if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
            var v = obj[k];
            if (v === undefined || v === null) continue;
            pairs.push(encodeURIComponent(k) + "=" + encodeURIComponent(String(v)));
        }
        return pairs.join("&");
    }

    function parseQuery(q) {
        var out = {};
        if (!q) return out;
        q.split("&").forEach(function (kv) {
            var i = kv.indexOf("=");
            if (i === -1) {
                out[decodeURIComponent(kv)] = "";
            } else {
                var k = decodeURIComponent(kv.slice(0, i));
                var v = decodeURIComponent(kv.slice(i + 1));
                out[k] = v;
            }
        });
        return out;
    }

    function trimHash(h) {
        if (!h) return "";
        if (h.charAt(0) === "#") h = h.slice(1);
        // dukung format "#s=...&x=..." maupun "#...=..."
        if (h.indexOf("=") === -1) return h;
        return h;
    }

    var SnipVaultHash = {
        /** Compress string → URL-safe */
        compress: function (str) {
            ensureLib();
            return global.LZString.compressToEncodedURIComponent(String(str || ""));
        },

        /** Decompress URL-safe → string (null jika gagal) */
        decompress: function (enc) {
            ensureLib();
            try {
                return global.LZString.decompressFromEncodedURIComponent(String(enc || ""));
            } catch (e) {
                return null;
            }
        },

        /** Encode objek → string compressed URL-safe */
        encode: function (obj) {
            var json = JSON.stringify(obj || {});
            return SnipVaultHash.compress(json);
        },

        /** Decode string compressed → objek (null jika gagal) */
        decode: function (enc) {
            var json = SnipVaultHash.decompress(enc);
            if (typeof json !== "string") return null;
            try {
                return JSON.parse(json);
            } catch (e) {
                return null;
            }
        },

        /**
         * Bangun nilai untuk location.hash dari objek.
         * @param {object} obj
         * @param {{key?:string,maxBytes?:number}} opts
         * @returns {string} contoh "#s=ENC"
         */
        toHash: function (obj, opts) {
            opts = opts || {};
            var key = opts.key || DEFAULTS.key;
            var enc = SnipVaultHash.encode(obj);
            var hash =
                "#" +
                toQuery(
                    (function () {
                        var o = {};
                        o[key] = enc;
                        return o;
                    })()
                );
            // cek ukuran
            var bytes = new TextEncoder().encode(hash).byteLength;
            var limit = opts.maxBytes | 0 || DEFAULTS.maxBytes;
            if (bytes > limit) {
                throw new Error("Hash terlalu besar (" + bytes + "B) > batas " + limit + "B");
            }
            return hash;
        },

        /**
         * Parse location.hash saat ini & decode payload.
         * @param {{key?:string}} opts
         * @returns {any|null}
         */
        fromCurrent: function (opts) {
            return SnipVaultHash.fromHash(global.location.hash, opts);
        },

        /**
         * Parse string hash → objek.
         * Mendukung:
         *  - "#s=ENCODED"
         *  - "#ENCODED" (tanpa key)
         */
        fromHash: function (hash, opts) {
            opts = opts || {};
            var key = opts.key || DEFAULTS.key;
            var val = null;

            var h = trimHash(String(hash || ""));
            if (!h) return null;

            if (h.indexOf("=") === -1) {
                // format "#ENCODING"
                val = h;
            } else {
                // format "#k=v&..."
                var q = h.charAt(0) === "?" ? h.slice(1) : h;
                var kv = parseQuery(q);
                val = kv[key] || "";
            }

            if (!val) return null;
            return SnipVaultHash.decode(val);
        },

        isSafeSize: function (hashStr, maxBytes) {
            var bytes = new TextEncoder().encode(String(hashStr || "")).byteLength;
            return bytes <= (maxBytes | 0 || DEFAULTS.maxBytes);
        },
    };

    global.SnipVaultHash = SnipVaultHash;
})(window);
