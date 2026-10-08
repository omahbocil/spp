// Halaman cetak (kartu SPP A6 + 3 laporan A4). Tampil tanpa menu; tombol Print memanggil window.print().
import { state } from "../store.js";
import { studentsWithPackage, kartuTahun, rowsPerBulan, riwayatSiswa, statusBulan } from "../logic.js";
import { h, render, raw, rupiah, MONTHS, BIMBEL_INFO as INFO } from "../util.js";

const LOGO = "assets/logo_omahbocil.png";

function toolbar(back) {
  return h`<div class="print-bar"><a class="btn" href="${back}">← Kembali</a>
    <button class="btn yellow" type="button" onclick="window.print()">🖨️ Print / Simpan sebagai PDF</button></div>`;
}
function kop() {
  return h`<div class="cetak-header">
    <div><h1>${INFO.nama}</h1><p>${INFO.alamat1}<br>${INFO.alamat2}</p><p>CP: ${INFO.cp} · WA: ${INFO.telp}</p></div>
    <img src="${LOGO}" alt="Logo" style="height:50px"></div>`;
}
const loading = (root, back) => render(root, h`${toolbar(back)}<p class="muted pad">Memuat data…</p>`);

function pageStyle(css) {
  let el = document.getElementById("page-style");
  if (!el) { el = document.createElement("style"); el.id = "page-style"; document.head.appendChild(el); }
  el.textContent = css;
}
export const clearPageStyle = () => document.getElementById("page-style")?.remove();

export function mountKartu(root, q) {
  pageStyle("@page{size:105mm 148mm;margin:5mm}");
  const tahun = parseInt(q.tahun, 10) || new Date().getFullYear();
  function draw() {
    if (!state.ready) return loading(root, "#/cetak-spp");
    const siswa = studentsWithPackage(state.students, state.packages).find((s) => s.id === q.student);
    if (!siswa) return render(root, h`${toolbar("#/cetak-spp")}<p class="pad">Siswa tidak ditemukan. Pilih siswa terlebih dahulu.</p>`);
    const kartu = kartuTahun(state.payments, siswa.id, tahun);
    const packages = [...state.packages].sort((a, b) => a.price - b.price);
    document.title = `Kartu SPP — ${siswa.nama} (${tahun})`;
    render(root, h`
      ${toolbar("#/cetak-spp")}
      <div class="info-cetak">📄 Kartu ini otomatis dicetak di kertas <b>A6</b> (105 × 148 mm). Di jendela print pilih ukuran kertas <b>A6</b>, skala <b>100% / Default</b>, dan aktifkan <b>Background graphics</b> agar warna ikut tercetak.</div>
      <div class="kartu">
        <div class="kartu-top">
          <img class="logo" src="${LOGO}" alt="Logo">
          <div style="text-align:right">
            <div class="nama-lembaga">${INFO.nama}</div>
            <div class="info-lembaga">📍 ${INFO.alamat1}<br>${INFO.alamat2}<br>👤 Contact Person : ${INFO.cp}<br>📞 Phone - WA : ${INFO.telp}</div>
          </div>
        </div>
        <div class="siswa-bar">
          ${siswa.foto ? h`<img class="siswa-foto zoom-foto" src="${siswa.foto}" alt="Foto ${siswa.nama}">` : h`<div class="siswa-foto-placeholder">👤</div>`}
          <div class="siswa-field">Nama Siswa : <span>${siswa.nama}</span></div>
          <div class="siswa-field">📅 Tahun : <span>${tahun}</span></div>
        </div>
        <div class="paket-box">
          <div class="spp-bulanan">SPP BULANAN</div>
          <div class="pilihan-label">Pilihan Paket</div>
          <div class="paket-list">${packages.map((p) => h`<div class="item"><span class="chk">${siswa.paket_id === p.id ? "✓" : ""}</span>${p.name} : ${rupiah(p.price)}/bln</div>`)}</div>
        </div>
        <table>
          <thead><tr><th>No</th><th>Bulan</th><th>Iuran</th><th>TTD</th><th>Stempel</th></tr></thead>
          <tbody>${kartu.map((k) => h`<tr><td class="no-col">${k.no}</td><td class="bulan-col">${k.bulan}</td>
            <td>${k.payment ? rupiah(k.payment.jumlah) : ""}</td><td>${k.payment ? k.payment.ttd : ""}</td><td>${k.payment ? k.payment.stempel : ""}</td></tr>`)}</tbody>
        </table>
        <div class="footer-tag">${INFO.tagline}</div>
      </div>`);
  }
  draw();
  return { update: draw };
}

