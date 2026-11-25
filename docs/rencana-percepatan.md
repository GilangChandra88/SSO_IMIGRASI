# Rencana Percepatan Web

> Status: **dikerjakan bertahap** (disusun 2026-11-25; Tahap 1–4 & 7 selesai; Tahap 5 ditunda, Tahap 6 dilewati di branch `fitur/percepatan`). Setiap tahap berdiri sendiri: satu branch, satu PR, bisa diuji dan dibatalkan tanpa menunggu tahap lain.

## Tujuan

Web terasa cepat saat **dibuka** dan saat **dipakai**:

| Ukuran                                                  | Sekarang (diukur 2026-11-25)                      | Target                              |
| ------------------------------------------------------- | ------------------------------------------------- | ----------------------------------- |
| Jeda layar pembuka setiap buka/muat ulang               | 3,3 detik (selalu)                                | 0 (hanya sesudah login, ≤0,8 detik) |
| JavaScript yang diunduh untuk membuka Portal            | 3,4 MB (1,08 MB terkompresi), semua aplikasi      | ≤ 0,9 MB (≤ 300 KB terkompresi)     |
| JavaScript tambahan saat membuka e-Persuratan           | (sudah ikut di atas)                              | tanpa pembuat PDF (−1,1 MB)         |
| Aksi pertama setelah server diam (Kasir, simpan, hapus) | beberapa detik (server "bangun" dengan 0,17 vCPU) | ≤ 1,5 detik                         |
| Aksi berikutnya                                         | antre bila beberapa pengguna bersamaan            | tanpa antre                         |

Prinsip: tidak mengubah tampilan/perilaku di luar kecepatan, tanpa library baru, dan tidak melonggarkan keamanan (data tetap tidak disimpan di peramban, App Check tetap aktif).

## Tahap 0 — Ukur titik awal

**Tujuan:** angka pembanding, supaya setiap tahap terbukti berdampak.

1. Catat ukuran berkas build (`npm run build`): total JS awal & rincian per paket (cara ukur dari sourcemap, lihat lampiran).
2. Di situs online (Vercel), Chrome DevTools → **Lighthouse** (mode Desktop & Mobile) untuk `/login` dan `/` (Portal): catat _First Contentful Paint_, _Largest Contentful Paint_, _Total Blocking Time_.
3. Di **Log Developer → Function & Sistem**: catat rata-rata durasi Function yang sering dipakai (mis. `catatPenjualanKantin`, `catatSesi`, `hapusBerkas`) selama beberapa hari.

**Selesai bila:** angka-angka di atas tertulis di bagian "Hasil" dokumen ini.

## Tahap 1 — Layar pembuka hanya sesudah login

**Tujuan:** hilangkan jeda 3,3 detik setiap buka/muat ulang.

1. `src/App.jsx`: splash tidak lagi tampil saat aplikasi dimuat; hanya dipicu sesudah login berhasil (peristiwa `triggerSplash` yang sudah ada).
2. `src/components/SplashScreen.jsx`: persingkat menjadi ±0,8 detik (stempel → memudar), dan bisa dilewati dengan klik.
3. Hormati "kurangi gerakan": tanpa animasi, langsung hilang.

**Berkas:** `src/App.jsx`, `src/components/SplashScreen.jsx` (kode bersama — sebut di PR).
**Uji:** muat ulang Portal → langsung tampil; login → splash singkat sekali; lint & build.
**Risiko:** kecil. **Batalkan:** kembalikan dua berkas itu.

## Tahap 2 — Setiap aplikasi dimuat saat dibuka (code-splitting per rute)

**Tujuan:** membuka Portal tidak lagi mengunduh kode e-Persuratan, Inventory, Kepegawaian, Koperasi, dan Log Developer.

1. `src/App.jsx`: `EPersuratanApp`, `InventoryApp`, `KepegawaianApp`, `KoperasiApp`, `LogDeveloperApp` (dan halaman SSO yang jarang dipakai seperti Profil) dimuat dengan `React.lazy` + `Suspense`, dengan penanda memuat bergaya aplikasi (tanpa kedip bila cepat).
2. Kartu aplikasi di Portal memuat kode aplikasinya lebih dulu saat kursor/jari menyentuh kartu (prefetch), sehingga klik terasa instan.
3. Bila pemuatan potongan kode gagal (versi baru baru saja dipasang), muat ulang halaman sekali secara otomatis (galat "Versi aplikasi berganti" di Log Developer).
4. Pastikan pembatas modul ESLint tetap lolos (impor tetap lewat `index.js` modul).

