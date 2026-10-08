import { CHANGELOG } from "../changelog.js";
import { h, render } from "../util.js";

export function mount(root) {
  render(root, h`<div class="card"><h2>🕘 Riwayat Pembaruan Aplikasi</h2>
    ${CHANGELOG.map((c) => h`<div class="log"><div class="log-date">${c.tanggal}</div>
      <div><b>${c.judul}</b><ul>${c.detail.map((d) => h`<li>${d}</li>`)}</ul></div></div>`)}</div>`);
}
