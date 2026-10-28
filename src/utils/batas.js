/**
 * Batas panjang teks, jumlah daftar, ukuran berkas, dan limit kueri.
 * Angkanya SAMA dengan firestore.rules / storage.rules (docs/skema-database.md). Form memakai
 * konstanta ini supaya pengguna melihat pesan yang jelas sebelum ditolak server; mengubah angka
 * di sini wajib diikuti perubahan rules + uji (scripts/uji-rules.mjs) di PR yang sama.
 */

/** Panjang maksimum teks (karakter). */
export const PANJANG = Object.freeze({
  namaPegawai: 120,
  namaMaster: 160, // pangkat, jabatan, unit kerja
  kodeUnit: 20,
  singkatanUnit: 30, // label pendek unit (dipakai sebagai seksi di modul lain)
  alamat: 300,
  emailPribadi: 120,
  uraianBerkas: 220,
  teksLaporan: 5000, // tiap bagian Laporan Kegiatan
  labelBukti: 120,
  pesanUcapan: 200,
  alasanBatal: 300,
  kodeMak: 40,
  namaMak: 300,
  nomorDipa: 120,
  nomorKwitansi: 60, // no. kwitansi SAKTI (keuangan/status.sakti)
  kodeSurat: 20,
  namaKodeSurat: 200,
  perihalSurat: 300, // surat_nomor.perihal (Function terbitkanNomorSurat)
  tujuanSurat: 200,
  namaBarang: 200,
  satuanBarang: 30,
  namaPemasok: 200,
  namaBerkas: 200,
});

/** Jumlah maksimum isi daftar. */
export const JUMLAH = Object.freeze({
  transaksi: 100,
  fotoLaporan: 10,
  lampiranPerJenis: 10, // foto & nota Non-Perjadin
  fotoPegawai: 9,
  barangKeluar: 50,
  berkasDrpp: 100, // LPJ pada satu DRPP (Function buatDrpp/ubahDaftarDrpp)
});

const KB = 1024;
const MB = 1024 * KB;

/** Ukuran maksimum berkas per folder Storage (byte). */
export const UKURAN_BERKAS = Object.freeze({
  lpjTte: 5 * MB,
  lpjLaporan: 300 * KB,
  lpjLampiran: 1 * MB,
  lpjBukti: 5 * MB,
  lpjKeuangan: 10 * MB,
  drpp: 10 * MB,
  pegawaiThumb: 60 * KB,
  pegawaiFoto: 300 * KB,
});

/** Batas limit() kueri daftar yang diterima rules (skema §9). */
export const LIMIT_KUERI = Object.freeze({
  halaman: 50, // daftar berhalaman umum: lpj_ringkas, lpj_drpp
  realisasi: 100,
  nomorSurat: 100,
  kodeSurat: 2000,
  makNode: 5000,
  pegawaiRingkas: 500,
  masterPegawai: 200, // pangkat, jabatan, unit kerja, pejabat
  kontakPegawai: 500,
  transaksiInventory: 200,
  kategoriInventory: 500,
  barangInventory: 2000,
  pemasokInventory: 1000,
  saldoInventory: 20, // inventory_saldo: satu dokumen per tahun
  ucapan: 200,
  buktiBerkas: 200, // lpj_berkas/{id}/bukti
  riwayatBerkas: 100, // lpj_berkas/{id}/riwayat
});
