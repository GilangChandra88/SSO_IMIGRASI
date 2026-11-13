import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaClipboardCheck } from 'react-icons/fa';
import { showToast } from '@/utils/toastStore';
import { pesanGalat } from '@/utils/pesanGalat';
import Halaman from '../components/Halaman';
import Pelaku from '../components/Pelaku';
import MeterKuota from '../components/MeterKuota';
import { useTampilan } from '../hooks/useTampilan';
import { useLogDev } from '../konteks/konteks';
import { jalankanPemeriksaan, perluKunciUlang } from '../services/logDev';
import { KODE_ANOMALI } from '../data/kode';
import { K, lencanaTingkat } from '../ui/kelas';
import { angka, jamHari, relatif, waktu } from '../ui/format';

const AKAR = '/log-developer';
const HARI_MS = 86400000;

/** Kuota gratis Firebase (cache pemakaian, diambil ulang dari Google paling sering tiap 15 menit). */
function KuotaFirebase({ f, kini }) {
  if (!f) {
    // Function di server belum membawa data kuota (versi lama)
    return (
      <section className={K.kartu}>
        <h2 className={`${K.judulSeksi} mb-2`}>Kuota gratis Firebase</h2>
        <p className={`${K.kotakInfo} ${K.teks}`}>
          Server belum mengirim data kuota karena Function di server masih versi lama. Deploy ulang
          Functions (<code>firebase deploy --only functions</code>), atau bila memakai Emulator,
          matikan lalu jalankan ulang <code>npm run emulator</code>.
        </p>
      </section>
    );
  }
  const d = f.data;
  const t = f.tarif;
  return (
    <section className={K.kartu}>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h2 className={K.judulSeksi}>Kuota gratis Firebase</h2>
          <p className={K.redup}>
            {d
              ? `Firestore hari ini, reset ${jamHari(d.hariKuota.mulai + HARI_MS)} WITA · Function bulan ${d.bulan.bulan} · diambil ${relatif(f.diambilPada, kini)}`
              : 'Belum ada data pemakaian.'}
          </p>
        </div>
        <Link to={`${AKAR}/firebase`} className={K.tombolKecil}>
          Rincian & perkiraan biaya
        </Link>
      </div>
      {f.galat && (
        <p className={`${K.kotakInfo} ${K.teks} mb-3`}>
          {f.galat === 'IZIN'
            ? 'Izin membaca pemakaian belum diberikan ke akun layanan Function. Perintahnya ada di halaman Pemakaian Firebase.'
            : f.pesan}
        </p>
      )}
      {d && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MeterKuota label="Baca dokumen" pakai={d.hariKuota.baca} batas={t.gratisBacaHari} />
          <MeterKuota label="Tulis dokumen" pakai={d.hariKuota.tulis} batas={t.gratisTulisHari} />
          <MeterKuota label="Hapus dokumen" pakai={d.hariKuota.hapus} batas={t.gratisHapusHari} />
          <MeterKuota
            label="Panggilan Function"
            pakai={d.bulan.panggilan}
            batas={t.gratisPanggilanBulan}
            ket="bulan ini"
          />
        </div>
      )}
    </section>
  );
}

function Stat({ label, nilai, ket, ke }) {
  return (
    <Link to={ke} className={`${K.kartu} block`}>
      <p className={K.redup}>{label}</p>
      <p className={`${K.angkaBesar} mt-2`}>{nilai}</p>
      {ket && <p className={`${K.redup} mt-1.5`}>{ket}</p>}
    </Link>
  );
}

/** Batang panggilan Function per jam hari ini (SVG, tinggi lewat atribut). */
function GrafikJam({ jam }) {
  const nilai = Array.from({ length: 24 }, (_, i) => jam?.[String(i).padStart(2, '0')] || 0);
  const maks = Math.max(1, ...nilai);
  return (
    <svg
      viewBox="0 0 240 64"
      className="w-full h-20"
      role="img"
      aria-label="Panggilan Function per jam hari ini"
    >
      {nilai.map((n, i) => (
        <rect
          key={i}
          x={i * 10 + 1}
          width={8}
          y={60 - (n / maks) * 56}
          height={Math.max(n ? 2 : 0.5, (n / maks) * 56)}
          rx={1.5}
          className="fill-[#2A78D6] dark:fill-[#7DB6F3]"
        >
          <title>{`${String(i).padStart(2, '0')}.00 · ${angka(n)} panggilan`}</title>
        </rect>
      ))}
    </svg>
  );
}

