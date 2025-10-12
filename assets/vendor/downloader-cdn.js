#!/usr/bin/env node
/**
 * Downloader CDN → mirror ke folder lokal → kemas ZIP (tanpa node_modules).
 *
 * Pakai:
 *   node downloader-cdn.js "https://cdn.jsdelivr.net/npm/codemirror@6.65.7/" "./mirror-cm" "mirror-cm.zip"
 *
 * Argumen:
 *   1) -namalink-        : URL dasar (folder CDN / file tunggal)
 *   2) -destinasifolder- : folder tujuan lokal
 *   3) -namefile-        : nama file ZIP output (mis. mirror-cm.zip)
 */

const https = require("https");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const { spawnSync } = require("child_process");

const [, , LINK, DEST_DIR, ZIP_NAME] = process.argv;
if (!LINK || !DEST_DIR || !ZIP_NAME) {
    console.error(
        `Usage:
  node downloader-cdn.js "<url-folder-atau-file>" "<dest-folder>" "<zip-name>"

Contoh:
  node downloader-cdn.js "https://cdn.jsdelivr.net/npm/codemirror@6.65.7/" "./mirror-cm" "mirror-cm.zip"`
    );
    process.exit(1);
}

const BASE_URL = normalizeUrl(LINK);
const DEST = path.resolve(DEST_DIR);
const ZIP = path.resolve(ZIP_NAME);

const MAX_CONCURRENCY = 10;
const RETRIES = 3;
const RETRY_BACKOFF_MS = 600;

// ---------- helpers ----------
function normalizeUrl(u) {
    const url = new URL(u);
    // heuristik: jika tanpa ekstensi -> treat sebagai direktori, tambah '/'
    if (!url.href.endsWith("/") && !/\.[a-z0-9]+$/i.test(url.pathname)) {
        url.pathname = url.pathname + "/";
    }
    return url.href;
}
function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

function httpGet(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { "User-Agent": "SnipVault-Downloader/1.0" } }, (res) => {
            const { statusCode, headers } = res;
            if (statusCode >= 300 && statusCode < 400 && headers.location) {
                const next = new URL(headers.location, url).toString();
                res.resume();
                return resolve(httpGet(next));
            }
            if (statusCode !== 200) {
                res.resume();
                return reject(new Error(`HTTP ${statusCode} for ${url}`));
            }
            const chunks = [];
            res.on("data", (c) => chunks.push(c));
            res.on("end", () => resolve({ buffer: Buffer.concat(chunks), headers }));
        });
        req.on("error", reject);
    });
}
async function getWithRetry(url, tries = RETRIES) {
    let lastErr;
    for (let i = 0; i < tries; i++) {
        try {
            return await httpGet(url);
        } catch (e) {
            lastErr = e;
            await sleep(RETRY_BACKOFF_MS * (i + 1));
        }
    }
    throw lastErr;
}
function parseLinksFromListing(htmlBuf, baseHref) {
    const html = htmlBuf.toString("utf8");
    const hrefs = Array.from(html.matchAll(/href="([^"]+)"/g)).map((m) => m[1]);
    const out = [];
    for (const h of hrefs) {
        if (!h || h.startsWith("#") || h.includes("index.html")) continue;
        const full = new URL(h, baseHref).href;
        if (!full.startsWith(baseHref)) continue;
        out.push(full);
    }
    return Array.from(new Set(out));
}
async function probe(url) {
    const { buffer, headers } = await getWithRetry(url);
    const ctype = (headers["content-type"] || "").toLowerCase();
    if (ctype.includes("text/html")) {
        const links = parseLinksFromListing(buffer, url);
        return { isDir: true, links };
    }
    return { isDir: false, buffer, headers };
}
async function crawl(url) {
    const { isDir, links, buffer, headers } = await probe(url);
    if (!isDir) return [{ url, buffer, headers }];

    const files = [];
    const folders = [];
    for (const l of links) {
        if (l.endsWith("/")) folders.push(l);
        else files.push(l);
    }
    const here = await Promise.all(
        files.map(async (f) => {
            const { buffer: b, headers: h } = await getWithRetry(f);
            return { url: f, buffer: b, headers: h };
        })
    );
    for (const dir of folders) {
        const sub = await crawl(dir);
        here.push(...sub);
    }
    return here;
}
function relPathFromBase(fileUrl, baseUrl) {
    const u = new URL(fileUrl);
    const b = new URL(baseUrl);
    let rel = u.pathname.startsWith(b.pathname) ? u.pathname.slice(b.pathname.length) : u.pathname;
    if (rel.startsWith("/")) rel = rel.slice(1);
    return decodeURIComponent(rel);
}
async function writeAll(files, dest, baseUrl) {
    await fs.promises.mkdir(dest, { recursive: true });
    let done = 0,
        total = files.length;
    const queue = [...files];
    const workers = new Array(Math.min(MAX_CONCURRENCY, total)).fill(0).map(async () => {
        while (queue.length) {
            const it = queue.shift();
            const rel = relPathFromBase(it.url, baseUrl);
            const outPath = path.join(dest, rel);
            await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
            await fs.promises.writeFile(outPath, it.buffer);
            done++;
            if (done % 50 === 0 || done === total) process.stdout.write(`\r  progress: ${done}/${total}`);
        }
    });
    await Promise.all(workers);
    process.stdout.write("\n");
}

