# CLAUDE.md — Imigrasi Super Web

Aturan kerja untuk semua anggota tim dan untuk Claude Code di akun masing-masing. Baca seluruhnya sebelum mengubah kode.

> Bagian "Alur bisnis" disusun dari **kode** dan `docs/analisis_fase_2.md` (dokumen perencanaan awal, sebagian sudah dikerjakan), bukan dari dokumen resmi.
> Istilah bertanda (?) belum dikonfirmasi pemilik proyek. Koreksi lewat Pull Request bila ada yang keliru.

## 1. Ringkasan proyek

Portal internal **Kantor Imigrasi Kelas II TPI Buleleng** (dulu "TPI Singaraja"; kantornya tetap di kota Singaraja) dengan satu pintu masuk (SSO) ke beberapa aplikasi. Di dokumen, nama kantor selalu "Buleleng"; "Singaraja" hanya untuk kota tempat surat dibuat ("Singaraja, <tanggal>", "Dikeluarkan di"), alamat jalan, dan laman/pos-el kop surat (belum ada info resmi alamat baru).

| Aplikasi                | Folder                     | Isi                                                                               |
| ----------------------- | -------------------------- | --------------------------------------------------------------------------------- |
| SSO                     | `src/modules/sso`          | Login, Portal (kartu menuju aplikasi lain), Profil Saya                           |
| e-Persuratan & Keuangan | `src/modules/e-persuratan` | Persuratan, Nomor Surat, LPJ, MAK. Aplikasi utama                                 |
| Inventory Umum          | `src/modules/inventory`    | Dashboard, Stok Barang (SAKTI), Transaksi masuk/keluar                            |
| Kepegawaian             | `src/modules/kepegawaian`  | Data & foto pegawai, impor CSV, unit kerja, akun, pejabat, master pangkat/jabatan |

Backend: Firebase proyek produksi `imigrasi-database-v2` (Authentication e-mail/password, Firestore `(default)` dan Storage di `asia-southeast2`) dan Cloud Functions Gen 2 di `functions/` (Node 22, region `asia-southeast2`; daftar Function di `docs/skema-database.md` §8). Konfigurasi web di `.env.local` (lihat `.env.example`); pengembangan lokal bisa memakai Firebase Emulator (`VITE_FIREBASE_EMULATOR=true`).
URL: `/login`, `/` (Portal), `/profil`, `/e-persuratan/*`, `/inventory/*`, `/kepegawaian/*`.

**Kepegawaian** menyimpan data per pegawai di `pegawai` (status kepegawaian, NIP, tanggal lahir, pangkat + golongan, jabatan, unit kerja, foto) dan kontak pribadi terpisah di `pegawai_kontak` (alamat, e-mail pribadi, nomor WA; hanya Kepegawaian & pegawai itu sendiri). Bentuk simpanan dibakukan `src/utils/dataPegawai.js`: NIP 18 digit tanpa spasi, WA berawalan `62`, e-mail huruf kecil, golongan `III/c`/`V`. Data bisa diimpor dari CSV (Excel) lewat tombol **Impor CSV** (`kepegawaian/utils/imporPegawai.js`: pratinjau per baris, pemetaan unit, jabatan baru; dicocokkan lewat NIP sehingga aman diulang). **Unit kerja** (`pegawai_unit`) bisa diatur di tab Unit Kerja: kantor → subbagian/seksi → urusan/subseksi; dibaca semua modul lewat `@/context/useUnitKerja` dan menggantikan daftar seksi tetap. Pilihan "Seksi / Bagian" di SPD, Nomor Surat, dan Inventory = label pendek unit bagian (`pilihanSeksi`), dan `pegawai.seksi` = label unit bagian pegawai itu (anggota subseksi ikut seksinya). Setiap pegawai bisa memperbarui kontak pribadinya sendiri di **Profil Saya** (`/profil`, tombol di Portal). Menu **Ulang Tahun** (`/kepegawaian/ulang-tahun`, `pages/UlangTahun.jsx`) menampilkan pegawai yang berulang tahun hari ini (status kejutan & jumlah ucapan) dan yang terdekat (30 hari / 3 bulan / setahun), dan menjadi satu-satunya tempat mengatur kejutan; halaman Data Pegawai tidak memuat pengaturan ulang tahun. Kedua halaman berbagi satu listener daftar pegawai (`hooks/useDaftarPegawai.js`). Menu **Kegiatan & Kehadiran** (`/kepegawaian/kehadiran`, `pages/Kehadiran.jsx`, dari purwarupa `kehadiran-react` di luar repo): tab Absensi Kegiatan (buat kegiatan → isi status Hadir/Cuti/Sakit/Alpa per pegawai → Simpan; dibuka lagi untuk diperbarui) dan Rekap Kehadiran per semester (% hadir = (hadir × 1 + sakit × 0,9 + cuti × 0,8) ÷ kegiatan tercatat; predikat ≥90 Sangat Rajin, ≥80 Rajin, ≥70 Cukup Rajin; riwayat per pegawai; ekspor Excel/PDF). Kehadiran disimpan sebagai peta di `pegawai_kegiatan`, angka rekap dibaca dari `pegawai_rekap_hadir` yang ditulis Function `diKegiatanDitulis`; kegiatan tidak dihapus melainkan dibatalkan dengan alasan, dan kegiatan yang belum diisi tidak dihitung. Tampilan Kepegawaian disusun dari token di `kepegawaian/ui/kelas.js` (gaya purwarupa admin, aksen `GOLD`); form tambah/ubah (pegawai, unit, pejabat, pangkat/jabatan) dibuka dalam `Modal`.

**Inventory** (persediaan ATK Subbag Umum) mengikuti purwarupa `inventory-ui` (di luar repo): Dashboard, Stok Barang (dikelompokkan per kategori SAKTI; Kode SAKTI = kode kategori 10 digit + kode barang 6 digit; impor CSV, ekspor Excel tanpa library di `src/utils/xlsx.js`, dipakai juga Kepegawaian), dan Transaksi (riwayat masuk/keluar, Cetak Terima Barang = bukti serah terima PDF). Sisa stok = stok awal + total masuk − total keluar, dibaca dari ringkasan per tahun `inventory_saldo` yang ditulis Function (tidak mengunduh semua transaksi). Transaksi masuk/keluar **hanya lewat Function** (`catatMasuk`, `catatKeluar`, `ubahTransaksi`, `batalkanTransaksi`; nomor TBR-/TBK- berlanjut lintas tahun, stok minus ditolak) dan tidak dihapus, melainkan dibatalkan dengan alasan. Master (`inventory_kategori`, `inventory_barang`, `inventory_pemasok`) ditulis Umum lewat rules dan dinonaktifkan, bukan dihapus; kode SAKTI dijaga unik oleh `inventory_kode` dan hanya diganti lewat Function `ubahKodeSakti` (juga untuk melengkapi kategori/kode barang). Kode akun kategori (`akunKode`) ikut ekspor Excel Stok Barang untuk SAKTI. Riwayat transaksi dimuat per halaman (`inventory/hooks/useTransaksi.js`). Pengambil barang keluar = pegawai dari `pegawai_ringkas` (`seksi` dari Kepegawaian).

