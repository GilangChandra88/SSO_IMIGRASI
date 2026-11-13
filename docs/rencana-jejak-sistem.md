# Rencana Jejak Sistem: perubahan, galat, dan anomali

> Status: **dikerjakan sebagai modul Log Developer** (12 November 2026), belum di-deploy. Keputusan §9: hanya Super Admin; pengamanan ketat (baca hanya lewat Function, ketik ulang kata sandi tiap 30 menit, akses tercatat); aktivitas rinci + IP/perangkat; retensi log & anomali permanen, galat 180 hari, aktivitas 90 hari; kode bersama, pembungkus semua Function, indeks & TTL disetujui. Halaman: `/log-developer`. Skema final: `docs/skema-database.md` §5.8 (menggantikan rincian bentuk data di dokumen ini). Belum: anomali rekonsiliasi R2–R5 (stok, Inventory, LPJ, nomor ganda).
> Acuan: `docs/skema-database.md` §5.8, `firestore.rules`, `functions/src/jejak.js`, `functions/src/logdev.js`, `src/modules/log-developer/`.

## 1. Tujuan

Setiap kejadian penting di aplikasi bisa dilacak kembali: **siapa** melakukan **apa**, **kapan**, **pada data mana**, **nilai sebelum → sesudah**, **lewat jalur apa**, dan **mengapa** (alasan). Tiga jenis catatan:

| Jenis               | Pertanyaan yang dijawab                                               | Koleksi                  |
| ------------------- | --------------------------------------------------------------------- | ------------------------ |
| **Jejak perubahan** | Siapa mengubah data ini, dari berapa menjadi berapa?                  | `sistem_log` (diperluas) |
| **Galat**           | Apa yang rusak, di halaman/Function mana, menimpa siapa, berapa kali? | `sistem_galat` (baru)    |
| **Anomali**         | Kejadian yang sah secara teknis tetapi patut dicurigai/diperiksa      | `sistem_anomali` (baru)  |

Prinsip yang tidak bisa ditawar:

1. **Browser bukan saksi.** Pelaku dan waktu selalu diambil dari server (token login / konteks pemicu), tidak pernah dari isian klien. Klien tidak bisa menulis, mengubah, atau menghapus catatan.
2. **Tidak ada celah.** Penulisan lewat Function, lewat rules (browser), bahkan lewat Firebase Console, semuanya tercatat.
3. **Catatan tidak pernah dihapus atau diubah** (kecuali galat yang kedaluwarsa otomatis, lihat §7). Pemeriksaan anomali menambah status, bukan menimpa isi.
4. **Hemat dan aman privasi.** Simpan selisih (diff), bukan salinan dokumen utuh; tidak menyimpan isi berkas, kata sandi, token, atau data kontak pribadi.

## 2. Kondisi sekarang

- `sistem_log` sudah ada, ditulis `catatLog()` di dalam transaksi yang sama. Dipakai ±25 aksi sensitif (peran, akun, pagu, pembatalan, penghitung, tutup buku, dst.), belum semua Function.
- **30 koleksi masih ditulis langsung dari browser lewat rules** (mis. `lpj_berkas`, `mak_node`, `pegawai`, `inventory_barang`, `koperasi_akun`, `surat_kode`, `pegawai_absensi/*/koreksi`). Perubahannya **belum tercatat** di mana pun selain `diubahOleh` terakhir. Hanya `mak_node` yang punya pemicu pencatat (`diMakNodeDitulis`).
- Galat: browser hanya menampilkan toast; Function belum memakai `logger`. Tidak ada catatan galat terpusat.
- Anomali: belum ada. Beberapa hal sudah ditolak server (stok minus, saldo kas kurang, periode terkunci), tetapi tidak ada yang mencatat _percobaan_ yang ditolak.

## 3. Jejak perubahan

### 3.1 Bentuk catatan (`sistem_log`, diperluas, kompatibel dengan entri lama)

