import { state, upsertPayment, deletePayment, paymentId } from "../store.js";
import { studentsWithPackage, activeStudents, kartuTahun } from "../logic.js";
import { h, render, rupiah, MONTHS, todayISO, byText } from "../util.js";
import { toast, nav, setOptions, CARA_BAYAR, attachCaraBayar, caraText } from "../ui.js";

export function mount(root, q) {
  const now = new Date();
  const tahun = parseInt(q.tahun, 10) || now.getFullYear();
  const editBulan = parseInt(q.edit_bulan, 10) || null;
  let studentId = q.student || null;

  render(root, h`
    <div class="card">
      <h2 id="judul">💰 Input Pembayaran SPP</h2>
      <div id="empty" class="hidden"><p>Belum ada siswa aktif. Tambahkan siswa dahulu di menu Siswa.</p></div>
      <div id="main">
        <div class="row">
          <div><label for="student">Siswa</label><select id="student"></select></div>
          <div><label for="tahunPilih">Tahun</label><input id="tahunPilih" type="number" value="${tahun}"></div>
        </div>
        <div id="editNote" class="flash success hidden mt"></div>
        <form id="f" class="mt" autocomplete="off">
          <div class="row">
            <div><label for="bulan">Bulan</label>
              <select id="bulan" name="bulan">${MONTHS.map((m, i) => h`<option value="${i + 1}">${m}</option>`)}</select></div>
            <div><label for="tahun">Tahun</label><input id="tahun" name="tahun" type="number" value="${tahun}" required></div>
            <div><label for="jumlah">Jumlah Iuran</label><input id="jumlah" name="jumlah" type="number" min="0" inputmode="numeric"></div>
          </div>
          <div class="row">
            <div><label for="tgl_bayar">Tgl Bayar</label><input id="tgl_bayar" name="tgl_bayar" type="date" value="${todayISO()}"></div>
            <div><label for="ttd">TTD (Penerima)</label>
              <input id="ttd" name="ttd" list="daftarPenerima" placeholder="pilih atau ketik nama penerima"><datalist id="daftarPenerima"></datalist></div>
            <div><label for="stempel">Stempel</label><select id="stempel" name="stempel"><option>Ya</option><option selected>Belum</option></select></div>
          </div>
          <div class="row">
            <div><label for="cara_bayar">Cara Pembayaran</label><select id="cara_bayar" name="cara_bayar">${CARA_BAYAR.map((c) => h`<option>${c}</option>`)}</select></div>
            <div><label for="bank">Bank</label><input id="bank" name="bank" data-req="1" placeholder="cth: BCA, BRI, Mandiri"></div>
            <div><label for="no_rekening">No Rekening</label><input id="no_rekening" name="no_rekening" data-req="1" inputmode="numeric" placeholder="cth: 1234567890"></div>
          </div>
          <div class="mt"><button class="btn yellow" id="simpan" type="submit">Simpan Pembayaran</button>
            <a class="btn small" href="#/penerima">Kelola Daftar Penerima</a></div>
        </form>
      </div>
    </div>
    <div class="card hidden" id="kartuCard"><h2 id="kartuJudul"></h2><div class="tbl-wrap" id="kartu"></div></div>`);

  const $ = (s) => root.querySelector(s);
  const f = $("#f").elements;
  const sel = $("#student");
  let jumlahDirty = false, editFilled = false;
  f.bulan.value = editBulan || (tahun === now.getFullYear() ? now.getMonth() + 1 : 1);
  f.jumlah.addEventListener("input", () => { jumlahDirty = true; });
  const syncCara = attachCaraBayar(f.cara_bayar, f.bank, f.no_rekening);
  let caraDirty = false;
  [f.cara_bayar, f.bank, f.no_rekening].forEach((el) => el.addEventListener("input", () => { caraDirty = true; }));
  // Pilih penerima (TTD) -> cara bayar, bank, no rekening terisi otomatis dari data Penerima (masih bisa diubah).
  function fillFromRecipient() {
    const r = state.recipients.find((x) => x.nama === f.ttd.value.trim());
    if (!r || caraDirty) return;
    f.cara_bayar.value = r.cara_bayar || "Cash"; f.bank.value = r.bank || ""; f.no_rekening.value = r.no_rekening || "";
    syncCara();
  }
  f.ttd.addEventListener("change", fillFromRecipient);

  function go(extra = {}) {
    const p = new URLSearchParams({ student: studentId || "", tahun: $("#tahunPilih").value || tahun, ...extra });
    nav("#/input-spp?" + p.toString());
  }
  sel.addEventListener("change", () => { studentId = sel.value; go(); });
  $("#tahunPilih").addEventListener("change", () => go());

  $("#f").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!studentId) { toast("Pilih siswa terlebih dahulu.", "error"); return; }
    const th = parseInt(f.tahun.value, 10) || tahun;
    upsertPayment({
      student_id: studentId, bulan: parseInt(f.bulan.value, 10), tahun: th,
      jumlah: parseInt(f.jumlah.value, 10) || 0, tgl_bayar: f.tgl_bayar.value,
      ttd: f.ttd.value.trim(), stempel: f.stempel.value,
      cara_bayar: f.cara_bayar.value, bank: f.bank.value.trim(), no_rekening: f.no_rekening.value.trim(),
    });
    toast("Pembayaran SPP berhasil disimpan.");
    nav(`#/input-spp?student=${encodeURIComponent(studentId)}&tahun=${th}`);
  });

  $("#kartu").addEventListener("click", (e) => {
    const b = e.target.closest("[data-del]");
    if (b && confirm(`Hapus data pembayaran bulan ${b.dataset.nama}?`)) {
      deletePayment(b.dataset.del);
      toast("Data pembayaran berhasil dihapus.");
    }
  });

  function draw() {
    const students = studentsWithPackage(activeStudents(state.students), state.packages);
    const none = state.ready && students.length === 0;
    $("#empty").classList.toggle("hidden", !none);
    $("#main").classList.toggle("hidden", none);
    if (!studentId && students.length) studentId = students[0].id;
    setOptions(sel, students.map((s) => ({ value: s.id, label: `${s.no_akun} - ${s.nama}` })), studentId);
    $("#daftarPenerima").innerHTML = [...state.recipients].sort(byText("nama"))
      .map((r) => `<option value="${r.nama.replace(/"/g, "&quot;")}">${(r.jabatan || "").replace(/</g, "&lt;")}</option>`).join("");

    const siswa = students.find((s) => s.id === studentId) || state.students.find((s) => s.id === studentId);
    const full = siswa && studentsWithPackage([siswa], state.packages)[0];
    const payEdit = editBulan && studentId ? state.payments.find((p) => p.id === paymentId(studentId, tahun, editBulan)) : null;

    $("#judul").textContent = (payEdit ? "✏️ Edit" : "💰 Input") + " Pembayaran SPP";
    $("#simpan").textContent = payEdit ? "Update Pembayaran" : "Simpan Pembayaran";
    const note = $("#editNote");
    note.classList.toggle("hidden", !editBulan);
    if (editBulan) note.innerHTML = `Mengedit pembayaran bulan ${MONTHS[editBulan - 1]} ${tahun}. <a href="#/input-spp?student=${encodeURIComponent(studentId || "")}&tahun=${tahun}">Batal edit</a>`;

    if (payEdit && !editFilled) {
      editFilled = true;
      f.jumlah.value = payEdit.jumlah; f.tgl_bayar.value = payEdit.tgl_bayar || todayISO();
      f.ttd.value = payEdit.ttd || ""; f.stempel.value = payEdit.stempel || "Belum"; jumlahDirty = true;
      f.cara_bayar.value = payEdit.cara_bayar || "Cash"; f.bank.value = payEdit.bank || ""; f.no_rekening.value = payEdit.no_rekening || "";
      caraDirty = true; syncCara();
    } else if (!jumlahDirty && full && full.paket_price != null) {
      f.jumlah.value = full.paket_price;
    }

    $("#kartuCard").classList.toggle("hidden", !siswa);
    if (siswa) {
      $("#kartuJudul").textContent = `📋 Kartu SPP Bulanan — ${siswa.nama} (${tahun})`;
      const kartu = kartuTahun(state.payments, studentId, tahun);
      render($("#kartu"), h`<table>
        <thead><tr><th>No</th><th>Bulan</th><th>Iuran</th><th>TTD</th><th>Cara Bayar</th><th>Stempel</th><th>Status</th><th></th></tr></thead>
        <tbody>${kartu.map((k) => h`<tr>
          <td>${k.no}</td><td>${k.bulan}</td>
          <td>${k.payment ? rupiah(k.payment.jumlah) : ""}</td><td>${k.payment ? k.payment.ttd : ""}</td><td>${k.payment ? caraText(k.payment) : ""}</td><td>${k.payment ? k.payment.stempel : ""}</td>
          <td>${k.payment ? h`<span class="badge ok">Lunas</span>` : h`<span class="badge no">Belum</span>`}</td>
          <td class="nowrap">${k.payment ? h`<a class="btn small" href="#/input-spp?student=${studentId}&tahun=${tahun}&edit_bulan=${k.no}">Edit</a>
            <button class="btn small red" type="button" data-del="${k.payment.id}" data-nama="${k.bulan}">Hapus</button>` : ""}</td>
        </tr>`)}</tbody></table>`);
    }
  }
  draw();
  return { update: draw };
}
