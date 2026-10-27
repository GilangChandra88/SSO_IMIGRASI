import { useEffect, useRef, useState } from 'react';
import {
  FaCamera,
  FaCheckCircle,
  FaExclamationTriangle,
  FaFingerprint,
  FaUpload,
} from 'react-icons/fa';
import { ANIM, jedaKe } from '@/utils/animasi';
import FotoWajah from './FotoWajah';
import { kilatKamera, sapuPindai } from './animasiUltah';
import {
  ambilGambar,
  bukaKamera,
  dalamBingkai,
  hentikanKamera,
  pesanGalatKamera,
} from './kameraUltah';

const SUDUT = [
  'top-0 left-0 border-t-2 border-l-2 rounded-tl-lg',
  'top-0 right-0 border-t-2 border-r-2 rounded-tr-lg',
  'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg',
  'bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg',
];

const TOMBOL =
  'w-full flex items-center justify-center gap-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-60 text-white font-bold py-3.5 rounded-2xl transition-colors active:scale-[0.98]';

/**
 * Tahap 1: pemindaian biometrik. Pegawai wajib memotret wajahnya sekali lewat kamera depan
 * (cadangan: ambil/pilih foto lewat input berkas bila kamera tidak bisa dibuka); foto itu
 * diteruskan lewat `onFoto` untuk captcha & visa, lalu dipindai.
 * langkah: 0 = siap, 1 = memindai, 2–4 = hasil muncul satu per satu.
 */
