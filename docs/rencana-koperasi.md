# Rencana Modul Koperasi

> Disusun 11 November 2026 dari sheet kerja pengurus "buku koperasi v3" (Google Sheets, 21 tab) dan
> keputusan pemilik proyek. Menggantikan rencana versi pertama (modul lama sudah dihapus).
> Modul dibangun **per halaman sesuai arahan pemilik proyek** dan harus bisa dikelola dari ponsel
> (aturan di `src/modules/koperasi/ui/kelas.js`). Skema yang berlaku tetap `docs/skema-database.md` §5.7.

**Status (11 November 2026):** Tahap 1–6 sudah dibangun di branch `fitur/koperasi` (belum di-commit
dan belum di-deploy): mesin jurnal di `functions/src/koperasiBuku.js` dan Function di `koperasiPembukuan.js`, `koperasiAnggota.js`, `koperasiKantin.js`, rules, uji
Emulator (`scripts/uji-lpj.mjs` bagian Koperasi, termasuk persamaan neraca), dan semua halaman di
bagian 5. Belum ada: foto kuitansi/bukti di pengeluaran, jurnal penutupan tahun & pencatatan
pembagian SHU (sementara dicatat lewat Pengeluaran Lain-lain), buka kembali periode yang sudah ditutup.

## 1. Keputusan

| Tanggal     | Keputusan                                                                                                                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 9 Nov 2026  | Satu modul **Koperasi** di Portal. Di dalamnya **Unit Usaha** (Kantin, nanti Simpan Pinjam, dst.) dan bagian **Pusat** (Anggota & Simpanan, Pembukuan, Laporan, SHU).                                        |
| 9 Nov 2026  | Label **Manager Koperasi** (kode peran `koperasi`) = akses penuh modul; Super Admin sama.                                                                                                                    |
| 9 Nov 2026  | Satu mesin jurnal; setiap unit punya buku yang seimbang sendiri; uang antar-unit lewat rekening antar-unit. Simpan pinjam wajib dilaporkan terpisah (PP 9/1995, Permenkop UKM 2/2024 — pastikan ke akuntan). |
| 9 Nov 2026  | Kasir: tunai dan non-tunai (QRIS, transfer), tiap cara bayar punya kas tujuan; stok **boleh minus**.                                                                                                         |
| 11 Nov 2026 | **Data lama di sheet tidak dipakai** (banyak yang ambigu, terutama pembelian & penjualan). Pembukuan dimulai baru dengan **saldo awal diinput manual**.                                                      |
| 11 Nov 2026 | **Nama pembeli wajib** di Kasir, bawaan **UMUM** (dasar Jasa Usaha di SHU).                                                                                                                                  |
| 11 Nov 2026 | **Penjualan bon** (piutang) dipakai di Kasir.                                                                                                                                                                |
| 11 Nov 2026 | **Kode akun mengikuti sheet** (lihat bagian 3).                                                                                                                                                              |
| 11 Nov 2026 | Iuran wajib ke koperasi pusat diinput manual di **Pengeluaran Lain-lain**.                                                                                                                                   |

## 2. Alur kerja (dari sheet)

```
Data induk           Transaksi harian            Otomatis           Laporan
kategori ─┐          pembelian ─────────┐
akun ─────┼────────▶ penjualan (Kasir) ─┤
barang ───┘          pengeluaran lain ──┼──▶  JURNAL  ──▶  SHU (laba rugi) bulanan & tahunan
anggota ──────────▶  mutasi rekening ───┤                  Neraca bulanan & tahunan
                     transaksi simpanan ┘                  Arus kas bulanan & tahunan
                                                           Persediaan · Alokasi SHU
```

Semua yang diinput menjadi jurnal berpasangan; semua laporan dihitung dari jurnal.

