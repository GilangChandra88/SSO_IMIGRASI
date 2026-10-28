/**
 * Unggahan berkas LPJ (docs/skema-database.md §7). Aturan tipe & ukuran per folder sama dengan
 * storage.rules; gambar dikompres dulu di browser. Urutan wajib: unggah → simpan metadata →
 * baru hapus berkas lama; bila simpan metadata gagal, unggahan baru dihapus lagi.
 */

import { JALUR_BERKAS, TIPE_GAMBAR, TIPE_GAMBAR_PDF } from '@/config/koleksi';
import { JUMLAH, UKURAN_BERKAS } from '@/utils/batas';
import {
  hapusDariStorage,
  pesanGagalUnggah,
  unggahBerkas,
  validasiBerkas,
} from '@/utils/berkasStorage';
import { kompresGambar } from '@/utils/kompresGambar';
import { tanggalIso } from '@/utils/nilai';
import { pesanGalat } from '@/utils/pesanGalat';
import {
  hapusBuktiDoc,
  lepasDariDaftar,
  simpanBerkas,
  tambahBuktiDoc,
  tambahKeDaftar,
} from './berkasDb';
import { simpanDokumenDrpp, simpanKeuangan } from './keuanganDb';

const MB = 1024 * 1024;

/**
 * Aturan per jenis unggahan: tipe & batas rules, serta sasaran kompresi gambar (scan dokumen
 * tetap terbaca di ±1,5 MB; foto laporan/lampiran mengikuti batas folder).
 */
export const ATURAN_UNGGAHAN = Object.freeze({
  tte: { tipe: TIPE_GAMBAR_PDF, maksByte: UKURAN_BERKAS.lpjTte, target: 1.5 * MB, sisi: 2400 },
  laporan: {
    tipe: TIPE_GAMBAR,
    maksByte: UKURAN_BERKAS.lpjLaporan,
    target: UKURAN_BERKAS.lpjLaporan,
    sisi: 1600,
  },
  lampiran: {
    tipe: TIPE_GAMBAR,
    maksByte: UKURAN_BERKAS.lpjLampiran,
    target: UKURAN_BERKAS.lpjLampiran,
    sisi: 2000,
  },
  bukti: { tipe: TIPE_GAMBAR_PDF, maksByte: UKURAN_BERKAS.lpjBukti, target: 1.5 * MB, sisi: 2400 },
  keuangan: {
    tipe: TIPE_GAMBAR_PDF,
    maksByte: UKURAN_BERKAS.lpjKeuangan,
    target: 1.5 * MB,
    sisi: 2400,
  },
});

/** Daftar gambar di dalam bagian berkas (Meta[] ≤10 per daftar). */
export const DAFTAR_GAMBAR = Object.freeze({
  laporan: {
    jalur: 'laporan.foto',
    folder: (id) => JALUR_BERKAS.lpjLaporan(id),
    aturan: 'laporan',
    maks: JUMLAH.fotoLaporan,
  },
  lampiranFoto: {
    jalur: 'lampiran.foto',
    folder: (id) => JALUR_BERKAS.lpjLampiran(id, 'foto'),
    aturan: 'lampiran',
    maks: JUMLAH.lampiranPerJenis,
  },
  lampiranNota: {
    jalur: 'lampiran.nota',
    folder: (id) => JALUR_BERKAS.lpjLampiran(id, 'nota'),
    aturan: 'lampiran',
    maks: JUMLAH.lampiranPerJenis,
  },
});

const tidakSah = (pesan) => Object.assign(new Error(pesan), { code: 'berkas/tidak-sah' });

/**
 * Periksa tipe, kompres bila gambar, lalu periksa ukuran akhir.
 * @returns {Promise<File>} berkas siap unggah
 */
export async function siapkanBerkas(jenis, file) {
  const aturan = ATURAN_UNGGAHAN[jenis];
  const galatTipe = validasiBerkas(file, { tipe: aturan.tipe, maksByte: Infinity });
  if (galatTipe) throw tidakSah(galatTipe);
  let siap = file;
  if (file.type !== 'application/pdf') {
    try {
      siap = await kompresGambar(file, { targetByte: aturan.target, sisiMaks: aturan.sisi });
    } catch {
      throw tidakSah('Gambar tidak bisa diperkecil. Coba gambar lain.');
    }
  }
  const galat = validasiBerkas(siap, aturan);
  if (galat) throw tidakSah(galat);
  return siap;
}

/**
 * Pemeriksaan cepat saat berkas dipilih (sebelum kompresi): tipe, dan ukuran untuk PDF (gambar
 * besar tetap boleh karena diperkecil otomatis saat diunggah).
 * @returns {string} pesan galat, atau '' bila sah
 */
export function cekBerkasDipilih(jenis, file) {
  const aturan = ATURAN_UNGGAHAN[jenis];
  return validasiBerkas(file, {
    tipe: aturan.tipe,
    maksByte: file?.type === 'application/pdf' ? aturan.maksByte : Infinity,
  });
}

/** Pesan galat unggahan untuk pengguna (validasi, Storage, atau simpan metadata). */
export function pesanUnggah(err) {
  if (err?.code === 'berkas/tidak-sah') return err.message;
  if (String(err?.code || '').startsWith('storage/')) return pesanGagalUnggah(err);
  return pesanGalat(err, 'Gagal menyimpan berkas. Coba lagi.');
}

