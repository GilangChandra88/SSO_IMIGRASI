import { useSearchParams } from 'react-router-dom';
import { FaTimes } from 'react-icons/fa';
import Halaman from '../components/Halaman';
import Pelaku from '../components/Pelaku';
import Saring from '../components/Saring';
import DaftarKosong from '../components/DaftarKosong';
import { useTampilan } from '../hooks/useTampilan';
import { JENIS_AKTIVITAS, STATUS_PANGGILAN } from '../data/kode';
import { K } from '../ui/kelas';
import { angka, waktu } from '../ui/format';

const KOLOM = 'md:grid-cols-[150px_minmax(0,1.2fr)_minmax(0,1.4fr)]';
const PILIHAN = [
  { id: '', label: 'Semua' },
  ...Object.entries(JENIS_AKTIVITAS).map(([id, label]) => ({ id, label })),
];

function lencanaStatus(s) {
  if (s === 'ok') return K.lencanaBaik;
  if (s === 'galat') return K.lencanaBahaya;
  return K.lencanaPeringatan;
}

/** Riwayat aktivitas (90 hari): masuk/keluar, halaman, setiap aksi Function beserta hasilnya. */
export default function Aktivitas() {
  const [params, setParams] = useSearchParams();
  const uid = params.get('uid') || '';
  const jenis = params.get('jenis') || '';
  const { daftar, nama, memuat, habis, segarkan, muatLagi } = useTampilan(
    'aktivitas',
    uid ? { uid } : { jenis },
  );
  const ubah = (k, v) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v);
    else p.delete(k);
    setParams(p, { replace: true });
  };

  return (
    <Halaman
      judul="Aktivitas"
      sub="Siapa melakukan apa, dari IP & perangkat mana. Disimpan 90 hari."
      onSegarkan={segarkan}
      memuat={memuat}
    >
      {uid ? (
        <div className={K.bilah}>
          <span className={K.lencanaInfo}>Pengguna: {nama[uid] || daftar[0]?.email || uid}</span>
          <button type="button" className={K.tombolKecil} onClick={() => ubah('uid', '')}>
            <FaTimes size={10} /> Semua pengguna
          </button>
        </div>
      ) : (
        <Saring
          label="Jenis aktivitas"
          pilihan={PILIHAN}
          nilai={jenis}
          onUbah={(v) => ubah('jenis', v)}
        />
      )}
      <div className={K.kartuDaftar}>
        <div className={`${K.kepalaTabel} ${KOLOM}`}>
          <span>Waktu</span>
          <span>Pengguna</span>
          <span>Aktivitas</span>
        </div>
        {daftar.map((a) => (
          <div key={a.id} className={`${K.barisDiam} ${KOLOM}`}>
            <span className={K.redup}>{waktu(a.pada)}</span>
            <Pelaku uid={a.uid} email={a.email} ip={a.ip} alat={a.perangkat} nama={nama} />
            <span className="min-w-0 flex flex-wrap items-center gap-1.5">
              <span className={K.lencana}>{JENIS_AKTIVITAS[a.jenis] || a.jenis}</span>
              {a.jenis === 'panggil' ? (
                <>
                  <span className={K.mono}>{a.fn}</span>
                  <span className={lencanaStatus(a.status)}>
                    {STATUS_PANGGILAN[a.status] || a.status}
                  </span>
                  <span className={K.redup}>{angka(a.ms)} ms</span>
                </>
              ) : (
                <span className={K.mono}>{a.halaman || ''}</span>
              )}
            </span>
          </div>
        ))}
        <DaftarKosong memuat={memuat} jumlah={daftar.length} habis={habis} onMuatLagi={muatLagi} />
      </div>
    </Halaman>
  );
}
