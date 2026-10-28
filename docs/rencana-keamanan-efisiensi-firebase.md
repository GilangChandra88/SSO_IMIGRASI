# Rencana Perbaikan Keamanan & Efisiensi Firebase

Disusun 27 Oktober 2026 dari pembacaan seluruh kode di branch `fitur/inventory-purwarupa`. Nomor baris merujuk ke branch itu. Ditujukan untuk pemilik proyek dan tim pengembang.

**Cara penyusunan.** Aplikasi dibagi enam bagian:

- Autentikasi/Kepegawaian
- LPJ
- Persuratan
- MAK
- Inventory
- Infrastruktur/klien

Setiap bagian dibaca satu analis. Lalu satu pemeriksa terpisah mencoba membantah setiap temuan langsung di kode. Temuan yang terbantah dibuang, sedangkan yang keliru tingkat atau lokasinya dikoreksi. Terakhir, satu pemeriksa kelengkapan mencari celah yang terlewat.

**Dokumen terkait:**

- Struktur database baru (acuan resmi): `docs/skema-database.md`.
- Langkah pembersihan & mulai ulang Firebase: `docs/rencana-pembersihan-firebase.md`.
- Rules baru: `firestore.rules`, `storage.rules`; uji: `scripts/uji-rules.mjs`.
- Aturan kerja untuk kode baru: `CLAUDE.md` bagian 7.1.

Beberapa hal hanya bisa dipastikan di Firebase/Google Cloud Console, misalnya pendaftaran akun, region, paket tagihan, rules yang terpasang, dan versi Cloud Function yang berjalan. Hal itu ditandai **[cek Console]**.

**Keputusan pemilik proyek (27 Oktober 2026):**

1. **Bersihkan sekarang, mulai dari awal menuju produksi.** Firestore, Storage, akun Authentication, dan Cloud Functions lama dihapus **sekarang**, tanpa cadangan dan tanpa migrasi data. Struktur database dirombak total (`docs/skema-database.md`). Tidak ada skrip migrasi, kode transisi, maupun cadangan baca untuk bentuk lama.
2. **Cloud Functions Gen 2 diizinkan.** Penerbitan nomor, pencatatan realisasi, akun/peran, dan data turunan dipindah ke server.
3. **MAK ditulis Keuangan** (Super Admin ikut).
4. **Nomor surat diterbitkan pegawai.** Semua pegawai aktif boleh meminta nomor lewat Function `terbitkanNomorSurat`.

Temuan di bagian 2–3 menggambarkan kode **saat ini**, jadi memakai nama koleksi lama. Bagian 4–5 memakai nama di skema baru, misalnya `lpj_berkas` (dulu `lpj_packs`), `mak_node` (dulu `MAK`), `mak_realisasi` (dulu `MAK_History`), `surat_kode`, `surat_nomor`, dan `pengguna_preferensi`. Tabel lengkap nama lama → baru ada di `docs/skema-database.md` §6.

---

## 1. Ringkasan

- **Keamanan saat ini sepenuhnya bergantung pada browser.** Semua pembatasan peran (Keuangan, Kepegawaian, Umum, Super Admin) hanya ada di React. Di server, `firestore.rules` belum ada di repo, dan `storage.rules` hanya mensyaratkan "sudah login".
  - Pendaftaran akun mandiri **pasti aktif**, karena tombol "Buat Akun" di Kepegawaian bergantung padanya.
  - Akibatnya, siapa pun bisa membuat akun lewat API. Akun itu lalu bisa membaca dan mengubah semua data, termasuk menjadikan dirinya Super Admin.
- **Data pribadi terbuka terlalu lebar.** NIP, tanggal lahir, e-mail, peran, dan foto wajah pegawai terunduh oleh setiap pemilih pegawai dan banner ulang tahun. Link berkas keuangan bertoken permanen tersimpan di Firestore.
- **Biaya uang kecil, tetapi beban baca terus membesar.** Penyimpanan PDF diperkirakan hanya puluhan ribu rupiah per bulan. Yang tumbuh adalah jumlah dokumen yang dibaca setiap kali halaman dibuka.
  - Di seluruh `src/` **tidak ada satu pun `limit()`**, hanya dua `orderBy`.
  - Setiap halaman Keuangan mengunduh seluruh berkas LPJ.
- **Integritas data keuangan belum terjaga di server.** Realisasi anggaran (`MAK_History`) dihapus dan ditulis ulang dari browser pegawai. Penghitung nomor bisa dimundurkan. Berkas yang sudah diarsip bisa dihapus permanen tanpa cadangan.
- **Urutan kerja:**
  1. Tutup akses liar (Console).
  2. Perbaiki celah klien yang murah.
  3. Pindahkan identitas dan peran ke server.
  4. Pindahkan pembaca ke data ringkas.
  5. Tulis rules.
  6. Rapikan Storage dan pola baca.
  7. Siapkan proyek produksi.

  Urutan ini **tidak boleh dibalik**. Rules ketat yang dipasang sebelum langkah 3 dan 4 selesai akan memutus login dan sebagian besar halaman (lihat bagian 5).

## 2. Temuan keamanan

Tingkat: **Kritis** = bisa disalahgunakan sekarang tanpa keahlian khusus · **Tinggi** · **Sedang** · **Rendah** · **Info**.

### 2.1 Akses, identitas, dan peran

