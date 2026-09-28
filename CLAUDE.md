# CLAUDE.md — Imigrasi Super Web

Aturan kerja untuk semua anggota tim dan untuk Claude Code di akun masing-masing. Baca seluruhnya sebelum mengubah kode.

> Bagian "Alur bisnis" disusun dari **kode** dan `docs/analisis_fase_2.md` (dokumen perencanaan awal, sebagian sudah dikerjakan), bukan dari dokumen resmi.
> Istilah bertanda (?) belum dikonfirmasi pemilik proyek. Koreksi lewat Pull Request bila ada yang keliru.

## 1. Ringkasan proyek

Portal internal Kantor Imigrasi (Singaraja / Buleleng) dengan satu pintu masuk (SSO) ke beberapa aplikasi:

| Aplikasi                | Folder                     | Isi                                                  |
| ----------------------- | -------------------------- | ---------------------------------------------------- |
| SSO                     | `src/modules/sso`          | Login dan Portal (kartu menuju aplikasi lain)        |
| e-Persuratan & Keuangan | `src/modules/e-persuratan` | Persuratan, Nomor Surat, LPJ, MAK. Aplikasi utama    |
| Inventory Umum          | `src/modules/inventory`    | Stok barang dan transaksi                            |
| Kepegawaian             | `src/modules/kepegawaian`  | Data pegawai, pembuatan akun, master pangkat/jabatan |

Backend: Firebase (Authentication e-mail/password + Firestore dengan database bernama `imigrasi`) dan dua Cloud Function di `functions/` (`onSuratItemUpdated` untuk progres dan buka-kunci; `onPackCreated` baru mencatat log).
URL: `/login`, `/` (Portal), `/e-persuratan/*`, `/inventory/*`, `/kepegawaian/*`.

## 2. Alur bisnis LPJ

**LPJ (Laporan Pertanggungjawaban)** = satu **paket (pack)** dokumen keuangan untuk satu kegiatan. Ada dua jenis: **Perjalanan Dinas** dan **Non-Perjalanan Dinas**. Definisi paket ada di `src/modules/e-persuratan/lpj/data/packTemplates.js`; definisi tiap surat di `src/data/surat/*/definition.js` (14 definisi, 13 terdaftar di `src/data/surat/index.js`; `SuratKeteranganTinggal` belum didaftarkan).

**Perjalanan Dinas** (4 fase):

1. **Surat Perintah (SP)**
2. **Surat Perjalanan Dinas (SPD)** — dibuat satu per pegawai saat form SP disimpan (`syncSPDItems` di `lpj/hooks/useLPJ.js`)
3. **SPBY (Form Hub)** — isian keuangan diisi **sekali**, lalu mengalir ke 7 dokumen: Nota Dinas, Surat Perintah Bayar (SPB), Rincian SPBy, Rincian Perjalanan Tugas, SPTJM Pelaksana, Nominatif, Kwitansi
4. **Penutup dan arsip**: Lembar Verifikasi (cover), Laporan, Lampiran

**Non-Perjalanan Dinas**: SPB → Nota Dinas, SPTJM Pihak Ketiga, Kwitansi → Lembar Verifikasi dan Lampiran.

**Aturan alur:**

- Fase hanya pengelompokan tampilan. Keterkaitan sebenarnya lewat `depends_on` per dokumen (`surat_item`): dokumen **terkunci** (`is_blocked`) sampai semua dependensinya `completed`. Contoh: Lampiran tanpa dependensi; Laporan menunggu SPBY; Lembar Verifikasi menunggu Nota Dinas + SPB + Rincian SPBy.
- Status dokumen: `not_started`, `in_progress`, `completed`. `not_required` ada di model tetapi belum ada fitur yang menetapkannya dan belum diperhitungkan buka-kunci/progres. Tombol fase bisa langsung memindahkan `not_started` ke `completed`.
- **Logika buka-kunci dan progres berjalan di dua tempat** (terduplikasi): Cloud Function `onSuratItemUpdated` (`functions/index.js`) dan cadangan di klien (`lpj/pages/PackDetail.jsx`, `handleStatusChange`). Ubah keduanya bersamaan. Klien hanya menulis `progress.total/completed/percentage`; function menulis field progres tambahan (`in_progress`, `not_started`, `stuck_items`, `age_days`).
- Penugasan (`assigned_to`): item bertipe `admin` dan `bendahara` otomatis ke **pembuat paket** (`bendahara` bukan peran akun). Item `per_pegawai`: hanya SPD yang dipecah per pegawai; SPTJM Pelaksana ditandai `per_pegawai` di template tetapi saat ini dibuat **satu item per paket** dengan `assigned_to` kosong (?). Akibatnya SPD/SPTJM tidak muncul di Dashboard siapa pun (Dashboard hanya menampilkan item dengan `assigned_to` = pengguna login dan tidak terkunci).
- Dokumen PDF dirender di `src/components/SuratPreview/SuratPreviewCanvas.jsx` (`@react-pdf/renderer`). Template PDF baru ada untuk 9 dari 13 surat terdaftar; SPBY (form saja), Lembar Verifikasi, Laporan, dan Lampiran belum punya.

