/**
 * Penetapan pejabat penandatangan (`pegawai_pejabat`, docs/skema-database.md §5.1), ditulis
 * Kepegawaian. Isi penetapan tidak diubah dan tidak dihapus (rules); jabatan diakhiri dengan
 * mengisi `berlakuSampai`. Daftar dibaca lewat `usePenetapanPejabat` (@/context/usePejabat).
 */
import { collection, doc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { KOLEKSI } from '@/config/koleksi';

const jejakUbah = (uid) => ({ diubahPada: serverTimestamp(), diubahOleh: uid });

/** 'YYYY-MM-DD' sehari sebelum `iso`. */
export function sehariSebelum(iso) {
  const [t, b, h] = iso.split('-').map(Number);
  return new Date(Date.UTC(t, b - 1, h - 1)).toISOString().slice(0, 10);
}

/**
 * Tetapkan pejabat baru; penetapan lama di `akhiri` diakhiri dalam batch yang sama.
 * @param {{ jenis: string, pegawaiId: string, berlakuMulai: string, berlakuSampai?: string }} data
 * @param {{ id: string, berlakuSampai: string }[]} akhiri
 */
export async function tetapkanPejabat(data, akhiri, uid) {
  const batch = writeBatch(db);
  batch.set(doc(collection(db, KOLEKSI.pegawaiPejabat)), {
    jenis: data.jenis,
    pegawaiId: data.pegawaiId,
    berlakuMulai: data.berlakuMulai,
    berlakuSampai: data.berlakuSampai || null,
    dibuatPada: serverTimestamp(),
    dibuatOleh: uid,
    ...jejakUbah(uid),
  });
  akhiri.forEach((a) =>
    batch.update(doc(db, KOLEKSI.pegawaiPejabat, a.id), {
      berlakuSampai: a.berlakuSampai,
      ...jejakUbah(uid),
    }),
  );
  await batch.commit();
}

/** Akhiri (atau ubah tanggal akhir) sebuah penetapan. */
export const akhiriPejabat = (id, berlakuSampai, uid) =>
  updateDoc(doc(db, KOLEKSI.pegawaiPejabat, id), { berlakuSampai, ...jejakUbah(uid) });
