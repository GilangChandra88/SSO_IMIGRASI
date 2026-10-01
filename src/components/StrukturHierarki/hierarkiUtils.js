/**
 * Helper pohon data berjenjang (MAK, kode surat): setiap node { id, kode, name, type, parentId }.
 * Pengganti makFindNode/makGetChildren/makNextType purwarupa admin.
 */

const urutNode = (a, b) =>
  (a.kode || '').localeCompare(b.kode || '', 'id', { numeric: true }) ||
  (a.name || '').localeCompare(b.name || '', 'id', { numeric: true });

/** Indeks node: byId (Map) dan anakDari(parentId) yang sudah diurutkan per kode. */
export function indeksHierarki(nodes) {
  const byId = new Map();
  const anak = new Map();
  nodes.forEach((n) => byId.set(n.id, n));
  nodes.forEach((n) => {
    const p = n.parentId ?? null;
    if (!anak.has(p)) anak.set(p, []);
    anak.get(p).push(n);
  });
  anak.forEach((list) => list.sort(urutNode));
  return { byId, anakDari: (id) => anak.get(id ?? null) || [] };
}

/** Semua id keturunan sebuah node (tanpa node itu sendiri). */
export function idKeturunan(indeks, id) {
  const hasil = [];
  const antre = [...indeks.anakDari(id)];
  while (antre.length) {
    const n = antre.shift();
    hasil.push(n.id);
    antre.push(...indeks.anakDari(n.id));
  }
  return hasil;
}

/** Id leluhur dari akar sampai induk langsung. */
export function idLeluhur(indeks, id) {
  const hasil = [];
  let p = indeks.byId.get(id)?.parentId ?? null;
  while (p) {
    hasil.unshift(p);
    p = indeks.byId.get(p)?.parentId ?? null;
  }
  return hasil;
}

/** Tingkat berikutnya; `null` untuk akar (= tingkat pertama), null bila sudah tingkat terakhir. */
export function tipeBerikut(hierarchy, type) {
  if (type == null) return hierarchy[0];
  const i = hierarchy.indexOf(type);
  return i >= 0 && i < hierarchy.length - 1 ? hierarchy[i + 1] : null;
}

export const formatRupiah = (n) => new Intl.NumberFormat('id-ID').format(Number(n) || 0);

/** Indentasi baris per kedalaman (8px + 20px × kedalaman, seperti purwarupa). */
export const INDENT = [
  'pl-[8px]',
  'pl-[28px]',
  'pl-[48px]',
  'pl-[68px]',
  'pl-[88px]',
  'pl-[108px]',
  'pl-[128px]',
  'pl-[148px]',
  'pl-[168px]',
  'pl-[188px]',
];
export const indentKelas = (depth) => INDENT[Math.min(depth, INDENT.length - 1)];
