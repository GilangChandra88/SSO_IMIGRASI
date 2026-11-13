/**
 * Barkode ritel standar GS1: EAN-8, UPC-A (12), EAN-13, GTIN-14 (dus/ITF-14), atau UPC-E (8 digit),
 * dengan digit cek benar. Logika SAMA dengan `barkodeStandar` di functions/src/koperasiKantin.js (server
 * yang menegakkan; di sini untuk peringatan di layar).
 */

/** Digit cek GS1 untuk deret angka tanpa digit cek (bobot 3,1,3,… dari kanan). */
function digitCek(angka) {
  const total = [...angka].reverse().reduce((n, d, i) => n + Number(d) * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (total % 10)) % 10;
}

/** UPC-E 8 digit → 11 digit pertama UPC-A (tanpa digit cek). */
function upcEkeUpcA(k) {
  const d = k.slice(1, 7);
  const t = d[5];
  let isi;
  if (t <= '2') isi = `${d.slice(0, 2)}${t}0000${d.slice(2, 5)}`;
  else if (t === '3') isi = `${d.slice(0, 3)}00000${d.slice(3, 5)}`;
  else if (t === '4') isi = `${d.slice(0, 4)}00000${d[4]}`;
  else isi = `${d.slice(0, 5)}0000${t}`;
  return `${k[0]}${isi}`;
}

export function barkodeStandar(kode) {
  if (!/^\d+$/.test(kode)) return false;
  const cek = Number(kode[kode.length - 1]);
  if ([8, 12, 13, 14].includes(kode.length) && digitCek(kode.slice(0, -1)) === cek) return true;
  return (
    kode.length === 8 && (kode[0] === '0' || kode[0] === '1') && digitCek(upcEkeUpcA(kode)) === cek
  );
}

export const PESAN_TIDAK_STANDAR =
  'Bukan barkode standar (EAN-13/EAN-8/UPC/GTIN-14 dengan digit cek benar).';

/** Semua barkode milik satu barang: [{ kode, kemasanId, label }]. */
export function barkodeBarang(b) {
  return [
    ...(b.barkode ? [{ kode: b.barkode, kemasanId: '', label: 'Barkode' }] : []),
    ...(b.kemasan || [])
      .filter((k) => k.barkode)
      .map((k) => ({ kode: k.barkode, kemasanId: k.id, label: `Barkode ${k.nama}` })),
  ];
}

/**
 * Barkode bermasalah di seluruh daftar (data lama yang terlanjur tersimpan): tidak standar atau kembar.
 * Kembalian: Map<barangId, string[]> pesan per barang.
 */
export function masalahBarkode(daftar) {
  const pemakai = new Map();
  daftar.forEach((b) =>
    barkodeBarang(b).forEach((x) => {
      const l = pemakai.get(x.kode) || [];
      l.push(b);
      pemakai.set(x.kode, l);
    }),
  );
  const hasil = new Map();
  const catat = (id, pesan) => hasil.set(id, [...(hasil.get(id) || []), pesan]);
  daftar.forEach((b) =>
    barkodeBarang(b).forEach((x) => {
      if (!barkodeStandar(x.kode)) catat(b.id, `${x.label} ${x.kode} tidak standar`);
      const lain = [...new Set(pemakai.get(x.kode))].filter((y) => y.id !== b.id);
      if (lain.length) catat(b.id, `${x.label} ${x.kode} kembar dengan ${lain[0].nama}`);
    }),
  );
  return hasil;
}
