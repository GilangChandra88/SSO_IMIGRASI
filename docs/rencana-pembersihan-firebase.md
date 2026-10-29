# Rencana Pembersihan & Mulai Ulang Firebase

Disusun 27 Oktober 2026 untuk **pemilik proyek**, yang menjalankan langkah-langkah ini dengan akun Google pemilik.

**Keputusan pemilik proyek:** seluruh Firebase dibersihkan **sekarang**, tanpa cadangan dan tanpa migrasi data. Setelah itu kita mulai ulang dengan struktur database baru (`docs/skema-database.md`) dan rules baru (`firestore.rules`, `storage.rules`).

**Yang sudah disiapkan di repo:**

| Berkas                   | Isi                                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `firestore.rules`        | Rules Firestore baru untuk skema baru: tolak kecuali diizinkan, peran dari custom claims, validasi setiap field, wajib `limit`, field resmi hanya ditulis Cloud Function |
| `storage.rules`          | Rules Storage baru: path, tipe, ukuran, dan fase per folder; tanpa daftar isi; tanpa penimpaan; arsip tidak bisa dihapus                                                 |
| `scripts/uji-rules.mjs`  | 93 kasus uji izin/tolak, **semuanya lulus** di Firebase Emulator (proyek `demo-imigrasi`, tidak menyentuh cloud)                                                         |
| `docs/skema-database.md` | Acuan resmi struktur database baru                                                                                                                                       |

## Status (27 Oktober 2026)

Jalur A dipilih. Proyek produksi baru: **`imigrasi-database-v2`** (aplikasi web `sso_imigrasi`).

| Langkah                                   | Status                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A2 Proyek, Blaze, Google Analytics        | ✅ Blaze aktif, Google Analytics sudah tidak tertaut. ⚠️ Peringatan anggaran belum dipastikan (cek di Billing → Budgets & alerts)                                                                                                                                                                                                                         |
| A3 Firestore                              | ✅ `(default)`, Native, Standard, `asia-southeast2`, _delete protection_ aktif. PITR belum (nyalakan saat data asli masuk)                                                                                                                                                                                                                                |
| A4 Storage                                | ✅ Bucket `imigrasi-database-v2.firebasestorage.app`, `asia-southeast2`, _soft delete_ 7 hari. CORS terpasang dari `storage.cors.json` (lihat A4)                                                                                                                                                                                                         |
| A5 Authentication                         | ✅ Hanya E-mail/Password; pendaftaran & penghapusan akun mandiri dimatikan; _password policy_ ditegakkan (min. 12, huruf besar, huruf kecil, angka); _email enumeration protection_ aktif. Authorized domains masih bawaan (`localhost`, `*.firebaseapp.com`, `*.web.app`), dirapikan saat go-live                                                        |
| A6 Batas API key                          | ⏳ saat go-live. Selama pengembangan masih memakai proyek ini dari `localhost`, referrer belum dibatasi                                                                                                                                                                                                                                                   |
| A7 App Check                              | ✅ reCAPTCHA Enterprise, kunci **berbasis skor** (nilainya di `VITE_FIREBASE_APPCHECK_SITE_KEY` dan Console App Check; tidak ditulis di repo publik) untuk domain `sso-imigrasi.vercel.app`, TTL token 4 jam. Token debug `localhost` terdaftar (cabut sebelum go-live). Penegakan Firestore/Storage belum (go-live); callable sudah mewajibkan App Check |
| A8 Rules                                  | ✅ `firestore.rules` dan `storage.rules` terpasang (27 Okt 2026), termasuk peran IAM untuk aturan lintas layanan Storage → Firestore                                                                                                                                                                                                                      |
| A9 IAM                                    | ✅ Hanya 1 pemilik, tanpa kunci _service account_                                                                                                                                                                                                                                                                                                         |
| A10 Hapus proyek lama `imigrasi-database` | ✖️ Tidak jadi: proyek dipakai ulang sebagai proyek dev (A12, 29 Okt 2026)                                                                                                                                                                                                                                                                                 |
| A11 Vercel                                | ⏳ Domain sementara `https://sso-imigrasi.vercel.app` (domain kantor menyusul, lihat "Bila domain berubah"). Variabel Firebase hanya untuk Production (29 Okt 2026); Preview diisi nilai proyek dev                                                                                                                                                       |

