// Laporan dipecah jadi tiga halaman (sub-menu): Tahunan, Bulanan, Siswa.
import { state } from "../store.js";
import { studentsWithPackage, rowsPerBulan, riwayatSiswa, statusBulan, yearsList, paymentsCSV } from "../logic.js";
import { h, render, rupiah, MONTHS, downloadFile, todayISO } from "../util.js";
import { setOptions } from "../ui.js";

// ---------- Laporan Keuangan per Tahun ----------
export function mountTahunan(root) {
  const now = new Date();
  const view = { tahun: now.getFullYear() };
  render(root, h`
    <div class="card">
      <h2 class="split"><span>📈 Laporan Keuangan per Tahun</span><a class="btn small" id="cTahun" href="#">🖨️ Cetak</a></h2>
      <div class="row"><div><label for="tahun">Tahun</label><select id="tahun"></select></div></div>
      <div class="tbl-wrap mt" id="tTahun"></div>
    </div>
    <div class="card">
      <h2>⬇️ Export Data</h2>
      <div class="btn-row">
        <button class="btn" id="expCsv" type="button">⬇️ Export Pembayaran (CSV)</button>
        <button class="btn" id="expJson" type="button">⬇️ Export Semua Data (JSON)</button>
      </div>
    </div>`);
  const $ = (s) => root.querySelector(s);
  $("#tahun").addEventListener("change", (e) => { view.tahun = parseInt(e.target.value, 10); draw(); });
  $("#expCsv").addEventListener("click", () =>
    downloadFile(`pembayaran_spp_${todayISO()}.csv`, "text/csv;charset=utf-8", paymentsCSV(state.students, state.payments)));
  $("#expJson").addEventListener("click", () =>
    downloadFile(`spp_omahbocil_${todayISO()}.json`, "application/json", JSON.stringify({
      diekspor: new Date().toISOString(),
      students: state.students, packages: state.packages, recipients: state.recipients, payments: state.payments,
    }, null, 2)));

  function draw() {
    if (!state.ready) return;
    const years = yearsList(state.payments, now.getFullYear());
    setOptions($("#tahun"), years.map((y) => ({ value: y, label: y })), String(view.tahun));
    view.tahun = parseInt($("#tahun").value, 10);
    const { rows, grandTotal } = rowsPerBulan(state.payments, view.tahun);
    render($("#tTahun"), h`<table><thead><tr><th>Bulan</th><th>Jml Bayar</th><th>Total</th></tr></thead>
      <tbody>${rows.map((r) => h`<tr><td>${r.bulan}</td><td>${r.jumlahBayar}</td><td>${rupiah(r.total)}</td></tr>`)}</tbody>
      <tfoot><tr><th colspan="2">Total Tahun ${view.tahun}</th><th>${rupiah(grandTotal)}</th></tr></tfoot></table>`);
    $("#cTahun").href = `#/print/tahun?tahun=${view.tahun}`;
  }
  draw();
  return { update: draw };
}

