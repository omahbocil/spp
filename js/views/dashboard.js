import { state } from "../store.js";
import { dashboardSummary } from "../logic.js";
import { h, render, rupiah } from "../util.js";

export function mount(root) {
  function draw() {
    if (!state.ready) { root.innerHTML = '<div class="card"><p class="muted">Memuat data…</p></div>'; return; }
    const d = dashboardSummary(state.students, state.payments, new Date());
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
      </div>`);
  }
  draw();
  return { update: draw };
}