| Kejadian                      | Debit                        | Kredit                            |
| ----------------------------- | ---------------------------- | --------------------------------- |
| Penjualan                     | Kas/Bank, atau Piutang (bon) | Pendapatan Penjualan _(kategori)_ |
| HPP penjualan                 | HPP _(kategori)_             | Persediaan                        |
| Pembelian                     | Persediaan                   | Kas/Bank, atau Utang Usaha        |
| Pengeluaran lain              | Akun pilihan (beban, dll.)   | Kas/Bank, atau Utang              |
| Mutasi rekening               | Rekening tujuan              | Rekening asal                     |
| Setor simpanan pokok/wajib    | Kas/Bank                     | Simpanan Pokok/Wajib              |
| Pengambilan simpanan (keluar) | Simpanan Pokok + Wajib       | Kas/Bank                          |
| Pelunasan bon _(baru)_        | Kas/Bank                     | Piutang Usaha Anggota             |
| Pelunasan utang _(baru)_      | Utang Usaha                  | Kas/Bank                          |

Cara hitung yang dipakai:

- **Kategori barang** membentuk akun pendapatan `3100 + n` dan HPP `3500 + n` (n = urutan kategori).
- **HPP rata-rata bergerak**: setiap pembelian memperbarui harga rata-rata barang = (nilai persediaan + nilai beli) ÷ (stok + jumlah beli); penjualan memakai rata-rata saat itu. Satu cara untuk jurnal maupun laporan persediaan (di sheet keduanya berbeda).
- **Simpanan**: pokok Rp300.000 sekali (syarat anggota), wajib Rp100.000/bulan (nominal bisa diatur). Tunggakan/bayar di muka dihitung dari bulan bayar pokok. Pengambilan = seluruh saldo, anggota keluar.
- **Alokasi SHU** (persentase bisa diatur, harus 100%): Jasa Modal 20% (menurut saldo simpanan pokok + wajib per 31 Desember), Jasa Usaha 30% (menurut belanja anggota di Kasir), Pengembangan Usaha 20%, Pengurus 5%, Karyawan 5%, Pendidikan 5%, Sosial 5%, Cadangan 10%.

## 3. Bagan akun (mengikuti sheet)

Kode tampil sama dengan sheet. Kas Kecil, Kas, dan Bank 1–3 semuanya berkode **1001** seperti di sheet; di sistem setiap akun tetap punya ID sendiri.

- **Aset lancar**: 1001 Kas Kecil · 1001 Kas · 1001 Bank 1 · 1001 Bank 2 · 1001 Bank 3 · 1101 Pengeluaran Dibayar di Muka · 1251 Persediaan · 1301 Piutang Pinjaman Anggota · 1302 Piutang Simpanan Anggota · 1303 Piutang Lain-lain · 1304 Piutang Usaha Anggota · 1305 Piutang Usaha Non-Anggota/Lain-lain
- **Aset tetap**: 1501 Inventaris Kantor · 1502 Inventaris Kendaraan · 1503 Inventaris Elektronik · 1504 Inventaris Tanah dan Bangunan · 1601–1604 Akumulasi Penyusutan (masing-masing)
- **Kewajiban lancar**: 1701 Utang Usaha Anggota · 1702 Utang Usaha Lain-lain · 1703 Uang Jaminan · 1704 Simpanan Sukarela · 1705–1707 Simpanan Lain 1–3 · 1708 Utang PPN · 1709 Utang PPh · 1801 Pendapatan Diterima di Muka
- **Kewajiban jangka panjang**: 1901 Utang Bank 1 · 1902 Utang Bank 2 · 1903 Utang Individu · 1904 Utang Koperasi Lain · 1905 Utang Lembaga Keuangan Lain
- **Ekuitas**: 2001 Simpanan Pokok · 2002 Simpanan Wajib · 2003 Modal Penyertaan Usaha · 2004 Donasi/Hibah · 2007 Dana Cadangan · 2009 SHU Ditahan · 2010 SHU Tahun Berjalan
- **Pendapatan**: 3001 Bunga Pinjaman · 3002 Denda & Penalti · 3003 Administrasi/Provisi · 31xx Penjualan per kategori · 3007 Penjualan Jasa · 3008 Bunga Bank · 3010 Pendapatan Lain-lain
- **HPP**: 35xx HPP per kategori · 3599 HPP Produk Lain-lain
- **Pengeluaran**: 4001 Jasa Simpanan Sukarela · 4002 Jasa Simpanan Lain-lain · 4003 Jasa Bank · 4004 Penyusutan Piutang Tak Tertagih · 4005 Asuransi · 4006 Audit · 4007 Pajak · 4008 Keuangan Lain-lain · 4009 Rapat · 4010 Perjalanan Dinas · 4011 Pelatihan · 4012 Honor Pengurus · 4013 Hadiah · 4014 Organisasi Lain-lain · 4015 Gaji Karyawan · 4016 Tunjangan Karyawan · 4017 Konsumsi · 4018 Karyawan Lain-lain · 4019 ATK · 4020 Listrik, Telepon, Air · 4021 Internet · 4022 Ongkos Kirim · 4023 Perbaikan & Pemeliharaan · 4024 Operasional Lain-lain · 4025 Sewa · 4026 Kerugian Penjualan Aset · 4027–4030 Penyusutan (per kelompok aset tetap)

