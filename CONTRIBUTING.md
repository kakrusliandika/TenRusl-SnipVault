# Contributing to TenRusl Highlight Code (TRHC)

First off—thank you for taking the time to contribute! 🎉  
This project is open-source and we welcome issues, discussions, docs fixes, and feature PRs.

> By participating, you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## 💡 Ways to Contribute

-   **Bug reports** (with minimal repro)
-   **Feature requests** (clearly scoped)
-   **Documentation** (README, usage tips, i18n)
-   **DX/UX improvements** (keyboard shortcuts, toolbar, etc.)
-   **Performance** (SW cache, autoloader, payload size)

---

## 🧰 Project Setup

This is a static site (no build step). Run with any static server:

```bash
# Clone your fork
git clone --depth 1 https://github.com/<you>/TenRusl-HighlightCode.git
cd TenRusl-HighlightCode

# Run locally
npx serve . -p 5173       # or: python -m http.server 5173
# open http://localhost:5173
```

> Ensure **`sw.js`** is available at the **repo root** (`/sw.js`) so the Service Worker scope covers `/`.  
> The app also supports a fallback at `/assets/js/sw.js` (see headers). If you use the fallback path, set header:
> `Service-Worker-Allowed: /` for `/assets/js/sw.js`.

---

## 🌳 Branching & Workflow

1. **Fork** the repo and clone your fork.
2. Create a feature branch from `main`:
    ```bash
    git checkout -b feat/<short-feature-name>
    ```
3. Make your changes, then commit:
    ```bash
    git add -A
    git commit -m "feat: add keyboard shortcuts for copy/export"
    ```
4. Push and open a PR:
    ```bash
    git push origin feat/<short-feature-name>
    ```

Keep PRs focused and as small as possible.

---

## 📝 Conventional Commits

Use the conventional commits format for clear history:

```
feat: add PNG export options
fix: prevent SW cache mismatch on theme switch
docs: update README with Docker run
chore: bump Prism components
refactor: simplify language detector
perf: reduce autoloader round-trips
test: add unit tests for detector (if applicable)
```

Optional scopes: `feat(ui): ...`, `fix(sw): ...`, `docs(i18n): ...`

---

## 🧪 PR Checklist

-   [ ] **Works offline** (basic actions available with no network)
-   [ ] **Copy Word** preserves colors in Word/Google Docs
-   [ ] **Autoloader** fetches the needed language components
-   [ ] **No console errors** in common flows
-   [ ] **`sw.js` VERSION bumped** if assets changed (cache-busting)
-   [ ] **Docs updated** (README/i18n) if behavior/labels changed
-   [ ] For UI changes, attach small **before/after** screenshots (optional)

---

## 🌐 Adding Languages / i18n

-   **New Prism language**: drop `prism-<lang>.min.js` into  
    `assets/plugin/prismjs/package/components/` → autoloader will fetch it.
-   **List in menu**: optionally update `assets/languages.json`.
-   **New UI language**: add `assets/i18n/<xx>.json` and call `setUiLang("xx")`.

---

## 🛡️ Security & Headers

See **\_headers** in the repo for CSP, caching, and SW scope settings.

---

## 🐞 Filing Good Issues

When reporting a bug, include:

-   Steps to reproduce (minimal snippet preferred)
-   Expected vs actual behavior
-   Browser/OS/version
-   Console/network logs if relevant

Search existing issues first to avoid duplicates.

---

## 🔄 Keeping Your Fork in Sync

```bash
git remote add upstream https://github.com/kakrusliandika/TenRusl-HighlightCode.git
git fetch upstream
git checkout main
git merge upstream/main
```

---

## 📜 License

By contributing, you agree that your contributions are licensed under the **MIT License** of this repository.
