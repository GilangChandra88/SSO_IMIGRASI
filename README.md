# Imigrasi Super Web

Portal internal Kantor Imigrasi dengan satu pintu masuk (SSO) ke beberapa aplikasi: **e-Persuratan & Keuangan** (surat, LPJ, MAK), **Inventory Umum**, dan **Kepegawaian**.

React 19 + Vite + Tailwind CSS 4 + React Router, dengan Firebase (Authentication dan Firestore) sebagai backend.

> Repo ini dikerjakan bersama beberapa orang, masing-masing dengan Claude Code di akunnya sendiri.
> Baca [`CLAUDE.md`](CLAUDE.md) (aturan kerja) dan [`CONTRIBUTING.md`](CONTRIBUTING.md) (alur tim) sebelum mulai.

## Prasyarat

- **Node.js** `^20.19.0` atau `>=22.12.0` (`node -v`). Tersedia `.nvmrc` (berisi `22`) untuk `nvm use`.
- **Git** dan akun GitHub yang sudah **diundang oleh pemilik repo** (minta undangan bila belum ada).
- Nilai `.env` dan **akun uji** Firebase dari pemilik proyek (lihat bagian "Firebase: lingkungan pengembangan bersama").

## Menjalankan proyek

```bash
npm install
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
# isi nilai di .env (minta ke pemilik proyek, lihat bagian Firebase di bawah), lalu:
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

## Firebase: lingkungan pengembangan bersama

Aplikasi ini memakai Firebase sebagai "server": Firestore untuk data dan Authentication untuk login. Saat ini hanya ada **satu proyek Firebase** (`imigrasi-database`, database `imigrasi`). Statusnya **lingkungan pengembangan**: isinya hanya **data uji** dan aplikasi masih dalam pengembangan. Semua anggota tim memakai proyek yang sama.

Karena datanya dipakai bersama:

- **Masukkan hanya data uji yang jelas palsu.** Jangan pernah memasukkan data asli pegawai/pemohon (NIP, alamat, telepon, dokumen).
- Anggota lain bisa mengubah atau menghapus data yang Anda buat, dan sebaliknya. Beri data uji Anda awalan yang mudah dikenali (mis. `[Budi] LPJ uji`) dan **jangan menghapus data yang bukan Anda buat**.
- Hindari menguji fitur yang mengubah atau menghapus data secara massal.

### Memulai (anggota baru)

Minta ke pemilik proyek, lewat jalur pribadi (jangan lewat chat grup publik, Issue, atau PR):

1. Nilai `VITE_FIREBASE_*` untuk `.env`.
2. Satu **akun uji** (e-mail dan password) untuk login.

Lalu ikuti langkah "Menjalankan proyek" di atas. Setelah login, buka Console browser (F12). Bila muncul **"The query requires an index"**, klik tautan di pesan itu untuk membuat indeks (cukup sekali untuk semua anggota, karena proyeknya sama). Bila muncul `permission-denied`, kabari pemilik proyek.

### Untuk pemilik proyek: menambah anggota baru

1. Firebase Console → **Authentication → Users → Add user**. Pakai e-mail palsu, mis. `budi@contoh.test`, dan password sementara.
2. Firestore (database `imigrasi`) → koleksi `pegawai` → **Add document** dengan field: `email` (**huruf kecil, sama persis dengan akun di Authentication**), `nama`, `nip` (dummy), dan `role`. Nilai `role` harus persis `Pegawai`, `Admin`, atau `Super Admin` (huruf besar di awal, ada spasi di `Super Admin`; penulisan lain diam-diam dianggap bukan admin). Beri `Super Admin` hanya bila perlu menguji MAK Setup.

Catatan tentang alur LPJ: dokumen berikutnya dibuka kuncinya di **dua tempat**, yaitu Cloud Function `onSuratItemUpdated` di `functions/` dan cadangan di klien (`PackDetail.jsx`, `handleStatusChange`). Tanpa men-deploy Cloud Function (butuh paket berbayar Blaze), pembukaan kunci tetap berjalan lewat klien, tetapi beberapa field progres tambahan (`stuck_items`, `age_days`, dst.) tidak terisi.

### Sebelum dipakai staf sungguhan (pemilik proyek)

Belum ada pemisahan antara pengembangan dan produksi. Sebelum staf mulai memakai aplikasi ini:

1. Buat proyek Firebase **produksi terpisah**; proyek yang sekarang tetap menjadi pengembangan.
2. Pasang aturan Firestore (`firestore.rules` belum ada di repo) dan tutup celah pengecekan peran di Kepegawaian dan Inventory (lihat [`CLAUDE.md`](CLAUDE.md) bagian 9).
3. Isi `VITE_FIREBASE_*` di hosting dengan nilai proyek produksi.

<details>
<summary>Membuat proyek atau database Firebase baru (untuk produksi, atau untuk memisahkan data uji)</summary>

- Proyek baru: [console.firebase.google.com](https://console.firebase.google.com) → **Add project**, lalu **Build → Authentication → Sign-in method → Email/Password → Enable**.
- **Build → Firestore Database → Create database**: isi **Database ID** dengan `imigrasi` (sama dengan Cloud Function) dan biarkan `VITE_FIREBASE_DATABASE_ID=imigrasi`. Memakai `(default)` masih bisa (`VITE_FIREBASE_DATABASE_ID=(default)`), tetapi tidak sama dengan proyek yang ada.
- Untuk proyek latihan, pilih **Start in test mode**. Test mode kedaluwarsa dalam **30 hari**; setelah itu semua baca/tulis ditolak sampai aturan di tab **Rules** diperbarui. Jangan pilih _production mode_ tanpa `firestore.rules`: semua akses ditolak dan halaman tampak "memuat terus" atau kosong tanpa pesan yang jelas.
- Alternatif tanpa proyek baru: **Firestore → Add database** di proyek yang sama (mis. ID `imigrasi-dev`), lalu ubah `VITE_FIREBASE_DATABASE_ID` di `.env`. Data terpisah, akun login tetap sama.
- **Project settings → General → Your apps → Add app (Web)** untuk mendapat nilai `firebaseConfig`.

</details>

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

- **Frontend.** `vercel.json` (rewrite ke `index.html` untuk SPA) dan `firebase.json` sama-sama ada; tanyakan ke pemilik proyek target yang dipakai. **Wajib:** isi variabel lingkungan `VITE_FIREBASE_*` (sama seperti `.env.example`; saat ini nilainya sama dengan proyek pengembangan, setelah proyek produksi terpisah dibuat isi dengan nilainya) di pengaturan hosting (Vercel: Project Settings → Environment Variables) **sebelum** build. Vite menanamkan nilainya saat build; tanpa itu situs hasil deploy menjadi halaman putih.
- **Cloud Functions.** `cd functions`, `npm install`, lalu `firebase deploy --only functions`.
- **Firestore.** `firebase.json` merujuk `firestore.rules` yang **belum ada** di repo dan blok `firestore`-nya tidak menyebut database bernama `imigrasi`, sehingga `firebase deploy --only firestore` menarget database `(default)`. Jangan men-deploy Firestore sebelum diperbaiki oleh pemilik proyek.