## 4. Temuan pada sheet (diperbaiki di sistem)

1. Jasa Usaha (30% SHU) tidak bisa dibagi karena nama pembeli kosong → pembeli wajib di Kasir.
2. Piutang/utang tidak bisa dilunasi (menu Penerimaan Lain belum dibuat) → ada Pelunasan Bon dan Pelunasan Utang.
3. Nilai persediaan di laporan stok dan di neraca memakai cara rata-rata berbeda → satu cara (rata-rata bergerak).
4. Mengubah baris lama mengubah laporan bulan yang sudah lewat → jurnal permanen, koreksi dengan jurnal pembalik, tutup buku bulanan.
5. Iuran pusat dicatat ke Modal Penyertaan Usaha (ekuitas); kemungkinan seharusnya aset penyertaan → **pastikan ke akuntan** (sementara diinput manual di Pengeluaran Lain-lain).
6. 86 dari 95 anggota tercatat menunggak di sheet (kemungkinan potongan gaji terakhir belum dimasukkan) → cek saat input saldo awal simpanan.

## 5. Peta sheet ke modul

| Sheet                                              | Di modul Koperasi                                              | Status                 |
| -------------------------------------------------- | -------------------------------------------------------------- | ---------------------- |
| akun                                               | Pembukuan › Bagan Akun + Saldo Awal                            | Baru                   |
| jurnal                                             | Mesin jurnal (Function) + Pembukuan › Jurnal                   | Baru                   |
| mutasi rekening                                    | Kantin › Kas › Transfer                                        | Ada, sambung ke jurnal |
| kategori                                           | Kantin › Stok Barang › Kategori (+ akun pendapatan & HPP)      | Ada, sambung ke akun   |
| daftar barang                                      | Kantin › Stok Barang (+ harga beli & stok awal)                | Ada, perlu ditambah    |
| daftar pembelian                                   | Kantin › Pembelian (pemasok, tunai/utang)                      | Baru                   |
| daftar penjualan                                   | Kantin › Kasir + History (pembeli wajib, bon, HPP, pembatalan) | Ada, perlu ditambah    |
| pengeluaran lain                                   | Pembukuan › Pengeluaran Lain-lain (+ foto kuitansi)            | Baru                   |
| _(tidak ada)_                                      | Penerimaan Lain-lain, Pelunasan Bon, Pelunasan Utang           | Baru                   |
| anggota koperasi, transaksi simpanan, buku anggota | Anggota & Simpanan                                             | Baru                   |
| stok barang                                        | Laporan › Persediaan                                           | Baru                   |
| SHU, neraca, arus kas (bulanan & tahunan)          | Laporan                                                        | Baru                   |
| alokasi SHU                                        | SHU                                                            | Baru                   |
| DASHBOARD                                          | Beranda Koperasi                                               | Baru                   |

