/**
 * Catat realisasi anggaran ke `MAK_History` saat LPJ & SPBy (Perjadin) atau
 * SPBy & Rincian Bayar (Non-Perjadin) ditandai selesai. Format dokumen sama dengan
 * catatan SuratForm, sehingga History MAK dan Rekap membacanya tanpa perubahan.
 */

import { collection, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { parseNum } from '../utils/lpjLogic';

/**
 * @param {object} pack
 * @param {{ transaksi: object[], mak: object, tanggal: string, pelaksana: object[], uid: string }} data
 */
export async function catatMakHistory(pack, { transaksi, mak, tanggal, pelaksana, uid }) {
  const col = collection(db, 'MAK_History');

  // Hapus catatan lama berkas ini supaya tidak dobel bila fase diselesaikan ulang
  const prev = await getDocs(query(col, where('suratRef.packId', '==', pack.id)));
  const batch = writeBatch(db);
  prev.docs.forEach((d) => batch.delete(d.ref));

  const tgl = tanggal || new Date().toISOString().slice(0, 10);
  const [y, m] = tgl.split('-').map(Number);
  const byId = Object.fromEntries((pelaksana || []).map((p) => [p.id, p]));

  (transaksi || []).forEach((row) => {
    const jumlah = parseNum(row.jumlah);
    if (!row.itemNodeId || jumlah <= 0) return;
    const peg = byId[row.pelaksanaId];
    batch.set(doc(col), {
      makNodeId: row.itemNodeId,
      akunNodeId: mak?.akunNodeId || '',
      tahunNodeId: mak?.tahunNodeId || '',
      makString: mak?.kode || '',
      itemKode: row.itemKode || '',
      itemName: row.itemName || '',
      jumlah,
      tanggal: tgl,
      bulan: m || new Date().getMonth() + 1,
      tahun: y || new Date().getFullYear(),
      suratRef: {
        packId: pack.id,
        suratItemId: 'spby',
        kode: 'SPBY',
        pegawai: peg ? `${peg.nip || '-'} - ${peg.nama}` : '',
      },
      uraian: pack.uraian || '',
      createdAt: new Date().toISOString(),
      createdBy: uid || '',
      status: 'active',
    });
  });

  await batch.commit();
}
