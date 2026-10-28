/**
 * Logika Arsip & DRPP — port arsipLogic.js purwarupa (e-persuratan-react-peran), fungsi murni.
 *
 * Data (docs/skema-database.md §5.2):
 *   lpj_ringkas/{id}: tahap ('arsip' = menunggu pindaian, 'drpp' = diarsip belum masuk DRPP,
 *     'selesai' = masuk DRPP) dan keuangan { nomorKwitansi, tanggalArsip, drppId, totalVerifikasi }
 *   lpj_berkas/{id}/keuangan/status.arsip = { selesai, tanggalArsip, berkas (Meta), drppId }
 *   lpj_drpp/{id} = { tahunAnggaran, tanggal, status ('aktif'|'batal'), berkasIds,
 *     masuk: { [berkasId]: { nomorLpj, total } }, dokumen: { drpp, spm, sp2d }, anggotaUids }
 *     — dibuat, diubah daftarnya, dan `masuk`-nya dijaga Function; Keuangan hanya mengisi dokumen
 *     (Meta). Progres & total DRPP dihitung dari `masuk`, jadi tidak perlu memuat semua berkas.
 *
 * Aturan bisnis (sama dengan purwarupa):
 *  • Berkas yang masuk Arsip = berkas LPJ bernomor yang tahap Keuangannya sudah sampai Arsip.
 *  • Keuangan memindai setiap berkas LPJ sebagai SATU dokumen gabungan.
 *  • DRPP = 3 dokumen (DRPP, SPM, SP2D) + daftar LPJ yang tertera di dokumen DRPP (berkasIds).
 *  • DRPP "Lengkap" = 3 dokumen sudah dipindai DAN seluruh LPJ pada daftar sudah masuk.
 *  • DRPP terkunci (tidak bisa tambah LPJ / edit daftar) bila sudah Lengkap atau daftarnya terpenuhi.
 *  • LPJ yang tertera di daftar sebuah DRPP otomatis masuk ke DRPP itu begitu diarsipkan (server).
 * Baris berkas dibaca dari dokumen ringkas `lpj_ringkas` (tanpa membuka berkas lengkap).
 */
import { jenisLabel, lpjIdOf, lpjRowTotal, pelaksanaOf, uraianOf } from './lpjLogic';

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

/** Tahap ringkas yang tampil di menu Arsip. */
export const TAHAP_ARSIP = ['arsip', 'drpp', 'selesai'];

// ─── Berkas & status arsip ───────────────────────────────────────────────────

/** Berkas yang masuk Arsip: bernomor dan tahapnya sudah Arsip atau sesudahnya (dokumen ringkas). */
export const berkasArsip = (rows) =>
  rows.filter((r) => lpjIdOf(r) && TAHAP_ARSIP.includes(r.tahap));

/** belum_scan | belum_drpp | masuk_drpp */
export function lpjArsipStatus(r) {
  if (r.tahap === 'arsip') return 'belum_scan';
  return r.keuangan?.drppId ? 'masuk_drpp' : 'belum_drpp';
}

/** Tanggal LPJ (YYYY-MM-DD) untuk filter bulan/tahun; cadangan = tanggal arsip. */
export function tanggalLpjOf(r) {
  const t = r?.tanggalLpj || r?.keuangan?.tanggalArsip || '';
  return /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : '';
}

