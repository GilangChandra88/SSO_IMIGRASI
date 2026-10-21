/**
 * Data & operasi Arsip/DRPP (lihat utils/drppLogic.js). Keuangan (Admin) menulis; pelaksana membaca.
 * Koleksi `drpp` dibaca utuh (kecil, tanpa data pribadi); pelaksana hanya melihat DRPP yang memuat
 * berkas miliknya karena penyaringan dilakukan lewat berkas LPJ yang boleh ia baca.
 */

import { useEffect, useState } from 'react';
import {
  arrayUnion,
  collection,
  deleteField,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { deleteLpjFile, uploadLpjFile } from '../services/lpjStorage';
import { emptyDrppDocs, lpjPendingDrpp } from '../utils/drppLogic';
import { hariIniISO } from '../utils/formatTanggal';

const hapusDiam = (path) => path && deleteLpjFile(path).catch(() => {});

// Terbaru di atas (tanggal dibuat, lalu ID). Diurutkan di klien supaya tidak perlu indeks.
const urutTerbaru = (a, b) =>
  (b.tanggalDibuat || '').localeCompare(a.tanggalDibuat || '') ||
  (b.id || '').localeCompare(a.id || '');

/** Semua DRPP (urut terbaru). */
export function useDrppList({ uid = '' } = {}) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      collection(db, 'drpp'),
      (snap) => {
        setList(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(urutTerbaru));
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error('useDrppList error:', err);
        setError(
          err.code === 'permission-denied'
            ? 'Akses ke data DRPP ditolak. Pastikan aturan Firestore mengizinkan koleksi "drpp".'
            : 'Gagal memuat data DRPP.',
        );
        setLoading(false);
      },
    );
  }, [uid]);

  return { list, loading, error };
}

const packRef = (id) => doc(db, 'lpj_packs', id);
const drppRef = (id) => doc(db, 'drpp', id);

// ─── Berkas LPJ ──────────────────────────────────────────────────────────────
// Semua penulisan berjalan di transaksi yang membaca ulang berkas di server, sehingga DRPP sebuah
// berkas tidak tertimpa walau dua Admin bekerja bersamaan.

const arsipServer = (snap) => (snap.exists() ? snap.data().arsip || {} : null);

/**
 * Pindai berkas LPJ (satu dokumen gabungan) + nomor kwitansi SAKTI. Bila berkas tercantum di
 * daftar sebuah DRPP, ia otomatis masuk ke DRPP itu.
 * @returns {Promise<{ autoDrppId: string|null }>}
 */
export async function scanLpj({ pack, file, kwitansi, uid, nama, drpps }) {
  const meta = await uploadLpjFile(pack.id, 'arsip', file, uid);
  const pending = lpjPendingDrpp(drpps, { ...pack, arsip: {} })?.id || null;
  let hasil;
  try {
    hasil = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(packRef(pack.id));
      const a = arsipServer(snap);
      if (!a) throw new Error('Berkas LPJ tidak ditemukan.');
      // DRPP penampung dibaca di server: bisa saja baru dihapus atau daftarnya diubah
      let drppId = a.drppId || null;
      if (!drppId && pending) {
        const dSnap = await transaction.get(drppRef(pending));
        if (dSnap.exists() && (dSnap.data().expectedLpjIds || []).includes(pack.id)) {
          drppId = pending;
        }
      }
      transaction.update(packRef(pack.id), {
        'arsip.scan': meta,
        'arsip.kwitansi': kwitansi.trim(),
        'arsip.tanggalArsip': a.tanggalArsip || hariIniISO(),
        'arsip.drppId': drppId,
        'arsip.oleh': { uid, nama },
      });
      return { lama: a.scan?.path, autoDrppId: !a.drppId && drppId ? drppId : null };
    });
  } catch (err) {
    hapusDiam(meta.path);
    throw err;
  }
  if (hasil.lama && hasil.lama !== meta.path) hapusDiam(hasil.lama);
  return { autoDrppId: hasil.autoDrppId };
}

export const ubahKwitansi = (pack, kwitansi) =>
  updateDoc(packRef(pack.id), { 'arsip.kwitansi': kwitansi.trim() });

// ─── DRPP ────────────────────────────────────────────────────────────────────

