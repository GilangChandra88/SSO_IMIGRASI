/**
 * Batas & aturan Koperasi yang DITEGAKKAN Function (functions/src/koperasi*.js). Angka di sini harus
 * sama dengan konstanta Function; di klien hanya untuk membatasi isian dan memberi pesan lebih awal.
 */

export const BATAS = Object.freeze({
  /** Kemasan per barang (MAKS_KEMASAN, koperasiKantin.js). */
  kemasan: 5,
  /** Bahan penyusun per resep (MAKS_KOMPONEN). */
  komponen: 10,
  /** Baris bahan habis pakai per pembelian (MAKS_BAHAN). */
  bahan: 20,
  /** Barang per simpan stok opname (MAKS_OPNAME). */
  opname: 200,
  /** Baris barang per transaksi Kasir/pembelian (MAKS_ITEM). */
  barisTransaksi: 100,
  /** Jumlah per baris Kasir (MAKS_JUMLAH). */
  jumlahPerBaris: 999,
  /** Anggota per panggilan setor potong gaji (MAKS_POTONG_GAJI, koperasiAnggota.js). */
  potongGaji: 200,
});

/**
 * Akun yang hanya berubah lewat menunya sendiri, bukan lewat pengeluaran/penerimaan lain
 * (AKUN_KONTROL, koperasiPembukuan.js). Akun per kategori Kantin (`k-…`) juga termasuk.
 */
const AKUN_KONTROL = new Set([
  's-persediaan',
  's-piutang-usaha-anggota',
  's-simpanan-pokok',
  's-simpanan-wajib',
  's-shu-berjalan',
]);
export const akunKontrol = (id) => AKUN_KONTROL.has(id) || id.startsWith('k-');