## 2. Alur bisnis LPJ

**LPJ (Laporan Pertanggungjawaban)** = satu **berkas** dokumen keuangan untuk satu kegiatan. Ada dua jenis: **Perjalanan Dinas** dan **Non-Perjalanan Dinas**. Tampilan, perilaku responsif, dan alurnya **mengikuti purwarupa** `e-persuratan-react` (di luar repo; minta ke pemilik proyek bila perlu).

**Model data (`docs/skema-database.md` §5.2):** satu dokumen `lpj_berkas/{id}` per berkas (`jenis`, `uraian`, `tahunAnggaran`, `versi` yang naik setiap simpan; `anggotaUids`, `nomorLpj`, `tahap`, `status` ditulis Function) berisi bagian `sp`, `tte`, `spd`, `lpj`, `laporan` (Perjadin) atau `spby`, `lampiran` (Non-Perjadin). Bagian yang selesai ber-`terkunci: true`, dan rules baru membuka bagian berikutnya setelah bagian sebelumnya terkunci. Subkoleksi: `keuangan/status` (tahap Keuangan), `bukti` (bukti pengeluaran), `riwayat` (ditulis Function). Daftar LPJ, Dashboard, Berkas Verifikasi, dan Arsip membaca **`lpj_ringkas/{id}`** (ringkasan ±1–2 KB yang ditulis Function `diBerkasDitulis`/`diKeuanganDitulis`), bukan berkas lengkap. Status fase dihitung `lpj/utils/lpjLogic.js` (port `lpjLogic.js` purwarupa; juga bekerja pada dokumen ringkas). Akses data lewat `lpj/services/` (`berkasDb.js`, `keuanganDb.js`, `unggahan.js`) dan hook `lpj/hooks/useBerkas.js`; form fase memakai `useFormBerkas` (simpan otomatis hanya bagian yang berubah).

**Perjalanan Dinas** (4 fase, terbuka berurutan; fase berikutnya terkunci sampai fase sebelumnya selesai):

1. **Surat Perintah**: menimbang, dasar (+ teks DIPA dari `mak_dipa` tahun anggaran berkas), Kepada (pegawai), Untuk (poin 1 + poin baku 2–4), pejabat penandatangan (Kepala/PLT/PLH). **Selesai** → final, lalu **TTE Srikandi**: unggah scan + nomor + tanggal surat resmi (semuanya wajib) → SP selesai, nomor SPD mengikuti nomor SP.
2. **SPD**: satu form untuk semua pelaksana (seksi, maksud, alat angkut, tujuan, tanggal, MAK sampai Akun) → Selesai → cetak SPD per pelaksana.
3. **LPJ & SPBy**: tanggal LPJ + detail transaksi (pelaksana · item Akun MAK · jumlah) → pack 7 dokumen (Nota Dinas, Kwitansi, SPTJM/pelaksana, SPBy, Rincian SPBy/pelaksana, Surat Pernyataan Pengeluaran/pelaksana, Nominatif). Selesai lewat Function `selesaikanSpby`: bagian dikunci, nomor LPJ `LPJ-TAHUN-BULAN-NNNN` terbit, dan realisasi dicatat ke `mak_realisasi` + `mak_rekap` (satu transaksi).
4. **Laporan Kegiatan**: isi laporan (A–E, tiap bagian ≤5.000 karakter) + foto (JPG/PNG, dikompres di browser sampai ≤300 KB, maks. 10) → berkas `selesai`.

**Non-Perjalanan Dinas** (2 fase): **SPBy & Rincian Bayar** (tanggal, pelaksana, MAK, uraian, transaksi → SPBy, Nota Dinas, SPTJM/pelaksana, Kwitansi, Lembar Verifikasi; selesai lewat `selesaikanSpby` seperti di atas) → **Lampiran** (Foto Bukti/Produk + Nota Pembayaran, gambar ≤1 MB, maks. 10 per jenis) → berkas `selesai`.

**Aturan alur:**

