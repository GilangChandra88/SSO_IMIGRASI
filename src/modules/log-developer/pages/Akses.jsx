import { useState } from 'react';
import Halaman from '../components/Halaman';
import Pelaku from '../components/Pelaku';
import Saring from '../components/Saring';
import DaftarKosong from '../components/DaftarKosong';
import { useTampilan } from '../hooks/useTampilan';
import { K } from '../ui/kelas';
import { angka, waktu } from '../ui/format';

const TAB = [
  { id: 'akses', label: 'Akses Log Developer' },
  { id: 'segel', label: 'Segel harian' },
];
const AKSI = {
  buka: 'Membuka Log Developer',
  lihat: 'Melihat',
  tinjauAnomali: 'Meninjau anomali',
  tinjauGalat: 'Meninjau galat',
  aturAmbang: 'Mengubah ambang',
};

function DaftarAkses() {
  const { daftar, nama, memuat, habis, muatLagi } = useTampilan('akses');
  return (
    <div className={K.kartuDaftar}>
      {daftar.map((l) => (
        <div
          key={l.id}
          className={`${K.barisDiam} md:grid-cols-[170px_minmax(0,1fr)_minmax(0,1.4fr)]`}
        >
          <span className={K.redup}>{waktu(l.terakhirPada || l.pada)}</span>
          <Pelaku
            uid={l.oleh}
            ip={l.pelaku?.ip || l.nilaiBaru?.ip}
            alat={l.pelaku?.perangkat || l.nilaiBaru?.perangkat}
            nama={nama}
          />
          <span className={K.teks}>
            {AKSI[l.aksi] || l.aksi}
            {l.aksi === 'lihat' ? ` ${l.target}` : ''}
            {l.jumlah > 1 ? ` · ${angka(l.jumlah)}× dalam jam itu` : ''}
            {l.alasan ? ` · ${l.alasan}` : ''}
          </span>
        </div>
      ))}
      <DaftarKosong memuat={memuat} jumlah={daftar.length} habis={habis} onMuatLagi={muatLagi} />
    </div>
  );
}

function DaftarSegel() {
  const { daftar, memuat } = useTampilan('segel');
  return (
    <div className={K.kartuDaftar}>
      {daftar.map((s) => (
        <div key={s.id} className={`${K.barisDiam} md:grid-cols-[120px_120px_minmax(0,1fr)]`}>
          <span className={K.judulBaris}>{s.tanggal}</span>
          <span className={K.teks}>{angka(s.jumlah)} catatan</span>
          <span className={K.mono}>{s.hash}</span>
        </div>
      ))}
      <DaftarKosong memuat={memuat} jumlah={daftar.length} habis pesan="Belum ada segel." />
    </div>
  );
}

/** Siapa saja yang membuka/membaca Log Developer (tidak bisa dihapus) dan segel log harian. */
export default function Akses() {
  const [tab, setTab] = useState('akses');
  return (
    <Halaman
      judul="Akses & Segel"
      sub="Pengawas pun diawasi: setiap pembukaan dan bacaan modul ini tercatat permanen. Segel harian membuktikan log tidak diubah."
    >
      <Saring label="Tampilan" pilihan={TAB} nilai={tab} onUbah={setTab} />
      <div key={tab}>{tab === 'akses' ? <DaftarAkses /> : <DaftarSegel />}</div>
    </Halaman>
  );
}