`.firebaserc` sudah menunjuk `imigrasi-database-v2` (P0).

### Bila domain web berubah (mis. domain kantor dibeli)

Domain web dicatat di empat tempat; semuanya harus diperbarui bersamaan:

1. `storage.cors.json` → `origin`, lalu pasang: `gcloud storage buckets update gs://imigrasi-database-v2.firebasestorage.app --cors-file=storage.cors.json`;
2. kunci reCAPTCHA App Check → `gcloud recaptcha keys update <site key App Check> --project imigrasi-database-v2 --web --domains=<domain-lama>,<domain-baru>` (site key = `VITE_FIREBASE_APPCHECK_SITE_KEY`; jangan menambahkan `localhost`);
3. Authentication → Settings → Authorized domains;
4. referrer API key (A6), bila sudah dibatasi.

### Cloud Functions: akun layanan (wajib sebelum deploy pertama)

Proyek Google Cloud baru tidak lagi memberi peran Editor ke akun layanan bawaan Compute. Akibatnya build Function gagal ("missing permission on the build service account"), dan Function tidak boleh berjalan dengan akun bawaan itu. Penyiapannya (dijalankan pemilik di PowerShell, sekali per proyek):

```powershell
$P = "imigrasi-database-v2"
$NOMOR = gcloud projects describe $P --format="value(projectNumber)"   # nomor proyek

# 1) Akun build bawaan boleh membangun Function
gcloud projects add-iam-policy-binding $P --member="serviceAccount:$NOMOR-compute@developer.gserviceaccount.com" --role="roles/cloudbuild.builds.builder" --condition=None

# 2) Akun layanan khusus untuk MENJALANKAN Function (izin minimum)
gcloud iam service-accounts create fungsi-imigrasi --project $P --display-name="Cloud Functions Imigrasi"
$SA = "serviceAccount:fungsi-imigrasi@$P.iam.gserviceaccount.com"
gcloud projects add-iam-policy-binding $P --member=$SA --role="roles/datastore.user" --condition=None        # baca/tulis Firestore
gcloud projects add-iam-policy-binding $P --member=$SA --role="roles/firebaseauth.admin" --condition=None     # buat akun, claims, cek kata sandi
gcloud projects add-iam-policy-binding $P --member=$SA --role="roles/eventarc.eventReceiver" --condition=None # pemicu Firestore
gcloud projects add-iam-policy-binding $P --member=$SA --role="roles/run.invoker" --condition=None           # Eventarc memanggil Function
# hapusBerkas menghapus berkas draf LPJ di Storage (izin hanya untuk bucket ini, bukan seluruh proyek)
gcloud storage buckets add-iam-policy-binding "gs://$P.firebasestorage.app" --member=$SA --role="roles/storage.objectAdmin"

# 3) Deploy
firebase deploy --only functions --project $P

# 4) Callable boleh dipanggil dari browser. CLI memasang ini otomatis saat Function DIBUAT;
#    bila deploy pertama gagal (mis. karena langkah 1 belum dijalankan), pasang manual
#    (hanya callable; nama layanan Cloud Run = nama Function huruf kecil):
$CALLABLE = "buatakunpegawai","aturperan","nonaktifkanpegawai","aktifkanpegawai","tandaisandidiganti",
            "selesaikanspby","hapusberkas","hapusnodemak","batalkanrealisasi","pulihkanrealisasi",
            "buatdrpp","ubahdaftardrpp","batalkandrpp","terbitkannomorsurat","aturpenghitung",
            "catatmasuk","catatkeluar","ubahtransaksi","batalkantransaksi","ubahkodesakti"
foreach ($s in $CALLABLE) {
  gcloud run services add-iam-policy-binding $s --region asia-southeast2 --project $P --member="allUsers" --role="roles/run.invoker"
}
```