| ID  | Tingkat | Temuan                                                                                                                                                                                                                                                                                                                                                                                                                    | Lokasi                                            |
| --- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| K1  | Kritis  | `firestore.rules` tidak ada di repo, padahal dirujuk `firebase.json`. Aturan yang berlaku hanya yang dipasang manual di Console, dan isinya tidak bisa di-review. Tanpa custom claims, rules itu hampir pasti paling jauh `request.auth != null`. Blok `firestore` di `firebase.json` juga tidak menyebut database, sehingga `firebase deploy --only firestore` menarget `(default)`, bukan `imigrasi`. **[cek Console]** | `firebase.json:9-12`                              |
| K2  | Kritis  | Akun Auth tanpa dokumen `pegawai` (juga bila kueri gagal) tetap diterima sebagai "Pegawai". Pendaftaran mandiri pasti aktif karena dipakai `createUserWithEmailAndPassword` di Kepegawaian. Tidak ada pemeriksaan `emailVerified`.                                                                                                                                                                                        | `AuthContext.jsx:95-102`, `Pegawai.jsx:271`       |
| K3  | Kritis  | Eskalasi peran. Peran dibaca dari field `roles`/`role` di dokumen `pegawai`, dan dokumen itu bisa ditulis klien. Siapa pun yang login bisa menulis `roles: ['Super Admin']` ke dokumennya sendiri.                                                                                                                                                                                                                        | `AuthContext.jsx:89-94`, `utils/peran.js:17-22`   |
| K18 | Tinggi  | Identitas dikaitkan lewat field `email` yang juga bisa ditulis klien, lalu diambil `docs[0]` tanpa jaminan unik. Pengguna bisa menulis e-mailnya ke dokumen pegawai lain yang berperan Keuangan atau Super Admin, lalu mewarisi peran dan identitasnya.                                                                                                                                                                   | `AuthContext.jsx:89-94`, `useLpjUser.js:12-13`    |
| K4  | Sedang  | Super Admin ditentukan dari satu alamat e-mail pribadi yang ditulis langsung di kode. Tidak bisa dicabut tanpa deploy ulang, alamatnya tersimpan di riwayat git, dan tanpa `emailVerified`. Di proyek produksi baru, siapa pun yang pertama mendaftar dengan alamat itu menjadi Super Admin.                                                                                                                              | `AuthContext.jsx:84-86`                           |
| K21 | Sedang  | Pemisahan tugas lemah. Pengguna Kepegawaian bisa menyunting dokumennya sendiri dan mencentang Keuangan atau Umum, sehingga mendapat akses penuh e-Persuratan tanpa jejak. Tombol "Buat Akun" juga muncul untuk baris yang berperan Super Admin/Keuangan dengan kata sandi pilihan admin. Tombol hapus/sunting baris Super Admin pun tidak dikunci.                                                                        | `Pegawai.jsx:436-462`, `:665-677`, `:690-701`     |
| K22 | Sedang  | Menghapus pegawai hanya menghapus dokumen Firestore. Akun login tetap aktif dan, karena K2, tetap diterima sebagai Pegawai. Foto, `ulang_tahun`, dan `ucapan_ultah` tertinggal.                                                                                                                                                                                                                                           | `Pegawai.jsx:203-210`                             |
| K8  | Sedang  | Akun dibuat dari browser (`secondaryAuth`) dengan domain `@imigrasi.com` yang bukan kotak surat nyata. Bila `updateDoc` gagal setelah akun dibuat, akun tertinggal tanpa tautan.                                                                                                                                                                                                                                          | `Pegawai.jsx:264-287`, `config/firebase.js:33-35` |
| K29 | Sedang  | Masalah kata sandi:<br>• Kata sandi ditentukan admin dengan batas minimal 6 karakter.<br>• Tidak ada fitur ganti kata sandi di mana pun (`updatePassword`/`sendPasswordResetEmail`).<br>• Awalan e-mail diisi otomatis dari nama depan, sehingga nama akun mudah ditebak.<br>Akibatnya, tindakan keuangan atas nama seseorang tidak bisa dipastikan dilakukan pemiliknya.                                                 | `Pegawai.jsx:258`, `:849`, `Login.jsx:14-28`      |
| K15 | Rendah  | `ProtectedRoute` dan `AppLayout` hanya memeriksa "sudah login". Peran dibaca sekali saat login (bukan listener), jadi pencabutan peran baru berlaku setelah halaman dimuat ulang.                                                                                                                                                                                                                                         | `App.jsx:10-14`, `AppLayout.jsx:33`               |
| K35 | Rendah  | Data ulang tahun sepenuhnya ditulis klien. Pengirim ucapan bisa dipalsukan, dan status kejutan orang lain bisa direset. `resetOleh` menyimpan e-mail admin. Pesan dirender sebagai teks, jadi tidak ada XSS.                                                                                                                                                                                                              | `utils/ulangTahun.js:96-190`                      |

### 2.2 Data LPJ, MAK, Persuratan, Inventory

