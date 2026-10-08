# SPP Omah Bocil (PWA) — Panduan Pemasangan

Aplikasi web yang bisa dipasang di HP, memakai **GitHub Pages** (hosting + domain gratis `username.github.io`)
dan **Firebase** (Firestore = database, Authentication = login). Semua langkah di bawah dilakukan lewat browser.

Yang dibutuhkan: akun Google, akun GitHub, dan folder ini sudah diekstrak.

---

## Bagian 1 — Siapkan Firebase

### 1.1 Buat project
1. Buka <https://console.firebase.google.com> → **Create a project** (atau Add project).
2. Beri nama, mis. `spp-omahbocil`. Google Analytics boleh dimatikan. Klik **Create project**.

### 1.2 Aktifkan Firestore (database)
1. Menu kiri **Build → Firestore Database → Create database**.
2. Pilih lokasi (mis. `asia-southeast2` Jakarta). Lokasi **tidak bisa diganti** setelah dibuat.
3. Pilih mode **Production**, lalu **Create**.

### 1.3 Aktifkan Authentication (login)
1. Menu kiri **Build → Authentication → Get started**.
2. Tab **Sign-in method** → **Email/Password** → aktifkan **Enable** → **Save**.
3. Tab **Users** → **Add user** → isi email dan password admin → **Add user**.
4. **Salin kolom "User UID"** milik akun itu (deretan huruf-angka panjang). Dipakai di langkah 1.4.

### 1.4 Pasang aturan keamanan (WAJIB)
Karena tidak ada server, **aturan inilah satu-satunya yang melindungi data siswa.**
1. **Firestore Database → tab Rules**.
2. Hapus isinya, lalu tempel isi file `firestore.rules`.
3. Ganti `GANTI_DENGAN_UID_ADMIN` dengan UID dari langkah 1.3 (tetap di dalam tanda kutip).
   Untuk lebih dari satu admin: `['UID_SATU', 'UID_DUA']`.
4. Klik **Publish**.

> Jangan pernah memakai "test mode" atau aturan `allow read, write: if true`. Itu membuka datamu untuk siapa pun.

### 1.5 Ambil konfigurasi web
1. Klik ikon gerigi ⚙ → **Project settings → General**.
2. Gulir ke **Your apps** → klik ikon web **`</>`** → beri nama app → **Register app**.
3. Salin isi `firebaseConfig` yang ditampilkan.
4. Buka file **`config.js`** di folder ini (dengan Notepad), lalu ganti nilai yang berawalan `ISI_` dengan nilai dari Firebase. Simpan.

> Isi `config.js` bukan rahasia dan memang tampil di browser. Yang rahasia adalah password admin.

---

## Bagian 2 — Upload ke GitHub (drag & drop)

1. Login di <https://github.com> → **+ → New repository**.
2. **Repository name**: mis. `spp-omahbocil`. Pilih **Public**. Jangan centang "Add a README". Klik **Create repository**.
   - Repo public aman karena tidak berisi data: data siswa ada di Firestore dan dikunci oleh aturan di 1.4.
   - GitHub Pages untuk repo private mungkin butuh paket berbayar; cek kebijakan terbaru GitHub.
3. Di halaman repo yang kosong, klik link **uploading an existing file**.
4. Buka folder proyek sampai terlihat `index.html`, tekan **Ctrl+A**, lalu **drag semua file dan folder** ke kotak upload.
   File `index.html` harus berada di **paling luar** repo, bukan di dalam sub-folder.
5. Tunggu sampai semua selesai, isi pesan commit (mis. `Upload awal`), klik **Commit changes**.

## Bagian 3 — Aktifkan GitHub Pages

1. Di repo: **Settings → Pages**.
2. **Source**: *Deploy from a branch*. **Branch**: `main`, folder `/ (root)`. Klik **Save**.
3. Tunggu 1–2 menit, lalu muat ulang halaman Settings → Pages. Alamat aplikasi muncul, bentuknya
   `https://USERNAME.github.io/spp-omahbocil/`.
4. Buka alamat itu dan login dengan email dan password dari 1.3.

Kalau muncul error `auth/unauthorized-domain`: Firebase Console → **Authentication → Settings → Authorized domains → Add domain** → isi `USERNAME.github.io`.

---

## Bagian 4 — Pasang di HP

- **Android (Chrome)**: buka alamatnya → menu ⋮ → **Install app** / **Add to Home screen** (atau tombol **Pasang di HP** di menu aplikasi).
- **iPhone (Safari)**: buka alamatnya → tombol Bagikan → **Add to Home Screen**.

## Bagian 5 — Cara kerja offline

- Setelah dibuka **sekali saat online** (lalu dibuka ulang sekali), aplikasi bisa dibuka tanpa internet.
- Saat offline kamu tetap bisa melihat data dan input pembayaran. Chip di pojok atas menunjukkan **Offline** / **Menyinkronkan…**.
  Begitu internet kembali, data terkirim otomatis.
- **Login pertama kali** dan **Ganti Password** butuh internet.
- Kalau dua perangkat mengubah data yang sama saat offline, perubahan yang terkirim terakhir yang berlaku.

## Bagian 6 — Memperbarui aplikasi di kemudian hari

1. Di repo GitHub: **Add file → Upload files**, drag file yang berubah (nama sama akan ditimpa), **Commit changes**.
2. Setelah itu buka aplikasi saat online; versi baru dimuat otomatis (kadang perlu ditutup dan dibuka sekali lagi).
3. Kalau kamu **menambah atau mengganti nama file** `.js`/`.css`, tambahkan juga ke daftar `SHELL` di `sw.js` dan naikkan `VERSION` (mis. `spp-v2`).

Ubah data kop surat/kartu (alamat, telepon, CP) di `js/util.js` bagian `BIMBEL_INFO`.

---

## Catatan keamanan

- Simpan password admin dengan baik; ganti lewat menu **Ganti Password**.
- UID di `firestore.rules` yang menentukan siapa boleh mengakses data. Orang lain yang mendaftar akun Firebase lewat API
  tetap **tidak bisa** membaca atau menulis, karena UID-nya tidak ada di daftar.
- Opsional: batasi API key di Google Cloud Console → APIs & Services → Credentials → pilih "Browser key" →
  *Website restrictions* → `https://USERNAME.github.io/*`.
- Foto siswa disimpan di dokumen Firestore dalam ukuran kecil (maks. sisi 320 px).

## Mengatasi masalah

| Gejala | Penyebab / solusi |
|---|---|
| Layar "Konfigurasi Firebase belum diisi" | `config.js` belum diisi (langkah 1.5), atau belum di-upload ulang ke GitHub. |
| Login berhasil tapi muncul "Akses ke database ditolak" | UID di `firestore.rules` salah atau belum di-Publish (langkah 1.4). |
| "Email atau password salah" | Pastikan akun sudah dibuat di Authentication → Users (langkah 1.3). |
| Halaman kosong di alamat github.io | Pages belum aktif (Bagian 3) atau `index.html` ada di dalam sub-folder. |
| Tampilan lama setelah update | Tutup aplikasi sepenuhnya lalu buka lagi (online); atau naikkan `VERSION` di `sw.js`. |

## Isi folder

```
index.html           halaman utama
config.js            konfigurasi Firebase (diisi sendiri)
firestore.rules      aturan keamanan database (dipasang di Firebase Console)
manifest.json        data PWA (nama, ikon, warna)
sw.js                service worker (offline)
css/app.css          tampilan (termasuk gaya cetak A6/A4)
js/                  kode aplikasi (main, store, logic, views/)
assets/              logo dan ikon
```