`functions/index.js` memakai `serviceAccount: 'fungsi-imigrasi@'`, jadi semua Function berjalan dengan akun di atas. Akun ini hanya memegang objek di bucket berkas, dan **tidak** punya akses Billing atau IAM. Tambah peran hanya bila ada Function baru yang benar-benar membutuhkannya, lalu catat di sini.

Izin pemanggil publik (`allUsers` → `roles/run.invoker`) hanya untuk **callable**, bukan untuk pemicu Firestore. Callable tetap aman karena setiap Function memeriksa login, claim `aktif`, dan peran di kodenya, serta mewajibkan App Check; `maxInstances: 5` membatasi biaya bila disalahgunakan. Tanpa izin ini, browser mendapat galat "The request was not authenticated" sebelum kode Function berjalan.

---

## 0. Yang perlu dipahami sebelum mulai

1. **Web yang sekarang berhenti berfungsi** begitu pembersihan selesai. Data dan akunnya hilang, dan rules baru menolak kode lama (kode lama menulis `lpj_packs`, membaca peran dari dokumen, dan seterusnya). Aplikasi baru bisa dipakai lagi setelah kode P0–P8 selesai (`docs/skema-database.md` dan `docs/rencana-keamanan-efisiensi-firebase.md`).
2. **Semua data uji, berkas, dan akun lama hilang permanen**, sesuai keputusan tanpa cadangan.
3. **Umumkan ke tim sebelum mulai.** Mulai saat ini pengembangan memakai Firebase Emulator, dan `.env` lama di komputer tiap anggota tidak berlaku lagi.
4. **Jangan jalankan `firebase deploy` tanpa `--only`.** Folder `functions/` masih berisi Function lama (Gen 1, database `imigrasi`) yang akan dihapus di P0. Untuk sekarang, yang di-deploy hanya rules.

## 1. Pilih jalur

|                 | **Jalur A — Proyek baru (direkomendasikan)**                                                                                       | Jalur B — Kosongkan proyek sekarang                                   |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Pembersihan     | Proyek lama `imigrasi-database` **dihapus**. Data, berkas, akun, Function, indeks, dan pengaturan ikut hilang, jadi tidak ada sisa | Setiap jenis data dihapus satu per satu; ada risiko tertinggal        |
| Region          | Dipilih bebas, mis. `asia-southeast2` (Jakarta) untuk Firestore, Storage, dan Functions                                            | Region database/bucket lama tidak diketahui dan tidak bisa diubah     |
| Database        | `(default)`, sesuai rules baru (Storage rules membaca Firestore `(default)`)                                                       | Database `imigrasi` dihapus, lalu `(default)` dibuat (bila belum ada) |
| Akses (IAM)     | Bersih: hanya pemilik                                                                                                              | Anggota tim yang dulu diberi akses harus dicabut satu per satu        |
| Konfigurasi web | Baru. Yang lama sudah tersebar di bundel web publik                                                                                | Sama dengan yang lama                                                 |
| Waktu           | ±1 jam di Console                                                                                                                  | ±1–2 jam, lebih banyak langkah manual                                 |

Penempatan data di Indonesia (`asia-southeast2`) adalah pilihan teraman selama arahan TI Ditjen belum ada (K16). Bila kelak Ditjen mewajibkan Pusat Data Nasional, platformnya sendiri yang harus ditinjau, apa pun jalur yang dipilih.

## 2. Jalur A — langkah demi langkah

### A1. Persiapan

- Akun Google pemilik memakai **verifikasi 2 langkah**.
- Siapkan akun penagihan (paket Blaze dibutuhkan untuk Cloud Functions Gen 2).

### A2. Buat proyek baru (Firebase Console → Add project)

1. Nama proyek, mis. `imigrasi-buleleng`. ID proyek permanen dan tidak bisa diganti.
2. **Google Analytics: matikan** (K13).
3. Upgrade ke **Blaze**, lalu pasang **peringatan anggaran** (mis. US$5, US$20, US$50 per bulan) ke e-mail pemilik: Google Cloud Console → Billing → Budgets & alerts.

