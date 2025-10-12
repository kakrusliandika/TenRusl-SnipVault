# SnipVault — DOMPurify v3 Plugin (Self-Host, No-Bundler)

Versi vendor: **DOMPurify 3.2.7** (Apache-2.0). Sumber: jsDelivr.  
Base lokal: `/assets/vendor/dompurify3/dist/` → berkas utama **purify.min.js**.

## File di plugin

-   `dompurify-loader.js` — loader aman CSP untuk memuat `window.DOMPurify` dari self-host; fallback opsional ke CDN.
-   `sanitizer.js` — pembungkus profil sanitasi (strict / markdown / svg) + hook keamanan link.
-   `dompurify.config.json` — konfigurasi base path & preset.
-   `LICENSE-3rdparty.txt` — notice lisensi pihak ketiga.

## Pakai cepat

```html
<script src="/assets/plugin/dompurify/dompurify-loader.js"></script>
<script src="/assets/plugin/dompurify/sanitizer.js"></script>
<script>
    SnipVaultDOMPurify.ensure().then(() => {
        const html = '<p>Hello <a href="https://x.y" target="_blank">link</a></p>';
        const safe = SnipVaultSanitizer.sanitize(html, { profile: "markdown" });
        document.getElementById("preview").innerHTML = safe;
    });
</script>
```

## Profil

-   **strict** (default): sangat ketat, cocok untuk konten umum UI. `svg`, `img`, `iframe`, `style`, event handler **dilarang**.
-   **markdown**: cocok untuk HTML hasil render markdown yang simpel (a,b,i,em,strong,code,pre,blockquote,ul,ol,li,table,th,td,h1–h6,br,hr,span,div). `img` diperbolehkan dengan pembatasan skema.
-   **svg** (opsional): subset tag/atribut SVG yang aman (_tanpa_ `foreignObject`, _tanpa_ event).

Hook keamanan:

-   `rel="noopener noreferrer nofollow ugc"` otomatis pada `<a target="_blank">`.
-   Validasi skema URL: `http`, `https`, `mailto`, `tel`, `data:image/(png|jpeg|gif);base64,` (lainnya diblok).

## CSP

-   Self-host: cukup `script-src 'self'`.
-   CDN fallback: whitelist `https://cdn.jsdelivr.net` jika diaktifkan.
