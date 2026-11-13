import { useNavigate } from 'react-router-dom';
import Halaman from '../components/Halaman';
import Pelaku from '../components/Pelaku';
import DaftarKosong from '../components/DaftarKosong';
import { useTampilan } from '../hooks/useTampilan';
import { K } from '../ui/kelas';
import { relatif, waktu } from '../ui/format';

const KOLOM = 'md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1fr)_120px]';
const LIMA_MENIT = 5 * 60000;

function statusSesi(s, kini) {
  if (s.online === false) return { kelas: K.titikMati, label: 'Keluar' };
  return kini - s.terakhirAktif <= LIMA_MENIT
    ? { kelas: K.titikOnline, label: 'Online' }
    : { kelas: K.titikDiam, label: 'Tidak aktif' };
}

/** Semua akun yang pernah membuka aplikasi: status, halaman terakhir, IP, perangkat, versi. */
export default function PenggunaAktif() {
  const navigate = useNavigate();
  const { daftar, nama, memuat, data, segarkan } = useTampilan('sesi', {}, { otomatisMs: 60000 });
  const kini = data?.server || Date.now();

  return (
    <Halaman
      judul="Pengguna"
      sub="Status login tiap akun. Ketuk baris untuk melihat riwayat aktivitasnya."
      onSegarkan={segarkan}
      memuat={memuat}
    >
      <div className={K.kartuDaftar}>
        <div className={`${K.kepalaTabel} ${KOLOM}`}>
          <span>Pengguna</span>
          <span>Halaman terakhir</span>
          <span>Mulai sesi</span>
          <span>Terakhir aktif</span>
        </div>
        {daftar.map((s) => {
          const st = statusSesi(s, kini);
          return (
            <button
              key={s.id}
              type="button"
              className={`${K.baris} ${KOLOM}`}
              onClick={() => navigate(`/log-developer/aktivitas?uid=${encodeURIComponent(s.uid)}`)}
            >
              <span className="flex items-start gap-2 min-w-0">
                <span className={`${st.kelas} mt-1.5 shrink-0`} title={st.label} />
                <Pelaku uid={s.uid} email={s.email} ip={s.ip} alat={s.perangkat} nama={nama} />
              </span>
              <span className="min-w-0">
                <span className={`${K.mono} block`}>{s.halaman || '-'}</span>
                <span className={K.redup}>
                  {(s.peran || []).join(', ') || 'pegawai'} · versi {s.versi || '-'}
                </span>
              </span>
              <span className={K.redup}>{waktu(s.mulaiPada)}</span>
              <span className={K.teks}>
                <span className="md:hidden">{st.label} · </span>
                {relatif(s.terakhirAktif, kini)}
              </span>
            </button>
          );
        })}
        <DaftarKosong memuat={memuat} jumlah={daftar.length} habis />
      </div>
    </Halaman>
  );
}
