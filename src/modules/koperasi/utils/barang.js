/**
 * Pembantu barang Kantin: jenis (barang/resep), satuan jual (satuan dasar + kemasan), dan resep.
 * Stok & harga pokok selalu dalam satuan dasar (docs/rencana-koperasi.md §8).
 */

export const jenisBarang = (b) => b?.jenis || 'barang';
export const adalahResep = (b) => jenisBarang(b) === 'resep';

/** Semua satuan jual: satuan dasar (id '') lalu kemasan. */
export function satuanJual(b) {
  return [
    { id: '', nama: b.satuan, isi: 1, hargaJual: b.hargaJual, barkode: b.barkode || '' },
    ...(adalahResep(b) ? [] : b.kemasan || []),
  ];
}

export const satuanDari = (b, kemasanId) =>
  satuanJual(b).find((s) => s.id === (kemasanId || '')) ?? satuanJual(b)[0];

/** Cari barang menurut barkode satuan dasar atau barkode kemasan. Kembalian { barang, kemasanId }. */
export function cariBarkode(daftar, kode) {
  for (const b of daftar) {
    if (b.barkode && b.barkode === kode) return { barang: b, kemasanId: '' };
    const k = (b.kemasan || []).find((x) => x.barkode && x.barkode === kode);
    if (k) return { barang: b, kemasanId: k.id };
  }
  return null;
}

/** Perkiraan HPP satu porsi resep dari harga pokok komponen saat ini. */
export function hppResep(resep, petaBarang) {
  return (resep.komponen || []).reduce(
    (n, k) => n + (petaBarang.get(k.barangId)?.hargaPokok || 0) * k.jumlah,
    0,
  );
}

/** Berapa porsi resep yang bisa dibuat dari stok komponen (0 bila ada komponen habis). */
export function bisaDibuat(resep, petaBarang) {
  const komponen = resep.komponen || [];
  if (!komponen.length) return 0;
  return Math.max(
    0,
    Math.min(
      ...komponen.map((k) => Math.floor((petaBarang.get(k.barangId)?.stok ?? 0) / k.jumlah)),
    ),
  );
}

/** Kode acak pendek untuk kemasan baru. */
export const idKemasan = () => Math.random().toString(36).slice(2, 8);
