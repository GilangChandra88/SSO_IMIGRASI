import { useState } from 'react';
import { tahunIni } from '@/utils/nilai';
import { K } from '../../ui/kelas';
import { rupiah } from '../../ui/format';
import { useAnggota, usePengaturan } from '../../hooks/useAnggota';
import { useBaganAkun } from '../../hooks/useBaganAkun';
import { useBukuBesar } from '../../hooks/useBukuBesar';
import { useRekap, useRekapAnggota } from '../../hooks/useRekap';
import { labaRugi } from '../../utils/laporan';
import { alokasiShu, shuPerAnggota } from '../../utils/shu';
import Halaman from '../../components/Halaman';
import PilihPeriode from '../../components/laporan/PilihPeriode';
import TombolExcel from '../../components/laporan/TombolExcel';

const KEMBALI = { to: '/koperasi/shu', label: 'SHU' };

/** Jasa modal (menurut simpanan) dan jasa usaha (menurut belanja) untuk setiap anggota. */
export default function ShuAnggota() {
  const { akun, memuat: m1 } = useBaganAkun();
  const { rekap, memuat: m2 } = useRekap();
  const { rekap: rekapAnggota, memuat: m3 } = useRekapAnggota();
  const { semua, memuat: m4 } = useAnggota();
  const { pengaturan } = usePengaturan();
  const { saldoAwal } = useBukuBesar();
  const [tahun, setTahun] = useState(tahunIni());
  const [cari, setCari] = useState('');

  const shu = labaRugi(akun, rekap, `${tahun}-01`, `${tahun}-12`).shu;
  const alokasi = alokasiShu(shu, pengaturan.alokasiShu);
  const dana = (id) => alokasi.find((a) => a.id === id)?.nilai ?? 0;
  const hasil = shuPerAnggota(semua, rekapAnggota, tahun, dana('jasaModal'), dana('jasaUsaha'));
  const kunci = cari.trim().toLowerCase();
  const tampil = hasil.baris
    .filter(
      (b) =>
        !kunci ||
        b.anggota.nama.toLowerCase().includes(kunci) ||
        b.anggota.nomor.toLowerCase().includes(kunci),
    )
    .sort((a, b) => b.total - a.total);
  const memuat = m1 || m2 || m3 || m4;

  const lembar = () => [
    {
      nama: `SHU Anggota ${tahun}`,
      lebar: [10, 36, 18, 18, 16, 16, 16],
      baris: [
        ['Nomor', 'Nama', 'Simpanan 31 Des', 'Belanja', 'Jasa modal', 'Jasa usaha', 'Total SHU'],
        ...hasil.baris.map((b) => [
          b.anggota.nomor,
          b.anggota.nama,
          b.simpanan,
          b.belanja,
          b.jasaModal,
          b.jasaUsaha,
          b.total,
        ]),
        [
          '',
          'TOTAL',
          hasil.totalSimpanan,
          hasil.totalBelanja,
          dana('jasaModal'),
          dana('jasaUsaha'),
          dana('jasaModal') + dana('jasaUsaha'),
        ],
      ],
    },
  ];

  return (
    <Halaman
      judul="SHU per Anggota"
      sub="Jasa modal menurut saldo simpanan per 31 Desember; jasa usaha menurut belanja di Kasir."
      kembali={KEMBALI}
      aksi={
        <TombolExcel
          namaBerkas={`SHU Anggota ${tahun}.xlsx`}
          buatLembar={lembar}
          disabled={memuat}
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
      {memuat ? (
        <p className={K.kosong}>Memuat…</p>
      ) : shu <= 0 ? (
        <p className={K.kosong}>SHU tahun {tahun} tidak positif, jadi tidak ada yang dibagikan.</p>
      ) : (
        <>
          <div className={`${K.kartu} mb-3 grid gap-1`}>
            <span className={`${K.teks} flex justify-between gap-3`}>
              <span>Dana jasa modal</span>
              <span className="tabular-nums">{rupiah(dana('jasaModal'))}</span>
            </span>
            <span className={`${K.teks} flex justify-between gap-3`}>
              <span>Dana jasa usaha</span>
              <span className="tabular-nums">{rupiah(dana('jasaUsaha'))}</span>
            </span>
            {!hasil.totalBelanja && (
              <span className={K.redup}>
                Belum ada belanja anggota tercatat, jadi jasa usaha belum terbagi.
              </span>
            )}
          </div>
          <input
            type="search"
            className={`${K.masukan} mb-3`}
            placeholder="Cari nama atau nomor…"
            aria-label="Cari anggota"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
          />
          <ul className={K.kartuDaftar}>
            {tampil.map((b) => (
              <li
                key={b.anggota.id}
                className={`${K.barisDaftar} px-4 py-2.5 flex justify-between gap-3`}
              >
                <span className="min-w-0">
                  <span className={`${K.judulBaris} block truncate`}>{b.anggota.nama}</span>
                  <span className={`${K.redup} block`}>
                    {b.anggota.nomor} · simpanan {rupiah(b.simpanan)} · belanja {rupiah(b.belanja)}
                  </span>
                  <span className={`${K.redup} block`}>
                    Jasa modal {rupiah(b.jasaModal)} · jasa usaha {rupiah(b.jasaUsaha)}
                  </span>
                </span>
                <span className={K.nominal}>{rupiah(b.total)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Halaman>
  );
}