const A4 = "@page{size:A4;margin:14mm}";
const foot = h`<p class="foot">Dicetak otomatis dari sistem SPP ${INFO.nama}.</p>`;

export function mountTahun(root, q) {
  pageStyle(A4);
  const tahun = parseInt(q.tahun, 10) || new Date().getFullYear();
  function draw() {
    if (!state.ready) return loading(root, "#/laporan");
    const { rows, grandTotal } = rowsPerBulan(state.payments, tahun);
    document.title = `Cetak Laporan Tahun ${tahun}`;
    render(root, h`${toolbar("#/laporan")}<div class="cetak-laporan">${kop()}
      <h2>Laporan Keuangan Tahun ${tahun}</h2>
      <table><thead><tr><th>Bulan</th><th>Jml Bayar</th><th>Total</th></tr></thead>
        <tbody>${rows.map((r) => h`<tr><td>${r.bulan}</td><td>${r.jumlahBayar}</td><td>${rupiah(r.total)}</td></tr>`)}</tbody>
        <tfoot><tr><th colspan="2">Total Tahun ${tahun}</th><th>${rupiah(grandTotal)}</th></tr></tfoot></table>${foot}</div>`);
  }
  draw();
  return { update: draw };
}

export function mountSiswa(root, q) {
  pageStyle(A4);
  function draw() {
    if (!state.ready) return loading(root, "#/laporan");
    const s = state.students.find((x) => x.id === q.siswa);
    document.title = "Cetak Laporan Siswa";
    if (!s) return render(root, h`${toolbar("#/laporan")}<div class="cetak-laporan">${kop()}<p>Siswa tidak ditemukan.</p></div>`);
    const rw = riwayatSiswa(state.payments, s.id);
    render(root, h`${toolbar("#/laporan")}<div class="cetak-laporan">${kop()}
      <h2 style="margin-bottom:0">Riwayat Pembayaran — ${s.nama}</h2>
      <p class="sub">No Akun: ${s.no_akun}${s.kelas ? h` · Kelas: ${s.kelas}` : ""}</p>
      <table><thead><tr><th>Bulan</th><th>Tahun</th><th>Jumlah</th><th>Tgl Bayar</th><th>TTD</th><th>Stempel</th></tr></thead>
        <tbody>${rw.list.length === 0 ? h`<tr><td colspan="6">Belum ada riwayat pembayaran.</td></tr>` : ""}
        ${rw.list.map((r) => h`<tr><td>${r.bulan}</td><td>${r.tahun}</td><td>${rupiah(r.jumlah)}</td><td>${r.tgl_bayar || "-"}</td><td>${r.ttd || "-"}</td><td>${r.stempel || "-"}</td></tr>`)}</tbody>
        <tfoot><tr><th colspan="2">Total Dibayar</th><th colspan="4">${rupiah(rw.total)}</th></tr></tfoot></table>${foot}</div>`);
  }
  draw();
  return { update: draw };
}

export function mountBulan(root, q) {
  pageStyle(A4);
  const now = new Date();
  const bulan = parseInt(q.bulan, 10) || now.getMonth() + 1, tahun = parseInt(q.tahun, 10) || now.getFullYear();
  function draw() {
    if (!state.ready) return loading(root, "#/laporan");
    const sb = statusBulan(state.students, state.payments, bulan, tahun);
    document.title = `Cetak Laporan Bulan ${MONTHS[bulan - 1]} ${tahun}`;
    render(root, h`${toolbar("#/laporan")}<div class="cetak-laporan">${kop()}
      <h2>Laporan Bulan ${MONTHS[bulan - 1]} ${tahun}</h2>
      <div class="stat"><div><b>${sb.rows.length}</b>Siswa Aktif</div><div><b>${sb.lunas}</b>Sudah Bayar</div>
        <div><b>${sb.rows.length - sb.lunas}</b>Belum Bayar</div><div><b>${rupiah(sb.total)}</b>Total Terkumpul</div></div>
      <table><thead><tr><th>No Akun</th><th>Nama</th><th>Jumlah</th><th>Tgl Bayar</th><th>Status</th></tr></thead>
        <tbody>${sb.rows.map((r) => h`<tr><td>${r.no_akun}</td><td>${r.nama}</td><td>${r.jumlah != null ? rupiah(r.jumlah) : "-"}</td><td>${r.tgl_bayar || "-"}</td><td>${r.status}</td></tr>`)}</tbody></table>${foot}</div>`);
  }
  draw();
  return { update: draw };
}
