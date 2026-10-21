/**
 * Logika Arsip & DRPP — port arsipLogic.js purwarupa (e-persuratan-react-peran), fungsi murni.
 *
 * Data:
 *   lpj_packs/{id}.arsip = { scan, kwitansi, tanggalArsip, drppId, oleh }   (diisi Keuangan)
 *   drpp/{id} = { id, tanggalDibuat, dibuatOleh, dibuatOlehUid, docs: { drpp, spm, sp2d },
 *                 expectedLpjIds: [id dokumen lpj_packs], created_at, updated_at }
 *   docs.* dan arsip.scan = metadata Storage { path, url, name, size, type } atau null.
 *
 * Aturan bisnis (sama dengan purwarupa):
 *  • Berkas yang masuk Arsip = berkas LPJ yang sudah bernomor (nomor terbit saat SPBy selesai).
 *  • Keuangan memindai setiap berkas LPJ sebagai SATU dokumen gabungan (+ no. kwitansi SAKTI).
 *  • DRPP = 3 dokumen (DRPP, SPM, SP2D) + daftar LPJ yang tertera di dokumen DRPP (expectedLpjIds).
 *  • DRPP "Lengkap" = 3 dokumen sudah dipindai DAN seluruh LPJ pada daftar sudah masuk.
 *  • DRPP terkunci (tidak bisa tambah LPJ / edit daftar) bila sudah Lengkap atau daftarnya terpenuhi.
 *  • LPJ yang tertera di daftar sebuah DRPP otomatis masuk ke DRPP itu begitu dipindai.
 * Uraian, pelaksana, total, dan tanggal selalu dibaca dari berkas LPJ (tidak disalin).
 */
import {
  isSkemaBaru,
  jenisLabel,
  lpjIdOf,
  lpjRowTotal,
  pelaksanaOf,
  tanggalRingkas,
  uraianOf,
} from './lpjLogic';

export const DOC_KEYS = ['drpp', 'spm', 'sp2d'];
export const DRPP_DOCS = [
  { key: 'drpp', code: 'DRPP', label: 'DRPP (Daftar Rincian Permintaan Pembayaran)' },
  { key: 'spm', code: 'SPM', label: 'SPM (Surat Perintah Membayar)' },
  { key: 'sp2d', code: 'SP2D', label: 'SP2D (Surat Perintah Pencairan Dana)' },
];
export const emptyDrppDocs = () => ({ drpp: null, spm: null, sp2d: null });

export const STATUS_LABEL = {
  belum_scan: 'Belum Discan',
  belum_drpp: 'Belum Masuk DRPP',
  masuk_drpp: 'Masuk DRPP',
};

export const BERKAS_LABEL = (pack) =>
  `Berkas LPJ Lengkap (gabungan ${jenisLabel(pack) === 'Perjadin' ? 'Surat Perintah/SPD' : 'SPBy'}, Lembar Verifikasi & Bukti Transfer Bendahara)`;

// ─── Berkas & status arsip ───────────────────────────────────────────────────

export const arsipOf = (pack) => pack?.arsip || {};

/** Berkas yang masuk Arsip: skema 2 dan sudah bernomor LPJ. */
export const berkasArsip = (packs) => packs.filter((p) => isSkemaBaru(p) && lpjIdOf(p));

/** belum_scan | belum_drpp | masuk_drpp */
export function lpjArsipStatus(pack) {
  const a = arsipOf(pack);
  if (!a.scan) return 'belum_scan';
  return a.drppId ? 'masuk_drpp' : 'belum_drpp';
}

/** Tanggal LPJ (YYYY-MM-DD) untuk filter bulan/tahun; cadangan = tanggal arsip. */
export function tanggalLpjOf(pack) {
  const t = tanggalRingkas(pack).tanggalLPJ || arsipOf(pack).tanggalArsip || '';
  return /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : '';
}

/** Baris tampilan satu berkas LPJ (dipakai Arsip pelaksana & Keuangan). */
export function barisLpj(pack) {
  const a = arsipOf(pack);
  return {
    id: lpjIdOf(pack),
    packId: pack.id,
    pack,
    kwitansi: a.kwitansi || '',
    scan: a.scan || null,
    tanggalArsip: a.tanggalArsip || '',
    drppId: a.drppId || null,
    uraian: uraianOf(pack),
    pelaksana: pelaksanaOf(pack)
      .map((p) => p?.nama || '')
      .filter(Boolean),
    total: lpjRowTotal(pack),
    tanggalLPJ: tanggalLpjOf(pack),
    jenis: jenisLabel(pack),
  };
}

