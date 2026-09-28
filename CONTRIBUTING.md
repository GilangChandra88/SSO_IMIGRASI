# Panduan Kontribusi

Alur kerja tim untuk repo ini. Aturan kode, keamanan, dan library ada di [`CLAUDE.md`](CLAUDE.md); cara menjalankan proyek ada di [`README.md`](README.md).

## 1. Pembagian modul

Satu orang, satu (atau beberapa) modul. **Hanya ubah folder modul yang ditugaskan kepada Anda.**

Usulan untuk 4 orang (ukuran dalam baris kode). Pemilik proyek mengisi kolom penanggung jawab dan boleh menyeimbangkan ulang.

| Modul / folder                                                                                                                                                                                       | Isi                                               | Ukuran  | Penanggung jawab |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------- | ---------------- |
| `modules/e-persuratan/surat-keluar`                                                                                                                                                                  | Persuratan, form surat, Nomor Surat Kanim         | ±4,1 rb | @ … (Anggota A)  |
| `components/SuratPreview`, `data/surat`                                                                                                                                                              | Template PDF dan definisi surat (dipakai bersama) | ±3,2 rb | @ … (Anggota A)  |
| `modules/e-persuratan/lpj`                                                                                                                                                                           | Daftar/detail/buat LPJ, alur dokumen              | ±1,9 rb | @ … (Anggota B)  |
| `modules/e-persuratan/dashboard`                                                                                                                                                                     | Dashboard tugas LPJ                               | ±0,4 rb | @ … (Anggota B)  |
| `modules/e-persuratan/data-master`                                                                                                                                                                   | MAK Setup, History MAK                            | ±1,3 rb | @ … (Anggota C)  |
| `modules/kepegawaian`                                                                                                                                                                                | Data pegawai, master pangkat/jabatan              | ±0,7 rb | @ … (Anggota C)  |
| `modules/inventory`                                                                                                                                                                                  | Stok barang, transaksi                            | ±1,3 rb | @ … (Anggota D)  |
| `modules/sso`                                                                                                                                                                                        | Login, Portal                                     | ±0,3 rb | @ … (Anggota D)  |
| `modules/e-persuratan/AppModule.jsx` dan `index.js`                                                                                                                                                  | Rute dan menu bersama e-Persuratan (lihat bawah)  | ±0,2 rb | Pemilik proyek   |
| `components/` (selain `SuratPreview`), `layouts/`, `utils/`, `config/`, `context/`                                                                                                                   | Kode bersama                                      | —       | Pemilik proyek   |
| `src/App.jsx`, `src/main.jsx`, `src/index.css`, `docs/`, `functions/`, `.github/`, `public/`, konfigurasi (`package.json`, `eslint.config.js`, `vite.config.js`, `firebase.json`, dst.), `CLAUDE.md` | Kerangka proyek                                   | —       | Pemilik proyek   |

Bila timnya 3 orang, gabungkan Anggota D ke Anggota C.

**`AppModule.jsx` e-Persuratan** menyusun menu dan rute semua sub-modul, jadi setiap halaman baru di sub-modul mana pun perlu menambah satu baris di sana. Ini titik konflik yang paling mungkin. Aturannya: tambahkan barisnya di PR Anda (perubahan kecil), sebut di deskripsi PR, dan jangan merapikan/menyusun ulang isi file itu.

**Ketergantungan antar sub-modul:** `dashboard → lpj` dan `surat-keluar → lpj` (lewat `lpj/index.js`). Pemilik `lpj` harus berkabar ke pemilik dua modul itu bila mengubah fungsi yang diekspor `lpj/index.js` (mis. `useMyLPJTasks`, `syncSPDItems`, `syncOtherSPDsData`).

Butuh perubahan di modul orang lain? **Jangan langsung diubah.** Buka Issue atau minta pemiliknya. Butuh mengubah kode bersama? Boleh, tetapi wajib disebut di Pull Request (lihat bagian 4).

## 2. Membuat branch

Selalu mulai dari `main` yang terbaru dan jangan pernah commit ke `main`.

```bash
git switch main
git pull
git switch -c fitur/nama-fitur
```

Untuk memperbaiki bug, pakai `git switch -c perbaikan/nama-bug`. Nama branch huruf kecil, pisah kata dengan `-`, singkat tapi jelas (`fitur/filter-status-lpj`, `perbaikan/progres-lpj-tidak-update`). Satu branch = satu tujuan; buat PR kecil dan sering.

## 3. Commit

```bash
npm run lint
```

Harus 0 error. Lalu:

```bash
git add <file-yang-diubah>
git commit -m "perbaikan(lpj): progres tidak ter-update setelah dokumen selesai"
```

