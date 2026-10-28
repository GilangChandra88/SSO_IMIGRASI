/**
 * Tahap Keuangan berkas LPJ (`lpj_berkas/{id}/keuangan/status`, docs/skema-database.md §5.2):
 * Verifikasi → SAKTI → Transfer → Arsip, ditulis Keuangan (rules memeriksa urutan tahap; setelah
 * arsip selesai hanya Super Admin). Dokumen dibuat pada tindakan pertama, lalu diubah per field.
 * DRPP (`lpj_drpp`) dibuat & diubah daftarnya lewat Cloud Function; Keuangan hanya mengisi
 * dokumen pindaiannya (DRPP/SPM/SP2D).
 */

import {
  collection,
  deleteField,
  doc,
  getDoc,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/config/firebase';
import { KOLEKSI } from '@/config/koleksi';
import { LIMIT_KUERI } from '@/utils/batas';
import { refKeuangan } from './berkasDb';

const BENTUK_AWAL = () => ({
  verifikasi: {},
  sakti: {},
  transfer: {},
  arsip: {},
  pejabatBeku: {},
  pokBeku: {},
});

const HAPUS = deleteField();
const isHapus = (v) => v && typeof v.isEqual === 'function' && v.isEqual(HAPUS);

/** { 'a.b.c': nilai } → objek bertingkat (untuk membuat dokumen); deleteField() dilewati. */
function keObjek(dasar, perubahan) {
  Object.entries(perubahan).forEach(([jalur, nilai]) => {
    if (isHapus(nilai)) return;
    const bagian = jalur.split('.');
    let o = dasar;
    bagian.slice(0, -1).forEach((b) => {
      if (!o[b] || typeof o[b] !== 'object') o[b] = {};
      o = o[b];
    });
    o[bagian[bagian.length - 1]] = nilai;
  });
  return dasar;
}

/**
 * Simpan perubahan tahap Keuangan (dot-path). Dokumen dibuat bila belum ada (hanya untuk berkas
 * yang sudah bernomor LPJ — ditegakkan rules).
 */
export function simpanKeuangan(berkasId, perubahan, uid) {
  const ref = refKeuangan(berkasId);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) {
      tx.update(ref, { ...perubahan, diubahPada: serverTimestamp(), diubahOleh: uid });
    } else {
      tx.set(ref, {
        ...keObjek(BENTUK_AWAL(), perubahan),
        dibuatPada: serverTimestamp(),
        dibuatOleh: uid,
        diubahPada: serverTimestamp(),
        diubahOleh: uid,
      });
    }
  });
}

// ─── Verifikasi ─────────────────────────────────────────────────────────────

/**
 * Ubah status dokumen yang diperiksa.
 * @param {string[]} keys  kunci dokumen (huruf/angka/garis bawah)
 * @param {{ lengkap?: boolean, dicetak?: boolean }} ke  undefined = tidak diubah
 */
export function ubahDokumen(berkasId, keys, { lengkap, dicetak } = {}, uid) {
  const p = {};
  keys.forEach((k) => {
    if (lengkap !== undefined) p[`verifikasi.statusDokumen.${k}`] = lengkap ? 'lengkap' : HAPUS;
    if (dicetak !== undefined) p[`verifikasi.dicetak.${k}`] = dicetak ? true : HAPUS;
  });
  return Object.keys(p).length ? simpanKeuangan(berkasId, p, uid) : Promise.resolve();
}

/** Simpan koreksi nominal Keuangan: { [itemAsli]: { jumlah?, itemNodeId?, itemKode?, itemNama?, pok? } }. */
export const simpanKoreksi = (berkasId, koreksi, uid) =>
  simpanKeuangan(berkasId, { 'verifikasi.koreksi': koreksi }, uid);

/**
 * Selesaikan verifikasi: dokumen yang belum dicentang (`semuaKeys`, setelah dikonfirmasi) ikut
 * ditandai lengkap, lalu POK dan pejabat dibekukan untuk Lembar Verifikasi.
 * @param {{ semuaKeys?: string[], pokBeku: object, pejabatBeku: object }} data
 */
