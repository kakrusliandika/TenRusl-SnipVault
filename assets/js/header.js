/* header.js — FINAL (inject header + buttons incl. Tutorial) */
(() => {
    "use strict";

    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

    function t(key, fallback) {
        const tri18n = window.TRI18N && typeof window.TRI18N.t === "function" ? window.TRI18N.t : null;
        const out = tri18n ? tri18n(key) : null;
        return out ?? (fallback || key);
    }

    function injectHeader() {
        const exist = $(".app-header");
        if (exist) return exist;

        const h = document.createElement("header");
        h.className = "app-header";
        h.innerHTML = `
      <div class="brand">
        <img src="/assets/images/icon.svg" width="28" height="28" alt="TRDV" />
        <strong>
          <span class="brand-full">TenRusl SnipVault</span>
          <span class="brand-abbr">TRDV</span>
        </strong>
        <span class="badge">PWA</span>
      </div>

      <nav class="controls" aria-label="Toolbar">
        <button
          id="btnTutorial"
          class="icon-btn"
          type="button"
          title="Tutorial"
          aria-label="Open tutorial"
          data-open="guide"
        >
          <i class="fa-solid fa-circle-question icon" aria-hidden="true"></i>
          <span class="label">Tutorial</span>
        </button>

        <button
          id="btnUiLang"
          class="icon-btn"
          type="button"
          title="Toggle UI Language"
          aria-label="Toggle UI Language"
        >
          <i class="fa-solid fa-globe icon" aria-hidden="true"></i>
          <span id="uiLangBadge" class="badge-mini">EN</span>
        </button>

        <button
          id="btnTheme"
          class="icon-btn"
          type="button"
          title="Toggle Theme"
          aria-label="Toggle Theme"
          style="position: relative"
        >
          <i class="fa-solid fa-sun icon icon-sun" aria-hidden="true"></i>
          <i class="fa-solid fa-moon icon icon-moon" aria-hidden="true"></i>
        </button>
      </nav>
    `;
        const first = document.body.firstChild;
        if (first) document.body.insertBefore(h, first);
        else document.body.appendChild(h);
        return h;
    }

    function getCurrentUiLang() {
        try {
            const ls = localStorage.getItem("trhc.uiLang");
            if (ls) return String(ls).toLowerCase();
        } catch {}
        const html = (document.documentElement.lang || "").toLowerCase();
        return html === "id" || html === "en" ? html : "en";
    }
    function setUiBadge(scope) {
        const badge = $("#uiLangBadge", scope || document);
        if (!badge) return;
        badge.textContent = (getCurrentUiLang() || "en").toUpperCase();
    }

    function applyI18N(scope) {
        $$("[data-i18n]", scope).forEach((el) => {
            const key = el.getAttribute("data-i18n");
            const label = el.querySelector(".label");
            const text = t(key, label ? label.textContent : el.textContent);
            if (label) label.textContent = text;
            else el.textContent = text;
        });
        setUiBadge(scope);
    }

    function bindHeader() {
        const header = $(".app-header") || injectHeader();
        if (!header) return;

        document.documentElement.classList.remove("no-js");

        const btnTheme = $("#btnTheme", header);
        const btnUiLang = $("#btnUiLang", header);

        btnTheme &&
            btnTheme.addEventListener("click", () => {
                if (window.TRTheme && typeof TRTheme.toggleTheme === "function") TRTheme.toggleTheme();
            });

        btnUiLang &&
            btnUiLang.addEventListener("click", () => {
                if (window.TRI18N && typeof TRI18N.toggleUiLang === "function") {
                    TRI18N.toggleUiLang();
                } else {
                    try {
                        const cur = getCurrentUiLang();
                        localStorage.setItem("trhc.uiLang", cur === "en" ? "id" : "en");
                    } catch {}
                    setUiBadge(header);
                    document.dispatchEvent(
                        new CustomEvent("trhc:i18nUpdated", { detail: { lang: getCurrentUiLang() } })
                    );
                }
            });

        setUiBadge(header);
        applyI18N(header);

        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register("/assets/js/sw.js").catch(() => {});
        }
    }

    document.addEventListener("trhc:i18nUpdated", () => {
        const h = $(".app-header");
        if (h) applyI18N(h);
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bindHeader, { once: true });
    } else {
        bindHeader();
    }

    window.TRHeader = window.TRHeader || { inject: injectHeader, bind: bindHeader, setBadge: setUiBadge };
})();
