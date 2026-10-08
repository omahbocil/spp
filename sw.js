// Service worker: membuat aplikasi bisa dibuka offline.
// Naikkan VERSION setiap kali kamu mengubah daftar file di SHELL.
const VERSION = "spp-v1";
const FIREBASE_BASE = "https://www.gstatic.com/firebasejs/10.14.1/";
const FIREBASE_ENTRY = ["firebase-app.js", "firebase-auth.js", "firebase-firestore.js"].map((f) => FIREBASE_BASE + f);

const SHELL = [
  "./", "index.html", "config.js", "manifest.json", "css/app.css",
  "js/main.js", "js/firebase.js", "js/store.js", "js/logic.js", "js/util.js", "js/ui.js",
  "js/photo.js", "js/zoom.js", "js/changelog.js",
  "js/views/dashboard.js", "js/views/siswa.js", "js/views/paket.js", "js/views/penerima.js",
  "js/views/inputSpp.js", "js/views/laporan.js", "js/views/cetak.js", "js/views/print.js",
  "js/views/riwayat.js", "js/views/password.js",
  "assets/logo_omahbocil.png", "assets/icon-192.png", "assets/icon-512.png",
  "assets/icon-maskable-512.png", "assets/apple-touch-icon.png",
];

// Unduh modul Firebase beserta semua modul yang di-import-nya (rekursif) ke cache.
async function precacheModuleGraph(cache, url, seen = new Set()) {
  if (seen.has(url)) return;
  seen.add(url);
  const res = await fetch(url);
  if (!res.ok) return;
  const copy = res.clone();
  const text = await res.text();
  await cache.put(url, copy);
  const re = /(?:from|import)\s*["']([^"']+\.js)["']/g;
  let m;
  while ((m = re.exec(text))) {
    const next = new URL(m[1], url).href;
    if (next.startsWith(FIREBASE_BASE)) await precacheModuleGraph(cache, next, seen);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(SHELL);
    try { for (const u of FIREBASE_ENTRY) await precacheModuleGraph(cache, u); } catch (_) { /* dicache saat runtime */ }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function networkFirst(req, timeoutMs = 4000) {
  const cache = await caches.open(VERSION);
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    const res = await fetch(req, { signal: ctl.signal });
    clearTimeout(t);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (_) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (req.mode === "navigate") return cache.match("index.html");
    return Response.error();
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) { event.respondWith(networkFirst(req)); return; }
  if (req.url.startsWith(FIREBASE_BASE)) { event.respondWith(cacheFirst(req)); return; }
  // permintaan lain (API Firestore/Auth) dibiarkan langsung ke jaringan
});
