/**
 * Helper pohon MAK. Node: { id, kode, name, type, parentId, pagu }.
 * Tingkat: Tahun → Program → Kegiatan → KRO → Output → Komponen → Sub Komponen → Akun → Item.
 */

// Tingkat yang dipilih di dropdown (Item dipilih per baris transaksi)
export const MAK_LEVELS = [
  'Tahun',
  'Program',
  'Kegiatan',
  'KRO',
  'Output',
  'Komponen',
  'Sub Komponen',
  'Akun',
];

const sortNodes = (a, b) =>
  String(a.kode || a.name || '').localeCompare(String(b.kode || b.name || ''), 'id', {
    numeric: true,
  });

/** Pilihan untuk tingkat ke-i: akar bertipe Tahun, lalu anak dari pilihan tingkat sebelumnya. */
export function makOptions(nodes, levelIndex, parentId) {
  if (levelIndex === 0) {
    return nodes
      .filter((n) => !n.parentId && String(n.type || '').toLowerCase() === 'tahun')
      .sort(sortNodes);
  }
  if (!parentId) return [];
  return nodes
    .filter((n) => n.parentId === parentId && String(n.type || '').toLowerCase() !== 'item')
    .sort(sortNodes);
}

/** Label pilihan: "KODE — Nama" (atau nama saja bila tanpa kode). */
export const makNodeLabel = (n) => (n.kode ? `${n.kode} — ${n.name || ''}` : n.name || '');

/**
 * String kode MAK dari Akun ke atas, digabung spasi (sama dengan MakSearch di SuratForm).
 * Kode kosong (mis. Tahun hasil impor CSV) dilewati.
 */
export function makKodeFromAkun(byId, akunNodeId) {
  const parts = [];
  let curr = byId[akunNodeId];
  let guard = 0;
  while (curr && guard < 20) {
    if (curr.kode) parts.unshift(curr.kode);
    curr = curr.parentId ? byId[curr.parentId] : null;
    guard++;
  }
  return parts.join(' ');
}

/** Node Tahun (akar) dari sebuah node. */
export function makTahunOf(byId, nodeId) {
  let curr = byId[nodeId];
  let guard = 0;
  while (curr && curr.parentId && guard < 20) {
    curr = byId[curr.parentId];
    guard++;
  }
  return curr || null;
}

/** Item di bawah Akun (untuk baris Detail Transaksi). */
export function makItemsOfAkun(nodes, akunNodeId) {
  if (!akunNodeId) return [];
  return nodes
    .filter((n) => n.parentId === akunNodeId && String(n.type || '').toLowerCase() === 'item')
    .sort(sortNodes);
}

/** Apakah node bertipe Akun. */
export const isAkun = (n) => String(n?.type || '').toLowerCase() === 'akun';
