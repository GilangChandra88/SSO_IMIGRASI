/**
 * Pembantu struktur unit kerja (`pegawai_unit`, docs/skema-database.md §5.1), tanpa Firebase.
 * Tingkat: kantor (0) → subbagian/seksi (1) → urusan/subseksi (2). "Seksi" seorang pegawai = unit
 * bagiannya: seksi, subbagian, atau urusan; anggota subseksi ikut seksinya, pimpinan ikut kantor.
 * Dibaca lewat `useUnitKerja` (@/context/useUnitKerja).
 */

/** Jenis unit (sama dengan rules `unitSah`), urut dari tingkat tertinggi. */
export const JENIS_UNIT = Object.freeze([
  { id: 'kantor', label: 'Kantor' },
  { id: 'subbagian', label: 'Subbagian' },
  { id: 'seksi', label: 'Seksi' },
  { id: 'urusan', label: 'Urusan' },
  { id: 'subseksi', label: 'Subseksi' },
]);

export const labelJenisUnit = (jenis) => JENIS_UNIT.find((j) => j.id === jenis)?.label || jenis;

/** 0 = kantor, 1 = subbagian/seksi, 2 = urusan/subseksi. */
export const tingkatUnit = (jenis) =>
  jenis === 'kantor' ? 0 : jenis === 'subbagian' || jenis === 'seksi' ? 1 : 2;

export const JENIS_BAGIAN = ['subbagian', 'seksi', 'urusan'];

/** Label pendek unit (wajib di master; cadangan kode). Dipakai sebagai "seksi" di modul lain. */
export const labelUnit = (u) => u?.singkatan || u?.kode || '';

const urutUnit = (a, b) =>
  (a.urutan ?? 0) - (b.urutan ?? 0) || labelUnit(a).localeCompare(labelUnit(b), 'id');

/**
 * Daftar unit dalam urutan pohon (induk lalu anak-anaknya), masing-masing ditambah `kedalaman`.
 * Unit yang induknya tidak ditemukan ditaruh di akar paling akhir.
 */
export function susunPohon(units) {
  const anak = new Map();
  const ada = new Set(units.map((u) => u.id));
  for (const u of units) {
    const induk = u.indukId && ada.has(u.indukId) ? u.indukId : '';
    if (!anak.has(induk)) anak.set(induk, []);
    anak.get(induk).push(u);
  }
  const hasil = [];
  const telusuri = (indukId, kedalaman, dilihat) => {
    for (const u of (anak.get(indukId) || []).sort(urutUnit)) {
      if (dilihat.has(u.id)) continue;
      dilihat.add(u.id);
      hasil.push({ ...u, kedalaman });
      telusuri(u.id, kedalaman + 1, dilihat);
    }
  };
  telusuri('', 0, new Set());
  return hasil;
}

/** Unit bagian dari sebuah unit: dirinya bila seksi/subbagian/urusan, seksi induk untuk subseksi. */
export function unitBagian(byId, unitId) {
  let u = byId[unitId];
  for (let i = 0; u && i < 4; i++) {
    if (JENIS_BAGIAN.includes(u.jenis) || u.jenis === 'kantor') return u;
    u = byId[u.indukId];
  }
  return null;
}

/** Pilihan seksi ditambah nilai yang sedang tersimpan bila sudah tidak ada di struktur (data lama). */
export const opsiSeksiDengan = (pilihan, nilai) =>
  nilai && !pilihan.includes(nilai) ? [...pilihan, nilai] : pilihan;

/** Label seksi (disalin ke `pegawai.seksi`) untuk unit kerja seorang pegawai. */
export const labelSeksi = (byId, unitId) => labelUnit(unitBagian(byId, unitId));

/** Nama lengkap unit beserta induknya, mis. "Subseksi Izin Tinggal · Seksi Lantaskim". */
export function jalurNamaUnit(byId, unitId) {
  const u = byId[unitId];
  if (!u) return '';
  const induk = byId[u.indukId];
  return induk && induk.jenis !== 'kantor' ? `${u.nama} · ${labelUnit(induk)}` : u.nama;
}
