import { useState } from 'react';
import { tahunIni } from '@/utils/nilai';
import { K } from '../../ui/kelas';
import { NAMA_BULAN } from '../../ui/format';
import { useBaganAkun } from '../../hooks/useBaganAkun';
import { useBukuBesar } from '../../hooks/useBukuBesar';
import { useRekap } from '../../hooks/useRekap';
import { BULAN, labaRugi, rentang } from '../../utils/laporan';
import Halaman from '../../components/Halaman';
import PilihPeriode from '../../components/laporan/PilihPeriode';
import TabelLaporan from '../../components/laporan/TabelLaporan';
import TombolExcel from '../../components/laporan/TombolExcel';

const KEMBALI = { to: '/koperasi/laporan', label: 'Laporan' };
const baris = (k) =>
  k.baris.map((b) => ({ kode: b.akun.kode, label: b.akun.nama, nilai: b.nilai }));

/** Perhitungan Hasil Usaha (laba rugi / SHU) per bulan atau setahun. */
export default function LaporanPhu() {
  const { akun, memuat: m1 } = useBaganAkun();
  const { rekap, memuat: m2 } = useRekap();
  const { saldoAwal } = useBukuBesar();
  const [tahun, setTahun] = useState(tahunIni());
  const [bulan, setBulan] = useState('');
  const [dari, sampai] = rentang(tahun, bulan);
  const lr = labaRugi(akun, rekap, dari, sampai);

  const lembar = () => {
    const perBulan = BULAN.map((b) => labaRugi(akun, rekap, `${tahun}-${b}`, `${tahun}-${b}`));
    const setahun = labaRugi(akun, rekap, `${tahun}-01`, `${tahun}-12`);
    const kepala = ['Kode', 'Akun', ...NAMA_BULAN, 'Setahun'];
    const isi = [];
    const tambahKelompok = (judul, id, labelTotal) => {
      isi.push(['', judul]);
      setahun[id].baris.forEach((b, i) => {
        if (!b.nilai && perBulan.every((p) => !p[id].baris[i].nilai)) return;
        isi.push([b.akun.kode, b.akun.nama, ...perBulan.map((p) => p[id].baris[i].nilai), b.nilai]);
      });
      isi.push(['', labelTotal, ...perBulan.map((p) => p[id].total), setahun[id].total]);
    };
    tambahKelompok('PENDAPATAN', 'pendapatan', 'Total Pendapatan');
    tambahKelompok('HARGA POKOK PENJUALAN', 'hpp', 'Total HPP');
    isi.push(['', 'SISA HASIL USAHA KOTOR', ...perBulan.map((p) => p.shuKotor), setahun.shuKotor]);
    tambahKelompok('PENGELUARAN', 'beban', 'Total Pengeluaran');
    isi.push(['', 'SISA HASIL USAHA', ...perBulan.map((p) => p.shu), setahun.shu]);
    return [
      { nama: `PHU ${tahun}`, lebar: [8, 40, ...BULAN.map(() => 14), 16], baris: [kepala, ...isi] },
    ];
  };

  return (
    <Halaman
      judul="Perhitungan Hasil Usaha"
      sub="Pendapatan, harga pokok, pengeluaran, dan SHU dari jurnal."
      kembali={KEMBALI}
      aksi={
        <TombolExcel
          namaBerkas={`PHU Koperasi ${tahun}.xlsx`}
          buatLembar={lembar}
          disabled={m1 || m2}
        />
      }
    >
      <PilihPeriode
        tahun={tahun}
        bulan={bulan}
        onTahun={setTahun}
        onBulan={setBulan}
        tahunAwal={Number(saldoAwal?.tanggalMulai?.slice(0, 4))}
      />
      {m1 || m2 ? (
        <p className={K.kosong}>Memuat…</p>
      ) : (
        <TabelLaporan
          bagian={[
            {
              judul: 'Pendapatan',
              baris: baris(lr.pendapatan),
              total: { label: 'Total pendapatan', nilai: lr.pendapatan.total },
            },
            {
              judul: 'Harga Pokok Penjualan',
              baris: baris(lr.hpp),
              total: { label: 'SHU kotor', nilai: lr.shuKotor },
            },
            {
              judul: 'Pengeluaran',
              baris: baris(lr.beban),
              total: { label: 'Total pengeluaran', nilai: lr.beban.total },
            },
          ]}
          akhir={{ label: 'Sisa Hasil Usaha', nilai: lr.shu }}
        />
      )}
    </Halaman>
  );
}
