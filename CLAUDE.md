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

**LPJ (Laporan Pertanggungjawaban)** = satu **berkas** dokumen keuangan untuk satu kegiatan. Ada dua jenis: **Perjalanan Dinas** dan **Non-Perjalanan Dinas**. Tampilan, perilaku responsif, dan alurnya **mengikuti purwarupa** `e-persuratan-react` (di luar repo; minta ke pemilik proyek bila perlu).

**Model data (skema 2):** satu dokumen `lpj_packs/{id}` per berkas (`skema: 2`, `jenis`, `uraian`, `status: draft|selesai`, `pegawai_uids`, `aktivitas`) berisi bagian `sp`, `spd`, `lpj`, `lap`, `selesai` (Perjadin) atau `np` (Non-Perjadin). Semua status fase dihitung dari isi dokumen oleh `lpj/utils/lpjLogic.js` (port `lpjLogic.js` purwarupa). Berkas lama berbasis `surat_items` (tanpa `skema`) tampil sebagai "Format lama" dan tidak bisa dibuka lagi.

**Perjalanan Dinas** (4 fase, terbuka berurutan; fase berikutnya terkunci sampai fase sebelumnya selesai):

1. **Surat Perintah**: menimbang, dasar (+ DIPA baku), Kepada (pegawai), Untuk (poin 1 + poin baku 2–4), pejabat penandatangan (Kepala/PLT/PLH). **Selesai** → final, lalu **TTE Srikandi**: unggah scan (opsional) + nomor surat resmi → SP selesai, nomor SPD mengikuti nomor SP.
2. **SPD**: satu form untuk semua pelaksana (seksi, maksud, alat angkut, tujuan, tanggal, MAK sampai Akun) → Selesai → cetak SPD per pelaksana.
3. **LPJ & SPBy**: tanggal LPJ + detail transaksi (pelaksana · item Akun MAK · jumlah) → pack 7 dokumen (Nota Dinas, Kwitansi, SPTJM/pelaksana, SPBy, Rincian SPBy/pelaksana, Surat Pernyataan Pengeluaran/pelaksana, Nominatif). Saat selesai, realisasi dicatat ke `MAK_History`.
4. **Laporan Kegiatan**: 5 bagian isi + foto (JPG/PNG ≤200 KB, maks. 10) → berkas `selesai`.

**Non-Perjalanan Dinas** (2 fase): **SPBy & Rincian Bayar** (tanggal, pelaksana, MAK, uraian, transaksi → SPBy, Nota Dinas, SPTJM/pelaksana, Kwitansi, Lembar Verifikasi; dicatat ke `MAK_History`) → **Lampiran** (Foto Bukti/Produk + Nota Pembayaran, maks. 10 gambar per jenis) → berkas `selesai`.

**Aturan alur:**

- "Selesai" pada sebuah fase = **final** (konfirmasi "tidak akan bisa diedit lagi"); belum ada fitur buka kunci.
- Halaman: `lpj/pages/LPJPage.jsx` → Daftar (`/e-persuratan/lpj`), Detail (`/lpj/:id`), form (`/lpj/:id?isi=sp|tte|spd|cetak-spd|lpj|laporan|np|lampiran`). Langkah form dibatasi status kunci (`bolehMasuk` di form).
- Hak akses (sisi klien): admin melihat & mengubah semua berkas; pegawai melihat berkas yang ia buat atau yang mencantumkan dirinya (`pegawai_uids`), dan mengubahnya selama belum final.
- Berkas unggahan disimpan di **Firebase Storage** `lpj/{id}/...` (`lpj/services/lpjStorage.js`, aturan di `storage.rules`); dokumen Firestore hanya menyimpan metadata (`path`, `url`, `name`, `size`).
- Dokumen PDF: `lpj/utils/dokumenLpj.js` memetakan berkas ke kunci data template di `src/components/SuratPreview/SuratPreviewCanvas.jsx`. Template ada untuk SP, SPD, Nota Dinas, Kwitansi, Nominatif, SPTJM, Rincian SPBy, dan Surat Pernyataan Pengeluaran Biaya Perjalanan Dinas (per pelaksana; format "Rincian Biaya Perjalanan Dinas" + "Perhitungan SPD Rampung", tidak didaftarkan di `SURAT_REGISTRY`, lihat `SURAT_KHUSUS_LPJ` di `dokumenLpj.js`). **SPBy** memakai template "Surat Perintah Bayar" (format kantor); untuk Perjadin, "Untuk Pembayaran" disusun otomatis dari maksud, tujuan, tanggal, nomor & tanggal SP, dan pelaksana (`uraianPembayaranPerjadin`). **Belum ada** untuk Laporan Kegiatan dan Lembar Verifikasi → pratinjau placeholder.
- Kartu **Status Pembayaran** (bukti transfer Bendahara) hanya menampilkan field `pembayaran`; belum ada cara mengisinya (sama seperti purwarupa).
- Data pegawai, pejabat, dan MAK diambil dari Firestore (`pegawai`, `MAK`); PPK dan Bendahara di PDF dari `status_khusus`. Jangan menyalin `masterData.js` purwarupa (berisi nama yang tampak asli).
- Dashboard e-Persuratan membaca berkas yang sama (`useLPJPacks` lewat `lpj/index.js`); "Aktivitas Terbaru" dari field `aktivitas` tiap berkas.
- Definisi surat ada di `src/data/surat/*/definition.js` (14 definisi, 13 terdaftar di `src/data/surat/index.js`); dipakai template PDF dan halaman Persuratan.

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
- **Warna & font mengikuti purwarupa** (halaman LPJ dan Dashboard e-Persuratan): token warna purwarupa (terang/gelap) tersedia sebagai kelas Tailwind di `lpj/ui/tokens.js` (`T`, `NAVY`, `STATUS`, `FORM`, `BTN`, `LAYOUT`) — pakai itu, jangan menulis ulang kode warna. Navy `#0f2040` untuk tombol aksi utama, gradien `from-[#0f2040] to-[#1e4080]` untuk kartu judul. Font Inter / Plus Jakarta Sans / IBM Plex Mono (dimuat di `index.html`) lewat `FONT.*`. Lebar dinamis (bilah progres) memakai `<progress>` atau atribut SVG, bukan `style`. Jangan menggabungkan dua kelas latar/warna yang bentrok (mis. `FORM.card` + `bg-...`); pilih token yang sesuai (`FORM.cardMuted`). Sidebar dan aplikasi lain masih `slate-800` (`#1e293b`). Mode gelap memakai varian `dark:`. Aplikasi Kepegawaian memakai aksen amber (`APP_ACCENTS` di `src/utils/appAccents.js`).
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
- Proyek Firebase yang ada (`imigrasi-database`) berstatus **pengembangan bersama** dan hanya berisi **data uji**. **Jangan pernah memasukkan data asli ke sana**, dan jangan menghapus atau mengubah data uji milik anggota lain (lihat README).
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
- **Belum ada pemisahan pengembangan dan produksi:** hanya satu proyek Firebase. Sebelum dipakai staf sungguhan, pemilik proyek perlu membuat proyek produksi terpisah, memasang aturan Firestore, dan menutup celah peran di atas.
- E-mail Super Admin ditulis langsung di `src/context/AuthContext.jsx`. Pembuatan akun pegawai dilakukan dari klien (`secondaryAuth` di `kepegawaian/pages/Pegawai.jsx`).

