import { useState } from 'react';
import { Link } from 'react-router-dom';
import { tahunIni } from '@/utils/nilai';
import { K } from '../../ui/kelas';
import { rupiah } from '../../ui/format';
import { usePengaturan } from '../../hooks/useAnggota';
import { useBaganAkun } from '../../hooks/useBaganAkun';
import { useBukuBesar } from '../../hooks/useBukuBesar';
import { useRekap } from '../../hooks/useRekap';
import { labaRugi } from '../../utils/laporan';
import { alokasiShu } from '../../utils/shu';
import Halaman from '../../components/Halaman';
import PilihPeriode from '../../components/laporan/PilihPeriode';
import TombolExcel from '../../components/laporan/TombolExcel';

const KEMBALI = { to: '/koperasi/shu', label: 'SHU' };

/** Pembagian SHU satu tahun buku menurut persentase yang berlaku. */
export default function AlokasiShu() {
  const { akun, memuat: m1 } = useBaganAkun();
  const { rekap, memuat: m2 } = useRekap();
  const { saldoAwal } = useBukuBesar();
  const { pengaturan } = usePengaturan();
  const [tahun, setTahun] = useState(tahunIni());
  const shu = labaRugi(akun, rekap, `${tahun}-01`, `${tahun}-12`).shu;
  const alokasi = alokasiShu(shu, pengaturan.alokasiShu);
  const berjalan = tahun === tahunIni();

  const lembar = () => [
    {
      nama: `Alokasi SHU ${tahun}`,
      lebar: [36, 12, 18],
      baris: [
        ['Bagian', 'Persentase', 'Nilai'],
        ...alokasi.map((a) => [a.label, a.persen / 100, a.nilai]),
        ['TOTAL', 1, alokasi.reduce((n, a) => n + a.nilai, 0)],
        ['SHU tahun ini', '', shu],
      ],
    },
  ];

  return (
    <Halaman
      judul="Alokasi SHU"
      sub="SHU dibagikan per tahun; angka final disahkan RAT."
      kembali={KEMBALI}
      aksi={
        <TombolExcel
          namaBerkas={`Alokasi SHU ${tahun}.xlsx`}
          buatLembar={lembar}
          disabled={m1 || m2}
        />
      }
    >
      <PilihPeriode
        tahun={tahun}
        bulan=""
        onTahun={setTahun}
        onBulan={() => {}}
        hanyaTahun
        tahunAwal={Number(saldoAwal?.tanggalMulai?.slice(0, 4))}
      />
      {m1 || m2 ? (
        <p className={K.kosong}>Memuat…</p>
      ) : (
        <>
          <div className={`${K.kartu} mb-4 flex justify-between gap-3`}>
            <span>
              <span className={`${K.judulSeksi} block`}>SHU tahun {tahun}</span>
              {berjalan && (
                <span className={K.redup}>Tahun berjalan: angka masih bisa berubah.</span>
              )}
            </span>
            <span className={`${K.nominal} text-base`}>{rupiah(shu)}</span>
          </div>
          {shu <= 0 ? (
            <p className={K.kosong}>SHU tidak positif, jadi tidak ada yang dibagikan.</p>
          ) : (
            <ul className={K.kartuDaftar}>
              {alokasi.map((a) => (
                <li
                  key={a.id}
                  className={`${K.barisDaftar} px-4 py-2.5 flex justify-between gap-3`}
                >
                  <span className={K.teks}>
                    {a.label} <span className={K.redup}>({a.persen}%)</span>
                  </span>
                  <span className={K.nominal}>{rupiah(a.nilai)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className={`${K.redup} mt-3`}>
            Persentase diatur di{' '}
            <Link to="/koperasi/shu/pengaturan" className="underline">
              Persentase SHU
            </Link>
            . Pembagian ke setiap anggota ada di SHU per Anggota.
          </p>
        </>
      )}
    </Halaman>
  );
}