- "Selesai" pada sebuah fase = **final** (konfirmasi "tidak akan bisa diedit lagi"); belum ada fitur buka kunci.
- Halaman: `lpj/pages/LPJPage.jsx` → Daftar (`/e-persuratan/lpj`), Detail (`/lpj/:id`), form (`/lpj/:id?isi=sp|tte|spd|cetak-spd|lpj|laporan|np|lampiran`). Langkah form dibatasi status kunci (`bolehMasuk` di form).
- Hak akses (ditegakkan rules & Function; pengecekan di React hanya untuk tampilan): **anggota** berkas (`anggotaUids` = pembuat + pelaksana yang punya akun) melihat berkas dan mengubah isi fase selama belum final; Keuangan/Super Admin melihat semua berkas dan mengerjakan tahap Keuangan, tetapi tidak menyunting isi fase. Hapus lewat Function `hapusBerkas`: pembuat untuk draf yang belum bernomor, Super Admin untuk berkas yang belum diarsip (wajib alasan bila sudah bernomor; realisasinya dibatalkan).
- Berkas unggahan disimpan di **Firebase Storage** `lpj/{id}/...` (`lpj/services/unggahan.js` + `@/utils/berkasStorage`, aturan di `storage.rules`); Firestore hanya menyimpan Meta `{ path, nama, ukuran, tipe, diunggahPada, diunggahOleh }` (tanpa URL), dan berkas dibuka lewat `getBlob()`.
- Dokumen PDF: `lpj/utils/dokumenLpj.js` memetakan berkas ke kunci data template di `src/components/SuratPreview/SuratPreviewCanvas.jsx`. Template ada untuk SP, SPD, Nota Dinas, Kwitansi, Nominatif, SPTJM, Rincian SPBy, Surat Pernyataan Pengeluaran Biaya Perjalanan Dinas (per pelaksana; format "Rincian Biaya Perjalanan Dinas" + "Perhitungan SPD Rampung"), Laporan Kegiatan, dan Lembar Verifikasi. Surat Pernyataan Pengeluaran dan Lembar Verifikasi tidak didaftarkan di `SURAT_REGISTRY` (lihat `SURAT_KHUSUS_LPJ` di `dokumenLpj.js`). **SPBy** memakai template "Surat Perintah Bayar" (format kantor); untuk Perjadin, "Untuk Pembayaran" disusun otomatis dari maksud, tujuan, tanggal, nomor & tanggal SP, dan pelaksana (`uraianPembayaranPerjadin`).
- Kartu fase terakhir Detail LPJ **Progres Berkas** (Fase 5 Perjadin / Fase 3 Non-Perjadin, `lpj/components/FaseProgresBerkas.jsx`) hanya-baca dan tidak ikut dihitung di progres dokumen. Isinya dari `keuangan/status`: Verifikasi (Lembar Verifikasi, memakai POK & pejabat yang dibekukan saat verifikasi), Upload SAKTI (`sakti.nomorKwitansi`), Bukti Transfer Bendahara (`transfer.berkas`), dan Arsip (`arsip.berkas`). Semuanya diisi Keuangan lewat Berkas Verifikasi.
- **Berkas Verifikasi** (`/e-persuratan/verifikasi`, Keuangan): tab per tahap Draft → Verifikasi → SAKTI → Transfer → Arsip dari `lpj_ringkas.tahap`; jumlah per tab memakai kueri hitung (tampil "50+" bila ≥50). Tahap Keuangan disimpan di `keuangan/status` dan rules menjaga urutannya; setelah arsip selesai hanya Super Admin yang bisa mengubah. Saat verifikasi selesai, POK dan pejabat dibekukan (`pokBeku`, `pejabatBeku`) untuk Lembar Verifikasi; koreksi nominal disimpan per item asli (`verifikasi.koreksi`).
- **Arsip & DRPP** (`/e-persuratan/arsip`): pelaksana melihat DRPP yang memuat LPJ-nya; Keuangan memindai tiap LPJ sebagai satu dokumen gabungan, lalu mengelompokkannya ke DRPP. DRPP (`lpj_drpp`, nomor `DRPP-TAHUN-NNNN`) dibuat dan diubah daftarnya hanya lewat Function (`buatDrpp`, `ubahDaftarDrpp`); LPJ yang tercantum otomatis masuk begitu diarsip, dan progres/total DRPP dibaca dari field `masuk` (ditulis server). Tidak ada hapus: Super Admin membatalkan DRPP (`batalkanDrpp`, wajib alasan) atau membatalkan arsip sebuah berkas (pindaian lama tercatat di `arsip.dibatalkan`). Pindaian arsip yang sudah selesai tidak bisa diganti langsung (Storage menolak); ganti = batalkan arsip lalu pindai ulang.
- Data pegawai dari `pegawai_ringkas` (`@/context/usePegawaiRingkas`), MAK dari `mak_node` per tahun anggaran (`e-persuratan/useMakTahun.js`), DIPA dari `mak_dipa` (`e-persuratan/useDipa.js`). Isi dokumen resmi menyimpan salinan beku `Orang`. PPK dan Bendahara diambil dari `pegawai_pejabat` (`@/context/usePejabat`, ditetapkan Kepegawaian di tab Pejabat) menurut tanggal dokumen (tanggal LPJ/SPBy; SPD memakai PPK pada tanggal SPD) dan dibekukan ke `pejabatBeku` saat verifikasi selesai; Kepala/PLT/PLH yang ditetapkan menjadi pilihan cepat penandatangan SP. Jangan menyalin `masterData.js` purwarupa (berisi nama yang tampak asli).
- Dashboard e-Persuratan membaca daftar ringkas yang sama (`useDaftarBerkas` lewat `lpj/index.js`); "Aktivitas Terbaru" dari `aktivitasTerakhir` ringkasan (sumbernya subkoleksi `riwayat`, ditulis Function).
- Definisi surat ada di `src/data/surat/*/definition.js` (14 definisi, 13 terdaftar di `src/data/surat/index.js`); dipakai template PDF dan halaman Persuratan.

**Data pendukung:**

- **MAK** (Mata Anggaran Kegiatan (?), kode pembebanan anggaran): pohon `Tahun > Program > Kegiatan > KRO > Output > Komponen > Sub Komponen > Akun > Item` per tahun anggaran di `mak_node` (pagu hanya di tingkat Item), ditambah DIPA per tahun di `mak_dipa`. Diatur di MAK Setup (Keuangan/Super Admin): tambah/ubah lewat rules, hapus lewat Function `hapusNodeMak` (node yang sudah dipakai realisasi dinonaktifkan, bukan dihapus), Salin tahun, dan Impor CSV. Realisasi (`mak_realisasi`) dan rekap per bulan (`mak_rekap`) hanya ditulis Function, di transaksi yang sama dengan `selesaikanSpby`/`hapusBerkas`/Batalkan/Pulihkan. Tampilan MAK Setup dan History MAK **mengikuti purwarupa admin** (`e-persuratan-admin`, di luar repo): Rekap menampilkan Pagu, Realisasi **bulan terpilih**, Sisa, dan %. Batalkan/Pulihkan transaksi hanya untuk Super Admin (Function `batalkanRealisasi`/`pulihkanRealisasi`).
- **Nomor Surat** (halaman "Penomoran Surat Kanim Buleleng", purwarupa admin; **dibuka untuk semua pegawai**): nomor hanya terbit lewat Function `terbitkanNomorSurat` (semua pegawai aktif) ke register `surat_nomor`, dengan format `<kode tiap tingkat digabung titik>-<urut 4 digit>`. Nomor urut **mulai ulang tiap tahun** (penghitung `sistem_penghitung/surat_{tahun}` menurut tahun tanggal surat) dan dipakai bersama form "Tambah Nomor Surat" (`sumber: 'register'`) serta tombol Generate di SuratForm (`sumber: 'form'`). Tab **Daftar Nomor** (register per tahun; Edit keterangan oleh pemohon/Keuangan, Batalkan oleh Keuangan, tanpa hapus), **Riwayat Surat** (sumber `form`, dan nomor SP ber-TTE dari LPJ `sumber: 'srikandi'` yang dicatat Function saat TTE terkunci), **Hierarki Kode** (Keuangan; pohon `KOP > Kode surat 1 > 2 > 3` di `surat_kode`, kode tidak dihapus tetapi dinonaktifkan), dan **Pengaturan** (Keuangan; nomor terakhir per tahun lewat Function `aturPenghitung`, wajib alasan, tidak bisa di bawah nomor yang sudah terbit). Isi surat dari SuratForm tidak disimpan di database.
- **Peran pengguna**: kode `superadmin`, `keuangan`, `kepegawaian`, `umum` (label tampilan Super Admin/Keuangan/Kepegawaian/Umum; tanpa peran khusus = Pegawai). Satu pegawai bisa punya beberapa peran. Peran disimpan sebagai _custom claims_ `{ peran, aktif, pegawaiId, wajibGantiSandi }` di token login dan **hanya** diubah Cloud Function `aturPeran` (Super Admin saja, tidak untuk diri sendiri); field `pegawai.peran` hanya cermin tampilan. Keuangan = e-Persuratan (`ProtectedRoute requireRole="keuangan"`) termasuk MAK, Kepegawaian = modul Kepegawaian (data & foto pegawai, impor CSV, unit kerja, buat akun, atur ulang sandi, nonaktifkan, kegiatan & kehadiran, pejabat penandatangan, reset kejutan ulang tahun), Umum = Inventory; Super Admin memiliki semua hak. `src/context/AuthContext.jsx` membaca claims (`isKeuangan`, `isKepegawaian`, `isUmum`, `isSuperAdmin`, `punyaPeran()`, `statusAkun`, `wajibGantiSandi`); konstanta & label di `src/utils/peran.js`. Akun dibuat lewat Function `buatAkunPegawai` (kata sandi sementara, wajib diganti di `/ganti-sandi`); pegawai yang lupa kata sandi diberi kata sandi sementara baru lewat tombol **Atur ulang sandi** di Data Pegawai (Function `aturUlangSandi`; akun yang punya peran yang tidak dimiliki pemanggil hanya oleh Super Admin). Hasil kata sandi sementara bisa disalin bersama e-mail dan alamat login sebagai pesan siap kirim; Super Admin pertama lewat `functions/scripts/seedSuperAdmin.js`. Daftar seksi (`seksi` pegawai, SPD, Nomor Surat, Inventory) berasal dari unit kerja (`@/context/useUnitKerja`), bukan daftar tetap.