**Data pendukung:**

- **MAK** (Mata Anggaran Kegiatan (?), kode pembebanan anggaran): pohon `Tahun > Program > Kegiatan > KRO > Output > Komponen > Sub Komponen > Akun > Item` dengan pagu. Diatur di MAK Setup; riwayat pemakaian di History MAK (koleksi `MAK`, `MAK_History`).
- **Nomor Surat**: pohon kode `KOP > Kode surat 1 > 2 > 3` di koleksi bernama **`nomor surat kanim`** (memakai spasi); penghitung nomor di dokumen `settings/nomor_surat` (`lastNumber`); riwayat di `surat_dokumen` dan `surat_perintah`. Koleksi `counters` dipakai untuk ID paket LPJ (`LPJ-TAHUN-BULAN-NNNN`).
- **Peran pengguna** (nilai persis, peka huruf besar/kecil): `Pegawai`, `Admin`, `Super Admin`. Dibaca dari dokumen `pegawai` (dicari lewat e-mail) di `src/context/AuthContext.jsx`.

**Istilah:** SPD = Surat Perjalanan Dinas · SPBy = Surat Permintaan Bayar · SPB = Surat Perintah Bayar · SPTJM = Surat Pernyataan Tanggung Jawab Mutlak · PPK = Pejabat Pembuat Komitmen · KRO = Klasifikasi Rincian Output (?) · Kanim = Kantor Imigrasi.

## 3. Library yang boleh dipakai

Hanya ini. **Dilarang menambah library baru (dependencies maupun devDependencies) tanpa persetujuan pemilik proyek.** Bila merasa perlu, jelaskan alasannya di Issue/PR dan tunggu persetujuan.

- **Runtime:** `react`, `react-dom`, `react-router-dom`, `react-icons` (hanya `react-icons/fa`), `firebase`, `@react-pdf/renderer`
- **Styling:** `tailwindcss`, `@tailwindcss/postcss`, `postcss`, `autoprefixer`
- **Build:** `vite`, `@vitejs/plugin-react`
- **Kualitas kode:** `eslint`, `@eslint/js`, `globals`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `eslint-config-prettier`, `prettier`
- **Tipe untuk editor:** `@types/react`, `@types/react-dom` (tidak ada TypeScript di proyek ini)
- `functions/` adalah paket terpisah dengan dependensi sendiri (`firebase-admin`, `firebase-functions`); jangan diubah tanpa persetujuan.

Gunakan API bawaan browser/JavaScript untuk kebutuhan kecil (tanggal, format angka, dll.) sebelum berpikir menambah library.

## 4. Struktur folder dan batas modul

```
src/
  main.jsx  App.jsx         router utama
  modules/
    sso/                    Login, Portal
    e-persuratan/
      dashboard/            Dashboard tugas LPJ
      lpj/                  daftar/detail/buat LPJ, useLPJ, packTemplates
      surat-keluar/         Persuratan (kartu, alur, form), Nomor Surat Kanim
      data-master/          MAK Setup, History MAK
      AppModule.jsx         rute + menu aplikasi e-Persuratan
    inventory/              Stok Barang, Transaksi
    kepegawaian/            Pegawai
  components/               komponen BERSAMA (Sidebar, SuratPreview, View*)
  layouts/                  AppLayout
  data/surat/               definisi jenis surat + registry
  utils/  config/  context/ helper, firebase, AuthContext
docs/                       dokumen analisis
functions/                  Cloud Functions (paket Node terpisah)
```

