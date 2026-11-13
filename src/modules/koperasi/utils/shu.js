/**
 * Pembagian SHU (docs/rencana-koperasi.md §2): SHU tahun × persentase tiap bagian; Jasa Modal dibagi
 * menurut saldo simpanan pokok + wajib per 31 Desember, Jasa Usaha menurut belanja anggota di Kasir
 * selama tahun itu. Anggota yang keluar sebelum akhir tahun tidak mendapat SHU tahun itu.
 */
import { BAGIAN_SHU } from '../data/shu';

export function alokasiShu(shu, persen) {
  return BAGIAN_SHU.map((b) => ({
    ...b,
    persen: persen[b.id] ?? 0,
    nilai: shu > 0 ? Math.round((shu * (persen[b.id] ?? 0)) / 100) : 0,
  }));
}

/** Saldo simpanan anggota per 31 Desember `tahun` dari saldo awal + rekap setoran/pengambilan. */
export function saldoAkhirTahun(a, rekapAnggota, tahun) {
  let saldo = (a.awalPokok || 0) + (a.awalWajib || 0);
  Object.entries(rekapAnggota).forEach(([t, doc]) => {
    if (Number(t) > tahun) return;
    const r = doc.anggota?.[a.id];
    if (r) saldo += (r.setorPokok || 0) + (r.setorWajib || 0) - (r.ambil || 0);
  });
  return Math.max(0, saldo);
}

/** Rincian SHU per anggota: [{ anggota, simpanan, belanja, jasaModal, jasaUsaha, total }]. */
export function shuPerAnggota(anggota, rekapAnggota, tahun, danaModal, danaUsaha) {
  const akhir = `${tahun}-12-31`;
  const berhak = anggota.filter(
    (a) =>
      a.tanggalMasuk &&
      a.tanggalMasuk <= akhir &&
      !(a.status === 'keluar' && a.tanggalKeluar && a.tanggalKeluar <= akhir),
  );
  const baris = berhak.map((a) => ({
    anggota: a,
    simpanan: saldoAkhirTahun(a, rekapAnggota, tahun),
    belanja: Math.max(0, rekapAnggota[String(tahun)]?.anggota?.[a.id]?.belanja || 0),
  }));
  const totalSimpanan = baris.reduce((n, b) => n + b.simpanan, 0);
  const totalBelanja = baris.reduce((n, b) => n + b.belanja, 0);
  return {
    totalSimpanan,
    totalBelanja,
    baris: baris.map((b) => {
      const jasaModal = totalSimpanan ? Math.round((danaModal * b.simpanan) / totalSimpanan) : 0;
      const jasaUsaha = totalBelanja ? Math.round((danaUsaha * b.belanja) / totalBelanja) : 0;
      return { ...b, jasaModal, jasaUsaha, total: jasaModal + jasaUsaha };
    }),
  };
}
