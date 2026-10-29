# Lingkungan pengembangan: Emulator, proyek dev, dan produksi

Uji coba **tidak pernah** dilakukan di proyek produksi `imigrasi-database-v2`, supaya data asli dan pengguna kantor tidak terganggu. Ada tiga lingkungan; kodenya sama, yang berbeda hanya database yang dipakai (dipilih lewat berkas `.env`).

| Lingkungan                   | Proyek Firebase                           | Web lokal              | Web di Vercel     | Data                        |
| ---------------------------- | ----------------------------------------- | ---------------------- | ----------------- | --------------------------- |
| **Emulator** (di komputer)   | `demo-imigrasi` (tiruan, tanpa cloud)     | `npm run dev:emulator` | –                 | pura-pura, hilang saat mati |
| **Dev** (cloud, bersama tim) | `imigrasi-database`, database `(default)` | `npm run dev`          | Preview (per PR)  | pura-pura                   |
| **Produksi**                 | `imigrasi-database-v2`                    | `npm run dev:produksi` | Production (main) | **asli**                    |

Push ke branch hanya memperbarui Vercel **Preview** (database dev); web produksi baru berubah saat PR digabung ke `main`. Rules dan Cloud Functions **tidak** ikut ter-deploy oleh Vercel; keduanya di-deploy terpisah dengan `firebase deploy` ke proyek masing-masing.

## 1. Emulator (sehari-hari)

Firebase Emulator adalah tiruan Firebase (Auth, Firestore, Storage, Functions) di komputer sendiri. Rules (`firestore.rules`, `storage.rules`) dan kode `functions/` yang dipakai adalah berkas di komputer Anda, jadi perubahannya langsung terpakai tanpa `firebase deploy`.

### Persiapan (sekali saja)

1. `npm install` di akar repo dan `npm install` di folder `functions/`.
2. Java 11 atau lebih baru (Emulator Firestore berjalan di Java). Cek dengan `java -version`. Skrip memakai `firebase-tools@13.35.1` yang masih mendukung Java 11; versi terbaru butuh Java 21.
3. Tidak perlu login Firebase. Nilai pura-pura untuk Emulator sudah ada di `.env.emulator`.

### Setiap kali mau mencoba

**Terminal 1** — nyalakan Emulator:

```bash
npm run emulator
```

Tunggu sampai muncul `Emulator sudah diisi data pura-pura.` Pertama kali lebih lama karena firebase-tools dan Emulator diunduh dulu. Biarkan terminal ini tetap terbuka.

**Terminal 2** — nyalakan web:

```bash
npm run dev:emulator
```

Buka alamat yang dicetak Vite (biasanya `http://localhost:5173`) dan login dengan salah satu akun di bawah.

**Melihat isi data:** Emulator UI di `http://127.0.0.1:4000` (tab Firestore, Authentication, Storage).

**Selesai:** tekan `Ctrl+C` di kedua terminal. Emulator selalu mulai bersih: data yang Anda buat saat mencoba hilang ketika Emulator dihentikan, lalu diisi ulang data awal saat dinyalakan lagi. (`--export-on-exit` tidak dipakai karena di Windows firebase-tools 13 gagal memindahkan hasil ekspor.)

### Akun dan data awal

Semua kata sandi Emulator: `SandiContoh123` (hanya ada di Emulator).

| E-mail                    | Peran         |
| ------------------------- | ------------- |
| `superadmin@contoh.test`  | Super Admin   |
| `keuangan@contoh.test`    | Keuangan      |
| `kepegawaian@contoh.test` | Kepegawaian   |
| `umum@contoh.test`        | Umum          |
| `pegawai@contoh.test`     | Pegawai biasa |

Data awal (`functions/scripts/isiDataContoh.js`, semua nama dan NIP palsu):

- 10 pegawai "… Contoh" (PNS, PPPK, Non-ASN), ada yang berulang tahun hari ini dan dalam beberapa hari;
- unit kerja (kantor → Subbag TU → urusan, dan tiga seksi), master pangkat & jabatan;
- pejabat penandatangan: Kepala, PPK, Bendahara;
- 3 kegiatan (2 sudah diisi kehadirannya, 1 belum) beserta rekapnya;
- MAK lengkap sampai Item + DIPA tahun berjalan;
- kode surat 3 tingkat;
- 1 kategori Inventory dengan 3 barang dan 1 pemasok.

### Perintah lain

