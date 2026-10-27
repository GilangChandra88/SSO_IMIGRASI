/**
 * Data berkas LPJ (skema 2): satu dokumen `lpj_packs/{id}` per berkas, berisi bagian
 * sp/spd/lpj/lap (Perjadin) atau np (Non-Perjadin). Lihat CLAUDE.md §2.
 */

import { useState, useEffect } from 'react';
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDocs,
  setDoc,
  writeBatch,
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
import { isSkemaBaru, lpjIdOf, pelaksanaOf, spbySelesai } from '../utils/lpjLogic';
import { deleteLpjFile, deleteLpjFolder } from '../services/lpjStorage';

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
    // Kueri berganti (mis. Super Admin ganti tampilan peran): jangan tampilkan daftar lama
    setLoading(true);
    setPacks([]);

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

/** ID dokumen acak untuk berkas baru (dibuat lebih dulu, lalu diteruskan ke createLPJPack). */
export const idBerkasBaru = () => doc(collection(db, 'lpj_packs')).id;

/**
 * Buat berkas baru (draf). ID dokumen dibuat acak oleh Firestore; nomor LPJ resmi
 * (`LPJ-TAHUN-BULAN-NNNN`) baru diterbitkan saat SPBy selesai — lihat saveLPJ opsi `beriNomor`.
 * @param {{ jenis: 'perjadin'|'non-perjadin', uraian: string, uid: string, nama: string,
 *           pegawaiLogin: object|null }} data  pegawaiLogin = referensi pegawai pengguna login
 * @returns {Promise<string>} id dokumen berkas
 */
export async function createLPJPack({ id, jenis, uraian, uid, nama, pegawaiLogin }) {
  const now = new Date();
  const ref = id ? doc(db, 'lpj_packs', id) : doc(collection(db, 'lpj_packs'));

  const perjadin = jenis === 'perjadin';
  const bagian = perjadin
    ? {
        sp: emptySp(pegawaiLogin),
        spd: { ...emptySpd(), maksud: uraian }, // "Maksud" SPD diawali uraian kegiatan
        lpj: emptyLpj(),
        lap: emptyLap(),
        selesai: emptySelesai(),
      }
    : { np: emptyNp(pegawaiLogin, uraian) };

  await setDoc(ref, {
    id: ref.id,
    skema: 2,
    jenis,
    uraian,
    status: 'draft',
    nomor_lpj: '',
    ...bagian,
    pembayaran: emptyPembayaran(),
    pegawai_uids: uniq([uid, pegawaiLogin?.uid]),
    created_by: uid,
    created_by_nama: nama,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
    completed_at: null,
    aktivitas: { teks: `membuat berkas baru "${uraian}"`, at: now.toISOString(), oleh: nama, uid },
  });

  return ref.id;
}

/**
 * Terbitkan nomor LPJ berurutan `LPJ-TAHUN-BULAN-NNNN` dari `counters/lpj_{tahun}` di dalam
 * transaksi `transaction`. Mengembalikan nomor lama bila berkas sudah bernomor.
 */
async function terbitkanNomor(transaction, packRef) {
  const snap = await transaction.get(packRef);
  if (!snap.exists()) throw new Error('Berkas tidak ditemukan.');
  if (snap.data().nomor_lpj) return { nomor: snap.data().nomor_lpj, baru: false };
  // Berkas lama: ID dokumennya sudah diambil dari penghitung yang sama, pakai sebagai nomor
  if (/^LPJ-/.test(snap.id)) return { nomor: snap.id, baru: true };

  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const counterRef = doc(db, 'counters', `lpj_${year}`);
  const counterDoc = await transaction.get(counterRef);
  const next = (counterDoc.exists() ? counterDoc.data().count || 0 : 0) + 1;
  if (counterDoc.exists()) transaction.update(counterRef, { count: next });
  else transaction.set(counterRef, { count: next });
  return { nomor: `LPJ-${year}-${month}-${next.toString().padStart(4, '0')}`, baru: true };
}

/**
 * Simpan perubahan bagian berkas. `patch` berisi bagian utuh (mis. { sp: {...} }).
 * `pegawai_uids` dihitung ulang dari pelaksana supaya pegawai yang ditugaskan bisa melihat berkas.
 * @param {object} pack     berkas saat ini
 * @param {object} patch    field yang diganti
 * @param {{ teks?: string, uid?: string, nama?: string }} aktivitas  catatan "Aktivitas Terbaru"
 * @param {{ beriNomor?: boolean }} opsi  beriNomor = SPBy selesai: simpan sekaligus terbitkan
 *   nomor LPJ dalam satu transaksi (tidak ada SPBy selesai tanpa nomor, atau sebaliknya)
 * @returns {Promise<string>} nomor LPJ ('' bila belum terbit)
 */
