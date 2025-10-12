# SnipVault — idb-keyval v6 Plugin (Self-Host, No-Bundler)

Versi vendor: **idb-keyval 6.2.2** (Apache-2.0). Sumber: jsDelivr.  
Base lokal: `/assets/vendor/idb-keyval6/dist/` → berkas utama **umd.js** (IIFE global `idbKeyval`).

## File di plugin

-   `idb-keyval-loader.js` — loader aman CSP untuk memuat idb-keyval (UMD/IIFE) dari self-host; fallback opsional ke CDN.
-   `idbkv-store.js` — helper CRUD sederhana berbasis KV (tanpa indeks).
-   `idb-keyval.config.json` — konfigurasi base path & versi.
-   `LICENSE-3rdparty.txt` — notice lisensi pihak ketiga.

## Pakai cepat

```html
<script src="/assets/plugin/idb-keyval/idb-keyval-loader.js"></script>
<script src="/assets/plugin/idb-keyval/idbkv-store.js"></script>
<script>
    SnipVaultKV.ready().then(async (store) => {
        await SnipVaultKV.upsertSnippet(store, { title: "Hello", content: "..." });
    });
</script>
```

## Catatan

-   Loader mencoba `/dist/umd.js` lebih dulu, fallback ke `/dist/index.js` jika perlu.
-   CDN fallback: `https://cdn.jsdelivr.net/npm/idb-keyval@6.2.2/dist/umd.js`.
-   idb-keyval cocok untuk kebutuhan minimal; untuk indeks & query cepat gunakan Dexie.
