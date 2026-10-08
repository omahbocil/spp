// Logika murni (tanpa DOM / Firebase) — dipindahkan dari app.py agar mudah diuji.
import { MONTHS, byText } from "./util.js";

export function hitungUsia(tahunLahir, now = new Date()) {
  return tahunLahir ? now.getFullYear() - Number(tahunLahir) : null;
}

/** Gabungkan siswa dengan nama/harga paket + usia, urut nama. */
export function studentsWithPackage(students, packages, now = new Date()) {
  const pk = new Map(packages.map((p) => [p.id, p]));
  return students
    .map((s) => {
      const p = s.paket_id ? pk.get(s.paket_id) : null;
      return {
        ...s,
        paket_name: p ? p.name : null,
        paket_price: p ? p.price : null,
        usia: hitungUsia(s.tahun_lahir, now),
      };
    })
    .sort(byText("nama"));
}
export const activeStudents = (list) => list.filter((s) => s.status === "Aktif");

export function findDuplicateNoAkun(students, noAkun, excludeId = null) {
  const n = String(noAkun ?? "").trim();
  return students.find((s) => (s.no_akun || "").trim() === n && s.id !== excludeId) || null;
}

/** No akun berikutnya: B001, B002, ... (akun berformat lain diabaikan). */
export function nextNoAkun(students, prefix = "B", pad = 3) {
  const re = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\d+)$`);
  let max = 0;
  for (const s of students) {
    const m = re.exec((s.no_akun || "").trim());
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return prefix + String(max + 1).padStart(pad, "0");
}

export function dashboardSummary(students, payments, today = new Date()) {
  const y = today.getFullYear(), m = today.getMonth() + 1, d = today.getDate();
  const aktif = activeStudents(students);
  const bulanIni = payments.filter((p) => p.tahun === y && p.bulan === m);
  const paid = new Set(bulanIni.map((p) => p.student_id));
  const belumBayar = aktif.filter((s) => d >= (s.jatuh_tempo || 10) && !paid.has(s.id));
  return {
    totalAktif: aktif.length,
    sudahBayar: bulanIni.length,
    belumBayar,
    totalBulanIni: bulanIni.reduce((a, p) => a + (p.jumlah || 0), 0),
    bulanNama: MONTHS[m - 1],
    tahun: y,
  };
}

export function rowsPerBulan(payments, tahun) {
  let grandTotal = 0;
  const rows = MONTHS.map((nama, i) => {
    const list = payments.filter((p) => p.tahun === tahun && p.bulan === i + 1);
    const total = list.reduce((a, p) => a + (p.jumlah || 0), 0);
    grandTotal += total;
    return { bulan: nama, jumlahBayar: list.length, total };
  });
  return { rows, grandTotal };
}

export function riwayatSiswa(payments, studentId) {
  const list = payments
    .filter((p) => p.student_id === studentId)
    .sort((a, b) => a.tahun - b.tahun || a.bulan - b.bulan)
    .map((p) => ({ bulan: MONTHS[p.bulan - 1], tahun: p.tahun, jumlah: p.jumlah,
      tgl_bayar: p.tgl_bayar, ttd: p.ttd, stempel: p.stempel }));
  return { list, total: list.reduce((a, p) => a + (p.jumlah || 0), 0) };
}

export function statusBulan(students, payments, bulan, tahun) {
  let lunas = 0, total = 0;
  const rows = activeStudents(students).map((s) => {
    const p = payments.find((x) => x.student_id === s.id && x.tahun === tahun && x.bulan === bulan);
    if (p) { lunas++; total += p.jumlah || 0; }
    return { no_akun: s.no_akun, nama: s.nama, jumlah: p ? p.jumlah : null,
      tgl_bayar: p ? p.tgl_bayar : null, status: p ? "Lunas" : "Belum" };
  });
  return { rows, lunas, total };
}

/** 12 baris kartu SPP seorang siswa pada satu tahun. */
export function kartuTahun(payments, studentId, tahun) {
  const byMonth = new Map(
    payments.filter((p) => p.student_id === studentId && p.tahun === tahun).map((p) => [p.bulan, p]));
  return MONTHS.map((bulan, i) => ({ no: i + 1, bulan, payment: byMonth.get(i + 1) || null }));
}

export function yearsList(payments, thisYear) {
  const s = new Set(payments.map((p) => p.tahun));
  s.add(thisYear);
  return [...s].sort((a, b) => a - b);
}

const csvCell = (v) => {
  const t = String(v ?? "");
  return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};
/** CSV pembayaran (hanya pembayaran milik siswa yang masih ada), dengan BOM agar Excel membaca UTF-8. */
export function paymentsCSV(students, payments) {
  const st = new Map(students.map((s) => [s.id, s]));
  const lines = [["No Akun", "Nama Siswa", "Bulan", "Tahun", "Jumlah Iuran", "Tanggal Bayar", "TTD", "Stempel"]];
  payments
    .filter((p) => st.has(p.student_id))
    .sort((a, b) => a.tahun - b.tahun || a.bulan - b.bulan)
    .forEach((p) => {
      const s = st.get(p.student_id);
      lines.push([s.no_akun, s.nama, MONTHS[p.bulan - 1] || "", p.tahun, p.jumlah, p.tgl_bayar || "", p.ttd || "", p.stempel || ""]);
    });
  return "\uFEFF" + lines.map((r) => r.map(csvCell).join(",")).join("\r\n");
}

/** Total SPP & jumlah siswa (unik) yang membayar, per tahun. Hanya pembayaran siswa yang masih ada. */
export function rowsPerTahun(students, payments, tahunList) {
  const ids = new Set(students.map((s) => s.id));
  return tahunList.map((tahun) => {
    const list = payments.filter((p) => p.tahun === tahun && ids.has(p.student_id));
    return { tahun, jumlahSiswa: new Set(list.map((p) => p.student_id)).size,
      total: list.reduce((a, p) => a + (p.jumlah || 0), 0) };
  });
}
