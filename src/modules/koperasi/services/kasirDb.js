/**
 * Bacaan Kasir Kantin (docs/skema-database.md §5.7). Transaksi hanya ditulis Function
 * `catatPenjualanKantin` / `batalkanPenjualanKantin` (lihat services/fungsi.js).
 */
import { collection, doc, getDocs, limit, orderBy, query, startAfter } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { KOLEKSI } from '@/config/koleksi';
import { LIMIT_KUERI } from '@/utils/batas';
import { daftarDokumen } from '@/utils/pantau';

// Label cara bayar transaksi: nama dari pengaturan (beku di transaksi), bon, atau data impor lama
const LABEL_LAMA = { tunai: 'Tunai', qris: 'QRIS', transfer: 'Transfer', bon: 'Bon' };
export const labelBayar = (t) => t.pembayaran?.nama ?? LABEL_LAMA[t.caraBayar] ?? t.caraBayar;

const koleksi = () => collection(db, KOLEKSI.koperasiKantinTransaksi);

/** Kode transaksi dibuat di browser agar penekanan ulang tidak tercatat dua kali. */
export const idTransaksiBaru = () => doc(koleksi()).id;

export const kueriHistory = (setelah = null) =>
  query(
    koleksi(),
    orderBy('dibuatPada', 'desc'),
    ...(setelah ? [startAfter(setelah)] : []),
    limit(LIMIT_KUERI.historyKasir),
  );

export const ambilHistory = async (setelah) => daftarDokumen(await getDocs(kueriHistory(setelah)));
