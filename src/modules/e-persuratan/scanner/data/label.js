/** Label antarmuka untuk nilai yang dikirim ke Agen Scanner. */

export const LABEL_DRIVER = {
  wia: 'WIA (Windows)',
  twain: 'TWAIN (driver pabrik)',
  escl: 'eSCL (jaringan, tanpa driver)',
};

export const LABEL_SUMBER = {
  kaca: 'Kaca (flatbed)',
  pengumpan: 'Pengumpan (ADF)',
  duplex: 'ADF dua sisi',
};

export const LABEL_WARNA = {
  warna: 'Berwarna',
  abu: 'Abu-abu',
  hitamputih: 'Hitam-putih',
};

export const UKURAN = [
  ['a4', 'A4 (210 × 297 mm)'],
  ['f4', 'F4 / Folio (215 × 330 mm)'],
  ['letter', 'Letter'],
  ['legal', 'Legal'],
  ['a5', 'A5'],
];

export const LABEL_SUMBER_HALAMAN = { scan: 'Pindaian', gambar: 'Gambar', pdf: 'PDF' };

/** Pengaturan bawaan: abu-abu 200 dpi cukup tajam untuk dokumen dan ukurannya kecil. */
export const PENGATURAN_AWAL = {
  sumber: 'pengumpan',
  warna: 'abu',
  dpi: 200,
  ukuran: 'a4',
  lewatiKosong: false,
};