| Field                   | Isi                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `modul`                 | `pegawai`, `lpj`, `mak`, `surat`, `inventory`, `koperasi`, `sso`, `sistem`                                          |
| `aksi`                  | kata kerja baku: `buat`, `ubah`, `batal`, `pulihkan`, `nonaktifkan`, `aturPeran`, … (+ aksi khusus yang sudah ada)  |
| `target`                | path dokumen (`koperasi_kantin_barang/abc`)                                                                         |
| `perubahan`             | **baru**: `{ field: [lama, baru] }` hanya field yang berubah (lihat §3.4)                                           |
| `nilaiLama`/`nilaiBaru` | tetap untuk aksi lama yang sudah memakainya                                                                         |
| `alasan`                | wajib untuk batal/koreksi/buka kunci                                                                                |
| `oleh`                  | uid; **baru** `pelaku: { uid, pegawaiId, nama, peran[] }` dibekukan saat kejadian                                   |
| `jalur`                 | **baru**: `fn:<namaFunction>` / `klien` (lewat rules) / `konsol` (Firebase Console atau akun layanan)               |
| `korelasiId`            | **baru**: satu ID per tindakan pengguna (dikirim klien), menyatukan perubahan + galat + anomali dari klik yang sama |
| `pada`                  | `serverTimestamp()`                                                                                                 |

### 3.2 Jalur Function (callable)

- Satu pembungkus `aksi(nama, handler)` di `functions/src/umum.js` untuk **semua** callable: mengisi `pelaku`, `jalur`, `korelasiId` otomatis dan menyediakan `catat(tx, {...})` di dalam transaksi yang sama. Function yang belum mencatat (mis. sebagian besar Koperasi dan Inventory) jadi ikut tercatat tanpa menulis ulang logikanya.
- Penolakan (`permission-denied`, `failed-precondition`) juga dihitung (lihat anomali A6), tanpa membuat entri log per penolakan.

### 3.3 Jalur browser (rules) dan Console

- Pemicu Gen 2 **`onDocumentWrittenWithAuthContext`** (sudah tersedia di `firebase-functions` 6.6 yang terpasang). Pemicu ini membawa `authType` (`app_user`/`admin`/…) dan `authId` dari server, jadi pelaku **tidak bisa dipalsukan** browser. Penulisan `admin` dari akun layanan Function = jalur Function; `admin` dari akun lain (orang yang membuka Firebase Console, skrip lokal) = `jalur: 'konsol'` → anomali A8.
- Koleksi yang hanya ditulis Function (jurnal, saldo, rekap, nomor) diberi pemicu ringan kedua yang **hanya** memeriksa `authId`: bila bukan akun layanan Function, catat A8; selain itu tidak menulis apa pun. Ini satu-satunya cara menangkap orang yang mengubah angka keuangan langsung di Console.
- Satu Function generik `diDataDitulis` dipasang pada daftar path yang ditulis klien (daftar tetap di kode, bukan wildcard semua koleksi, agar `sistem_log` tidak memicu dirinya sendiri dan koleksi yang sudah dicatat callable tidak tercatat dua kali).
- Rules tetap mewajibkan `diubahOleh == request.auth.uid`; pemicu membandingkannya dengan `authId` dan menandai anomali A9 bila beda.

### 3.4 Aturan diff hemat

- Hanya field yang berubah; field jejak (`diubahPada`, `versi`) diabaikan.
- Teks panjang (> 300 karakter) disimpan sebagai `{ panjang, awal: 80 karakter }`; Meta berkas disimpan sebagai nama + ukuran; daftar besar sebagai jumlah + elemen yang ditambah/dilepas.
- Field rahasia tidak pernah masuk log: kontak pribadi (`pegawai_kontak` → hanya nama field yang berubah, nilai disamarkan), data sandi/token.
- **Simpan otomatis LPJ** (`lpj_berkas`, bisa puluhan simpan per sesi): perubahan dari pelaku yang sama pada berkas yang sama dalam 10 menit **digabung** menjadi satu entri (dokumen log yang sama diperbarui oleh pemicu, `jumlahSimpan` naik). Perubahan `terkunci`/status selalu entri sendiri.

## 4. Galat

### 4.1 Galat Function

- Pembungkus `aksi()` menangkap galat yang **bukan** `HttpsError` (bug): tulis `logger.error` terstruktur (masuk Cloud Logging + **Error Reporting** otomatis, gratis untuk volume kecil) dan entri `sistem_galat`. Pengguna tetap melihat pesan umum tanpa _stack trace_.
- Pemicu yang gagal dicatat dengan cara yang sama.

### 4.2 Galat browser