**Istilah:** SPD = Surat Perjalanan Dinas · SPBy = Surat Permintaan Bayar · SPB = Surat Perintah Bayar · SPTJM = Surat Pernyataan Tanggung Jawab Mutlak · PPK = Pejabat Pembuat Komitmen · KRO = Klasifikasi Rincian Output (?) · Kanim = Kantor Imigrasi.

## 3. Library yang boleh dipakai

Hanya ini. **Dilarang menambah library baru (dependencies maupun devDependencies) tanpa persetujuan pemilik proyek.** Bila merasa perlu, jelaskan alasannya di Issue/PR dan tunggu persetujuan.

- **Runtime:** `react`, `react-dom`, `react-router-dom`, `react-icons` (hanya `react-icons/fa`), `firebase`, `@react-pdf/renderer`
- **Styling:** `tailwindcss`, `@tailwindcss/postcss`, `postcss`, `autoprefixer`
- **Build:** `vite`, `@vitejs/plugin-react`
- **Kualitas kode:** `eslint`, `@eslint/js`, `globals`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `eslint-config-prettier`, `prettier`
- **Tipe untuk editor:** `@types/react`, `@types/react-dom` (tidak ada TypeScript di proyek ini)
- `functions/` adalah paket terpisah dengan dependensi sendiri (`firebase-admin`, `firebase-functions`). Penulisan Cloud Functions **Gen 2** sesuai `docs/skema-database.md` §8 sudah disetujui (27 Oktober 2026); menambah dependensi lain di `functions/` tetap butuh persetujuan.

Gunakan API bawaan browser/JavaScript untuk kebutuhan kecil (tanggal, format angka, dll.) sebelum berpikir menambah library.

## 4. Struktur folder dan batas modul

```
src/
  main.jsx  App.jsx         router utama
  modules/
    sso/                    Login, Portal
    e-persuratan/
      dashboard/            Dashboard tugas LPJ
      lpj/                  berkas LPJ (daftar/detail/form), Berkas Verifikasi, Arsip & DRPP
      surat-keluar/         Persuratan (kartu, alur, form), Nomor Surat Kanim
      data-master/          MAK Setup, History MAK
      makPohon.js, useMakTahun.js, useDipa.js, useRekapMak.js
                            MAK & DIPA bersama untuk lpj dan data-master
      AppModule.jsx         rute + menu aplikasi e-Persuratan
    inventory/              Stok Barang, Transaksi
    kepegawaian/            Pegawai
  components/               komponen BERSAMA (Sidebar, SuratPreview, Modal, ToastViewport,
                            StrukturHierarki = Pohon/Explorer/Kolom untuk MAK & kode surat)
  layouts/                  AppLayout
  data/surat/               definisi jenis surat + registry
  utils/  config/  context/ helper, firebase + koleksi.js (nama koleksi/jalur Storage), AuthContext
docs/                       skema database, rencana keamanan & pembersihan Firebase, analisis
functions/                  Cloud Functions (paket Node terpisah; src/ per domain)
scripts/                    uji rules & Functions di Firebase Emulator
```

Struktur di dalam modul **dianjurkan** (`pages/`, `components/` khusus modul, `hooks/`, `data/`, `index.js` sebagai API publik); buat subfolder sesuai kebutuhan. Aplikasi memakai `AppModule.jsx` untuk rute dan menu.

**Aturan:**

1. **Kerjakan hanya di folder modul yang ditugaskan kepada Anda** (lihat `CONTRIBUTING.md`). Jangan mengedit modul lain. Jika perubahan di modul lain diperlukan, minta pemilik modul itu atau buka Issue.
2. Modul **tidak boleh saling mengimpor**, kecuali di dalam `e-persuratan` dan hanya lewat `index.js`: `dashboard → lpj` dan `surat-keluar → lpj`. Berkas di akar `e-persuratan/` (pembantu MAK & DIPA) boleh dipakai semua submodul e-Persuratan. ESLint (`no-restricted-imports`) menangkap pelanggaran, baik impor beralias (`@/modules/...`) maupun relatif (`../../lpj/...`), jadi `npm run lint` gagal bila dilanggar.
3. Kode yang dipakai lebih dari satu modul ditaruh di `src/components`, `src/utils`, `src/data`, dst. (wajib disebut di PR, lihat bagian 6).
4. Impor lintas folder memakai alias `@/` (mis. `@/config/firebase`). Di dalam satu modul boleh relatif.
5. Jangan mengubah `firebase.json`, `firestore.indexes.json`, `vercel.json`, dan `.github/workflows/` tanpa persetujuan. `functions/` boleh diubah untuk Cloud Functions Gen 2 sesuai rencana (lihat bagian 3).

## 5. Konvensi kode

