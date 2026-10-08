// Zoom foto siswa: arahkan kursor ke foto (class "zoom-foto"); di layar sentuh: ketuk foto.
const SIZE = 260, GAP = 12;
let pop = null, img = null, active = null;

function build() {
  pop = document.createElement("div");
  pop.className = "zoom-pop";
  img = document.createElement("img");
  img.style.cssText = `display:block;max-width:${SIZE}px;max-height:${SIZE}px;border-radius:10px;object-fit:contain`;
  pop.appendChild(img);
  document.body.appendChild(pop);
}
function place(el) {
  const r = el.getBoundingClientRect(), w = pop.offsetWidth, hgt = pop.offsetHeight;
  const vw = window.innerWidth, vh = window.innerHeight;
  let x = r.right + GAP;
  if (x + w > vw - 8) x = r.left - GAP - w;
  if (x < 8) x = Math.max(8, Math.min(vw - w - 8, r.left + r.width / 2 - w / 2));
  const y = Math.max(8, Math.min(vh - hgt - 8, r.top + r.height / 2 - hgt / 2));
  pop.style.left = x + "px"; pop.style.top = y + "px";
}
function show(el) {
  if (!pop) build();
  active = el;
  img.onload = () => { if (active === el) place(el); };
  img.src = el.currentSrc || el.src;
  pop.style.display = "block";
  place(el);
  requestAnimationFrame(() => pop.classList.add("on"));
}
function hide() {
  if (!pop || !active) return;
  active = null;
  pop.classList.remove("on");
  setTimeout(() => { if (!active) pop.style.display = "none"; }, 180);
}
const target = (e) => (e.target && e.target.closest ? e.target.closest(".zoom-foto") : null);

document.addEventListener("mouseover", (e) => { const t = target(e); if (t && t !== active) show(t); });
document.addEventListener("mouseout", (e) => {
  const t = target(e);
  if (t && (!e.relatedTarget || !t.contains(e.relatedTarget))) hide();
});
document.addEventListener("click", (e) => {
  if (!window.matchMedia("(hover: none)").matches) return;
  const t = target(e);
  if (t) { active === t ? hide() : show(t); } else hide();
});
window.addEventListener("scroll", hide, true);