// ---------- Laporan Keuangan per Bulan - Tahun ----------
export function mountBulanan(root) {
  const now = new Date();
  const view = { lbulan: now.getMonth() + 1, ltahun: now.getFullYear() };
  render(root, h`
    <div class="card">
      <h2 class="split"><span>🗓️ Laporan Keuangan per Bulan - Tahun</span><a class="btn small" id="cBulan" href="#">🖨️ Cetak</a></h2>
      <div class="row">
        <div><label for="lbulan">Bulan</label><select id="lbulan">${MONTHS.map((m, i) => h`<option value="${i + 1}">${m}</option>`)}</select></div>
        <div><label for="ltahun">Tahun</label><input id="ltahun" type="number" value="${view.ltahun}"></div>
      </div>
      <div id="sBulan" class="mt"></div>
    </div>`);
  const $ = (s) => root.querySelector(s);
  $("#lbulan").value = view.lbulan;
  $("#lbulan").addEventListener("change", (e) => { view.lbulan = parseInt(e.target.value, 10); draw(); });
  $("#ltahun").addEventListener("change", (e) => { view.ltahun = parseInt(e.target.value, 10) || now.getFullYear(); draw(); });

  function draw() {
    if (!state.ready) return;
    const sb = statusBulan(state.students, state.payments, view.lbulan, view.ltahun);
    render($("#sBulan"), h`
      <div class="stat">
        <div><b>${sb.rows.length}</b>Siswa Aktif</div><div><b>${sb.lunas}</b>Sudah Bayar</div>
        <div><b>${sb.rows.length - sb.lunas}</b>Belum Bayar</div><div><b>${rupiah(sb.total)}</b>Total Terkumpul</div>
      </div>
      <div class="tbl-wrap"><table><thead><tr><th>No Akun</th><th>Nama</th><th>Jumlah</th><th>Tgl Bayar</th><th>Status</th></tr></thead>
        <tbody>${sb.rows.length === 0 ? h`<tr><td colspan="5">Belum ada siswa aktif.</td></tr>` : ""}
        ${sb.rows.map((r) => h`<tr><td>${r.no_akun}</td><td>${r.nama}</td><td>${r.jumlah != null ? rupiah(r.jumlah) : "-"}</td><td>${r.tgl_bayar || "-"}</td>
          <td>${r.status === "Lunas" ? h`<span class="badge ok">Lunas</span>` : h`<span class="badge no">Belum</span>`}</td></tr>`)}</tbody></table></div>`);
    $("#cBulan").href = `#/print/bulan?bulan=${view.lbulan}&tahun=${view.ltahun}`;
  }
  draw();
  return { update: draw };
}

// ---------- Laporan atas Nama Siswa ----------
export function mountSiswa(root) {
  const view = { siswa: null };
  render(root, h`
    <div class="card">
      <h2 class="split"><span>👤 Laporan atas Nama Siswa</span><a class="btn small" id="cSiswa" href="#">🖨️ Cetak</a></h2>
      <div id="siswaWrap">
        <div class="row"><div><label for="siswa">Pilih Siswa</label><select id="siswa"></select></div></div>
        <div class="tbl-wrap mt" id="tSiswa"></div>
      </div>
      <p id="siswaKosong" class="hidden">Belum ada data siswa.</p>
    </div>`);
  const $ = (s) => root.querySelector(s);
  $("#siswa").addEventListener("change", (e) => { view.siswa = e.target.value; draw(); });

  function draw() {
    if (!state.ready) return;
    const students = studentsWithPackage(state.students, state.packages);
    $("#siswaWrap").classList.toggle("hidden", students.length === 0);
    $("#siswaKosong").classList.toggle("hidden", students.length > 0);
    $("#cSiswa").classList.toggle("hidden", students.length === 0);
    if (!students.length) return;
    if (!students.some((s) => s.id === view.siswa)) view.siswa = students[0].id;
    setOptions($("#siswa"), students.map((s) => ({ value: s.id, label: `${s.no_akun} - ${s.nama}` })), view.siswa);
    const st = students.find((s) => s.id === view.siswa);
    const rw = riwayatSiswa(state.payments, view.siswa);
    render($("#tSiswa"), h`<table><thead><tr><th>Bulan</th><th>Tahun</th><th>Jumlah</th><th>Tgl Bayar</th><th>TTD</th><th>Stempel</th></tr></thead>
      <tbody>${rw.list.length === 0 ? h`<tr><td colspan="6">Belum ada riwayat pembayaran untuk siswa ini.</td></tr>` : ""}
      ${rw.list.map((r) => h`<tr><td>${r.bulan}</td><td>${r.tahun}</td><td>${rupiah(r.jumlah)}</td><td>${r.tgl_bayar || "-"}</td><td>${r.ttd || "-"}</td><td>${r.stempel || "-"}</td></tr>`)}</tbody>
      <tfoot><tr><th colspan="2">Total Dibayar ${st ? st.nama : ""}</th><th colspan="4">${rupiah(rw.total)}</th></tr></tfoot></table>`);
    $("#cSiswa").href = `#/print/siswa?siswa=${encodeURIComponent(view.siswa)}`;
  }
  draw();
  return { update: draw };
}
