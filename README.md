# TenRusl SnipVault — Offline Snippet Vault (PWA, IndexedDB)

> Private, fast, and **offline‑first** **PWA** to store & manage code/text **snippets** with full‑text search, **tags**, **favorites**, **pinned**, powerful filters/sort, **export/import JSON (with optional LZ compression)**, multilingual UI (**EN/ID**), and privacy‑hardened headers.

![Status](https://img.shields.io/badge/PWA-Ready-8b5cf6)
![License](https://img.shields.io/badge/License-MIT-green)
![Stack](https://img.shields.io/badge/Stack-Vanilla%20JS%20%7C%20Dexie%20%7C%20DOMPurify%20%7C%20PWA-111)
![NoBuild](https://img.shields.io/badge/Build-None%20%28Static%20Site%29-2ea44f)
![Stars](https://img.shields.io/github/stars/kakrusliandika/TenRusl-SnipVault?style=social)
![Forks](https://img.shields.io/github/forks/kakrusliandika/TenRusl-SnipVault?style=social)

Live: **—**

---

## Table of Contents

-   [✨ Key Features](#key-features)
-   [▶️ Quick Demo](#quick-demo)
-   [📦 Install (Open Source)](#install-open-source)
-   [🚀 Deployment](#deployment)
-   [🗂️ Directory Structure](#directory-structure)
-   [⚙️ How It Works](#how-it-works)
-   [🔎 Search](#search)
-   [⌨️ Keyboard Navigation](#keyboard-navigation)
-   [🎛️ Options & Preferences](#options--preferences)
-   [🗃️ Export & Import](#export--import)
-   [📲 PWA & Caching](#pwa--caching)
-   [🌍 I18N](#i18n)
-   [🛡️ Security Headers (Recommended)](#security-headers-recommended)
-   [🛠️ Development](#development)
-   [🐞 Troubleshooting](#troubleshooting)
-   [🤝 Contributing](#contributing)
-   [📜 Code of Conduct](#code-of-conduct)
-   [🏆 Credits](#credits)
-   [👤 Author](#author)
-   [🗺️ Roadmap](#roadmap)
-   [📄 License](#license)

---

## ✨ Key Features

-   **Offline‑first vault**  
    Snippets saved in **IndexedDB** (via Dexie) with graceful **fallbacks** to `idb-keyval` → `localStorage`.
-   **Organize & filter**  
    **Tags**, **Favorites**, **Pinned**, language tagging, query search, **AND** filter, **sort** & **direction**, optional **Pinned‑first**.
-   **Clean editor & list**  
    Simple two‑pane UX: list on the left, editor on the right. Focused, fast, and private.
-   **Export/Import**  
    **JSON** and **LZ‑compressed JSON** (smaller, via LZ‑String). Duplicate‑safe (ID/hash/title aware).
-   **Privacy‑hardened**  
    Strict **CSP**, COOP/CORP, and minimal external dependencies. Works fully **offline**; no data leaves your browser.
-   **Multilingual (EN/ID)**  
    UI can be toggled anytime; updates labels, placeholders, and ARIA attributes at runtime.
-   **No build step**  
    Pure static site: open locally in a dev server and you’re good.

---

## ▶️ Quick Demo

1. **Add** a new snippet or **import** from JSON.
2. **Filter** by query, tags, language; toggle **favorites/pinned**, sort & direction.
3. **Edit** title/content; **Save** to persist.
4. **Export** selected/all snippets to JSON or **LZ JSON**.
5. Toggle **Theme** (light/dark) and **Language** (EN/ID).

---

## 📦 Install (Open Source)

### 1) Clone the repository

```bash
# SSH (recommended if you set up SSH keys)
git clone --depth 1 git@github.com:kakrusliandika/TenRusl-SnipVault.git
# or HTTPS
git clone --depth 1 https://github.com/kakrusliandika/TenRusl-SnipVault.git

cd TenRusl-SnipVault
```

> `--depth 1` gives you a shallow clone for a faster download.

### 2) Run it

Pick one (no build step):

```bash
# Using Node "serve"
npx serve . -p 5173

# Or Python
python -m http.server 5173

# Or Bun
bunx serve . -p 5173
```

Open `http://localhost:5173`.

### 3) Keep your fork in sync (optional)

```bash
# Add the original repo as upstream
git remote add upstream https://github.com/kakrusliandika/TenRusl-SnipVault.git

# Fetch and merge updates
git fetch upstream
git checkout main
git merge upstream/main
```

### 4) Create a new branch for your changes (for PRs)

```bash
git checkout -b feat/awesome-improvements
# ...do your changes...
git add -A
git commit -m "feat: awesome improvements to SnipVault"
git push origin feat/awesome-improvements
# Then open a Pull Request on GitHub
```

---

### Building?

No build step required. Just keep the Service Worker scope correct (see PWA section).

---

## 🚀 Deployment

### Cloudflare Pages (recommended)

-   **Build command**: _(empty)_  
-   **Output directory**: `/` (root)
-   Ensure the Service Worker is available at **`/sw.js`** or registered with **root scope**.
-   Current source registers `/* SnipVault Service Worker (scope: /assets/js/) — cache-first for static, SWR for others  "/assets/js/sw.js"`. If you keep it under `/assets/js/sw.js`, set **`Service-Worker-Allowed: /`** header **or** move it to site root.
-   `_headers` and `_redirects` are honored on Cloudflare Pages.

### Netlify / Vercel / Any static host

-   Upload the repo as‑is.
-   Apply **security headers** (see section below).
-   Keep `/_redirects` for SPA routing (`/*  /index.html  200`).

### Apache / Nginx

-   Mirror the headers via `.htaccess` (Apache) or server config (Nginx).
-   Ensure Service Worker scope covers `/` and that `/sw.js` resolves.

---

## 🗂️ Directory Structure

**Generic (POSIX)** — *(vendor folders omitted)*

```
/
├─ index.html
├─ manifest.webmanifest
├─ ads.txt
├─ robots.txt
├─ sitemap.xml
├─ sitemap-index.xml
├─ CODE_OF_CONDUCT.md
├─ CONTRIBUTING.md
├─ LICENSE
├─ README.md
├─ humans.txt
├─ consent-base.js
├─ googleFClG-yRowubCICDyQFjDm65cnX4tk4WYcmDA0EXmRQQ.html
├─ _headers
├─ _redirects
├─ .well-known/
│  └─ security.txt
├─ assets/
│  ├─ css/
│  ├─ i18n/
│  ├─ images/
│  ├─ js/
│  └─ plugin/
├─ pages/
│  
│  404.html
│  ad-unit-example.html
│  contact.html
│  cookies.html
│  head-snippets.html
│  index-injection-example.html
│  index.html
│  offline.html
│  privacy.html
│  terms.html
```

> *Note:* plugin list truncated for brevity; includes **Dexie**, **idb‑keyval**, **LZ‑String**, **DOMPurify**, **CodeMirror**, **FontAwesome**, and utility loaders.

---

## ⚙️ How It Works

-   **Storage**: `Dexie` (IndexedDB) as primary. Fallbacks to `idb-keyval`, then `localStorage` for environments that restrict IndexedDB.
-   **Model**: each snippet has `id`, `title`, `language`, `content`, `tags[]`, `favorite`, `pinned`, `created_at`, `updated_at`, and optional `notes`.
-   **UI**: left pane (list & filters), right pane (editor). DOM updated efficiently; dark/light theme toggle.
-   **I18N**: dictionaries in `/assets/i18n/*.json` with runtime updates on the `trhc:i18nUpdated` event.
-   **Security**: CSP clamps third‑party access; DOMPurify available for sanitizing if/when rendering rich content.

---

## 🔎 Search

-   Optional **Web Worker** (`assets/js/search-worker.js`) builds an **inverted index** for fast token queries across titles/content/tags.
-   If not initialized, the app falls back to simple filter/search in the main thread.
-   Tokenization is language‑agnostic (basic Unicode word boundaries).

---

## ⌨️ Keyboard Navigation

-   Designed to be **keyboard‑first**: Tab/Shift‑Tab across inputs and actions.
-   Modal tutorial supports **Esc** to close and retains focus.
-   *(Custom global shortcuts may be added in future; see Roadmap.)*

---

## 🎛️ Options & Preferences

-   **Filters**: query, language, tags (**AND** logic), favorites, pinned.
-   **Sorting**: by `updated_at`/`title`, ascending/descending, optional **Pinned‑first**.
-   **Theme**: light/dark toggle.
-   **Persistence**: preferences stored locally (browser storage).

---

## 🗃️ Export & Import

-   **Export** your vault to **JSON** or **LZ JSON** (compressed).  
-   **Import** is duplicate‑tolerant (ID/hash/title aware); safely merges into your vault.
-   Ideal for backups or migration to another browser/device.

---

## 📲 PWA & Caching

`assets/js/sw.js` provides offline capability:

-   **App shell precache** — HTML, CSS, JS, manifest, icon, and offline page.
-   **Runtime cache** — same‑origin assets (cache‑first) and navigations (`stale‑while‑revalidate`).

Notes:

-   Ensure **scope** covers `/` for full offline UX. Either place SW at site root (`/sw.js`) **or** serve with header `Service-Worker-Allowed: /` if kept at `/assets/js/sw.js`.
-   Bump `VERSION` in the SW when changing assets to invalidate old caches.
-   Fallback to `/pages/offline.html` for navigations when offline.

---

## 🌍 I18N

-   Dictionaries: `/assets/i18n/en.json`, `/assets/i18n/id.json`, `/assets/i18n/pages.json`.
-   Runtime toggle updates visible labels and accessibility text via `trhc:i18nUpdated`.

---

## 🛡️ Security Headers (Recommended)

Use an `_headers` file (Cloudflare Pages/Netlify) similar to:

```
/*
  Content-Security-Policy: default-src 'self'; img-src 'self' blob: data:; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```
> If your SW remains at `/assets/js/sw.js`, also include:  
> `Service-Worker-Allowed: /` mapped to that path (or relocate SW to `/sw.js`).

---

## 🛠️ Development

-   Entry: `index.html`
-   Core logic: `assets/js/vault.js`, `assets/js/db.js`, `assets/js/export-import.js`
-   Bootstrap & loaders: `assets/js/app.js`, `assets/plugin/*`
-   PWA: `assets/js/sw.js`
-   Theme & chrome: `assets/css/*`
-   i18n: `assets/i18n/*.json`

---

## 🐞 Troubleshooting

-   **Service Worker inactive** → ensure you’re on `http://localhost` or `https://` (not `file://`).  
-   **Scope mismatch** → SW at `/assets/js/sw.js` needs `Service-Worker-Allowed: /` or relocation to `/sw.js`.  
-   **Import fails** → verify JSON structure version and that it’s not an unrelated file.  
-   **IndexedDB blocked** → some privacy modes disable it; app will fall back but with reduced capacity/perf.  
-   **Fonts/colors look off** → verify `theme.css` is loaded and that your browser allows background in print (if printing page).

---

## 🤝 Contributing

We welcome issues and PRs. Please:

1. Fork & branch: `git checkout -b feat/short-name`
2. Commit with conventional commits (e.g., `feat: add pinned-first sorting`)
3. Open a PR with before/after notes for UI changes

See **CONTRIBUTING.md** for details.

---

## 📜 Code of Conduct

By participating, you agree to abide by our **Contributor Covenant**. See **CODE_OF_CONDUCT.md**.

---

## 🏆 Credits

-   **Dexie** (IndexedDB wrapper)
-   **idb‑keyval**
-   **LZ‑String**
-   **DOMPurify**
-   **(Optional) CodeMirror** loader included

---

## 👤 Author

-   **Andika Rusli (TenRusl)**
-   **GitHub**: https://github.com/kakrusliandika

---

## 🗺️ Roadmap

-   [ ] Enable **Search Worker** by default (auto‑index + live queries)
-   [ ] **Multi‑select** actions in list (bulk delete/export/tag)
-   [ ] **CodeMirror** editor integration (language modes, themes)
-   [ ] Optional **PNG/PDF export** for single snippet (via `html-to-image` + `jsPDF`)
-   [ ] **Import from folder** (multi‑file drag‑drop)

---

## 📄 License

**MIT** — do what you need, just keep the license. See **LICENSE**.
