import { state, savePackage, deletePackage } from "../store.js";
import { h, render, rupiah, byText } from "../util.js";
import { toast, nav } from "../ui.js";

export function mount(root, q) {
  const editId = q.edit || null;
  render(root, h`
    <div class="card">
      <h2>📦 ${editId ? "Edit" : "Tambah"} Paket</h2>
      <form id="f" autocomplete="off">
        <div class="row">
          <div><label for="name">Nama Paket</label><input id="name" name="name" required></div>
          <div><label for="price">Harga per Bulan (Rp)</label><input id="price" name="price" type="number" min="0" required></div>
        </div>
        <div class="mt"><button class="btn yellow" type="submit">Simpan</button> <a class="btn" href="#/paket">Batal</a></div>
      </form>
    </div>
    <div class="card"><h2>Daftar Paket</h2><div class="tbl-wrap" id="list"></div></div>`);
  const f = root.querySelector("#f").elements, list = root.querySelector("#list");
  let filled = false;

  root.querySelector("#f").addEventListener("submit", (e) => {
    e.preventDefault();
    savePackage(editId, { name: f.name.value.trim(), price: parseInt(f.price.value, 10) || 0 });
    toast(editId ? "Paket berhasil diperbarui." : "Paket berhasil ditambahkan.");
    nav("#/paket");
  });
  list.addEventListener("click", (e) => {
    const b = e.target.closest("[data-del]");
    if (b && confirm("Hapus paket ini? Siswa yang memakai paket ini akan menjadi tanpa paket.")) {
      deletePackage(b.dataset.del); toast("Paket dihapus.");
    }
  });
  function draw() {
    if (editId && !filled) {
      const p = state.packages.find((x) => x.id === editId);
      if (p) { filled = true; f.name.value = p.name; f.price.value = p.price; }
    }
    const rows = [...state.packages].sort(byText("name"));
    render(list, h`<table>
      <thead><tr><th>Nama</th><th>Harga/bulan</th><th></th></tr></thead>
      <tbody>
        ${!state.ready ? h`<tr><td colspan="3">Memuat data…</td></tr>` : rows.length === 0 ? h`<tr><td colspan="3">Belum ada paket.</td></tr>` : ""}
        ${rows.map((p) => h`<tr><td>${p.name}</td><td>${rupiah(p.price)}</td>
          <td class="nowrap"><a class="btn small" href="#/paket?edit=${p.id}">Edit</a>
          <button class="btn small red" type="button" data-del="${p.id}">Hapus</button></td></tr>`)}
      </tbody></table>`);
  }
  draw();
  return { update: draw };
}
