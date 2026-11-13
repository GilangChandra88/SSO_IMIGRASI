/**
 * Bagan akun bawaan Koperasi, kode & urutan mengikuti sheet "buku koperasi v3" (docs/rencana-koperasi.md §3).
 * ID akun bawaan berawalan `s-` (rules memakainya untuk mengenali akun sistem) dan dipakai mesin jurnal,
 * jadi JANGAN diganti. Nama boleh diubah pengurus. Akun penjualan & HPP per kategori (31xx/35xx)
 * menyusul bersama Kategori Barang.
 */

export const KELOMPOK_AKUN = Object.freeze([
  { id: 'asetLancar', label: 'Aset Lancar', saldoNormal: 'debit' },
  { id: 'asetTetap', label: 'Aset Tetap', saldoNormal: 'debit' },
  { id: 'kewajibanLancar', label: 'Kewajiban Lancar', saldoNormal: 'kredit' },
  { id: 'kewajibanPanjang', label: 'Kewajiban Jangka Panjang', saldoNormal: 'kredit' },
  { id: 'ekuitas', label: 'Ekuitas', saldoNormal: 'kredit' },
  { id: 'pendapatan', label: 'Pendapatan', saldoNormal: 'kredit' },
  { id: 'hpp', label: 'Harga Pokok Penjualan', saldoNormal: 'debit' },
  { id: 'beban', label: 'Pengeluaran', saldoNormal: 'debit' },
]);

// [id tanpa awalan, kode, nama, kelompok, rekening kas/bank?]
const DAFTAR = [
  ['kas-kecil', '1001', 'Kas Kecil', 'asetLancar', true],
  ['kas', '1001', 'Kas', 'asetLancar', true],
  ['bank-1', '1001', 'Bank 1', 'asetLancar', true],
  ['bank-2', '1001', 'Bank 2', 'asetLancar', true],
  ['bank-3', '1001', 'Bank 3', 'asetLancar', true],
  ['dibayar-dimuka', '1101', 'Pengeluaran Dibayar di Muka', 'asetLancar'],
  ['persediaan', '1251', 'Persediaan', 'asetLancar'],
  ['piutang-pinjaman', '1301', 'Piutang Pinjaman Anggota', 'asetLancar'],
  ['piutang-simpanan', '1302', 'Piutang Simpanan Anggota', 'asetLancar'],
  ['piutang-lain', '1303', 'Piutang Lain-lain', 'asetLancar'],
  ['piutang-usaha-anggota', '1304', 'Piutang Usaha Anggota', 'asetLancar'],
  ['piutang-usaha-lain', '1305', 'Piutang Usaha Non-Anggota/Lain-lain', 'asetLancar'],

  ['inventaris-kantor', '1501', 'Inventaris Kantor', 'asetTetap'],
  ['inventaris-kendaraan', '1502', 'Inventaris Kendaraan', 'asetTetap'],
  ['inventaris-elektronik', '1503', 'Inventaris Elektronik', 'asetTetap'],
  ['inventaris-tanah-bangunan', '1504', 'Inventaris Tanah dan Bangunan', 'asetTetap'],
  ['akumulasi-kantor', '1601', 'Akumulasi Penyusutan Inventaris Kantor', 'asetTetap'],
  ['akumulasi-kendaraan', '1602', 'Akumulasi Penyusutan Inventaris Kendaraan', 'asetTetap'],
  ['akumulasi-elektronik', '1603', 'Akumulasi Penyusutan Inventaris Elektronik', 'asetTetap'],
  [
    'akumulasi-tanah-bangunan',
    '1604',
    'Akumulasi Penyusutan Inventaris Tanah dan Bangunan',
    'asetTetap',
  ],

  ['utang-usaha-anggota', '1701', 'Utang Usaha Anggota', 'kewajibanLancar'],
  ['utang-usaha-lain', '1702', 'Utang Usaha Lain-lain', 'kewajibanLancar'],
  ['uang-jaminan', '1703', 'Uang Jaminan', 'kewajibanLancar'],
  ['simpanan-sukarela', '1704', 'Simpanan Sukarela', 'kewajibanLancar'],
  ['simpanan-lain-1', '1705', 'Simpanan Lain 1', 'kewajibanLancar'],
  ['simpanan-lain-2', '1706', 'Simpanan Lain 2', 'kewajibanLancar'],
  ['simpanan-lain-3', '1707', 'Simpanan Lain 3', 'kewajibanLancar'],
  ['utang-ppn', '1708', 'Utang PPN', 'kewajibanLancar'],
  ['utang-pph', '1709', 'Utang PPh', 'kewajibanLancar'],
  ['diterima-dimuka', '1801', 'Pendapatan Diterima di Muka', 'kewajibanLancar'],

  ['utang-bank-1', '1901', 'Utang Bank 1', 'kewajibanPanjang'],
  ['utang-bank-2', '1902', 'Utang Bank 2', 'kewajibanPanjang'],
  ['utang-individu', '1903', 'Utang Individu', 'kewajibanPanjang'],
  ['utang-koperasi-lain', '1904', 'Utang Koperasi Lain', 'kewajibanPanjang'],
  ['utang-lembaga-lain', '1905', 'Utang Lembaga Keuangan Lain', 'kewajibanPanjang'],

  ['simpanan-pokok', '2001', 'Simpanan Pokok', 'ekuitas'],
  ['simpanan-wajib', '2002', 'Simpanan Wajib', 'ekuitas'],
  ['modal-penyertaan', '2003', 'Modal Penyertaan Usaha', 'ekuitas'],
  ['donasi-hibah', '2004', 'Donasi/Hibah', 'ekuitas'],
  ['dana-cadangan', '2007', 'Dana Cadangan', 'ekuitas'],
  ['shu-ditahan', '2009', 'SHU Ditahan', 'ekuitas'],
  ['shu-berjalan', '2010', 'SHU Tahun Berjalan', 'ekuitas'],

  ['pendapatan-bunga-pinjaman', '3001', 'Pendapatan Bunga Pinjaman', 'pendapatan'],
  ['pendapatan-denda', '3002', 'Pendapatan Denda & Penalti', 'pendapatan'],
  ['pendapatan-administrasi', '3003', 'Pendapatan Administrasi/Provisi', 'pendapatan'],
  ['pendapatan-jasa', '3007', 'Pendapatan Penjualan Jasa', 'pendapatan'],
  ['pendapatan-bunga-bank', '3008', 'Pendapatan Bunga Bank', 'pendapatan'],
  ['pendapatan-lain', '3010', 'Pendapatan Lain-lain', 'pendapatan'],

  ['hpp-lain', '3599', 'HPP Produk Lain-lain', 'hpp'],
  ['hpp-bahan', '3600', 'HPP Bahan Habis Pakai', 'hpp'],

  ['beban-4001', '4001', 'Jasa Simpanan Sukarela', 'beban'],
  ['beban-4002', '4002', 'Jasa Simpanan Lain-lain', 'beban'],
  ['beban-4003', '4003', 'Jasa Bank', 'beban'],
  ['beban-4004', '4004', 'Beban Penyusutan Piutang Tak Tertagih', 'beban'],
  ['beban-4005', '4005', 'Beban Asuransi', 'beban'],
  ['beban-4006', '4006', 'Beban Audit', 'beban'],
  ['beban-4007', '4007', 'Beban Pajak', 'beban'],
  ['beban-4008', '4008', 'Beban Keuangan Lain-lain', 'beban'],
  ['beban-4009', '4009', 'Beban Rapat', 'beban'],
  ['beban-4010', '4010', 'Beban Perjalanan Dinas', 'beban'],
  ['beban-4011', '4011', 'Beban Pelatihan', 'beban'],
  ['beban-4012', '4012', 'Beban Honor Pengurus', 'beban'],
  ['beban-4013', '4013', 'Beban Hadiah', 'beban'],
  ['beban-4014', '4014', 'Beban Organisasi Lain-lain', 'beban'],
  ['beban-4015', '4015', 'Beban Gaji Karyawan', 'beban'],
  ['beban-4016', '4016', 'Beban Tunjangan Karyawan', 'beban'],
  ['beban-4017', '4017', 'Beban Konsumsi', 'beban'],
  ['beban-4018', '4018', 'Beban Karyawan Lain-lain', 'beban'],
  ['beban-4019', '4019', 'Beban ATK', 'beban'],
  ['beban-4020', '4020', 'Beban Listrik, Telepon, dan Air', 'beban'],
  ['beban-4021', '4021', 'Beban Internet', 'beban'],
  ['beban-4022', '4022', 'Beban Ongkos Kirim', 'beban'],
  ['beban-4023', '4023', 'Beban Perbaikan dan Pemeliharaan', 'beban'],
  ['beban-4024', '4024', 'Beban Operasional Lain-lain', 'beban'],
  ['beban-4025', '4025', 'Beban Sewa', 'beban'],
  ['beban-4026', '4026', 'Beban Kerugian Penjualan Aset', 'beban'],
  ['beban-4027', '4027', 'Beban Penyusutan Inventaris Kantor', 'beban'],
  ['beban-4028', '4028', 'Beban Penyusutan Inventaris Kendaraan', 'beban'],
  ['beban-4029', '4029', 'Beban Penyusutan Inventaris Elektronik', 'beban'],
  ['beban-4030', '4030', 'Beban Penyusutan Inventaris Tanah dan Bangunan', 'beban'],
];