| ID  | Tingkat | Temuan                                                                                                                                                                                                                                                                                                                                                                                                        | Lokasi                                                                                                                       |
| --- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| K12 | Tinggi  | Aturan "Selesai = final" (`locked`, `formLocked`, `status`), hak edit (`canEditPack`), dan langkah form (`bolehMasuk`) hanya dicek di React. `saveLPJ` menulis patch apa adanya, dan `pegawai_uids` dihitung dari data klien. Pegawai bisa membuka kunci fase, mengubah transaksi setelah nomor terbit, serta menulis `nomor_lpj`, `verifikasi`, `arsip`, dan `pembayaran`.                                   | `useLPJ.js:162`, `:206-227`, `lpjLogic.js:473-478`, `PerjadinFormPage.jsx:51-68`                                             |
| K19 | Tinggi  | Detail berkas bisa dibuka siapa pun lewat URL. `PackDetail`/form membuka `lpj_packs/{id}` tanpa memeriksa `pegawai_uids`. Pegawai biasa juga mendengarkan seluruh `drpp` (Arsip Pelaksana), yang memuat ID berkas orang lain.                                                                                                                                                                                 | `PackDetail.jsx:69`, `useDrpp.js:36-55`, `ArsipPelaksana.jsx:80-82`                                                          |
| K20 | Tinggi  | Data anggaran bisa diubah dari browser:<br>• Pohon MAK dan pagu bisa diubah atau dihapus akun mana pun; pembatasan Super Admin hanya di router.<br>• `catatMakHistory` di browser pelaksana menghapus **semua** catatan realisasi suatu berkas lalu menulis ulang dari data klien.<br>• Batal/Pulihkan tidak meninggalkan jejak.<br>• Hapus berkas oleh Super Admin menghapus catatan realisasi secara fisik. | `MakSetup.jsx:63,77`, `makHistory.js:19-55`, `MakHistory.jsx:55`, `useLPJ.js:307`                                            |
| K23 | Sedang  | Penghitung nomor bisa dimundurkan atau ditimpa: `counters/lpj_*`, `drpp_*`, `inventory_*`, dan `settings/nomor_surat` (tab Pengaturan menulis nilai bebas). Akibatnya:<br>• `createDrpp` memakai `set` ke ID `DRPP-YYYY-NNNN` tanpa cek `exists`, sehingga DRPP lama bisa tertimpa diam-diam.<br>• Nomor LPJ ganda tidak terdeteksi.                                                                          | `useDrpp.js:128-172`, `useLPJ.js:178-194`, `nomorSurat.js:56-57`, `PengaturanNomor.jsx:10-18`, `inventoryDb.js:79-85`        |
| K24 | Sedang  | Halaman Nomor Surat hanya untuk Keuangan, tetapi tombol "Generate Nomor Surat" di form surat terbuka untuk semua pegawai. Tombol itu menaikkan penghitung global dan menulis `surat_dokumen` tanpa `createdBy`.                                                                                                                                                                                               | `AppModule.jsx:212`, `SuratForm.jsx:1504-1556`                                                                               |
| K17 | Sedang  | Tidak ada cadangan terjadwal maupun _soft delete_. Super Admin bisa menghapus permanen berkas yang sudah diverifikasi, dibayar, dan diarsip, berikut scan arsip, bukti transfer, dan catatan realisasinya, cukup dengan satu konfirmasi. Transaksi Inventory juga dihapus permanen **tanpa konfirmasi**. Berkas Storage tertinggal bila unggah beruntun gagal atau saat pegawai dihapus.                      | `useLPJ.js:292-311`, `RiwayatTransaksi.jsx:445-458`, `inventoryDb.js:104,118`, `lpjStorage.js:49-58`                         |
| K32 | Sedang  | Validasi Inventory (jumlah > 0, stok tidak minus, tanggal, keunikan kode SAKTI) hanya di klien. Selain itu, karena pembaca tidak memiliki penjaga, satu dokumen cacat bentuk bisa memacetkan modul Inventory untuk semua pengguna.                                                                                                                                                                            | `inventoryDb.js:38-118`, `InventoriProvider.jsx:73`, `StokBarang.jsx:218,253-259`                                            |
| K7  | Tinggi  | XSS tersimpan. `dangerouslySetInnerHTML` merender isi surat dari Firestore. Ini satu-satunya pemakaian HTML mentah di `src/`. Pemicunya hanya dokumen bertemplate yang tidak ditulis UI, jadi eksploitasi butuh penulisan langsung lewat SDK (bergantung K1). Korbannya Keuangan/Super Admin yang membuka Riwayat Surat.                                                                                      | `PreviewSuratModal.jsx:139,167`                                                                                              |
| K25 | Sedang  | Data pribadi terbaca semua pengguna:<br>• Dokumen `pegawai` lengkap (NIP, tanggal lahir, e-mail, peran, URL foto) diunduh oleh banner ulang tahun di Portal, pemilih pegawai LPJ/Surat, dan Inventory. Mode `?uji-ultah=<id>` hanya dijaga di klien.<br>• Kartu Progres Berkas mengunduh catatan `MAK_History` berkas **orang lain** (berisi "NIP - Nama") hanya untuk menjumlah angka.                       | `ulangTahun.js:73-86`, `usePegawaiList.js:17`, `InventoriProvider.jsx:55-67`, `useVerifikasi.js:103-143`, `makHistory.js:46` |

### 2.3 Storage dan berkas

| ID  | Tingkat | Temuan                                                                                                                                                                                                                                                                                                                                                                                                     | Lokasi                                                                            |
| --- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| K5  | Tinggi  | `storage.rules`: setiap pengguna yang login boleh `read` (termasuk `list`), menulis, dan menghapus semua berkas `lpj/**`, termasuk arsip, transfer, dan DRPP (`lpj/drpp/**`). Untuk foto pegawai (`pegawai/**`), tingkatnya Sedang.                                                                                                                                                                        | `storage.rules:8-14`, `:18-23`                                                    |
| K6  | Tinggi  | Link `getDownloadURL()` bertoken permanen (bisa dibuka tanpa login) disimpan di `lpj_packs`, `drpp`, dan `pegawai.fotos`, lalu dipakai untuk `window.open`, `<img>`, `<iframe>`, dan `fetch`.                                                                                                                                                                                                              | `lpjStorage.js:26`, `fotoPegawai.js:23`                                           |
| K26 | Sedang  | Metadata berkas (`url`, `type`, `path`) dari Firestore dipercaya begitu saja. Pelaksana bisa mengganti `url` lampiran dengan situs lain. Akibatnya:<br>• Pratinjau cadangan memuatnya di `<iframe>` **tanpa sandbox** di dalam modal aplikasi, sehingga halaman phishing tampil di depan Keuangan.<br>• `<img>`/`fetch` membocorkan IP pembuka.<br>• `path` dari dokumen dipakai langsung untuk menghapus. | `LampiranViewer.jsx:37,142,189-192`, `halamanBerkas.js:75`, `lpjStorage.js:75-77` |
| K27 | Sedang  | Bucket bisa dipakai sebagai hosting berkas bebas. `lpj/{apa-saja}/**` menerima unggahan dari akun mana pun tanpa memeriksa bahwa berkas LPJ itu ada. Pola `image/.*` juga menerima SVG. Hasilnya link permanen di domain Google atas nama proyek kantor, ditambah biaya simpan dan unduh tanpa batas.                                                                                                      | `storage.rules:8-14`                                                              |
| K14 | Rendah  | Tipe dan ukuran hanya diperiksa dari `contentType` kiriman klien, dengan satu batas 5 MB untuk semua folder. Batas 200 KB foto laporan dan "hanya gambar" lampiran NP hanya ada di klien.                                                                                                                                                                                                                  | `storage.rules:10-13`, `lpjStorage.js:65-72`, `StepLaporan.jsx:74-81`             |

### 2.4 Klien, hosting, dan alat kerja