export function selesaikanVerifikasi(berkasId, { semuaKeys = [], pokBeku, pejabatBeku }, uid) {
  return simpanKeuangan(
    berkasId,
    {
      ...Object.fromEntries(semuaKeys.map((k) => [`verifikasi.statusDokumen.${k}`, 'lengkap'])),
      'verifikasi.selesai': true,
      'verifikasi.selesaiPada': serverTimestamp(),
      'verifikasi.selesaiOleh': uid,
      pokBeku,
      pejabatBeku,
    },
    uid,
  );
}

/** Catat nomor kwitansi SAKTI (tahap SAKTI selesai). */
export const simpanSakti = (berkasId, nomorKwitansi, uid) =>
  simpanKeuangan(
    berkasId,
    { 'sakti.selesai': true, 'sakti.nomorKwitansi': String(nomorKwitansi).trim() },
    uid,
  );

/** Ubah nomor kwitansi tanpa mengubah tahap (Arsip Keuangan). */
export const ubahKwitansi = (berkasId, nomorKwitansi, uid) =>
  simpanKeuangan(berkasId, { 'sakti.nomorKwitansi': String(nomorKwitansi).trim() }, uid);

/** Meta pindaian arsip berkas (dibaca saat tombol "Lihat" ditekan; 1 dokumen). */
export async function ambilBerkasArsip(berkasId) {
  const snap = await getDoc(refKeuangan(berkasId));
  return snap.exists() ? snap.data().arsip?.berkas || null : null;
}

/**
 * Batalkan arsip berkas (Super Admin): berkas kembali menunggu pindaian & lepas dari DRPP (bila
 * tercantum di daftar DRPP, otomatis masuk lagi setelah dipindai ulang). Pindaian lama tetap
 * tercatat di `arsip.dibatalkan`; berkasnya di Storage tidak dihapus.
 */
export function batalkanArsip(berkasId, uid) {
  const ref = refKeuangan(berkasId);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const lama = snap.data()?.arsip || {};
    tx.update(ref, {
      arsip: {
        dibatalkan: {
          berkas: lama.berkas || null,
          tanggalArsip: lama.tanggalArsip || '',
          drppId: lama.drppId || null,
          pada: serverTimestamp(),
          oleh: uid,
        },
      },
      diubahPada: serverTimestamp(),
      diubahOleh: uid,
    });
  });
}

// ─── DRPP ───────────────────────────────────────────────────────────────────

/** Daftar DRPP satu tahun anggaran: semua (Keuangan) atau yang memuat berkas pengguna. */
export function kueriDrpp({ uid, semua = false, tahunAnggaran }) {
  const syarat = semua ? [] : [where('anggotaUids', 'array-contains', uid)];
  syarat.push(where('tahunAnggaran', '==', tahunAnggaran));
  return query(
    collection(db, KOLEKSI.lpjDrpp),
    ...syarat,
    ...(semua ? [orderBy('dibuatPada', 'desc')] : []),
    limit(LIMIT_KUERI.halaman),
  );
}

/** Satu DRPP (mis. tautan langsung ke detail: untuk mengetahui tahun anggarannya). */
export async function ambilDrpp(drppId) {
  const snap = await getDoc(doc(db, KOLEKSI.lpjDrpp, drppId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Simpan Meta satu dokumen pindaian DRPP (jenis: 'drpp' | 'spm' | 'sp2d'). */
export const simpanDokumenDrpp = (drppId, jenis, meta, uid) =>
  updateDoc(doc(db, KOLEKSI.lpjDrpp, drppId), {
    [`dokumen.${jenis}`]: meta,
    diubahPada: serverTimestamp(),
    diubahOleh: uid,
  });

const panggil = (nama, data) => httpsCallable(functions, nama)(data).then((hasil) => hasil.data);

/** @returns {Promise<{ id: string, masuk: number, menunggu: number }>} */
export const buatDrpp = (tahunAnggaran, berkasIds) =>
  panggil('buatDrpp', { tahunAnggaran, berkasIds });
export const ubahDaftarDrpp = (drppId, berkasIds) =>
  panggil('ubahDaftarDrpp', { drppId, berkasIds });
/** Batalkan DRPP (Super Admin): tidak dihapus, berstatus 'batal' dan berkasnya lepas. */
export const batalkanDrpp = (drppId, alasan) => panggil('batalkanDrpp', { drppId, alasan });
