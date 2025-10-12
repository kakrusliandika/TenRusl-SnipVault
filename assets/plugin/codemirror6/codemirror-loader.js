/*!
 * TenRusl SnipVault — CodeMirror 5 Subset Loader (SELF-HOST by default)
 * Memuat core + modes + addons + themes sesuai kebutuhan (tanpa bundler).
 * Default base mengarah ke: /assets/vendor/codemirror6  (punyamu yang sudah di-mirror).
 * Bisa dialihkan ke CDN/local lain dengan SnipVaultCM.setSourceBase('<url|path>').
 *
 * Tidak pakai inline/eval; aman untuk CSP ketat.
 */
(function (global) {
    "use strict";

    // ======= KONFIG DASAR (SELF-HOST) =======
    // Sesuaikan jika lokasi vendor berbeda
    var SOURCES = {
        base: "/assets/vendor/codemirror6", // <- direktori lokal hasil mirror (CM5 dist)
        core: { js: "/lib/codemirror.min.js", css: "/lib/codemirror.min.css" },
        addons: {
            matchBrackets: "/addon/edit/matchbrackets.min.js",
            closeBrackets: "/addon/edit/closebrackets.min.js",
            activeLineJs: "/addon/selection/active-line.min.js",
            activeLineCss: "/addon/selection/active-line.min.css",
            searchCursor: "/addon/search/searchcursor.min.js",
        },
        modes: {
            javascript: "/mode/javascript/javascript.min.js",
            // JSON memakai mode JavaScript
            json: "/mode/javascript/javascript.min.js",
            xml: "/mode/xml/xml.min.js",
            css: "/mode/css/css.min.js",
            htmlmixed: "/mode/htmlmixed/htmlmixed.min.js",
            markdown: "/mode/markdown/markdown.min.js",
            python: "/mode/python/python.min.js",
            shell: "/mode/shell/shell.min.js",
            clike: "/mode/clike/clike.min.js",
        },
        themes: {
            light: "/theme/eclipse.min.css",
            dark: "/theme/monokai.min.css",
        },
    };

    // ======= UTIL LOADER =======
    function mkUrl(path) {
        return SOURCES.base + path;
    }

    function loadCSS(href, fallbackHref) {
        return new Promise(function (resolve, reject) {
            // hindari double-load
            var links = document.querySelectorAll('link[rel="stylesheet"]');
            for (var i = 0; i < links.length; i++) {
                if ((links[i].href || "").indexOf(href) !== -1) return resolve(href);
            }
            var link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = href;
            link.onload = function () {
                resolve(href);
            };
            link.onerror = function () {
                // coba fallback (mis. .css tanpa .min.css) jika disediakan
                if (fallbackHref) {
                    var link2 = document.createElement("link");
                    link2.rel = "stylesheet";
                    link2.href = fallbackHref;
                    link2.onload = function () {
                        resolve(fallbackHref);
                    };
                    link2.onerror = function () {
                        reject(new Error("CSS failed: " + href + " & " + fallbackHref));
                    };
                    document.head.appendChild(link2);
                } else {
                    reject(new Error("CSS failed: " + href));
                }
            };
            document.head.appendChild(link);
        });
    }

    function loadScript(src, fallbackSrc) {
        return new Promise(function (resolve, reject) {
            // hindari double-load
            var scripts = document.querySelectorAll("script[src]");
            for (var i = 0; i < scripts.length; i++) {
                if ((scripts[i].src || "") === src) return resolve(src);
            }
            var s = document.createElement("script");
            s.src = src;
            s.async = true;
            s.defer = true;
            s.onload = function () {
                resolve(src);
            };
            s.onerror = function () {
                if (fallbackSrc) {
                    var s2 = document.createElement("script");
                    s2.src = fallbackSrc;
                    s2.async = true;
                    s2.defer = true;
                    s2.onload = function () {
                        resolve(fallbackSrc);
                    };
                    s2.onerror = function () {
                        reject(new Error("Script failed: " + src + " & " + fallbackSrc));
                    };
                    document.head.appendChild(s2);
                } else {
                    reject(new Error("Script failed: " + src));
                }
            };
            document.head.appendChild(s);
        });
    }

    function ensureCore() {
        if (global.CodeMirror) return Promise.resolve();
        return Promise.all([
            loadCSS(mkUrl(SOURCES.core.css), mkUrl(SOURCES.core.css.replace(".min.css", ".css"))),
            loadScript(mkUrl(SOURCES.core.js), mkUrl(SOURCES.core.js.replace(".min.js", ".js"))),
        ]);
    }

    function ensureAddons() {
        return Promise.all([
            loadCSS(
                mkUrl(SOURCES.addons.activeLineCss),
                mkUrl(SOURCES.addons.activeLineCss.replace(".min.css", ".css"))
            ),
            loadScript(
                mkUrl(SOURCES.addons.activeLineJs),
                mkUrl(SOURCES.addons.activeLineJs.replace(".min.js", ".js"))
            ),
            loadScript(
                mkUrl(SOURCES.addons.matchBrackets),
                mkUrl(SOURCES.addons.matchBrackets.replace(".min.js", ".js"))
            ),
            loadScript(
                mkUrl(SOURCES.addons.closeBrackets),
                mkUrl(SOURCES.addons.closeBrackets.replace(".min.js", ".js"))
            ),
            loadScript(
                mkUrl(SOURCES.addons.searchCursor),
                mkUrl(SOURCES.addons.searchCursor.replace(".min.js", ".js"))
            ),
        ]);
    }

    function ensureTheme(theme) {
        var path = theme === "dark" ? SOURCES.themes.dark : SOURCES.themes.light;
        var fallback = path.replace(".min.css", ".css");
        return loadCSS(mkUrl(path), mkUrl(fallback));
    }

    function ensureModes(langs) {
        var tasks = [];
        (langs || []).forEach(function (l) {
            var path = SOURCES.modes[l];
            if (!path) return;
            // jika sudah terdaftar, skip
            if (global.CodeMirror && global.CodeMirror.modes && global.CodeMirror.modes[l]) return;
            tasks.push(loadScript(mkUrl(path), mkUrl(path.replace(".min.js", ".js"))));
        });
        return Promise.all(tasks);
    }

    /**
     * API publik:
     *  - SnipVaultCM.ensure({ theme: "light"|"dark", languages: string[] })
     *  - SnipVaultCM.init(dom, options) -> CodeMirror instance
     *  - SnipVaultCM.setSourceBase(baseUrlOrPath)
     */
    var SnipVaultCM = {
        ensure: function (opts) {
            opts = opts || {};
            var theme = opts.theme === "dark" ? "dark" : "light";
            var langs = opts.languages || [
                "javascript",
                "json",
                "xml",
                "css",
                "htmlmixed",
                "markdown",
                "python",
                "shell",
                "clike",
            ];
            return ensureCore()
                .then(function () {
                    return Promise.all([ensureTheme(theme), ensureAddons()]);
                })
                .then(function () {
                    return ensureModes(langs);
                })
                .then(function () {
                    return global.CodeMirror;
                });
        },

        init: function (dom, options) {
            if (!global.CodeMirror) throw new Error("CodeMirror belum dimuat. Panggil SnipVaultCM.ensure() dulu.");
            options = options || {};
            var defaults = {
                lineNumbers: true,
                styleActiveLine: true,
                matchBrackets: true,
                autoCloseBrackets: true,
                indentUnit: 2,
                tabSize: 2,
                lineWrapping: true,
                theme: options.theme === "dark" ? "monokai" : "eclipse",
                mode: options.mode || "javascript",
            };
            for (var k in defaults) if (!(k in options)) options[k] = defaults[k];
            return global.CodeMirror(dom, options);
        },

        setSourceBase: function (baseUrlOrPath) {
            SOURCES.base = (baseUrlOrPath || "").replace(/\/+$/, ""); // trim trailing slash
        },

        sources: SOURCES,
    };

    global.SnipVaultCM = SnipVaultCM;
})(window);