/** Unggah dokumen DRPP/SPM/SP2D ke Storage `lpj/drpp/{folder}/{key}/...` (aturan `lpj/**`). */
const uploadDrppDoc = (folder, key, file, uid) =>
  uploadLpjFile('drpp', `${folder}/${key}`, file, uid);

/** Berkas tidak dicantumkan DRPP lain (menurut daftar DRPP di klien). */
const bebasDariDrppLain = (drpps, packId, drppId) =>
  !drpps.some((d) => d.id !== drppId && (d.expectedLpjIds || []).includes(packId));

/**
 * Buat DRPP: unggah dokumen yang dipilih, lalu dalam satu transaksi ambil nomor
 * `DRPP-TAHUN-NNNN` (`counters/drpp_{tahun}`), simpan DRPP + daftar LPJ, dan masukkan berkas
 * pada daftar yang sudah dipindai. Nomor hanya terpakai bila penyimpanan berhasil.
 * @returns {Promise<{ id: string, nowIn: number, waiting: number, gagalUnggah: string[] }>}
 */
export async function createDrpp({ files, expectedIds, drpps, uid, nama }) {
  const tanggal = hariIniISO();
  const year = tanggal.slice(0, 4);
  const counterRef = doc(db, 'counters', `drpp_${year}`);
  const ids = expectedIds.filter((pid) => bebasDariDrppLain(drpps, pid, null));

  // Folder unggah acak: nomor DRPP baru diketahui di dalam transaksi
  const folder = doc(collection(db, 'drpp')).id;
  const docs = emptyDrppDocs();
  const gagalUnggah = [];
  for (const key of Object.keys(docs)) {
    if (!files[key]) continue;
    try {
      docs[key] = await uploadDrppDoc(folder, key, files[key], uid);
    } catch (err) {
      console.error('upload dokumen DRPP error:', err);
      gagalUnggah.push(key.toUpperCase());
    }
  }

  try {
    const hasil = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      const snaps = await Promise.all(ids.map((pid) => transaction.get(packRef(pid))));
      const aOf = Object.fromEntries(ids.map((pid, i) => [pid, arsipServer(snaps[i])]));
      const next = (counterDoc.exists() ? counterDoc.data().count || 0 : 0) + 1;
      const id = `DRPP-${year}-${String(next).padStart(4, '0')}`;
      // Lewati berkas yang hilang atau di server ternyata sudah masuk DRPP lain
      const daftar = ids.filter((pid) => aOf[pid] && !aOf[pid].drppId);
      const masuk = daftar.filter((pid) => aOf[pid].scan);

      if (counterDoc.exists()) transaction.update(counterRef, { count: next });
      else transaction.set(counterRef, { count: next });
      transaction.set(drppRef(id), {
        id,
        tanggalDibuat: tanggal,
        dibuatOleh: nama,
        dibuatOlehUid: uid,
        docs,
        expectedLpjIds: daftar,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      masuk.forEach((pid) => transaction.update(packRef(pid), { 'arsip.drppId': id }));
      return { id, nowIn: masuk.length, waiting: daftar.length - masuk.length };
    });
    return { ...hasil, gagalUnggah };
  } catch (err) {
    Object.values(docs).forEach((m) => hapusDiam(m?.path));
    throw err;
  }
}

/** Pindai (unggah) satu dokumen DRPP/SPM/SP2D. */
export async function scanDrppDoc(drpp, key, file, uid) {
  const lama = drpp.docs?.[key]?.path;
  const meta = await uploadDrppDoc(drpp.id, key, file, uid);
  try {
    await updateDoc(drppRef(drpp.id), { [`docs.${key}`]: meta, updated_at: serverTimestamp() });
  } catch (err) {
    hapusDiam(meta.path);
    throw err;
  }
  if (lama && lama !== meta.path) hapusDiam(lama);
}

/**
 * Masukkan berkas yang sudah dipindai ke DRPP (sekaligus mencantumkannya di daftar). Berkas yang
 * di server ternyata sudah masuk DRPP lain atau belum dipindai dilewati.
 * @returns {Promise<number>} jumlah berkas yang masuk
 */
