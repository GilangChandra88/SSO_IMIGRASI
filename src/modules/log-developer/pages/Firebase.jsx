import { useState } from 'react';
import { FaCloudDownloadAlt, FaCopy } from 'react-icons/fa';
import { showToast } from '@/utils/toastStore';
import Halaman from '../components/Halaman';
import MeterKuota from '../components/MeterKuota';
import { useTampilan } from '../hooks/useTampilan';
import { K } from '../ui/kelas';
import { angka, waktu } from '../ui/format';

const GB = 2 ** 30;
const RUPIAH = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});
const dua = (n) => Math.round((n || 0) * 100) / 100;

/** Batang harian (SVG) dengan garis batas gratis. */
function Tren({ judul, nilai, batas }) {
  const maks = Math.max(1, batas || 0, ...nilai.map((n) => n.v));
  const lebar = Math.max(1, nilai.length);
  const yBatas = batas ? 60 - (batas / maks) * 56 : null;
  return (
    <div>
      <p className={`${K.judulBaris} mb-1`}>{judul}</p>
      <svg viewBox={`0 0 ${lebar * 10} 64`} className="w-full h-20" role="img" aria-label={judul}>
        {nilai.map((n, i) => (
          <rect
            key={n.t}
            x={i * 10 + 1}
            width={8}
            y={60 - (n.v / maks) * 56}
            height={Math.max(0.5, (n.v / maks) * 56)}
            rx={1.5}
            className={
              batas && n.v > batas ? 'fill-[#D03B3B]' : 'fill-[#2A78D6] dark:fill-[#7DB6F3]'
            }
          >
            <title>{`${n.t}: ${angka(n.v)}`}</title>
          </rect>
        ))}
        {yBatas !== null && (
          <line
            x1={0}
            x2={lebar * 10}
            y1={yBatas}
            y2={yBatas}
            strokeDasharray="3 3"
            className="stroke-[#C98500]"
          />
        )}
      </svg>
      <p className={K.redup}>
        {nilai[0]?.t || ''} – {nilai.at(-1)?.t || ''}
        {batas ? ` · garis = batas gratis ${angka(batas)}/hari` : ''}
      </p>
    </div>
  );
}

/** Perkiraan biaya bulan berjalan (USD → Rp) dari pemakaian di atas jatah gratis. */
function hitungBiaya(d, t) {
  const hari = [...d.tren.filter((x) => x.tanggal.startsWith(d.bulan.bulan)), d.hariKuota];
  const lebih = (k, gratis) => hari.reduce((n, x) => n + Math.max(0, (x[k] || 0) - gratis), 0);
  const baris = [
    ['Firestore baca', (lebih('baca', t.gratisBacaHari) / 1e5) * t.bacaPer100rb],
    ['Firestore tulis', (lebih('tulis', t.gratisTulisHari) / 1e5) * t.tulisPer100rb],
    ['Firestore hapus', (lebih('hapus', t.gratisHapusHari) / 1e5) * t.hapusPer100rb],
    [
      'Panggilan Function',
      (Math.max(0, d.bulan.panggilan - t.gratisPanggilanBulan) / 1e6) * t.panggilanPerJuta,
    ],
    [
      'Waktu instans Function',
      Math.max(0, d.bulan.instansDetik / 3600 - t.gratisInstansJamBulan) * t.instansPerJam,
    ],
    [
      'Simpanan Storage (sebulan penuh)',
      Math.max(0, d.storage.byte / GB - t.gratisStorageGb) * t.storagePerGbBulan,
    ],
    ['Unduhan Storage', Math.max(0, d.bulan.unduhByte / GB - t.gratisUnduhGbBulan) * t.unduhPerGb],
  ].map(([label, usd]) => ({ label, usd, rp: usd * t.kurs }));
  return { baris, totalRp: baris.reduce((n, b) => n + b.rp, 0) };
}

function SalinPerintah({ perintah }) {
  const salin = async () => {
    try {
      await navigator.clipboard.writeText(perintah);
      showToast('Perintah disalin.');
    } catch {
      showToast('Gagal menyalin; salin manual.', 'error');
    }
  };
  return (
    <div className="mt-3">
      <pre className={K.pre}>{perintah}</pre>
      <button type="button" className={`${K.tombolKecil} mt-2`} onClick={salin}>
        <FaCopy size={11} /> Salin perintah
      </button>
    </div>
  );
}

