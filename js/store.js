// Data layer: mendengarkan Firestore secara realtime + fungsi simpan/hapus.
// Tulis ke Firestore TIDAK di-await di UI: saat offline, promise baru selesai setelah online,
// sedangkan data lokal langsung berubah. Error (mis. izin ditolak) ditangkap oleh fire().
import { db, collection, doc, onSnapshot, setDoc, deleteDoc, writeBatch } from "./firebase.js";
import { byNoAkun } from "./util.js";
import { COLLECTIONS } from "./backup.js";

const NAMES = ["students", "packages", "recipients", "payments"];

export const state = {
  students: [], packages: [], recipients: [], payments: [],
  ready: false,     // true setelah keempat koleksi memuat (dari cache atau server)
  pending: false,   // ada perubahan lokal yang belum terkirim ke server
  error: null,
};

const loaded = {};
const pendingBy = {};
const listeners = new Set();
let unsubs = [];
let scheduled = false;

// ---------- hitungan penggunaan (perkiraan, hanya dari perangkat/browser ini) ----------
// Kuota harian Firestore direset tengah malam waktu Pasifik, jadi hari dihitung menurut zona itu.
const USAGE_KEY = "spp-usage";
const pacificDay = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
export function getUsage() {
  try {
    const u = JSON.parse(localStorage.getItem(USAGE_KEY) || "{}");
    if (u && u.tgl === pacificDay()) return { tgl: u.tgl, baca: u.baca | 0, tulis: u.tulis | 0, hapus: u.hapus | 0 };
  } catch { /* abaikan */ }
  return { tgl: pacificDay(), baca: 0, tulis: 0, hapus: 0 };
}
function addUsage(kind, n) {
  if (!n) return;
  const u = getUsage(); u[kind] += n;
  try { localStorage.setItem(USAGE_KEY, JSON.stringify(u)); } catch { /* abaikan */ }
}

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function notify() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => { scheduled = false; listeners.forEach((fn) => fn()); });
}

export function startSync() {
  stopSync();
  state.error = null;
  NAMES.forEach((name) => {
    unsubs.push(onSnapshot(
      collection(db, name),
      { includeMetadataChanges: true },
      (snap) => {
        state[name] = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
        if (name === "students") state.students.sort(byNoAkun); // semua halaman memakai urutan No Akun
        if (!snap.metadata.fromCache) addUsage("baca", snap.docChanges().length);
        loaded[name] = true;
        pendingBy[name] = snap.metadata.hasPendingWrites;
        state.ready = NAMES.every((n) => loaded[n]);
        state.pending = NAMES.some((n) => pendingBy[n]);
        notify();
      },
      (err) => { state.error = err; notify(); },
    ));
  });
}

export function stopSync() {
  unsubs.forEach((u) => u());
  unsubs = [];
  NAMES.forEach((n) => { state[n] = []; loaded[n] = false; pendingBy[n] = false; });
  Object.assign(state, { ready: false, pending: false, error: null });
  notify();
}

let onWriteError = (e) => console.error(e);
export const setWriteErrorHandler = (fn) => { onWriteError = fn; };
const fire = (promise) => { promise.catch((e) => onWriteError(e)); };

// ---------- siswa ----------
/** id=null → siswa baru. foto: undefined = jangan ubah, null = hapus, string = data URL baru. */
export function saveStudent(id, data, foto) {
  const payload = {
    no_akun: data.no_akun, nama: data.nama, status: data.status,
    mulai: data.mulai || null,
    paket_id: data.paket_id || null, jatuh_tempo: data.jatuh_tempo || 10,
    asal_sekolah: data.asal_sekolah || null, kelas: data.kelas || null,
    tahun_lahir: data.tahun_lahir || null,
  };
  if (foto !== undefined) payload.foto = foto;
  else if (!id) payload.foto = null;
  const ref = id ? doc(db, "students", id) : doc(collection(db, "students"));
  addUsage("tulis", 1);
  fire(setDoc(ref, payload, { merge: true }));
  return ref.id;
}

/** Hapus siswa beserta seluruh pembayarannya (setara ON DELETE CASCADE di versi lama). */
export function deleteStudent(id) {
  const batch = writeBatch(db);
  state.payments.filter((p) => p.student_id === id)
    .forEach((p) => batch.delete(doc(db, "payments", p.id)));
  batch.delete(doc(db, "students", id));
  addUsage("hapus", state.payments.filter((p) => p.student_id === id).length + 1);
  fire(batch.commit());
}

