import { auth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "../firebase.js";
import { h, render } from "../util.js";
import { toast } from "../ui.js";

export function mount(root) {
  render(root, h`<div class="card narrow"><h2>🔑 Ganti Password</h2>
    <form id="f" autocomplete="off">
      <label for="lama">Password Lama</label><input id="lama" type="password" required autocomplete="current-password">
      <label for="baru" class="mt">Password Baru (minimal 8 karakter)</label><input id="baru" type="password" minlength="8" required autocomplete="new-password">
      <label for="ulang" class="mt">Ulangi Password Baru</label><input id="ulang" type="password" minlength="8" required autocomplete="new-password">
      <div class="mt"><button class="btn yellow" id="go" type="submit">Simpan Password</button></div>
    </form></div>`);
  const $ = (s) => root.querySelector(s);
  $("#f").addEventListener("submit", async (e) => {
    e.preventDefault();
    if ($("#baru").value !== $("#ulang").value) { toast("Konfirmasi password baru tidak sama.", "error"); return; }
    const user = auth.currentUser;
    if (!user) { toast("Sesi login habis. Silakan login ulang.", "error"); return; }
    const btn = $("#go"); btn.disabled = true;
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, $("#lama").value));
      await updatePassword(user, $("#baru").value);
      toast("Password berhasil diganti.");
      $("#f").reset();
    } catch (err) {
      const bad = ["auth/wrong-password", "auth/invalid-credential"].includes(err.code);
      toast(bad ? "Password lama salah." : err.code === "auth/network-request-failed"
        ? "Tidak ada koneksi internet. Ganti password butuh online." : "Gagal mengganti password: " + (err.code || err.message), "error");
    } finally { btn.disabled = false; }
  });
}