**Berkas:** `src/App.jsx`, `src/modules/sso/pages/Portal.jsx`, mungkin `src/utils` (pembantu prefetch) — kode bersama, sebut di PR.
**Uji:** `npm run build` → JS awal ≤ 0,9 MB; buka setiap aplikasi dari Portal & lewat URL langsung; kembali/maju di peramban; lint, build, uji Emulator.
**Risiko:** sedang (layar putih bila Suspense/galat tidak ditangani). **Batalkan:** kembalikan impor biasa.

## Tahap 3 — Pembuat PDF dimuat saat dibutuhkan

**Tujuan:** e-Persuratan, Inventory, Kepegawaian, dan Scanner tidak mengunduh pembuat PDF (`@react-pdf/renderer` + font, ±1,1 MB) sebelum pengguna melihat/mencetak PDF.

1. Komponen & fungsi PDF diimpor dinamis (`import()`) di titik pakai: pratinjau surat (`src/components/SuratPreview`), cetak/gabung LPJ (`lpj/utils/cetakPdf.js`, `dokumenLpj`), Bukti Inventory, ekspor PDF Kepegawaian (absensi, kehadiran), ekspor PDF Scanner.
2. Tombol Lihat/Cetak menampilkan status "Menyiapkan PDF…" selama potongan kode dimuat pertama kali; kode PDF dimuat lebih dulu saat tombol disorot (seperti `onSiapkan` yang sudah ada di Detail LPJ).
3. Potongan kode PDF dipakai bersama semua modul (diunduh sekali).

**Berkas:** sekitar 10 berkas pemakai PDF di e-Persuratan, Inventory, Kepegawaian, dan `src/components/SuratPreview` (kode bersama).
**Uji:** semua PDF tetap bisa dilihat & dicetak (SP, SPD, pack LPJ, Lembar Verifikasi, Bukti Inventory, rekap absensi/kehadiran, Scanner); ukuran potongan e-Persuratan turun ±1,1 MB; lint, build.
**Risiko:** sedang (banyak titik pakai). Bisa dipecah per modul bila perlu.

## Tahap 4 — Function: CPU penuh & beberapa permintaan per mesin

**Tujuan:** aksi pertama tidak menunggu lama dan aksi bersamaan tidak antre.

1. `functions/index.js` (`setGlobalOptions`): `cpu: 1`, `concurrency` ±40 untuk callable, `memory` 512MiB; `maxInstances` dinaikkan secukupnya (mis. 10). Pemicu Firestore & Function terjadwal ditinjau terpisah.
2. Pastikan kode Function aman dijalankan bersamaan dalam satu mesin (cache `bacaAmbang`/pemakaian Firebase di memori sudah aman; tidak ada variabel global per permintaan).
3. Uji Emulator lengkap, lalu deploy semua Function ke **dev** dulu, ukur di Log Developer, baru ke produksi.

**Berkas:** `functions/index.js` (+ mungkin opsi pemicu di `logdev.js`).
**Deploy:** `firebase deploy --project dev --only functions` → cek → `--project produksi`.
**Uji:** durasi rata-rata & aksi pertama di Log Developer → Function & Sistem dibandingkan Tahap 0.
**Biaya:** tetap dalam pola bayar-per-pakai; CPU lebih besar dibayar hanya saat melayani permintaan, dan mesin yang dibutuhkan jauh lebih sedikit. **Batalkan:** kembalikan opsi global, deploy ulang.

## Tahap 5 — Mesin siaga untuk Function tersibuk (opsional)

**Tujuan:** Function yang paling sering dipakai tidak pernah lambat bangun.

1. Pilih 2–3 Function dari data Log Developer (calon: `catatPenjualanKantin` untuk Kasir, `catatSesi`).
2. Pasang `minInstances: 1` hanya pada Function itu.

**Perlu persetujuan pemilik:** ada biaya bulanan tetap per Function siaga (dihitung dari tarif wilayah Jakarta sebelum dipasang). **Batalkan:** `minInstances: 0`.

## Tahap 6 — Font lebih ramping

**Tujuan:** tampilan pertama tidak menunggu banyak berkas font.