- **Function component + hooks.** Tanpa class component (kecuali error boundary di `main.jsx`).
- **Nama file komponen PascalCase** (`PackDetail.jsx`). Hook `useNamaHook.js`, helper `camelCase.js`. Satu komponen utama per file.
- **Styling hanya dengan Tailwind CSS.** Jangan menambah CSS manual, `style={{}}`, atau `<style>` baru. Pengecualian: komponen `@react-pdf/renderer` memakai `StyleSheet` karena PDF tidak mendukung Tailwind.
- **Warna & font mengikuti purwarupa** (halaman LPJ, Dashboard, MAK Setup, History MAK, dan Nomor Surat e-Persuratan): token warna purwarupa (terang/gelap) tersedia sebagai kelas Tailwind di `src/utils/uiTokens.js` (`T`, `NAVY`, `GOLD`, `STATUS`, `FORM`, `BTN`, `LAYOUT`, dan `ADMIN` untuk halaman bergaya purwarupa admin) — pakai itu, jangan menulis ulang kode warna. Notifikasi memakai `showToast` (`src/utils/toastStore.js`) + `<ToastViewport />`, bukan `alert()`; jendela memakai `src/components/Modal.jsx`. Navy `#0f2040` untuk tombol aksi utama, gradien `from-[#0f2040] to-[#1e4080]` untuk kartu judul. Font Inter / Plus Jakarta Sans / IBM Plex Mono (dimuat di `index.html`) lewat `FONT.*`. Lebar dinamis (bilah progres) memakai `<progress>` atau atribut SVG, bukan `style`. Jangan menggabungkan dua kelas latar/warna yang bentrok (mis. `FORM.card` + `bg-...`); pilih token yang sesuai (`FORM.cardMuted`). Sidebar dan aplikasi lain masih `slate-800` (`#1e293b`). Mode gelap memakai varian `dark:`. Aplikasi Kepegawaian memakai aksen amber (`APP_ACCENTS` di `src/utils/appAccents.js`).
- **Teks antarmuka dalam Bahasa Indonesia** (label, tombol, pesan error, placeholder). Nama variabel/fungsi boleh Indonesia atau Inggris, ikuti file sekitarnya.
- Komponen baru harus responsif (mobile dan desktop) dan mendukung mode gelap.
- **Animasi: halus, ringan, hemat.** Tujuannya membuat aksi terasa hidup (umpan balik), bukan hiasan.
  - Transisi sederhana (muncul/hilang, hover, buka/tutup) cukup kelas Tailwind (`transition-*`, `duration-*`, `ease-*`, `animate-*` bawaan); tanpa library animasi, `style={{}}`, atau `@keyframes` baru. Animasi saat elemen pertama kali muncul memakai varian `starting:` (CSS `@starting-style`), mis. `motion-safe:starting:opacity-0 motion-safe:starting:scale-90`. **Pakai kelas siap pakai `ANIM` di `src/utils/animasi.js`** (`muncul`, `pudar`, `geserKiri`/`geserKanan`, `meletup`, `popover`, `latar`, `popup`, `tekan`, + `jedaKe(i)` untuk muncul berurutan) sebelum menulis kelas sendiri. `Modal` sudah beranimasi secara bawaan (`animasi={false}` untuk mematikan); popup buatan sendiri memakai `ANIM.latar` + `ANIM.popup`. Isi tab dibungkus `<div key={tab} className={ANIM.muncul}>`. **`jedaKe(i)` mengatur `transition-delay` untuk semua transisi elemen**, jadi jangan dipasang pada elemen yang juga punya efek sorot/hover bertransisi (efeknya ikut tertunda); untuk daftar kartu bersorot pakai `useMunculBerurutan(kunci)` dari `@/components/animasi` (ref pada wadah + `data-bertahap` pada kartu, diulang saat `kunci` berubah).
  - Animasi bertahap (beberapa langkah, mis. animasi hapus) memakai **Web Animations API** bawaan browser (`element.animate()`), dikumpulkan di berkas pembantu animasi (`src/utils/animasi.js` untuk semua modul, dan `e-persuratan/animasiHalaman.js` untuk perpindahan halaman). Hanya di berkas itu JavaScript boleh mengatur `element.style` (posisi elemen bayangan yang diterbangkan); komponen tetap tanpa `style={{}}`.
  - Animasikan `opacity` dan `transform` (translate/rotate/skew/scale) saja. Untuk membuka/menutup tinggi baris pakai trik grid `grid-rows-[1fr]` ↔ `grid-rows-[0fr]` + anak `overflow-hidden min-h-0`; jangan menganimasikan `height`, `width`, `top`, atau `margin`.
  - Durasi 150–300 ms, `ease-out`. Pengecualian: umpan balik aksi penting yang "lucu" (mis. hapus) boleh sampai ±1 detik selama tidak menahan pengguna. Animasi berulang (loop) hanya untuk indikator memuat (`animate-spin`/`animate-pulse`) dan **tombol** yang perlu menarik perhatian pengguna (mis. "Buat Sekarang" di Detail LPJ). Syarat untuk tombol: gerakannya tetap halus (`opacity`/`transform`, mis. denyut, riak, kilau), ada jeda antar-ulangan (±2 detik atau lebih, bukan bergerak tanpa henti), dipasang lewat `motion-safe:`/`kurangiGerakan()`, dan tidak dipasang pada banyak tombol sekaligus dalam satu layar. Pakai `animate-*` bawaan Tailwind atau Web Animations API (`iterations: Infinity`) di berkas pembantu animasi, tanpa `@keyframes` baru. Contoh: `lpj/components/TombolBuat.jsx`.
  - Gerakan di dalam wadah yang bisa digulir (mis. tabel `overflow-x-auto`) tidak boleh memunculkan bilah gulir sesaat: beri wadahnya `overflow-y-hidden` (atau `overflow-*-clip`), atau gerakkan elemen di dalam anak `overflow-hidden`; elemen yang terbang bebas ditaruh `position: fixed` di `body`.
  - Hormati pengaturan "kurangi gerakan": gerakan dipasang lewat `motion-safe:`, dan animasi JavaScript dilewati bila `prefers-reduced-motion` aktif (`kurangiGerakan()`).
  - Aksi yang menghapus/memindahkan data: jalankan animasi keluar dulu, baru ubah data; bila gagal, kembalikan tampilan dan tampilkan toast. Untuk baris form/daftar kecil pakai `hapusBaris(el, ubah, { geser })` dari `@/utils/animasi` (baris keluar, baris berikutnya naik halus; `geser: false` untuk chip/kisi). Tidak ada lagi stempel perayaan di tengah layar (`rayakan()` sudah dihapus); umpan balik momen penting cukup toast + gulir pintar ke hasilnya. Pindah langkah form: isi langkah dibungkus `<div key={step}>` dengan `ANIM.geserKiri` (maju) / `ANIM.geserKanan` (mundur).
  - Perpindahan halaman e-Persuratan: `e-persuratan/TransisiHalaman.jsx` membungkus `<Routes>` di `AppModule.jsx` (geser dari kanan saat masuk lebih dalam, dari kiri saat kembali, naik-memudar saat pindah menu; halaman tidak dipasang ulang). Karena itu `Modal` dan `ToastViewport` dirender lewat portal ke `body`; elemen `position: fixed` baru sebaiknya juga memakai portal.
  - **Gulir pintar e-Persuratan** (`e-persuratan/gulirPintar.js`): setelah satu langkah, layar diarahkan ke langkah berikutnya. Halaman baru dibuka dari atas; kembali ke halaman sebelumnya memulihkan posisi gulirnya (`TransisiHalaman`, kecuali navigasi membawa `state`). Validasi gagal → `gulirKeGalat(akar)` menuju isian bertanda `data-galat` (otomatis pada `lpj/ui/Field` ber-`err`) atau `aria-invalid="true"`, lalu setelah gulir berhenti isian itu disapu kilau sekali (`kilauSekali` di `@/utils/animasi`); di form LPJ cukup `if (ctx.tandaiGalat(e)) return;`. Form LPJ kembali ke Detail lewat `ctx.keDetail()` (Detail menggulir ke kartu fase langkah itu + sorotan); buka Detail dengan `state: { sorot: 'aktif' }` untuk menuju fase yang sedang berjalan. Hasil baru di daftar/tombol lanjutan memakai `gulirDanSorot(() => elemen)`; tabel berhalaman lewat `Pager` sudah menggulir ke awal tabel.
  - Komponen bersama `@/components/animasi`: `Lipat` (buka/tutup tinggi, juga dipakai menutup celah baris), `AngkaBerjalan` (angka statistik/rupiah naik ke nilai baru), dan `useDariTombol` (popup "Lihat" tumbuh dari tombol pembukanya, isinya muncul bertahap, lalu mengecil kembali ke tombol saat ditutup; untuk `Modal` cukup `<Modal dariTombol>`). Halaman yang dibuka dari tombol (mis. "Buat Sekarang/Edit/Upload" di Detail LPJ → form) memakai `useMekarDariTombol()` pada kartu halaman tujuan + atribut `data-mekar` pada tombolnya: kartu "mekar" dari tombol lalu isinya muncul bertahap. Halaman detail memakai `munculBerurutan(wadah)` dari `@/utils/animasi`: elemen bertanda `data-bertahap` muncul satu per satu dari atas ke bawah saat data pertama tampil (contoh: `PackDetail.jsx`). Toast masuk melenting dan keluar memudar (`toastStore` menandai `keluar` sebelum dibuang).
  - Pola yang sudah ada di Daftar LPJ: `Lipat` dan `src/utils/animasi.js` — `animasiHapus()` saat menghapus (kebalikan animasi masuk, bernuansa merah: glitch merah → baris luruh kiri → kanan menjadi debu piksel merah di belakang garis pemindai merah → celah menutup dan baris di bawahnya terbentur) dan `animasiMasuk()` saat berkas dibuat (ruang dibuka, lalu baris terbentuk kiri → kanan bergaya siber: garis pemindai + partikel warna aplikasi yang tersedot menyatu, diakhiri glitch singkat). Warna animasi memakai warna dasar aplikasi (navy `#0f2040`, biru `#2A78D6`/`#7DB6F3`, emas `#C9973B`); merah (`#A62D2D`/`#E05252`/`#F19191`) khusus untuk aksi hapus.
