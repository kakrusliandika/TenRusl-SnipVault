/* SnipVault Service Worker (scope: /assets/js/) — cache-first for static, SWR for others */
const SV_VERSION = "sv-1.0.1-2025-10-10";
const CORE_CACHE = `sv-core-${SV_VERSION}`;
const RUNTIME_CACHE = `sv-rt-${SV_VERSION}`;

const OFFLINE_URL = "/pages/offline.html";

/* Precaches — minimal & valid paths (vault.css included) */
const PRECACHE = [
    // App shell
    "/index.html",
    "/manifest.webmanifest",

    // CSS
    "/assets/css/theme.css",
    "/assets/css/chrome.css",
    "/assets/css/header.css",
    "/assets/css/footer.css",
    "/assets/css/app.css",
    "/assets/css/vault.css",

    // I18N
    "/assets/i18n/id.json",
    "/assets/i18n/en.json",

    // JSON config (used by db.js defaults)
    "/assets/json/settings.json",

    // JS core
    "/assets/js/theme.js",
    "/assets/js/language.js",
    "/assets/js/header.js",
    "/assets/js/app.js",
    "/assets/js/db.js",
    "/assets/js/export-import.js",
    "/assets/js/vault.js",
    "/assets/js/footer.js",

    // Worker
    "/assets/js/search-worker.js",

    // Plugins (self-hosted)
    "/assets/plugin/codemirror6/codemirror-loader.js",
    "/assets/plugin/dompurify/dompurify-loader.js",
    "/assets/plugin/lz-string/lzstring-loader.js",
    "/assets/plugin/dexie/dexie-loader.js",
    "/assets/plugin/dexie/dexie-db.js",
    "/assets/plugin/idb-keyval/dist/idb-keyval-iife.min.js",

    // Icons
    "/assets/images/icon.svg",

    // Offline page (optional)
    "/pages/offline.html",
];

/* Install — precache non-fatal */
self.addEventListener("install", (e) => {
    e.waitUntil(
        (async () => {
            const cache = await caches.open(CORE_CACHE);
            await Promise.allSettled(
                PRECACHE.map(async (url) => {
                    try {
                        const res = await fetch(url, { cache: "no-cache" });
                        if (res && res.ok) await cache.put(url, res.clone());
                    } catch {
                        /* ignore miss to keep install non-fatal */
                    }
                })
            );
            await self.skipWaiting();
        })()
    );
});

/* Activate — clean old caches */
self.addEventListener("activate", (e) => {
    e.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(keys.filter((k) => k !== CORE_CACHE && k !== RUNTIME_CACHE).map((k) => caches.delete(k)));
            await self.clients.claim();
        })()
    );
});

/* Fetch — NB: SW scope is /assets/js/, only requests under this path are intercepted */
self.addEventListener("fetch", (e) => {
    const req = e.request;
    if (req.method !== "GET") return;

    const url = new URL(req.url);
    const same = url.origin === self.location.origin;

    // HTML navigations
    const isNav =
        req.mode === "navigate" || (req.destination === "" && req.headers.get("accept")?.includes("text/html"));

    if (isNav) {
        e.respondWith(networkThenCache(req, OFFLINE_URL));
        return;
    }

    // Static same-origin assets → cache-first
    if (same && ["script", "style", "font", "image", "worker"].includes(req.destination)) {
        e.respondWith(cacheFirst(RUNTIME_CACHE, req));
        return;
    }

    // Others (JSON, API, etc.) → SWR
    e.respondWith(staleWhileRevalidate(RUNTIME_CACHE, req));
});

/* Strategies */
async function cacheFirst(cacheName, request) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request, { ignoreVary: true });
    if (cached) return cached;
    const net = await fetch(request);
    if (net && net.ok) await cache.put(request, net.clone());
    return net;
}

async function staleWhileRevalidate(cacheName, request) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request, { ignoreVary: true });
    const fetching = fetch(request)
        .then((net) => {
            if (net && net.ok) cache.put(request, net.clone());
            return net;
        })
        .catch(() => null);
    return cached || (await fetching) || new Response("", { status: 504, statusText: "offline" });
}

async function networkThenCache(request, offlineUrl) {
    try {
        const net = await fetch(request);
        (await caches.open(RUNTIME_CACHE)).put(request, net.clone());
        return net;
    } catch {
        return (
            (await caches.match(request)) ||
            (await caches.match(offlineUrl)) ||
            new Response("Offline", { status: 503 })
        );
    }
}