1. Audit ketebalan font yang benar-benar dipakai (kelas `font-*` per keluarga) dan hapus sisanya dari tautan Google Fonts di `index.html`.
2. Opsional: simpan berkas font (woff2) di web sendiri (`public/`) supaya ikut cache 1 tahun Vercel dan tanpa koneksi ke server Google; CSP perlu disesuaikan bila sumber font berubah.

**Berkas:** `index.html` (+ `public/`, `vercel.json` bila disimpan sendiri) — konfigurasi, perlu persetujuan.

## Tahap 7 — Ukur ulang & rapikan

1. Ulangi pengukuran Tahap 0, tulis hasilnya di bawah.
2. Perbarui CLAUDE.md §9 (utang "belum ada code-splitting" selesai) dan aturan baru: aplikasi & PDF dimuat saat dibutuhkan.

## Yang sengaja TIDAK dilakukan

- **Menyimpan data Firestore di peramban (IndexedDB):** membuat buka ulang instan, tetapi data pribadi tertinggal di PC bersama (melanggar aturan keamanan proyek, K33).
- **Mematikan App Check:** menunggu token ±0,3–1 detik pada permintaan pertama, tetapi melindungi data dari akses di luar aplikasi.
- **Mengurangi pencatatan Log Developer:** hanya ±0,1 detik per aksi dan dipilih pemilik proyek.

## Lampiran — cara mengukur rincian berkas build

`npx vite build --sourcemap --outDir <folder sementara>`, lalu hitung byte hasil per sumber dari `mappings` sourcemap (bukan `sourcesContent`, yang memuat seluruh berkas sumber termasuk bagian yang dibuang saat build).

## Hasil

| Tahap | Tanggal    | Ukuran / angka                                                                                                   | Catatan                                                                                                                                                                                                                                   |
| ----- | ---------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | 2026-11-25 | JS awal 3.477 KB (1.080 KB terkompresi), satu berkas; CSS 211 KB (32 KB); splash 3,3 detik setiap buka           | Rincian JS: pembuat PDF 34%, e-Persuratan 16%, Firebase SDK 13%, Kepegawaian 6%, Koperasi 4%, Inventory 4%. Lighthouse & durasi Function: diisi pemilik dari situs online & Log Developer                                                 |
| 1     | 2026-11-25 | splash 0 detik saat buka/muat ulang; ±0,9 detik sesudah login (bisa diklik)                                      |                                                                                                                                                                                                                                           |
| 2     | 2026-11-25 | JS awal Portal 1.070 KB (±330 KB terkompresi), −69%                                                              | Aplikasi jadi potongan sendiri: e-Persuratan 651 KB, Kepegawaian 200 KB, Koperasi 149 KB, Inventory 127 KB, Log Developer 63 KB; pembuat PDF 1.200 KB kini hanya diunduh aplikasi yang memakainya (Tahap 3 menundanya sampai Lihat/Cetak) |
| 3     | 2026-11-25 | Buka e-Persuratan: +588 KB (dulu +1.853 KB termasuk pembuat PDF); Kepegawaian & Inventory juga tanpa pembuat PDF | Pembuat PDF (1.202 KB, ±445 KB terkompresi) diunduh saat Lihat/Cetak/Ekspor PDF pertama; di Detail & form LPJ diunduh diam-diam 1,5 detik setelah halaman tampil. Jeda buatan 0,8 detik di pratinjau surat dihapus                        |
| 4     | 2026-11-25 | Function: 1 vCPU, 512 MB, 40 permintaan per mesin (dulu ±0,17 vCPU, 1 permintaan)                                | Berlaku setelah deploy (dev dulu, lalu produksi); durasi dibandingkan di Log Developer → Function & Sistem                                                                                                                                |
| 5     | —          | ditunda                                                                                                          | Mesin siaga diputuskan setelah ada angka dari dev (ada biaya bulanan tetap)                                                                                                                                                               |
| 6     | 2026-11-25 | dilewati                                                                                                         | Peramban hanya mengunduh font untuk ketebalan yang tampil; membuang ketebalan dari tautan hampir tidak menghemat. Menyimpan font sendiri butuh berkas font di repo + ubah CSP demi ±0,1–0,3 detik di kunjungan pertama                    |
| 7     | 2026-11-25 | CLAUDE.md §5 (aturan muat saat dibutuhkan) & §9 diperbarui                                                       |                                                                                                                                                                                                                                           |
