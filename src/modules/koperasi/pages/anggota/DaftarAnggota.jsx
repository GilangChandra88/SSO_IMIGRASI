import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaChevronRight, FaPlus } from 'react-icons/fa';
import { K } from '../../ui/kelas';
import { rupiah } from '../../ui/format';
import { statusWajib, useAnggota, usePengaturan } from '../../hooks/useAnggota';
import Halaman from '../../components/Halaman';
import TabHalaman from '../../components/TabHalaman';
import FormAnggota from '../../components/anggota/FormAnggota';
import StatusAnggota from '../../components/anggota/StatusAnggota';

const SARING = [
  { id: 'aktif', label: 'Aktif' },
  { id: 'calon', label: 'Calon' },
  { id: 'tunggak', label: 'Menunggak' },
  { id: 'keluar', label: 'Keluar' },
];
const KEMBALI = { to: '/koperasi/anggota', label: 'Anggota & Simpanan' };

export default function DaftarAnggota() {
  const { semua, memuat } = useAnggota();
  const { pengaturan } = usePengaturan();
  const [saring, setSaring] = useState('aktif');
  const [cari, setCari] = useState('');
  const [tambah, setTambah] = useState(false);

  const tunggak = (a) => (statusWajib(a, pengaturan.nominalWajib)?.selisih ?? 0) < 0;
  const kunci = cari.trim().toLowerCase();
  const tampil = semua.filter(
    (a) =>
      (saring === 'tunggak' ? a.status === 'aktif' && tunggak(a) : a.status === saring) &&
      (!kunci || a.nama.toLowerCase().includes(kunci) || a.nomor.toLowerCase().includes(kunci)),
  );
  const totalSimpanan = semua.reduce((n, a) => n + a.saldoPokok + a.saldoWajib, 0);

  let isi;
  if (memuat) isi = <p className={K.kosong}>Memuat…</p>;
  else if (!tampil.length) isi = <p className={K.kosong}>Tidak ada anggota di sini.</p>;
  else {
    isi = (
      <ul className="flex flex-col gap-2.5">
        {tampil.map((a) => (
          <li key={a.id}>
            <Link
              to={`/koperasi/anggota/daftar/${a.id}`}
              className={`${K.kartu} ${K.tautan} flex items-center gap-3`}
            >
              <span className="flex-1 min-w-0">
                <span className={`${K.judulBaris} block truncate`}>{a.nama}</span>
                <span className={`${K.redup} block`}>
                  {a.nomor} · {a.jenis === 'pegawai' ? 'Pegawai' : 'Anggota luar'}
                  {a.piutang > 0 ? ` · bon ${rupiah(a.piutang)}` : ''}
                </span>
                <StatusAnggota a={a} nominalWajib={pengaturan.nominalWajib} />
              </span>
              <span className={K.nominal}>{rupiah(a.saldoPokok + a.saldoWajib)}</span>
              <FaChevronRight size={12} className={K.redup} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Halaman
      judul="Daftar Anggota"
      sub={`${semua.filter((a) => a.status === 'aktif').length} anggota aktif · total simpanan ${rupiah(totalSimpanan)}`}
      kembali={KEMBALI}
    >
      <button type="button" className={`${K.tombolUtama} mb-3`} onClick={() => setTambah(true)}>
        <FaPlus size={12} /> Tambah Anggota
      </button>
      <input
        type="search"
        className={`${K.masukan} mb-3`}
        placeholder="Cari nama atau nomor…"
        aria-label="Cari anggota"
        value={cari}
        onChange={(e) => setCari(e.target.value)}
      />
      <TabHalaman daftar={SARING} aktif={saring} onUbah={setSaring} label="Saring anggota" />
      {isi}
      {tambah && <FormAnggota semua={semua} onTutup={() => setTambah(false)} />}
    </Halaman>
  );
}