async function unggahLaluSimpan(folder, file, uid, onProgress, simpan) {
  const meta = await unggahBerkas(folder, file, { uid, onProgress });
  try {
    await simpan(meta);
  } catch (err) {
    hapusDariStorage(meta.path).catch(() => {});
    throw err;
  }
  return meta;
}

// ─── Scan Surat Perintah ber-TTE (tte.scan) ─────────────────────────────────

/** Unggah/ganti scan TTE: unggah → simpan `tte.scan` → hapus scan lama. */
export async function simpanScanTte(berkas, file, uid, { onProgress } = {}) {
  const siap = await siapkanBerkas('tte', file);
  const meta = await unggahLaluSimpan(JALUR_BERKAS.lpjTte(berkas.id), siap, uid, onProgress, (m) =>
    simpanBerkas(berkas.id, { 'tte.scan': m }, uid),
  );
  const lama = berkas.tte?.scan?.path;
  if (lama && lama !== meta.path) hapusDariStorage(lama).catch(() => {});
  return meta;
}

/** Lepas scan TTE: kosongkan `tte.scan` → hapus berkasnya. */
export async function hapusScanTte(berkas, uid) {
  const lama = berkas.tte?.scan?.path;
  await simpanBerkas(berkas.id, { 'tte.scan': null }, uid);
  if (lama) hapusDariStorage(lama).catch(() => {});
}

// ─── Foto laporan & lampiran (daftar Meta di dalam bagian) ──────────────────

/** @param {keyof DAFTAR_GAMBAR} daftar */
export async function tambahGambar(berkasId, daftar, file, uid, { onProgress } = {}) {
  const d = DAFTAR_GAMBAR[daftar];
  const siap = await siapkanBerkas(d.aturan, file);
  return unggahLaluSimpan(d.folder(berkasId), siap, uid, onProgress, (meta) =>
    tambahKeDaftar(berkasId, d.jalur, meta, uid),
  );
}

/** @param {object} meta  Meta persis seperti tersimpan (dari snapshot berkas) */
export async function hapusGambar(berkasId, daftar, meta, uid) {
  await lepasDariDaftar(berkasId, DAFTAR_GAMBAR[daftar].jalur, meta, uid);
  hapusDariStorage(meta.path).catch(() => {});
}

// ─── Bukti pengeluaran per pelaksana ────────────────────────────────────────

export async function tambahBukti(berkasId, { pelaksanaId, label }, file, uid, opsi = {}) {
  const siap = await siapkanBerkas('bukti', file);
  return unggahLaluSimpan(
    JALUR_BERKAS.lpjBukti(berkasId, pelaksanaId),
    siap,
    uid,
    opsi.onProgress,
    (berkas) => tambahBuktiDoc(berkasId, { pelaksanaId, label, berkas }, uid),
  );
}

/** @param {{ id: string, berkas: { path: string } }} bukti  dokumen subkoleksi bukti */
export async function hapusBukti(berkasId, bukti) {
  await hapusBuktiDoc(berkasId, bukti.id);
  hapusDariStorage(bukti.berkas?.path).catch(() => {});
}

// ─── Berkas Keuangan (bukti transfer, pindaian arsip, dokumen DRPP) ─────────
// Bukti transfer, arsip, dan dokumen DRPP tidak bisa dihapus (storage.rules): bila simpan gagal,
// pembersihan unggahan baru dicoba diam-diam.

/** Unggah bukti transfer Bendahara → tahap Transfer selesai (tanggal hari ini). */
export async function kirimTransfer(berkasId, file, uid, { onProgress } = {}) {
  const siap = await siapkanBerkas('keuangan', file);
  return unggahLaluSimpan(
    JALUR_BERKAS.lpjKeuangan(berkasId, 'transfer'),
    siap,
    uid,
    onProgress,
    (meta) =>
      simpanKeuangan(
        berkasId,
        { 'transfer.selesai': true, 'transfer.tanggal': tanggalIso(), 'transfer.berkas': meta },
        uid,
      ),
  );
}

/**
 * Unggah pindaian berkas LPJ lengkap → tahap Arsip selesai. Bila berkas tercantum di daftar DRPP,
 * server menautkannya otomatis (pemicu diKeuanganDitulis).
 */
export async function arsipkanBerkas(berkasId, file, uid, { onProgress } = {}) {
  const siap = await siapkanBerkas('keuangan', file);
  return unggahLaluSimpan(
    JALUR_BERKAS.lpjKeuangan(berkasId, 'arsip'),
    siap,
    uid,
    onProgress,
    (meta) =>
      simpanKeuangan(
        berkasId,
        { 'arsip.selesai': true, 'arsip.tanggalArsip': tanggalIso(), 'arsip.berkas': meta },
        uid,
      ),
  );
}

/** Unggah satu dokumen pindaian DRPP (jenis: 'drpp' | 'spm' | 'sp2d'). */
export async function unggahDokumenDrpp(drppId, jenis, file, uid, { onProgress } = {}) {
  const siap = await siapkanBerkas('keuangan', file);
  return unggahLaluSimpan(JALUR_BERKAS.drpp(drppId, jenis), siap, uid, onProgress, (meta) =>
    simpanDokumenDrpp(drppId, jenis, meta, uid),
  );
}
