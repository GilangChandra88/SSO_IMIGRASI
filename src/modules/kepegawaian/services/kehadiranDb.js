/**
 * Kegiatan & kehadiran pegawai (docs/skema-database.md §5.1). Kehadiran disimpan sebagai peta
 * pegawaiId → { status, keterangan } di dokumen kegiatannya; rekap per semester
 * (`pegawai_rekap_hadir/{tahun}-{semester}`) hanya ditulis Function diKegiatanDitulis.
 * Kegiatan tidak dihapus, melainkan dibatalkan (aktif: false + alasan).
 */
import {
  collection,
  doc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { KOLEKSI } from '@/config/koleksi';
import { LIMIT_KUERI } from '@/utils/batas';
import { rentangPeriode } from '../utils/kehadiran';

const jejakUbah = (uid) => ({ diubahPada: serverTimestamp(), diubahOleh: uid });

/** Isian kegiatan yang ditulis form (urutan sama dengan rules kunciKegiatan). */
const isiKegiatan = (k) => ({
  nama: k.nama,
  jenis: k.jenis,
  tanggal: k.tanggal,
  jam: k.jam,
  tempat: k.tempat,
  keterangan: k.keterangan,
});

/** Kegiatan dalam satu periode (semester 0 = setahun), terbaru dulu; tanpa indeks komposit. */
export function kueriKegiatan(tahun, semester) {
  const { dari, sampai } = rentangPeriode(tahun, semester);
  return query(
    collection(db, KOLEKSI.pegawaiKegiatan),
    where('tanggal', '>=', dari),
    where('tanggal', '<=', sampai),
    orderBy('tanggal', 'desc'),
    limit(LIMIT_KUERI.kegiatanPegawai),
  );
}

/** Rekap semester 1 & 2 satu tahun (ditulis Function). */
export const kueriRekapHadir = (tahun) =>
  query(
    collection(db, KOLEKSI.pegawaiRekapHadir),
    where('tahun', '==', tahun),
    limit(LIMIT_KUERI.rekapHadir),
  );

/** Buat kegiatan baru (kehadiran belum diisi) → id. */
export async function buatKegiatan(k, uid) {
  const ref = doc(collection(db, KOLEKSI.pegawaiKegiatan));
  await setDoc(ref, {
    ...isiKegiatan(k),
    kehadiran: null,
    kehadiranPada: null,
    kehadiranOleh: null,
    aktif: true,
    alasanBatal: '',
    dibuatPada: serverTimestamp(),
    dibuatOleh: uid,
    ...jejakUbah(uid),
  });
  return ref.id;
}

export const ubahKegiatan = (id, k, uid) =>
  updateDoc(doc(db, KOLEKSI.pegawaiKegiatan, id), { ...isiKegiatan(k), ...jejakUbah(uid) });

/** Simpan/perbarui kehadiran seluruh pegawai satu kegiatan. */
export const simpanKehadiran = (id, kehadiran, uid) =>
  updateDoc(doc(db, KOLEKSI.pegawaiKegiatan, id), {
    kehadiran,
    kehadiranPada: serverTimestamp(),
    kehadiranOleh: uid,
    ...jejakUbah(uid),
  });

/** Batalkan kegiatan (tidak dihapus; tidak dihitung lagi di rekap). */
export const batalkanKegiatan = (id, alasan, uid) =>
  updateDoc(doc(db, KOLEKSI.pegawaiKegiatan, id), {
    aktif: false,
    alasanBatal: alasan,
    ...jejakUbah(uid),
  });