## 6. Tahapan

1. **Fondasi pembukuan** (wajib sebelum dipakai sungguhan): bagan akun, saldo awal per akun, mesin jurnal (satu Function, satu transaksi), rekap saldo per akun per bulan, halaman Jurnal. Kas, Transfer, dan Kasir yang sudah ada disambung ke jurnal; daftar kas = akun Kas & Bank; Persediaan menjadi akun neraca.
2. **Anggota & Simpanan**: anggota (pegawai dari Kepegawaian atau anggota luar tanpa akun), saldo awal simpanan per anggota, setor pokok/wajib (termasuk setor potong gaji sebulan sekaligus), status tunggakan, pengambilan saat keluar, buku anggota.
3. **Kantin lengkap**: harga beli & stok awal, Pembelian, HPP rata-rata, Kasir dengan pembeli wajib (bawaan UMUM) dan bon (khusus anggota → Piutang Usaha Anggota), pembatalan transaksi, Pelunasan Bon.
4. **Transaksi umum**: Pengeluaran Lain-lain (termasuk iuran pusat), Penerimaan Lain-lain, Pelunasan Utang.
5. **Laporan**: SHU/laba rugi, neraca, arus kas (bulanan & tahunan), persediaan, ekspor Excel/PDF, Beranda (angka ringkas seperti DASHBOARD sheet).
6. **SHU & tutup buku**: pengaturan persentase alokasi, pembagian per anggota (jasa modal & jasa usaha), tutup bulan dan tutup tahun.

## 7. Perlu dipastikan

- Ke akuntan / dinas koperasi: perlakuan iuran pusat, laporan terpisah simpan pinjam, standar akuntansi (SAK EP), golongan simpanan anggota (modal atau kewajiban).
- Ke pengurus: tanggal mulai pembukuan di sistem dan angka saldo awalnya; persentase SHU menurut AD/ART.

## 8. Kantin: multi-satuan, resep, bahan habis pakai, stok opname (12 Nov 2026)

Keputusan pemilik: setiap satuan jual boleh punya harga sendiri; es, gula, sedotan, cup = **bahan habis
pakai** (tidak distok); resep dan stok opname dibangun sekarang.

### 8.1 Prinsip

- **Satu barang = satu angka stok, dalam satuan dasar (terkecil).** Satuan lain hanya konversi
  (`isi` = berapa satuan dasar). Harga pokok rata-rata selalu per satuan dasar.
- **Resep tidak punya stok.** Saat terjual, stok setiap komponennya berkurang dan HPP = jumlah harga
  pokok komponen saat itu.
- **Bahan habis pakai tidak distok.** Pembeliannya langsung dibebankan ke akun HPP Bahan Habis Pakai.
- **Stok opname** menyamakan stok sistem dengan hitung fisik; nilai selisihnya dijurnal ke HPP Produk Lain-lain, jadi saldo akun Persediaan ikut terkoreksi.
- Semua perubahan stok tetap hanya lewat Function, satu transaksi dengan jurnalnya.

### 8.2 Penyimpanan

`koperasi_kantin_barang/{id}` (tulis klien lewat rules, kecuali `stok`, `hargaPokok`, `adaTransaksi`):

| Field                                | Isi                                                                                                             |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `jenis`                              | `'barang'` atau `'resep'`; tetap setelah dibuat                                                                 |
| `satuan`, `hargaJual`, `barkode`     | satuan dasar beserta harga & barkodenya (resep: mis. "gelas")                                                   |
| `kemasan[]`                          | ≤5 × `{ id, nama (≤30), isi (int 2–10.000 satuan dasar), hargaJual, barkode (≤64 atau '') }`; resep selalu `[]` |
| `komponen[]`                         | resep saja, ≤8 × `{ barangId, jumlah (int 1–1.000 satuan dasar komponen) }`; barang selalu `[]`                 |
| `stok`, `hargaPokok`, `adaTransaksi` | seperti sebelumnya (resep: stok & harga pokok tetap 0)                                                          |

