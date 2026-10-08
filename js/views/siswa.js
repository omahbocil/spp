import { state, saveStudent, deleteStudent } from "../store.js";
import { studentsWithPackage, findDuplicateNoAkun, nextNoAkun } from "../logic.js";
import { h, render, rupiah, esc, byText } from "../util.js";
import { toast, nav, setOptions, attachDateMask } from "../ui.js";
import { resizeImage } from "../photo.js";

export function mount(root, q) {
  const editId = q.edit || null;
  const thisYear = new Date().getFullYear();
  render(root, h`
    <div class="card">
      <h2>➕ ${editId ? "Edit" : "Tambah"} Siswa</h2>
      <form id="f" autocomplete="off">
        <div class="row">
          <div><label for="no_akun">No Akun</label><input id="no_akun" name="no_akun" required></div>
          <div><label for="nama">Nama</label><input id="nama" name="nama" required></div>
          <div><label for="status">Status</label><select id="status" name="status"><option>Aktif</option><option>Nonaktif</option></select></div>
        </div>
        <div class="row">
          <div><label for="mulai">Mulai (dd-mm-yyyy)</label><input id="mulai" name="mulai" placeholder="dd-mm-yyyy" pattern="\\d{2}-\\d{2}-\\d{4}" maxlength="10" inputmode="numeric"></div>
          <div><label for="paket_id">Paket</label><select id="paket_id" name="paket_id"></select></div>
          <div><label for="jatuh_tempo">Tgl Jatuh Tempo (1-28)</label><input id="jatuh_tempo" name="jatuh_tempo" type="number" min="1" max="28" value="10"></div>
        </div>
        <div class="row mt">
          <div><label for="asal_sekolah">Asal Sekolah</label><input id="asal_sekolah" name="asal_sekolah"></div>
          <div><label for="kelas">Kelas</label><input id="kelas" name="kelas"></div>
          <div><label for="tahun_lahir">Tahun Lahir</label><input id="tahun_lahir" name="tahun_lahir" type="number" placeholder="cth: 2015" min="1990" max="${thisYear}"></div>
          <div><label for="usia">Usia Saat Ini</label><input id="usia" disabled placeholder="otomatis dari Tahun Lahir"></div>
        </div>
        <div class="row mt">
          <div><label for="foto">Foto Siswa ${editId ? "(kosongkan jika tidak diganti)" : "(opsional)"}</label>
            <input id="foto" type="file" accept="image/*"></div>
          <div class="fit"><label>Foto</label><div id="fotoPrev" class="foto-prev">👤</div></div>
        </div>
        <div class="mt">
          <button class="btn yellow" type="submit">Simpan</button>
          <a class="btn" href="#/siswa">Batal</a>
        </div>
      </form>
    </div>
    <div class="card"><h2>👦 Daftar Siswa</h2><div class="tbl-wrap" id="list"></div></div>`);

  const f = root.querySelector("#f").elements;
  const form = root.querySelector("#f");
  const list = root.querySelector("#list");
  const prev = root.querySelector("#fotoPrev");
  let desiredPaket = "", newFoto, filled = false, noAkunDirty = false, existingFoto = null;

  attachDateMask(f.mulai);
  f.no_akun.addEventListener("input", () => { noAkunDirty = true; });
  f.paket_id.addEventListener("change", () => { desiredPaket = f.paket_id.value; });
  f.tahun_lahir.addEventListener("input", () => {
    const t = parseInt(f.tahun_lahir.value, 10);
    f.usia.value = t > 1900 && t <= thisYear ? `${thisYear - t} tahun` : "";
  });
  function showFoto(src) {
    prev.innerHTML = src ? `<img class="zoom-foto" src="${esc(src)}" alt="Foto siswa">` : "👤";
  }
  f.foto.addEventListener("change", async () => {
    const file = f.foto.files[0];
    if (!file) { newFoto = undefined; showFoto(existingFoto); return; }
    try { newFoto = await resizeImage(file); showFoto(newFoto); }
    catch { newFoto = undefined; f.foto.value = ""; toast("Foto tidak bisa dibaca. Gunakan file gambar (JPG/PNG/WEBP).", "error"); }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!state.ready) { toast("Data masih dimuat, coba lagi sebentar.", "error"); return; }
    const no_akun = f.no_akun.value.trim();
    if (findDuplicateNoAkun(state.students, no_akun, editId)) { toast("No Akun sudah dipakai siswa lain.", "error"); return; }
    saveStudent(editId, {
      no_akun, nama: f.nama.value.trim(), status: f.status.value,
      mulai: f.mulai.value, paket_id: f.paket_id.value,
      jatuh_tempo: parseInt(f.jatuh_tempo.value, 10) || 10,
      asal_sekolah: f.asal_sekolah.value.trim(), kelas: f.kelas.value.trim(),
      tahun_lahir: parseInt(f.tahun_lahir.value, 10) || null,
    }, newFoto);
    toast(editId ? "Data siswa berhasil diperbarui." : "Siswa baru berhasil ditambahkan.");
    nav("#/siswa");
  });

  list.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-del]");
    if (!btn) return;
    if (confirm("Hapus siswa ini? Riwayat pembayarannya akan ikut terhapus.")) {
      deleteStudent(btn.dataset.del);
      toast("Siswa dihapus. Riwayat pembayarannya juga ikut terhapus.");
      if (editId === btn.dataset.del) nav("#/siswa");
    }
  });

  function draw() {
    // opsi paket
    const packages = [...state.packages].sort(byText("name"));
    setOptions(f.paket_id, packages.map((p) => ({ value: p.id, label: `${p.name} - ${rupiah(p.price)}` })), desiredPaket, "-Pilih-");
    // isi form sekali saat data siswa yang diedit tersedia / no akun otomatis untuk siswa baru
    if (editId && !filled) {
      const s = state.students.find((x) => x.id === editId);
      if (s) {
        filled = true;
        f.no_akun.value = s.no_akun || ""; f.nama.value = s.nama || ""; f.status.value = s.status || "Aktif";
        f.mulai.value = s.mulai || "";
        desiredPaket = s.paket_id || ""; f.paket_id.value = desiredPaket;
        f.jatuh_tempo.value = s.jatuh_tempo || 10;
        f.asal_sekolah.value = s.asal_sekolah || ""; f.kelas.value = s.kelas || "";
        f.tahun_lahir.value = s.tahun_lahir || ""; f.tahun_lahir.dispatchEvent(new Event("input"));
        existingFoto = s.foto || null;
        if (newFoto === undefined) showFoto(existingFoto);
      } else if (state.ready) { toast("Siswa tidak ditemukan.", "error"); nav("#/siswa"); return; }
    } else if (!editId && !noAkunDirty) {
      f.no_akun.value = nextNoAkun(state.students);
    }
    // daftar
    const rows = studentsWithPackage(state.students, state.packages);
    render(list, h`
      <table>
        <thead><tr><th>Foto</th><th>No Akun</th><th>Nama</th><th>Kelas</th><th>Usia</th><th>Status</th><th>Paket</th><th>Iuran</th><th>Jatuh Tempo</th><th></th></tr></thead>
        <tbody>
          ${!state.ready ? h`<tr><td colspan="10">Memuat data…</td></tr>`
            : rows.length === 0 ? h`<tr><td colspan="10">Belum ada siswa. Isi form di atas untuk menambahkan.</td></tr>` : ""}
          ${rows.map((s) => h`<tr>
            <td>${s.foto ? h`<img class="zoom-foto thumb" src="${s.foto}" alt="Foto ${s.nama}">` : h`<span class="thumb ph">👤</span>`}</td>
            <td>${s.no_akun}</td><td>${s.nama}</td><td>${s.kelas || "-"}</td>
            <td>${s.usia ? s.usia + " th" : "-"}</td><td>${s.status}</td><td>${s.paket_name || "-"}</td>
            <td>${s.paket_price != null ? rupiah(s.paket_price) : "-"}</td><td>${s.jatuh_tempo || 10}</td>
            <td class="nowrap"><a class="btn small" href="#/siswa?edit=${s.id}">Edit</a>
              <button class="btn small red" type="button" data-del="${s.id}">Hapus</button></td>
          </tr>`)}
        </tbody>
      </table>`);
  }
  draw();
  return { update: draw };
}
