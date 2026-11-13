/**
 * Cara bayar Kasir Kantin (`koperasi_kantin_pembayaran`, docs/skema-database.md §5.7). Setiap cara bayar
 * menentukan kas tujuannya; Function penjualan mengambil kas dari sini. Tidak dihapus, dinonaktifkan.
 */
import {
  addDoc,
  collection,
  doc,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { KOLEKSI } from '@/config/koleksi';
import { LIMIT_KUERI } from '@/utils/batas';

const koleksi = () => collection(db, KOLEKSI.koperasiKantinPembayaran);
const jejakUbah = (uid) => ({ diubahPada: serverTimestamp(), diubahOleh: uid });
const jejakBaru = (uid) => ({ dibuatPada: serverTimestamp(), dibuatOleh: uid, ...jejakUbah(uid) });

export const kueriPembayaran = () => query(koleksi(), limit(LIMIT_KUERI.pembayaranKantin));

/** @param {{ nama: string, kasId: string, urutan: number }} data */
export const tambahPembayaran = (data, uid) =>
  addDoc(koleksi(), { ...data, aktif: true, ...jejakBaru(uid) });

export const ubahPembayaran = (id, data, uid) =>
  updateDoc(doc(koleksi(), id), { ...data, ...jejakUbah(uid) });

/** Isian awal yang umum dipakai kantin: [{ nama, kasId }]. */
export function buatPembayaranBawaan(daftar, uid) {
  const batch = writeBatch(db);
  daftar.forEach((d, i) =>
    batch.set(doc(koleksi()), { ...d, urutan: i + 1, aktif: true, ...jejakBaru(uid) }),
  );
  return batch.commit();
}
