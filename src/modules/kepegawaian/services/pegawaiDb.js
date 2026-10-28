/**
 * Akses data modul Kepegawaian (docs/skema-database.md §5.1). Field akun & peran (email, authUid,
 * peran, aktif, ultahMd) hanya ditulis Cloud Function; klien menulis field data pegawai saja
 * (daftar tertutup, sama dengan firestore.rules kunciPegawaiKlien). Kontak pribadi disimpan
 * terpisah di `pegawai_kontak/{pegawaiId}` dan ditulis dalam batch yang sama dengan pegawai.
 */
import {
  collection,
  doc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/config/firebase';
import { KOLEKSI } from '@/config/koleksi';
import { LIMIT_KUERI } from '@/utils/batas';
import { KONTAK_KOSONG } from '@/utils/dataPegawai';
import { daftarDokumen, pantau } from '@/utils/pantau';
import { PANGKAT_BAKU } from '../data/masterBaku';

/** Data pegawai yang boleh ditulis klien (urutan sama dengan rules). */
const FIELD_PEGAWAI = [
  'nama',
  'nip',
  'statusKepegawaian',
  'pangkatId',
  'pangkatNama',
  'golongan',
  'jabatanId',
  'jabatanNama',
  'unitId',
  'seksi',
  'tanggalLahir',
  'fotoPaths',
];

export const PEGAWAI_KOSONG = Object.freeze({
  nama: '',
  nip: '',
  statusKepegawaian: '',
  pangkatId: '',
  pangkatNama: '',
  golongan: '',
  jabatanId: '',
  jabatanNama: '',
  unitId: '',
  seksi: '',
  tanggalLahir: '',
  fotoPaths: [],
});

/** Jenis data master → koleksi & field yang ditulis. */
export const MASTER = Object.freeze({
  pangkat: KOLEKSI.pegawaiPangkat,
  jabatan: KOLEKSI.pegawaiJabatan,
});
const FIELD_MASTER = {
  pangkat: ['nama', 'golongan', 'jenis', 'urutan', 'aktif'],
  jabatan: ['nama', 'jenis', 'eselon', 'urutan', 'aktif'],
};

/** Batas tulis per batch Firestore (500) dikurangi cadangan. */
export const MAKS_TULIS_BATCH = 400;

export const ambilFieldPegawai = (data) =>
  Object.fromEntries(FIELD_PEGAWAI.map((k) => [k, data[k] ?? PEGAWAI_KOSONG[k]]));

const ambilKontak = (k) => ({
  alamat: k?.alamat ?? '',
  emailPribadi: k?.emailPribadi ?? '',
  noWa: k?.noWa ?? '',
});

const jejakBuat = (uid) => ({
  dibuatPada: serverTimestamp(),
  dibuatOleh: uid,
  diubahPada: serverTimestamp(),
  diubahOleh: uid,
});
const jejakUbah = (uid) => ({ diubahPada: serverTimestamp(), diubahOleh: uid });

/** Semua pegawai (lengkap, hanya Kepegawaian), urut nama. Dibaca lewat hooks/useDaftarPegawai. */
export const kueriPegawai = () =>
  query(collection(db, KOLEKSI.pegawai), orderBy('nama'), limit(LIMIT_KUERI.pegawaiRingkas));

/** Semua kontak pribadi (hanya Kepegawaian) → { [pegawaiId]: kontak }. */
export function pantauKontak(onData, onGalat) {
  return pantau(
    query(collection(db, KOLEKSI.pegawaiKontak), limit(LIMIT_KUERI.kontakPegawai)),
    (snap) => onData(Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]))),
    { onGalat, pesan: 'Tidak punya akses atau gagal memuat kontak pegawai.' },
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

/**
 * Masukkan penulisan pegawai (+ kontak) ke `batch`. Dipakai form dan impor CSV.
 * @param {{ baru: boolean, kontak?: object|null, kontakAda?: boolean }} opsi  kontak = isi
 *   pegawai_kontak (null = tidak diubah); kontakAda = dokumen kontak sudah ada
 */