- Jangan menambah `console.log` ke kode yang di-commit.
- Format ditangani Prettier. Format hanya file yang Anda ubah (`npx prettier --write <file>`); `npm run format` memformat seluruh proyek.
- Placeholder di preview PDF memakai tanda kurung siku (mis. `[NAMA PPK]`, `[Nama Pejabat]`); bentuknya belum seragam.

## 6. Aturan Git

- **Jangan commit atau push langsung ke `main`.** Kerjakan di branch, lalu buka Pull Request.
- Nama branch: `fitur/nama-fitur` atau `perbaikan/nama-bug` (huruf kecil, pisah dengan `-`).
- **Jalankan `npm run lint` sebelum commit** (harus 0 error) dan `npm run build` sebelum membuka PR.
- CI GitHub Actions (`.github/workflows/ci.yml`) menjalankan lint, build, audit dependensi produksi (`scripts/cek-audit.mjs`, K36 dikecualikan), dan semua uji Emulator di setiap PR serta push ke `main`. PR digabung hanya bila CI hijau.
- Pesan commit: `<jenis>(<modul>): <ringkasan>`, jenis = `fitur` | `perbaikan` | `gaya` | `refaktor` | `dokumen` | `chore`. Contoh: `perbaikan(lpj): angka progres tidak ter-update`.
- **Perubahan pada kode bersama dan `CLAUDE.md` wajib disebutkan di deskripsi Pull Request**: `src/components/`, `src/layouts/`, `src/utils/`, `src/config/`, `src/context/`, `src/data/`, `src/App.jsx`, `AppModule.jsx` e-Persuratan, `package.json`, konfigurasi, dan `CLAUDE.md`. Perubahan itu memengaruhi semua modul dan semua anggota tim.
- Jangan `git push --force`, `git reset --hard`, atau menghapus branch orang lain.

## 7. Aturan keamanan

- **Dilarang** menaruh data asli pegawai/pemohon (nama, NIP, alamat, telepon, e-mail pribadi, dokumen), **password**, atau **API key/secret** di kode, komentar, contoh, atau commit.
- Gunakan **data dummy yang jelas palsu** (mis. `Budi Contoh`, NIP `000000000000000000`).
- Konfigurasi rahasia hanya lewat **file `.env`** (tidak di-commit; contoh nilai di `.env.example`). Variabel Vite harus berawalan `VITE_`.
- Proyek Firebase lama (`imigrasi-database`) berstatus **pengembangan bersama**, hanya berisi **data uji**, dan dihapus saat go-live (`docs/rencana-pembersihan-firebase.md`). **Jangan pernah memasukkan data asli ke sana**, dan jangan menghapus atau mengubah data uji milik anggota lain (lihat README). Proyek produksi `imigrasi-database-v2` dipakai aplikasi; uji fitur dan rules dijalankan di Emulator (proyek `demo-imigrasi`), bukan di produksi.
- Jangan menempelkan isi `.env`, token, atau data produksi ke chat/Issue/PR. Jika kredensial tidak sengaja ter-commit, laporkan segera ke pemilik proyek agar diganti (menghapus commit saja tidak cukup).

### 7.1 Database & keamanan Firebase (wajib untuk semua kode)

Acuan:

- `docs/skema-database.md`: struktur data, **satu-satunya acuan**.
- `firestore.rules` dan `storage.rules`: penegaknya.
- `scripts/uji-rules.mjs`: uji rules di Emulator.
- `docs/rencana-keamanan-efisiensi-firebase.md`: temuan K#/E# dan urutan kerja P0–P8.
- `docs/rencana-pembersihan-firebase.md`: langkah Console.

**Keputusan pemilik proyek (27 Oktober 2026):**

- Seluruh Firebase dibersihkan **sekarang**, tanpa cadangan dan tanpa migrasi, dan struktur database dirombak total. Semua modul sudah ditulis ulang untuk struktur baru (P0–P7, lihat bagian 9). **Jangan** menulis kode transisi atau kompatibilitas untuk bentuk data lama.
- Cloud Functions Gen 2 diizinkan.
- MAK ditulis **Keuangan** (+ Super Admin).
- Nomor surat diterbitkan **semua pegawai aktif** lewat Function `terbitkanNomorSurat`.

**Skema**

- Ikuti `docs/skema-database.md` persis. Koleksi, field, path Storage, atau Function yang baru atau berubah wajib diperbarui **dalam PR yang sama** di empat tempat:
  - skema;
  - `firestore.rules`/`storage.rules`;
  - `src/config/koleksi.js`;
  - kasus uji izin/tolak di `scripts/uji-rules.mjs`.

  Uji dijalankan di Emulator (`firebase emulators:start --only firestore,storage --project demo-imigrasi`, lalu `node scripts/uji-rules.mjs`), dan hasilnya disebut di PR.

