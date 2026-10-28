/** Konstanta Inventory (data.js purwarupa inventory-ui, tanpa data contoh). */

// Akun SAKTI kategori barang persediaan; kategori baru otomatis masuk ke akun ini
export const AKUN_PERSEDIAAN = { kode: '117111', nama: 'Barang Konsumsi' };

// Satuan barang untuk pilihan di Tambah/Ubah Barang. Satuan yang sudah dipakai barang ikut muncul.
export const SATUAN = [
  'batang',
  'botol',
  'box',
  'buah',
  'buku',
  'bungkus',
  'dus',
  'eksemplar',
  'galon',
  'gulung',
  'ikat',
  'jerigen',
  'kaleng',
  'kg',
  'kodi',
  'lembar',
  'liter',
  'lusin',
  'meter',
  'pak',
  'pasang',
  'pcs',
  'rim',
  'roll',
  'sachet',
  'set',
  'tabung',
  'tube',
  'unit',
];

export const FILTER_STATUS = [
  { id: 'semua', label: 'Semua' },
  { id: 'aman', label: 'Aman' },
  { id: 'menipis', label: 'Menipis' },
  { id: 'habis', label: 'Habis' },
];
