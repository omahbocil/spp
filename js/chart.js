// Grafik batang SVG sederhana (tanpa library, jadi tetap jalan offline).
import { esc, raw } from "./util.js";

/** Angka ringkas untuk label di atas batang: 1,2jt / 350rb. */
export function compact(n) {
  n = Number(n) || 0;
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "").replace(".", ",") + "jt";
  if (n >= 1e3) return Math.round(n / 1e3) + "rb";
  return String(n);
}

/** items: [{label, value, text?, cls?}] → string SVG (aman, sudah di-escape). */
export function barChart(items, { width = 420, height = 210, title = "" } = {}) {
  const padT = 24, padB = 26, padX = 6;
  const plotH = height - padT - padB;
  const max = Math.max(1, ...items.map((i) => i.value));
  const slot = (width - padX * 2) / Math.max(items.length, 1);
  const bw = Math.min(slot * 0.7, 56);
  const bars = items.map((it, i) => {
    const bh = it.value > 0 ? Math.max(2, (it.value / max) * plotH) : 0;
    const x = padX + slot * i + (slot - bw) / 2;
    const y = padT + plotH - bh;
    const cx = x + bw / 2;
    return `<g><rect class="ch-bar ${esc(it.cls || "")}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="3"><title>${esc(it.label)}: ${esc(it.text ?? it.value)}</title></rect>`
      + (it.value > 0 ? `<text class="ch-val" x="${cx.toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle">${esc(it.short ?? it.text ?? it.value)}</text>` : "")
      + `<text class="ch-lbl" x="${cx.toFixed(1)}" y="${height - 8}" text-anchor="middle">${esc(it.label)}</text></g>`;
  }).join("");
  return raw(`<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}">`
    + `<line class="ch-axis" x1="${padX}" x2="${width - padX}" y1="${padT + plotH}" y2="${padT + plotH}"/>${bars}</svg>`);
}