// ---------- paket ----------
export function savePackage(id, { name, price }) {
  const ref = id ? doc(db, "packages", id) : doc(collection(db, "packages"));
  addUsage("tulis", 1);
  fire(setDoc(ref, { name, price }, { merge: true }));
}
export function deletePackage(id) {
  const batch = writeBatch(db);
  state.students.filter((s) => s.paket_id === id)
    .forEach((s) => batch.set(doc(db, "students", s.id), { paket_id: null }, { merge: true }));
  batch.delete(doc(db, "packages", id));
  addUsage("tulis", state.students.filter((s) => s.paket_id === id).length); addUsage("hapus", 1);
  fire(batch.commit());
}

// ---------- penerima ----------
export function saveRecipient(id, { nama, jabatan, cara_bayar, bank, no_rekening }) {
  const ref = id ? doc(db, "recipients", id) : doc(collection(db, "recipients"));
  const tf = cara_bayar === "Transfer";
  addUsage("tulis", 1);
  fire(setDoc(ref, { nama, jabatan: jabatan || null, cara_bayar: cara_bayar || "Cash",
    bank: tf ? (bank || null) : null, no_rekening: tf ? (no_rekening || null) : null }, { merge: true }));
}
export function deleteRecipient(id) { addUsage("hapus", 1); fire(deleteDoc(doc(db, "recipients", id))); }

// ---------- pembayaran ----------
// ID dokumen deterministik: satu siswa hanya punya satu pembayaran per (bulan, tahun).
export const paymentId = (studentId, tahun, bulan) => `${studentId}_${tahun}_${bulan}`;
export function upsertPayment({ student_id, bulan, tahun, jumlah, tgl_bayar, ttd, stempel, cara_bayar, bank, no_rekening }) {
  addUsage("tulis", 1);
  fire(setDoc(doc(db, "payments", paymentId(student_id, tahun, bulan)),
    { student_id, bulan, tahun, jumlah, tgl_bayar: tgl_bayar || null, ttd: ttd || "", stempel: stempel || "Belum",
      cara_bayar: cara_bayar || "Cash",
      bank: cara_bayar === "Transfer" ? (bank || null) : null,
      no_rekening: cara_bayar === "Transfer" ? (no_rekening || null) : null }));
}
export function deletePayment(id) { addUsage("hapus", 1); fire(deleteDoc(doc(db, "payments", id))); }

// ---------- restore ----------
/**
 * Pulihkan data dari backup yang SUDAH divalidasi (lihat backup.js).
 * mode "merge"   : tambah/timpa dokumen ber-ID sama, data lain dibiarkan.
 * mode "replace" : sama seperti merge, lalu hapus dokumen yang tidak ada di backup.
 * Ditulis per batch dan di-await (butuh online) supaya kegagalan terlihat; data ditulis dulu, baru dihapus.
 */
export async function restoreData(data, mode, onProgress = () => {}) {
  if (!state.ready) throw new Error("Data belum selesai dimuat.");
  const ops = [];
  for (const name of COLLECTIONS) {
    const ids = new Set();
    for (const item of data[name] || []) {
      const { id, ...rest } = item;
      ids.add(id);
      ops.push({ del: false, ref: doc(db, name, id), data: rest, bytes: JSON.stringify(rest).length + 200 });
    }
    if (mode === "replace") for (const cur of state[name]) if (!ids.has(cur.id)) ops.push({ del: true, ref: doc(db, name, cur.id), bytes: 0 });
  }
  ops.sort((a, b) => a.del - b.del); // sort stabil: tulis dulu, hapus belakangan
  const sets = ops.filter((o) => !o.del).length, dels = ops.length - sets;
  let batch = writeBatch(db), n = 0, bytes = 0, done = 0;
  const flush = async () => { if (!n) return; await batch.commit(); done += n; onProgress(done, ops.length); batch = writeBatch(db); n = 0; bytes = 0; };
  for (const op of ops) {
    if (n >= 400 || bytes + op.bytes > 8_000_000) await flush();
    if (op.del) batch.delete(op.ref); else batch.set(op.ref, op.data);
    n++; bytes += op.bytes;
  }
  await flush();
  addUsage("tulis", sets); addUsage("hapus", dels);
  return { ditulis: sets, dihapus: dels };
}
