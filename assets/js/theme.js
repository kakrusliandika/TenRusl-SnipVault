/* theme.js — Dark/Light theme + sync Prism CSS */
(function () {
    const THEMES = {
        dark: "/assets/plugin/prismjs/package/themes/prism-okaidia.min.css",
        light: "/assets/plugin/prismjs/package/themes/prism-solarizedlight.min.css",
    };
    const LS_KEY = "trhc.theme";
    const prismThemeEl = document.getElementById("prism-theme");

    function setTheme(mode) {
        const light = mode === "light";
        document.documentElement.classList.toggle("light", light);
        if (prismThemeEl) prismThemeEl.href = light ? THEMES.light : THEMES.dark;
        localStorage.setItem(LS_KEY, mode);
    }

    function toggleTheme() {
        const cur = localStorage.getItem(LS_KEY) || "dark";
        setTheme(cur === "dark" ? "light" : "dark");
    }

    function init() {
        const mode = localStorage.getItem(LS_KEY) || "dark";
        setTheme(mode);
    }

    document.addEventListener("DOMContentLoaded", init);

    // expose
    window.TRTheme = { setTheme, toggleTheme };
})();
