/**
 * Akses Firestore bagan akun Koperasi (docs/skema-database.md §5.7). Akun tidak dihapus, melainkan
 * dinonaktifkan; akun bawaan (`sistem`) hanya bisa diganti namanya.
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
import { AKUN_STANDAR } from '../data/baganAkun';

const koleksi = () => collection(db, KOLEKSI.koperasiAkun);
const jejakUbah = (uid) => ({ diubahPada: serverTimestamp(), diubahOleh: uid });
const jejakBaru = (uid) => ({ dibuatPada: serverTimestamp(), dibuatOleh: uid, ...jejakUbah(uid) });

// Urutan akun tambahan: sesudah akun bawaan berkode sama
const URUTAN_TAMBAHAN = 9000;

export const kueriAkun = () => query(koleksi(), limit(LIMIT_KUERI.akunKoperasi));

// Batch kecil agar setiap permintaan jauh di bawah batas pemeriksaan rules
const UKURAN_BATCH = 20;

/**
 * Lengkapi akun bawaan yang belum ada (pertama kali dibuka, atau bila daftar bawaan bertambah).
 * Aman diulang: hanya akun yang belum ada yang dibuat.
 */
export async function siapkanAkunStandar(idAda, uid) {
  const kurang = AKUN_STANDAR.filter((a) => !idAda.has(a.id));
  for (let i = 0; i < kurang.length; i += UKURAN_BATCH) {
    const batch = writeBatch(db);
    kurang
      .slice(i, i + UKURAN_BATCH)
      .forEach(({ id, ...a }) =>
        batch.set(doc(koleksi(), id), { ...a, sistem: true, aktif: true, ...jejakBaru(uid) }),
      );
    await batch.commit();
  }
}

/** @param {{ kode: string, nama: string, kelompok: string, kas: boolean }} data */
export const tambahAkun = (data, uid) =>
  addDoc(koleksi(), {
    ...data,
    sistem: false,
    urutan: URUTAN_TAMBAHAN,
    aktif: true,
    ...jejakBaru(uid),
  });

export const ubahAkun = (id, data, uid) =>
  updateDoc(doc(koleksi(), id), { ...data, ...jejakUbah(uid) });
