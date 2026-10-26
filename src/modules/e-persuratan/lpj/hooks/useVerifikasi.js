/**
 * Data & operasi Berkas Verifikasi (lihat utils/verifikasiLogic.js). Hanya Admin/Keuangan yang
 * menulis. Nomor kwitansi SAKTI dan pindaian berkas memakai field Arsip (`arsip.kwitansi`,
 * `arsip.scan`), bukti transfer memakai `pembayaran` (dibaca kartu Status Pembayaran pelaksana).
 */

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  deleteField,
  doc,
  FieldPath,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { deleteLpjFile, uploadLpjFile } from '../services/lpjStorage';
import { hariIniISO } from '../utils/formatTanggal';
import { makOf, transaksiOf } from '../utils/lpjLogic';
import { makItemsOfAkun } from '../utils/makTree';
import { useMakTree } from './useMakTree';

const packRef = (id) => doc(db, 'lpj_packs', id);
// Kunci dokumen dipakai sebagai nama field: lewat FieldPath agar aman untuk karakter apa pun
const fv = (...bagian) => new FieldPath('verifikasi', ...bagian);

const aktivitas = (teks, { uid, nama }) => ({
  teks,
  at: new Date().toISOString(),
  oleh: nama || '',
  uid: uid || '',
});

/** Jalankan updateDoc dengan pasangan [field, nilai]. */
const ubah = (pack, pasangan) => updateDoc(packRef(pack.id), ...pasangan.flat());

/**
 * Ubah status dokumen yang diperiksa.
 * @param {string[]} keys
 * @param {{ lengkap?: boolean, dicetak?: boolean }} ke  undefined = tidak diubah
 */
export function ubahDokumen(pack, keys, { lengkap, dicetak } = {}) {
  const pasangan = [];
  keys.forEach((k) => {
    if (lengkap !== undefined)
      pasangan.push([fv('docStatus', k), lengkap ? 'lengkap' : deleteField()]);
    if (dicetak !== undefined) pasangan.push([fv('docPrinted', k), dicetak ? true : deleteField()]);
  });
  return pasangan.length ? ubah(pack, pasangan) : Promise.resolve();
}

/** Simpan nominal lembar yang diubah admin ({ lines, codes, poks }). */
export const simpanNominal = (pack, nominal) => ubah(pack, [[fv('nominal'), nominal]]);

/**
 * Selesaikan verifikasi. `semuaKeys` diisi bila masih ada dokumen yang belum dicentang dan admin
 * sudah mengonfirmasi: semuanya ditandai tercentang.
 */
export function selesaikanVerifikasi(pack, { semuaKeys = [], uid, nama }) {
  return ubah(pack, [
    ...semuaKeys.map((k) => [fv('docStatus', k), 'lengkap']),
    [fv('selesai'), true],
    [fv('selesaiAt'), new Date().toISOString()],
    [fv('oleh'), { uid, nama }],
    ['aktivitas', aktivitas('menyelesaikan verifikasi berkas', { uid, nama })],
  ]);
}

/** Catat nomor kwitansi SAKTI (dipakai juga Arsip Keuangan). */
export const simpanSakti = (pack, kwitansi, user) =>
  ubah(pack, [
    ['arsip.kwitansi', kwitansi.trim()],
    ['aktivitas', aktivitas('mencatat nomor kwitansi SAKTI', user)],
  ]);

/** Unggah bukti transfer penggantian ke pelaksana → `pembayaran`. */
export async function kirimTransfer(pack, file, { uid, nama }) {
  const meta = await uploadLpjFile(pack.id, 'transfer', file, uid);
  try {
    await ubah(pack, [
      ['pembayaran.buktiTransfer', file.name],
      ['pembayaran.tanggalTransfer', hariIniISO()],
      ['pembayaran.berkas', meta],
      ['pembayaran.oleh', { uid, nama }],
      ['aktivitas', aktivitas('mengunggah bukti transfer', { uid, nama })],
    ]);
  } catch (err) {
    deleteLpjFile(meta.path).catch(() => {});
    throw err;
  }
  const lama = pack.pembayaran?.berkas?.path;
  if (lama && lama !== meta.path) deleteLpjFile(lama).catch(() => {});
}

// ─── Realisasi MAK untuk POK Terakhir ────────────────────────────────────────

/**
 * Realisasi `MAK_History` aktif per Item dari berkas selain `packId` (kueri `in` per 30 Item).
 * @returns {{ realisasiLain: Record<string, number>, loading: boolean, error: string }}
 */
export function useRealisasiLain(itemIds, packId) {
  const kunci = [...new Set(itemIds.filter(Boolean))].sort().join(',');
  const [state, setState] = useState({ realisasiLain: {}, loading: true, error: '' });

  useEffect(() => {
    const ids = kunci ? kunci.split(',') : [];
    if (!ids.length) {
      setState({ realisasiLain: {}, loading: false, error: '' });
      return;
    }
    let aktif = true;
    const potong = [];
    for (let i = 0; i < ids.length; i += 30) potong.push(ids.slice(i, i + 30));
    Promise.all(
      potong.map((c) => getDocs(query(collection(db, 'MAK_History'), where('makNodeId', 'in', c)))),
    )
      .then((snaps) => {
        if (!aktif) return;
        const jumlah = {};
        snaps.forEach((snap) =>
          snap.docs.forEach((d) => {
            const h = d.data();
            if (h.status !== 'active' || h.suratRef?.packId === packId) return;
            jumlah[h.makNodeId] = (jumlah[h.makNodeId] || 0) + (Number(h.jumlah) || 0);
          }),
        );
        setState({ realisasiLain: jumlah, loading: false, error: '' });
      })
      .catch((err) => {
        console.error('useRealisasiLain error:', err);
        if (aktif) {
          setState({ realisasiLain: {}, loading: false, error: 'Gagal memuat realisasi MAK.' });
        }
      });
    return () => {
      aktif = false;
    };
  }, [kunci, packId]);

  return state;
}

/**
 * Konteks MAK satu berkas untuk nominal Lembar Verifikasi: `mak` = { byId, realisasiLain }
 * (lihat pokItem) dan `opsiItem` = Item lain pada Akun yang sama (pilihan ganti kode item).
 */
export function useMakBerkas(pack) {
  const { nodes, byId, loading } = useMakTree();
  const akunId = makOf(pack)?.akunNodeId;
  const opsiItem = useMemo(
    () => makItemsOfAkun(nodes, akunId).map((n) => ({ id: n.id, kode: n.kode, name: n.name })),
    [nodes, akunId],
  );
  const itemIds = [
    ...transaksiOf(pack).map((t) => t.itemNodeId),
    ...Object.values(pack?.verifikasi?.nominal?.codes || {}),
    ...opsiItem.map((o) => o.id),
  ];
  const real = useRealisasiLain(itemIds, pack?.id);
  const mak = useMemo(
    () => ({ byId, realisasiLain: real.realisasiLain }),
    [byId, real.realisasiLain],
  );
  return { mak, opsiItem, loading: loading || real.loading };
}