### A3. Firestore (Build → Firestore Database → Create database)

- Database ID: **`(default)`**, mode **Native**.
- Lokasi: **`asia-southeast2` (Jakarta)**. Tidak bisa diubah setelah dibuat.
- Mulai dalam **production mode** (semua ditolak). Rules baru dipasang di A8.

### A4. Storage (Build → Storage → Get started)

- Bucket default di **`asia-southeast2`**, **production mode**.
- **CORS** (wajib untuk `getBlob()`; tanpa ini browser menolak isi berkas walau rules mengizinkan): `gcloud storage buckets update gs://<bucket> --cors-file=storage.cors.json`. Berkasnya hanya mengizinkan `GET`/`HEAD` dari domain web dan `http://localhost:5173`. Hapus `localhost` dari berkas itu setelah ada proyek pengembangan (A12).

### A5. Authentication (Build → Authentication)

1. **Sign-in method:** aktifkan **E-mail/Password** saja. E-mail link, Anonymous, Google, Phone, dan provider lain tetap mati (rules juga menolak selain `password`).
2. **Settings → User actions:** matikan **Enable create (sign-up)** dan **Enable delete**. Akun hanya dibuat Function `buatAkunPegawai`.
   - Bila opsi ini hanya muncul setelah upgrade ke _Identity Platform_, lakukan upgrade (gratis untuk jumlah pengguna kantor).
   - Tanpa opsi ini pun, akun liar tetap tidak bisa membaca atau menulis apa pun, karena rules mensyaratkan claim `aktif` yang hanya bisa ditulis server. Hal ini sudah diuji.
3. **Settings → Password policy:** _Enforce_, panjang minimal 12, wajib huruf besar, huruf kecil, dan angka.
4. **Settings → Email enumeration protection:** aktifkan.
5. **Settings → Authorized domains:** sisakan domain bawaan proyek dan domain produksi web. Hapus `localhost`, karena pengembangan memakai Emulator atau proyek pengembangan.
6. MFA untuk Keuangan/Super Admin dipertimbangkan saat go-live (butuh Identity Platform).

### A6. Daftarkan aplikasi web & batasi API key

1. Project settings → Your apps → **Add app (Web)**. Konfigurasinya disalin ke `.env` produksi, yang hanya dipegang pemilik dan Vercel _Production environment_. Isi `VITE_FIREBASE_DATABASE_ID=(default)` dan kosongkan `VITE_FIREBASE_MEASUREMENT_ID`.
2. Google Cloud Console → APIs & Services → Credentials → _Browser key_ proyek:
   - **Application restrictions:** _HTTP referrers_, hanya domain produksi.
   - **API restrictions:** hanya Identity Toolkit API, Token Service API, Cloud Firestore API, Cloud Storage for Firebase API, Firebase App Check API, Firebase Installations API, dan Cloud Functions (callable).

### A7. App Check (Build → App Check)

- Daftarkan aplikasi web dengan **reCAPTCHA Enterprise**. Kuncinya harus **berbasis skor** (_Use checkbox challenge_ tidak dicentang); kunci _checkbox_ tidak didukung App Check, sehingga token gagal dan semua callable ditolak. Domain kunci = domain web saja, **jangan** `localhost`; `localhost` memakai token debug.
- Penegakan untuk Firestore, Storage, dan Functions diaktifkan **saat go-live**, setelah kode P0 memasang `initializeAppCheck`. Skrip Admin SDK (`seedSuperAdmin`) tidak terpengaruh App Check.

### A8. Pasang rules baru (terminal, di folder proyek)

```bash
firebase login
firebase use --add                       # pilih proyek baru, beri alias: produksi
firebase deploy --only firestore:rules,storage --project produksi
```

Firebase CLI hanya butuh Java untuk Emulator, tidak untuk deploy. Setelah deploy, cek di Console:

