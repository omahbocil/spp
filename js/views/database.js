// Menu Database: penggunaan & limit Firestore, backup, dan restore.
import { state, getUsage, restoreData } from "../store.js";
import { firebaseConfig } from "../../config.js";
import { h, render, downloadFile, todayISO, pad2 } from "../util.js";
import { toast } from "../ui.js";
import { COLLECTIONS, LABEL, LIMITS, formatBytes, buildBackup, parseBackupText, usageSummary } from "../backup.js";

const LAST_KEY = "spp-last-backup";
const fmtNum = (n) => Number(n).toLocaleString("id-ID");
const stamp = (d = new Date()) => `${todayISO(d)}_${pad2(d.getHours())}${pad2(d.getMinutes())}`;
const currentData = () => Object.fromEntries(COLLECTIONS.map((c) => [c, state[c]]));
const lastBackup = () => { try { return localStorage.getItem(LAST_KEY); } catch { return null; } };

function meter(label, used, limit, text) {
  const pct = Math.min(100, (used / limit) * 100);
  const cls = pct >= 85 ? "bad" : pct >= 60 ? "warn" : "ok";
  const shown = pct > 0 && pct < 1 ? "<1" : pct.toFixed(pct < 10 ? 1 : 0).replace(".", ",");
  return h`<div class="meter-row"><div class="meter-head"><span>${label}</span><b>${text} (${shown}%)</b></div>
    <div class="meter"><div class="meter-fill ${cls}" style="width:${pct.toFixed(1)}%"></div></div></div>`;
}