export default function Ringkasan() {
  const { kunci } = useLogDev();
  const { data, memuat, segarkan } = useTampilan('ringkasan', {}, { otomatisMs: 60000 });
  const [memeriksa, setMemeriksa] = useState(false);
  const kini = data?.server || Date.now();
  const hariIni = data?.metrik?.find((m) => m.id === data.hariIni);
  const fn = Object.values(hariIni?.fn || {});
  const panggil = fn.reduce((n, f) => n + (f.panggil || 0), 0);
  const gagal = fn.reduce((n, f) => n + (f.galat || 0), 0);
  const an = data?.anomaliBaru;

  const periksa = async () => {
    setMemeriksa(true);
    try {
      const r = await jalankanPemeriksaan({});
      showToast(
        r.segelRusak.length
          ? `Segel rusak: ${r.segelRusak.join(', ')}`
          : `Pemeriksaan selesai · buku Koperasi ${r.bukuKoperasi}`,
        r.segelRusak.length ? 'error' : 'sukses',
      );
      segarkan();
    } catch (err) {
      if (perluKunciUlang(err)) kunci('Ketik ulang kata sandi untuk melanjutkan.');
      else showToast(pesanGalat(err, 'Pemeriksaan gagal.'), 'error');
    } finally {
      setMemeriksa(false);
    }
  };

  const periksaTerakhir = data?.pemeriksaanTerakhir;
  return (
    <Halaman
      judul="Ringkasan Sistem"
      sub="Diperbarui otomatis tiap 60 detik. Semua waktu WITA."
      onSegarkan={segarkan}
      memuat={memuat}
    >
      {!data ? (
        <p className={K.kosong}>Memuat…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className={K.grid4}>
            <Stat
              label="Online sekarang"
              nilai={angka(data.online.length)}
              ket="aktif ≤ 5 menit"
              ke={`${AKAR}/pengguna`}
            />
            <Stat
              label="Anomali baru"
              nilai={angka(an.jumlah)}
              ket={`${an.kritis} kritis · ${an.peringatan} peringatan · ${an.info} info`}
              ke={`${AKAR}/anomali`}
            />
            <Stat
              label="Galat belum ditangani"
              nilai={angka(data.galatBaru)}
              ke={`${AKAR}/galat`}
            />
            <Stat
              label="Aksi hari ini"
              nilai={angka(panggil)}
              ket={`${angka(gagal)} galat server`}
              ke={`${AKAR}/fungsi`}
            />
          </div>

          <KuotaFirebase f={data.firebase} kini={kini} />

          <div className="grid gap-4 lg:grid-cols-2">
            <section className={K.kartu}>
              <h2 className={`${K.judulSeksi} mb-2`}>Pengguna online</h2>
              {!data.online.length ? (
                <p className={K.redup}>Tidak ada pengguna aktif.</p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {data.online.slice(0, 8).map((s) => (
                    <li key={s.id} className="flex items-start gap-2.5">
                      <span className={`${K.titikOnline} mt-1.5 shrink-0`} />
                      <span className="flex-1 min-w-0">
                        <Pelaku
                          uid={s.uid}
                          email={s.email}
                          ip={s.ip}
                          alat={s.perangkat}
                          nama={data.nama}
                        />
                        <span className={`${K.mono} block`}>{s.halaman}</span>
                      </span>
                      <span className={`${K.redup} shrink-0`}>
                        {relatif(s.terakhirAktif, kini)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={K.kartu}>
              <h2 className={`${K.judulSeksi} mb-2`}>Anomali terbaru</h2>
              {!an.terbaru.length ? (
                <p className={K.redup}>Tidak ada anomali baru.</p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {an.terbaru.map((a) => (
                    <li key={a.id} className="flex items-start gap-2.5">
                      <span className={lencanaTingkat(a.tingkat)}>{a.kode}</span>
                      <span className="flex-1 min-w-0">
                        <span className={`${K.judulBaris} block`}>{a.judul}</span>
                        <span className={K.redup}>
                          {KODE_ANOMALI[a.kode] || a.kode}
                          {a.jumlah > 1 ? ` · ${angka(a.jumlah)}×` : ''} ·{' '}
                          {relatif(a.terakhirPada, kini)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link to={`${AKAR}/anomali`} className={`${K.tombolKecil} mt-3`}>
                Lihat semua anomali
              </Link>
            </section>

            <section className={K.kartu}>
              <h2 className={`${K.judulSeksi} mb-1`}>Aksi per jam hari ini</h2>
              <p className={K.redup}>Panggilan Function 00.00–23.00 WITA</p>
              <GrafikJam jam={hariIni?.jam} />
            </section>

            <section className={K.kartu}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h2 className={K.judulSeksi}>Pemeriksaan & segel</h2>
                <button
                  type="button"
                  className={K.tombolKecil}
                  onClick={periksa}
                  disabled={memeriksa}
                >
                  <FaClipboardCheck size={11} /> {memeriksa ? 'Memeriksa…' : 'Periksa sekarang'}
                </button>
              </div>
              <p className={K.teks}>
                Pemeriksaan otomatis tiap 05.00 WITA: menyegel log kemarin (hash berantai),
                memverifikasi segel 7 hari, memeriksa keseimbangan buku Koperasi, dan menghitung
                lonjakan galat.
              </p>
              <dl className={`${K.kv} mt-3`}>
                <dt className={K.kvKunci}>Terakhir</dt>
                <dd className={K.kvNilai}>
                  {periksaTerakhir ? `${waktu(periksaTerakhir.pada)}` : 'Belum pernah'}
                </dd>
                {periksaTerakhir?.ringkas && (
                  <>
                    <dt className={K.kvKunci}>Buku Koperasi</dt>
                    <dd className={K.kvNilai}>{periksaTerakhir.ringkas.bukuKoperasi}</dd>
                    <dt className={K.kvKunci}>Segel rusak</dt>
                    <dd className={K.kvNilai}>
                      {periksaTerakhir.ringkas.segelRusak?.length
                        ? periksaTerakhir.ringkas.segelRusak.join(', ')
                        : 'Tidak ada'}
                    </dd>
                  </>
                )}
                <dt className={K.kvKunci}>Segel terakhir</dt>
                <dd className={K.kvNilai}>
                  {data.segelTerakhir
                    ? `${data.segelTerakhir.tanggal} · ${angka(data.segelTerakhir.jumlah)} catatan`
                    : 'Belum ada'}
                </dd>
              </dl>
            </section>
          </div>
        </div>
      )}
    </Halaman>
  );
}
