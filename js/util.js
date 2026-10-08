// Helper umum: format, escape HTML, template aman (h``).
export const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli",
  "Agustus", "September", "Oktober", "November", "Desember"];

// Info lembaga untuk kop surat / kartu cetak. Ganti di sini kalau datanya berubah.
export const BIMBEL_INFO = {
  nama: "BIMBINGAN BELAJAR OMAH BOCIL",
  alamat1: "Jalan Kejaksaan 1 No 412 RT 06 / RW 02",
  alamat2: "Kel Sukorejo , Kec. Buduran, Kab. Sidoarjo",
  cp: "Indah",
  telp: "0851-5661-5592",
  tagline: "Teman Belajar, Raih Prestasi!",
};

export const rupiah = (n) =>
  "Rp " + String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

// Template HTML aman: nilai otomatis di-escape, kecuali hasil h`` lain (Raw).
class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
export const raw = (s) => new Raw(s);
const part = (v) =>
  v instanceof Raw ? v.s : Array.isArray(v) ? v.map(part).join("") : v == null || v === false ? "" : esc(v);
export function h(strings, ...vals) {
  let out = strings[0];
  vals.forEach((v, i) => { out += part(v) + strings[i + 1]; });
  return new Raw(out);
}
export const render = (el, tpl) => { el.innerHTML = tpl.s; };

export const pad2 = (n) => String(n).padStart(2, "0");
export const todayISO = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const byText = (key) => (a, b) =>
  String(a[key] ?? "").localeCompare(String(b[key] ?? ""), "id", { sensitivity: "base" });

export function downloadFile(filename, mime, text) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
