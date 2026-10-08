import { state } from "../store.js";
import { dashboardSummary, studentsWithPackage, statusBulan, rowsPerBulan, rowsPerTahun, yearsList } from "../logic.js";
import { h, render, rupiah, MONTHS } from "../util.js";
import { barChart, compact } from "../chart.js";

export function mount(root) {
  const now = new Date();
  // Pilihan grafik dipertahankan walau data berubah (realtime).
  const sel = { bulan: now.getMonth() + 1, tahun: now.getFullYear(), metrik: "rupiah", status: "Aktif" };

  function chartsHtml() {
    const rp = sel.metrik === "rupiah";
    const years = yearsList(state.payments, now.getFullYear());
    const sb = statusBulan(state.students, state.payments, sel.bulan, sel.tahun);
    const aktif = sb.rows.length, lunas = sb.lunas, belum = aktif - lunas;
    const siswaItems = [
      { label: "Siswa Aktif", value: aktif, cls: "navy" },
      { label: "Sudah Bayar", value: lunas, cls: "green" },
      { label: "Belum Bayar", value: belum, cls: "red" },
    ];
    const pb = rowsPerBulan(state.payments.filter((p) => state.students.some((s) => s.id === p.student_id)), sel.tahun);
    const bulanItems = pb.rows.map((r, i) => {
      const v = rp ? r.total : r.jumlahBayar;
      return { label: MONTHS[i].slice(0, 3), value: v, cls: i + 1 === sel.bulan ? "sel" : "",
        text: rp ? rupiah(v) : v + " siswa", short: rp ? compact(v) : String(v) };
    });
    const pt = rowsPerTahun(state.students, state.payments, years);
    const tahunItems = pt.map((r) => {
      const v = rp ? r.total : r.jumlahSiswa;
      return { label: String(r.tahun), value: v, cls: r.tahun === sel.tahun ? "sel" : "",
        text: rp ? rupiah(v) : v + " siswa", short: rp ? compact(v) : String(v) };
    });
    const totalTahun = pb.grandTotal;
    return h`
      <div class="chart-box">
        <h3>👥 Jumlah Siswa — ${MONTHS[sel.bulan - 1]} ${sel.tahun}</h3>
        ${barChart(siswaItems, { height: 190, title: "Jumlah siswa bulan terpilih" })}
        <p class="muted">${lunas} dari ${aktif} siswa aktif sudah bayar, ${belum} belum.</p>
      </div>
      <div class="chart-box">
        <h3>📅 ${rp ? "Jumlah SPP" : "Jumlah Siswa Bayar"} per Bulan — ${sel.tahun}</h3>
        ${barChart(bulanItems, { title: "Per bulan tahun " + sel.tahun })}
        <p class="muted">${rp ? h`Total tahun ${sel.tahun}: <b>${rupiah(totalTahun)}</b>. ` : ""}Batang kuning = bulan terpilih.</p>
      </div>
      <div class="chart-box">
        <h3>🗓️ ${rp ? "Jumlah SPP" : "Jumlah Siswa Bayar"} per Tahun</h3>
        ${barChart(tahunItems, { width: Math.max(260, years.length * 90), title: "Per tahun" })}
      </div>`;
  }

  function drawCharts() {
    const box = root.querySelector("#grafik");
    if (box) render(box, chartsHtml());
  }

  function siswaHtml() {
    const all = studentsWithPackage(state.students, state.packages);
    const nAktif = all.filter((s) => s.status === "Aktif").length;
    const nNon = all.length - nAktif;
    const rows = all.filter((s) => (s.status === "Aktif") === (sel.status === "Aktif"));
    return h`
      <div class="stat siswa-tiles">
        <button type="button" class="tile ${sel.status === "Aktif" ? "on" : ""}" data-status="Aktif"><b>${nAktif}</b>Siswa Aktif</button>
        <button type="button" class="tile ${sel.status === "Nonaktif" ? "on" : ""}" data-status="Nonaktif"><b>${nNon}</b>Siswa Tidak Aktif</button>
      </div>
      <p class="muted mt">Daftar siswa ${sel.status === "Aktif" ? "aktif" : "tidak aktif"} (ketuk kotak di atas untuk berganti).</p>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Foto</th><th>No Akun</th><th>Nama</th><th>Paket</th><th>Asal Sekolah</th><th>Umur</th><th>Awal Masuk</th></tr></thead>
          <tbody>
            ${rows.length === 0 ? h`<tr><td colspan="7">Tidak ada siswa ${sel.status === "Aktif" ? "aktif" : "tidak aktif"}.</td></tr>` : ""}
            ${rows.map((s) => h`<tr>
              <td>${s.foto ? h`<img class="zoom-foto thumb" src="${s.foto}" alt="Foto ${s.nama}">` : h`<span class="thumb ph">👤</span>`}</td>
              <td>${s.no_akun}</td><td>${s.nama}</td><td>${s.paket_name || "-"}</td>
              <td>${s.asal_sekolah || "-"}</td><td>${s.usia ? s.usia + " th" : "-"}</td><td class="nowrap">${s.mulai || "-"}</td>
            </tr>`)}
          </tbody>
        </table>
      </div>`;
  }
  function drawSiswa() {
    const box = root.querySelector("#daftarSiswa");
    if (box) render(box, siswaHtml());
  }

  function draw() {
    if (!state.ready) { root.innerHTML = '<div class="card"><p class="muted">Memuat data…</p></div>'; return; }
    const d = dashboardSummary(state.students, state.payments, now);
    const years = yearsList(state.payments, now.getFullYear());
    if (!years.includes(sel.tahun)) years.push(sel.tahun);
    render(root, h`
      <div class="card">
        <h2>📊 Ringkasan</h2>
        <div class="stat">
          <div><b>${d.totalAktif}</b>Siswa Aktif</div>
          <div><b>${d.sudahBayar}</b>Sudah Bayar Bulan Ini</div>
          <div><b>${d.belumBayar.length}</b>Belum Bayar</div>
          <div><b>${rupiah(d.totalBulanIni)}</b>Iuran Bulan Ini</div>
        </div>
      </div>
      <div class="card">
        <h2>🔔 Reminder Tunggakan SPP</h2>
        ${d.belumBayar.length === 0
          ? h`<p>Tidak ada tunggakan. 🎉</p>`
          : d.belumBayar.map((s) => h`<div class="remind">${s.nama} (No.Akun ${s.no_akun}) — jatuh tempo tgl ${s.jatuh_tempo || 10} — <b>belum bayar SPP ${d.bulanNama} ${d.tahun}</b></div>`)}
      </div>
      <div class="card">
        <h2>📈 Grafik SPP</h2>
        <div class="row">
          <div><label for="gBulan">Bulan</label><select id="gBulan">${MONTHS.map((m, i) => h`<option value="${i + 1}">${m}</option>`)}</select></div>
          <div><label for="gTahun">Tahun</label><select id="gTahun">${years.sort((a, b) => a - b).map((y) => h`<option value="${y}">${y}</option>`)}</select></div>
          <div><label for="gMetrik">Tampilkan</label><select id="gMetrik"><option value="rupiah">Jumlah SPP (Rp)</option><option value="siswa">Jumlah Siswa Bayar</option></select></div>
        </div>
        <div id="grafik" class="charts mt"></div>
      </div>
      <div class="card">
        <h2>👦 Data Siswa</h2>
        <div id="daftarSiswa"></div>
      </div>`);
    const gb = root.querySelector("#gBulan"), gt = root.querySelector("#gTahun"), gm = root.querySelector("#gMetrik");
    gb.value = String(sel.bulan); gt.value = String(sel.tahun); gm.value = sel.metrik;
    gb.addEventListener("change", () => { sel.bulan = +gb.value; drawCharts(); });
    gt.addEventListener("change", () => { sel.tahun = +gt.value; drawCharts(); });
    gm.addEventListener("change", () => { sel.metrik = gm.value; drawCharts(); });
    root.querySelector("#daftarSiswa").addEventListener("click", (e) => {
      const b = e.target.closest("[data-status]");
      if (!b) return;
      sel.status = b.dataset.status; drawSiswa();
    });
    drawCharts(); drawSiswa();
  }
  draw();
  return { update: draw };
}