| ID  | Tingkat      | Temuan                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Lokasi                                                                 |
| --- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| K30 | Sedang       | `.claude/settings.json` di-commit untuk seluruh tim dan isinya terlalu longgar:<br>• Mengizinkan `Bash(*)`, `Edit(*)`, `Write(*)`, `WebFetch(*)`.<br>• Hook-nya otomatis menyetujui ExitPlanMode dan menjawab "yes" pada AskUserQuestion.<br>Akibatnya larangan membaca `.env` bisa dilewati lewat `cat`, dan konfirmasi yang diwajibkan CLAUDE.md bagian 10 terjawab otomatis. Instruksi tersembunyi di berkas atau halaman web juga bisa menjalankan `firebase deploy` atau mengirim `.env` ke luar tanpa ditanya. | `.claude/settings.json:49-60,126-145`                                  |
| K31 | Sedang       | Pemasang Agen Scanner (`.exe` ±80 MB) dilacak git dan disajikan publik di `/unduh/` tanpa tanda tangan kode atau hash. Siapa pun yang bisa push ke repo dapat menggantinya.                                                                                                                                                                                                                                                                                                                                          | `public/unduh/AgenScanner-Setup.exe`, `scanner/data/agen.js:6-8`       |
| K9  | Sedang       | Tidak ada App Check, dan kemungkinan belum ada peringatan anggaran. Paket Blaze tidak punya batas tagihan. **[cek Console]**                                                                                                                                                                                                                                                                                                                                                                                         | `config/firebase.js:27-31`                                             |
| K28 | Sedang       | Penyalahgunaan biaya (_denial-of-wallet_). Banyak listener tanpa filter menyiarkan setiap perubahan ke semua klien. Tanpa batas ukuran field di rules, satu akun bisa membengkakkan dokumen yang didengarkan semua orang, misalnya dokumen pegawai berulang tahun (banner Portal) atau berkas LPJ (5 listener Keuangan). Biaya bacanya berlipat sebanyak jumlah klien yang terbuka.                                                                                                                                  | `ulangTahun.js:78-86`, `useLPJ.js:52-58`                               |
| K10 | Sedang       | Hosting tanpa header keamanan (CSP, `frame-ancestors`, `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy`).                                                                                                                                                                                                                                                                                                                                                                                           | `vercel.json:1-8`                                                      |
| K11 | Rendah       | Agen Scanner di `127.0.0.1:47800` sudah memeriksa `Origin` (versi lama tidak), tetapi tanpa token pasangan. Kode agen ada di luar repo.                                                                                                                                                                                                                                                                                                                                                                              | `agenScanner.js:10,21-24`, `useStatusAgen.js:45-49`                    |
| K33 | Rendah       | Sesi login tersimpan permanen (tanpa `setPersistence`/batas waktu menganggur). Logout tidak memuat ulang halaman, sehingga cache halaman PDF/gambar berkas di memori tetap ada untuk pengguna berikutnya di PC bersama.                                                                                                                                                                                                                                                                                              | `config/firebase.js:28`, `halamanBerkas.js:96-97`, `Sidebar.jsx:48-50` |
| K34 | Rendah       | Error boundary menampilkan pesan dan _stack trace_ lengkap di produksi, disertai ajakan mengirimkannya ke "asisten AI".                                                                                                                                                                                                                                                                                                                                                                                              | `main.jsx:15-48`                                                       |
| K13 | Rendah       | Google Analytics aktif untuk semua pengguna, bahkan bila `measurementId` kosong.                                                                                                                                                                                                                                                                                                                                                                                                                                     | `config/firebase.js:3,37`                                              |
| K16 | Info         | Hanya ada satu proyek (dev = prod), dan penempatan data belum diputuskan. Cloud Functions berada di `asia-southeast1` (Singapura). Instansi pemerintah kemungkinan wajib menyimpan data di Indonesia (PP 71/2019, SPBE/PDN), **perlu konfirmasi ke TI Ditjen**. Region tidak bisa dipindah setelah dibuat.                                                                                                                                                                                                           | `functions/index.js:30,142`                                            |
| K36 | Info         | `npm audit` melaporkan 4 "high" dari `@grpc/grpc-js` (dependensi `@firebase/firestore`). Paket ini hanya dipakai jalur Node, bukan bundel browser. **Jangan jalankan `npm audit fix --force`**, karena perintah itu menurunkan firebase ke v9.                                                                                                                                                                                                                                                                       | `package-lock.json`                                                    |
| —   | Info positif | Tidak ditemukan rahasia ter-commit (`.env` dan log tidak pernah masuk git). Ekspor Excel Inventory aman dari injeksi rumus (`inlineStr`). Ucapan ulang tahun dirender sebagai teks. Hanya ada satu `dangerouslySetInnerHTML` (K7).                                                                                                                                                                                                                                                                                   | `.gitignore:6-9`, `inventory/utils/xlsx.js:75-82`                      |

## 3. Temuan efisiensi

