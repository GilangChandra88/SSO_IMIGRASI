/**
 * Perhitungan laporan Koperasi dari rekap jurnal (`koperasi_rekap/{tahun}`) + saldo awal.
 * Periode ditulis 'YYYY-MM'. Semua angka bilangan bulat rupiah.
 */
import { hitungSaldo } from '../data/baganAkun';

export const BULAN = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const KELOMPOK_LR = ['pendapatan', 'hpp', 'beban'];

/** Total debit/kredit satu akun dari periode `dari` s.d. `sampai` (inklusif). */
export function gerak(rekap, akunId, dari, sampai) {
  let d = 0;
  let k = 0;
  Object.entries(rekap).forEach(([tahun, doc]) => {
    if (!/^\d{4}$/.test(tahun)) return;
    BULAN.forEach((bl) => {
      const p = `${tahun}-${bl}`;
      if (p < dari || p > sampai) return;
      const g = doc.bulan?.[bl]?.[akunId];
      if (g) {
        d += g.d || 0;
        k += g.k || 0;
      }
    });
  });
  return { d, k };
}

/** Saldo akun neraca di akhir periode `sampai`. */
export function saldoPada(akun, saldoAwal, rekap, sampai) {
  const g = gerak(rekap, akun.id, '0000-00', sampai);
  return hitungSaldo(akun, saldoAwal?.saldo?.[akun.id] || 0, g.d, g.k);
}

/**
 * Perhitungan hasil usaha periode `dari`–`sampai`: baris per akun pendapatan/HPP/beban,
 * total, SHU kotor (pendapatan − HPP), dan SHU (SHU kotor − beban).
 */
export function labaRugi(akun, rekap, dari, sampai) {
  const kelompok = {};
  KELOMPOK_LR.forEach((id) => {
    const baris = akun
      .filter((a) => a.kelompok === id)
      .map((a) => {
        const g = gerak(rekap, a.id, dari, sampai);
        return { akun: a, nilai: id === 'pendapatan' ? g.k - g.d : g.d - g.k };
      });
    kelompok[id] = { baris, total: baris.reduce((n, b) => n + b.nilai, 0) };
  });
  const shuKotor = kelompok.pendapatan.total - kelompok.hpp.total;
  return { ...kelompok, shuKotor, shu: shuKotor - kelompok.beban.total };
}

/** Arus kas per akun lawan periode `dari`–`sampai`: { [akunId]: { m, k } }. */
export function arusKas(rekap, dari, sampai) {
  const hasil = {};
  Object.entries(rekap).forEach(([tahun, doc]) => {
    if (!/^\d{4}$/.test(tahun)) return;
    BULAN.forEach((bl) => {
      const p = `${tahun}-${bl}`;
      if (p < dari || p > sampai) return;
      Object.entries(doc.arus?.[bl] || {}).forEach(([akunId, v]) => {
        const h = hasil[akunId] || { m: 0, k: 0 };
        hasil[akunId] = { m: h.m + (v.m || 0), k: h.k + (v.k || 0) };
      });
    });
  });
  return hasil;
}

/** Periode sebelum 'YYYY-MM'. */
export const periodeSebelum = (p) => {
  const [y, m] = p.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
};

/** Rentang periode untuk pilihan "tahun + bulan ('' = setahun)". */
export const rentang = (tahun, bulan) =>
  bulan ? [`${tahun}-${bulan}`, `${tahun}-${bulan}`] : [`${tahun}-01`, `${tahun}-12`];
