# Analisis Dokumen Fase 2: SPBY & Keuangan

Fase 2 merupakan tahap pertanggungjawaban keuangan dari Perjalanan Dinas. Pada fase ini, kita menggunakan pendekatan **Form Hub**, di mana pengguna cukup mengisi data keuangan SATU KALI di **SPBY (Form Hub)**, dan data tersebut akan otomatis mengalir ke 7 dokumen cetak (PDF) turunannya.

Berikut adalah pemetaan dokumen yang perlu kita siapkan dan sesuaikan format PDF-nya:

## 1. SPBY (Form Hub)

Ini bukan dokumen yang dicetak, melainkan "terminal" form input utama untuk fase ini.
**Yang harus dikerjakan:**

- Menyempurnakan form input agar semua kebutuhan dokumen turunan tercakup (seperti biaya tiket, penginapan, uang harian, total, pejabat penandatangan, nomor rekening, dsb).
- Menambahkan fitur auto-kalkulasi (misal: Total Uang = Tiket + Penginapan + (Uang Harian x Hari)).
- Menambahkan auto-generate nominal "Terbilang" dari angka rupiah.

## 2. Nota Dinas

Dokumen pengantar dari PPK kepada Kepala Kantor mengenai pertanggungjawaban biaya perjalanan dinas.
**Yang harus dikerjakan:**

- Membuat layout/template PDF (`<NotaDinas />` di `SuratPreviewCanvas.jsx`).
- Format standar: Kop surat, Nomor, Lampiran, Hal, Kepada (Kakanim), Dari (PPK), Tabel/paragraf rincian nominal, dan Tanda Tangan PPK.

## 3. Surat Perintah Bayar (SPB)

Dokumen resmi perintah pembayaran dari PPK kepada Bendahara Pengeluaran.
**Yang harus dikerjakan:**

- Membuat layout/template PDF (`<SuratPerintahBayar />`).
- Format standar: Nomor SPB, Tanggal, "Harap dibayarkan kepada...", Jumlah Uang, Terbilang, Keperluan, Beban Anggaran (MAK), dan kolom Tanda Tangan ganda (PPK dan Bendahara/Penerima).

## 4. Rincian SPBy (Rincian Biaya)

Rincian perhitungan mendetail mengenai angka yang ada di SPB.
**Yang harus dikerjakan:**

- Membuat layout/template PDF (`<RincianSPBy />`).
- Format tabel rincian: Rincian Tiket, Transport Lokal, Penginapan, Uang Harian/Representasi, dsb.

## 5. Rincian Perjalanan Tugas

Dokumen yang memuat detail keberangkatan dan kepulangan (Hari/Tanggal/Jam/Lokasi).
**Yang harus dikerjakan:**

- Membuat layout/template PDF (`<RincianPerjalananTugas />`).
- Biasanya memuat tabel rute (Dari, Ke, Transportasi, Tgl Berangkat, Tgl Tiba).

## 6. SPTJM Pelaksana (Surat Pernyataan Tanggung Jawab Mutlak)

Surat pernyataan bahwa pelaksana perjadin bertanggung jawab penuh secara mutlak atas pengeluaran biayanya.
**Yang harus dikerjakan:**

- Membuat layout/template PDF (`<SPTJMPelaksana />`).
- Format: "Yang bertanda tangan di bawah ini...", Tanda tangan di atas materai.

## 7. Nominatif

Daftar nominatif/rekapitulasi jika perjadin dilakukan secara rombongan (atau format baku untuk KPPN).
**Yang harus dikerjakan:**

- Membuat layout/template PDF (`<Nominatif />`).
- Berbentuk tabel horizontal (landscape) berisi Nama, NIP, Golongan, Jabatan, Rincian Uang, Tanda Tangan per orang.

## 8. Kwitansi

Bukti bayar sah (Kwitansi Negara).
**Yang harus dikerjakan:**

- Membuat layout/template PDF (`<Kwitansi />`).
- Format: "Telah terima dari...", "Uang sejumlah...", "Untuk pembayaran...", Kolom nominal besar (Rp), dan Tanda Tangan (PPK, Bendahara, Penerima).

---

### Rencana Eksekusi:

1. **Langkah 1:** Kita perkuat `definition.js` dari kedelapan dokumen ini untuk memetakan alur variabelnya (_Variable Mapping_), memastikan data saling sinkron (Sinkronisasi Hub -> Anak).
2. **Langkah 2:** Kita buat satu per satu template komponen cetak PDF-nya di `SuratPreviewCanvas.jsx`. Mulai dari yang paling sederhana seperti Nota Dinas dan SPTJM.
3. **Langkah 3:** Kita buat template PDF untuk dokumen tabel kompleks seperti Kwitansi, Rincian, dan Nominatif.
