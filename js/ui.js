// Helper UI kecil: toast, navigasi, opsi <select>.
import { esc } from "./util.js";

export function toast(message, type = "success") {
  const box = document.getElementById("toasts");
  if (!box) return;
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  box.appendChild(el);
  setTimeout(() => el.remove(), type === "error" ? 6000 : 3000);
}

/** Pindah halaman; kalau tujuannya sama dengan halaman sekarang, render ulang (reset form). */
export function nav(hash) {
  if (location.hash === hash) window.dispatchEvent(new Event("app:refresh"));
  else location.hash = hash;
}

/** Isi ulang <option> sambil mempertahankan pilihan. items: [{value,label}] */
export function setOptions(select, items, value, placeholder = null) {
  const keep = value ?? select.value;
  select.innerHTML =
    (placeholder != null ? `<option value="">${esc(placeholder)}</option>` : "") +
    items.map((i) => `<option value="${esc(i.value)}">${esc(i.label)}</option>`).join("");
  select.value = keep;
  if (select.value !== keep && items.length && placeholder == null) select.selectedIndex = 0;
}

// Format dd-mm-yyyy otomatis saat mengetik.
export function attachDateMask(input) {
  input.addEventListener("input", (e) => {
    let v = e.target.value.replace(/[^\d]/g, "").slice(0, 8);
    if (v.length > 4) v = v.slice(0, 2) + "-" + v.slice(2, 4) + "-" + v.slice(4);
    else if (v.length > 2) v = v.slice(0, 2) + "-" + v.slice(2);
    e.target.value = v;
  });
}

export const CARA_BAYAR = ["Cash", "Transfer", "QRIS"];

/** Tampilkan kolom Bank & No Rekening hanya saat cara bayar = Transfer. */
export function attachCaraBayar(select, ...fields) {
  const toggle = () => {
    const on = select.value === "Transfer";
    fields.forEach((el) => { el.closest("div").classList.toggle("hidden", !on); el.required = on && el.dataset.req === "1"; });
  };
  select.addEventListener("change", toggle);
  toggle();
  return toggle;
}

/** Ringkas cara bayar untuk tabel: "Transfer — BCA 1234567". */
export function caraText(o) {
  if (!o || !o.cara_bayar) return "-";
  return o.cara_bayar === "Transfer" ? `Transfer — ${[o.bank, o.no_rekening].filter(Boolean).join(" ") || "-"}` : o.cara_bayar;
}