export async function saveLPJ(pack, patch, aktivitas = {}, { beriNomor = false } = {}) {
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
  const ref = doc(db, 'lpj_packs', pack.id);
  // Pengaman: simpanan apa pun yang membuat SPBy terkunci pada berkas belum bernomor ikut
  // menerbitkan nomor, sehingga tidak ada SPBy selesai tanpa nomor LPJ.
  const perluNomor = beriNomor || (!lpjIdOf(pack) && spbySelesai(merged));
  if (!perluNomor) {
    await updateDoc(ref, data);
    return lpjIdOf(pack);
  }
  return runTransaction(db, async (transaction) => {
    const { nomor, baru } = await terbitkanNomor(transaction, ref);
    // Jangan mengubah `data`: fungsi transaksi bisa dijalankan ulang
    const aktivitasNomor =
      baru && data.aktivitas
        ? {
            aktivitas: {
              ...data.aktivitas,
              teks: `${data.aktivitas.teks} — nomor LPJ ${nomor} terbit`,
            },
          }
        : {};
    transaction.update(ref, {
      ...data,
      ...aktivitasNomor,
      nomor_lpj: nomor,
      ...(baru ? { nomor_lpj_at: serverTimestamp() } : {}),
    });
    return nomor;
  });
}

/**
 * Bukti pengeluaran per pelaksana (Fase 4 Detail LPJ, opsional). Disimpan di field tersendiri
 * `bukti_pengeluaran.{id pelaksana}` (bukan di `lap`) supaya simpan otomatis form Laporan yang
 * menulis ulang `lap` tidak menghapusnya.
 * @param {object[]} metas  meta berkas unggahan + `jenis`
 */
export async function tambahBuktiPengeluaran(pack, pelaksanaId, metas, aktivitas = {}) {
  await updateDoc(doc(db, 'lpj_packs', pack.id), {
    [`bukti_pengeluaran.${pelaksanaId}`]: arrayUnion(...metas),
    updated_at: serverTimestamp(),
    ...(aktivitas.teks
      ? {
          aktivitas: {
            teks: aktivitas.teks,
            at: new Date().toISOString(),
            oleh: aktivitas.nama || '',
            uid: aktivitas.uid || '',
          },
        }
      : {}),
  });
}

/** Lepas satu bukti pengeluaran (objek harus sama persis dengan yang tersimpan). */
export async function hapusBuktiPengeluaran(pack, pelaksanaId, meta) {
  await updateDoc(doc(db, 'lpj_packs', pack.id), {
    [`bukti_pengeluaran.${pelaksanaId}`]: arrayRemove(meta),
    updated_at: serverTimestamp(),
  });
}

/**
 * Hapus berkas (lihat canDeletePack) beserta berkas unggahannya.
 * - Belum bernomor: diperiksa ulang di server; sebelum SPBy selesai satu-satunya unggahan adalah
 *   scan Surat Perintah ber-TTE.
 * - `superAdmin`: berkas bernomor pun boleh dihapus; data turunannya ikut dibereskan — dikeluarkan
 *   dari daftar DRPP, catatan realisasi `MAK_History` dihapus, dan seluruh folder Storage-nya.
 *   Nomor LPJ yang terhapus tidak dipakai ulang. Berkas format lama ikut menghapus subkoleksi
 *   `surat_items`-nya (Firestore tidak menghapus subkoleksi bersama dokumen induk).
 */
export async function deleteLPJPack(pack, { superAdmin = false } = {}) {
  const formatLama = !isSkemaBaru(pack);
  if (superAdmin && (lpjIdOf(pack) || formatLama)) {
    const [drpps, mak, items] = await Promise.all([
      getDocs(query(collection(db, 'drpp'), where('expectedLpjIds', 'array-contains', pack.id))),
      getDocs(query(collection(db, 'MAK_History'), where('suratRef.packId', '==', pack.id))),
      formatLama
        ? getDocs(collection(db, 'lpj_packs', pack.id, 'surat_items'))
        : Promise.resolve({ docs: [] }),
    ]);
    const batch = writeBatch(db);
    items.docs.forEach((d) => batch.delete(d.ref));
    drpps.docs.forEach((d) =>
      batch.update(d.ref, { expectedLpjIds: arrayRemove(pack.id), updated_at: serverTimestamp() }),
    );
    mak.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, 'lpj_packs', pack.id));
    await batch.commit();
    deleteLpjFolder(`lpj/${pack.id}`);
    return;
  }

  const ref = doc(db, 'lpj_packs', pack.id);
  // Periksa ulang di server: bisa saja SPBy baru saja diselesaikan rekan lain
  const terbaru = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) return null;
    const data = { id: snap.id, ...snap.data() };
    if (lpjIdOf(data)) throw new Error('Berkas yang sudah bernomor tidak dapat dihapus.');
    transaction.delete(ref);
    return data;
  });
  const paths = [(terbaru || pack).sp?.scan?.path].filter(Boolean);
  // Pembersihan Storage tidak ditunggu (sudah diam bila gagal)
  paths.forEach((path) => deleteLpjFile(path).catch(() => {}));
  deleteLpjFolder(`lpj/${pack.id}`);
}
