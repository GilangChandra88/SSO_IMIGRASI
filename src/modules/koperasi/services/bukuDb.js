/**
 * Bacaan buku Koperasi (docs/skema-database.md §5.7): saldo awal, rekap per tahun/total, jurnal,
 * anggota, simpanan, pengaturan, pembelian, dan transaksi umum. Semua koleksi ini hanya ditulis
 * Function; daftar memakai limit sesuai rules.
 */
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { KOLEKSI } from '@/config/koleksi';
import { LIMIT_KUERI } from '@/utils/batas';
import { daftarDokumen } from '@/utils/pantau';

export const refSaldoAwal = () => doc(db, KOLEKSI.koperasiSaldoAwal, 'utama');
export const refRekap = (id) => doc(db, KOLEKSI.koperasiRekap, String(id));
export const refRekapAnggota = (tahun) => doc(db, KOLEKSI.koperasiRekapAnggota, String(tahun));
export const refPengaturan = () => doc(db, KOLEKSI.koperasiPengaturan, 'utama');

/** Kueri terbaru-dulu berhalaman untuk koleksi `nama`; `setelah` = dibuatPada baris terakhir. */
const terbaru =
  (nama, ukuran) =>
  (setelah = null) =>
    query(
      collection(db, KOLEKSI[nama]),
      orderBy('dibuatPada', 'desc'),
      ...(setelah ? [startAfter(setelah)] : []),
      limit(ukuran),
    );
const ambil = (kueri) => async (setelah) => daftarDokumen(await getDocs(kueri(setelah)));

export const kueriJurnal = terbaru('koperasiJurnal', LIMIT_KUERI.jurnalKoperasi);
export const ambilJurnal = ambil(kueriJurnal);
export const kueriSimpanan = terbaru('koperasiSimpanan', LIMIT_KUERI.simpananKoperasi);
export const ambilSimpanan = ambil(kueriSimpanan);
export const kueriTransaksiUmum = terbaru('koperasiTransaksiUmum', LIMIT_KUERI.transaksiUmum);
export const ambilTransaksiUmum = ambil(kueriTransaksiUmum);
export const kueriPembelian = terbaru('koperasiKantinPembelian', LIMIT_KUERI.pembelianKantin);
export const ambilPembelian = ambil(kueriPembelian);
export const kueriOpname = terbaru('koperasiKantinOpname', LIMIT_KUERI.opnameKantin);
export const ambilOpname = ambil(kueriOpname);

export const kueriAnggota = () =>
  query(collection(db, KOLEKSI.koperasiAnggota), limit(LIMIT_KUERI.anggotaKoperasi));

/** Riwayat simpanan satu anggota (diurutkan di klien: tanpa indeks gabungan). */
export const kueriSimpananAnggota = (anggotaId) =>
  query(
    collection(db, KOLEKSI.koperasiSimpanan),
    where('anggotaId', '==', anggotaId),
    limit(LIMIT_KUERI.bukuAnggota),
  );

/** Kode pembelian dibuat di browser agar penekanan ulang tidak tercatat dua kali. */
export const idPembelianBaru = () => doc(collection(db, KOLEKSI.koperasiKantinPembelian)).id;

/** Pembelian yang masih punya sisa utang. */
export const kueriUtang = () =>
  query(
    collection(db, KOLEKSI.koperasiKantinPembelian),
    where('sisaUtang', '>', 0),
    limit(LIMIT_KUERI.utangKantin),
  );