Rules memeriksa setiap elemen `kemasan`/`komponen` (diurai satu per satu, batas elemen di atas).
Barkode unik (termasuk barkode satuan) diperiksa di aplikasi.

`koperasi_kantin_transaksi/{id}` (penjualan), per item: `{ barangId, nama, jenis, kemasanId ('' = dasar),
satuan, isi, harga, jumlah, subtotal, hpp }`; tingkat transaksi: **`stokKeluar[]`** =
`{ barangId, nama, jumlah }` (gabungan per barang dalam satuan dasar, termasuk komponen resep). Pembatalan
cukup membalik `stokKeluar`, jadi tetap benar walau resep/satuan diubah kemudian.

`koperasi_kantin_pembelian/{id}`: item `{ barangId, nama, kemasanId, satuan, isi, jumlah, harga (per satuan
dibeli), subtotal }` + **`bahan[]`** ≤20 × `{ nama, nilai }` + `totalBarang`, `totalBahan`, `total`.

`koperasi_kantin_opname/{id}` (baru, hanya Function): `tanggal`, `items[]` (`{ barangId, nama, satuan,
sistem, fisik, selisih, hargaPokok, nilai }`), `jumlahBarang`, `jumlahSelisih`, `totalNilai`,
`keterangan`, `jurnalId`, `dibuatPada`, `dibuatOleh`.

Akun bawaan baru: `s-hpp-bahan` **3600 HPP Bahan Habis Pakai** (HPP). Selisih opname memakai **3599 HPP Produk Lain-lain**. Function opname: `simpanStokOpname`.

### 8.3 Jurnal

| Kejadian                     | Jurnal                                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| Jual barang (satuan apa pun) | D Kas/Piutang / K Penjualan kategori; D HPP kategori / K Persediaan (hargaPokok × jumlah × isi) |
| Jual resep                   | sama; HPP = Σ hargaPokok komponen × jumlah komponen × jumlah                                    |
| Beli barang + bahan          | D Persediaan (barang), D HPP Bahan Habis Pakai (bahan) / K Kas atau Utang Usaha                 |
| Opname                       | bersih kurang: D HPP Produk Lain-lain / K Persediaan; bersih lebih: kebalikannya                |

### 8.4 Layar

- **Tambah/Ubah Barang:** pilih Barang atau Resep. Barang: satuan dasar + daftar satuan lain (nama, isi,
  harga, barkode). Resep: daftar komponen + perkiraan HPP & margin.
- **Kasir:** barang bersatuan lebih dari satu → pilih satuan; scan barkode satuan langsung memilih
  satuannya. Resep tampil dengan "bisa dibuat ± N".
- **Pembelian:** pilih satuan per baris; bagian **Bahan habis pakai** (nama + nilai).
- **Stok Barang › tab Opname:** isi stok fisik (yang dikosongkan tidak dihitung), selisih langsung
  terlihat, simpan, dan riwayat opname.

### 8.5 Pengaturan Pembayaran (12 Nov 2026)

Kas & Bank dipindah ke **Pembukuan › Kas & Bank** (milik koperasi, bukan unit). Kantin mendapat menu
**Pembayaran**: daftar cara bayar Kasir (`koperasi_kantin_pembayaran`: `nama`, `kasId` akun kas/bank,
`aktif`, `urutan`) yang bisa ditambah. Kasir hanya memilih cara bayar; kas tujuan diambil Function dari
pengaturan itu, dan nama cara bayar dibekukan di transaksi (`pembayaran: { id, nama }`). Bon selalu
tersedia untuk anggota.
