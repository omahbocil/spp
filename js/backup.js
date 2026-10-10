// Fungsi murni untuk backup/restore: membuat file backup, memvalidasi file sebelum dipulihkan,
// dan memperkirakan ukuran data. Tidak menyentuh Firebase, jadi mudah dites.
export const COLLECTIONS = ["students", "packages", "recipients", "payments"];
export const LABEL = { students: "Siswa", packages: "Paket", recipients: "Penerima", payments: "Pembayaran" };
export const BACKUP_VERSION = 1;
export const LIMITS = { storage: 1024 ** 3, reads: 50000, writes: 20000, deletes: 20000, docBytes: 1048576 };
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_DOCS = 20000;

export function formatBytes(n) {
  n = Number(n) || 0;
  if (n < 1024) return n + " B";
  if (n < 1024 ** 2) return (n / 1024).toFixed(1).replace(".", ",") + " KB";
  if (n < 1024 ** 3) return (n / 1024 ** 2).toFixed(1).replace(".", ",") + " MB";
  return (n / 1024 ** 3).toFixed(2).replace(".", ",") + " GB";
}

const utf8 = (s) => new TextEncoder().encode(String(s)).length;

/** Perkiraan ukuran dokumen Firestore (aturan resmi: nama dokumen + field + 32 byte). */
export function docBytes(collection, doc) {
  let n = utf8(collection) + 1 + utf8(doc.id || "") + 1 + 16 + 32;
  for (const [k, v] of Object.entries(doc)) {
    if (k === "id") continue;
    n += utf8(k) + 1;
    if (typeof v === "string") n += utf8(v) + 1;
    else if (typeof v === "number") n += 8;
    else n += 1;
  }
  return n;
}

export function buildBackup(data, now = new Date()) {
  const out = { aplikasi: "spp-omahbocil", versi: BACKUP_VERSION, diekspor: now.toISOString(),
    jumlah: Object.fromEntries(COLLECTIONS.map((c) => [c, (data[c] || []).length])) };
  COLLECTIONS.forEach((c) => { out[c] = data[c] || []; });
  return out;
}

const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const isStr = (v) => typeof v === "string" && v.trim() !== "";
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const BAD_ID = /(^\.\.?$)|\/|^__.*__$/;

/**
 * Validasi isi file backup. existing = data yang sedang ada (untuk cek referensi siswa).
 * Mengembalikan { ok, errors[], warnings[], data, counts, meta, lengkap }.
 */