export const AKUN_STANDAR = Object.freeze(
  DAFTAR.map(([id, kode, nama, kelompok, kas = false], i) => ({
    id: `s-${id}`,
    kode,
    nama,
    kelompok,
    kas,
    urutan: (i + 1) * 10,
  })),
);

/** Kelompok yang punya saldo awal (akun neraca) dan sisinya. */
export const SISI_NERACA = Object.freeze({
  asetLancar: 'aset',
  asetTetap: 'aset',
  kewajibanLancar: 'pasiva',
  kewajibanPanjang: 'pasiva',
  ekuitas: 'pasiva',
});

/** Akumulasi penyusutan mengurangi aset (saldo normal kredit). Sama dengan Function simpanSaldoAwal. */
export const adalahKontra = (akunId) => akunId.startsWith('s-akumulasi-');

const KELOMPOK_DEBIT = new Set(
  KELOMPOK_AKUN.filter((k) => k.saldoNormal === 'debit').map((k) => k.id),
);

/** Saldo normal akun (positif = sesuai saldo normalnya) dari saldo awal + gerak debit/kredit. */
export function hitungSaldo(akun, awal, d, k) {
  const debitNormal = KELOMPOK_DEBIT.has(akun.kelompok) && !adalahKontra(akun.id);
  return awal + (debitNormal ? d - k : k - d);
}

/** Urutan tampil dalam satu kelompok: kode, lalu urutan sheet (kas & bank sama-sama 1001). */
export const urutAkun = (a, b) => a.kode.localeCompare(b.kode) || a.urutan - b.urutan;
