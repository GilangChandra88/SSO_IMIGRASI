# Skema Database — Imigrasi Super Web

**Status: acuan resmi.** Berlaku sejak Firebase dibersihkan dan dimulai ulang (keputusan pemilik proyek, 27 Oktober 2026). Struktur lama tidak dipakai lagi dan tidak dimigrasikan.

Dokumen ini adalah satu-satunya acuan struktur data. Ia berpasangan dengan:

- `firestore.rules` dan `storage.rules` (aturan keamanan yang menegakkan skema ini);
- `src/config/koleksi.js` (konstanta nama koleksi dan path Storage, dibuat di P0);
- `docs/rencana-keamanan-efisiensi-firebase.md` (latar belakang temuan K#/E#);
- `docs/rencana-pembersihan-firebase.md` (langkah pembersihan dan mulai ulang).

> **Aturan perubahan:** setiap PR yang menambah atau mengubah koleksi, field, path Storage, atau Function **wajib** memperbarui dokumen ini, `firestore.rules`/`storage.rules`, dan `src/config/koleksi.js` **dalam PR yang sama**, lalu menguji rules di Emulator (bagian 10).

---

## 1. Aturan umum

1. **Satu database:** Firestore `(default)`, mode Native, satu region dengan bucket Storage dan Cloud Functions.
2. **Nama koleksi hanya dari konstanta.** Komponen dan hook tidak boleh menulis nama koleksi sebagai teks; semuanya diambil dari `KOLEKSI` di `src/config/koleksi.js`. Path Storage diambil dari `JALUR_BERKAS` di berkas yang sama.
3. **Akses data lewat lapisan service per modul** (`modules/<modul>/services/*.js`). Komponen tidak memanggil `collection()`/`doc()` langsung.
4. **Data turunan dan resmi ditulis server.** Nomor, realisasi, ringkasan, rekap, peran, dan penghitung hanya ditulis Cloud Function (bagian 8). Rules menolak klien yang mencoba menulisnya.
5. **Tidak ada hapus fisik** untuk data keuangan, arsip, persediaan, pegawai, dan master. Penggantinya `aktif: false` atau `status: 'batal'` + alasan.
6. **Setiap kueri daftar memakai `limit()`.** Rules menolak kueri tanpa `limit` atau dengan `limit` melebihi batas koleksi (bagian 9).

## 2. Konvensi

| Aspek              | Aturan                                                                                                                                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nama koleksi       | `<domain>_<entitas>`, `snake_case`, Bahasa Indonesia, bentuk tunggal. Domain: `pegawai`, `pengguna`, `ultah`, `lpj`, `mak`, `surat`, `inventory`, `sistem`. Pengecualian: `pegawai` sendiri (domain = entitas) |
| Subkoleksi         | Nama entitas saja: `keuangan`, `bukti`, `riwayat`                                                                                                                                                              |
| Nama field         | `camelCase` Bahasa Indonesia, tanpa pengecualian (tidak ada `snake_case`, tidak ada campuran `name`/`nama`)                                                                                                    |
| ID dokumen         | Auto-id untuk entitas biasa. ID **deterministik** bila keunikan dijaga server atau penulisan harus idempoten (disebut per koleksi). **Dilarang** memakai e-mail, NIP, atau nama orang sebagai ID               |
| Pelaku aksi        | `uid` Auth (`dibuatOleh`, `diubahOleh`, `anggotaUids`, `dariUid`)                                                                                                                                              |
| Orang sebagai data | `pegawaiId` = ID dokumen `pegawai` (pelaksana, pejabat, pengambil barang, penerima ucapan). Dokumen resmi menyimpan **salinan beku** `Orang` (bagian 3)                                                        |
| Jejak audit        | `dibuatPada`, `dibuatOleh`, `diubahPada`, `diubahOleh`. Waktu dari `serverTimestamp()`; rules memeriksa `== request.time` dan pelaku `== request.auth.uid`. Jejak pembuatan tidak bisa diubah                  |
| Waktu kejadian     | `Timestamp` (field berakhiran `Pada`)                                                                                                                                                                          |
| Tanggal bisnis     | String `'YYYY-MM-DD'` (tanggal surat, LPJ, transaksi, berlaku jabatan)                                                                                                                                         |
| Uang               | Bilangan bulat rupiah (`int`), tanpa titik/koma; diformat hanya saat tampil                                                                                                                                    |
| Tahun              | `tahunAnggaran: int` untuk data anggaran; `tahun: int` untuk register kalender                                                                                                                                 |
| Enum               | Kode pendek huruf kecil (`aktif`/`batal`, `perjadin`/`nonperjadin`, tingkat MAK, tahap berkas), dengan konstanta di `src/utils/`                                                                               |
| Status aktif       | `aktif: bool` untuk master dan entitas yang bisa "dihapus"                                                                                                                                                     |
| Pembatalan         | `status: 'aktif' \| 'batal'`, `alasanBatal`, `dibatalkanPada`, `dibatalkanOleh`                                                                                                                                |
| Batas ukuran       | Setiap teks bebas dan daftar punya batas, ditulis di konstanta bersama, dipakai form, dan ditegakkan rules (angka di tiap koleksi)                                                                             |
| Berkas             | Hanya metadata `Meta` (bagian 3). **Tidak pernah menyimpan `url`**                                                                                                                                             |
| Versi              | Dokumen yang disunting banyak orang punya `versi: int` yang wajib naik 1 setiap simpan (mencegah tulisan saling menimpa)                                                                                       |

## 3. Tipe bersama

| Tipe                   | Bentuk                                                                                                                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Audit`                | `dibuatPada: Timestamp`, `dibuatOleh: uid`, `diubahPada: Timestamp`, `diubahOleh: uid`                                                                                                                                                                 |
| `Meta` (berkas)        | `{ path: string, nama: string ≤200, ukuran: int ≤10 MB, tipe: 'image/jpeg' \| 'image/png' \| 'application/pdf', diunggahPada: Timestamp, diunggahOleh: uid }`. `path` harus di folder yang ditentukan (bagian 7), dengan nama `{epochMs13}-{namaAman}` |
| `Orang` (salinan beku) | `{ pegawaiId, nama, nip, pangkat, jabatan }`                                                                                                                                                                                                           |
| `Mak` (pilihan MAK)    | `{ kode: string, akunNodeId: string, tahunNodeId: string, pilihan: map }`                                                                                                                                                                              |
| `Transaksi`            | `{ barisId: string, pelaksanaId: string, itemNodeId: string, jumlah: int, salinan: { itemKode, itemNama } }`                                                                                                                                           |

## 4. Peran & custom claims

Peran disimpan sebagai **custom claims** di token login, ditulis oleh Function `aturPeran`:

```json
{
  "peran": ["keuangan"],
  "aktif": true,
  "pegawaiId": "<ID dokumen pegawai>",
  "wajibGantiSandi": true
}
```

| Kode peran    | Label di antarmuka | Hak utama                                                                     |
| ------------- | ------------------ | ----------------------------------------------------------------------------- |
| `superadmin`  | Super Admin        | semua hak; satu-satunya yang boleh memberi peran                              |
| `keuangan`    | Keuangan           | e-Persuratan: verifikasi, arsip, DRPP, **MAK**, kode surat, batal nomor surat |
| `kepegawaian` | Kepegawaian        | data pegawai, master pangkat/jabatan, pejabat, foto                           |
| `umum`        | Umum               | Inventory (master barang/kategori/pemasok, transaksi lewat Function)          |
| _(kosong)_    | Pegawai            | berkas LPJ miliknya, **menerbitkan nomor surat**, ucapan ulang tahun          |

Akun tanpa claim `aktif: true`, atau yang login selain dengan e-mail/kata sandi, ditolak oleh semua rules. `wajibGantiSandi` ada sejak akun dibuat sampai pegawai mengganti kata sandi sementara (aplikasi mengarahkan ke `/ganti-sandi`; dicabut Function `tandaiSandiDiganti`). Label tampilan dan pemetaan kode ada di `src/utils/peran.js`.

## 5. Koleksi

Singkatan akses: `SA` superadmin · `KEU` keuangan · `KEP` kepegawaian · `UM` umum · `PG` pegawai aktif · `Fn` hanya Cloud Function · `anggota` = `uid` ada di `anggotaUids`.

### 5.1 Pegawai & akun

**`pegawai/{pegawaiId}`** (auto-id) — data lengkap pegawai.

| Field                      | Tipe                      | Ditulis | Keterangan                               |
| -------------------------- | ------------------------- | ------- | ---------------------------------------- |
| `nama`                     | string 1–120              | KEP     |                                          |
| `nip`                      | string 18 digit atau `''` | KEP     | `''` untuk non-PNS                       |
| `pangkatId`, `pangkatNama` | string                    | KEP     | ID + salinan nama dari `pegawai_pangkat` |
| `jabatanId`, `jabatanNama` | string                    | KEP     | ID + salinan nama dari `pegawai_jabatan` |
| `seksi`                    | string ≤80                | KEP     | dari `src/data/seksi.js`                 |
| `tanggalLahir`             | `'YYYY-MM-DD'` atau `''`  | KEP     | data pribadi                             |
| `fotoPaths`                | list ≤9, unik             | KEP     | path `pegawai/{id}/foto/{nama}` sendiri  |
| `email`, `authUid`         | string                    | **Fn**  | diisi `buatAkunPegawai`                  |
| `peran`                    | list                      | **Fn**  | cermin claims (untuk tampilan)           |
| `aktif`                    | bool                      | **Fn**  | `nonaktifkanPegawai`                     |
| `ultahMd`                  | `'MM-DD'`                 | **Fn**  | turunan `tanggalLahir`                   |
| `Audit`                    |                           |         |                                          |

Akses: baca KEP, SA, pemilik (`token.pegawaiId == id`) · daftar KEP (limit ≤500) · buat/ubah KEP, semua field klien wajib ada · data Super Admin hanya diubah SA · hapus ditolak.

Foto: setiap foto diunggah dua kali dengan nama berkas yang sama, `pegawai/{id}/foto/{nama}` (asli, untuk captcha ulang tahun) dan `pegawai/{id}/thumb/{nama}` (thumbnail). Rules memeriksa setiap isi `fotoPaths` berada di folder `foto/` pegawai itu sendiri dan tidak ganda. Foto pertama = foto profil. Pegawai baru memakai ID yang dibuat lebih dulu di browser, supaya fotonya bisa diunggah sebelum dokumen disimpan.

**`pegawai_ringkas/{pegawaiId}`** — ditulis **Fn** dari `pegawai`. Field: `nama`, `nip`, `pangkatNama`, `jabatanNama`, `seksi`, `authUid`, `aktif`, `ultahMd`, `fotoThumbPath` (thumbnail foto pertama; `''` bila belum ada foto). Baca PG (limit ≤500). Dipakai semua modul di luar Kepegawaian (pemilih pegawai, Inventory, banner ulang tahun, nama pejabat dan pengirim ucapan).

**`pegawai_pangkat/{id}`**, **`pegawai_jabatan/{id}`** (auto-id) — `nama` (1–160), `urutan` (int 0–9999), `aktif`, `Audit`. Baca PG (limit ≤200) · tulis KEP · hapus ditolak.

**`pegawai_pejabat/{id}`** (auto-id) — penetapan pejabat penandatangan.

| Field           | Tipe                                                | Keterangan              |
| --------------- | --------------------------------------------------- | ----------------------- |
| `jenis`         | `'ppk'\|'bendahara'\|'kpa'\|'kepala'\|'plt'\|'plh'` |                         |
| `pegawaiId`     | string                                              | harus ada di `pegawai`  |
| `berlakuMulai`  | `'YYYY-MM-DD'`                                      |                         |
| `berlakuSampai` | `'YYYY-MM-DD'` atau `null`                          | `null` = masih menjabat |
| `Audit`         |                                                     |                         |

Baca PG (limit ≤200) · buat KEP (+ SA; ditetapkan di Kepegawaian tab Pejabat) · ubah hanya `berlakuSampai` (mengakhiri jabatan) · hapus ditolak. Pejabat pada tanggal tertentu = dokumen dengan `berlakuMulai ≤ tanggal` dan (`berlakuSampai == null` atau `≥ tanggal`); bila tumpang tindih, yang `berlakuMulai`-nya paling akhir, lalu yang dibuat paling akhir (koreksi salah input). Menetapkan pejabat baru mengakhiri penetapan jenis sama yang masih terbuka sehari sebelum tanggal mulai baru (satu batch).

Pemakaian (`@/context/usePejabat`): PPK & Bendahara mengisi dokumen LPJ pada tanggal LPJ/SPBy (SPD memakai PPK pada tanggal SPD), dibekukan ke `keuangan/status.pejabatBeku` saat verifikasi selesai, dan diisi otomatis di SuratForm; Kepala/PLT/PLH menjadi pilihan cepat penandatangan Surat Perintah; `kpa` belum dipakai dokumen.

**`pengguna_preferensi/{uid}`** — `modeGelap: bool`, `diubahPada`. Hanya pemilik.

**`ultah_status/{pegawaiId}`** — `kejutanTahun: int|null`, `kejutanPada`, `resetPada`, `resetOleh` (uid). Pemilik menandai kejutan tahun berjalan; KEP me-reset (`kejutanTahun: null`). "Tahun berjalan" di rules dan klien memakai WITA (UTC+8).

**`ultah_ucapan/{tahun}_{untukPegawaiId}_{dariUid}`** — `tahun`, `untukPegawaiId`, `dariUid`, `pesan` (1–200), `dibuatPada`, `terimaKasih: bool`, `terimaKasihPada`. Dibuat pengirim untuk tahun berjalan (bukan untuk diri sendiri; penerima harus ada; kiriman kedua ke orang yang sama ditolak). Penerima hanya boleh mengisi `terimaKasih: true` (tidak bisa dikembalikan). KEP boleh menghapus (reset pengujian). Nama pengirim ditampilkan dari `pegawai_ringkas` (`authUid`).

### 5.2 LPJ

**`lpj_berkas/{berkasId}`** (auto-id) — satu berkas LPJ. Isian pelaksana ada di dokumen ini; bagian Keuangan, bukti, dan riwayat ada di subkoleksi.

| Field                      | Tipe                                                                | Ditulis             | Keterangan                                                     |
| -------------------------- | ------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------- |
| `skema`                    | `1`                                                                 | klien (tetap)       | versi skema                                                    |
| `jenis`                    | `'perjadin'\|'nonperjadin'`                                         | klien (tetap)       |                                                                |
| `uraian`                   | string 1–220                                                        | anggota             | terkunci setelah nomor terbit                                  |
| `tahunAnggaran`            | int                                                                 | anggota             | terkunci setelah nomor terbit                                  |
| `versi`                    | int                                                                 | anggota             | naik 1 setiap simpan                                           |
| bagian fase                | map (tabel berikut)                                                 | anggota / Fn        | setiap bagian punya `terkunci: bool`                           |
| `dicetak`                  | map                                                                 | anggota, kapan saja | `{ spd: { [pegawaiId]: bool }, dokumen: { [kunci]: bool } }`   |
| `anggotaUids`              | list uid                                                            | **Fn**              | pembuat + pelaksana yang punya akun; saat dibuat = `[pembuat]` |
| `tahap`                    | `'draft'\|'verif'\|'sakti'\|'transfer'\|'arsip'\|'drpp'\|'selesai'` | **Fn**              |                                                                |
| `status`                   | `'draft'\|'selesai'`                                                | **Fn**              |                                                                |
| `nomorLpj`, `nomorLpjPada` | string, Timestamp                                                   | **Fn**              | `selesaikanSpby`                                               |
| `realisasiTercatat`        | bool                                                                | **Fn**              |                                                                |
| `Audit`                    |                                                                     |                     |                                                                |

Bagian fase (urutan wajib: bagian berikutnya hanya boleh diisi bila bagian sebelumnya terkunci; bagian terkunci tidak bisa diubah):

| Jenis        | Bagian     | Dikunci oleh            | Isi utama                                                                                                                                                                        |
| ------------ | ---------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Perjadin     | `sp`       | anggota                 | `menimbang`, `dasar[]`, `kepada[]` (Orang), `untuk[]`, `pejabat` (Orang + `kategori: 'kepala'\|'plt'\|'plh'`)                                                                    |
|              | `tte`      | anggota                 | `nomorSurat`, `tanggalSurat`, `scan` (Meta \| null)                                                                                                                              |
|              | `spd`      | anggota                 | `lembarKe`, `nomorSpd`, `tanggal`, `seksi`, `maksud`, `alatAngkut`, `tujuan`, `berangkat`, `kembali`, `mak` (Mak)                                                                |
|              | `lpj`      | **Fn `selesaikanSpby`** | `tanggalLpj`, `keterangan`, `transaksi[]` (Transaksi, ≤100)                                                                                                                      |
|              | `laporan`  | anggota                 | `tanggalLaporan`, `pendahuluan`, `maksud`, `ruangLingkup`, `pelaksanaan`, `hasil`, `kesimpulan`, `penutup` (masing-masing ≤5.000), `penandatangan` (Orang), `foto[]` (Meta, ≤10) |
| Non-Perjadin | `spby`     | **Fn `selesaikanSpby`** | `tanggal`, `pelaksana[]` (Orang), `mak` (Mak), `transaksi[]` (≤100)                                                                                                              |
|              | `lampiran` | anggota                 | `foto[]` (≤10), `nota[]` (≤10) (Meta)                                                                                                                                            |

Akses: baca KEU, SA, anggota · **daftar ditolak** (daftar memakai `lpj_ringkas`) · buat PG (hanya `sp`/`spby` awal, belum terkunci, `versi: 1`) · ubah anggota sesuai aturan bagian · Keuangan tidak menyunting isi fase (Keputusan D5) · hapus lewat `hapusBerkas`.

Meta di dalam bagian (`tte.scan`, `laporan.foto[]`, `lampiran.foto[]`, `lampiran.nota[]`) diperiksa rules saat masuk: path di folder berkas itu sendiri (`lpj/{id}/tte|laporan|lampiran/foto|lampiran/nota/`), tipe dan ukuran sama dengan §7, `diunggahPada` Timestamp, `diunggahOleh` teks. Daftar ditambah **satu Meta per simpan** (melepas bebas). Saat simpan, rules hanya memeriksa bagian/field yang berubah (batas 1.000 ekspresi per permintaan).

**`lpj_berkas/{id}/keuangan/status`** (satu dokumen) — tahap Keuangan berurutan: Verifikasi → SAKTI → Transfer → Arsip.

| Field         | Isi                                                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `verifikasi`  | `selesai`, `selesaiPada`, `selesaiOleh`, `statusDokumen{}`, `dicetak{}`, `koreksi{ [itemNodeId asli]: { jumlah?, itemNodeId?, itemKode?, itemNama?, pok? } }` |
| `sakti`       | `selesai`, `nomorKwitansi` (≤60), `berkas` (Meta)                                                                                                             |
| `transfer`    | `selesai`, `tanggal`, `berkas` (Meta)                                                                                                                         |
| `arsip`       | `selesai`, `tanggalArsip`, `berkas` (Meta), `drppId` (**Fn**), `dibatalkan{ berkas, tanggalArsip, drppId, pada, oleh }` (arsip lama yang dibatalkan SA)       |
| `pejabatBeku` | `{ ppk: Orang, bendahara: Orang }` saat verifikasi                                                                                                            |
| `pokBeku`     | `{ [itemNodeId]: int }` saat verifikasi                                                                                                                       |
| `Audit`       |                                                                                                                                                               |

Baca KEU, SA, anggota · tulis KEU, hanya untuk berkas yang sudah bernomor; tahap tidak boleh selesai sebelum tahap sebelumnya · setelah arsip selesai hanya SA yang bisa mengubah · `arsip.drppId` hanya ditulis Fn (SA boleh melepasnya saat membatalkan arsip; pindaian lama pindah ke `arsip.dibatalkan`, berkas Storage tetap) · hapus ditolak.

**`lpj_berkas/{id}/bukti/{auto}`** — `pelaksanaId`, `label` (≤120), `berkas` (Meta di `lpj/{id}/bukti/{pelaksanaId}/`), `dibuatPada`, `dibuatOleh`. Dibuat anggota, juga setelah berkas final, selama verifikasi belum selesai. Tidak bisa diubah. Dihapus pengunggah (dengan syarat sama) atau KEU.

**`lpj_berkas/{id}/riwayat/{auto}`** — `kode`, `teks`, `oleh`, `pada`. Ditulis **Fn**. Baca KEU, SA, anggota (limit ≤100).

**`lpj_ringkas/{berkasId}`** — ditulis **Fn** (±1–2 KB). Field: `tahunAnggaran`, `jenis`, `uraian`, `tahap`, `status`, `nomorLpj`, `tanggalLpj`, `total` (int), `pelaksana[{ pegawaiId, nama }]`, `anggotaUids`, `progres{ selesai, total }`, `adaIsian` (pernah disunting sejak dibuat), `aktivitasTerakhir{ teks, oleh, olehNama, pada }`, `keuangan{ verifikasi, sakti, transfer, arsip, drppId, nomorKwitansi, totalVerifikasi (total setelah koreksi; null sebelum verifikasi selesai), tanggalArsip }`, `dibuatOleh`, `dibuatPada`, `diubahPada`. Baca KEU/SA (limit ≤50), anggota lewat `where('anggotaUids', 'array-contains', uid)` (limit ≤50).

**`lpj_nomor/{nomorLpj}`** — `berkasId`, `dibuatPada`. Penjaga keunikan nomor LPJ, ditulis **Fn**.

**`lpj_drpp/{DRPP-YYYY-NNNN}`** — `tahunAnggaran`, `tanggal`, `status` (`aktif`/`batal`), `berkasIds[]` (LPJ yang tertera di dokumen DRPP, 1–100), `masuk{ [berkasId]: { nomorLpj, total } }` (berkas yang sudah masuk; progres & total DRPP tanpa membaca berkasnya), `dokumen{ drpp, spm, sp2d }` (Meta di `drpp/{id}/{jenis}/`), `anggotaUids`, `batal{ alasan, berkasIds, pada, oleh }`, `Audit`. Dibuat **Fn `buatDrpp`**, daftarnya diubah **Fn `ubahDaftarDrpp`**, `masuk` juga dijaga pemicu `diKeuanganDitulis` · berkas yang tercantum otomatis masuk begitu arsipnya selesai · KEU hanya mengubah `dokumen` DRPP aktif · tidak dihapus: SA membatalkan lewat **Fn `batalkanDrpp`** (berkas lepas, nomor tidak dipakai ulang) · baca KEU, SA, anggota.

### 5.3 MAK & anggaran

**`mak_node/{id}`** (auto-id) — pohon MAK per tahun anggaran.

| Field           | Tipe                                                                       | Keterangan                                           |
| --------------- | -------------------------------------------------------------------------- | ---------------------------------------------------- |
| `tahunAnggaran` | int                                                                        | ada di **setiap** node (pohon dimuat per tahun)      |
| `tingkat`       | `tahun\|program\|kegiatan\|kro\|output\|komponen\|subkomponen\|akun\|item` | tetap                                                |
| `kode`          | string ≤40                                                                 |                                                      |
| `nama`          | string 1–300                                                               |                                                      |
| `indukId`       | string, atau `null` untuk `tahun`                                          | tetap                                                |
| `pagu`          | int rupiah                                                                 | hanya `item`; tingkat lain `0`                       |
| `aktif`         | bool                                                                       | node yang sudah dirujuk dinonaktifkan, bukan dihapus |
| `urutan`        | int                                                                        |                                                      |
| `Audit`         |                                                                            |                                                      |

Baca PG (limit ≤5.000) · buat/ubah **KEU** (+SA) · node tahun anggaran lebih dari setahun lalu hanya diubah SA · hapus lewat `hapusNodeMak` (node beserta turunannya; bila ada Item yang sudah dipakai realisasi, seluruh cabang itu dinonaktifkan, bukan dihapus) · revisi pagu Item dicatat Fn `diMakNodeDitulis` ke `sistem_log`. Satu tahun anggaran punya tepat satu node `tahun` (akar).

**`mak_realisasi/{berkasId}_{barisId}`** — ditulis **Fn**. Field: `tahunAnggaran`, `tahun`, `bulan`, `tanggal`, `itemNodeId`, `akunNodeId`, `berkasId`, `nomorLpj`, `jenis`, `jumlah` (int), `pelaksanaId`, `status`, `alasanBatal`, `salinan{ makKode, itemKode, itemNama, uraian }`, `Audit`. **Tanpa NIP/nama.** Baca KEU, SA (limit ≤100). Batal/Pulihkan lewat Function, hanya SA.

**`mak_rekap/{tahunAnggaran}`** — ditulis **Fn**: `tahunAnggaran`, `item: { [itemNodeId]: { real: { '1'…'12': int }, total: int } }` (realisasi aktif per bulan tanggal LPJ/SPBy), `diubahPada`. Diubah dengan _increment_ di transaksi yang **sama** dengan perubahan `mak_realisasi` (`selesaikanSpby`, `hapusBerkas`, `batalkanRealisasi`, `pulihkanRealisasi`), jadi tidak pernah menyimpang dari realisasinya. Pagu **tidak** disalin ke sini (sumbernya `mak_node`). Baca PG. Dipakai Rekap MAK, History MAK (total), POK, dan kartu Progres Berkas.

**`mak_dipa/{tahunAnggaran}`** — `tahunAnggaran`, `nomor` (≤120), `tanggal`, `tahunNodeId`, `Audit`. Baca PG · tulis KEU. Satu sumber teks DIPA untuk form dan template PDF.

### 5.4 Persuratan

**`surat_kode/{id}`** (auto-id) — hierarki kode surat (KOP → Kode 1 → 2 → 3).

| Field             | Tipe                                | Keterangan     |
| ----------------- | ----------------------------------- | -------------- |
| `kode`            | string 1–20, `[A-Za-z0-9./-]`       | wajib          |
| `nama`            | string 1–200                        |                |
| `tingkat`         | int 0–3                             | 0 = KOP; tetap |
| `indukId`         | string, atau `null` untuk tingkat 0 | tetap          |
| `aktif`, `urutan` |                                     |                |
| `Audit`           |                                     |                |

Baca PG (limit ≤2.000) · tulis KEU · hapus ditolak: kode yang tidak dipakai lagi dinonaktifkan (`aktif: false`, beserta turunannya) supaya nomor lama tetap terbaca. Pemilih kode hanya menampilkan kode aktif.

**`surat_nomor/{id}`** — register semua nomor surat yang terbit. Ditulis **Fn `terbitkanNomorSurat`**, yang **boleh dipanggil semua pegawai aktif**.

| Field                                                       | Tipe                                                                                    |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `nomor`, `nomorUrut` (int), `tahun` (int), `tanggal`        | `nomorUrut` mulai ulang tiap tahun (keputusan D4); untuk `srikandi` = urutan pencatatan |
| `sumber`                                                    | `'register'\|'form'\|'srikandi'`                                                        |
| `jenisSurat`, `kode[]`, `perihal`, `tujuan`, `seksi`        |                                                                                         |
| `kode[]`                                                    | salinan beku `{ kodeId, tingkat, kode, nama }` KOP → tingkat terakhir                   |
| `berkasId`                                                  | bila dari LPJ (nomor SP Srikandi, ID dokumen `sp_{berkasId}`)                           |
| `status`, `alasanBatal`, `dibatalkanPada`, `dibatalkanOleh` |                                                                                         |
| `Audit`                                                     |                                                                                         |

Nomor = kode tiap tingkat digabung titik + `-` + `nomorUrut` 4 digit. Baca PG (limit ≤100) · klien tidak bisa membuat · KEU membatalkan (`status: 'batal'` + alasan; nomor tidak dipakai ulang) · pemohon (`dibuatOleh`) atau KEU mengubah keterangan `tanggal` (tahun sama), `seksi`, `perihal`, `tujuan` selama aktif, kecuali sumber `srikandi` · hapus ditolak.

### 5.5 Inventory

| Koleksi              | ID                            | Field                                                                                                                                                                                                                                                  | Baca        | Tulis                                                                                                                                                  |
| -------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `inventory_kategori` | auto                          | `kode` (10 digit; diganti hanya lewat **Fn** `ubahKodeSakti`), `nama` (≤200), `akunKode` (6 digit atau `''`, ikut ekspor Excel untuk SAKTI), `aktif`, `Audit`                                                                                          | PG (≤500)   | UM; hapus ditolak (dinonaktifkan)                                                                                                                      |
| `inventory_barang`   | auto                          | `kode` (6 digit atau `''`) dan `kategoriId` (diganti/dilengkapi hanya lewat **Fn** `ubahKodeSakti`), `nama` (≤200), `satuan` (≤30), `stokAwal`, `stokMin` (int), `aktif`, `adaTransaksi` (**Fn**), `Audit`                                             | PG (≤2.000) | UM; `stokAwal` terkunci bila `adaTransaksi`; hapus ditolak (dinonaktifkan bila sisa stok 0)                                                            |
| `inventory_pemasok`  | auto                          | `nama` (≤200), `namaKunci` (= `nama` huruf kecil), `aktif`, `Audit`                                                                                                                                                                                    | PG (≤1.000) | UM                                                                                                                                                     |
| `inventory_kode`     | kode SAKTI (10 atau 16 digit) | `jenis` (`kategori`\|`barang`), `refId`, `dibuatPada`, `dibuatOleh`                                                                                                                                                                                    | UM          | dibuat UM **dalam batch yang sama** dengan kategori/barang; tidak bisa ditimpa (menjamin kode unik); dipindah **Fn** `ubahKodeSakti` saat kode diganti |
| `inventory_masuk`    | auto                          | `nomor` (TBR, berlanjut lintas tahun), `tanggal`, `pemasokId`, `pemasokNama`, `barangId`, `jumlah` (int > 0), `status`, `alasanBatal`, `dibatalkanPada`, `dibatalkanOleh`, `Audit`                                                                     | PG (≤200)   | **Fn** `catatMasuk`, `ubahTransaksi`, `batalkanTransaksi` (pemasok baru dibuat Fn menurut `namaKunci`)                                                 |
| `inventory_keluar`   | auto                          | `nomor` (TBK, berlanjut lintas tahun), `tanggal`, `seksi`, `pengambil` (`{ pegawaiId, nama, seksi }` dari `pegawai_ringkas`), `items[{ barangId, jumlah }]` (≤50), `barangIds[]`, `status`, `alasanBatal`, `dibatalkanPada`, `dibatalkanOleh`, `Audit` | PG (≤200)   | **Fn** `catatKeluar`, `ubahTransaksi`, `batalkanTransaksi` (menolak stok minus)                                                                        |
| `inventory_saldo`    | `{tahun}`                     | `tahun`, `masuk: { [barangId]: int }`, `keluar: { [barangId]: int }` (jumlah barang transaksi aktif bertanggal tahun itu), `bulan: { MM: { masuk, keluar } }` (jumlah dokumen transaksi, untuk grafik), `diubahPada`                                   | PG (≤20)    | **Fn**: diubah dengan _increment_ di transaksi yang SAMA dengan `catatMasuk`/`catatKeluar`/`ubahTransaksi`/`batalkanTransaksi`                         |

Stok = `stokAwal` + Σ `masuk` − Σ `keluar` seluruh dokumen `inventory_saldo` (hanya transaksi berstatus `aktif`), jadi stok dan grafik Dashboard dibaca tanpa mengunduh transaksi. Transaksi tidak dihapus: dibatalkan dengan alasan. Function menolak transaksi bertanggal di masa depan atau sampai `sistem_pengaturan/inventory.tutupSampai` (tutup buku). Nomor TBR/TBK berlanjut lintas tahun (keputusan D4): `sistem_penghitung/inventory_masuk|inventory_keluar`.

### 5.6 Sistem

| Koleksi             | ID                                                                                                        | Field                                                                                                                                                  | Baca                                                     | Tulis                                                                          |
| ------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `sistem_penghitung` | `lpj_{tahun}`, `drpp_{tahun}`, `surat_{tahun}`, `srikandi_{tahun}`, `inventory_masuk`, `inventory_keluar` | `nilai` (int), `diubahPada`                                                                                                                            | SA; `surat_{tahun}` juga PG (pratinjau nomor berikutnya) | **Fn**; `surat_{tahun}` diubah manual lewat `aturPenghitung` (KEU/SA, dicatat) |
| `sistem_pengaturan` | `inventory`                                                                                               | `tutupSampai` (`'YYYY-MM-DD'`, hanya maju kecuali SA), `diubahPada`, `diubahOleh`                                                                      | PG                                                       | UM                                                                             |
| `sistem_log`        | auto                                                                                                      | `modul` (`pegawai`\|`lpj`\|`mak`\|`surat`\|`inventory`\|`sistem`), `aksi`, `target` (path dokumen), `nilaiLama`, `nilaiBaru`, `alasan`, `oleh`, `pada` | SA; KEU untuk `lpj`/`mak`/`surat` (≤100)                 | **Fn**                                                                         |

`sistem_log` mencatat perubahan peran, pagu, pembatalan, penghitung, penonaktifan pegawai, dan buka kunci.

## 6. Koleksi lama yang tidak ada lagi

Nama-nama berikut **tidak boleh** dipakai lagi di kode. Semuanya ditolak rules.

| Lama                                     | Pengganti                                     |
| ---------------------------------------- | --------------------------------------------- |
| `MAK`, `MAK_History`                     | `mak_node`, `mak_realisasi` (+ `mak_rekap`)   |
| `lpj_packs` (+ `surat_items`)            | `lpj_berkas` (+ subkoleksi), `lpj_ringkas`    |
| `drpp`                                   | `lpj_drpp`                                    |
| `counters`, `settings`                   | `sistem_penghitung`, `sistem_pengaturan`      |
| `nomor surat kanim`                      | `surat_kode`                                  |
| `surat_dokumen`, `surat_perintah`        | `surat_nomor`                                 |
| `surat_instances`, `surat_definitions`   | — (definisi surat = `SURAT_REGISTRY` di kode) |
| `userSettings`                           | `pengguna_preferensi`                         |
| `ulang_tahun`, `ucapan_ultah`            | `ultah_status`, `ultah_ucapan`                |
| `master_pangkat`, `master_jabatan`       | `pegawai_pangkat`, `pegawai_jabatan`          |
| `pegawai.status_khusus`                  | `pegawai_pejabat`                             |
| `inventory_items`, `inventory_transaksi` | —                                             |

## 7. Storage

Semua path ditegakkan `storage.rules`. Nama berkas `{epochMs13}-{namaAman}` (huruf, angka, `.`, `_`, `-`, ≤80). Tipe hanya JPEG/PNG/PDF (tanpa SVG). Berkas tidak bisa ditimpa, dan isi folder tidak bisa didaftar. Unggahan memakai `cacheControl: 'private, max-age=31536000, immutable'` dan dibuka lewat `getBlob()`.

| Path                                                      | Isi                                  | Tipe & batas        | Unggah                              | Hapus                                                                  | Baca              |
| --------------------------------------------------------- | ------------------------------------ | ------------------- | ----------------------------------- | ---------------------------------------------------------------------- | ----------------- |
| `lpj/{berkasId}/tte/{nama}`                               | scan SP ber-TTE                      | JPEG/PNG/PDF ≤5 MB  | anggota, selama `tte` terbuka       | sama                                                                   | KEU, anggota      |
| `lpj/{berkasId}/laporan/{nama}`                           | foto laporan                         | JPEG/PNG ≤300 KB    | anggota, selama `laporan` terbuka   | sama                                                                   | KEU, anggota      |
| `lpj/{berkasId}/lampiran/{foto\|nota}/{nama}`             | lampiran Non-Perjadin                | JPEG/PNG ≤1 MB      | anggota, selama `lampiran` terbuka  | sama                                                                   | KEU, anggota      |
| `lpj/{berkasId}/bukti/{pegawaiId}/{nama}`                 | bukti pengeluaran                    | JPEG/PNG/PDF ≤5 MB  | anggota, sebelum verifikasi selesai | pengunggah (syarat sama), KEU                                          | KEU, anggota      |
| `lpj/{berkasId}/keuangan/{sakti\|transfer\|arsip}/{nama}` | kwitansi, bukti transfer, scan arsip | JPEG/PNG/PDF ≤10 MB | KEU, sebelum arsip selesai          | hanya `sakti` sebelum SAKTI selesai; transfer & arsip **tidak pernah** | KEU, anggota      |
| `drpp/{drppId}/{drpp\|spm\|sp2d}/{nama}`                  | dokumen DRPP                         | JPEG/PNG/PDF ≤10 MB | KEU (DRPP harus ada)                | tidak pernah                                                           | KEU, anggota DRPP |
| `pegawai/{pegawaiId}/thumb/{nama}`                        | thumbnail (nama = foto aslinya)      | JPEG ≤60 KB         | KEP                                 | KEP                                                                    | PG                |
| `pegawai/{pegawaiId}/foto/{nama}`                         | foto wajah (captcha)                 | JPEG ≤300 KB        | KEP                                 | KEP                                                                    | KEP, pemilik      |

## 8. Cloud Functions (Gen 2)

Node 22, region sama dengan database, `maxInstances` kecil (mis. 5), _callable_ dengan `enforceAppCheck: true`. Penulisan nomor dan saldo memakai transaksi Admin SDK, dan setiap aksi sensitif dicatat ke `sistem_log`.

| Function                                 | Jenis                                                   | Pemanggil                                                      | Menulis                                                                                                                                                                                                                                                                                        |
| ---------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `buatAkunPegawai`                        | callable                                                | KEP, SA                                                        | akun Auth, `pegawai.email/authUid`, claims awal                                                                                                                                                                                                                                                |
| `aturPeran`                              | callable                                                | SA (tidak untuk diri sendiri)                                  | claims, `pegawai.peran`, `sistem_log`                                                                                                                                                                                                                                                          |
| `nonaktifkanPegawai`, `aktifkanPegawai`  | callable                                                | KEP, SA (data Super Admin hanya SA; tidak untuk diri sendiri)  | menonaktifkan/mengaktifkan akun (`disabled`, cabut token saat nonaktif), claim & `pegawai.aktif`, `sistem_log`; nonaktif wajib alasan                                                                                                                                                          |
| `tandaiSandiDiganti`                     | callable                                                | pemilik akun, ≤10 menit setelah login ulang                    | mencabut claim `wajibGantiSandi`, `sistem_log`                                                                                                                                                                                                                                                 |
| `selesaikanSpby`                         | callable                                                | anggota                                                        | mengunci `lpj`/`spby`, `nomorLpj`, `lpj_nomor`, `mak_realisasi`, `mak_rekap`, `sistem_penghitung` (satu transaksi)                                                                                                                                                                             |
| `buatDrpp`, `ubahDaftarDrpp`             | callable                                                | KEU                                                            | `lpj_drpp` (`berkasIds`, `masuk`, `anggotaUids`), `arsip.drppId` berkas yang sudah diarsip, `sistem_penghitung`, `sistem_log`; berkas yang sudah tercantum di DRPP lain ditolak; DRPP lengkap/batal tidak bisa diubah                                                                          |
| `batalkanDrpp`                           | callable                                                | SA (wajib alasan)                                              | `lpj_drpp.status = 'batal'` + `batal{}`, melepas `arsip.drppId` anggotanya, `sistem_log`                                                                                                                                                                                                       |
| `terbitkanNomorSurat`                    | callable                                                | **semua PG**                                                   | `surat_nomor` (sumber `register`/`form`), `sistem_penghitung/surat_{tahun surat}` (satu transaksi); kode harus aktif, berantai KOP → tingkat terakhir; tahun surat = tahun lalu s.d. tahun depan                                                                                               |
| `aturPenghitung`                         | callable                                                | KEU, SA (wajib alasan)                                         | `sistem_penghitung/surat_{tahun}`, `sistem_log`; ditolak bila di bawah `nomorUrut` tertinggi yang sudah terbit di tahun itu                                                                                                                                                                    |
| `batalkanRealisasi`, `pulihkanRealisasi` | callable                                                | SA (batal wajib alasan; pulihkan ditolak bila berkas terhapus) | `mak_realisasi.status`, `mak_rekap`, `sistem_log` (satu transaksi)                                                                                                                                                                                                                             |
| `hapusNodeMak`                           | callable                                                | KEU                                                            | menghapus node + turunannya tanpa realisasi; bila sudah dipakai realisasi, menonaktifkannya; `sistem_log`                                                                                                                                                                                      |
| `catatMasuk`, `catatKeluar`              | callable                                                | UM                                                             | `inventory_masuk/keluar` (nomor TBR/TBK berlanjut), `inventory_saldo` (increment), `inventory_barang.adaTransaksi`, `inventory_pemasok` (pemasok baru), `sistem_penghitung` (satu transaksi); barang keluar ditolak bila stok kurang; tanggal tidak boleh di masa depan atau sampai tutup buku |
| `ubahTransaksi`, `batalkanTransaksi`     | callable                                                | UM (batal wajib alasan)                                        | mengubah transaksi aktif di tempat (nomor tetap) atau `status: 'batal'`; `inventory_saldo` disesuaikan; ditolak bila membuat stok minus atau tanggalnya sudah tutup buku; `sistem_log`                                                                                                         |
| `ubahKodeSakti`                          | callable                                                | UM                                                             | kode SAKTI kategori (kode barang di dalamnya ikut) atau kategori+kode barang; memindahkan penjaga `inventory_kode` (kode baru harus belum dipakai); `sistem_log`                                                                                                                               |
| `hapusBerkas`                            | callable                                                | pembuat (draf tanpa nomor), SA (belum diarsip)                 | menghapus berkas + subkoleksi + folder Storage; realisasi berkas bernomor dibatalkan dan dikurangkan dari `mak_rekap` (satu transaksi)                                                                                                                                                         |
| `diPegawaiDitulis`                       | trigger `pegawai`                                       | —                                                              | `pegawai_ringkas` (termasuk `fotoThumbPath` = thumbnail foto pertama, hanya dari folder pegawai itu), `ultahMd`                                                                                                                                                                                |
| `diBerkasDitulis`                        | trigger `lpj_berkas/{id}`                               | —                                                              | `anggotaUids`, `tahap`, `status`, `lpj_ringkas`, `riwayat`; mencatat nomor SP ber-TTE ke `surat_nomor/sp_{id}` (sumber `srikandi`, sekali saat `tte` terkunci; urutan di `sistem_penghitung/srikandi_{tahun}`)                                                                                 |
| `diKeuanganDitulis`                      | trigger `lpj_berkas/{id}/keuangan/{dok}`                | —                                                              | `tahap`, penanda keuangan di `lpj_ringkas`, `riwayat`; menautkan berkas yang baru diarsip ke DRPP yang mencantumkannya; `lpj_drpp.masuk` mengikuti `arsip.drppId`                                                                                                                              |
| `diMakNodeDitulis`                       | trigger `mak_node`                                      | —                                                              | revisi pagu Item ke `sistem_log` (ID = ID kejadian, sehingga kiriman ulang tidak dobel)                                                                                                                                                                                                        |
| `seedSuperAdmin`                         | skrip satu kali (`functions/scripts/seedSuperAdmin.js`) | pemilik proyek                                                 | Super Admin pertama; menolak bila Super Admin sudah ada                                                                                                                                                                                                                                        |

## 9. Kueri dari klien

| Koleksi                  | Bentuk kueri yang diizinkan                                                                                                                                                                                       | `limit` maks.   |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `lpj_ringkas`            | KEU: `where tahunAnggaran` (+ `tahap`) `orderBy dibuatPada desc`; anggota: `where anggotaUids array-contains uid` + `tahunAnggaran` (+ `tahap`, mis. Arsip pelaksana = `selesai`)                                 | 50              |
| `lpj_berkas`             | hanya `getDoc` per ID (daftar ditolak)                                                                                                                                                                            | —               |
| `lpj_drpp`               | KEU: per tahun; anggota: `array-contains uid`                                                                                                                                                                     | 50              |
| `mak_node`               | `where tahunAnggaran == t`                                                                                                                                                                                        | 5.000           |
| `mak_realisasi`          | KEU: `where tahunAnggaran` (+ `bulan`) `orderBy dibuatPada desc`                                                                                                                                                  | 100             |
| `surat_nomor`            | `where sumber` + `where tahun` `orderBy nomorUrut desc` (Daftar Nomor = `register`, Riwayat = `form`/`srikandi`)                                                                                                  | 100             |
| `surat_kode`             | utuh (kecil)                                                                                                                                                                                                      | 2.000           |
| `pegawai_ringkas`        | utuh (kecil), satu provider untuk seluruh aplikasi; banner ulang tahun: `where ultahMd in [hari ini]` (limit 50)                                                                                                  | 500             |
| `pegawai_pejabat`        | utuh `orderBy berlakuMulai desc`, satu provider (`@/context/usePejabat`)                                                                                                                                          | 200             |
| `inventory_masuk/keluar` | `orderBy nomor desc` (riwayat terbaru, `startAfter` untuk halaman berikutnya); rentang `where tanggal >= dari, <= sampai orderBy tanggal desc`; per barang `where barangId ==` / `where barangIds array-contains` | 200 per halaman |
| `inventory_saldo`        | utuh (satu dokumen per tahun)                                                                                                                                                                                     | 20              |
| `ultah_ucapan`           | `where untukPegawaiId == saya` atau `where dariUid == uid`, + `where tahun` (dua kesetaraan, tanpa indeks komposit); KEP per penerima                                                                             | 200             |

Setiap listener punya penanganan galat (toast "Tidak punya akses atau gagal memuat"; banner & popup ulang tahun diam karena hanya pelengkap). Data yang dipakai banyak halaman (pegawai ringkas, pejabat, MAK per tahun, ringkas berkas) dibaca lewat satu provider bersama.

## 10. Indeks & pengujian

**Indeks komposit** (`firestore.indexes.json`):

| Koleksi         | Field                                                               |
| --------------- | ------------------------------------------------------------------- |
| `lpj_ringkas`   | `anggotaUids` CONTAINS, `tahunAnggaran`, `dibuatPada` DESC          |
| `lpj_ringkas`   | `anggotaUids` CONTAINS, `tahunAnggaran`, `tahap`, `dibuatPada` DESC |
| `lpj_ringkas`   | `tahunAnggaran`, `dibuatPada` DESC                                  |
| `lpj_ringkas`   | `tahunAnggaran`, `tahap`, `dibuatPada` DESC                         |
| `lpj_drpp`      | `tahunAnggaran`, `dibuatPada` DESC                                  |
| `lpj_drpp`      | `anggotaUids` CONTAINS, `tahunAnggaran`                             |
| `mak_realisasi` | `tahunAnggaran`, `dibuatPada` DESC                                  |
| `mak_realisasi` | `tahunAnggaran`, `bulan`, `dibuatPada` DESC                         |
| `surat_nomor`   | `sumber`, `tahun`, `nomorUrut` DESC                                 |

Kueri lain cukup dilayani indeks satu field otomatis (termasuk gabungan beberapa kesetaraan, mis. `ultah_ucapan`). Setiap kueri baru yang memakai `where` + `orderBy` field lain, atau rentang + kesetaraan, wajib dicocokkan dengan tabel ini; Emulator **tidak** memeriksa indeks, jadi kekurangan indeks baru ketahuan di produksi (galat `failed-precondition`). Daftar ini dicocokkan dengan semua kueri klien dan Function pada 28 Okt 2026 (indeks `surat_nomor (tahun, nomorUrut)` dan `inventory_* (status, tanggal)` dibuang karena tidak dipakai).

**Pengecualian indeks** (`fieldOverrides`, field yang tidak pernah dikueri, kebanyakan peta berkunci dinamis): `lpj_berkas` bagian `sp`, `tte`, `spd`, `lpj`, `laporan`, `spby`, `lampiran`, dan `dicetak`; `lpj_drpp.masuk` dan `lpj_drpp.dokumen`; subkoleksi `keuangan` field `verifikasi`, `pokBeku`, dan `pejabatBeku`; `mak_rekap.item`; serta `inventory_saldo.masuk`, `.keluar`, dan `.bulan` (satu kunci per barang). Field baru yang akan dikueri tidak boleh masuk daftar ini.

**Pengujian rules:** setiap perubahan rules diuji di Firebase Emulator dengan akun uji per peran (Super Admin, Keuangan, Kepegawaian, Umum, Pegawai, akun tanpa claim). Kasus izin dan tolak untuk setiap koleksi yang diubah wajib ada. Mode "lihat sebagai" di Sidebar **bukan** alat uji keamanan.