- Nama koleksi `<domain>_<entitas>`, `snake_case`, Bahasa Indonesia. Field `camelCase` Bahasa Indonesia tanpa pengecualian.
- Nama koleksi dan path Storage hanya diambil dari `KOLEKSI`/`JALUR_BERKAS` (`src/config/koleksi.js`), tidak ditulis sebagai teks di komponen. Akses Firestore/Storage lewat `services/` modul, bukan langsung dari komponen.
- Nama lama (`MAK`, `MAK_History`, `lpj_packs`, `drpp`, `counters`, `settings`, `userSettings`, `nomor surat kanim`, `surat_dokumen`, dan lainnya; daftar lengkap di skema §6) **tidak boleh** dipakai di kode baru, karena rules menolaknya.
- Konvensi nilai:
  - uang = bilangan bulat rupiah;
  - tanggal bisnis = `'YYYY-MM-DD'`;
  - waktu kejadian = `Timestamp`;
  - tahun anggaran = `tahunAnggaran: int`;
  - referensi antardokumen lewat ID, dengan salinan beku `Orang` hanya di isi dokumen resmi yang dicetak;
  - ID dokumen tidak memakai e-mail, NIP, atau nama.

**Akses & peran**

- **Browser bukan penjaga.** Pengecekan peran/kepemilikan di React (`ProtectedRoute`, `isKeuangan`, tombol disembunyikan) hanya untuk tampilan. Setiap aturan "siapa boleh apa" wajib ditegakkan di rules atau Cloud Function.
- Peran **hanya** dibaca dari _custom claims_ `{ peran, aktif, pegawaiId }`, dengan kode `superadmin`/`keuangan`/`kepegawaian`/`umum`. Jangan membaca peran dari dokumen dan jangan mengenali pengguna lewat e-mail. Jangan menulis e-mail, uid, atau peran tertentu langsung di kode.
- Akun, peran, nomor resmi (LPJ, DRPP, surat, TBR/TBK), realisasi anggaran, ringkasan/rekap, penghitung, dan log **hanya** ditulis Cloud Function (skema §8), tidak pernah dari browser.

**Menulis data**

- Field jejak: `dibuatPada`/`diubahPada` = `serverTimestamp()`, dan `dibuatOleh`/`diubahOleh` = uid login. Bukan `Date.now()`/`new Date().toISOString()`, bukan nama/e-mail.
- Data keuangan, arsip, persediaan, pegawai, dan master **tidak dihapus fisik**. Pakai `status: 'batal'`/`aktif: false` + alasan.
- Penulisan yang harus konsisten memakai satu transaksi/batch. Dokumen yang disunting bersama (`lpj_berkas`) menaikkan `versi` setiap simpan.
- Unggah dulu, simpan metadata, baru hapus berkas lama. Bila simpan gagal, hapus berkas yang baru diunggah.
- Daftar Meta di dalam berkas LPJ (`laporan.foto`, `lampiran.foto`, `lampiran.nota`) ditambah **satu Meta per simpan** (`arrayUnion`); rules hanya memeriksa isi yang baru masuk, jadi menambah dua sekaligus ditolak. Melepas bebas.
- Batas panjang teks dan jumlah daftar diambil dari konstanta bersama yang angkanya sama dengan rules. Simpan otomatis hanya mengirim bagian yang berubah (dot-path).
- Rules dibatasi **1.000 ekspresi per permintaan**. Untuk dokumen besar, hitung `berubah()` sekali dengan `let` dan periksa hanya field yang berubah (contoh: `ubahBerkasSah` di `firestore.rules`); kasus uji izin yang tiba-tiba ditolak dengan pesan "maximum of 1000 expressions" berarti aturannya perlu dihemat.

**Membaca data**

- Setiap kueri daftar wajib `limit()` dengan batas sesuai skema §9; rules menolak kueri tanpa `limit`. Saring `tahunAnggaran`/`tahun` (+ status/tahap), dan pakai `startAfter` untuk halaman berikutnya.
- Data yang dipakai banyak halaman (ringkas berkas, pegawai ringkas, MAK per tahun) dibaca **satu kali lewat provider bersama**. Hook listener dipasang di komponen yang menampilkannya (mis. per tab).
- Angka rekap dibaca dari dokumen yang ditulis Function (`mak_rekap`, `inventory_saldo`, `lpj_ringkas`), bukan dengan mengunduh semua dokumen lalu menjumlah di browser.
- Di luar modul Kepegawaian, data pegawai dibaca dari `pegawai_ringkas`.
- Setiap `onSnapshot`/`getDocs` punya penanganan galat yang mematikan loading dan menampilkan `showToast` ("Tidak punya akses atau gagal memuat").

**Berkas (Storage)**

- Simpan metadata `{ path, nama, ukuran, tipe, diunggahPada, diunggahOleh }`, **bukan** `getDownloadURL()`. Buka berkas lewat `getBlob()`/`getBytes()`.
- Path dan nama berkas mengikuti skema §7 (`{epochMs13}-{namaAman}`). Unggah ulang ke path yang sama ditolak.
- Tipe hanya JPEG/PNG/PDF (tanpa SVG), batas ukuran per folder, gambar dikompres di browser sebelum unggah, dan beri `cacheControl: 'private, max-age=31536000, immutable'`.
- Jangan memuat URL ke `<iframe>` tanpa `sandbox`. Satu-satunya pengecualian (keputusan K26): bingkai pratinjau/cetak PDF (`lpj/components/PdfGabunganModal.jsx`, `cetakBlob` di `lpj/utils/cetakPdf.js`, `PDFViewer` @react-pdf) yang hanya memuat `blob:` PDF buatan aplikasi sendiri, karena `sandbox` memblokir penampil PDF browser dan cetak. URL Storage dan situs luar tidak pernah dimuat di bingkai.

**Klien & alat kerja**

- Dilarang `dangerouslySetInnerHTML`, `innerHTML`, `eval`/`new Function` dengan data dari Firestore atau masukan pengguna.
- Jangan menyimpan data pribadi atau isi berkas di `localStorage`/`sessionStorage`; cache di memori dibersihkan saat logout.
- Pesan galat untuk pengguna tidak memuat _stack trace_ di produksi (`import.meta.env.DEV`).
- Jangan menambah izin luas, hook persetujuan otomatis, atau path lokal pribadi ke `.claude/settings.json` bersama; taruh di `.claude/settings.local.json`. File tim hanya mengizinkan `npm run …`, Prettier/ESLint, dan git baca-saja, serta melarang `firebase deploy`, `curl`, membaca `.env`, dan `npm audit fix --force`.
- `firebase deploy` hanya oleh pemilik proyek, dan selalu dengan `--only`. Jangan menjalankan `npm audit fix --force`.
- Header keamanan ada di `vercel.json`: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (kamera hanya situs sendiri), dan **CSP mode laporan** (`Content-Security-Policy-Report-Only`; pelanggaran hanya tercatat di Console, belum memblokir). Sumber luar baru (skrip, font, API, bingkai) wajib ditambahkan ke CSP di PR yang sama. HSTS dipasang Vercel otomatis.
- Berkas biner (installer, arsip) tidak disimpan di git. Installer Agen Scanner dirilis sebagai lampiran GitHub Release `agen-scanner-v<versi>` (lihat `e-persuratan/scanner/data/agen.js`).