/** Pemakaian Firebase dari Cloud Monitoring: kuota gratis, tren, dan perkiraan biaya. */
export default function Firebase() {
  const [saring, setSaring] = useState({});
  const { data: h, memuat } = useTampilan('firebase', saring);
  const d = h?.data;
  const t = h?.tarif;
  const biaya = d && t ? hitungBiaya(d, t) : null;

  return (
    <Halaman
      judul="Pemakaian Firebase"
      sub="Angka dari Cloud Monitoring Google (sama dengan grafik Usage di Firebase Console). Diperbarui paling sering tiap 15 menit."
      memuat={memuat}
      aksi={
        <button
          type="button"
          className={K.tombolKedua}
          disabled={memuat}
          onClick={() => setSaring({ paksa: true, n: Date.now() })}
        >
          <FaCloudDownloadAlt size={13} /> Ambil dari Google
        </button>
      }
    >
      {!h ? (
        <p className={K.kosong}>Memuat…</p>
      ) : (
        <div className="flex flex-col gap-4">
          {h.galat && (
            <section className={K.kotakInfo}>
              <p className={K.judulBaris}>
                {h.galat === 'EMULATOR' ? 'Mode Emulator' : 'Data pemakaian belum bisa diambil'}
              </p>
              <p className={K.teks}>{h.pesan}</p>
              {h.galat === 'IZIN' && (
                <>
                  <p className={`${K.teks} mt-2`}>
                    Pemilik proyek menjalankan perintah ini sekali (izin hanya membaca angka
                    pemakaian):
                  </p>
                  <SalinPerintah perintah={h.perintah} />
                </>
              )}
              {d && <p className={`${K.redup} mt-2`}>Menampilkan data terakhir yang tersimpan.</p>}
            </section>
          )}

          {d && (
            <>
              <p className={K.redup}>
                Proyek {d.proyek} · diambil {waktu(h.diambilPada)}
              </p>
              <section className={K.kartu}>
                <h2 className={`${K.judulSeksi} mb-1`}>Kuota gratis Firestore hari ini</h2>
                <p className={`${K.redup} mb-3`}>
                  Hari kuota Google mulai {waktu(d.hariKuota.mulai)} (tengah malam waktu Pasifik).
                  Hanya database (default).
                </p>
                <div className="grid gap-4 md:grid-cols-3">
                  <MeterKuota
                    label="Baca dokumen"
                    pakai={d.hariKuota.baca}
                    batas={t.gratisBacaHari}
                  />
                  <MeterKuota
                    label="Tulis dokumen"
                    pakai={d.hariKuota.tulis}
                    batas={t.gratisTulisHari}
                  />
                  <MeterKuota
                    label="Hapus dokumen"
                    pakai={d.hariKuota.hapus}
                    batas={t.gratisHapusHari}
                  />
                </div>
              </section>

              <section className={K.kartu}>
                <h2 className={`${K.judulSeksi} mb-3`}>Bulan ini ({d.bulan.bulan})</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <MeterKuota
                    label="Panggilan Function"
                    pakai={d.bulan.panggilan}
                    batas={t.gratisPanggilanBulan}
                    ket="termasuk pemicu & jadwal"
                  />
                  <MeterKuota
                    label="Waktu instans Function"
                    pakai={Math.round(d.bulan.instansDetik / 3600)}
                    batas={t.gratisInstansJamBulan}
                    satuan=" jam"
                  />
                  <MeterKuota
                    label="Unduhan Storage"
                    pakai={dua(d.bulan.unduhByte / GB)}
                    batas={t.gratisUnduhGbBulan}
                    satuan=" GB"
                  />
                  <MeterKuota
                    label="Simpanan Storage"
                    pakai={dua(d.storage.byte / GB)}
                    batas={t.gratisStorageGb}
                    satuan=" GB"
                    ket={`${angka(d.storage.objek)} berkas`}
                  />
                </div>
              </section>

              <section className={K.kartu}>
                <h2 className={`${K.judulSeksi} mb-3`}>Tren 30 hari</h2>
                <div className="grid gap-5 md:grid-cols-3">
                  <Tren
                    judul="Baca per hari"
                    nilai={d.tren.map((x) => ({ t: x.tanggal, v: x.baca }))}
                    batas={t.gratisBacaHari}
                  />
                  <Tren
                    judul="Tulis per hari"
                    nilai={d.tren.map((x) => ({ t: x.tanggal, v: x.tulis }))}
                    batas={t.gratisTulisHari}
                  />
                  <Tren
                    judul="Panggilan Function per hari"
                    nilai={d.tren.map((x) => ({ t: x.tanggal, v: x.panggilan }))}
                  />
                </div>
              </section>

              <section className={K.kartu}>
                <h2 className={`${K.judulSeksi} mb-1`}>Perkiraan biaya bulan ini</h2>
                <p className={`${K.redup} mb-3`}>
                  Perkiraan kasar dari pemakaian di atas jatah gratis × tarif di Pengaturan (kurs Rp{' '}
                  {angka(t.kurs)}/USD). Tagihan resmi ada di Console › Billing.
                </p>
                <dl className={K.kv}>
                  {biaya.baris.map((b) => (
                    <div key={b.label} className="contents">
                      <dt className={K.kvKunci}>{b.label}</dt>
                      <dd className={K.kvNilai}>{RUPIAH.format(b.rp)}</dd>
                    </div>
                  ))}
                  <dt className={`${K.kvKunci} font-bold`}>Total perkiraan</dt>
                  <dd className={`${K.kvNilai} font-bold`}>{RUPIAH.format(biaya.totalRp)}</dd>
                </dl>
              </section>
            </>
          )}
        </div>
      )}
    </Halaman>
  );
}
