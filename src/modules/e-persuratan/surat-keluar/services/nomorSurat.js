import {
  addDoc,
  collection,
  doc,
  runTransaction,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { formatNomorSurat } from '../data/nomorSuratConfig';

const settingsRef = () => doc(db, 'settings', 'nomor_surat');

/**
 * Ambil nomor urut berikutnya (penghitung bersama SuratForm) dan simpan ke `surat_dokumen`
 * dalam satu transaksi, sehingga tidak ada nomor ganda.
 * @param {{ tanggal, seksi, perihal, tujuan, kode: {type,kode,name}[], uid, nama }} data
 * @returns {Promise<string>} nomor surat
 */
export async function buatNomorRegister({ tanggal, seksi, perihal, tujuan, kode, uid, nama }) {
  const ref = doc(collection(db, 'surat_dokumen'));
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(settingsRef());
    const urut = (snap.exists() ? Number(snap.data().lastNumber) || 0 : 0) + 1;
    const nomor = formatNomorSurat(kode, urut);
    tx.set(settingsRef(), { lastNumber: urut }, { merge: true });
    tx.set(ref, {
      nomor,
      nomorUrut: urut,
      tanggal,
      seksi,
      perihal,
      tujuan,
      kode,
      sumber: 'register',
      createdAt: new Date().toISOString(),
      createdBy: uid || '',
      createdByNama: nama || '',
    });
    return nomor;
  });
}

/** Ubah data register (nomor tidak berubah). */
export const ubahNomorRegister = (id, { tanggal, seksi, perihal, tujuan }) =>
  updateDoc(doc(db, 'surat_dokumen', id), {
    tanggal,
    seksi,
    perihal,
    tujuan,
    updatedAt: new Date().toISOString(),
  });

/** Simpan nomor urut terakhir (tab Pengaturan). */
export const simpanNomorTerakhir = (lastNumber) =>
  setDoc(settingsRef(), { lastNumber }, { merge: true });

// ─── Hierarki kode surat (koleksi `nomor surat kanim`) ──────────────────────
export async function simpanKodeSurat({ mode, id, parentId, type, kode, name }) {
  if (mode === 'edit') {
    await updateDoc(doc(db, 'nomor surat kanim', id), { kode, name });
  } else {
    await addDoc(collection(db, 'nomor surat kanim'), {
      kode,
      name,
      type,
      parentId: parentId ?? null,
      createdAt: new Date().toISOString(),
    });
  }
}

export async function hapusKodeSurat(ids) {
  for (let i = 0; i < ids.length; i += 450) {
    const batch = writeBatch(db);
    ids.slice(i, i + 450).forEach((id) => batch.delete(doc(db, 'nomor surat kanim', id)));
    await batch.commit();
  }
}
