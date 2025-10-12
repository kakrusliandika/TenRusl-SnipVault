# SnipVault — CodeMirror 5 Subset (Self-Host, No-Bundler)

Paket ini memuat **CodeMirror 5** (subset bahasa inti & tema) untuk SnipVault, **tanpa bundler** dan **CSP-friendly**. Default mengarah ke vendor lokal:  
`/assets/vendor/codemirror6` ← foldermu hasil mirror (berisi `lib/`, `mode/`, `addon/`, `theme/`).

## File

-   `codemirror-loader.js` — Loader lazy expose `window.SnipVaultCM` (`ensure()`, `init()`, `setSourceBase()`).
-   `codemirror.config.json` — Preferensi tema/bahasa/addon + base path.
-   `LICENSE-3rdparty.txt` — Notice lisensi CodeMirror (MIT).

## Pakai Cepat (di HTML)

```html
<script src="/assets/plugin/codemirror/codemirror-loader.js"></script>
<script>
    // optional: pastikan base self-host (default sudah /assets/vendor/codemirror6)
    // SnipVaultCM.setSourceBase("/assets/vendor/codemirror6");

    SnipVaultCM.ensure({ theme: "light" }) // memuat core + addons + tema + subset modes
        .then(() => {
            var host = document.getElementById("snipvault-editor");
            window._cm = SnipVaultCM.init(host, { mode: "javascript", theme: "eclipse" });
        });
</script>
```

## Alihkan ke CDN (opsional)

```js
SnipVaultCM.setSourceBase("https://cdn.jsdelivr.net/npm/codemirror@6.65.7");
```

> Tambah domain CDN ke CSP jika diperlukan.

## Subset Bahasa

-   JavaScript (+ JSON), XML, CSS, HTMLMixed
-   Markdown
-   Python, Shell, C-like

## Tema

-   **Light**: Eclipse
-   **Dark**: Monokai