- Sumber: error boundary `main.jsx`, `window.onerror` / `unhandledrejection`, galat `onSnapshot`/`getDocs` (lewat `@/utils/pantau`), dan `pesanGalat()` untuk galat `internal`/tak dikenal.
- Dikirim lewat callable **`laporkanGalat`** (bukan tulis langsung, agar tidak bisa dipakai membanjiri database): App Check + login wajib, batas 20 laporan per pengguna per jam, hanya di produksi/dev (tidak di Emulator lokal kecuali diaktifkan).
- Isi yang dikirim: pesan, nama galat, 10 baris _stack_ teratas, rute halaman (tanpa parameter pencarian), versi aplikasi (hash build Vite), `korelasiId`. **Tidak** mengirim isi form atau data dokumen.

### 4.3 Bentuk `sistem_galat/{sidikJari}`

ID = hash(`sumber + pesan + lokasi`), jadi galat yang sama dari 50 pengguna = **satu dokumen** dengan penghitung, bukan 50 dokumen:
`sumber` (`klien`/`fn:<nama>`), `pesan`, `lokasi`, `versi`, `jumlah` (increment), `penggunaTerdampak[]` (≤ 10 uid), `pertamaPada`, `terakhirPada`, `contoh` (stack terakhir), `status` (`baru`/`ditangani`/`abaikan`), `catatan`, `ditanganiOleh`. Galat yang muncul lagi setelah `ditangani` kembali ke `baru` (regresi).

## 5. Anomali

Deteksi **berbasis aturan** (bisa dijelaskan, bukan "AI menebak"), ambang bisa diatur di `sistem_pengaturan/anomali`. Ditulis ke `sistem_anomali` dengan `tingkat` `info`/`peringatan`/`kritis`.

### 5.1 Seketika (di dalam Function / pemicu yang bersangkutan)

| Kode | Anomali                                                                                        | Modul                                 |
| ---- | ---------------------------------------------------------------------------------------------- | ------------------------------------- |
| A1   | Selisih stok opname melebihi ambang (mis. > 10% atau > Rp 100.000 per barang)                  | Koperasi, Inventory                   |
| A2   | Penjualan dibatalkan oleh orang yang sama yang mencatatnya, atau > 3 pembatalan/hari per orang | Koperasi, Inventory                   |
| A3   | Harga jual di bawah harga pokok saat transaksi                                                 | Koperasi                              |
| A4   | Transaksi bertanggal mundur > 7 hari dari waktu input                                          | semua keuangan                        |
| A5   | Perubahan di luar jam kerja (mis. 22.00–05.00 WITA) pada data keuangan/peran                   | semua                                 |
| A6   | Penolakan akses berulang dari satu pengguna (> 10/jam), tanda mencoba-coba                     | semua                                 |
| A7   | Perubahan peran, pagu MAK, penghitung nomor, saldo awal, tutup/buka buku                       | semua (selalu `info`, untuk ditinjau) |
| A8   | Data diubah lewat Firebase Console / akun layanan, bukan lewat aplikasi                        | semua (`kritis`)                      |
| A9   | `diubahOleh` di dokumen tidak sama dengan penulis sebenarnya                                   | semua (`kritis`)                      |

### 5.2 Terjadwal (rekonsiliasi harian, `onSchedule` 05.00 WITA)

| Kode | Pemeriksaan                                                                            |
| ---- | -------------------------------------------------------------------------------------- |
| R1   | Jurnal Koperasi kemarin seimbang dan jumlahnya sama dengan kenaikan `koperasi_rekap`   |
| R2   | Stok barang Koperasi = stok awal + masuk − keluar ± opname (sampel/semua barang aktif) |
| R3   | `inventory_saldo` cocok dengan transaksi tahun berjalan                                |
| R4   | `lpj_ringkas` cocok dengan `lpj_berkas`; `mak_rekap` cocok dengan `mak_realisasi`      |
| R5   | Nomor resmi (surat, LPJ, TBR/TBK, DRPP) tidak ganda dan tidak melompat                 |
| R6   | Galat baru > N kali dalam sehari → anomali `peringatan`                                |

Rekonsiliasi hanya **melaporkan**, tidak memperbaiki data otomatis.

### 5.3 Bentuk `sistem_anomali/{id}`

`kode`, `tingkat`, `modul`, `target`, `pelaku` (beku), `rincian` (angka pembanding), `logId`/`korelasiId` terkait, `status` (`baru`/`diperiksa`/`wajar`/`ditindak`), `catatanPemeriksa`, `diperiksaOleh`, `pada`. Mengubah status lewat callable `tinjauAnomali` (wajib catatan), yang juga tercatat di `sistem_log`.

## 6. Tampilan

