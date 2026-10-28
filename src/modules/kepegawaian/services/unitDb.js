/**
 * Penulisan unit kerja (`pegawai_unit`, docs/skema-database.md §5.1). Dibaca lewat
 * `useUnitKerja` (@/context/useUnitKerja). Unit tidak dihapus (aktif: false); jenis tetap,
 * induk harus tepat satu tingkat di atasnya (rules `unitSah`).
 */
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { KOLEKSI } from '@/config/koleksi';
import { tingkatUnit } from '@/utils/unitKerja';
import { STRUKTUR_AWAL } from '../data/masterBaku';

const isiUnit = (u) => ({
  kode: String(u.kode || '')
    .trim()
    .toUpperCase(),
  nama: String(u.nama || '').trim(),
  singkatan: String(u.singkatan || '').trim(),
  jenis: u.jenis,
  indukId: u.jenis === 'kantor' ? '' : u.indukId || '',
  urutan: Math.max(0, Math.min(9999, Number(u.urutan) || 0)),
  aktif: u.aktif !== false,
});

/** Tambah (id kosong) atau ubah unit. @returns id unit */
export async function simpanUnit(data, id, uid) {
  const batch = writeBatch(db);
  const ref = id ? doc(db, KOLEKSI.pegawaiUnit, id) : doc(collection(db, KOLEKSI.pegawaiUnit));
  const jejak = { diubahPada: serverTimestamp(), diubahOleh: uid };
  if (id) batch.update(ref, { ...isiUnit(data), ...jejak });
  else
    batch.set(ref, { ...isiUnit(data), dibuatPada: serverTimestamp(), dibuatOleh: uid, ...jejak });
  await batch.commit();
  return ref.id;
}

/**
 * Isi struktur awal (STRUKTUR_AWAL). Ditulis per tingkat supaya induk sudah ada saat anaknya
 * diperiksa rules, dan tiap batch tetap di bawah batas akses dokumen rules.
 */
export async function isiStrukturAwal(uid) {
  const idDariKode = Object.fromEntries(
    STRUKTUR_AWAL.map((u) => [u.kode, doc(collection(db, KOLEKSI.pegawaiUnit)).id]),
  );
  for (const tingkat of [0, 1, 2]) {
    const batch = writeBatch(db);
    STRUKTUR_AWAL.forEach((u, i) => {
      if (tingkatUnit(u.jenis) !== tingkat) return;
      batch.set(doc(db, KOLEKSI.pegawaiUnit, idDariKode[u.kode]), {
        ...isiUnit({ ...u, indukId: idDariKode[u.induk] || '', urutan: (i + 1) * 10 }),
        dibuatPada: serverTimestamp(),
        dibuatOleh: uid,
        diubahPada: serverTimestamp(),
        diubahOleh: uid,
      });
    });
    await batch.commit();
  }
  return STRUKTUR_AWAL.length;
}