| ID  | Tingkat | Temuan                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Lokasi                                                                                                                                                                       |
| --- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | Tinggi  | Lima listener `lpj_packs` terpisah (Dashboard, Daftar, Berkas Verifikasi, Arsip Keuangan, Arsip Pelaksana). Untuk Keuangan, kuerinya utuh tanpa filter. Firestore memakai cache memori bawaan, jadi setiap pindah menu membaca ulang semua dokumen gemuk. Dashboard Keuangan mengunduh **semua** berkas walaupun hanya menampilkan "Berkas LPJ Saya".                                                                                                                                                                                                                                                                                                                    | `useLPJ.js:52-58`, `Dashboard.jsx:82,90-98`, `BerkasListPage.jsx:61`, `DaftarVerifikasi.jsx:72`, `ArsipKeuangan.jsx:76-79`, `ArsipPelaksana.jsx:80`, `config/firebase.js:29` |
| E2  | Tinggi  | Pohon MAK **semua tahun** diunduh ulang (`getDocs`) setiap kali form LPJ, Detail, Verifikasi, dan form surat dibuka. MAK Setup/History mendengarkan seluruh `MAK` dan `MAK_History`. Pelaksana mendengarkan seluruh `drpp`. Halaman Nomor Surat memasang 5 listener koleksi sekaligus walau hanya satu tab yang terlihat.                                                                                                                                                                                                                                                                                                                                                | `useMakTree.js:18`, `SuratForm.jsx:255,267`, `useMakData.js:27,31`, `useDrpp.js:39`, `NomorSuratKanim.jsx:40-43`, `useNomorSurat.js:25,41,58-59`                             |
| E3  | Sedang  | Koleksi `pegawai` lengkap dibaca utuh di ±10 tempat: `usePegawaiList` di 6 halaman LPJ, Kepegawaian, Inventory, SuratForm, dan banner. Biayanya kecil karena koleksinya kecil, tetapi data pribadi ikut terbuka (K25). Foto ukuran penuh juga dipakai untuk avatar 36–48 px.                                                                                                                                                                                                                                                                                                                                                                                             | `usePegawaiList.js:17`, `Pegawai.jsx:94,608-613`, `InventoriProvider.jsx:56`, `SuratForm.jsx:214`                                                                            |
| E4  | Sedang  | Angka dihitung dari **seluruh** riwayat sejak awal:<br>• stok Inventory;<br>• rekap MAK;<br>• POK Terakhir. Untuk POK, `useRealisasiLain` mengunduh semua catatan realisasi tiap Item, termasuk yang batal, dan kuerinya berjalan dua kali setiap kali dipasang.<br>Bebannya tumbuh terus setiap tahun.                                                                                                                                                                                                                                                                                                                                                                  | `stokLogic.js:63-76`, `makUtils.js:48-53`, `useVerifikasi.js:103-161`                                                                                                        |
| E5  | Sedang  | Dokumen `lpj_packs` memuat semua fase sekaligus (teks laporan, transaksi, hingga 30+ metadata berkas dengan URL panjang). Simpan otomatis mengirim **semua** bagian (termasuk yang final) setiap 1,2 detik, lalu memicu ulang semua listener daftar.                                                                                                                                                                                                                                                                                                                                                                                                                     | `useLPJ.js:138-170`, `emptyModels.js:26-92`, `PerjadinFormPage.jsx:136-148`                                                                                                  |
| E6  | Rendah  | Dampak ke Storage belum terjadi karena Scanner belum mengunggah ke Storage. Bawaan pindai sudah abu-abu 200 dpi, tetapi tiga jalur impor belum dikompres:<br>• JPEG impor digambar ulang dengan kualitas 0,92;<br>• PNG dipakai tanpa pengecilan;<br>• halaman PDF impor dirender JPEG 0,85.                                                                                                                                                                                                                                                                                                                                                                             | `scanner/data/label.js:32-38`, `gambar.js:39-48`, `pdfWeb.js:33`                                                                                                             |
| E7  | Rendah  | Berkas yang dibuka berulang ikut diunduh ulang:<br>• Semua unggahan tanpa `cacheControl`.<br>• Thumbnail memakai berkas asli (lampiran hingga 5 MB).<br>• Detail LPJ otomatis mengunduh scan SP di latar belakang setiap kali dibuka.<br>• Aset OCR (±19 MB) tanpa aturan cache di hosting.                                                                                                                                                                                                                                                                                                                                                                              | `lpjStorage.js:17-19`, `fotoPegawai.js:22`, `LampiranViewer.jsx:95`, `PackDetail.jsx:74-79`, `vercel.json`                                                                   |
| E8  | Rendah  | Sisa format lama masih berjalan:<br>• Cloud Function `onPackCreated` terpicu setiap berkas baru hanya untuk mencetak log field yang sudah tidak ada.<br>• `onSuratItemUpdated` (Gen 1) masih ada.<br>• `surat_instances`: setiap "Simpan Draft" menambah dokumen baru berisi data pribadi yang tidak pernah dibaca, sedangkan listener statistiknya membaca nama field yang salah.<br>• `surat_perintah` tidak punya penulis tetapi masih didengarkan penuh.<br>• `surat_definitions` menimpa definisi kode dengan versi usang.<br>• Indeks lama tidak dipakai.<br>Deploy Functions terakhir tercatat gagal, jadi versi yang berjalan tidak diketahui. **[cek Console]** | `functions/index.js:29-152`, `SuratForm.jsx:282-373,395-409`, `useSuratDefinitions.js:44-56,76-81`, `useNomorSurat.js:58`, `firestore.indexes.json:3-20`                     |
| E9  | Rendah  | `ucapan_ultah` disaring tahun di klien, padahal field `tahun` sudah ada. Listener-nya dipasang global di `App` untuk semua pengguna.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `ulangTahun.js:105-144`, `App.jsx:80`                                                                                                                                        |
| E10 | Info    | Listener tanpa callback galat (`Pegawai.jsx`, `useNomorSurat`, `useSuratDefinitions`). Setelah rules dipasang, penolakan akses akan tampak sebagai spinner abadi atau "data kosong".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `Pegawai.jsx:94-103`, `useNomorSurat.js:9-13`                                                                                                                                |
| E11 | Info    | Login menjalankan dua baca berurutan (`userSettings` lalu `pegawai`) sebelum aplikasi tampil.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `AuthContext.jsx:71-103`                                                                                                                                                     |

### Perkiraan biaya Storage (kasar, perlu dicek di kalkulator resmi)

Asumsi: 600 berkas/tahun, ±10 MB/berkas, tiap berkas dibuka ±5 kali.

|                                        | Tahun 1                 | Tahun 5       |
| -------------------------------------- | ----------------------- | ------------- |
| Tersimpan                              | ±6 GB                   | ±30 GB        |
| Biaya simpan (±US$0,02–0,026/GB/bulan) | < US$0,2/bulan          | ±US$0,8/bulan |
| Unduhan                                | ±2,5 GB/bulan (±US$0,3) | serupa        |

Biaya baru melonjak bila salah satu hal ini terjadi:

- hasil pindai tidak dikompres (E6);
- bucket dipakai hosting liar atau link bocor disedot bot (K6, K27, K9);
- pembacaan Firestore dibiarkan utuh (E1–E4, K28).

## 4. Rencana kerja

Struktur data, Function, dan Storage target ada di `docs/skema-database.md`. Langkah Console ada di `docs/rencana-pembersihan-firebase.md`.