**Checklist PR yang menyentuh Firestore/Storage/Functions:**

- skema, rules, `koleksi.js`, dan uji diperbarui;
- `node scripts/uji-rules.mjs` lulus;
- kueri memakai `limit`;
- listener punya penanganan galat;
- jejak waktu dan pelaku dari server;
- tidak ada hapus fisik data keuangan;
- batas ukuran teks dan berkas;
- tidak menyimpan `url`;
- indeks baru dicatat (persetujuan pemilik proyek).

## 8. Perintah

```bash
npm install          # pasang dependensi
npm run dev          # jalankan lokal (http://localhost:5173)
npm run lint         # ESLint, harus 0 error sebelum commit
npm run build        # build produksi ke dist/
```

Node `^20.19.0 || >=22.12.0` (lihat `engines` di `package.json`; `.nvmrc` memakai 22). Cloud Functions memakai Node 22 (`functions/package.json`). Firebase Emulator butuh Java 21 untuk Firebase CLI terbaru; dengan Java 11 pakai sementara `npx firebase-tools@13.35.1 emulators:start …`.

Uji di Emulator (proyek `demo-imigrasi`, tidak menyentuh cloud): `node scripts/uji-rules.mjs` (rules Firestore & Storage), `node scripts/uji-lpj.mjs` (alur LPJ, DRPP, MAK, nomor surat, Inventory), dan `node scripts/uji-functions.mjs "<akar repo>"` (akun, peran, pegawai ringkas). Emulator yang dibutuhkan dan cara menyalakannya ada di kepala tiap skrip. Cara paling mudah menjalankan semuanya sekaligus sama dengan CI: buat konfigurasi Emulator seperti langkah "Konfigurasi Emulator sementara" di `.github/workflows/ci.yml`, lalu `FUNCTIONS_DISCOVERY_TIMEOUT=60 npx -y firebase-tools@13.35.1 emulators:exec --only auth,firestore,storage,functions --project demo-imigrasi --config <berkas itu> "node scripts/uji-lpj.mjs && node scripts/uji-functions.mjs <akar repo> && node scripts/uji-rules.mjs"` (urutan ini penting). Audit dependensi: `node scripts/cek-audit.mjs`.

## 9. Utang teknis yang sudah diketahui (jangan dianggap bug baru)

**Keamanan (prioritas tinggi):** daftar lengkap temuan terverifikasi (K1–K36, E1–E11) dan urutan perbaikannya ada di `docs/rencana-keamanan-efisiensi-firebase.md`; ringkasan terpenting:

- **Semua modul sudah mengikuti skema baru** (`docs/skema-database.md`; rules Firestore & Storage lulus 258 kasus uji di Emulator dan menolak bentuk data lama, termasuk memeriksa Meta yang masuk ke daftar foto/lampiran dan `tte.scan`): identitas & peran (P1: claims, Function akun/peran/status, `/ganti-sandi`), LPJ + Berkas Verifikasi + Arsip & DRPP (P3), MAK (P4), Persuratan & Nomor Surat (P5), Inventory (P6), serta Kepegawaian & SSO (P7: foto pegawai + thumbnail, kejutan & ucapan ulang tahun, pejabat penandatangan). P8 (header keamanan, CI, pengaturan Claude tim, installer di GitHub Releases) sudah dikerjakan.
- **CSP masih mode laporan.** Tegakkan (ganti ke `Content-Security-Policy`) setelah login, App Check, kejutan ulang tahun (kamera), pratinjau & cetak PDF, Scanner, dan OCR dicoba di produksi tanpa pelanggaran di Console.
- Installer Agen Scanner belum ditandatangani Authenticode (perlu sertifikat penandatangan kode); SHA-256-nya dicantumkan di catatan GitHub Release. Daftar _origin_ tetap dan token pasangan agen (K11) ada di kode agen, di luar repo ini.
- **Deploy:** rules, indeks, dan semua Function fondasi P0–P8 sudah terpasang di produksi (28 Okt 2026). Perubahan rules/Function sesudahnya baru berlaku setelah pemilik proyek men-deploy ulang (`firebase deploy --only firestore`, `--only functions`); urutan aman = deploy backend dulu, baru merge PR (Vercel men-deploy `main` otomatis).
- **Belum ada pemisahan pengembangan dan produksi.** Langkah pembuatan proyek produksi baru dan penghapusan proyek lama ada di `docs/rencana-pembersihan-firebase.md`.

**Alur dan data:**

- Teks DIPA di template PDF Nota Dinas (`SuratPreviewCanvas.jsx`) masih ditulis mati ("Nomor SP DIPA-137.03.2.92951/202… tanggal 01 Desember 2025"), padahal Surat Perintah LPJ sudah memakai `mak_dipa`.
- Template PDF Surat Perintah selalu mencetak jabatan "Kepala Kantor…" walaupun pejabat yang dipilih PLT/PLH.
- PPK/Bendahara yang belum ditetapkan di Kepegawaian tetap tampil sebagai placeholder di PDF; Berkas Verifikasi memperingatkan sebelum Lembar Verifikasi dibekukan tanpa nama.
- `anggotaUids` berkas dan DRPP dihitung ulang saat dokumennya berubah: pelaksana yang baru dibuatkan akun setelah itu belum bisa membuka berkas lamanya sampai berkas itu disimpan lagi.

**Lain-lain:**

- Tidak ada route 404/catch-all: URL yang tidak dikenal menampilkan halaman kosong.
- Bila konfigurasi `.env`/`.env.local` kosong, `src/config/firebase.js` melempar error sebelum React dimuat sehingga yang tampak halaman putih (pesan hanya di Console).
- Kelas `custom-scrollbar` dan `no-scrollbar` dipakai di banyak file tetapi tidak didefinisikan di CSS mana pun (tidak berefek).
- `npm run lint` masih menampilkan ±30 peringatan (variabel tak terpakai, dependensi `useEffect`). Boleh dibersihkan bertahap di modul Anda sendiri.
- Ukuran bundel JS besar (±3 MB); belum ada code-splitting.

## 10. Untuk Claude Code

- Di awal sesi, pastikan Anda tahu modul yang ditugaskan kepada pengguna. Jika belum jelas, **tanyakan dulu**.
- Ubah file hanya di modul itu. Untuk kode bersama, `CLAUDE.md`, `package.json`, atau konfigurasi: minta konfirmasi pengguna dan ingatkan agar dicatat di PR.
- Jangan menambah library, jangan menaruh rahasia atau data asli, jangan commit ke `main`.
- Sebelum menyatakan selesai: `npm run lint` dan `npm run build` harus lolos.
- Jangan mengubah tampilan atau perilaku di luar yang diminta.