Hindari `git add .` agar tidak ikut file lain. Format pesan: `<jenis>(<modul>): <ringkasan>` dengan jenis `fitur`, `perbaikan`, `gaya`, `refaktor`, `dokumen`, atau `chore`. Jangan menjalankan `npm run format` untuk seluruh proyek; format hanya file yang Anda ubah (`npx prettier --write <file>`), supaya diff tidak penuh perubahan yang bukan milik Anda.

## 4. Membuat Pull Request

1. Push branch: `git push -u origin nama-branch-anda`.
2. Di GitHub tekan **Compare & pull request**, target `main`.
3. Isi **template PR** (otomatis muncul): modul yang diubah, sudah lint, sudah dites manual, ada/tidak perubahan di kode bersama.
4. Sertakan tangkapan layar bila mengubah tampilan.
5. **Wajib disebutkan di deskripsi PR** bila menyentuh kode bersama: `src/components/`, `src/layouts/`, `src/utils/`, `src/config/`, `src/context/`, `src/data/`, `src/App.jsx`, `AppModule.jsx` e-Persuratan, `package.json`, atau `CLAUDE.md`. Perubahan itu memengaruhi semua orang, jadi pemilik proyek perlu memeriksanya. Pengecualian: pemilik `components/SuratPreview` dan `data/surat` (Anggota A) tetap mencentang kotaknya, tetapi cukup menyebut "perubahan rutin di modul saya".
6. Minta review minimal satu orang. Jangan merge PR sendiri sebelum disetujui. Selesai merge, hapus branch Anda.

Jangan memasukkan ke PR: file `.env`, data asli pegawai/pemohon, password/API key, `dist/`, atau perubahan format massal.

## 5. Menyelesaikan konflik

Konflik terjadi bila dua orang mengubah baris yang sama. Bila semua bekerja di modul masing-masing, konflik jarang terjadi. Kalau muncul, biasanya di `AppModule.jsx` e-Persuratan, `src/components/`, `package.json`, atau `package-lock.json`.

Cara menyelesaikannya (tanpa force push):

1. **Simpan pekerjaan Anda dulu** (commit atau `git stash`), lalu ambil versi terbaru:
   ```bash
   git fetch origin
   git switch nama-branch-anda
   git merge origin/main
   ```
2. Jika Git melaporkan `CONFLICT`, buka file yang berkonflik (`git status` menampilkannya). Cari penanda `<<<<<<<`, `=======`, `>>>>>>>`. Pertahankan gabungan yang benar dari kedua sisi. **Jangan asal memilih "punya saya"**, terutama di kode bersama (itu kode orang lain). Bingung? Tanya pemilik file itu. Hapus semua penanda.
3. Jika `package.json` ikut konflik, gabungkan dulu secara manual (sertakan dependensi dari kedua sisi). Jika `package-lock.json` yang konflik, jangan disunting manual:
   ```bash
   git checkout origin/main -- package-lock.json
   npm install
   ```
4. Tandai semua yang sudah selesai (termasuk `package-lock.json` bila ikut berubah):
   ```bash
   git add <file-yang-sudah-diselesaikan>
   ```
5. Pastikan masih lolos:
   ```bash
   npm run lint
   npm run build
   ```
6. Selesaikan merge dan kirim:
   ```bash
   git commit --no-edit
   git push
   ```

Ingin membatalkan merge yang berantakan? `git merge --abort` mengembalikan ke keadaan sebelum merge.

## 6. Memakai Claude Code

Aturan di `CLAUDE.md` otomatis dibaca Claude Code. Awali sesi dengan menyebut modul Anda, misalnya:

> Saya mengerjakan modul `lpj`. Kerjakan hanya di `src/modules/e-persuratan/lpj`. Tugas: …

Pengaturan tim ada di `.claude/settings.json` (pengaturan pribadi taruh di `.claude/settings.local.json`, tidak di-commit). Claude Code akan meminta konfirmasi sebelum mengubah kode bersama, konfigurasi, atau `CLAUDE.md`, sebelum `git push`, dan sebelum memasang/menghapus paket. `force push`, `push` ke `main`, `reset --hard`, `git clean`, dan membaca `.env` dilarang.

> **Batasan:** aturan itu adalah pagar pengaman, bukan pengaman mutlak. Menurut dokumentasi Claude Code, aturan hanya mencocokkan teks perintah persis seperti ditulis (mis. `git -C . push` atau `bash -c "..."` tidak tertangkap). Garis pertahanan yang sebenarnya adalah **branch protection di GitHub** (lihat panduan pemilik proyek): `main` tidak bisa di-push langsung dan wajib lewat Pull Request yang disetujui.

## 7. Aturan singkat

- Jangan commit ke `main`. Jangan `git push --force`.
- Lint 0 error dan build lolos sebelum PR.
- Tidak ada library baru tanpa persetujuan pemilik proyek.
- Tidak ada data asli, password, atau API key di kode.
- Jalankan aplikasi lokal terhadap Firebase **DEV**, bukan produksi.