export function tulisPegawai(batch, data, id, uid, { baru, kontak = null, kontakAda = false }) {
  const ref = doc(db, KOLEKSI.pegawai, id);
  const isi = ambilFieldPegawai(data);
  if (baru) batch.set(ref, { ...isi, ...jejakBuat(uid) });
  else batch.update(ref, { ...isi, ...jejakUbah(uid) });
  if (kontak) {
    const refKontak = doc(db, KOLEKSI.pegawaiKontak, id);
    if (kontakAda) batch.update(refKontak, { ...ambilKontak(kontak), ...jejakUbah(uid) });
    else batch.set(refKontak, { ...KONTAK_KOSONG, ...ambilKontak(kontak), ...jejakBuat(uid) });
  }
}

/** Tambah (`baru`, id dari idPegawaiBaru) atau ubah data pegawai beserta kontaknya. */
export async function simpanPegawai(data, id, uid, opsi) {
  const batch = writeBatch(db);
  tulisPegawai(batch, data, id, uid, opsi);
  await batch.commit();
  return id;
}

/**
 * Perbarui label seksi pegawai setelah unit kerja diubah (nama/singkatan/induk).
 * @param {{ id: string, seksi: string }[]} perubahan
 */
export async function perbaruiSeksiPegawai(perubahan, uid) {
  for (let i = 0; i < perubahan.length; i += MAKS_TULIS_BATCH) {
    const batch = writeBatch(db);
    perubahan
      .slice(i, i + MAKS_TULIS_BATCH)
      .forEach(({ id, seksi }) =>
        batch.update(doc(db, KOLEKSI.pegawai, id), { seksi, ...jejakUbah(uid) }),
      );
    await batch.commit();
  }
}

// ─── Master pangkat & jabatan ───────────────────────────────────────────────

const isiMaster = (jenis, data) =>
  Object.fromEntries(
    FIELD_MASTER[jenis].map((k) => {
      if (k === 'nama') return [k, String(data.nama || '').trim()];
      if (k === 'urutan') return [k, Math.max(0, Math.min(9999, Number(data.urutan) || 0))];
      if (k === 'aktif') return [k, data.aktif !== false];
      return [k, data[k] ?? ''];
    }),
  );

/** Tambah atau ubah data master. Tidak ada hapus: pakai aktif = false. */
export async function simpanMaster(jenis, data, id, uid) {
  const batch = writeBatch(db);
  const ref = id ? doc(db, MASTER[jenis], id) : doc(collection(db, MASTER[jenis]));
  if (id) batch.update(ref, { ...isiMaster(jenis, data), ...jejakUbah(uid) });
  else batch.set(ref, { ...isiMaster(jenis, data), ...jejakBuat(uid) });
  await batch.commit();
  return ref.id;
}

/** Tambahkan pangkat/golongan baku yang belum ada (dicocokkan lewat golongan). @returns jumlah */
export async function isiPangkatBaku(daftarAda, uid) {
  const ada = new Set(daftarAda.map((p) => p.golongan));
  const kurang = PANGKAT_BAKU.filter((p) => !ada.has(p.golongan));
  if (!kurang.length) return 0;
  const batch = writeBatch(db);
  kurang.forEach((p) =>
    batch.set(doc(collection(db, MASTER.pangkat)), {
      ...isiMaster('pangkat', { ...p, aktif: true }),
      ...jejakBuat(uid),
    }),
  );
  await batch.commit();
  return kurang.length;
}

/** ID dokumen jabatan baru (impor CSV menyiapkan ID sebelum menulis pegawainya). */
export const idJabatanBaru = () => doc(collection(db, MASTER.jabatan)).id;

/** Masukkan pembuatan jabatan baru ke `batch` (impor CSV). */
export function tulisJabatanBaru(batch, id, data, uid) {
  batch.set(doc(db, MASTER.jabatan, id), {
    ...isiMaster('jabatan', { ...data, aktif: true }),
    ...jejakBuat(uid),
  });
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
/** Kata sandi sementara baru untuk pegawai yang lupa sandi → { email, sandiSementara } */
export const aturUlangSandi = (pegawaiId) => panggil('aturUlangSandi')({ pegawaiId });

/** Pesan galat Firestore/Functions untuk pengguna (bersama semua modul). */
export { pesanGalat } from '@/utils/pesanGalat';
