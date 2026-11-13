import { useState } from 'react';
import { tanggalIso, tahunIni } from '@/utils/nilai';
import { K } from '../../ui/kelas';
import { namaPeriode, rupiah } from '../../ui/format';
import { adalahKontra, KELOMPOK_AKUN } from '../../data/baganAkun';
import { useBaganAkun } from '../../hooks/useBaganAkun';
import { useBukuBesar } from '../../hooks/useBukuBesar';
import { useRekap } from '../../hooks/useRekap';
import { labaRugi, saldoPada } from '../../utils/laporan';
import Halaman from '../../components/Halaman';
import PilihPeriode from '../../components/laporan/PilihPeriode';
import TabelLaporan from '../../components/laporan/TabelLaporan';
import TombolExcel from '../../components/laporan/TombolExcel';

const KEMBALI = { to: '/koperasi/laporan', label: 'Laporan' };
const ASET = ['asetLancar', 'asetTetap'];
const PASIVA = ['kewajibanLancar', 'kewajibanPanjang', 'ekuitas'];
const label = (id) => KELOMPOK_AKUN.find((k) => k.id === id).label;

/** Neraca per akhir bulan: saldo awal + jurnal sampai bulan itu, plus SHU yang belum dibagi. */
export default function LaporanNeraca() {
  const { akun, memuat: m1 } = useBaganAkun();
  const { rekap, memuat: m2 } = useRekap();
  const { saldoAwal, memuat: m3 } = useBukuBesar();
  const [tahun, setTahun] = useState(tahunIni());
  const [bulan, setBulan] = useState(tanggalIso().slice(5, 7));
  const sampai = `${tahun}-${bulan}`;

  const saldo = (a) => {
    const n = saldoPada(a, saldoAwal, rekap, sampai);
    return adalahKontra(a.id) ? -n : n;
  };
  const kelompok = (id) => {
    const baris = akun
      .filter((a) => a.kelompok === id)
      .map((a) => ({ kode: a.kode, label: a.nama, nilai: saldo(a) }));
    return {
      judul: label(id),
      baris,
      total: {
        label: `Total ${label(id).toLowerCase()}`,
        nilai: baris.reduce((n, b) => n + b.nilai, 0),
      },
    };
  };
  // SHU dari transaksi yang belum ditutup ke akun ekuitas
  const shuTahunIni = labaRugi(akun, rekap, `${tahun}-01`, sampai).shu;
  const shuLalu = labaRugi(akun, rekap, '0000-00', `${tahun - 1}-12`).shu;
  const aset = ASET.map(kelompok);
  const pasiva = PASIVA.map(kelompok);
  const ekuitas = pasiva[2];
  ekuitas.baris = [
    ...ekuitas.baris,
    ...(shuLalu ? [{ label: 'SHU tahun lalu yang belum dibagi', nilai: shuLalu }] : []),
    { label: `SHU tahun ${tahun} s.d. ${namaPeriode(sampai)}`, nilai: shuTahunIni },
  ];
  ekuitas.total.nilai += shuLalu + shuTahunIni;
  const totalAset = aset.reduce((n, k) => n + k.total.nilai, 0);
  const totalPasiva = pasiva.reduce((n, k) => n + k.total.nilai, 0);
  const selisih = totalAset - totalPasiva;
  const sebelumMulai = saldoAwal?.tanggalMulai && sampai < saldoAwal.tanggalMulai.slice(0, 7);

  const lembar = () => {
    const kepala = ['Kode', 'Akun', `Per akhir ${namaPeriode(sampai)}`];
    const isi = [];
    [...aset, ...pasiva].forEach((k) => {
      isi.push(['', k.judul.toUpperCase()]);
      k.baris.forEach((b) => b.nilai && isi.push([b.kode || '', b.label, b.nilai]));
      isi.push(['', k.total.label, k.total.nilai]);
    });
    isi.push(['', 'TOTAL ASET', totalAset], ['', 'TOTAL KEWAJIBAN DAN EKUITAS', totalPasiva]);
    return [{ nama: `Neraca ${sampai}`, lebar: [8, 46, 20], baris: [kepala, ...isi] }];
  };

  return (
    <Halaman
      judul="Neraca"
      sub={`Per akhir ${namaPeriode(sampai)}.`}
      kembali={KEMBALI}
      aksi={
        <TombolExcel
          namaBerkas={`Neraca Koperasi ${sampai}.xlsx`}
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
        setahun={false}
        tahunAwal={Number(saldoAwal?.tanggalMulai?.slice(0, 4))}
      />
      {m1 || m2 || m3 ? (
        <p className={K.kosong}>Memuat…</p>
      ) : !saldoAwal ? (
        <p className={K.kosong}>Isi Saldo Awal di menu Pembukuan lebih dulu.</p>
      ) : sebelumMulai ? (
        <p className={K.kosong}>Periode ini sebelum mulai pembukuan.</p>
      ) : (
        <>
          <div className={`${K.kartu} mb-4 flex flex-wrap justify-between gap-2`}>
            <span className={K.judulBaris}>
              {selisih === 0 ? 'Seimbang' : `Tidak seimbang: selisih ${rupiah(selisih)}`}
            </span>
            <span className={K.redup}>
              Aset {rupiah(totalAset)} · Kewajiban + Ekuitas {rupiah(totalPasiva)}
            </span>
          </div>
          <h2 className={`${K.judulSeksi} mb-2`}>Aset</h2>
          <TabelLaporan bagian={aset} akhir={{ label: 'Total aset', nilai: totalAset }} />
          <h2 className={`${K.judulSeksi} mt-6 mb-2`}>Kewajiban dan Ekuitas</h2>
          <TabelLaporan
            bagian={pasiva}
            akhir={{ label: 'Total kewajiban dan ekuitas', nilai: totalPasiva }}
          />
        </>
      )}
    </Halaman>
  );
}
