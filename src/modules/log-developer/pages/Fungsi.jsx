import { useMemo, useState } from 'react';
import Halaman from '../components/Halaman';
import Saring from '../components/Saring';
import { TabelKV } from '../components/TabelRincian';
import { useTampilan } from '../hooks/useTampilan';
import { K } from '../ui/kelas';
import { angka } from '../ui/format';

const KOLOM = 'md:grid-cols-[minmax(0,1.6fr)_repeat(5,minmax(0,0.7fr))]';
const RENTANG = [
  { id: '1', label: 'Hari ini' },
  { id: '7', label: '7 hari' },
  { id: '30', label: '30 hari' },
];

/** Kinerja tiap Function (panggilan, penolakan, galat, rata-rata durasi) + potret sistem harian. */
export default function Fungsi() {
  const [hari, setHari] = useState('7');
  const { daftar, memuat, segarkan } = useTampilan('fungsi', { hari });

  const perFungsi = useMemo(() => {
    const peta = {};
    daftar.forEach((d) =>
      Object.entries(d.fn || {}).forEach(([nama, m]) => {
        const x = (peta[nama] ||= {
          nama,
          panggil: 0,
          ok: 0,
          tolak: 0,
          ditolak: 0,
          galat: 0,
          totalMs: 0,
        });
        ['panggil', 'ok', 'tolak', 'ditolak', 'galat', 'totalMs'].forEach((k) => {
          x[k] += m[k] || 0;
        });
      }),
    );
    return Object.values(peta).sort((a, b) => b.panggil - a.panggil);
  }, [daftar]);
  const potret = daftar.find((d) => d.potret)?.potret;

  return (
    <Halaman
      judul="Function & Sistem"
      sub="Kesehatan server: berapa kali tiap aksi dipanggil, berapa yang ditolak atau bergalat, dan lamanya."
      onSegarkan={segarkan}
      memuat={memuat}
    >
      <Saring label="Rentang" pilihan={RENTANG} nilai={hari} onUbah={setHari} />
      <div className={`${K.kartuDaftar} mb-4`}>
        <div className={`${K.kepalaTabel} ${KOLOM}`}>
          <span>Function</span>
          <span>Panggilan</span>
          <span>Berhasil</span>
          <span>Ditolak</span>
          <span>Galat</span>
          <span>Rata-rata</span>
        </div>
        {perFungsi.map((f) => (
          <div key={f.nama} className={`${K.barisDiam} ${KOLOM}`}>
            <span className={`${K.mono} font-bold`}>{f.nama}</span>
            <span className={K.teks}>
              <span className="md:hidden">Panggilan </span>
              {angka(f.panggil)}
            </span>
            <span className={K.teks}>
              <span className="md:hidden">Berhasil </span>
              {angka(f.ok)}
            </span>
            <span className={f.ditolak ? K.lencanaPeringatan : K.teks}>
              <span className="md:hidden">Ditolak </span>
              {angka(f.tolak + f.ditolak)}
            </span>
            <span className={f.galat ? K.lencanaBahaya : K.teks}>
              <span className="md:hidden">Galat </span>
              {angka(f.galat)}
            </span>
            <span className={K.teks}>
              {angka(Math.round(f.totalMs / Math.max(1, f.panggil)))} ms
            </span>
          </div>
        ))}
        {!perFungsi.length && (
          <p className={K.kosong}>{memuat ? 'Memuat…' : 'Belum ada panggilan.'}</p>
        )}
      </div>

      <section className={K.kartu}>
        <h2 className={`${K.judulSeksi} mb-1`}>Potret sistem</h2>
        <p className={`${K.redup} mb-3`}>
          Diambil saat pemeriksaan harian (05.00 WITA) atau tombol Periksa sekarang.
        </p>
        {potret ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className={K.label}>Akun</p>
              <TabelKV
                isi={{
                  'Total akun': potret.akun.total,
                  'Akun aktif': potret.akun.aktif,
                  ...Object.fromEntries(
                    Object.entries(potret.akun.perPeran || {}).map(([k, v]) => [`Peran ${k}`, v]),
                  ),
                }}
              />
            </div>
            <div>
              <p className={K.label}>Jumlah dokumen</p>
              <TabelKV isi={potret.koleksi} />
            </div>
          </div>
        ) : (
          <p className={K.redup}>Belum ada potret dalam rentang ini.</p>
        )}
      </section>
    </Halaman>
  );
}