- tab **Rules** Firestore dan Storage berisi rules baru (baris kedua: "Aturan keamanan … — Imigrasi Super Web");
- **Rules Playground** Firestore: `get /pegawai_ringkas/x` tanpa login → _Denied_; `get` yang sama dengan login uid apa pun tanpa claim → _Denied_.

Sejak langkah ini proyek **aman walau masih kosong**. Tidak ada akun yang bisa membaca atau menulis apa pun sampai Super Admin pertama dibuat oleh `seedSuperAdmin` (P1).

### A9. Akses proyek (IAM)

- Project settings → **Users and permissions**: hanya pemilik (dan wakil pemilik bila perlu, juga dengan verifikasi 2 langkah). Anggota tim **tidak** diberi akses ke proyek produksi.
- Jangan membuat _service account key_ (berkas JSON). Deploy dilakukan pemilik, atau kelak lewat CI dengan _Workload Identity Federation_.

### A10. Hapus proyek lama `imigrasi-database`

1. Hapus nilai `.env` proyek lama dari Vercel (Production dan Preview).
2. Firebase Console → proyek `imigrasi-database` → Project settings → General → **Delete project**. Alternatifnya: Google Cloud Console → IAM & Admin → Settings → **Shut down**.
3. Semua isi proyek berhenti saat itu juga: Firestore, Storage, akun Authentication, dan Functions. Proyek masih bisa dipulihkan selama 30 hari, lalu terhapus permanen.

### A11. Web di Vercel

- **Production:** sampai aplikasi baru siap, pasang halaman pemeliharaan atau hentikan sementara deployment produksi. Web lama tidak akan berfungsi.
- **Preview** (per branch/PR): jangan pernah memakai `.env` produksi.

### A12. Proyek pengembangan

Proyek baru `imigrasi-buleleng-dev` tidak bisa dibuat (kuota proyek akun pemilik penuh), jadi pemilik proyek memutuskan (29 Oktober 2026) memakai ulang proyek lama **`imigrasi-database`** sebagai proyek dev, alias `dev` di `.firebaserc`:

- Firestore `(default)` di `asia-southeast2` dibuat baru untuk aplikasi; database lama `imigrasi` (data uji aplikasi lama) tidak disentuh.
- Aplikasi web baru `sso_imigrasi_dev` dengan App Check reCAPTCHA Enterprise berbasis skor (domain `vercel.app`, TTL 4 jam); `localhost` memakai token debug.
- Blaze sudah aktif; CORS bucket sudah `*` (GET). Bucket bawaan ada di `US-EAST1`.
- Masih dikerjakan pemilik: akun layanan Function (langkah "Cloud Functions: akun layanan" di atas, dengan `$P = "imigrasi-database"`), `firebase deploy --only "firestore,storage,functions" --project dev`, lalu `npm run dev:isi`.

Pemakaian sehari-hari (Emulator, proyek dev, produksi) ada di `docs/pengembangan-lokal.md`.

## 3. Jalur B — bila tetap memakai proyek `imigrasi-database`

1. **Akun:** hapus semua pengguna di Authentication → Users.
2. **Functions:** `firebase functions:delete onSuratItemUpdated onPackCreated --region asia-southeast1 --project imigrasi-database --force`
3. **Firestore:** hapus database `imigrasi` (Console → Firestore → pilih database → Delete database). Lalu:
   - bila `(default)` belum ada, buat di `asia-southeast2`, production mode;
   - bila sudah ada dan lokasinya bisa diterima, kosongkan dengan `firebase firestore:delete --all-collections --database "(default)" --project imigrasi-database`.
4. **Storage:** kosongkan bucket (Console → Storage → pilih semua → Delete, atau `gcloud storage rm --recursive "gs://<bucket>/**"`).
5. **Indeks:** hapus semua indeks komposit lama di Console.
6. **Pengaturan:** jalankan A5 (Authentication), A6 (batasi API key), dan A7 (App Check), lalu putuskan tautan Google Analytics (Project settings → Integrations).
7. **IAM:** cabut akses Owner/Editor anggota tim.
8. **Rules:** pasang seperti A8 dengan `--project imigrasi-database`.