Struktur di dalam modul **dianjurkan** (`pages/`, `components/` khusus modul, `hooks/`, `data/`, `index.js` sebagai API publik); buat subfolder sesuai kebutuhan. Aplikasi memakai `AppModule.jsx` untuk rute dan menu.

**Aturan:**

1. **Kerjakan hanya di folder modul yang ditugaskan kepada Anda** (lihat `CONTRIBUTING.md`). Jangan mengedit modul lain. Jika perubahan di modul lain diperlukan, minta pemilik modul itu atau buka Issue.
2. Modul **tidak boleh saling mengimpor**, kecuali di dalam `e-persuratan` dan hanya lewat `index.js`: `dashboard → lpj` dan `surat-keluar → lpj`. ESLint (`no-restricted-imports`) menangkap pelanggaran, baik impor beralias (`@/modules/...`) maupun relatif (`../../lpj/...`), jadi `npm run lint` gagal bila dilanggar.
3. Kode yang dipakai lebih dari satu modul ditaruh di `src/components`, `src/utils`, `src/data`, dst. (wajib disebut di PR, lihat bagian 6).
4. Impor lintas folder memakai alias `@/` (mis. `@/config/firebase`). Di dalam satu modul boleh relatif.
5. Jangan mengubah `functions/`, `firebase.json`, `firestore.indexes.json`, `vercel.json` tanpa persetujuan.

## 5. Konvensi kode

- **Function component + hooks.** Tanpa class component (kecuali error boundary di `main.jsx`).
- **Nama file komponen PascalCase** (`PackDetail.jsx`). Hook `useNamaHook.js`, helper `camelCase.js`. Satu komponen utama per file.
- **Styling hanya dengan Tailwind CSS.** Jangan menambah CSS manual, `style={{}}`, atau `<style>` baru. Pengecualian: komponen `@react-pdf/renderer` memakai `StyleSheet` karena PDF tidak mendukung Tailwind.
- **Warna utama navy**: `#1e293b` (Tailwind `slate-800`) untuk sidebar dan kartu utama, aksen biru (`blue-600`). Mode gelap memakai varian `dark:`. Aplikasi Kepegawaian memakai aksen amber (`APP_ACCENTS` di `src/utils/appAccents.js`).
- **Teks antarmuka dalam Bahasa Indonesia** (label, tombol, pesan error, placeholder). Nama variabel/fungsi boleh Indonesia atau Inggris, ikuti file sekitarnya.
- Komponen baru harus responsif (mobile dan desktop) dan mendukung mode gelap.
- Jangan menambah `console.log` ke kode yang di-commit.
- Format ditangani Prettier. Format hanya file yang Anda ubah (`npx prettier --write <file>`); `npm run format` memformat seluruh proyek.
- Placeholder di preview PDF memakai tanda kurung siku (mis. `[NAMA PPK]`, `[Nama Pejabat]`); bentuknya belum seragam.

## 6. Aturan Git

- **Jangan commit atau push langsung ke `main`.** Kerjakan di branch, lalu buka Pull Request.
- Nama branch: `fitur/nama-fitur` atau `perbaikan/nama-bug` (huruf kecil, pisah dengan `-`).
- **Jalankan `npm run lint` sebelum commit** (harus 0 error) dan `npm run build` sebelum membuka PR.
- Pesan commit: `<jenis>(<modul>): <ringkasan>`, jenis = `fitur` | `perbaikan` | `gaya` | `refaktor` | `dokumen` | `chore`. Contoh: `perbaikan(lpj): angka progres tidak ter-update`.
- **Perubahan pada kode bersama dan `CLAUDE.md` wajib disebutkan di deskripsi Pull Request**: `src/components/`, `src/layouts/`, `src/utils/`, `src/config/`, `src/context/`, `src/data/`, `src/App.jsx`, `AppModule.jsx` e-Persuratan, `package.json`, konfigurasi, dan `CLAUDE.md`. Perubahan itu memengaruhi semua modul dan semua anggota tim.
- Jangan `git push --force`, `git reset --hard`, atau menghapus branch orang lain.

## 7. Aturan keamanan

