// PWA: ajakan pasang aplikasi di HP + pemberitahuan versi baru (minta user memperbarui).
const $ = (id) => document.getElementById(id);
const DISMISS_KEY = "pwa-install-dismissed";
const DISMISS_MS = 3 * 24 * 60 * 60 * 1000; // tawarkan lagi setelah 3 hari

const ua = navigator.userAgent || "";
const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isAndroid = /android/i.test(ua);
const isMobile = isIOS || isAndroid;
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

let installEvt = null;
let waitingWorker = null;
let userRequestedUpdate = false;

// ---------- banner ----------
function box() {
  let el = $("pwaBanner");
  if (!el) { el = document.createElement("div"); el.id = "pwaBanner"; el.className = "pwa-banner"; document.body.appendChild(el); }
  return el;
}
function card(id, title, text, buttons) {
  const c = document.createElement("div");
  c.id = id; c.className = "pwa-card"; c.setAttribute("role", "status");
  const t = document.createElement("b"); t.textContent = title;
  const p = document.createElement("p"); p.textContent = text;
  const row = document.createElement("div"); row.className = "pwa-actions";
  buttons.forEach(([label, cls, fn]) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "btn small " + cls; b.textContent = label; b.addEventListener("click", fn);
    row.appendChild(b);
  });
  c.append(t, p, row);
  return c;
}
const removeCard = (id) => { const c = $(id); if (c) c.remove(); };

// ---------- ajakan pasang ----------
function dismissedRecently() {
  try { return Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < DISMISS_MS; } catch { return false; }
}
function showInstall() {
  if (!isMobile || isStandalone() || dismissedRecently() || $("pwaInstall")) return;
  const later = ["Nanti", "", () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* abaikan */ }
    removeCard("pwaInstall");
  }];
  let c;
  if (installEvt) {
    c = card("pwaInstall", "📲 Pasang aplikasi SPP Omah Bocil",
      "Pasang di layar utama HP agar dibuka seperti aplikasi biasa, lebih cepat, dan bisa dipakai saat internet putus.",
      [["Pasang Sekarang", "yellow", async () => {
        const e = installEvt; installEvt = null;
        e.prompt(); await e.userChoice; removeCard("pwaInstall");
      }], later]);
  } else if (isIOS) {
    c = card("pwaInstall", "📲 Pasang aplikasi di iPhone/iPad",
      "Buka lewat Safari, ketuk tombol Bagikan (kotak dengan panah ke atas), lalu pilih “Tambah ke Layar Utama”.", [later]);
  } else {
    c = card("pwaInstall", "📲 Pasang aplikasi di HP",
      "Ketuk menu ⋮ di pojok kanan atas browser, lalu pilih “Pasang aplikasi” atau “Tambahkan ke layar utama”.", [later]);
  }
  box().appendChild(c);
}
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault(); installEvt = e;
  const side = $("install"); if (side) side.classList.remove("hidden");
  removeCard("pwaInstall"); showInstall(); // ganti petunjuk manual dengan tombol langsung
});
window.addEventListener("appinstalled", () => {
  installEvt = null; removeCard("pwaInstall");
  const side = $("install"); if (side) side.classList.add("hidden");
});
document.addEventListener("DOMContentLoaded", () => {
  const side = $("install");
  if (side) side.addEventListener("click", async () => {
    if (!installEvt) return;
    const e = installEvt; installEvt = null;
    e.prompt(); await e.userChoice; side.classList.add("hidden");
  });
});
// Petunjuk manual muncul sebentar setelah halaman dibuka (memberi waktu bagi beforeinstallprompt).
window.addEventListener("load", () => setTimeout(showInstall, 1500));

// ---------- versi baru ----------
function showUpdate(worker) {
  waitingWorker = worker;
  if ($("pwaUpdate")) return;
  const c = card("pwaUpdate", "🔄 Versi baru tersedia",
    "Ada pembaruan aplikasi SPP Omah Bocil. Perbarui sekarang agar fitur dan perbaikan terbaru dipakai. Pastikan data yang sedang diisi sudah disimpan.",
    [["Perbarui Sekarang", "yellow", () => {
      userRequestedUpdate = true;
      const b = c.querySelector("button"); b.disabled = true; b.textContent = "Memperbarui…";
      if (waitingWorker) waitingWorker.postMessage({ type: "SKIP_WAITING" });
      else location.reload();
    }], ["Nanti", "", () => removeCard("pwaUpdate")]]);
  box().prepend(c);
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (userRequestedUpdate) location.reload(); // hanya muat ulang atas permintaan user
  });
  window.addEventListener("load", async () => {
    let reg;
    try { reg = await navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }); } catch { return; }
    const watch = (w) => w.addEventListener("statechange", () => {
      if (w.state === "installed" && navigator.serviceWorker.controller) showUpdate(w);
    });
    if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg.waiting);
    if (reg.installing) watch(reg.installing);
    reg.addEventListener("updatefound", () => reg.installing && watch(reg.installing));
    const check = () => reg.update().catch(() => {});
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") check(); });
    setInterval(check, 30 * 60 * 1000);
  });
}