export function validateBackup(obj, existing = {}) {
  const errors = [], warnings = [];
  const fail = (m) => { if (errors.length < 30) errors.push(m); };
  if (!isObj(obj)) return { ok: false, errors: ["Isi file bukan data backup yang valid."], warnings, data: {}, counts: {}, meta: {}, lengkap: false };
  if (obj.aplikasi !== undefined && obj.aplikasi !== "spp-omahbocil") fail("File ini bukan backup aplikasi SPP Omah Bocil.");
  if (obj.versi !== undefined && Number(obj.versi) > BACKUP_VERSION) fail("File dibuat oleh versi aplikasi yang lebih baru. Perbarui aplikasi dulu.");

  const data = {}, counts = {};
  let total = 0, adaKoleksi = 0;
  for (const c of COLLECTIONS) {
    if (obj[c] === undefined) { data[c] = []; counts[c] = 0; continue; }
    if (!Array.isArray(obj[c])) { fail(`Bagian "${c}" harus berupa daftar.`); data[c] = []; counts[c] = 0; continue; }
    adaKoleksi++;
    const seen = new Set(), list = [];
    obj[c].forEach((raw, i) => {
      const where = `${LABEL[c]} #${i + 1}`;
      if (!isObj(raw)) return fail(`${where}: bukan data yang valid.`);
      const id = raw.id;
      if (typeof id !== "string" || !id || id.length > 200 || BAD_ID.test(id)) return fail(`${where}: ID tidak valid.`);
      if (seen.has(id)) return fail(`${where}: ID "${id}" muncul lebih dari sekali.`);
      seen.add(id);
      const doc = { id };
      for (const [k, v] of Object.entries(raw)) {
        if (k === "id") continue;
        if (k === "__proto__" || k === "constructor" || k === "prototype" || /^__.*__$/.test(k) || k.length > 200) return fail(`${where}: nama field "${k}" tidak diizinkan.`);
        if (!(v === null || typeof v === "string" || typeof v === "boolean" || isNum(v))) return fail(`${where}: nilai field "${k}" tidak didukung.`);
        doc[k] = v;
      }
      let bad = null;
      if (c === "students" && (!isStr(doc.no_akun) || !isStr(doc.nama))) bad = "No Akun dan Nama wajib diisi";
      else if (c === "students" && doc.status !== undefined && !["Aktif", "Nonaktif"].includes(doc.status)) bad = "status harus Aktif atau Nonaktif";
      else if (c === "packages" && (!isStr(doc.name) || !isNum(doc.price) || doc.price < 0)) bad = "nama dan harga paket tidak valid";
      else if (c === "recipients" && !isStr(doc.nama)) bad = "nama penerima wajib diisi";
      else if (c === "payments" && (!isStr(doc.student_id) || !Number.isInteger(doc.bulan) || doc.bulan < 1 || doc.bulan > 12
        || !Number.isInteger(doc.tahun) || doc.tahun < 2000 || doc.tahun > 2100 || !isNum(doc.jumlah) || doc.jumlah < 0)) bad = "siswa, bulan, tahun, atau jumlah tidak valid";
      if (bad) return fail(`${where}: ${bad}.`);
      if (docBytes(c, doc) > LIMITS.docBytes) return fail(`${where}: ukuran melebihi batas 1 MB per dokumen.`);
      list.push(doc);
    });
    data[c] = list; counts[c] = list.length; total += list.length;
  }
  if (!adaKoleksi) fail("File tidak berisi data siswa, paket, penerima, atau pembayaran.");
  if (total > MAX_DOCS) fail(`Terlalu banyak dokumen (${total}). Batas restore ${MAX_DOCS} dokumen sekaligus.`);

  // peringatan (tidak menggagalkan restore)
  const nos = new Map();
  data.students.forEach((s) => nos.set(s.no_akun, (nos.get(s.no_akun) || 0) + 1));
  const dup = [...nos].filter(([, n]) => n > 1).map(([k]) => k);
  if (dup.length) warnings.push(`No Akun ganda di file: ${dup.slice(0, 5).join(", ")}${dup.length > 5 ? "…" : ""}.`);
  const ids = new Set([...(existing.students || []).map((s) => s.id), ...data.students.map((s) => s.id)]);
  const yatim = data.payments.filter((p) => !ids.has(p.student_id)).length;
  if (yatim) warnings.push(`${yatim} pembayaran merujuk ke siswa yang tidak ada.`);

  const lengkap = COLLECTIONS.every((c) => Array.isArray(obj[c]));
  return { ok: errors.length === 0, errors, warnings, data, counts, lengkap,
    meta: { diekspor: typeof obj.diekspor === "string" ? obj.diekspor : null } };
}

/** Parse teks file backup (dengan batas ukuran) lalu validasi. */
export function parseBackupText(text, existing = {}) {
  if (typeof text !== "string" || text.length > MAX_FILE_BYTES) return { ok: false, errors: ["File terlalu besar atau tidak terbaca."], warnings: [], data: {}, counts: {}, meta: {}, lengkap: false };
  let obj;
  try { obj = JSON.parse(text.replace(/^\uFEFF/, "")); }
  catch { return { ok: false, errors: ["File bukan JSON yang valid. Gunakan file backup (.json) dari aplikasi ini."], warnings: [], data: {}, counts: {}, meta: {}, lengkap: false }; }
  return validateBackup(obj, existing);
}

/** Ringkasan penggunaan: jumlah dokumen & perkiraan ukuran per koleksi. */
export function usageSummary(data) {
  const per = COLLECTIONS.map((c) => {
    let bytes = 0, max = { bytes: 0, label: "-" };
    for (const d of data[c] || []) {
      const b = docBytes(c, d); bytes += b;
      if (b > max.bytes) max = { bytes: b, label: c === "students" ? `${d.no_akun || ""} ${d.nama || ""}`.trim() : (d.nama || d.name || d.id) };
    }
    return { name: c, label: LABEL[c], count: (data[c] || []).length, bytes, max };
  });
  const totalBytes = per.reduce((a, p) => a + p.bytes, 0);
  const biggest = per.reduce((m, p) => (p.max.bytes > m.bytes ? { ...p.max, koleksi: p.label } : m), { bytes: 0, label: "-", koleksi: "-" });
  return { per, totalBytes, totalDocs: per.reduce((a, p) => a + p.count, 0), biggest };
}
