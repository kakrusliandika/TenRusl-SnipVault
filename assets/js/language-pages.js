/* =========================================================
   SnipVault language-pages.js — FINAL (no logs)
   - Fallback inline → cegah token mentah saat first paint
   - Muat /assets/i18n/pages.json (coba ../ lalu /), merge dgn fallback
   - Autodetect: LS → country hint → navigator → timezone
   - Persist 'trhc.uiLang' (konsisten dgn Home)
   - Terjemah: [data-i18n], [data-i18n-attr], [data-i18n-attrs]+data-i18n-<attr>, <title>
   - MutationObserver utk header/footer yang diinject
   - Event: dispatch 'trhc:i18nUpdated' saat bahasa berubah
   - API: window.PagesI18N { t,get,set,toggleLang,refresh }
   ======================================================= */
(function () {
    "use strict";

    var I18N_LS = "trhc.uiLang";
    var SUPPORTED = ["en", "id"];

    // Fallback minimal agar UI langsung terisi sebelum pages.json termuat
    var FALLBACK = {
        en: {
            nav: { home: "Home", contact: "Contact", privacy: "Privacy", terms: "Terms", cookies: "Cookies" },
            common: { lastUpdated: "Last updated", copied: "Copied", ok: "OK" },

            contact: {
                title: "Contact — SnipVault",
                heading: "Contact",
                description: "We’d love to hear from you.",
                form: {
                    nameLabel: "Name",
                    namePlaceholder: "Your name",
                    emailLabel: "Email",
                    emailPlaceholder: "you@example.com",
                    messageLabel: "Message",
                    messagePlaceholder: "How can we help?",
                    help: "Submitting uses your email app (mailto). You can also write us directly.",
                    submit: "Send",
                    openMail: "Open mail app",
                },
                direct: {
                    title: "Direct",
                    emailLabel: "Email",
                    copyBtn: "Copy email",
                    hours: "Support hours: 09:00–18:00 (Asia/Jakarta), Mon–Fri.",
                },
            },

            privacy: {
                title: "Privacy Policy — SnipVault",
                heading: "Privacy Policy",
            },
            terms: {
                title: "Terms of Service — SnipVault",
                heading: "Terms of Service",
            },
            cookies: {
                title: "Cookie Policy — SnipVault",
                heading: "Cookie Policy",
            },
        },

        id: {
            nav: { home: "Beranda", contact: "Kontak", privacy: "Privasi", terms: "Ketentuan", cookies: "Cookie" },
            common: { lastUpdated: "Terakhir diperbarui", copied: "Tersalin", ok: "OK" },

            contact: {
                title: "Kontak — SnipVault",
                heading: "Kontak",
                description: "Kami senang mendengar dari Anda.",
                form: {
                    nameLabel: "Nama",
                    namePlaceholder: "Nama Anda",
                    emailLabel: "Email",
                    emailPlaceholder: "anda@contoh.com",
                    messageLabel: "Pesan",
                    messagePlaceholder: "Ada yang bisa kami bantu?",
                    help: "Pengiriman menggunakan aplikasi email Anda (mailto). Anda juga dapat menghubungi langsung.",
                    submit: "Kirim",
                    openMail: "Buka aplikasi email",
                },
                direct: {
                    title: "Langsung",
                    emailLabel: "Email",
                    copyBtn: "Salin email",
                    hours: "Jam dukungan: 09.00–18.00 (Asia/Jakarta), Sen–Jum.",
                },
            },

            privacy: {
                title: "Kebijakan Privasi — SnipVault",
                heading: "Kebijakan Privasi",
            },
            terms: {
                title: "Ketentuan Layanan — SnipVault",
                heading: "Ketentuan Layanan",
            },
            cookies: {
                title: "Kebijakan Cookie — SnipVault",
                heading: "Kebijakan Cookie",
            },
        },
    };

    // Alias untuk kompatibilitas dok lama (flat keys). Jika pages.json sudah pakai struktur nested,
    // resolver akan tetap menemukan kunci nested lebih dulu.
    var ALIAS = {
        // nav
        "nav.home": "home",
        "nav.contact": "contact",
        "nav.privacy": "privacy",
        "nav.terms": "terms",
        "nav.cookies": "cookies",

        // common
        "common.lastUpdated": "commonLastUpdated",

        // contact (flat → nested)
        "contact.title": "contactTitle",
        "contact.heading": "contactTitle",
        "contact.description": "contactLead",
        "contact.form.nameLabel": "contactName",
        "contact.form.namePlaceholder": "contactNamePH",
        "contact.form.emailLabel": "contactEmail",
        "contact.form.emailPlaceholder": "contactEmailPH",
        "contact.form.messageLabel": "contactMessage",
        "contact.form.messagePlaceholder": "contactMessagePH",
        "contact.form.help": "contactHelp",
        "contact.form.submit": "contactSend",
        "contact.form.openMail": "contactOpenMail",
        "contact.direct.title": "contactDirect",
        "contact.direct.emailLabel": "contactEmailLabel",
        "contact.direct.copyBtn": "contactCopyEmail",
        "contact.direct.hours": "contactHours",
    };

    var state = {
        dicts: {
            en: JSON.parse(JSON.stringify(FALLBACK.en)),
            id: JSON.parse(JSON.stringify(FALLBACK.id)),
        },
        lang: "en",
        observer: null,
    };

    function clamp(x) {
        x = String(x || "").toLowerCase();
        return SUPPORTED.indexOf(x) >= 0 ? x : "en";
    }
    function $(s, c) {
        return (c || document).querySelector(s);
    }
    function $all(s, c) {
        return Array.prototype.slice.call((c || document).querySelectorAll(s));
    }

    function byPath(obj, path, fallback) {
        if (!obj) return fallback;
        var parts = String(path).split(".");
        var cur = obj;
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i];
            if (cur && Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p];
            else return fallback;
        }
        return cur == null ? fallback : cur;
    }

    function resolveKey(dict, key, lang) {
        // 1) coba exact (nested)
        var v = byPath(dict, key, undefined);
        if (v != null) return v;

        // 2) alias → exact
        var alias = ALIAS[key];
        if (alias) {
            v = byPath(dict, alias, undefined);
            if (v != null) return v;
        }

        // 3) jika key prefiks "nav." tapi dict top-level menyimpan flat
        if (key.indexOf("nav.") === 0) {
            v = byPath(dict, key.slice(4), undefined);
            if (v != null) return v;
        }

        // 4) coba last segment (compat)
        if (key.indexOf(".") !== -1) {
            var last = key.split(".").pop();
            v = byPath(dict, last, undefined);
            if (v != null) return v;
        }

        // 5) fallback bawaan (nested)
        v = byPath(FALLBACK[lang], key, undefined);
        if (v != null) return v;

        // 6) fallback bawaan via alias
        if (alias) {
            v = byPath(FALLBACK[lang], alias, undefined);
            if (v != null) return v;
        }

        // 7) fallback bawaan via nav.*
        if (key.indexOf("nav.") === 0) {
            var sub = key.slice(4);
            var navObj = byPath(FALLBACK[lang], "nav", undefined);
            if (navObj && navObj[sub] != null) return navObj[sub];
        }

        // 8) fallback bawaan via last segment
        if (key.indexOf(".") !== -1) {
            var last2 = key.split(".").pop();
            v = byPath(FALLBACK[lang], last2, undefined);
            if (v != null) return v;
        }

        return undefined;
    }

    function t(key, fallback) {
        var dict = state.dicts[state.lang] || {};
        var val = resolveKey(dict, key, state.lang);
        return val == null ? (fallback != null ? fallback : key) : val;
    }

    function setBadgeAndHtmlLang() {
        var badge = $("#uiLangBadge");
        if (badge) badge.textContent = state.lang.toUpperCase();
        document.documentElement.lang = state.lang === "id" ? "id" : "en";
    }

    function translateNode(el) {
        if (!el || el.nodeType !== 1) return;

        // [data-i18n] → isi teks (atau .label jika ada)
        if (el.hasAttribute("data-i18n")) {
            var key = el.getAttribute("data-i18n");
            var allowHTML = el.hasAttribute("data-i18n-html");
            var label = el.querySelector(".label");
            var txt = t(key, label ? label.textContent : el.textContent);
            if (label) label.textContent = txt;
            else if (allowHTML) el.innerHTML = txt;
            else el.textContent = txt;
        }

        // (A) Bentuk modern: data-i18n-attr="placeholder:contact.form.namePlaceholder|aria-label:contact.form.nameLabel"
        if (el.hasAttribute("data-i18n-attr")) {
            var spec = (el.getAttribute("data-i18n-attr") || "").split("|");
            for (var i = 0; i < spec.length; i++) {
                var pair = spec[i].split(":");
                if (pair.length < 2) continue;
                var attr = pair[0].trim();
                var k = pair.slice(1).join(":").trim();
                var val = t(k, el.getAttribute(attr) || "");
                if (val != null) el.setAttribute(attr, String(val));
            }
        }

        // (B) Bentuk kompat: data-i18n-attrs="placeholder,aria-label" + data-i18n-placeholder / data-i18n-aria-label
        if (el.hasAttribute("data-i18n-attrs")) {
            var list = el
                .getAttribute("data-i18n-attrs")
                .split(",")
                .map(function (s) {
                    return s.trim();
                })
                .filter(Boolean);
            for (var j = 0; j < list.length; j++) {
                var attr2 = list[j];
                var kAttr = "data-i18n-" + attr2;
                var k2 = el.getAttribute(kAttr);
                if (!k2) continue;
                var val2 = t(k2, el.getAttribute(attr2) || "");
                if (val2 != null) el.setAttribute(attr2, String(val2));
            }
        }

        // Bare token (tanpa data-i18n) pada elemen tanpa anak → gantikan jika cocok key
        if (!el.hasAttribute("data-i18n") && el.children.length === 0) {
            var raw = (el.textContent || "").trim();
            if (/^[a-z0-9_.-]+$/i.test(raw)) {
                var v = t(raw, null);
                if (v && v !== raw) el.textContent = v;
            }
        }
    }

    function translateTree(root) {
        root = root || document;

        if (
            root !== document &&
            root.hasAttribute &&
            (root.hasAttribute("data-i18n") ||
                root.hasAttribute("data-i18n-attr") ||
                root.hasAttribute("data-i18n-attrs"))
        ) {
            translateNode(root);
        }

        $all("[data-i18n], [data-i18n-attr], [data-i18n-attrs]", root).forEach(translateNode);
        $all(".controls a, .nav a, .breadcrumbs a, .breadcrumbs span", root).forEach(translateNode);

        // <title data-i18n-title> (atau data-i18n)
        var titleEl = document.querySelector("title[data-i18n-title], title[data-i18n]");
        if (titleEl) {
            var key = titleEl.getAttribute("data-i18n-title") || titleEl.getAttribute("data-i18n");
            var v = t(key, titleEl.textContent || "");
            if (v) titleEl.textContent = v;
        }

        setBadgeAndHtmlLang();
    }

    function observe() {
        if (state.observer) return;
        state.observer = new MutationObserver(function (muts) {
            for (var i = 0; i < muts.length; i++) {
                var m = muts[i];
                var nodes = m.addedNodes || [];
                for (var j = 0; j < nodes.length; j++) {
                    var n = nodes[j];
                    if (!n || n.nodeType !== 1) continue;
                    if (
                        (n.hasAttribute &&
                            (n.hasAttribute("data-i18n") ||
                                n.hasAttribute("data-i18n-attr") ||
                                n.hasAttribute("data-i18n-attrs"))) ||
                        (n.matches && n.matches(".controls a, .nav a, .breadcrumbs a, .breadcrumbs span")) ||
                        (n.querySelector &&
                            n.querySelector(
                                "[data-i18n],[data-i18n-attr],[data-i18n-attrs],.controls a,.nav a,.breadcrumbs a,.breadcrumbs span"
                            ))
                    ) {
                        translateTree(n);
                    }
                }
            }
        });
        state.observer.observe(document.body, { childList: true, subtree: true });
    }

    function setLang(next) {
        var lang = clamp(next);
        if (state.lang === lang) return;
        state.lang = lang;
        localStorage.setItem(I18N_LS, lang);

        translateTree(document);
        requestAnimationFrame(function () {
            translateTree(document);
        });

        document.dispatchEvent(new CustomEvent("trhc:i18nUpdated", { detail: { lang: lang } }));
    }

    function bindToggle() {
        document.addEventListener("click", function (ev) {
            var btn = ev.target.closest ? ev.target.closest("#btnUiLang") : null;
            if (!btn) return;
            setLang(state.lang === "en" ? "id" : "en");
        });
    }

    function detectInitialLang() {
        var fromLS = localStorage.getItem(I18N_LS);
        if (fromLS) return clamp(fromLS);

        var meta = document.querySelector('meta[name="trhc-country"]');
        var hinted = ((window.__TRHC_COUNTRY || (meta && meta.getAttribute("content")) || "") + "").toUpperCase();
        if (hinted === "ID") return "id";

        var navs = navigator.languages || [navigator.language || "en"];
        for (var i = 0; i < navs.length; i++) {
            var s = String(navs[i]).toLowerCase();
            if (s.indexOf("id") === 0) return "id";
        }

        var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
        if (/^Asia\/(Jakarta|Makassar|Jayapura)$/i.test(tz)) return "id";

        return "en";
    }

    function merge(target, src) {
        if (!src) return target;
        for (var k in src) {
            if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
            if (src[k] && typeof src[k] === "object" && !Array.isArray(src[k])) {
                if (!target[k] || typeof target[k] !== "object") target[k] = {};
                merge(target[k], src[k]);
            } else {
                target[k] = src[k];
            }
        }
        return target;
    }

    function tryLoadRemoteDicts(cb) {
        var tried = 0;
        var urls = ["../assets/i18n/pages.json", "/assets/i18n/pages.json"];
        (function next() {
            if (tried >= urls.length) return cb(new Error("all paths failed"));
            var url = urls[tried++];
            fetchJson(url, function (err, json) {
                if (err || !json) return next();
                try {
                    if (json.en) merge(state.dicts.en, json.en);
                    if (json.id) merge(state.dicts.id, json.id);
                    cb(null, true);
                } catch (e) {
                    next();
                }
            });
        })();
    }

    function fetchJson(url, cb) {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, true);
            xhr.setRequestHeader("Cache-Control", "no-cache");
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            cb(null, JSON.parse(xhr.responseText));
                        } catch (e) {
                            cb(e);
                        }
                    } else {
                        cb(new Error("HTTP " + xhr.status));
                    }
                }
            };
            xhr.onerror = function () {
                cb(new Error("network"));
            };
            xhr.send();
        } catch (e) {
            cb(e);
        }
    }

    function boot() {
        state.lang = detectInitialLang();
        setBadgeAndHtmlLang();

        // Render cepat pakai FALLBACK
        translateTree(document);
        observe();
        bindToggle();

        // Merge dict remote bila ada, lalu re-render
        tryLoadRemoteDicts(function () {
            translateTree(document);
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot, { once: true });
    } else {
        boot();
    }

    // API publik
    window.PagesI18N = {
        t: function (k, f) {
            return t(k, f);
        },
        get: function () {
            return state.lang;
        },
        set: setLang,
        toggleLang: function () {
            setLang(state.lang === "en" ? "id" : "en");
        },
        refresh: function () {
            translateTree(document);
        },
    };
})();
