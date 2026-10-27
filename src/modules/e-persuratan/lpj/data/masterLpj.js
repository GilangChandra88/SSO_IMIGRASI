/**
 * Konstanta LPJ (dari masterData.js purwarupa, tanpa data pegawai/pejabat).
 * Data pegawai, pejabat, dan MAK diambil dari Firestore (koleksi `pegawai` dan `MAK`).
 */

export const URAIAN_MAX = 220;

export const SEKSI_LIST = ['LALINTALKIM', 'INTELDAKIM', 'TIKIM', 'Umum', 'Keuangan', 'Kepegawaian'];

export const PEJABAT_KATEGORI = [
  { id: 'kepala', label: 'Kepala' },
  { id: 'plt', label: 'Kepala PLT' },
  { id: 'plh', label: 'Kepala PLH' },
];

export const ALAT_ANGKUT = ['Kendaraan', 'Pesawat', 'Kendaraan dan Pesawat'];

// Dasar baku yang otomatis menjadi dasar terakhir Surat Perintah (sama dengan SuratForm)
export const DIPA_DASAR_TEXT =
  'Daftar Isian Penggunaan Anggaran (DIPA) Kantor Imigrasi Kelas II TPI Singaraja Nomor SP DIPA-137.03.2.692951/2026 tanggal 01 Desember 2025;';

// Poin 2–4 "Untuk" Surat Perintah yang baku (poin 1 diisi pengguna)
export const UNTUK_FIXED = [
  'Selama Melaksanakan kegiatan tersebut, yang bersangkutan dibebaskan dari tugas dinas sehari-hari;',
  'Surat tugas ini berlaku sampai dengan selesainya kegiatan; dan',
  'Melaporkan hasil kegiatan tesebut kepada Kepala Kantor Imigrasi Kelas II TPI Buleleng.',
];

// Lampiran Non-Perjadin yang wajib diunggah
export const NP_PACK_DOCS = [
  { key: 'foto_bukti', label: 'Foto Bukti/Produk' },
  { key: 'nota_pembayaran', label: 'Nota Pembayaran' },
];

// Dokumen yang dihasilkan form SPBy & Rincian Bayar (Non-Perjadin)
export const NP_RINCIAN_DOCS = [
  { num: 1, key: 'spby', label: 'SPBy', perPelaksana: false },
  { num: 2, key: 'nota_dinas', label: 'Nota Dinas', perPelaksana: false },
  {
    num: 3,
    key: 'sptjm',
    label: 'SPTJM',
    perPelaksana: true,
    note: 'Setiap pelaksana mendapat satu lembar untuk ditandatangani basah',
  },
  { num: 4, key: 'kwitansi', label: 'Kwitansi', perPelaksana: false },
  { num: 5, key: 'lembar_verifikasi', label: 'Lembar Verifikasi', perPelaksana: false },
];

// Pack 7 dokumen pertanggungjawaban Perjadin (Fase 3)
export const LPJ_DOCS = [
  { num: 1, key: 'nota_dinas', label: 'Nota Dinas', perPelaksana: false },
  { num: 2, key: 'kwitansi', label: 'Kwitansi', perPelaksana: false },
  {
    num: 3,
    key: 'sptjm',
    label: 'SPTJM',
    perPelaksana: true,
    note: 'Setiap pelaksana mendapat satu lembar untuk ditandatangani basah',
  },
  { num: 4, key: 'spby', label: 'SPBy', perPelaksana: false },
  {
    num: 5,
    key: 'rincian_spby',
    label: 'Rincian SPBy',
    perPelaksana: true,
    note: 'Setiap pelaksana mendapat satu lembar untuk ditandatangani basah',
  },
  {
    num: 6,
    key: 'suratpernyataan',
    label: 'Surat Pernyataan Pengeluaran Biaya Perjalanan Dinas',
    perPelaksana: true,
    note: 'Setiap pelaksana mendapat satu lembar untuk ditandatangani basah',
  },
  { num: 7, key: 'nominatif', label: 'Nominatif Rincian Detail Transaksi', perPelaksana: false },
];

// Bagian Laporan Kegiatan yang diisi di form: [kunci, judul, wajib]. Susunan cetak:
// A. Pendahuluan (1. Umum, 2. Maksud dan Tujuan, 3. Ruang Lingkup, 4. Dasar*), B. Kegiatan yang
// dilaksanakan (1. Pelaksana*, 2. Waktu dan Tempat*, 3. Uraian), C. Hasil, D. Simpulan dan Saran,
// E. Penutup. (*) otomatis dari Surat Perintah & SPD. Kunci `pendahuluan` = A.1 Umum (data lama).
export const LAP_SECTIONS = [
  ['pendahuluan', 'A.1 Umum', true],
  ['maksud', 'A.2 Maksud dan Tujuan', true],
  ['ruangLingkup', 'A.3 Ruang Lingkup', true],
  ['pelaksanaan', 'B.3 Uraian Kegiatan', true],
  ['hasil', 'C. Hasil yang Dicapai', true],
  ['kesimpulan', 'D. Simpulan dan Saran', true],
  ['penutup', 'E. Penutup', false],
];

// Kalimat E. Penutup bila tidak diisi
export const LAP_PENUTUP_BAKU =
  'Demikian laporan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.';

// Bukti pengeluaran per pelaksana di Fase 4 Detail LPJ (opsional), satu berkas per label: [kunci, label]
export const LAP_BUKTI_JENIS = [
  ['taksi_asal', 'Taksi Asal'],
  ['taksi_tujuan', 'Taksi Tujuan'],
  ['tiket_pp', 'Tiket PP'],
  ['bill_hotel', 'Bill Hotel'],
];

export const LAP_FOTO_MAX_COUNT = 10;
export const LAP_FOTO_MAX_BYTES = 200 * 1024;
export const NP_LAMPIRAN_MAX_COUNT = 10;
export const SCAN_MAX_BYTES = 5 * 1024 * 1024;