**Alur dan data:**

- **Sisa format LPJ lama:** Cloud Function `onSuratItemUpdated`/`onPackCreated` (`functions/`), `lpj/data/packTemplates.js`, `lpj/hooks/useLPJLegacy.js`, dan mode LPJ di `SuratForm.jsx` (`?packId=&itemId=`) hanya melayani berkas `surat_items` lama dan tidak dipakai alur baru. Hapus bersama bila data uji format lama sudah tidak diperlukan.
- **Firebase Storage:** `storage.rules` harus di-deploy pemilik proyek (`firebase deploy --only storage`, Storage aktif di Console); tanpa itu unggah scan TTE, foto laporan, dan lampiran ditolak. Aturan saat ini: semua pengguna login boleh membaca/menulis `lpj/**` (maks. 5 MB, gambar/PDF). Berkas yang sudah terunggah tidak ikut terhapus bila berkas LPJ dihapus langsung dari Firestore.
- Nama database `imigrasi` ditulis mati di `functions/index.js`. `firebase.json` tidak menyebut database itu, sehingga `firebase deploy --only firestore` menarget `(default)`; indeks kueri `inventory_transaksi` (`barangId` + `createdAt`) belum ada di `firestore.indexes.json`.
- Teks DIPA ditulis mati dan berbeda di beberapa tempat: "Nomor SP DIPA-137.03.2.92951/202… tanggal 01 Desember 2025" di template PDF Nota Dinas (`SuratPreviewCanvas.jsx`) dan string DIPA tahun 2026 di `SuratForm.jsx` serta `lpj/data/masterLpj.js`.
- Template PDF Surat Perintah selalu mencetak jabatan "Kepala Kantor…" walaupun pejabat yang dipilih PLT/PLH.

**Lain-lain:**

- Tidak ada route 404/catch-all: URL yang tidak dikenal menampilkan halaman kosong.
- Bila `.env` kosong, `src/config/firebase.js` melempar error sebelum React dimuat sehingga yang tampak halaman putih (pesan hanya di Console).
- Kelas `custom-scrollbar` dan `no-scrollbar` dipakai di banyak file tetapi tidak didefinisikan di CSS mana pun (tidak berefek).
- `npm run lint` masih menampilkan ±55 peringatan (variabel tak terpakai, dependensi `useEffect`). Boleh dibersihkan bertahap di modul Anda sendiri.
- Ukuran bundel JS besar (±2,4 MB); belum ada code-splitting.

## 10. Untuk Claude Code

- Di awal sesi, pastikan Anda tahu modul yang ditugaskan kepada pengguna. Jika belum jelas, **tanyakan dulu**.
- Ubah file hanya di modul itu. Untuk kode bersama, `CLAUDE.md`, `package.json`, atau konfigurasi: minta konfirmasi pengguna dan ingatkan agar dicatat di PR.
- Jangan menambah library, jangan menaruh rahasia atau data asli, jangan commit ke `main`.
- Sebelum menyatakan selesai: `npm run lint` dan `npm run build` harus lolos.
- Jangan mengubah tampilan atau perilaku di luar yang diminta.