// ZIP tanpa dependency eksternal
function hasCmd(cmd) {
    const res = spawnSync(cmd, ["--version"], { stdio: "ignore" });
    return res && res.status === 0;
}
async function zipDirectory(srcDir, zipPath) {
    if (process.platform === "win32") {
        const ps = spawnSync(
            "powershell.exe",
            ["-NoProfile", "-Command", `Compress-Archive -Path "${srcDir}\\*" -DestinationPath "${zipPath}" -Force`],
            { stdio: "inherit" }
        );
        if (ps.status !== 0) throw new Error("Compress-Archive failed");
        return zipPath;
    } else {
        if (hasCmd("zip")) {
            const r = spawnSync("zip", ["-r", "-q", zipPath, "."], { cwd: srcDir, stdio: "inherit" });
            if (r.status !== 0) throw new Error("zip failed");
            return zipPath;
        }
        // fallback ke Python (zipfile) jika 'zip' tidak ada
        const py = `
import sys, os, zipfile
zipf=zipfile.ZipFile(sys.argv[1],'w',zipfile.ZIP_DEFLATED)
for root, dirs, files in os.walk(sys.argv[2]):
    for f in files:
        fp=os.path.join(root,f)
        zipf.write(fp, os.path.relpath(fp, sys.argv[2]))
zipf.close()
`;
        let r = spawnSync("python3", ["-c", py, zipPath, srcDir], { stdio: "inherit" });
        if (r.status !== 0) {
            r = spawnSync("python", ["-c", py, zipPath, srcDir], { stdio: "inherit" });
            if (r.status !== 0) throw new Error("No 'zip' and no Python available; cannot create ZIP.");
        }
        return zipPath;
    }
}

// ---------- main ----------
(async () => {
    console.log(`→ Sumber     : ${BASE_URL}`);
    console.log(`→ Tujuan dir : ${DEST}`);
    console.log(`→ File ZIP   : ${ZIP}`);

    await fs.promises.rm(DEST, { recursive: true, force: true }).catch(() => {});
    await fs.promises.mkdir(DEST, { recursive: true });

    console.time("Crawl");
    const files = await crawl(BASE_URL);
    console.timeEnd("Crawl");
    console.log(`• Total file: ${files.length}`);

    console.time("Tulis");
    await writeAll(files, DEST, BASE_URL);
    console.timeEnd("Tulis");

    console.time("ZIP");
    await zipDirectory(DEST, ZIP);
    console.timeEnd("ZIP");

    console.log("✅ Selesai");
})().catch((err) => {
    console.error("\n❌ Gagal:", err?.stack || err);
    process.exit(1);
});
