# Imigrasi Super Webb

Portal internal Kantor Imigrasi dengan satu pintu masuk (SSO) ke beberapa aplikasi: **e-Persuratan & Keuangan** (surat, LPJ, MAK), **Inventory Umum**, dan **Kepegawaian**.

React 19 + Vite + Tailwind CSS 4 + React Router, dengan Firebase (Authentication dan Firestore) sebagai backend.

> Repo ini dikerjakan bersama beberapa orang, masing-masing dengan Claude Code di akunnya sendiri.
> Baca [`CLAUDE.md`](CLAUDE.md) (aturan kerja) dan [`CONTRIBUTING.md`](CONTRIBUTING.md) (alur tim) sebelum mulai.

## Prasyarat

- **Node.js** `^20.19.0` atau `>=22.12.0` (`node -v`). Tersedia `.nvmrc` (berisi `22`) untuk `nvm use`.
- **Git** dan akun GitHub yang sudah **diundang oleh pemilik repo** (minta undangan bila belum ada).
- Akses ke **proyek Firebase DEV** (lihat bagian "Menyiapkan Firebase DEV").

## Menjalankan proyek

```bash
npm install
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
# isi nilai di .env (lihat bagian berikutnya), lalu:
npm run dev
```

Buka http://localhost:5173.

Jika halaman **putih kosong**, hampir pasti `.env` belum dibuat atau masih kosong. Buka Console browser (F12) untuk melihat pesan "Konfigurasi Firebase belum diisi". Setelah mengubah `.env`, **hentikan lalu jalankan ulang** `npm run dev`. `VITE_FIREBASE_MEASUREMENT_ID` boleh kosong, sedangkan variabel lain wajib diisi.

| Perintah           | Fungsi                                   |
| ------------------ | ---------------------------------------- |
| `npm run dev`      | Jalankan lokal dengan hot reload         |
| `npm run lint`     | ESLint. **Harus 0 error** sebelum commit |
| `npm run lint:fix` | Perbaiki otomatis yang bisa diperbaiki   |
| `npm run format`   | Rapikan **seluruh** kode dengan Prettier |
| `npm run build`    | Build produksi ke `dist/`                |
| `npm run preview`  | Lihat hasil build lokal                  |

> Untuk merapikan hanya file yang Anda ubah, gunakan `npx prettier --write <file>`.
> Semua perintah di dokumen ini ditulis satu per baris supaya bisa dijalankan di Git Bash maupun PowerShell.

## Menyiapkan Firebase DEV

Aplikasi ini memakai Firebase sebagai "server": Firestore untuk data dan Authentication untuk login. **Jangan menjalankan aplikasi lokal terhadap proyek produksi** (`imigrasi-database`), karena mencoba fitur (membuat LPJ, menghapus pegawai) akan mengubah data sungguhan.

Sebagai gantinya, pemilik proyek (atau Anda sendiri) membuat **proyek Firebase terpisah untuk latihan**, berisi data dan akun palsu saja:

1. Buka [console.firebase.google.com](https://console.firebase.google.com), **Add project**, beri nama mis. `imigrasi-dev`.
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable.**
3. **Build → Firestore Database → Create database.**
   - Isi **Database ID** dengan `imigrasi` (sama dengan produksi dan Cloud Function), lalu biarkan `VITE_FIREBASE_DATABASE_ID=imigrasi` di `.env`. Memakai `(default)` masih bisa (isi `VITE_FIREBASE_DATABASE_ID=(default)`), tetapi tidak sama dengan produksi.
   - Pilih **Start in test mode** (data hanya dummy). Test mode kedaluwarsa dalam **30 hari**; setelah itu semua baca/tulis ditolak sampai Anda memperbarui aturan di tab **Rules**. Jangan pilih _production mode_: repo ini belum punya `firestore.rules`, sehingga semua akses ditolak dan halaman tampak "memuat terus" atau kosong tanpa pesan yang jelas.
4. Buat akun uji di **Authentication → Users → Add user** (e-mail palsu, mis. `admin@contoh.test`).
5. Buat dokumen di koleksi `pegawai` agar peran terbaca. Field yang dipakai: `email` (**huruf kecil, sama persis dengan akun di Authentication**), `nama`, `nip` (dummy), dan `role`. Nilai `role` harus persis salah satu dari `Pegawai`, `Admin`, atau `Super Admin` (huruf besar di awal, ada spasi di `Super Admin`; penulisan lain diam-diam dianggap bukan admin). Pakai `Super Admin` bila perlu menguji MAK Setup.
6. **Project settings → General → Your apps → Add app (Web)**, salin nilai `firebaseConfig` ke `.env`.
7. Login di aplikasi dengan akun uji, lalu buka Console browser (F12): tidak boleh ada `permission-denied`. Bila Console menampilkan **"The query requires an index"**, klik tautan di pesan itu untuk membuat indeks di proyek dev Anda (satu klik per indeks).

Catatan tentang alur LPJ: dokumen berikutnya dibuka kuncinya di **dua tempat**, yaitu Cloud Function `onSuratItemUpdated` di `functions/` dan cadangan di klien (`PackDetail.jsx`, `handleStatusChange`). Tanpa men-deploy Cloud Function (butuh paket berbayar Blaze), pembukaan kunci tetap berjalan lewat klien, tetapi beberapa field progres tambahan (`stuck_items`, `age_days`, dst.) tidak terisi.

**Jangan pernah meng-commit `.env`.** File itu sudah ada di `.gitignore`.

## Struktur proyek

```
src/
  modules/
    sso/                  Login, Portal
    e-persuratan/
      dashboard/  lpj/  surat-keluar/  data-master/
    inventory/
    kepegawaian/
  components/             komponen bersama
  layouts/  data/  utils/  config/  context/
docs/                     dokumen analisis
functions/                Cloud Functions (paket Node terpisah)
```

Setiap modul berdiri sendiri: satu orang mengerjakan satu modul tanpa menyentuh modul lain. Penjelasan lengkap dan aturan batas modul ada di [`CLAUDE.md`](CLAUDE.md).

## Mulai bekerja (anggota baru)

1. **Clone**
   ```bash
   git clone <URL-repo-github> imigrasi-super-web
   cd imigrasi-super-web
   ```
2. **Pasang dependensi dan isi `.env`** (langkah di atas), lalu `npm run dev` untuk memastikan berjalan.
3. **Buat branch** dari `main` terbaru. Jangan bekerja di `main`.
   ```bash
   git switch main
   git pull
   git switch -c fitur/nama-fitur
   ```
   (atau `perbaikan/nama-bug` untuk memperbaiki bug)
4. **Kerjakan** hanya di folder modul yang ditugaskan kepada Anda. Sering-seringlah `npm run lint`.
5. **Commit dan push** branch Anda.
   ```bash
   git add <file-yang-diubah>
   git commit -m "fitur(lpj): tambah kolom judul"
   git push -u origin fitur/nama-fitur
   ```
6. **Buka Pull Request** ke `main` di GitHub dan isi template-nya. Tunggu review, lalu merge.

Detail lengkap (pembagian modul, konflik, review) ada di [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Deploy (hanya pemilik proyek)

- **Frontend.** `vercel.json` (rewrite ke `index.html` untuk SPA) dan `firebase.json` sama-sama ada; tanyakan ke pemilik proyek target yang dipakai. **Wajib:** isi variabel lingkungan `VITE_FIREBASE_*` (sama seperti `.env.example`, nilai proyek **produksi**) di pengaturan hosting (Vercel: Project Settings → Environment Variables) **sebelum** build. Vite menanamkan nilainya saat build; tanpa itu situs hasil deploy menjadi halaman putih.
- **Cloud Functions.** `cd functions`, `npm install`, lalu `firebase deploy --only functions`.
- **Firestore.** `firebase.json` merujuk `firestore.rules` yang **belum ada** di repo dan blok `firestore`-nya tidak menyebut database bernama `imigrasi`, sehingga `firebase deploy --only firestore` menarget database `(default)`. Jangan men-deploy Firestore sebelum diperbaiki oleh pemilik proyek.
