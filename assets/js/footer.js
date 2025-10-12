/* footer.js — Bind/inject .app-footer + i18n + TRStatus helper */
(() => {
    "use strict";
    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

    function t(key, fallback) {
        const i18n =
            window.TRI18N && TRI18N.t ? TRI18N : window.SnipVaultI18N && SnipVaultI18N.t ? SnipVaultI18N : null;
        if (!i18n) return fallback || key;
        const out = i18n.t(key);
        return out == null ? fallback || key : out;
    }

    function applyI18N(scope) {
        $$("[data-i18n]", scope).forEach((el) => {
            const key = el.getAttribute("data-i18n");
            const label = el.querySelector(".label");
            const text = t(key, label ? label.textContent : el.textContent);
            if (label) label.textContent = text;
            else el.textContent = text;
        });
    }

    function setYear(scope) {
        const yearEl = $("#year", scope);
        if (yearEl) yearEl.textContent = new Date().getFullYear();
    }

    function injectFooter() {
        const existing = $(".app-footer");
        if (existing) return existing;

        const f = document.createElement("footer");
        f.className = "app-footer";
        f.innerHTML = `
      <div class="left">
        <div id="status" role="status" aria-live="polite"></div>
        <div class="muted">
          © <span id="year"></span> TenRusl SnipVault
          <span class="dot">•</span>
          <span class="badge">Offline-first</span>
        </div>
      </div>
      <div class="right">
        <a href="/pages/privacy.html" class="icon-btn" data-i18n="privacy" title="Privacy">
          <i class="fa-solid fa-shield icon" aria-hidden="true"></i>
          <span class="label">Privacy</span>
        </a>
        <a href="/pages/terms.html" class="icon-btn" data-i18n="terms" title="Terms">
          <i class="fa-solid fa-scale-balanced icon" aria-hidden="true"></i>
          <span class="label">Terms</span>
        </a>
        <a href="/pages/cookies.html" class="icon-btn" data-i18n="cookies" title="Cookies">
          <i class="fa-solid fa-cookie-bite icon" aria-hidden="true"></i>
          <span class="label">Cookies</span>
        </a>
      </div>`;
        document.body.appendChild(f);
        return f;
    }

    function bindFooter() {
        const f = $(".app-footer") || injectFooter();
        if (!f) return;
        setYear(f);
        applyI18N(f);
    }

    // re-translate saat bahasa diubah (dukung event lama & baru)
    document.addEventListener("sv:i18nUpdated", () => {
        const f = $(".app-footer");
        if (f) applyI18N(f);
    });
    document.addEventListener("trhc:i18nUpdated", () => {
        const f = $(".app-footer");
        if (f) applyI18N(f);
    });

    // boot
    function boot() {
        bindFooter();
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot, { once: true });
    } else {
        boot();
    }

    // helper status bar
    window.TRStatus = window.TRStatus || {
        set(msg) {
            const el = document.querySelector(".app-footer #status");
            if (!el) return;
            el.textContent = msg || "";
            if (msg)
                setTimeout(() => {
                    if (el.textContent === msg) el.textContent = "";
                }, 2200);
        },
    };
})();