| Tahap                             | Isi                                                                                                        | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pembersihan & mulai ulang**     | Proyek baru (atau proyek lama dikosongkan), Auth, App Check, API key, IAM, peringatan anggaran, rules baru | **Sebagian besar selesai** (proyek `imigrasi-database-v2`, Auth, App Check kunci skor, CORS bucket, IAM Function, rules terpasang); sisanya butir go-live di `docs/rencana-pembersihan-firebase.md`                                                                                                                                                                                                                                                                                                               |
| **Rules**                         | `firestore.rules` + `storage.rules` untuk skema baru                                                       | **Selesai ditulis dan diuji**: 235 kasus izin/tolak lulus di Emulator (`scripts/uji-rules.mjs`, 28 Okt 2026), termasuk Meta di dalam daftar dan `tte.scan` (P8). Versi yang terpasang di produksi = 27 Okt; dipasang ulang saat go-live                                                                                                                                                                                                                                                                           |
| **P0** Fondasi & pengerasan klien | lihat 4.1                                                                                                  | **Selesai**. K26 diputuskan di P8: bingkai PDF gabungan/cetak hanya memuat `blob:` PDF buatan aplikasi (@react-pdf) dan tetap tanpa `sandbox` karena `sandbox` memblokir penampil PDF & cetak; URL selain `blob:` ditolak. Pembantu nilai di `src/utils/nilai.js`, batas di `src/utils/batas.js`                                                                                                                                                                                                                  |
| **P1** Identitas & peran          | lihat 4.2                                                                                                  | **Selesai dan di-deploy** (Function akun/peran/status, claims, `/ganti-sandi`, `pegawai_ringkas`, `pengguna_preferensi`); `secondaryApp` dihapus 28 Okt                                                                                                                                                                                                                                                                                                                                                           |
| **P2–P7** Modul                   | LPJ, MAK, Persuratan, Inventory, Kepegawaian & SSO mengikuti skema baru, ditambah 4.3 dan 4.4              | **Selesai** ditulis & diuji: LPJ (+ Berkas Verifikasi, Arsip & DRPP), MAK, Persuratan & Nomor Surat, Inventory, serta Kepegawaian & SSO (foto + thumbnail, ulang tahun, pejabat) — `scripts/uji-lpj.mjs` 107 kasus, `scripts/uji-functions.mjs` 31 kasus. Function-nya belum di-deploy                                                                                                                                                                                                                            |
| **P8** Hosting & alat kerja       | lihat 4.5                                                                                                  | **Selesai ditulis** (disetujui pemilik 28 Okt): Meta di dalam daftar & `tte.scan` diperiksa rules (aturan simpan berkas dihemat di bawah batas 1.000 ekspresi), K26 diputuskan, header keamanan + CSP mode laporan di `vercel.json`, CI `.github/workflows/ci.yml`, `.claude/settings.json` tim dipersempit (K30; disalin pemilik), installer ke GitHub Releases (K31), `firestore.indexes.json` dirapikan (9 komposit, 17 pengecualian). Sisa: tegakkan CSP setelah uji produksi, Authenticode, K11 di kode agen |
| **Go-live**                       | lihat 4.6                                                                                                  | belum (deploy rules/indeks/Function + env Vercel dilakukan setelah semua tahap selesai & di-commit)                                                                                                                                                                                                                                                                                                                                                                                                               |

Perubahan `functions/` untuk Cloud Functions Gen 2 **sudah disetujui** (27 Oktober 2026). Yang tetap **wajib persetujuan pemilik proyek** per PR:

- dependensi baru di `functions/package.json` selain `firebase-admin`/`firebase-functions`;
- `firebase.json`, `firestore.indexes.json`, `vercel.json`, `package.json`, `.claude/`.

Kode bersama wajib disebut di deskripsi PR.

### 4.1 P0 — Fondasi & pengerasan klien

1. **`src/config/koleksi.js`:** konstanta `KOLEKSI` dan `JALUR_BERKAS` sesuai skema. Tidak ada lagi nama koleksi sebagai teks di komponen.
2. **`src/config/firebase.js`:**
   - database `(default)`;
   - `initializeAppCheck` (reCAPTCHA Enterprise, kunci dari `.env`);
   - `getAnalytics` dihapus (K13);
   - `.env.example` disesuaikan.
3. **Hapus kode bentuk lama:** `useLPJLegacy`, `packTemplates`, mode `?packId=&itemId=` di SuratForm, `surat_instances`, `surat_definitions`, pembaca `surat_perintah`, dan isi `functions/index.js` lama (Gen 1).
4. **K7:** `PreviewSuratModal` tanpa `dangerouslySetInnerHTML` (render teks, `whitespace-pre-wrap`).
5. **K26:** `<iframe>` pratinjau ber-`sandbox` (tanpa `allow-top-navigation`/`allow-forms`). Berkas dibuka lewat helper bersama `bukaBerkasAman(meta)` yang memakai `getBlob()` dan memeriksa awalan `path`.
6. **K34:** _stack trace_ hanya tampil bila `import.meta.env.DEV`.
7. **K33:** setelah `signOut`, panggil `window.location.replace('/login')`.
8. **E10:** setiap listener punya penanganan galat dengan toast "Tidak punya akses atau gagal memuat".
9. **Helper bersama** `src/utils/waktu.js`, `src/utils/uang.js`, dan konstanta batas panjang/jumlah (dipakai form; angka sama dengan rules).
10. **Peran** memakai kode `superadmin`/`keuangan`/`kepegawaian`/`umum` di `src/utils/peran.js`, dengan label tampilan terpisah.

### 4.2 P1 — Identitas & peran di server

1. **Function Gen 2** (Node 22, region produksi):
   - `buatAkunPegawai`: akun dan `pegawai.authUid` dibuat atomik; kata sandi awal acak dan wajib diganti; baris Super Admin hanya oleh SA.
   - `aturPeran`: claims `{ peran, aktif, pegawaiId }`; hanya SA; tidak untuk diri sendiri; dicatat di `sistem_log`.
   - `nonaktifkanPegawai`: menonaktifkan akun, mencabut refresh token dan claims, menulis `aktif: false`.
   - `diPegawaiDitulis`: mengisi `pegawai_ringkas` dan `ultahMd`.
   - skrip `seedSuperAdmin` untuk Super Admin pertama.
2. **`AuthContext`:** peran **hanya** dari `getIdTokenResult().claims`.
   - Akun tanpa claim `aktif` → layar "Akun belum terdaftar" + `signOut`.
   - Sinyal pencabutan peran → `getIdToken(true)`.
   - E-mail Super Admin di kode dan `secondaryApp` dihapus (K4, K8, K18).
