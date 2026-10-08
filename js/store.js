// Data layer: mendengarkan Firestore secara realtime + fungsi simpan/hapus.
// Tulis ke Firestore TIDAK di-await di UI: saat offline, promise baru selesai setelah online,
// sedangkan data lokal langsung berubah. Error (mis. izin ditolak) ditangkap oleh fire().
import { db, collection, doc, onSnapshot, setDoc, deleteDoc, writeBatch } from "./firebase.js";

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
  fire(setDoc(ref, payload, { merge: true }));
  return ref.id;
}

/** Hapus siswa beserta seluruh pembayarannya (setara ON DELETE CASCADE di versi lama). */
export function deleteStudent(id) {
  const batch = writeBatch(db);
  state.payments.filter((p) => p.student_id === id)
    .forEach((p) => batch.delete(doc(db, "payments", p.id)));
  batch.delete(doc(db, "students", id));
  fire(batch.commit());
}

// ---------- paket ----------
export function savePackage(id, { name, price }) {
  const ref = id ? doc(db, "packages", id) : doc(collection(db, "packages"));
  fire(setDoc(ref, { name, price }, { merge: true }));
}
export function deletePackage(id) {
  const batch = writeBatch(db);
  state.students.filter((s) => s.paket_id === id)
    .forEach((s) => batch.set(doc(db, "students", s.id), { paket_id: null }, { merge: true }));
  batch.delete(doc(db, "packages", id));
  fire(batch.commit());
}

// ---------- penerima ----------
export function saveRecipient(id, { nama, jabatan, cara_bayar, bank, no_rekening }) {
  const ref = id ? doc(db, "recipients", id) : doc(collection(db, "recipients"));
  const tf = cara_bayar === "Transfer";
  fire(setDoc(ref, { nama, jabatan: jabatan || null, cara_bayar: cara_bayar || "Cash",
    bank: tf ? (bank || null) : null, no_rekening: tf ? (no_rekening || null) : null }, { merge: true }));
}
export function deleteRecipient(id) { fire(deleteDoc(doc(db, "recipients", id))); }

// ---------- pembayaran ----------
// ID dokumen deterministik: satu siswa hanya punya satu pembayaran per (bulan, tahun).
export const paymentId = (studentId, tahun, bulan) => `${studentId}_${tahun}_${bulan}`;
export function upsertPayment({ student_id, bulan, tahun, jumlah, tgl_bayar, ttd, stempel, cara_bayar, bank, no_rekening }) {
  fire(setDoc(doc(db, "payments", paymentId(student_id, tahun, bulan)),
    { student_id, bulan, tahun, jumlah, tgl_bayar: tgl_bayar || null, ttd: ttd || "", stempel: stempel || "Belum",
      cara_bayar: cara_bayar || "Cash",
      bank: cara_bayar === "Transfer" ? (bank || null) : null,
      no_rekening: cara_bayar === "Transfer" ? (no_rekening || null) : null }));
}
export function deletePayment(id) { fire(deleteDoc(doc(db, "payments", id))); }
