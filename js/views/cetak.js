import { state } from "../store.js";
import { studentsWithPackage } from "../logic.js";
import { h, render } from "../util.js";
import { setOptions, nav } from "../ui.js";

// Halaman pilih siswa + tahun untuk Cetak Kartu SPP
export function mount(root, q) {
  const tahun = parseInt(q.tahun, 10) || new Date().getFullYear();
  render(root, h`
    <div class="card">
      <h2>🖨️ Cetak Kartu SPP</h2>
      <div id="kosong" class="hidden"><p>Belum ada data siswa. Tambahkan siswa dahulu di menu Siswa.</p></div>
      <form id="f">
        <p class="muted">Pilih siswa dan tahun, lalu kartu SPP tampil siap di-print atau disimpan sebagai PDF.</p>
        <div class="row">
          <div><label for="student">Siswa</label><select id="student"></select></div>
          <div><label for="tahun">Tahun</label><input id="tahun" type="number" value="${tahun}"></div>
        </div>
        <div class="mt"><button class="btn yellow" type="submit">🖨️ Cetak Kartu SPP</button></div>
      </form>
    </div>`);
  const sel = root.querySelector("#student"), form = root.querySelector("#f");
  let chosen = q.student || null;
  sel.addEventListener("change", () => { chosen = sel.value; });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!sel.value) return;
    nav(`#/print/kartu?student=${encodeURIComponent(sel.value)}&tahun=${root.querySelector("#tahun").value || tahun}`);
  });
  function draw() {
    const students = studentsWithPackage(state.students, state.packages);
    root.querySelector("#kosong").classList.toggle("hidden", !(state.ready && students.length === 0));
    form.classList.toggle("hidden", state.ready && students.length === 0);
    setOptions(sel, students.map((s) => ({ value: s.id, label: `${s.no_akun} - ${s.nama}` })), chosen);
  }
  draw();
  return { update: draw };
}