export default function TahapPindai({ pegawai, selfie, onFoto, onLanjut }) {
  const [langkah, setLangkah] = useState(0);
  const [kamera, setKamera] = useState('mati'); // mati | membuka | aktif
  const [galat, setGalat] = useState('');
  const [lama, setLama] = useState(false);
  const bingkaiRef = useRef(null);
  const garisRef = useRef(null);
  const videoRef = useRef(null);
  const kilatRef = useRef(null);
  const streamRef = useRef(null);

  // Matikan kamera saat tahap ini ditinggalkan
  useEffect(() => () => hentikanKamera(streamRef.current), []);

  useEffect(() => {
    if (langkah < 2 || langkah >= 4) return undefined;
    const t = setTimeout(() => setLangkah((l) => l + 1), 850);
    return () => clearTimeout(t);
  }, [langkah]);

  // Izin kamera belum dijawab terlalu lama: tampilkan petunjuk & cadangan unggah foto
  // (permintaan izin tetap berjalan; bila dijawab belakangan, kamera tetap menyala)
  useEffect(() => {
    if (kamera !== 'membuka') {
      setLama(false);
      return undefined;
    }
    const t = setTimeout(() => setLama(true), 5000);
    return () => clearTimeout(t);
  }, [kamera]);

  // Begitu foto ada: pindai
  useEffect(() => {
    if (!selfie || langkah !== 0) return;
    setLangkah(1);
    // tunggu foto tergambar di bingkai sebelum garis menyapu
    requestAnimationFrame(async () => {
      await sapuPindai(garisRef.current, (bingkaiRef.current?.clientHeight || 0) - 2);
      if (garisRef.current?.isConnected) setLangkah(2);
    });
  }, [selfie, langkah]);

  const nyalakan = async () => {
    setGalat('');
    setKamera('membuka');
    try {
      const stream = await bukaKamera();
      const video = videoRef.current;
      if (!video?.isConnected) {
        hentikanKamera(stream); // tahap sudah ditinggalkan / foto sudah dipilih lewat berkas
        return;
      }
      streamRef.current = stream;
      video.srcObject = stream;
      video.play().catch(() => {});
      setKamera('aktif');
    } catch (err) {
      setKamera('mati');
      setGalat(pesanGalatKamera(err));
    }
  };

  const jepret = async () => {
    const video = videoRef.current;
    if (!video?.videoWidth) {
      setGalat('Kamera belum siap. Tunggu gambar muncul, lalu coba lagi.');
      return;
    }
    setGalat('');
    kilatKamera(kilatRef.current);
    try {
      const url = await ambilGambar(video);
      hentikanKamera(streamRef.current);
      streamRef.current = null;
      setKamera('mati');
      onFoto(url);
    } catch {
      setGalat('Foto gagal diambil. Coba lagi.');
    }
  };

  const dariBerkas = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file?.type.startsWith('image/')) return;
    hentikanKamera(streamRef.current);
    streamRef.current = null;
    setKamera('mati');
    onFoto(URL.createObjectURL(file));
  };

  const hasil = [
    {
      ikon: <FaCheckCircle className="text-emerald-400 shrink-0" />,
      teks: (
        <>
          Kecocokan wajah: <b className="text-emerald-300">99,8%</b>
        </>
      ),
    },
    {
      ikon: <FaExclamationTriangle className="text-amber-400 shrink-0" />,
      teks: (
        <>
          Anomali terdeteksi: <b className="text-amber-300">usia bertambah 1 tahun</b>
        </>
      ),
    },
    {
      ikon: <FaFingerprint className="text-cyan-300 shrink-0" />,
      teks: 'Status: verifikasi tambahan diperlukan.',
    },
  ];

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-cyan-500/30 p-6 sm:p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-center">
        Pemindaian Biometrik
      </h2>
      <p className="text-cyan-200/60 text-sm text-center mt-1 mb-6">
        {selfie
          ? 'Foto diterima. Mencocokkan dengan data kepegawaian…'
          : 'Akun ini ditandai untuk pemeriksaan tambahan hari ini. Silakan foto wajah Anda.'}
      </p>

      <div ref={bingkaiRef} className="relative w-44 h-52 mx-auto">
        {selfie ? (
          <FotoWajah
            pegawai={pegawai}
            url={selfie}
            alt="Foto wajah Anda"
            className={`w-full h-full rounded-xl text-4xl ${ANIM.pudar}`}
          />
        ) : (
          <div className="w-full h-full rounded-xl overflow-hidden bg-slate-950/70 flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              aria-label="Pratinjau kamera"
              className={`w-full h-full object-cover -scale-x-100 ${kamera === 'aktif' ? '' : 'hidden'}`}
            />
            {kamera !== 'aktif' && (
              <FaCamera
                size={40}
                className={`text-cyan-500/40 ${kamera === 'membuka' ? 'animate-pulse' : ''}`}
              />
            )}
          </div>
        )}
        {SUDUT.map((k) => (
          <span key={k} aria-hidden="true" className={`absolute w-6 h-6 border-cyan-300 ${k}`} />
        ))}
        <span
          ref={kilatRef}
          aria-hidden="true"
          className="absolute inset-0 rounded-xl bg-white opacity-0 pointer-events-none"
        />
        <span
          ref={garisRef}
          aria-hidden="true"
          className={`absolute left-0 right-0 top-0 h-0.5 bg-cyan-300 shadow-[0_0_14px_4px_rgba(103,232,249,.7)] transition-opacity duration-200 ${langkah === 1 ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>

      <div aria-live="polite" className="mt-6 min-h-[7.5rem] space-y-2.5 text-sm">
        {galat && (
          <p className={`text-center text-rose-300 ${ANIM.muncul}`} role="alert">
            {galat}
          </p>
        )}
        {kamera === 'membuka' && !selfie && (
          <div
            className={`bg-cyan-500/10 border border-cyan-400/30 rounded-xl px-4 py-3 text-center ${ANIM.muncul}`}
          >
            <p className="font-semibold text-cyan-100 animate-pulse">Menunggu izin kamera…</p>
            <p className="text-cyan-200/70 text-[13px] mt-1">
              Klik <b className="text-cyan-100">Izinkan</b> pada jendela kecil di dekat bilah alamat
              browser (kiri atas layar).
            </p>
            {lama && (
              <p className={`text-amber-200 text-[13px] mt-2 ${ANIM.muncul}`}>
                {dalamBingkai()
                  ? 'Jendela izin tidak muncul karena halaman ini terbuka di dalam pratinjau/bingkai (mis. VS Code). Buka alamat yang sama di tab Chrome atau Edge biasa, atau pakai tombol di bawah.'
                  : 'Jendela izin tidak muncul? Cek ikon kamera di bilah alamat, atau pakai tombol di bawah.'}
              </p>
            )}
          </div>
        )}
        {langkah === 1 && (
          <p className="text-center text-cyan-200/80 animate-pulse">Memindai wajah…</p>
        )}
        {hasil.slice(0, Math.max(langkah - 1, 0)).map((h, i) => (
          <div
            key={i}
            className={`flex items-center gap-2.5 bg-slate-950/50 border border-cyan-500/15 rounded-xl px-4 py-2.5 ${ANIM.muncul}`}
          >
            {h.ikon}
            <span>{h.teks}</span>
          </div>
        ))}
      </div>

      {!selfie && (
        <div className="space-y-3">
          {kamera === 'aktif' ? (
            <button type="button" onClick={jepret} className={TOMBOL}>
              <FaCamera /> Ambil Foto
            </button>
          ) : (
            <button
              type="button"
              onClick={nyalakan}
              disabled={kamera === 'membuka'}
              className={TOMBOL}
            >
              <FaCamera /> {kamera === 'membuka' ? 'Membuka kamera…' : 'Buka Kamera'}
            </button>
          )}
          {(galat || lama) && (
            <label className="w-full flex items-center justify-center gap-2 cursor-pointer text-sm font-semibold text-cyan-200/80 hover:text-cyan-100 border border-cyan-500/30 hover:border-cyan-400/60 rounded-2xl py-3 transition-colors">
              <FaUpload size={13} /> Ambil / pilih foto lewat perangkat
              <input
                type="file"
                accept="image/*"
                capture="user"
                onChange={dariBerkas}
                className="sr-only"
              />
            </label>
          )}
        </div>
      )}
      {langkah >= 4 && (
        <div className={`mt-2 ${ANIM.muncul} ${jedaKe(2)}`}>
          <button type="button" onClick={onLanjut} className={TOMBOL}>
            Lanjutkan Verifikasi
          </button>
        </div>
      )}
    </div>
  );
}
