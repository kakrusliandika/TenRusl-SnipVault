/*!
 * TenRusl SnipVault — Sanitizer wrapper for DOMPurify
 * Preset profil (strict / markdown / svg) + hooks keamanan link & URL.
 * NOTE: Panggil SnipVaultDOMPurify.ensure() sebelum memakai modul ini.
 */
(function (global) {
    "use strict";

    var ALLOWED_URL_SCHEMES = /^(?:(?:https?|mailto|tel):|data:image\/(?:png|jpeg|gif);base64,)/i;

    function makeInstance() {
        if (!global.DOMPurify) throw new Error("DOMPurify belum termuat. Panggil SnipVaultDOMPurify.ensure() dulu.");
        return global.DOMPurify(window); // instance terpisah
    }

    function addSecurityHooks(p) {
        p.addHook("afterSanitizeAttributes", function (node) {
            // <a target="_blank"> → tambahkan rel aman & validasi href
            if (node && node.tagName === "A") {
                var tgt = node.getAttribute("target");
                if (tgt === "_blank") {
                    var rel = node.getAttribute("rel") || "";
                    var need = ["noopener", "noreferrer", "nofollow", "ugc"];
                    var tokens = rel.toLowerCase().split(/\s+/).filter(Boolean);
                    need.forEach(function (t) {
                        if (tokens.indexOf(t) === -1) tokens.push(t);
                    });
                    node.setAttribute("rel", tokens.join(" "));
                }
                var href = node.getAttribute("href") || "";
                if (href && !ALLOWED_URL_SCHEMES.test(href)) {
                    node.removeAttribute("href");
                }
            }

            // Hilangkan event handler, style, dan javascript: khususnya pada SVG
            if (node && node.attributes) {
                for (var i = node.attributes.length - 1; i >= 0; i--) {
                    var a = node.attributes[i];
                    var name = a.name.toLowerCase();
                    var val = (a.value || "").trim();
                    if (name.startsWith("on") || name === "style") {
                        node.removeAttribute(a.name);
                        continue;
                    }
                    if ((name === "href" || name === "xlink:href") && /^javascript:/i.test(val)) {
                        node.removeAttribute(a.name);
                    }
                }
            }
        });
    }

    var PRESETS = {
        strict: {
            ALLOWED_TAGS: [
                "a",
                "b",
                "i",
                "em",
                "strong",
                "u",
                "s",
                "sub",
                "sup",
                "span",
                "p",
                "div",
                "br",
                "hr",
                "code",
                "pre",
                "kbd",
                "samp",
                "ul",
                "ol",
                "li",
                "blockquote",
                "table",
                "thead",
                "tbody",
                "tr",
                "th",
                "td",
                "h1",
                "h2",
                "h3",
                "h4",
                "h5",
                "h6",
            ],
            ALLOWED_ATTR: ["href", "title", "aria-label", "role", "tabindex", "colspan", "rowspan"],
            FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "svg", "math", "link", "meta", "base"],
            FORBID_ATTR: [/^on/i, "style"],
            ALLOW_DATA_ATTR: false,
            KEEP_CONTENT: false,
        },

        markdown: {
            ALLOWED_TAGS: [
                "a",
                "b",
                "i",
                "em",
                "strong",
                "u",
                "s",
                "sub",
                "sup",
                "span",
                "p",
                "div",
                "br",
                "hr",
                "code",
                "pre",
                "kbd",
                "samp",
                "ul",
                "ol",
                "li",
                "blockquote",
                "table",
                "thead",
                "tbody",
                "tr",
                "th",
                "td",
                "h1",
                "h2",
                "h3",
                "h4",
                "h5",
                "h6",
                "img",
            ],
            ALLOWED_ATTR: [
                "href",
                "title",
                "alt",
                "src",
                "aria-label",
                "role",
                "tabindex",
                "colspan",
                "rowspan",
                "width",
                "height",
            ],
            FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "svg", "math", "link", "meta", "base"],
            FORBID_ATTR: [/^on/i],
            ALLOW_DATA_ATTR: false,
            KEEP_CONTENT: false,
        },

        svg: {
            ALLOWED_TAGS: [
                "svg",
                "g",
                "path",
                "circle",
                "ellipse",
                "line",
                "polyline",
                "polygon",
                "rect",
                "defs",
                "clipPath",
                "linearGradient",
                "radialGradient",
                "stop",
                "use",
                "symbol",
                "mask",
                "pattern",
                "title",
                "desc",
            ],
            ALLOWED_ATTR: [
                "viewBox",
                "width",
                "height",
                "x",
                "y",
                "cx",
                "cy",
                "r",
                "rx",
                "ry",
                "x1",
                "y1",
                "x2",
                "y2",
                "d",
                "points",
                "fill",
                "stroke",
                "stroke-width",
                "opacity",
                "transform",
                "transform-origin",
                "gradientUnits",
                "href",
                "xlink:href",
                "id",
                "class",
                "style",
            ],
            FORBID_TAGS: ["foreignObject", "script"],
            FORBID_ATTR: [/^on/i],
            ALLOW_DATA_ATTR: false,
            KEEP_CONTENT: false,
        },
    };

    function merge(a, b) {
        var o = {};
        for (var k in a) o[k] = a[k];
        for (var j in b) o[j] = b[j];
        return o;
    }
    function makeConfig(profile, user) {
        var p = PRESETS[profile] || PRESETS.strict;
        var cfg = merge(p, user || {});
        cfg.ALLOWED_URI_REGEXP = ALLOWED_URL_SCHEMES;
        return cfg;
    }

    var API = {
        sanitize: function (html, opts) {
            opts = opts || {};
            var profile = opts.profile || "strict";
            var cfg = makeConfig(profile, opts.config);
            var purifier = makeInstance();
            addSecurityHooks(purifier);
            return purifier.sanitize(String(html || ""), cfg);
        },
        sanitizeToFragment: function (html, opts) {
            opts = opts || {};
            var profile = opts.profile || "strict";
            var cfg = makeConfig(profile, opts.config);
            var purifier = makeInstance();
            addSecurityHooks(purifier);
            return purifier.sanitize(String(html || ""), merge(cfg, { RETURN_DOM_FRAGMENT: true }));
        },
        presets: PRESETS,
        setAllowedUrlPattern: function (regex) {
            if (regex instanceof RegExp) ALLOWED_URL_SCHEMES = regex;
        },
    };

    global.SnipVaultSanitizer = API;
})(window);
