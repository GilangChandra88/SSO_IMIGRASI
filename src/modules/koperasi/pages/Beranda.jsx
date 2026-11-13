import { Link } from 'react-router-dom';
import { tahunIni } from '@/utils/nilai';
import { K } from '../ui/kelas';
import { rupiah } from '../ui/format';
import { statusWajib, useAnggota, usePengaturan } from '../hooks/useAnggota';
import { useKasBank } from '../hooks/useKasBank';
import { useRekap } from '../hooks/useRekap';
import { labaRugi } from '../utils/laporan';
import Halaman from '../components/Halaman';

function Angka({ label, nilai, ke, keterangan }) {
  return (
    <Link to={ke} className={`${K.kartu} ${K.tautan} flex flex-col gap-1`}>
      <span className={K.redup}>{label}</span>
      <span className={`${K.nominal} text-lg`}>{nilai}</span>
      {keterangan && <span className={K.redup}>{keterangan}</span>}
    </Link>
  );
}

/** Ringkasan koperasi (seperti DASHBOARD di buku koperasi). */
export default function Beranda() {
  const { semua, aktif, memuat: m1 } = useAnggota();
  const { pengaturan } = usePengaturan();
  const { kas, akun, memuat: m2 } = useKasBank();
  const { rekap, memuat: m3 } = useRekap();
  const tahun = tahunIni();

  const menunggak = aktif.filter(
    (a) => (statusWajib(a, pengaturan.nominalWajib)?.selisih ?? 0) < 0,
  ).length;
  const simpanan = semua.reduce((n, a) => n + a.saldoPokok + a.saldoWajib, 0);
  const bon = semua.reduce((n, a) => n + a.piutang, 0);
  const totalKas = kas.reduce((n, k) => n + k.saldo, 0);
  const shu = labaRugi(akun, rekap, `${tahun}-01`, `${tahun}-12`).shu;

  return (
    <Halaman judul="Koperasi" sub="Koperasi pegawai Kantor Imigrasi Kelas II TPI Buleleng.">
      {m1 || m2 || m3 ? (
        <p className={K.kosong}>Memuat…</p>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
          <Angka
            label="Anggota aktif"
            nilai={aktif.length}
            ke="/koperasi/anggota/daftar"
            keterangan={menunggak ? `${menunggak} menunggak` : 'Tidak ada tunggakan'}
          />
          <Angka label="Saldo simpanan" nilai={rupiah(simpanan)} ke="/koperasi/anggota/daftar" />
          <Angka label="Kas & bank" nilai={rupiah(totalKas)} ke="/koperasi/pembukuan/kas" />
          <Angka
            label={`SHU tahun ${tahun}`}
            nilai={rupiah(shu)}
            ke="/koperasi/laporan/laba-rugi"
            keterangan="Tahun berjalan"
          />
          <Angka label="Bon anggota" nilai={rupiah(bon)} ke="/koperasi/unit-usaha/kantin/bon" />
          <Angka
            label="Laporan"
            nilai="Neraca"
            ke="/koperasi/laporan/neraca"
            keterangan="Cek keseimbangan"
          />
        </div>
      )}
    </Halaman>
  );
}