| Perintah                          | Gunanya                                                          |
| --------------------------------- | ---------------------------------------------------------------- |
| `npm run emulator:isi -- --ulang` | kosongkan Emulator yang sedang menyala lalu isi ulang data awal  |
| `npm run emulator -- --kosong`    | nyalakan Emulator tanpa data awal (mis. menguji tampilan kosong) |

## 2. Proyek dev `imigrasi-database` (mencoba bersama lewat web)

Proyek lama `imigrasi-database` dipakai ulang sebagai proyek pengembangan. Aplikasi memakai database **`(default)`** (Jakarta) yang terpisah dari database lama `imigrasi`; database `imigrasi`, Function lama (`onPackCreated`, `onSuratItemUpdated`), dan berkas lama di bucket adalah data uji aplikasi lama: **jangan dihapus atau diubah**. Aplikasi web dev terdaftar sebagai `sso_imigrasi_dev` dengan App Check (reCAPTCHA Enterprise berbasis skor, domain `vercel.app`, TTL 4 jam).

### Web lokal ke proyek dev (`npm run dev`)

`npm run dev` membaca `.env.development.local` (tidak di-commit), yang menimpa nilai produksi di `.env.local`. Isinya konfigurasi aplikasi `sso_imigrasi_dev` (Firebase Console → proyek `imigrasi-database` → Project settings → Your apps), kunci situs App Check dev, `VITE_FIREBASE_APPCHECK_DEBUG=true`, dan `VITE_FIREBASE_EMULATOR=` kosong; minta berkasnya ke pemilik proyek.

Pertama kali membuka web, konsol browser mencetak **token debug App Check**. Daftarkan sekali: Firebase Console → `imigrasi-database` → App Check → Apps → `sso_imigrasi_dev` → ⋮ → Manage debug tokens → Add debug token. Tanpa itu, Function callable (buat akun, nomor surat, dan lainnya) ditolak.

### Vercel Preview

Settings → Environment Variables, centang **Preview** saja: nilai yang sama dengan `.env.development.local`, kecuali `VITE_FIREBASE_APPCHECK_DEBUG` yang dikosongkan. Variabel **Production** tetap nilai produksi.

### Deploy ke proyek dev (pemilik proyek)

```bash
firebase deploy --only "firestore,storage,functions" --project dev
```

- Alias proyek ada di `.firebaserc` (`dev` = bawaan, `produksi`). Di PowerShell, nilai `--only` yang berisi koma wajib diberi tanda kutip.
- Pertanyaan "grant the new role" (aturan lintas layanan Storage → Firestore): jawab **Y**.
- Pertanyaan menghapus Function lama `onPackCreated`/`onSuratItemUpdated`: jawab **N**.
- Rules Firestore hanya mengenai database `(default)`; rules Storage mengganti rules bucket, jadi aplikasi lama tidak bisa lagi membuka berkas lamanya (berkasnya tetap ada).

### Data contoh di proyek dev (sekali, setelah deploy)

```bash
gcloud auth application-default login   # bila belum
npm run dev:isi
```

Skrip hanya bisa menulis ke `imigrasi-database` (database `(default)`), menolak bila sudah ada pegawai, dan mencetak **kata sandi acak** tiap akun sekali saja (proyek dev bisa diakses dari internet, jadi tidak memakai kata sandi Emulator).

## 3. Produksi

- `npm run dev:produksi` membuka web lokal ke produksi (`.env.local`). Pakai hanya bila memang perlu memeriksa data asli.
- Deploy produksi hanya oleh pemilik proyek, selalu dengan `--only` dan `--project produksi` (atau `imigrasi-database-v2`).

## Masalah umum

- **`Emulator belum menyala`** saat `emulator:isi`: jalankan `npm run emulator` dulu di terminal lain.
- **Port sudah dipakai** (8080, 9099, 9199, 5001, 4000, 4400): ada Emulator lain yang masih menyala. Tutup terminalnya, atau hentikan proses `java` yang tersisa.
- **Akun `@contoh.test` tidak bisa login**: periksa perintah yang dipakai. Kata sandi `SandiContoh123` hanya berlaku di Emulator (`npm run dev:emulator`); proyek dev memakai kata sandi acak dari pemilik.
- **Function ditolak (`unauthenticated`/App Check) di `npm run dev`**: token debug App Check belum didaftarkan (lihat bagian 2).
- **Data turunan belum lengkap** (pesan `PERHATIAN`): Function belum siap (Emulator) atau belum di-deploy (proyek dev).
