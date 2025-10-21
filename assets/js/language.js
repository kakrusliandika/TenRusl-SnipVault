/* language.js — i18n EN/ID for SnipVault (FINAL, idempotent & HTML-aware)
   - Merges /assets/i18n/en.json & id.json into safe FALLBACK (no duplicates)
   - data-i18n => textContent   |  data-i18n-html => innerHTML
   - data-i18n-attr="attr:key|attr:key" for placeholders/aria
*/
(function () {
    "use strict";

    /* ---------- Storage & supported ---------- */
    const LS_LANG = "tenrusl.uiLang";
    const LS_DICT = (lang) => `tenrusl.i18n.${lang}`;
    const SUPPORTED = ["en", "id"];

    /* ---------- Optional badge ---------- */
    const uiBadge = document.getElementById("uiLangBadge");

    /* ---------- Fallback minimal (extended with Guide) ---------- */
    const FALLBACK = {
        en: {
            actions: {
                new: "New",
                save: "Save",
                delete: "Delete",
                duplicate: "Duplicate",
                copy: "Copy",
                export: "Export",
                import: "Import",
            },
            filters: {
                search_placeholder: "Search title, content, or tags…",
                language: "Language",
                tags: "Tags",
                tags_hint: "Separate with commas",
                and_mode: "AND mode",
                favorite: "Favorite",
                pinned: "Pinned",
                pinned_first: "Pinned first",
            },
            sort: {
                label: "Sort",
                updated_at: "Last edited",
                created_at: "First created",
                title: "Title",
                language: "Language",
                asc: "Asc",
                desc: "Desc",
            },
            editor: {
                title: "Title",
                language: "Language",
                notes: "Notes",
                preview_notes: "Notes Preview",
                favorite: "Favorite",
                pinned: "Pinned",
            },
            status: {
                count: "{{n}} results",
                empty_list: "No snippets yet. Create your first!",
                init_error: "Initialization failed. Check console.",
            },
            ui: {
                list: "List",
                results: "Results",
                preview: "Preview",
                filters: "Filters", // << added to avoid [object Object] when used as data-i18n="ui.filters"
            },
            shortcuts: { palette: "Global search" },
            guide: {
                title: "How to use SnipVault",
                subtitle: "Quick start, tips, offline, backup—everything in one page.",
                quickstart: {
                    title: "Quick Start",
                    steps: [
                        "Click <b>New</b> to create a snippet.",
                        "Fill <b>Title</b>, choose <b>Language</b>, type your code/notes.",
                        "Add <b>Tags</b> (comma separated) for easy filtering.",
                        "Mark <b>Favorite</b> or <b>Pinned</b> if needed.",
                        'Press <b>Save</b> (or <span class="kbd">Ctrl</span>+<span class="kbd">S</span>).',
                    ],
                },
                capture: {
                    title: "Capture & Edit",
                    items: [
                        "Duplicate from an existing snippet using <b>Duplicate</b>.",
                        "Use <b>Notes</b> panel (markdown-lite) for explanations.",
                        "Click <b>Copy</b> to copy code to clipboard.",
                    ],
                },
                search: {
                    title: "Search & Filter",
                    items: [
                        "Global search supports title, content, and tags.",
                        "Filter by <b>Language</b>, <b>Tags</b>, <b>Favorites</b>, <b>Pinned</b>.",
                        "Toggle <b>AND mode</b> to match all tags.",
                        "Sort by <b>updated_at</b>, <b>created_at</b>, <b>title</b>, or <b>language</b>.",
                    ],
                },
                transfer: {
                    title: "Import & Export",
                    items: [
                        "Click <b>Export</b> to download <code>.json</code> of all snippets.",
                        "Use <b>Import</b> to load a previous export; conflicts are auto-checked.",
                        "Choose strategy: <i>skip</i>, <i>overwrite-id</i>, or <i>always-insert</i> (see preview).",
                    ],
                },
                backup: {
                    title: "Backup & Restore",
                    items: [
                        "Enable periodic backup reminders in Settings (e.g., every 7 days).",
                        "Keep exports in cloud storage or version control.",
                    ],
                },
                offline: {
                    title: "Offline & PWA",
                    items: [
                        "Install as App (PWA) for 1-click access; works fully offline.",
                        "Updates are small; if a banner appears, reload to apply.",
                    ],
                },
                shortcuts: {
                    title: "Keyboard Shortcuts",
                    items: [
                        '<span class="kbd">Ctrl</span>+<span class="kbd">K</span> — Global search',
                        '<span class="kbd">Ctrl</span>+<span class="kbd">S</span> — Save',
                        '<span class="kbd">N</span> — New snippet',
                        '<span class="kbd">Del</span> — Delete (with confirm)',
                    ],
                },
                troubleshoot: {
                    title: "Troubleshooting",
                    items: [
                        "If list is empty, check filters and clear search.",
                        "If save fails, ensure browser storage is not blocked (incognito quotas).",
                        "Import errors: confirm file is a valid SnipVault export.",
                    ],
                },
                privacy: {
                    title: "Privacy & Security",
                    items: [
                        "Data stays in your browser (IndexedDB). Optional local encryption via <b>Secure Mode</b>.",
                        "Always export before clearing site data or reinstalling the browser.",
                    ],
                },
            },
        },
        id: {
            actions: {
                new: "Baru",
                save: "Simpan",
                delete: "Hapus",
                duplicate: "Duplikat",
                copy: "Salin",
                export: "Ekspor",
                import: "Impor",
            },
            filters: {
                search_placeholder: "Cari judul, isi, atau tag…",
                language: "Bahasa",
                tags: "Tag",
                tags_hint: "Pisahkan dengan koma",
                and_mode: "Mode AND",
                favorite: "Favorit",
                pinned: "Pin",
                pinned_first: "Pin di atas",
            },
            sort: {
                label: "Urut",
                updated_at: "Terakhir diubah",
                created_at: "Pertama dibuat",
                title: "Judul",
                language: "Bahasa",
                asc: "Naik",
                desc: "Turun",
            },
            editor: {
                title: "Judul",
                language: "Bahasa",
                notes: "Catatan",
                preview_notes: "Pratinjau Catatan",
                favorite: "Favorit",
                pinned: "Pin",
            },
            status: {
                count: "{{n}} hasil",
                empty_list: "Tidak ada snippet. Buat yang pertama!",
                init_error: "Gagal inisialisasi. Periksa konsol.",
            },
            ui: {
                list: "Daftar",
                results: "Hasil",
                preview: "Pratinjau",
                filters: "Filter", // << added
            },
            shortcuts: { palette: "Pencarian global" },
            guide: {
                title: "Cara menggunakan SnipVault",
                subtitle: "Mulai cepat, tips, offline, backup—semua di satu halaman.",
                quickstart: {
                    title: "Mulai Cepat",
                    steps: [
                        "Klik <b>Baru</b> untuk membuat snippet.",
                        "Isi <b>Judul</b>, pilih <b>Bahasa</b>, ketik kode/catatan Anda.",
                        "Tambahkan <b>Tag</b> (pisahkan dengan koma) agar mudah difilter.",
                        "Tandai <b>Favorit</b> atau <b>Pin</b> bila perlu.",
                        'Tekan <b>Simpan</b> (atau <span class="kbd">Ctrl</span>+<span class="kbd">S</span>).',
                    ],
                },
                capture: {
                    title: "Tangkap & Edit",
                    items: [
                        "Gandakan dari snippet yang ada dengan <b>Duplikat</b>.",
                        "Gunakan panel <b>Catatan</b> (markdown-lite) untuk penjelasan.",
                        "Klik <b>Salin</b> untuk menyalin kode ke clipboard.",
                    ],
                },
                search: {
                    title: "Pencarian & Filter",
                    items: [
                        "Pencarian global mendukung judul, isi, dan tag.",
                        "Filter berdasarkan <b>Bahasa</b>, <b>Tag</b>, <b>Favorit</b>, <b>Pin</b>.",
                        "Aktifkan mode <b>AND</b> untuk mencocokkan semua tag.",
                        "Urutkan menurut <b>updated_at</b>, <b>created_at</b>, <b>title</b>, atau <b>language</b>.",
                    ],
                },
                transfer: {
                    title: "Impor & Ekspor",
                    items: [
                        "Klik <b>Ekspor</b> untuk mengunduh <code>.json</code> seluruh snippet.",
                        "Gunakan <b>Impor</b> untuk memuat ekspor sebelumnya; konflik dicek otomatis.",
                        "Pilih strategi: <i>skip</i>, <i>overwrite-id</i>, atau <i>always-insert</i> (lihat pratinjau).",
                    ],
                },
                backup: {
                    title: "Backup & Pemulihan",
                    items: [
                        "Aktifkan pengingat backup berkala di Pengaturan (mis. tiap 7 hari).",
                        "Simpan berkas ekspor di cloud storage atau version control.",
                    ],
                },
                offline: {
                    title: "Offline & PWA",
                    items: [
                        "Pasang sebagai Aplikasi (PWA) untuk akses cepat; berfungsi penuh offline.",
                        "Pembaruan kecil; jika muncul banner, muat ulang untuk menerapkan.",
                    ],
                },
                shortcuts: {
                    title: "Shortcut Keyboard",
                    items: [
                        '<span class="kbd">Ctrl</span>+<span class="kbd">K</span> — Pencarian global',
                        '<span class="kbd">Ctrl</span>+<span class="kbd">S</span> — Simpan',
                        '<span class="kbd">N</span> — Snippet baru',
                        '<span class="kbd">Del</span> — Hapus (dengan konfirmasi)',
                    ],
                },
                troubleshoot: {
                    title: "Pemecahan Masalah",
                    items: [
                        "Jika daftar kosong, periksa filter dan bersihkan pencarian.",
                        "Jika gagal menyimpan, pastikan penyimpanan browser tidak diblokir (kuota mode samaran).",
                        "Kesalahan impor: pastikan file adalah ekspor SnipVault yang valid.",
                    ],
                },
                privacy: {
                    title: "Privasi & Keamanan",
                    items: [
                        "Data tetap di browser Anda (IndexedDB). Enkripsi lokal opsional via <b>Mode Aman</b>.",
                        "Selalu ekspor sebelum menghapus data situs atau menginstal ulang browser.",
                    ],
                },
            },
        },
    };

    /* ---------- Aliases (tetap) ---------- */
    const ALIAS = {
        new: "actions.new",
        save: "actions.save",
        delete: "actions.delete",
        duplicate: "actions.duplicate",
        copy: "actions.copy",
        export: "actions.export",
        import: "actions.import",
        language: ["filters.language", "editor.language"],
        tags: "filters.tags",
        andMode: "filters.and_mode",
        favorites: "filters.favorite",
        pinned: "filters.pinned",
        pinnedFirst: "filters.pinned_first",
        sortBy: "sort.label",
        list: "ui.list",
        empty: "status.empty_list",
        results: "ui.results",
        preview: "ui.preview",
        title: ["editor.title"],
        notes: ["editor.notes"],
        favorite: ["editor.favorite", "filters.favorite"],
    };

    let dict = FALLBACK.en;

    /* ---------- helpers ---------- */
    const clamp = (x) => (SUPPORTED.includes(String(x).toLowerCase()) ? String(x).toLowerCase() : "en");

    function getDeep(obj, path) {
        if (!obj || !path) return undefined;
        const segs = String(path).split(".");
        let cur = obj;
        for (let i = 0; i < segs.length; i++) {
            const k = segs[i];
            if (cur && Object.prototype.hasOwnProperty.call(cur, k)) cur = cur[k];
            else return undefined;
        }
        return cur;
    }

    function resolveAlias(key, el) {
        if (key.includes(".")) return key;
        const map = ALIAS[key];
        if (!map) return key;
        if (Array.isArray(map)) {
            const ctx = `${el?.className || ""} ${el?.id || ""}`.toLowerCase();
            if (/sv-filter|filter/.test(ctx)) return map.find((p) => p.startsWith("filters.")) || map[0];
            if (/sv-title|sv-language|editor/.test(ctx)) return map.find((p) => p.startsWith("editor.")) || map[0];
            return map[0];
        }
        return map;
    }

    function interpolate(str, vars) {
        if (!vars) return str;
        return String(str).replace(/\{\{\s*([.\w]+)\s*\}\}/g, (_, k) => {
            const v = getDeep(vars, k);
            return v == null ? "" : String(v);
        });
    }

    function t(key, vars) {
        const resolved = resolveAlias(String(key), null);
        const hit = getDeep(dict, resolved) ?? getDeep(dict, key);
        if (typeof hit === "string") return interpolate(hit, vars);
        return key;
    }

    async function loadDict(lang) {
        const lsKey = LS_DICT(lang);
        const cached = localStorage.getItem(lsKey);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                return { ...FALLBACK[lang], ...parsed };
            } catch {}
        }
        try {
            const res = await fetch(`/assets/i18n/${lang}.json`, { cache: "no-cache", credentials: "same-origin" });
            if (!res.ok) throw new Error("fetch i18n fail");
            const json = await res.json();
            localStorage.setItem(lsKey, JSON.stringify(json));
            return { ...FALLBACK[lang], ...json };
        } catch {
            return FALLBACK[lang] || FALLBACK.en;
        }
    }

    function applyI18n() {
        // [data-i18n] / [data-i18n-html]
        document.querySelectorAll("[data-i18n]").forEach((el) => {
            const rawKey = el.getAttribute("data-i18n") || "";
            const key = resolveAlias(rawKey, el);
            const val = getDeep(dict, key) ?? getDeep(dict, rawKey);
            if (val == null) return;

            // jika ada child .label (mis. btn), set label saja (text)
            const labelChild = el.matches(".label") ? el : el.querySelector(":scope > .label");
            const wantsHTML = el.hasAttribute("data-i18n-html");

            if (labelChild) {
                labelChild.textContent = String(val);
            } else if (wantsHTML) {
                el.innerHTML = String(val); // idempotent: replace, no append
            } else {
                // kalau elemen punya markup tapi tidak diberi data-i18n-html, aman: pakai textContent
                el.textContent = String(val);
            }
        });

        // [data-i18n-attr]
        document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
            const spec = el.getAttribute("data-i18n-attr") || "";
            spec.split("|").forEach((pair) => {
                const [attr, keyRaw] = pair.split(":").map((s) => (s || "").trim());
                if (!attr || !keyRaw) return;
                const key = resolveAlias(keyRaw, el);
                const val = getDeep(dict, key) ?? getDeep(dict, keyRaw);
                if (typeof val === "string") el.setAttribute(attr, val);
            });
        });

        // extra: tombol sort dir
        const sortDirBtn = document.getElementById("sv-sort-dir");
        if (sortDirBtn) {
            const dir = (sortDirBtn.getAttribute("data-dir") || "desc").toLowerCase();
            const lab = sortDirBtn.querySelector(".label");
            if (lab) lab.textContent = dir === "asc" ? t("sort.asc") : t("sort.desc");
        }
    }

    async function setUiLang(lang) {
        const next = clamp(lang);
        dict = await loadDict(next);
        localStorage.setItem(LS_LANG, next);
        document.documentElement.lang = next === "id" ? "id" : "en";
        if (uiBadge) uiBadge.textContent = next.toUpperCase();
        applyI18n();
        document.dispatchEvent(new CustomEvent("tenrusl:i18nUpdated", { detail: { lang: next } }));
    }

    function detectInitialLang() {
        const fromLS = localStorage.getItem(LS_LANG);
        if (fromLS) return clamp(fromLS);
        const hint = (
            window.__tenrusl_COUNTRY ||
            document.querySelector('meta[name="tenrusl-country"]')?.content ||
            ""
        ).toUpperCase();
        if (hint === "ID") return "id";
        const langs = (navigator.languages || [navigator.language || "en"]).map((x) => String(x).toLowerCase());
        if (langs.some((x) => x.startsWith("id"))) return "id";
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
        if (/^Asia\/(Jakarta|Makassar|Jayapura)$/i.test(tz)) return "id";
        return "en";
    }

    async function init() {
        const initial = detectInitialLang();
        await setUiLang(initial);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }

    window.TRI18N = {
        setUiLang,
        toggleUiLang: () => setUiLang((localStorage.getItem(LS_LANG) || "en") === "en" ? "id" : "en"),
        t: (key, vars) => t(key, vars),
    };
})();