export async function assignToDrpp({ drpp, packIds, drpps }) {
  const ids = packIds.filter((pid) => bebasDariDrppLain(drpps, pid, drpp.id));
  return runTransaction(db, async (transaction) => {
    const dSnap = await transaction.get(drppRef(drpp.id));
    if (!dSnap.exists()) throw new Error('DRPP tidak ditemukan.');
    const snaps = await Promise.all(ids.map((pid) => transaction.get(packRef(pid))));
    const masuk = ids.filter((pid, i) => {
      const a = arsipServer(snaps[i]);
      return a && a.scan && !a.drppId;
    });
    if (!masuk.length) return 0;
    transaction.update(drppRef(drpp.id), {
      expectedLpjIds: arrayUnion(...masuk),
      updated_at: serverTimestamp(),
    });
    masuk.forEach((pid) => transaction.update(packRef(pid), { 'arsip.drppId': drpp.id }));
    return masuk.length;
  });
}

/**
 * Ganti daftar LPJ sebuah DRPP. Berkas yang dikeluarkan dari daftar keluar dari DRPP; berkas baru
 * pada daftar yang sudah dipindai langsung masuk. Berkas BARU yang ternyata milik DRPP lain tidak
 * ikut dicantumkan (berkas lama yang bermasalah tetap bisa dikeluarkan).
 */
export async function setExpectedList({ drpp, ids, packs, drpps }) {
  await runTransaction(db, async (transaction) => {
    const dSnap = await transaction.get(drppRef(drpp.id));
    if (!dSnap.exists()) throw new Error('DRPP tidak ditemukan.');
    const lama = new Set(dSnap.data().expectedLpjIds || []);
    const anggotaKlien = packs.filter((p) => p.arsip?.drppId === drpp.id).map((p) => p.id);
    const semua = [...new Set([...ids, ...lama, ...anggotaKlien])];
    const snaps = await Promise.all(semua.map((pid) => transaction.get(packRef(pid))));
    const aOf = Object.fromEntries(semua.map((pid, i) => [pid, arsipServer(snaps[i])]));

    const daftar = ids.filter((pid) => {
      if (lama.has(pid)) return true;
      const a = aOf[pid];
      return a && bebasDariDrppLain(drpps, pid, drpp.id) && !(a.drppId && a.drppId !== drpp.id);
    });
    const keep = new Set(daftar);
    transaction.update(drppRef(drpp.id), { expectedLpjIds: daftar, updated_at: serverTimestamp() });
    semua.forEach((pid) => {
      const a = aOf[pid];
      if (!a) return;
      if (a.drppId === drpp.id && !keep.has(pid)) {
        transaction.update(packRef(pid), { 'arsip.drppId': null });
      } else if (keep.has(pid) && a.scan && !a.drppId) {
        transaction.update(packRef(pid), { 'arsip.drppId': drpp.id });
      }
    });
  });
}

// ─── Hapus (khusus Super Admin) ──────────────────────────────────────────────

/**
 * Hapus DRPP: semua berkas anggotanya keluar dari DRPP (status kembali "Belum Masuk DRPP"),
 * lalu dokumen DRPP/SPM/SP2D-nya dihapus dari Storage.
 */
export async function deleteDrpp({ drpp, packs }) {
  const anggotaKlien = packs.filter((p) => p.arsip?.drppId === drpp.id).map((p) => p.id);
  const docs = await runTransaction(db, async (transaction) => {
    const dSnap = await transaction.get(drppRef(drpp.id));
    if (!dSnap.exists()) return {};
    const ids = [...new Set([...(dSnap.data().expectedLpjIds || []), ...anggotaKlien])];
    const snaps = await Promise.all(ids.map((pid) => transaction.get(packRef(pid))));
    ids.forEach((pid, i) => {
      if (arsipServer(snaps[i])?.drppId === drpp.id) {
        transaction.update(packRef(pid), { 'arsip.drppId': null });
      }
    });
    transaction.delete(drppRef(drpp.id));
    return dSnap.data().docs || {};
  });
  Object.values(docs).forEach((m) => hapusDiam(m?.path));
}

/**
 * Hapus pindaian arsip sebuah berkas LPJ (scan + no. kwitansi): berkas kembali "Belum Discan" dan
 * keluar dari DRPP-nya, tetapi tetap tercantum di daftar DRPP sehingga otomatis masuk lagi
 * begitu dipindai ulang.
 */
export async function hapusPindaian(pack) {
  const lama = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(packRef(pack.id));
    const a = arsipServer(snap);
    if (!a) return null;
    transaction.update(packRef(pack.id), { arsip: deleteField() });
    return a.scan?.path;
  });
  hapusDiam(lama);
}
