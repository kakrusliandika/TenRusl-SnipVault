# SnipVault — Dexie v4 Plugin (Self-Host, No-Bundler)

Versi vendor: **Dexie 4.2.0** (Apache-2.0). Sumber: jsDelivr.  
Base lokal: `/assets/vendor/dexie4/dist/` → berkas utama **dexie.min.js**.

## File di plugin

-   `dexie-loader.js` — loader aman CSP untuk memuat Dexie (UMD) dari **self-host**; fallback opsional ke CDN.
-   `dexie-db.js` — helper CRUD & query untuk skema SnipVault.
-   `dexie.config.json` — konfigurasi base path & versi.
-   `LICENSE-3rdparty.txt` — notice lisensi pihak ketiga.

## Pakai cepat

```html
<script src="/assets/plugin/dexie/dexie-loader.js"></script>
<script src="/assets/plugin/dexie/dexie-db.js"></script>
<script>
    SnipVaultDexie.ensure()
        .then(() => SnipVaultDB.ready())
        .then(async (db) => {
            await SnipVaultDB.upsertSnippet(db, { title: "Hello", content: "console.log('hi')" });
        });
</script>
```

## Catatan

-   Loader menggunakan **/assets/vendor/dexie4/dist/dexie.min.js** secara default.
-   Jika perlu, `SnipVaultDexie.setSourceBase("/path/lain")`.
-   CDN fallback: `https://cdn.jsdelivr.net/npm/dexie@4.2.0/dist/dexie.min.js`.

Sumber file dist dexie@4.2.0: tersedia `dexie.min.js`, `dexie.js`, `dexie.mjs` di folder `dist/` (jsDelivr).
