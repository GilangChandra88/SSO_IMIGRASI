/**
 * Data berkas LPJ (skema 2): satu dokumen `lpj_packs/{id}` per berkas, berisi bagian
 * sp/spd/lpj/lap (Perjadin) atau np (Non-Perjadin). Lihat CLAUDE.md §2.
 */

import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
  emptySp,
  emptySpd,
  emptyLpj,
  emptyLap,
  emptySelesai,
  emptyNp,
  emptyPembayaran,
} from '../utils/emptyModels';
import { pelaksanaOf } from '../utils/lpjLogic';

// ─── Hook: Daftar berkas ─────────────────────────────────────────────────────

/**
 * Admin: semua berkas. Pegawai: berkas yang ia buat atau yang mencantumkan dirinya.
 */
export function useLPJPacks({ isAdmin = false, userUid = '' } = {}) {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userUid) return;

    const q = isAdmin
      ? query(collection(db, 'lpj_packs'), orderBy('created_at', 'desc'))
      : query(
          collection(db, 'lpj_packs'),
          where('pegawai_uids', 'array-contains', userUid),
          orderBy('created_at', 'desc'),
        );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setPacks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error('useLPJPacks error:', err);
        setError(
          err.code === 'failed-precondition'
            ? 'Indeks Firestore belum siap. Buka Console browser (F12) dan klik tautan pembuatan indeks.'
            : 'Gagal memuat daftar LPJ.',
        );
        setLoading(false);
      },
    );

    return unsub;
  }, [isAdmin, userUid]);

  return { packs, loading, error };
}

// ─── Hook: Satu berkas ───────────────────────────────────────────────────────

export function useLPJPack(packId) {
  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!packId) return;
    setLoading(true);

    const unsub = onSnapshot(
      doc(db, 'lpj_packs', packId),
      (snap) => {
        if (snap.exists()) {
          setPack({ id: snap.id, ...snap.data() });
          setError(null);
        } else {
          setPack(null);
          setError('Berkas tidak ditemukan.');
        }
        setLoading(false);
      },
      (err) => {
        console.error('useLPJPack error:', err);
        setError('Gagal memuat berkas.');
        setLoading(false);
      },
    );

    return unsub;
  }, [packId]);

  return { pack, loading, error };
}

// ─── Operasi ─────────────────────────────────────────────────────────────────

const uniq = (arr) => [...new Set(arr.filter(Boolean))];

/** Nama tampilan pengguna login (dokumen pegawai → displayName → e-mail). */
export const namaPengguna = (currentUser, userData) =>
  userData?.nama || currentUser?.displayName || currentUser?.email || 'Pengguna';

/**
 * Buat berkas baru. ID berurutan `LPJ-TAHUN-BULAN-NNNN` dari `counters/lpj_{tahun}`.
 * @param {{ jenis: 'perjadin'|'non-perjadin', uraian: string, uid: string, nama: string,
 *           pegawaiLogin: object|null }} data  pegawaiLogin = referensi pegawai pengguna login
 * @returns {Promise<string>} id berkas
 */
export async function createLPJPack({ jenis, uraian, uid, nama, pegawaiLogin }) {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const counterRef = doc(db, 'counters', `lpj_${year}`);
  let newPackId = '';

  await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let nextSeq = 1;
    if (counterDoc.exists()) {
      nextSeq = (counterDoc.data().count || 0) + 1;
      transaction.update(counterRef, { count: nextSeq });
    } else {
      transaction.set(counterRef, { count: 1 });
    }
    newPackId = `LPJ-${year}-${month}-${nextSeq.toString().padStart(4, '0')}`;
  });

  const perjadin = jenis === 'perjadin';
  const bagian = perjadin
    ? {
        sp: emptySp(pegawaiLogin),
        spd: emptySpd(),
        lpj: emptyLpj(),
        lap: emptyLap(),
        selesai: emptySelesai(),
      }
    : { np: emptyNp(pegawaiLogin, uraian) };

  await setDoc(doc(db, 'lpj_packs', newPackId), {
    id: newPackId,
    skema: 2,
    jenis,
    uraian,
    status: 'draft',
    ...bagian,
    pembayaran: emptyPembayaran(),
    pegawai_uids: uniq([uid, pegawaiLogin?.uid]),
    created_by: uid,
    created_by_nama: nama,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
    completed_at: null,
    aktivitas: { teks: `membuat berkas baru ${newPackId}`, at: now.toISOString(), oleh: nama, uid },
  });

  return newPackId;
}

/**
 * Simpan perubahan bagian berkas. `patch` berisi bagian utuh (mis. { sp: {...} }).
 * `pegawai_uids` dihitung ulang dari pelaksana supaya pegawai yang ditugaskan bisa melihat berkas.
 * @param {object} pack     berkas saat ini
 * @param {object} patch    field yang diganti
 * @param {{ teks?: string, uid?: string, nama?: string }} aktivitas  catatan "Aktivitas Terbaru"
 */
export async function saveLPJ(pack, patch, aktivitas = {}) {
  const merged = { ...pack, ...patch };
  const data = {
    ...patch,
    pegawai_uids: uniq([pack.created_by, ...pelaksanaOf(merged).map((p) => p.uid)]),
    updated_at: serverTimestamp(),
  };
  if (patch.status === 'selesai') data.completed_at = serverTimestamp();
  if (aktivitas.teks) {
    data.aktivitas = {
      teks: aktivitas.teks,
      at: new Date().toISOString(),
      oleh: aktivitas.nama || '',
      uid: aktivitas.uid || '',
    };
  }
  await updateDoc(doc(db, 'lpj_packs', pack.id), data);
}
