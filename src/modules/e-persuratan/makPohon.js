/**
 * Pembantu pohon MAK (`mak_node`, docs/skema-database.md §5.3) untuk seluruh e-Persuratan:
 * MAK Setup, pilihan MAK di form LPJ/surat, dan verifikasi.
 * Node: { id, tahunAnggaran, tingkat, kode, nama, indukId, pagu, realisasiAwal?, aktif, urutan }.
 */

/** Tingkat dari akar ke daun (kode yang disimpan di field `tingkat`). */
export const TINGKAT_MAK = Object.freeze([
  'tahun',
  'program',
  'kegiatan',
  'kro',
  'output',
  'komponen',
  'subkomponen',
  'akun',
  'item',
]);

export const LABEL_TINGKAT = Object.freeze({
  tahun: 'Tahun',
  program: 'Program',
  kegiatan: 'Kegiatan',
  kro: 'KRO',
  output: 'Output',
  komponen: 'Komponen',
  subkomponen: 'Sub Komponen',
  akun: 'Akun',
  item: 'Item',
});

/** Tingkat yang dipilih lewat dropdown bertingkat (Item dipilih per baris transaksi). */
export const TINGKAT_PILIHAN = Object.freeze(TINGKAT_MAK.slice(0, -1));

export const urutNode = (a, b) =>
  (a.urutan ?? 0) - (b.urutan ?? 0) ||
  String(a.kode || a.nama || '').localeCompare(String(b.kode || b.nama || ''), 'id', {
    numeric: true,
  });

const aktif = (n) => n.aktif !== false;

/** Pilihan untuk tingkat ke-i: akar `tahun`, lalu anak aktif dari pilihan tingkat sebelumnya. */
export function pilihanTingkat(nodes, i, indukId) {
  if (i === 0) return nodes.filter((n) => n.tingkat === 'tahun' && aktif(n)).sort(urutNode);
  if (!indukId) return [];
  return nodes
    .filter((n) => n.indukId === indukId && n.tingkat !== 'item' && aktif(n))
    .sort(urutNode);
}

/** Label pilihan: "KODE — Nama" (atau nama saja bila tanpa kode). */
export const labelNode = (n) => (n?.kode ? `${n.kode} — ${n.nama || ''}` : n?.nama || '');

/** Rantai node dari akar sampai `nodeId` (akar pertama). */
export function rantaiNode(byId, nodeId) {
  const rantai = [];
  let n = byId[nodeId];
  for (let jaga = 0; n && jaga < TINGKAT_MAK.length; jaga++) {
    rantai.unshift(n);
    n = n.indukId ? byId[n.indukId] : null;
  }
  return rantai;
}

/** Kode MAK dari Akun ke atas, digabung spasi; kode kosong (mis. node Tahun) dilewati. */
export const kodeMakDari = (byId, akunNodeId) =>
  rantaiNode(byId, akunNodeId)
    .map((n) => n.kode)
    .filter(Boolean)
    .join(' ');

/** Item aktif di bawah Akun (untuk baris Detail Transaksi). */
export const itemDiAkun = (nodes, akunNodeId) =>
  akunNodeId
    ? nodes
        .filter((n) => n.indukId === akunNodeId && n.tingkat === 'item' && aktif(n))
        .sort(urutNode)
    : [];

/**
 * Pilihan MAK (`Mak`, skema §3) dari node Akun terpilih: kode lengkap + id tiap tingkat.
 * @returns {{ kode, akunNodeId, tahunNodeId, pilihan: Record<string, string> }}
 */
export function makDariAkun(byId, akunNodeId) {
  const rantai = rantaiNode(byId, akunNodeId);
  return {
    kode: kodeMakDari(byId, akunNodeId),
    akunNodeId: rantai.at(-1)?.tingkat === 'akun' ? akunNodeId : '',
    tahunNodeId: rantai[0]?.tingkat === 'tahun' ? rantai[0].id : '',
    pilihan: Object.fromEntries(rantai.map((n) => [n.tingkat, n.id])),
  };
}
