// Riwayat perubahan aplikasi (menu Riwayat). Tambahkan entri baru di urutan paling atas setiap ada update.
export const CHANGELOG = [
  {
    tanggal: "2026-10-08",
    judul: "Pindah ke aplikasi PWA + database Firestore",
    detail: [
      "Aplikasi bisa dipasang di layar HP (Add to Home Screen) dan dibuka seperti aplikasi biasa.",
      "Data kini disimpan di Google Firestore, tersinkron otomatis di semua perangkat.",
      "Bisa dibuka dan diinput saat internet putus; data terkirim otomatis begitu online lagi.",
      "Login memakai email dan password (Firebase Authentication).",
      "Foto siswa diperkecil otomatis dan disimpan bersama data siswa.",
    ],
  },
  {
    tanggal: "2026-10-03",
    judul: "Cetak Kartu SPP otomatis ukuran kertas A6",
    detail: [
      "Menu Cetak SPP kini mencetak kartu pada kertas A6 (105 x 148 mm), 1 kartu = 1 halaman.",
      "Tata letak kartu dipadatkan khusus saat dicetak; tampilan di layar tidak berubah.",
    ],
  },
  {
    tanggal: "2026-10-03",
    judul: "Menu sidebar kiri, zoom foto siswa, dan penyesuaian deploy",
    detail: [
      "Menu navigasi kini tampil sebagai sidebar di sisi kiri (di HP berupa slide yang dibuka lewat tombol ☰).",
      "Foto siswa otomatis diperbesar saat kursor diarahkan ke foto (di HP: ketuk foto).",
    ],
  },
  {
    tanggal: "2026-09-26",
    judul: "No akun otomatis, data siswa lebih lengkap, cetak laporan & kartu SPP",
    detail: [
      "No Akun siswa baru terisi otomatis (format B001, B002, dst).",
      "Format tanggal Mulai/Akhir jadi dd-mm-yyyy.",
      "Form siswa tambah Asal Sekolah, Kelas, Tahun Lahir; Usia dihitung otomatis.",
      "Tombol Cetak ditambahkan di 3 jenis Laporan (per Tahun, per Siswa, per Bulan).",
      "Menu baru: Cetak SPP — cetak kartu SPP per siswa sesuai desain resmi, lengkap dengan foto siswa.",
    ],
  },
  {
    tanggal: "2026-09-26",
    judul: "Foto siswa, edit/hapus pembayaran, tampilan mobile, riwayat update",
    detail: [
      "Form data siswa kini bisa unggah foto siswa.",
      "Kartu SPP bulanan kini punya tombol Edit dan Hapus per baris pembayaran.",
      "Tampilan dirapikan agar lebih nyaman dibuka dari HP.",
      "Menu Riwayat ditambahkan untuk mencatat histori pembaruan aplikasi.",
    ],
  },
  {
    tanggal: "2026-09-26",
    judul: "Login admin & penerima iuran SPP",
    detail: [
      "Login admin ditambahkan, seluruh halaman kini butuh login.",
      "Menu Ganti Password untuk admin.",
      "CRUD Penerima Iuran SPP, muncul sebagai saran di kolom TTD Input SPP.",
      "Logo Omah Bocil dipasang di header & favicon.",
    ],
  },
  {
    tanggal: "2026-09-25",
    judul: "Laporan per siswa & per bulan",
    detail: [
      "Laporan > atas nama siswa: riwayat pembayaran lengkap 1 siswa.",
      "Laporan > atas nama bulan: status lunas/belum semua siswa aktif di 1 bulan.",
    ],
  },
  {
    tanggal: "2026-09-25",
    judul: "Rilis awal",
    detail: [
      "Aplikasi SPP Omah Bocil pertama kali dibuat: dashboard, siswa, paket, input SPP, laporan per tahun, export CSV/JSON.",
    ],
  },
];