3. **Halaman "Ganti Kata Sandi"** (`reauthenticateWithCredential` + `updatePassword`), wajib saat login pertama (K29). Nama akun tidak diturunkan dari nama orang.
4. **Satu provider `pegawai_ringkas`** untuk seluruh aplikasi, menggantikan semua pembaca `pegawai` di luar Kepegawaian (E3, K25). `pengguna_preferensi/{uid}` menggantikan `userSettings/{email}`.

### 4.3 P2–P7 — Storage & efisiensi di setiap modul

1. **Unggahan:** hanya `path` (tanpa `url`), `cacheControl: 'private, max-age=31536000, immutable'`, path dan nama sesuai skema §7, dan unggah ulang ke path yang sama tidak mungkin (K5, K6, K14, K27, E7).
2. **Satu listener per data**, dipakai bersama lewat provider (ringkas berkas, pegawai ringkas, MAK per tahun). Hook listener dipasang di komponen yang menampilkannya (E1, E2).
3. **Kueri bersaring** `tahunAnggaran`/`tahun` (+ `tahap`/`status`) dengan `limit` sesuai skema §9. Rules menolak kueri tanpa `limit` (E1–E4, K28).
4. **Angka rekap dari dokumen yang ditulis Function:** `mak_rekap` (POK, Rekap MAK, Progres Berkas) dan `inventory_saldo`. Data mentah orang lain tidak lagi diunduh (E4, K25).
5. **Simpan otomatis LPJ** hanya mengirim bagian langkah aktif (dot-path) dengan `versi + 1`, dan jeda 2–3 detik (E5).
6. **Semua nomor resmi dan realisasi lewat callable** (`selesaikanSpby`, `buatDrpp`, `terbitkanNomorSurat`, `catatMasuk`/`catatKeluar`), sehingga tidak bisa dimundurkan atau dipalsukan (K20, K23, K24).
7. **MAK Setup dibuka untuk Keuangan.** Batal/Pulihkan realisasi tetap Super Admin.

### 4.4 Unggahan hemat

1. Profil ekspor "Arsip" di Scanner: 150 dpi, abu-abu, JPEG ±0,7, sisi terpanjang ≤ 1754 px (±100–200 KB/halaman) (E6).
2. Kompres gambar di browser sebelum unggah (canvas → JPEG, tanpa library baru), sesuai batas folder di rules: foto laporan ≤ 300 KB, lampiran ≤ 1 MB, thumbnail pegawai ≤ 60 KB.
3. Tampilkan perkiraan ukuran sebelum unggah, dan pesan jelas bila melewati batas.
4. Detail LPJ hanya _prefetch_ scan saat kursor diarahkan ke tombol "Lihat".

### 4.5 P8 — Hosting & alat kerja

Status 28 Okt 2026: butir 1, 2, 4, dan 5 sudah ditulis; butir 3 sebagian (installer pindah ke GitHub Releases dengan SHA-256 di catatan rilis; Authenticode dan K11 menunggu). Nilai CSP final ada di `vercel.json`. Bedanya dengan rancangan di bawah: `style-src` memakai `'unsafe-inline'` karena `<style>` animasi di `SplashScreen`, `FlowView`, dan `Login` tidak bisa diganti Tailwind tanpa `@keyframes` (risiko gaya jauh lebih kecil daripada skrip, dan `script-src` tetap ketat); `Referrer-Policy` memakai `strict-origin-when-cross-origin` (bukan `no-referrer`) supaya reCAPTCHA App Check tetap mengenali domain; HSTS tidak ditulis karena sudah dipasang Vercel; aset OCR di-cache 30 hari (folder belum berversi), aset Vite `/assets` 1 tahun `immutable`.

