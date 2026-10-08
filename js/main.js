// Titik masuk aplikasi: cek konfigurasi, login (Firebase Auth), shell, router.
import { firebaseConfig } from "../config.js";
import { h, render, esc } from "./util.js";
import { toast } from "./ui.js";
import "./zoom.js";
import "./pwa.js";

const $ = (s) => document.getElementById(s);
const boot = $("boot"), loginEl = $("login"), appEl = $("appShell"), mainEl = $("main"), printRoot = $("printRoot");

const configured = firebaseConfig.apiKey && !String(firebaseConfig.apiKey).startsWith("ISI_");

function fatal(title, body) {
  boot.classList.add("hidden");
  loginEl.classList.remove("hidden");
  loginEl.innerHTML = `<div class="login-box"><img src="assets/logo_omahbocil.png" alt="Logo Omah Bocil"><h1>${esc(title)}</h1><p class="muted">${body}</p></div>`;
}

if (!configured) {
  fatal("Konfigurasi Firebase belum diisi",
    "Buka file <b>config.js</b> lalu isi dengan data project Firebase kamu. Langkah lengkapnya ada di <b>PANDUAN.md</b>.");
} else {
  start().catch((e) => {
    console.error(e);
    fatal("Aplikasi gagal dimuat", "Firebase tidak bisa dimuat. Periksa koneksi internet lalu muat ulang halaman.");
  });
}

async function start() {
  const fb = await import("./firebase.js");
  const store = await import("./store.js");
  const V = {
    "": await import("./views/dashboard.js"), siswa: await import("./views/siswa.js"),
    paket: await import("./views/paket.js"), penerima: await import("./views/penerima.js"),
    "input-spp": await import("./views/inputSpp.js"), laporan: await import("./views/laporan.js"),
    "cetak-spp": await import("./views/cetak.js"), riwayat: await import("./views/riwayat.js"),
    "ganti-password": await import("./views/password.js"),
  };
  const P = await import("./views/print.js");
  const PRINT = { "print/kartu": P.mountKartu, "print/tahun": P.mountTahun, "print/siswa": P.mountSiswa, "print/bulan": P.mountBulan };
  const NAV = [["", "Dashboard"], ["siswa", "Siswa"], ["paket", "Paket"], ["penerima", "Penerima"],
    ["input-spp", "Input SPP"], ["laporan", "Laporan"], ["cetak-spp", "Cetak SPP"], ["riwayat", "Riwayat"]];

  store.setWriteErrorHandler((e) => {
    console.error(e);
    toast(e.code === "permission-denied"
      ? "Perubahan ditolak oleh Firestore. Periksa aturan (firestore.rules) dan akun admin."
      : "Perubahan gagal disimpan: " + (e.code || e.message), "error");
  });

  // ---------- shell ----------
  $("nav").innerHTML = NAV.map(([p, label]) => `<a href="#/${p}" data-p="${p}">${label}</a>`).join("");
  $("menuToggle").addEventListener("click", () => document.body.classList.toggle("sidebar-open"));
  $("backdrop").addEventListener("click", () => document.body.classList.remove("sidebar-open"));
  $("nav").addEventListener("click", (e) => { if (e.target.closest("a")) document.body.classList.remove("sidebar-open"); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") document.body.classList.remove("sidebar-open"); });
  $("logout").addEventListener("click", () => fb.signOut(fb.auth));

  function paintStatus() {
    const chip = $("status");
    const online = navigator.onLine;
    chip.className = "chip " + (!online ? "off" : store.state.pending ? "sync" : "on");
    chip.textContent = !online ? "Offline" : store.state.pending ? "Menyinkronkan…" : "Online";
    $("fsError").classList.toggle("hidden", !store.state.error);
    if (store.state.error) {
      $("fsError").textContent = store.state.error.code === "permission-denied"
        ? "Akses ke database ditolak. Pastikan UID akun ini sudah dimasukkan di firestore.rules (lihat PANDUAN.md)."
        : "Masalah koneksi database: " + (store.state.error.code || store.state.error.message);
    }
  }
  window.addEventListener("online", paintStatus);
  window.addEventListener("offline", paintStatus);

  // ---------- router ----------
  let current = null;
  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, "");
    const [path, qs] = raw.split("?");
    return { path: path || "", q: Object.fromEntries(new URLSearchParams(qs || "")) };
  }
  function route() {
    if (current && current.destroy) current.destroy();
    current = null;
    const { path, q } = parseHash();
    const isPrint = path.startsWith("print/");
    document.body.classList.toggle("print-mode", isPrint);
    document.title = "SPP Omah Bocil";
    if (!isPrint) P.clearPageStyle();
    mainEl.innerHTML = ""; printRoot.innerHTML = "";
    if (isPrint) {
      current = (PRINT[path] || (() => ({})))(printRoot, q) || {};
    } else {
      const view = V[path] || V[""];
      document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("active", a.dataset.p === (V[path] ? path : "")));
      current = view.mount(mainEl, q) || {};
    }
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  window.addEventListener("app:refresh", route);
  store.subscribe(() => { paintStatus(); if (current && current.update) current.update(); });

  // ---------- login ----------
  const ERR = {
    "auth/invalid-credential": "Email atau password salah.", "auth/wrong-password": "Email atau password salah.",
    "auth/user-not-found": "Email atau password salah.", "auth/invalid-email": "Format email tidak valid.",
    "auth/too-many-requests": "Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.",
    "auth/network-request-failed": "Tidak ada koneksi internet. Login pertama kali butuh online.",
    "auth/user-disabled": "Akun ini dinonaktifkan.",
  };
  function showLogin() {
    store.stopSync();
    appEl.classList.add("hidden"); document.body.classList.remove("print-mode");
    boot.classList.add("hidden"); loginEl.classList.remove("hidden");
    render(loginEl, h`<form class="login-box" id="lf">
      <img src="assets/logo_omahbocil.png" alt="Logo Omah Bocil">
      <h1>SPP Manager</h1><p class="muted">Bimbingan Belajar Omah Bocil</p>
      <label for="em">Email</label><input id="em" type="email" required autocomplete="username" inputmode="email">
      <label for="pw" class="mt">Password</label><input id="pw" type="password" required autocomplete="current-password">
      <div id="lerr" class="flash error hidden mt"></div>
      <button class="btn yellow block mt" id="lgo" type="submit">Masuk</button></form>`);
    $("lf").addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = $("lgo"), err = $("lerr");
      btn.disabled = true; err.classList.add("hidden");
      try { await fb.signInWithEmailAndPassword(fb.auth, $("em").value.trim(), $("pw").value); }
      catch (ex) { err.textContent = ERR[ex.code] || "Gagal masuk: " + (ex.code || ex.message); err.classList.remove("hidden"); }
      finally { btn.disabled = false; }
    });
  }
  function showApp(user) {
    loginEl.classList.add("hidden"); boot.classList.add("hidden"); appEl.classList.remove("hidden");
    $("who").textContent = user.email;
    store.startSync(); paintStatus(); route();
  }
  fb.onAuthStateChanged(fb.auth, (user) => (user ? showApp(user) : showLogin()));
}