- Halaman **Jejak Sistem** (`/sistem/jejak`, Super Admin) dengan tab **Perubahan**, **Galat**, **Anomali**; saring modul, pelaku, rentang tanggal, target; detail diff "sebelum → sesudah". Ikon lonceng di Portal untuk Super Admin bila ada anomali `kritis`/galat `baru`.
- Tombol **Riwayat** di halaman detail tiap modul (barang, berkas LPJ, anggota, akun, pegawai) menampilkan jejak dokumen itu saja (`where target ==`).
- Pengelola modul (Keuangan, Kepegawaian, Umum, Manager Koperasi) melihat log & anomali **modulnya sendiri**; galat hanya Super Admin.

## 7. Keamanan, retensi, biaya

- **Rules**: ketiga koleksi `write: if false` untuk klien; baca sesuai §6 dengan `limit` (≤ 100).
- **Retensi**: `sistem_log` dan `sistem_anomali` disimpan permanen (catatan keuangan; usulan minimal 10 tahun). `sistem_galat` memakai **TTL Firestore** 180 hari sejak `terakhirPada`.
- **Segel harian** (opsional, disarankan): Function terjadwal menghitung hash berantai seluruh log kemarin ke `sistem_log_segel/{tanggal}`; bila ada yang mengubah log lewat Console, rantai putus dan muncul anomali A8.
- **Cloud Audit Logs** Google Cloud untuk Firestore (pengaturan proyek, tanpa kode) mencatat akses admin di luar aplikasi.
- **Indeks**: kueri `modul + pada`, `pelaku.uid + pada`, `target + pada`, `status + pada` butuh indeks gabungan; field `perubahan`, `nilaiLama`, `nilaiBaru`, `rincian`, `contoh` **dikecualikan dari indeks** (hemat biaya tulis & tidak kena batas ukuran indeks). Perlu persetujuan perubahan `firestore.indexes.json`.
- **Biaya** (perkiraan kantor ±60 pegawai, ≤ 5.000 penulisan/hari): + ≤ 5.000 penulisan log + pemanggilan pemicu yang sama per hari, jauh di bawah Rp 10.000/bulan. Penggabungan simpan otomatis LPJ dan dedup galat menjaga angka ini tetap kecil.

## 8. Tahapan kerja

| Tahap | Isi                                                                                                                   | Menyentuh kode bersama            |
| ----- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| J1    | Skema §5.8, rules, `koleksi.js`, uji; `catatLog` v2 + pembungkus `aksi()` + `logger`; semua callable memakai `aksi()` | `functions/`, rules, `src/config` |
| J2    | Pemicu `diDataDitulis` (auth context) untuk 30 koleksi klien + diff hemat + penggabungan LPJ                          | `functions/`                      |
| J3    | Galat: `laporkanGalat`, sambungan di `main.jsx`, `pantau`, `pesanGalat`; `sistem_galat` + TTL                         | `src/main.jsx`, `src/utils`       |
| J4    | Anomali seketika A1–A9 (mulai Koperasi & Inventory), `tinjauAnomali`                                                  | `functions/`                      |
| J5    | Rekonsiliasi harian R1–R6 (`onSchedule`)                                                                              | `functions/`                      |
| J6    | Halaman Jejak Sistem + tombol Riwayat per modul + lonceng Portal                                                      | `src/modules/sso`, tiap modul     |
| J7    | Segel harian, Cloud Audit Logs, indeks & pengecualian indeks                                                          | konfigurasi                       |

Setiap tahap: uji Emulator (izin/tolak rules + uji Function bahwa pelaku tercatat dari server, termasuk percobaan memalsukan `diubahOleh`), lint, build.

## 9. Keputusan yang dibutuhkan dari pemilik proyek

1. **Siapa boleh melihat**: Super Admin semua; pengelola modul hanya modulnya (usulan di §6)?
2. **Retensi**: log & anomali permanen/10 tahun; galat 180 hari?
3. **Ambang anomali** awal: selisih opname 10%/Rp 100.000, jam di luar kerja 22.00–05.00 WITA, tanggal mundur 7 hari, pembatalan 3/hari?
4. **Informasi perangkat**: perlu mencatat alamat IP/perangkat? (Usulan: **tidak**, cukup akun + waktu, demi UU PDP.)
5. Persetujuan: Function baru (pemicu, terjadwal, `laporkanGalat`, `tinjauAnomali`), perubahan `firestore.indexes.json` + TTL, dan perubahan kode bersama (`main.jsx`, `src/utils`, Portal).
