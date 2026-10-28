/** Konstanta halaman Penomoran Surat (NomorSurat.js purwarupa admin). */

// Tingkat kode surat (`surat_kode.tingkat` 0–3), sama dengan SuratForm
export const HIERARKI_KODE = ['KOP', 'Kode surat 1', 'Kode surat 2', 'Kode surat 3'];

export { SEKSI as SEKSI_OPTIONS } from '@/data/seksi';

/** Kode tiap tingkat yang terisi, digabung titik (awal nomor surat SuratForm). */
export const prefixKode = (kodeList) =>
  kodeList
    .map((k) => k.kode)
    .filter(Boolean)
    .join('.');

/** Format nomor sama dengan SuratForm: prefix kode + "-" + nomor urut 4 digit. */
export const formatNomorSurat = (kodeList, urut) =>
  `${prefixKode(kodeList)}-${String(urut).padStart(4, '0')}`;