export function mount(root) {
  let pending = null; // { check, name } hasil validasi file restore yang menunggu konfirmasi
  let busy = false;
  let device = null;  // perkiraan cache lokal (navigator.storage.estimate)
  if (navigator.storage && navigator.storage.estimate) {
    navigator.storage.estimate().then((e) => { device = e; drawUsage(); }).catch(() => {});
  }
  const consoleUrl = `https://console.firebase.google.com/project/${encodeURIComponent(firebaseConfig.projectId || "")}/firestore/usage`;

  render(root, h`<div id="dbwrap">
    <div class="card"><h2>📊 Penggunaan Database</h2><div id="usage"></div></div>
    <div class="card"><h2>💾 Backup</h2><div id="backup"></div></div>
    <div class="card"><h2>♻️ Restore</h2><div id="restore"></div></div></div>`);
  const $ = (s) => root.querySelector(s);
  const wrap = $("#dbwrap"); // listener dipasang di wrap (bukan root) agar tidak menumpuk saat pindah halaman

  function drawUsage() {
    const box = $("#usage");
    if (!box) return;
    if (!state.ready) { box.innerHTML = '<p class="muted">Memuat data…</p>'; return; }
    const u = usageSummary(currentData()), d = getUsage();
    const big = u.biggest;
    render(box, h`
      <div class="stat">
        <div><b>${fmtNum(u.totalDocs)}</b>Total Dokumen</div>
        <div><b>${formatBytes(u.totalBytes)}</b>Perkiraan Ukuran Data</div>
        <div><b>${formatBytes(LIMITS.storage - u.totalBytes)}</b>Sisa dari 1 GB</div>
      </div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>Koleksi</th><th>Jumlah Dokumen</th><th>Perkiraan Ukuran</th></tr></thead>
        <tbody>${u.per.map((p) => h`<tr><td>${p.label}</td><td>${fmtNum(p.count)}</td><td>${formatBytes(p.bytes)}</td></tr>`)}</tbody>
        <tfoot><tr><th>Total</th><th>${fmtNum(u.totalDocs)}</th><th>${formatBytes(u.totalBytes)}</th></tr></tfoot>
      </table></div>
      <h3 class="mt">Batas paket gratis Firestore</h3>
      ${meter("Penyimpanan (batas 1 GB)", u.totalBytes, LIMITS.storage, formatBytes(u.totalBytes) + " / 1 GB")}
      ${meter(`Dokumen terbesar: ${big.label} — ${big.koleksi} (batas 1 MB per dokumen)`, big.bytes, LIMITS.docBytes, formatBytes(big.bytes) + " / 1 MB")}
      <h3 class="mt">Pemakaian hari ini di perangkat ini</h3>
      ${meter("Baca dokumen (batas 50.000 per hari)", d.baca, LIMITS.reads, fmtNum(d.baca) + " / 50.000")}
      ${meter("Tulis dokumen (batas 20.000 per hari)", d.tulis, LIMITS.writes, fmtNum(d.tulis) + " / 20.000")}
      ${meter("Hapus dokumen (batas 20.000 per hari)", d.hapus, LIMITS.deletes, fmtNum(d.hapus) + " / 20.000")}
      ${device && device.usage != null ? h`<p class="muted">Cache aplikasi di perangkat ini: <b>${formatBytes(device.usage)}</b>${device.quota ? h` dari ${formatBytes(device.quota)} yang tersedia` : ""}.</p>` : ""}
      <p class="muted mt">Angka penyimpanan adalah <b>perkiraan</b> dari data yang tampil di aplikasi. Hitungan baca/tulis/hapus hanya
      mencakup perangkat dan browser ini (jika aplikasi dipakai di beberapa HP atau komputer, angka resminya lebih besar) dan direset
      tengah malam waktu Pasifik (sekitar pukul 14.00–15.00 WIB). Batas di atas berlaku untuk paket gratis. Angka resmi untuk seluruh perangkat
      ada di <a href="${consoleUrl}" target="_blank" rel="noopener">Firebase Console → Firestore → Usage</a>.</p>`);
  }

  function drawBackup() {
    const last = lastBackup();
    const age = last ? Math.floor((Date.now() - new Date(last).getTime()) / 86400000) : null;
    render($("#backup"), h`
      <p>Unduh seluruh data (siswa, paket, penerima, pembayaran, termasuk foto) menjadi satu file JSON. Simpan file di tempat aman (Google Drive, email, atau flashdisk).</p>
      <p class="${last && age <= 7 ? "muted" : "warn-text"}">${last
        ? h`Backup terakhir dari perangkat ini: <b>${new Date(last).toLocaleString("id-ID")}</b>${age > 7 ? h` — sudah ${age} hari, sebaiknya backup lagi.` : ""}`
        : "Belum pernah backup dari perangkat ini."}</p>
      <div class="mt"><button class="btn yellow" id="doBackup" type="button">⬇️ Unduh Backup Sekarang</button></div>`);
  }

  function backupNow(prefix = "spp_omahbocil_backup") {
    const data = buildBackup(currentData());
    downloadFile(`${prefix}_${stamp()}.json`, "application/json", JSON.stringify(data));
    try { localStorage.setItem(LAST_KEY, new Date().toISOString()); } catch { /* abaikan */ }
    return data;
  }

  function drawRestore() {
    const box = $("#restore");
    if (!pending) {
      render(box, h`
        <p>Pulihkan data dari file backup (.json) yang pernah diunduh dari aplikasi ini. File diperiksa dulu dan tidak ada yang berubah sebelum Anda mengonfirmasi.</p>
        <div><label for="rfile">File backup</label><input id="rfile" type="file" accept=".json,application/json"></div>
        <div id="rmsg" class="mt"></div>`);
      return;
    }
    const { check, name } = pending;
    const ok = check.ok;
    render(box, h`
      <div><label for="rfile">File backup</label><input id="rfile" type="file" accept=".json,application/json"></div>
      <p class="mt">File: <b>${name}</b>${check.meta.diekspor ? h` · dibuat ${new Date(check.meta.diekspor).toLocaleString("id-ID")}` : ""}</p>
      ${ok ? "" : h`<div class="flash error"><b>File tidak bisa dipulihkan:</b><ul>${check.errors.map((e) => h`<li>${e}</li>`)}</ul></div>`}
      ${check.warnings.length ? h`<div class="flash warn"><b>Perhatian:</b><ul>${check.warnings.map((e) => h`<li>${e}</li>`)}</ul></div>` : ""}
      ${ok ? h`
        <div class="tbl-wrap"><table>
          <thead><tr><th>Koleksi</th><th>Di file backup</th><th>Di database sekarang</th></tr></thead>
          <tbody>${COLLECTIONS.map((c) => h`<tr><td>${LABEL[c]}</td><td>${fmtNum(check.counts[c])}</td><td>${fmtNum(state[c].length)}</td></tr>`)}</tbody>
        </table></div>
        <div class="mt">
          <label><input type="radio" name="mode" value="merge" checked> <b>Gabungkan</b> — tambah data baru dan timpa data ber-ID sama dengan isi backup. Data lain tetap ada.</label>
          <label class="mt"><input type="radio" name="mode" value="replace" ${check.lengkap ? "" : "disabled"}> <b>Ganti semua</b> — database dibuat persis seperti file backup; data yang tidak ada di file akan <b>dihapus</b>.${check.lengkap ? "" : " (Tidak tersedia: file ini tidak memuat keempat koleksi.)"}</label>
        </div>
        <p class="muted mt">Sebelum restore, aplikasi otomatis mengunduh backup data saat ini sebagai cadangan. Restore membutuhkan koneksi internet.</p>
        <div class="mt"><button class="btn yellow" id="doRestore" type="button">Mulai Restore</button> <button class="btn" id="cancelRestore" type="button">Batal</button></div>
        <div id="rprog" class="muted mt"></div>` : h`<div class="mt"><button class="btn" id="cancelRestore" type="button">Tutup</button></div>`}
      <div id="rmsg"></div>`);
  }

  // ---------- event ----------
  wrap.addEventListener("click", async (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    if (t.id === "doBackup") {
      if (!state.ready) return toast("Data belum selesai dimuat.", "error");
      const b = backupNow();
      drawBackup();
      toast(`Backup diunduh (${Object.values(b.jumlah).reduce((a, n) => a + n, 0)} dokumen).`);
    } else if (t.id === "cancelRestore") {
      pending = null; drawRestore();
    } else if (t.id === "doRestore" && !busy) {
      await runRestore(t);
    }
  });
  wrap.addEventListener("change", async (e) => {
    if (e.target.id !== "rfile") return;
    const file = e.target.files[0];
    if (!file) return;
    if (!state.ready) { toast("Data belum selesai dimuat.", "error"); e.target.value = ""; return; }
    let text;
    try { text = await file.text(); } catch { toast("File tidak bisa dibaca.", "error"); return; }
    pending = { name: file.name, check: parseBackupText(text, currentData()) };
    drawRestore();
  });

  async function runRestore(btn) {
    if (!pending || !pending.check.ok) return;
    if (!navigator.onLine) return toast("Restore membutuhkan koneksi internet. Sambungkan dulu lalu coba lagi.", "error");
    const mode = root.querySelector('input[name="mode"]:checked').value;
    const { check } = pending;
    const total = COLLECTIONS.reduce((a, c) => a + check.counts[c], 0);
    if (mode === "replace") {
      const hapus = COLLECTIONS.reduce((a, c) => { const ids = new Set(check.data[c].map((d) => d.id)); return a + state[c].filter((d) => !ids.has(d.id)).length; }, 0);
      const ans = prompt(`MODE GANTI SEMUA\n\n${total} dokumen dari backup akan ditulis dan ${hapus} dokumen yang tidak ada di backup akan DIHAPUS.\n\nKetik GANTI untuk melanjutkan.`);
      if (ans === null || ans.trim().toUpperCase() !== "GANTI") return toast("Restore dibatalkan.", "error");
    } else if (!confirm(`Gabungkan ${total} dokumen dari backup ke database sekarang?`)) return;

    busy = true; btn.disabled = true;
    const prog = root.querySelector("#rprog"), msg = root.querySelector("#rmsg");
    try {
      prog.textContent = "Mengunduh cadangan data saat ini…";
      backupNow("spp_omahbocil_sebelum_restore");
      await new Promise((r) => setTimeout(r, 600));
      const res = await restoreData(check.data, mode, (done, all) => { prog.textContent = `Memulihkan data… ${done} / ${all}`; });
      pending = null; drawRestore(); drawUsage();
      root.querySelector("#rmsg").innerHTML = `<div class="flash success">Restore selesai: ${res.ditulis} dokumen ditulis${res.dihapus ? `, ${res.dihapus} dihapus` : ""}.</div>`;
      toast("Restore selesai.");
    } catch (err) {
      console.error(err);
      const text = err && err.code === "permission-denied" ? "Ditolak oleh Firestore. Periksa aturan dan akun admin." : "Restore gagal: " + ((err && (err.code || err.message)) || "kesalahan tidak diketahui") + ". Sebagian data mungkin sudah tertulis; jalankan restore lagi dengan mode Gabungkan.";
      if (msg) msg.innerHTML = `<div class="flash error"></div>`;
      if (msg && msg.firstChild) msg.firstChild.textContent = text;
      toast("Restore gagal.", "error");
      btn.disabled = false;
    } finally { busy = false; }
  }

  drawUsage(); drawBackup(); drawRestore();
  return { update: drawUsage };
}
