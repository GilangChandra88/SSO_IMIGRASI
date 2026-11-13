/**
 * Pemanggil Cloud Function Koperasi (functions/src/koperasiPembukuan.js, koperasiAnggota.js, koperasiKantin.js). Semua angka uang, stok, saldo, dan
 * jurnal hanya berubah lewat sini; browser tidak menulisnya langsung.
 */
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';

const fungsi = (nama) => (data) => httpsCallable(functions, nama)(data).then((h) => h.data);

export const transferKas = fungsi('transferKas');
export const buatKategoriKantin = fungsi('buatKategoriKantin');
export const catatPenjualan = fungsi('catatPenjualanKantin');
export const batalkanPenjualan = fungsi('batalkanPenjualanKantin');
export const catatPembelian = fungsi('catatPembelianKantin');
export const aturStokAwalBarang = fungsi('aturStokAwalBarang');
export const simpanSaldoAwal = fungsi('simpanSaldoAwal');
export const simpanPengaturan = fungsi('simpanPengaturanKoperasi');
export const simpanAnggota = fungsi('simpanAnggota');
export const simpanSaldoAwalSimpanan = fungsi('simpanSaldoAwalSimpanan');
export const catatSimpanan = fungsi('catatSimpanan');
export const setorPotongGaji = fungsi('setorPotongGaji');
export const keluarkanAnggota = fungsi('ambilSimpanan');
export const catatTransaksiUmum = fungsi('catatTransaksiUmum');
export const lunasiBon = fungsi('lunasiBon');
export const lunasiUtang = fungsi('lunasiUtang');
export const tutupBuku = fungsi('tutupBuku');
export const simpanStokOpname = fungsi('simpanStokOpname');
export const simpanBarang = fungsi('simpanBarangKantin');
export const aturAktifBarang = fungsi('aturAktifBarangKantin');