/** Baris tampilan satu berkas LPJ (dipakai Arsip pelaksana & Keuangan) dari dokumen ringkas. */
export function barisLpj(r) {
  const k = r.keuangan || {};
  return {
    id: lpjIdOf(r),
    packId: r.id,
    pack: r,
    kwitansi: k.nomorKwitansi || '',
    diarsip: r.tahap === 'drpp' || r.tahap === 'selesai',
    tanggalArsip: k.tanggalArsip || '',
    drppId: k.drppId || null,
    uraian: uraianOf(r),
    pelaksana: pelaksanaOf(r)
      .map((p) => p?.nama || '')
      .filter(Boolean),
    total: k.totalVerifikasi ?? lpjRowTotal(r),
    tanggalLPJ: tanggalLpjOf(r),
    jenis: jenisLabel(r),
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

export const docsOf = (d) => ({ ...emptyDrppDocs(), ...(d?.dokumen || {}) });

/** DRPP yang masih berlaku (DRPP batal tetap tersimpan, tidak ditampilkan). */
export const drppAktif = (drpps) => drpps.filter((d) => d.status !== 'batal');

/** ID berkas yang sudah masuk DRPP (`masuk`, ditulis server — tanpa membaca berkasnya). */
export const drppMasukIds = (d) => Object.keys(d?.masuk || {});

/** Total nominal berkas yang sudah masuk (total setelah koreksi Keuangan). */
export const drppTotal = (d) =>
  Object.values(d?.masuk || {}).reduce((s, m) => s + (Number(m?.total) || 0), 0);

/**
 * Daftar LPJ yang tertera di dokumen DRPP (+ LPJ yang sudah masuk walau tidak tercatat).
 * @returns {{ packId, pack, masuk, nomorLpj }[]}  pack null bila ringkasan berkas belum termuat
 */
export function drppExpectedRows(rowsById, d) {
  const ids = (d.berkasIds || []).slice();
  drppMasukIds(d).forEach((id) => {
    if (!ids.includes(id)) ids.push(id);
  });
  return ids.map((packId) => ({
    packId,
    pack: rowsById[packId] || null,
    masuk: !!d.masuk?.[packId],
    nomorLpj: d.masuk?.[packId]?.nomorLpj || rowsById[packId]?.nomorLpj || '',
  }));
}

export function drppProgress(d) {
  const ids = d.berkasIds || [];
  return { done: ids.filter((id) => d.masuk?.[id]).length, total: ids.length };
}

/** lengkap | menunggu */
export function drppStatus(d) {
  const docs = docsOf(d);
  const docsDone = DOC_KEYS.every((k) => !!docs[k]);
  const p = drppProgress(d);
  return docsDone && p.total >= 1 && p.done === p.total ? 'lengkap' : 'menunggu';
}

export function drppListFull(d) {
  const p = drppProgress(d);
  return p.total > 0 && p.done === p.total;
}

export const drppLocked = (d) => drppStatus(d) === 'lengkap' || drppListFull(d);

export function drppLockNote(d) {
  if (drppStatus(d) === 'lengkap') {
    return 'DRPP sudah lengkap dan terkunci. LPJ tidak bisa ditambahkan lagi.';
  }
  const p = drppProgress(d);
  return `Semua LPJ pada daftar sudah masuk (${p.done}/${p.total}). LPJ tidak bisa ditambahkan lagi.`;
}

/** Cocok dengan ID DRPP, nomor LPJ yang masuk, atau isi berkas anggota yang sudah termuat. */
export function drppMatches(d, q, rowsById) {
  if (!q || d.id.toLowerCase().includes(q)) return true;
  return drppExpectedRows(rowsById, d).some((e) =>
    e.pack ? lpjMatches(barisLpj(e.pack), q) : e.nomorLpj.toLowerCase().includes(q),
  );
}

/** DRPP yang mencantumkan berkas ini di daftarnya, padahal berkas belum masuk (belum diarsip). */
export function lpjPendingDrpp(drpps, r) {
  if (r.keuangan?.drppId) return null;
  return drpps.find((d) => (d.berkasIds || []).includes(r.id)) || null;
}

/** ID DRPP lain yang sudah memuat/mencantumkan berkas ini (null bila bebas). */
export function lpjTakenElsewhere(drpps, r, currentDrppId) {
  const drppId = r.keuangan?.drppId;
  if (drppId && drppId !== currentDrppId) return drppId;
  const pd = lpjPendingDrpp(drpps, r);
  return pd && pd.id !== currentDrppId ? pd.id : null;
}

// ─── Sudut pandang pelaksana ─────────────────────────────────────────────────

/** Berkas milik pengguna (`ownRows`, ringkas) yang sudah masuk DRPP, dikelompokkan per DRPP. */
export function drppListForPelaksana(drpps, ownRows) {
  const own = berkasArsip(ownRows).filter((r) => r.keuangan?.drppId);
  return drpps
    .map((d) => ({ d, rows: own.filter((r) => r.keuangan?.drppId === d.id) }))
    .filter((x) => x.rows.length)
    .map(({ d, rows }) => ({
      id: d.id,
      tanggalDibuat: d.tanggal || '',
      docs: docsOf(d),
      lpj: rows.map(barisLpj),
    }));
}

/** "01456/KW/693459/2026" → bagian yang ditebalkan: nomor urut & tahun. */
export function pecahKwitansi(value) {
  const p = String(value || '').split('/');
  return p.length === 4 ? p : null;
}
