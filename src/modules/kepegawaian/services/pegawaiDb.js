/**
 * Akses data modul Kepegawaian (docs/skema-database.md §5.1). Field akun & peran (email, authUid,
 * peran, aktif, ultahMd) hanya ditulis Cloud Function; klien menulis field data pegawai saja
 * (daftar tertutup, sama dengan firestore.rules kunciPegawaiKlien).
 */
import {
  addDoc,
  collection,
  doc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/config/firebase';
import { KOLEKSI } from '@/config/koleksi';
import { LIMIT_KUERI } from '@/utils/batas';
import { daftarDokumen, pantau } from '@/utils/pantau';

/** Data pegawai yang boleh ditulis klien (urutan sama dengan rules). */
const FIELD_PEGAWAI = [
  'nama',
  'nip',
  'pangkatId',
  'pangkatNama',
  'jabatanId',
  'jabatanNama',
  'seksi',
  'tanggalLahir',
  'fotoPaths',
];

export const PEGAWAI_KOSONG = Object.freeze({
  nama: '',
  nip: '',
  pangkatId: '',
  pangkatNama: '',
  jabatanId: '',
  jabatanNama: '',
  seksi: '',
  tanggalLahir: '',
  fotoPaths: [],
});

/** Jenis data master → koleksi. */
export const MASTER = Object.freeze({
  pangkat: KOLEKSI.pegawaiPangkat,
  jabatan: KOLEKSI.pegawaiJabatan,
});

const ambilField = (data) =>
  Object.fromEntries(FIELD_PEGAWAI.map((k) => [k, data[k] ?? PEGAWAI_KOSONG[k]]));

export function pantauPegawai(onData, onGalat) {
  return pantau(
    query(collection(db, KOLEKSI.pegawai), orderBy('nama'), limit(LIMIT_KUERI.pegawaiRingkas)),
    (snap) => onData(daftarDokumen(snap)),
    { onGalat, pesan: 'Tidak punya akses atau gagal memuat data pegawai.' },
  );
}

export function pantauMaster(jenis, onData, onGalat) {
  return pantau(
    query(collection(db, MASTER[jenis]), orderBy('urutan'), limit(LIMIT_KUERI.masterPegawai)),
    (snap) => onData(daftarDokumen(snap)),
    { onGalat, pesan: `Gagal memuat data master ${jenis}.` },
  );
}

/** ID dokumen untuk pegawai baru (dibuat lebih dulu supaya fotonya bisa diunggah sebelum disimpan). */
export const idPegawaiBaru = () => doc(collection(db, KOLEKSI.pegawai)).id;

/** Tambah (`baru`, id dari idPegawaiBaru) atau ubah data pegawai. uid = pengguna yang login. */
export async function simpanPegawai(data, id, uid, { baru = false } = {}) {
  const isi = ambilField(data);
  const jejak = { diubahPada: serverTimestamp(), diubahOleh: uid };
  if (baru) {
    await setDoc(doc(db, KOLEKSI.pegawai, id), {
      ...isi,
      dibuatPada: serverTimestamp(),
      dibuatOleh: uid,
      ...jejak,
    });
  } else {
    await updateDoc(doc(db, KOLEKSI.pegawai, id), { ...isi, ...jejak });
  }
  return id;
}

/** Tambah atau ubah data master (pangkat/jabatan). Tidak ada hapus: pakai aktif = false. */
export async function simpanMaster(jenis, { nama, urutan, aktif }, id, uid) {
  const isi = { nama: nama.trim(), urutan: Number(urutan) || 0, aktif: aktif !== false };
  if (id) {
    await updateDoc(doc(db, MASTER[jenis], id), {
      ...isi,
      diubahPada: serverTimestamp(),
      diubahOleh: uid,
    });
    return id;
  }
  const ref = await addDoc(collection(db, MASTER[jenis]), {
    ...isi,
    dibuatPada: serverTimestamp(),
    dibuatOleh: uid,
    diubahPada: serverTimestamp(),
    diubahOleh: uid,
  });
  return ref.id;
}

// ─── Cloud Functions (akun, peran, status) ───────────────────────────────────

const panggil = (nama) => (data) => httpsCallable(functions, nama)(data).then((r) => r.data);

/** → { email, sandiSementara } */
export const buatAkunPegawai = (pegawaiId, email) =>
  panggil('buatAkunPegawai')({ pegawaiId, email });
export const aturPeran = (pegawaiId, peran) => panggil('aturPeran')({ pegawaiId, peran });
export const nonaktifkanPegawai = (pegawaiId, alasan) =>
  panggil('nonaktifkanPegawai')({ pegawaiId, alasan });
export const aktifkanPegawai = (pegawaiId, alasan = '') =>
  panggil('aktifkanPegawai')({ pegawaiId, alasan });

/** Pesan galat Firestore/Functions untuk pengguna (bersama semua modul). */
export { pesanGalat } from '@/utils/pesanGalat';
