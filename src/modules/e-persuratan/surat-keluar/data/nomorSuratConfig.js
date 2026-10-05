/** Konstanta halaman Penomoran Surat (NomorSurat.js purwarupa admin). */

// Tingkat kode surat di koleksi `nomor surat kanim` (sama dengan SuratForm)
export const HIERARKI_KODE = ['KOP', 'Kode surat 1', 'Kode surat 2', 'Kode surat 3'];

export const SEKSI_OPTIONS = [
  'Lalintalkim',
  'Inteldakim',
  'Tikim',
  'Umum',
  'Keuangan',
  'Kepegawaian',
];

/** Kode tiap tingkat yang terisi, digabung titik (awal nomor surat SuratForm). */
export const prefixKode = (kodeList) =>
  kodeList
    .map((k) => k.kode)
    .filter(Boolean)
    .join('.');

/** Format nomor sama dengan SuratForm: prefix kode + "-" + nomor urut 4 digit. */
export const formatNomorSurat = (kodeList, urut) =>
  `${prefixKode(kodeList)}-${String(urut).padStart(4, '0')}`;