1. **Header keamanan di `vercel.json`.** Mulai dengan **CSP Report-Only**, lalu tegakkan setelah login, captcha kamera, pratinjau, cetak, dan OCR teruji:

   | Kebutuhan              | Nilai                                          | Dipakai oleh               |
   | ---------------------- | ---------------------------------------------- | -------------------------- |
   | `script-src`           | `'self' 'wasm-unsafe-eval'`                    | tesseract                  |
   | `worker-src`           | `'self' blob:`                                 |                            |
   | `img-src`              | `'self' data: blob:`                           | pratinjau dari `getBlob()` |
   | `frame-src`            | `'self' blob:`                                 | PDF gabungan/cetak         |
   | `connect-src`          | Firebase, App Check, `http://127.0.0.1:47800`  | agen pemindai              |
   | `style-src`/`font-src` | Google Fonts (atau font disajikan sendiri)     |                            |
   | `Permissions-Policy`   | `camera=(self), microphone=(), geolocation=()` | captcha ulang tahun        |
   | `frame-ancestors`      | `'none'`                                       |                            |

   Tambahkan juga `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, dan `Strict-Transport-Security`. Sebelum CSP ditegakkan, `<style>`/`style={{}}` di `Login.jsx` diganti kelas Tailwind.

2. **Aset OCR:** `Cache-Control: public, max-age=31536000, immutable` untuk `/ocr/(.*)`, dengan folder berversi.
3. **Agen Scanner (K11, K31):**
   - daftar _origin_ tetap;
   - token pasangan;
   - pemasang ditandatangani (Authenticode) dan dicantumkan SHA-256-nya;
   - biner keluar dari git.
4. **`.claude/settings.json` tim (K30):**
   - izin sempit (`npm run lint/build/dev`, git baca-saja);
   - izin luas dan hook persetujuan otomatis dipindah ke `.claude/settings.local.json` pribadi;
   - larangan `Bash(cat .env*)`, `Bash(*firebase deploy*)`, `Bash(curl:*)`.
5. **CI GitHub Actions:**
   - `npm ci`, `npm run lint`, `npm run build`;
   - Emulator + `node scripts/uji-rules.mjs`;
   - `npm audit --omit=dev` dengan pengecualian K36 terdokumentasi.

### 4.6 Go-live, cadangan, dan masa simpan

1. App Check **ditegakkan** untuk Firestore, Storage, dan Functions.
2. CORS bucket hanya untuk domain produksi.
3. Uji asap per peran dengan akun uji, lalu akun uji dinonaktifkan.
4. Firestore **PITR** + ekspor terjadwal ke bucket cadangan, serta _soft delete_/versi objek di bucket, aktif sejak hari pertama ada data asli.
5. Siklus hidup bucket: arsip berumur lebih dari 1–2 tahun dipindah ke Nearline/Coldline. Masa simpan mengikuti JRA arsip keuangan. Rules sudah melarang penghapusan arsip dan bukti transfer.
6. Proyek pengembangan terpisah untuk data uji. `.env` produksi hanya dipegang pemilik, dan pratinjau Vercel tidak pernah memakai proyek produksi.

## 5. Rules keamanan

Rules final ada di **`firestore.rules`** dan **`storage.rules`**. Ringkasan akses per koleksi dan per path ada di `docs/skema-database.md` §5 dan §7. Rules diuji dengan `scripts/uji-rules.mjs`, yang berisi 93 kasus izin/tolak dan semuanya lulus. Matriks versi lama di dokumen ini tidak berlaku lagi.

Lapisan perlindungan yang ditegakkan server:

| Lapisan                 | Isi                                                                                                                                                                                                               | Menutup           |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| Identitas               | Hanya login e-mail/kata sandi dengan claim `aktif` + `peran` + `pegawaiId` yang ditulis Function. Akun buatan sendiri, anonim, atau tanpa claim ditolak di **semua** koleksi dan berkas                           | K2, K3, K15, K18  |
| Peran                   | Peran dibaca dari token, bukan dokumen. Field akun/peran di `pegawai` tidak bisa ditulis klien. Data Super Admin hanya diubah Super Admin                                                                         | K3, K4, K21       |
| Tolak kecuali diizinkan | Koleksi atau path yang tidak disebut ditolak, termasuk semua koleksi lama (`MAK`, `lpj_packs`, `userSettings`, …)                                                                                                 | K1, K27           |
| Bentuk data             | Daftar field tertutup, tipe, panjang teks, jumlah daftar, format tanggal/NIP/kode SAKTI, uang bilangan bulat                                                                                                      | K28, K32          |
| Jejak audit             | `dibuatPada`/`diubahPada` = waktu server, `dibuatOleh`/`diubahOleh` = uid login, jejak pembuatan tidak bisa diubah                                                                                                | K17, K32          |
| Data resmi              | Nomor (LPJ, DRPP, surat, TBR/TBK), realisasi, ringkasan, rekap, penghitung, dan log hanya ditulis Function                                                                                                        | K20, K23, K24     |
| Alur LPJ                | Fase berurutan; fase terkunci tidak bisa diubah; LPJ/SPBy hanya dikunci Function; `versi` wajib naik; anggota tidak bisa menambah anggota sendiri; tahap Keuangan berurutan; arsip final hanya diubah Super Admin | K12, K19          |
| Hapus                   | Tidak ada hapus fisik untuk pegawai, master, berkas, nomor, realisasi, transaksi. Arsip dan bukti transfer di Storage tidak pernah bisa dihapus                                                                   | K17, K20          |
| Kueri                   | Setiap daftar wajib `limit` dengan batas per koleksi. `lpj_berkas` tidak bisa didaftar                                                                                                                            | E1–E4, K25, K28   |
| Data pribadi            | Dokumen `pegawai` lengkap hanya Kepegawaian dan pemilik. Modul lain membaca `pegawai_ringkas`. Realisasi tanpa NIP. Foto asli hanya pemilik dan Kepegawaian                                                       | K25               |
| Berkas                  | Path per folder dan per fase, tipe JPEG/PNG/PDF (tanpa SVG), batas ukuran per folder, nama berpola, tanpa penimpaan, tanpa daftar isi folder, metadata berkas di Firestore divalidasi path-nya                    | K5, K14, K26, K27 |

Yang **tidak bisa** ditegakkan rules sendiri, dan karena itu ditangani Function atau Console:

- kebenaran hitungan (nomor, saldo, realisasi);
- batas laju permintaan, yang ditangani App Check dan peringatan anggaran;
- kebijakan kata sandi;
- pemblokiran pendaftaran akun.

## 6. Keputusan

**Sudah diputuskan (27 Oktober 2026):**

- Seluruh Firebase dibersihkan **sekarang**, tanpa cadangan dan tanpa migrasi; struktur database dirombak total (`docs/skema-database.md`).
- Cloud Functions Gen 2 diizinkan.
- MAK ditulis Keuangan (+ Super Admin). Batal/Pulihkan realisasi tetap Super Admin.
- Nomor surat diterbitkan semua pegawai aktif, lewat Function.

**Sudah diputuskan (28 Oktober 2026):**

- Nomor urut surat **mulai ulang tiap tahun** (D4 untuk surat): penghitung `sistem_penghitung/surat_{tahun}`.
- Halaman Nomor Surat dibuka untuk **semua pegawai** (Daftar Nomor, Riwayat Surat, Tambah Nomor Surat); tab Hierarki Kode dan Pengaturan tetap Keuangan/Super Admin.
- Nomor TBR/TBK Inventory **terus berlanjut** lintas tahun (D4 untuk Inventory).
- `inventory_kategori.akunKode` **dipakai** di ekspor Excel Stok Barang untuk SAKTI (D6).

**Masih dibutuhkan dari pemilik proyek:**

1. Izin mengubah `firebase.json` (blok `emulators` untuk uji), serta `vercel.json`, `.claude/settings.json`, dan CI di P8. (`firestore.indexes.json` sudah disetujui 28 Oktober 2026; jalur pembersihan = Jalur A, proyek baru `imigrasi-database-v2` di `asia-southeast2`.)
2. Domain e-mail akun pegawai, dan MFA untuk Keuangan/Super Admin.
3. Siapa yang boleh memberi peran (rules dan Function saat ini: hanya Super Admin, tidak untuk diri sendiri).
4. Masa simpan arsip (JRA).
5. `pdfjs-dist` dan `tesseract.js` ada di `package.json` tetapi belum tercantum di CLAUDE.md bagian 3. Perlu dikonfirmasi lalu dicatat.
6. **D3:** realisasi MAK dicatat saat SPBy selesai (rancangan sekarang) atau saat verifikasi; dan apakah koreksi nominal Keuangan memperbarui realisasi.
7. **D5:** Keuangan boleh menyunting isi fase berkas pelaksana atau tidak (rules sekarang: **tidak**).