export const pelaksanaText = (r) => r.pelaksana.join(', ');

/** Cocok dengan ID LPJ, no. kwitansi, atau uraian (+ pelaksana bila `denganPelaksana`). */
export function lpjMatches(r, q, denganPelaksana = false) {
  if (!q) return true;
  const isi = [r.id, r.kwitansi, r.uraian];
  if (denganPelaksana) isi.push(pelaksanaText(r));
  return isi.some((v) =>
    String(v || '')
      .toLowerCase()
      .includes(q),
  );
}

// ─── DRPP ────────────────────────────────────────────────────────────────────

export const docsOf = (d) => ({ ...emptyDrppDocs(), ...(d?.docs || {}) });

/** Berkas yang sudah masuk DRPP `d`. */
export const drppMembers = (packs, d) => packs.filter((p) => arsipOf(p).drppId === d.id);

/**
 * Daftar LPJ yang tertera di dokumen DRPP (+ LPJ yang sudah masuk walau tidak tercatat).
 * @returns {{ packId, pack, masuk }[]}  pack null bila berkas tidak ditemukan
 */
export function drppExpectedRows(packsById, packs, d) {
  const ids = (d.expectedLpjIds || []).slice();
  drppMembers(packs, d).forEach((p) => {
    if (!ids.includes(p.id)) ids.push(p.id);
  });
  return ids.map((packId) => {
    const pack = packsById[packId] || null;
    return { packId, pack, masuk: !!(pack && arsipOf(pack).drppId === d.id) };
  });
}

export function drppProgress(packsById, packs, d) {
  const exp = drppExpectedRows(packsById, packs, d);
  return { done: exp.filter((e) => e.masuk).length, total: exp.length };
}

/** lengkap | menunggu */
export function drppStatus(packsById, packs, d) {
  const docs = docsOf(d);
  const docsDone = DOC_KEYS.every((k) => !!docs[k]);
  const p = drppProgress(packsById, packs, d);
  return docsDone && p.total >= 1 && p.done === p.total ? 'lengkap' : 'menunggu';
}

export function drppListFull(packsById, packs, d) {
  const p = drppProgress(packsById, packs, d);
  return p.total > 0 && p.done === p.total;
}

export const drppLocked = (packsById, packs, d) =>
  drppStatus(packsById, packs, d) === 'lengkap' || drppListFull(packsById, packs, d);

export function drppLockNote(packsById, packs, d) {
  if (drppStatus(packsById, packs, d) === 'lengkap') {
    return 'DRPP sudah lengkap dan terkunci. LPJ tidak bisa ditambahkan lagi.';
  }
  const p = drppProgress(packsById, packs, d);
  return `Semua LPJ pada daftar sudah masuk (${p.done}/${p.total}). LPJ tidak bisa ditambahkan lagi.`;
}

/** DRPP yang mencantumkan berkas ini di daftarnya, padahal berkas belum masuk (belum dipindai). */
export function lpjPendingDrpp(drpps, pack) {
  if (arsipOf(pack).drppId) return null;
  return drpps.find((d) => (d.expectedLpjIds || []).includes(pack.id)) || null;
}

/** ID DRPP lain yang sudah memuat/mencantumkan berkas ini (null bila bebas). */
export function lpjTakenElsewhere(drpps, pack, currentDrppId) {
  const drppId = arsipOf(pack).drppId;
  if (drppId && drppId !== currentDrppId) return drppId;
  const pd = lpjPendingDrpp(drpps, pack);
  return pd && pd.id !== currentDrppId ? pd.id : null;
}

// ─── Sudut pandang pelaksana ─────────────────────────────────────────────────

/**
 * Hanya berkas milik pengguna (`ownPacks`) yang sudah dipindai & masuk DRPP, dikelompokkan per DRPP.
 */
export function drppListForPelaksana(drpps, ownPacks) {
  const own = berkasArsip(ownPacks).filter((p) => arsipOf(p).scan && arsipOf(p).drppId);
  return drpps
    .map((d) => ({ d, rows: own.filter((p) => arsipOf(p).drppId === d.id) }))
    .filter((x) => x.rows.length)
    .map(({ d, rows }) => ({
      id: d.id,
      tanggalDibuat: d.tanggalDibuat || '',
      docs: docsOf(d),
      lpj: rows.map(barisLpj),
    }));
}

/** "01456/KW/693459/2026" → bagian yang ditebalkan: nomor urut & tahun. */
export function pecahKwitansi(value) {
  const p = String(value || '').split('/');
  return p.length === 4 ? p : null;
}
