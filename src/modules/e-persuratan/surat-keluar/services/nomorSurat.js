/**
 * Akses Firestore Persuratan (docs/skema-database.md §5.4): hierarki kode surat (`surat_kode`,
 * ditulis Keuangan) dan register nomor (`surat_nomor`). Nomor hanya terbit lewat Function
 * `terbitkanNomorSurat` (semua pegawai aktif); nomor urut per tahun di
 * `sistem_penghitung/surat_{tahun}`, diatur manual lewat Function `aturPenghitung` (Keuangan).
 */

import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/config/firebase';
import { KOLEKSI } from '@/config/koleksi';
import { LIMIT_KUERI } from '@/utils/batas';

const kolKode = () => collection(db, KOLEKSI.suratKode);
const kolNomor = () => collection(db, KOLEKSI.suratNomor);
const jejakBuat = (uid) => ({
  dibuatPada: serverTimestamp(),
  dibuatOleh: uid,
  diubahPada: serverTimestamp(),
  diubahOleh: uid,
});
const jejakUbah = (uid) => ({ diubahPada: serverTimestamp(), diubahOleh: uid });

// ─── Hierarki kode surat ────────────────────────────────────────────────────

export const kueriKodeSurat = () => query(kolKode(), limit(LIMIT_KUERI.kodeSurat));

/** @param {{ kode, nama, tingkat: 0|1|2|3, indukId: string|null }} data */
export const tambahKodeSurat = ({ kode, nama, tingkat, indukId }, uid) =>
  addDoc(kolKode(), {
    kode,
    nama,
    tingkat,
    indukId: indukId ?? null,
    aktif: true,
    urutan: 0,
    ...jejakBuat(uid),
  });

/** Ubah kode/nama/status (tingkat & induk tetap, ditegakkan rules). */
export const ubahKodeSurat = (id, { kode, nama, aktif }, uid) =>
  updateDoc(doc(kolKode(), id), { kode, nama, aktif, ...jejakUbah(uid) });

/** Kode surat tidak dihapus (master data): node & turunannya dinonaktifkan. */
export async function nonaktifkanKodeSurat(ids, uid) {
  for (let i = 0; i < ids.length; i += 450) {
    const batch = writeBatch(db);
    ids
      .slice(i, i + 450)
      .forEach((id) => batch.update(doc(kolKode(), id), { aktif: false, ...jejakUbah(uid) }));
    await batch.commit();
  }
}

// ─── Register nomor surat ───────────────────────────────────────────────────

export const refPenghitungSurat = (tahun) => doc(db, KOLEKSI.sistemPenghitung, `surat_${tahun}`);

/**
 * Register satu tahun, nomor terbaru dulu (indeks `sumber`, `tahun`, `nomorUrut` DESC).
 * @param {{ tahun: number, sumber: string, setelah?: number }} opsi  setelah = nomorUrut terakhir
 */
export const kueriNomorSurat = ({ tahun, sumber, setelah = null }) =>
  query(
    kolNomor(),
    where('sumber', '==', sumber),
    where('tahun', '==', tahun),
    orderBy('nomorUrut', 'desc'),
    ...(setelah != null ? [startAfter(setelah)] : []),
    limit(LIMIT_KUERI.nomorSurat),
  );

export async function ambilNomorBerikutnya(opsi, setelah) {
  const snap = await getDocs(kueriNomorSurat({ ...opsi, setelah }));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Ubah keterangan nomor (pemohon/Keuangan; nomor, kode, dan tahun tetap). */
export const ubahKeteranganNomor = (id, { tanggal, seksi, perihal, tujuan }, uid) =>
  updateDoc(doc(kolNomor(), id), { tanggal, seksi, perihal, tujuan, ...jejakUbah(uid) });

/** Batalkan nomor (Keuangan, wajib alasan); nomor tidak dipakai ulang. */
export const batalkanNomorSurat = (id, alasan, uid) =>
  updateDoc(doc(kolNomor(), id), {
    status: 'batal',
    alasanBatal: alasan,
    dibatalkanPada: serverTimestamp(),
    dibatalkanOleh: uid,
    ...jejakUbah(uid),
  });

const panggil = (nama, data) => httpsCallable(functions, nama)(data).then((hasil) => hasil.data);

/**
 * @param {{ sumber: 'register'|'form', tanggal, kodeIds: string[], perihal, tujuan, seksi,
 *   jenisSurat? }} data
 * @returns {Promise<{ id: string, nomor: string, nomorUrut: number }>}
 */
export const terbitkanNomorSurat = (data) => panggil('terbitkanNomorSurat', data);

/** Atur nomor urut terakhir satu tahun (Keuangan); tidak bisa di bawah nomor yang sudah terbit. */
export const aturPenghitungSurat = (tahun, nilai, alasan) =>
  panggil('aturPenghitung', { tahun, nilai, alasan });
