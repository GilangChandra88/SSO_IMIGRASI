import { useState } from 'react';
import { tahunIni } from '@/utils/nilai';
import { K } from '../../ui/kelas';
import { rupiah } from '../../ui/format';
import { useBaganAkun } from '../../hooks/useBaganAkun';
import { useBukuBesar } from '../../hooks/useBukuBesar';
import { useRekap } from '../../hooks/useRekap';
import { arusKas, periodeSebelum, rentang, saldoPada } from '../../utils/laporan';
import Halaman from '../../components/Halaman';
import PilihPeriode from '../../components/laporan/PilihPeriode';
import TabelLaporan from '../../components/laporan/TabelLaporan';
import TombolExcel from '../../components/laporan/TombolExcel';

const KEMBALI = { to: '/koperasi/laporan', label: 'Laporan' };
const AKTIVITAS = [
  {
    judul: 'Aktivitas Operasi',
    kelompok: ['pendapatan', 'hpp', 'beban', 'asetLancar', 'kewajibanLancar'],
  },
  { judul: 'Aktivitas Investasi', kelompok: ['asetTetap'] },
  { judul: 'Aktivitas Pendanaan', kelompok: ['ekuitas', 'kewajibanPanjang'] },
];

/** Arus kas (uang masuk − keluar di rekening kas/bank) menurut akun lawannya. */
export default function LaporanArusKas() {
  const { akun, memuat: m1 } = useBaganAkun();
  const { rekap, memuat: m2 } = useRekap();
  const { saldoAwal, memuat: m3 } = useBukuBesar();
  const [tahun, setTahun] = useState(tahunIni());
  const [bulan, setBulan] = useState('');
  const [dari, sampai] = rentang(tahun, bulan);
  const arus = arusKas(rekap, dari, sampai);
  const kas = akun.filter((a) => a.kas);
  const saldoKas = (p) => kas.reduce((n, a) => n + saldoPada(a, saldoAwal, rekap, p), 0);
  const kasAwal = saldoKas(periodeSebelum(dari));
  const kasAkhir = saldoKas(sampai);

  const bagian = AKTIVITAS.map((x) => {
    const baris = akun
      .filter((a) => x.kelompok.includes(a.kelompok) && arus[a.id])
      .map((a) => ({ kode: a.kode, label: a.nama, nilai: arus[a.id].m - arus[a.id].k }));
    return {
      judul: x.judul,
      baris,
      total: { label: 'Kas bersih', nilai: baris.reduce((n, b) => n + b.nilai, 0) },
    };
  });
  const bersih = bagian.reduce((n, b) => n + b.total.nilai, 0);

  const lembar = () => {
    const kepala = ['Kode', 'Uraian', 'Kas masuk', 'Kas keluar', 'Bersih'];
    const isi = [];
    AKTIVITAS.forEach((x) => {
      isi.push(['', x.judul.toUpperCase()]);
      akun
        .filter((a) => x.kelompok.includes(a.kelompok) && arus[a.id])
        .forEach((a) =>
          isi.push([a.kode, a.nama, arus[a.id].m, arus[a.id].k, arus[a.id].m - arus[a.id].k]),
        );
    });
    isi.push(
      ['', 'Kenaikan/penurunan kas', '', '', bersih],
      ['', 'Saldo kas awal', '', '', kasAwal],
      ['', 'Saldo kas akhir', '', '', kasAkhir],
    );
    kas.forEach((a) =>
      isi.push([a.kode, `Saldo akhir ${a.nama}`, '', '', saldoPada(a, saldoAwal, rekap, sampai)]),
    );
    return [
      {
        nama: `Arus Kas ${tahun}${bulan ? `-${bulan}` : ''}`,
        lebar: [8, 40, 16, 16, 16],
        baris: [kepala, ...isi],
      },
    ];
  };

  return (
    <Halaman
      judul="Arus Kas"
      sub="Uang masuk dan keluar di rekening kas & bank, menurut sumbernya. Transfer antar kas tidak dihitung."
      kembali={KEMBALI}
      aksi={
        <TombolExcel
          namaBerkas={`Arus Kas Koperasi ${tahun}${bulan ? `-${bulan}` : ''}.xlsx`}
          buatLembar={lembar}
          disabled={m1 || m2 || m3}
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
      {m1 || m2 || m3 ? (
        <p className={K.kosong}>Memuat…</p>
      ) : (
        <>
          <TabelLaporan
            bagian={bagian}
            akhir={{ label: 'Kenaikan (penurunan) kas', nilai: bersih }}
          />
          <div className={`${K.kartu} mt-4 grid gap-1`}>
            <span className={`${K.teks} flex justify-between`}>
              <span>Saldo kas & bank awal periode</span>
              <span className="tabular-nums">{rupiah(kasAwal)}</span>
            </span>
            <span className={`${K.teks} flex justify-between`}>
              <span>Saldo kas & bank akhir periode</span>
              <span className="tabular-nums">{rupiah(kasAkhir)}</span>
            </span>
            {kasAwal + bersih !== kasAkhir && (
              <span className={K.pesanGalat}>
                Tidak cocok: periksa saldo awal kas atau tanggal mulai pembukuan.
              </span>
            )}
          </div>
        </>
      )}
    </Halaman>
  );
}