## 4. Daftar periksa setelah pembersihan

- [ ] Tim sudah diberi tahu; `.env` lama tidak dipakai lagi.
- [ ] Firestore `(default)` kosong, lokasi sesuai keputusan, dan tab Rules berisi `firestore.rules` baru.
- [ ] Storage kosong, dan tab Rules berisi `storage.rules` baru.
- [ ] Authentication: 0 pengguna, hanya E-mail/Password, sign-up mati, password policy aktif, email enumeration protection aktif.
- [ ] Functions kosong.
- [ ] Google Analytics mati.
- [ ] Peringatan anggaran aktif.
- [ ] IAM hanya pemilik.
- [ ] API key dibatasi referrer dan daftar API.
- [ ] Proyek lama dihapus (Jalur A) atau dikosongkan sesuai §3 (Jalur B).
- [ ] Vercel Production menampilkan halaman pemeliharaan; Preview tidak memakai `.env` produksi.

## 5. Setelah itu: menghidupkan aplikasi

1. **P0–P2** (fondasi, Functions & identitas, rules): kode memakai skema baru dan Emulator. Saat P1 selesai, pemilik:
   - men-deploy Functions Gen 2 (`firebase deploy --only functions --project produksi`);
   - menjalankan `seedSuperAdmin` untuk membuat Super Admin pertama.
2. **P3–P8** (LPJ, MAK, Persuratan, Inventory, Kepegawaian, pengerasan akhir). Indeks di-deploy bersama (`--only firestore:indexes`). Perubahan `firebase.json`/`firestore.indexes.json` butuh persetujuan pemilik.
3. **Go-live:**
   - urutan (backend dulu, baru web, supaya web baru tidak pernah berjalan di atas backend lama; Vercel men-deploy otomatis begitu `main` berubah): commit & buka PR → CI hijau → GitHub Release installer → cek env Vercel → `firebase deploy --only firestore,storage` dan `--only functions` (+ izin panggil callable baru) dari branch PR → merge PR → uji asap;
   - sebelum web baru ter-deploy, buat GitHub Release `agen-scanner-v1.1.1` di repo `GilangChandra88/SSO_IMIGRASI` berisi lampiran `AgenScanner-Setup.exe` (dari `public/unduh/`, kini tidak lagi di git) dengan SHA-256 di catatan rilis, karena link unduh di halaman Scanner menunjuk ke sana;
   - `firebase deploy --only firestore,storage` memasang rules sekaligus indeks; setelah itu tunggu semua indeks berstatus _Enabled_ di Console (Firestore → Indexes) sebelum uji asap;
   - selama uji asap, buka Console browser: CSP masih mode laporan (`vercel.json`), jadi setiap pelanggaran tercatat tanpa memblokir. Bila bersih untuk login, App Check, kejutan ulang tahun (kamera), pratinjau/cetak PDF, Scanner, dan OCR, ganti header menjadi `Content-Security-Policy` (penegakan);
   - App Check ditegakkan untuk Firestore dan Storage, token debug dicabut, dan kunci reCAPTCHA _checkbox_ lama yang tidak terpakai dihapus di Console reCAPTCHA;
   - `localhost` dikeluarkan dari CORS dan Authorized domains, lalu referrer API key dibatasi (A6);
   - Kepegawaian/Super Admin mengisi master: unit kerja ("Isi struktur awal"), pangkat ("Isi pangkat baku"), data pegawai (Impor CSV), jabatan, pejabat; Keuangan mengisi kode surat, DIPA, dan mengimpor MAK; Umum mengisi kategori/barang;
   - uji asap per peran (Super Admin, Keuangan, Kepegawaian, Umum, Pegawai) dengan akun uji, lalu akun uji dinonaktifkan;
   - PITR dan ekspor terjadwal Firestore diaktifkan sejak hari pertama ada data asli.
