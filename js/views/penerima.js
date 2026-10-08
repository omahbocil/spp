import { state, saveRecipient, deleteRecipient } from "../store.js";
import { h, render, byText } from "../util.js";
import { toast, nav } from "../ui.js";

export function mount(root, q) {
  const editId = q.edit || null;
  render(root, h`
    <div class="card">
      <h2>🧾 ${editId ? "Edit" : "Tambah"} Penerima Iuran SPP</h2>
      <p class="muted">Nama di daftar ini muncul sebagai saran pada kolom TTD saat Input SPP.</p>
      <form id="f" autocomplete="off">
        <div class="row">
          <div><label for="nama">Nama</label><input id="nama" name="nama" required></div>
          <div><label for="jabatan">Jabatan (opsional)</label><input id="jabatan" name="jabatan"></div>
        </div>
        <div class="mt"><button class="btn yellow" type="submit">Simpan</button> <a class="btn" href="#/penerima">Batal</a></div>
      </form>
    </div>
    <div class="card"><h2>Daftar Penerima</h2><div class="tbl-wrap" id="list"></div></div>`);
  const f = root.querySelector("#f").elements, list = root.querySelector("#list");
  let filled = false;
  root.querySelector("#f").addEventListener("submit", (e) => {
    e.preventDefault();
    saveRecipient(editId, { nama: f.nama.value.trim(), jabatan: f.jabatan.value.trim() });
    toast(editId ? "Penerima berhasil diperbarui." : "Penerima berhasil ditambahkan.");
    nav("#/penerima");
  });
  list.addEventListener("click", (e) => {
    const b = e.target.closest("[data-del]");
    if (b && confirm("Hapus penerima ini?")) { deleteRecipient(b.dataset.del); toast("Penerima dihapus."); }
  });
  function draw() {
    if (editId && !filled) {
      const r = state.recipients.find((x) => x.id === editId);
      if (r) { filled = true; f.nama.value = r.nama; f.jabatan.value = r.jabatan || ""; }
    }
    const rows = [...state.recipients].sort(byText("nama"));
    render(list, h`<table>
      <thead><tr><th>Nama</th><th>Jabatan</th><th></th></tr></thead>
      <tbody>
        ${!state.ready ? h`<tr><td colspan="3">Memuat data…</td></tr>` : rows.length === 0 ? h`<tr><td colspan="3">Belum ada penerima.</td></tr>` : ""}
        ${rows.map((r) => h`<tr><td>${r.nama}</td><td>${r.jabatan || "-"}</td>
          <td class="nowrap"><a class="btn small" href="#/penerima?edit=${r.id}">Edit</a>
          <button class="btn small red" type="button" data-del="${r.id}">Hapus</button></td></tr>`)}
      </tbody></table>`);
  }
  draw();
  return { update: draw };
}