- **Dilarang** menaruh data asli pegawai/pemohon (nama, NIP, alamat, telepon, e-mail pribadi, dokumen), **password**, atau **API key/secret** di kode, komentar, contoh, atau commit.
- Gunakan **data dummy yang jelas palsu** (mis. `Budi Contoh`, NIP `000000000000000000`).
- Konfigurasi rahasia hanya lewat **file `.env`** (tidak di-commit; contoh nilai di `.env.example`). Variabel Vite harus berawalan `VITE_`.
- **Jalankan aplikasi lokal terhadap proyek Firebase DEV/latihan, bukan proyek produksi** (lihat README).
- Jangan menempelkan isi `.env`, token, atau data produksi ke chat/Issue/PR. Jika kredensial tidak sengaja ter-commit, laporkan segera ke pemilik proyek agar diganti (menghapus commit saja tidak cukup).

## 8. Perintah

```bash
npm install          # pasang dependensi
npm run dev          # jalankan lokal (http://localhost:5173)
npm run lint         # ESLint, harus 0 error sebelum commit
npm run build        # build produksi ke dist/
```

Node `^20.19.0 || >=22.12.0` (lihat `engines` di `package.json`; `.nvmrc` memakai 22). Cloud Functions memakai Node 20 (`functions/package.json`).

## 9. Utang teknis yang sudah diketahui (jangan dianggap bug baru)

**Keamanan (prioritas tinggi):**

- **Kepegawaian dan Inventory tidak punya pengecekan peran sama sekali.** Siapa pun yang login bisa membuka `/kepegawaian`, membuat akun, dan mengubah `role` pegawai (termasuk ke `Super Admin`), kecuali dicegah aturan Firestore. Pengecekan peran hanya ada di e-Persuratan (`ProtectedRoute`, sisi klien saja).
- **`firestore.rules` belum ada** di repo padahal dirujuk `firebase.json`. Keamanan data bergantung pada rules di Firebase Console.
- E-mail Super Admin ditulis langsung di `src/context/AuthContext.jsx`. Pembuatan akun pegawai dilakukan dari klien (`secondaryAuth` di `kepegawaian/pages/Pegawai.jsx`).

**Alur dan data:**

- Logika buka-kunci/progres terduplikasi (Cloud Function dan `PackDetail.jsx`); lihat bagian 2. Cloud Function hanya jalan bila di-deploy (butuh paket berbayar Blaze).
- Nama database `imigrasi` ditulis mati di `functions/index.js`. `firebase.json` tidak menyebut database itu, sehingga `firebase deploy --only firestore` menarget `(default)`; indeks kueri `inventory_transaksi` (`barangId` + `createdAt`) belum ada di `firestore.indexes.json`.
- Pratinjau SPTJM: `SuratPreviewCanvas` menerima `{ surat, formData }` saja, sehingga `packItem` yang dikirim modal diabaikan.
- Panel "Perlu Dilengkapi" dan "Aktivitas Terbaru" di Dashboard berisi **data contoh** (bukan dari Firestore).
- Teks DIPA ditulis mati dan berbeda di dua tempat: "Nomor SP DIPA-137.03.2.92951/202… tanggal 01 Desember 2025" di template PDF (`SuratPreviewCanvas.jsx`) dan string DIPA tahun 2026 di `SuratForm.jsx`.
- Hook `useLPJ` menelan error (mis. indeks belum siap) dan mengembalikan daftar kosong tanpa pesan.

**Lain-lain:**

- Tidak ada route 404/catch-all: URL yang tidak dikenal menampilkan halaman kosong.
- Bila `.env` kosong, `src/config/firebase.js` melempar error sebelum React dimuat sehingga yang tampak halaman putih (pesan hanya di Console).
- Kelas `custom-scrollbar` dan `no-scrollbar` dipakai di banyak file tetapi tidak didefinisikan di CSS mana pun (tidak berefek).
- `npm run lint` masih menampilkan ±80 peringatan (variabel tak terpakai, dependensi `useEffect`). Boleh dibersihkan bertahap di modul Anda sendiri.
- Ukuran bundel JS besar (±2,4 MB); belum ada code-splitting.

## 10. Untuk Claude Code

- Di awal sesi, pastikan Anda tahu modul yang ditugaskan kepada pengguna. Jika belum jelas, **tanyakan dulu**.
- Ubah file hanya di modul itu. Untuk kode bersama, `CLAUDE.md`, `package.json`, atau konfigurasi: minta konfirmasi pengguna dan ingatkan agar dicatat di PR.
- Jangan menambah library, jangan menaruh rahasia atau data asli, jangan commit ke `main`.
- Sebelum menyatakan selesai: `npm run lint` dan `npm run build` harus lolos.
- Jangan mengubah tampilan atau perilaku di luar yang diminta.
