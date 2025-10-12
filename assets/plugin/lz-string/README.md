# SnipVault — LZ-String Plugin (Self-Host, No-Bundler)

**Tujuan:** kompresi ringan untuk **share hash pendek** (di URL `#...`) tanpa server.  
Menggunakan **LZ-String** (`compressToEncodedURIComponent` / `decompressFromEncodedURIComponent`) agar hasil **URL-safe**.

## Vendor (disarankan self-host)

-   Path lokal: `/assets/vendor/lz-string/libs/lz-string.min.js`
-   CDN fallback (opsional): `https://cdn.jsdelivr.net/npm/lz-string@1.5.0/libs/lz-string.min.js`

> Kamu bebas menaruh versi lain di vendor lokal—loader akan mencari `lz-string.min.js` lalu `lz-string.js` di folder `libs/`.

## File di plugin

-   `lzstring-loader.js` — memuat global `LZString` dari vendor lokal; fallback opsional ke CDN.
-   `lzhash.js` — helper untuk encode/decode JSON → hash pendek (URL-safe), plus util parsing `location.hash`.
-   `lz-string.config.json` — konfigurasi base path & limit ukuran.
-   `LICENSE-3rdparty.txt` — notice lisensi pihak ketiga (MIT untuk LZ-String).

## Pakai cepat

```html
<script src="/assets/plugin/lz-string/lzstring-loader.js"></script>
<script src="/assets/plugin/lz-string/lzhash.js"></script>
<script>
    await SnipVaultLZ.ensure();
    // Buat hash dari objek ringan (metadata minimal, tanpa konten sensitif)
    const meta = { v:1, view:'snippet', id:'abc123', ts:Date.now() };
    const hash = SnipVaultHash.toHash(meta, { key:'s' }); // hasil seperti "#s=..."
    location.hash = hash;

    // Baca kembali dari URL
    const parsed = SnipVaultHash.fromCurrent({ key:'s' });
    console.log(parsed);
</script>
```

## Rekomendasi

-   **Ukuran aman** untuk `location.hash`: ≤ ~1200 byte (target < 1KB) agar kompatibel lintas browser/OS.
-   Simpan **metadata minimal saja** (id, filter, sort). Jangan masukkan konten snippet atau data sensitif.
-   Versikan payload (`{ v: 1, ... }`) untuk kompatibilitas ke depan.
