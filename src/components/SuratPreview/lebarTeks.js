/**
 * Perkiraan lebar teks untuk font bawaan PDF (Helvetica/Times, biasa & tebal) dan pengatur lebar
 * blok tanda tangan, supaya nama penanda tangan yang panjang tetap satu baris: kotak TTD melebar
 * (posisinya bergeser) mengikuti nama, dan bila ruangnya tetap tidak cukup, ukuran hurufnya
 * diperkecil sedikit. Lebar huruf dari metrik AFM standar (satuan 1/1000 em).
 */

// Lebar A–Z dan a–z per font (urut alfabet)
const METRIK = {
  Helvetica: {
    besar: [
      667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667,
      611, 722, 667, 944, 667, 667, 611,
    ],
    kecil: [
      556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500,
      278, 556, 500, 722, 500, 500, 500,
    ],
    spasi: 278,
    angka: 556,
  },
  'Helvetica-Bold': {
    besar: [
      722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667,
      611, 722, 667, 944, 667, 667, 611,
    ],
    kecil: [
      556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556,
      333, 611, 556, 778, 556, 556, 500,
    ],
    spasi: 278,
    angka: 556,
  },
  'Times-Roman': {
    besar: [
      722, 667, 667, 722, 611, 556, 722, 722, 333, 389, 722, 611, 889, 722, 722, 556, 722, 667, 556,
      611, 722, 722, 944, 722, 722, 611,
    ],
    kecil: [
      444, 500, 444, 500, 444, 333, 500, 500, 278, 278, 500, 278, 778, 500, 500, 500, 500, 333, 389,
      278, 500, 500, 722, 500, 500, 444,
    ],
    spasi: 250,
    angka: 500,
  },
  'Times-Bold': {
    besar: [
      722, 667, 722, 722, 667, 611, 778, 778, 389, 500, 778, 667, 944, 722, 778, 611, 778, 722, 556,
      667, 722, 722, 1000, 722, 722, 667,
    ],
    kecil: [
      500, 556, 444, 556, 444, 333, 500, 556, 278, 333, 556, 278, 833, 556, 500, 556, 556, 444, 389,
      333, 556, 500, 722, 500, 500, 444,
    ],
    spasi: 250,
    angka: 500,
  },
};

const TANDA = { '.': 278, ',': 278, '-': 333, "'": 278, ':': 278, '(': 333, ')': 333, '/': 278 };

/** Perkiraan lebar satu baris teks (pt), sedikit dilebihkan supaya aman. */
export function lebarTeks(teks, font = 'Helvetica', ukuran = 11) {
  const m = METRIK[font] || METRIK.Helvetica;
  let satuan = 0;
  for (const c of String(teks ?? '')) {
    const k = c.charCodeAt(0);
    if (k >= 65 && k <= 90) satuan += m.besar[k - 65];
    else if (k >= 97 && k <= 122) satuan += m.kecil[k - 97];
    else if (k >= 48 && k <= 57) satuan += m.angka;
    else if (c === ' ') satuan += m.spasi;
    else satuan += TANDA[c] || 600;
  }
  return (satuan / 1000) * ukuran * 1.03 + 2;
}

/**
 * Ukuran huruf terbesar (≤ `ukuran`) agar teks muat satu baris selebar `lebar`. Bila itu berarti
 * lebih kecil dari `terkecil` (nama sangat panjang di kolom sempit), teks dibiarkan turun rapi
 * menjadi dua baris dengan ukuran yang masih terbaca.
 */
export function ukuranMuat(teks, font, ukuran, lebar, terkecil = 7) {
  const perlu = lebarTeks(teks, font, ukuran);
  if (perlu <= lebar) return ukuran;
  const pas = (ukuran * lebar) / perlu;
  const bulat = (n) => Math.floor(n * 10) / 10;
  if (pas >= terkecil) return bulat(pas);
  return Math.min(ukuran, Math.max(terkecil, bulat(pas * 2 * 0.85)));
}

/** Lebar terpanjang dari daftar baris `[teks, font, ukuran]`. */
const lebarBaris = (baris) => Math.max(0, ...baris.map(([t, f, u]) => lebarTeks(t, f, u)));

/**
 * Lebar satu kotak TTD (rata kanan): cukup untuk baris terpanjang (biasanya nama), tidak kurang
 * dari lebar bawaan `min`, dan tidak lebih dari `maks` (lebar area isi halaman).
 */
export function lebarKotakTtd(baris, { min, maks }) {
  return Math.min(maks, Math.max(min, lebarBaris(baris)));
}

/**
 * Lebar beberapa kolom TTD berdampingan (mis. PPK | Bendahara). Kolom yang namanya panjang
 * melebar memakai sisa ruang. Bila jumlahnya melebihi `total`, kolom yang namanya pendek boleh
 * menyempit sampai `kecil` (lebar teks jabatan terpanjangnya), lalu ruang yang tersisa dibagi
 * sebanding kebutuhan; nama yang tetap tidak muat diperkecil hurufnya lewat `ukuranMuat`.
 * @param {{ baris: Array<[string, string, number]>, min: number, kecil?: number }[]} kolom
 *   min = lebar bawaan template, kecil = lebar terkecil yang masih boleh (bawaan = min)
 */
export function lebarKolomTtd(kolom, total, jarak = 12) {
  const perlu = kolom.map((k) => Math.max(k.min, lebarBaris(k.baris)));
  const ruang = total - jarak * (kolom.length - 1);
  const jumlahPerlu = perlu.reduce((a, b) => a + b, 0);
  if (jumlahPerlu <= ruang) return perlu;
  const dasar = kolom.map((k, i) => Math.min(perlu[i], Math.max(k.kecil ?? k.min, 0)));
  const jumlahDasar = dasar.reduce((a, b) => a + b, 0);
  const sisa = Math.max(0, ruang - jumlahDasar);
  const tambah = jumlahPerlu - jumlahDasar;
  return perlu.map((p, i) => dasar[i] + (tambah ? ((p - dasar[i]) * sisa) / tambah : 0));
}
