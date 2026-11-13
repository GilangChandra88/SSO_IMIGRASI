/** Label kode anomali (sama dengan functions/src/jejak.js & logdev.js). */
export const KODE_ANOMALI = Object.freeze({
  A1: 'Selisih stok opname',
  A2: 'Pembatalan transaksi',
  A3: 'Dijual di bawah harga pokok',
  A4: 'Tanggal transaksi mundur',
  A5: 'Di luar jam kerja',
  A6: 'Akses ditolak',
  A7: 'Pengaturan penting diubah',
  A8: 'Diubah dari luar aplikasi',
  A9: 'Pelaku tidak cocok / celah aturan',
  A10: 'Gagal masuk',
  A11: 'Akun dipakai di dua tempat',
  R1: 'Buku Koperasi tidak seimbang',
  R6: 'Lonjakan galat',
  R7: 'Kuota gratis Firebase hampir/sudah habis',
});

export const STATUS_ANOMALI = Object.freeze([
  { id: 'baru', label: 'Baru' },
  { id: 'diperiksa', label: 'Diperiksa' },
  { id: 'wajar', label: 'Wajar' },
  { id: 'ditindak', label: 'Ditindak' },
]);

export const STATUS_GALAT = Object.freeze([
  { id: 'baru', label: 'Baru' },
  { id: 'ditangani', label: 'Ditangani' },
  { id: 'abaikan', label: 'Diabaikan' },
]);

export const JENIS_AKTIVITAS = Object.freeze({
  masuk: 'Masuk',
  mulai: 'Buka aplikasi',
  halaman: 'Buka halaman',
  panggil: 'Aksi',
  keluar: 'Keluar',
  gagalMasuk: 'Gagal masuk',
});

export const STATUS_PANGGILAN = Object.freeze({
  ok: 'Berhasil',
  tolak: 'Ditolak (validasi)',
  ditolak: 'Ditolak (akses)',
  galat: 'Galat',
});

export const MODUL = Object.freeze({
  lpj: 'LPJ',
  mak: 'MAK',
  surat: 'Surat',
  inventory: 'Inventory',
  pegawai: 'Kepegawaian',
  koperasi: 'Koperasi',
  sistem: 'Sistem',
  logdev: 'Log Developer',
});

export const JALUR = Object.freeze({
  klien: 'Browser',
  luar: 'Luar aplikasi',
});

/** Ambang anomali (functions/src/jejak.js AMBANG_BAWAAN) beserta label isian. */
export const AMBANG = Object.freeze([
  {
    id: 'hariMundur',
    label: 'Tanggal transaksi mundur lebih dari',
    satuan: 'hari',
    min: 1,
    maks: 365,
  },
  { id: 'jamMalamMulai', label: 'Jam di luar kerja mulai', satuan: 'jam (WITA)', min: 0, maks: 23 },
  {
    id: 'jamMalamSelesai',
    label: 'Jam di luar kerja selesai',
    satuan: 'jam (WITA)',
    min: 0,
    maks: 23,
  },
  {
    id: 'selisihOpnamePersen',
    label: 'Selisih opname lebih dari',
    satuan: '% stok',
    min: 1,
    maks: 100,
  },
  {
    id: 'selisihOpnameRupiah',
    label: 'Selisih opname lebih dari',
    satuan: 'rupiah',
    min: 0,
    maks: 100000000,
  },
  {
    id: 'ditolakPerJam',
    label: 'Akses ditolak dianggap mencurigakan mulai',
    satuan: 'kali/jam',
    min: 1,
    maks: 1000,
  },
  {
    id: 'gagalMasukPerJam',
    label: 'Gagal masuk dianggap mencurigakan mulai',
    satuan: 'kali/jam',
    min: 1,
    maks: 1000,
  },
  { id: 'galatPerHari', label: 'Lonjakan galat mulai', satuan: 'jenis/hari', min: 1, maks: 10000 },
]);

/** Tarif & kuota gratis untuk perkiraan biaya Firebase (functions/src/pemakaian.js TARIF_BAWAAN). */
export const TARIF = Object.freeze([
  { id: 'kurs', label: 'Kurs', satuan: 'Rp per USD' },
  { id: 'bacaPer100rb', label: 'Firestore baca', satuan: 'USD per 100.000' },
  { id: 'tulisPer100rb', label: 'Firestore tulis', satuan: 'USD per 100.000' },
  { id: 'hapusPer100rb', label: 'Firestore hapus', satuan: 'USD per 100.000' },
  { id: 'panggilanPerJuta', label: 'Panggilan Function', satuan: 'USD per 1 juta' },
  { id: 'instansPerJam', label: 'Waktu instans Function', satuan: 'USD per jam' },
  { id: 'storagePerGbBulan', label: 'Simpanan Storage', satuan: 'USD per GB/bulan' },
  { id: 'unduhPerGb', label: 'Unduhan Storage', satuan: 'USD per GB' },
  { id: 'gratisBacaHari', label: 'Gratis baca', satuan: 'per hari' },
  { id: 'gratisTulisHari', label: 'Gratis tulis', satuan: 'per hari' },
  { id: 'gratisHapusHari', label: 'Gratis hapus', satuan: 'per hari' },
  { id: 'gratisPanggilanBulan', label: 'Gratis panggilan Function', satuan: 'per bulan' },
  { id: 'gratisInstansJamBulan', label: 'Gratis waktu instans', satuan: 'jam per bulan' },
  { id: 'gratisStorageGb', label: 'Gratis simpanan Storage', satuan: 'GB' },
  { id: 'gratisUnduhGbBulan', label: 'Gratis unduhan Storage', satuan: 'GB per bulan' },
]);
