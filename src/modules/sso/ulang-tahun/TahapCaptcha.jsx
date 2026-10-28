import { useEffect, useRef, useState } from 'react';
import { FaCheck } from 'react-icons/fa';
import { T } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';
import FotoWajah from './FotoWajah';
import Kapibara from './Kapibara';
import { goyang } from './animasiUltah';

// Kisi 3×3 = 6 "versi" foto pegawai (dipilih acak dari VARIAN, foto-fotonya dipakai bergiliran)
// + 3 kapibara pengecoh. Lolos bila semua foto pegawai dipilih dan tidak ada kapibara terpilih.
const KAPIBARA = [
  { kapibara: 'jeruk', label: 'Kapibara berjeruk' },
  { kapibara: 'pesta', label: 'Kapibara siap pesta' },
  { kapibara: 'berendam', label: 'Kapibara berendam' },
];
const JUMLAH_FOTO = 9 - KAPIBARA.length;

const VARIAN = [
  { kelas: '', label: 'Foto asli' },
  { kelas: 'grayscale', label: 'Versi hitam-putih' },
  { kelas: 'sepia', label: 'Versi jadul' },
  { kelas: '-scale-x-100', label: 'Versi cermin' },
  { kelas: 'scale-[2.4]', label: 'Versi diperbesar' },
  { kelas: 'rotate-180', label: 'Versi terbalik' },
  { kelas: 'hue-rotate-180 saturate-200', label: 'Versi warna-warni' },
  { kelas: 'blur-[2px]', label: 'Versi belum pakai kacamata' },
  { kelas: 'contrast-125 saturate-150', label: 'Versi siap pesta', pesta: true },
];

const acak = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Tahap 2: captcha "pilih semua gambar yang berisi WNI yang umurnya nambah hari ini". */
export default function TahapCaptcha({ pegawai, selfie, onLanjut }) {
  const [kotak] = useState(() => {
    // Foto kamera di urutan pertama agar pasti muncul; sisanya foto dari Kepegawaian (path Storage)
    const sumber = [
      ...(selfie ? [{ url: selfie }] : []),
      ...acak(pegawai?.fotoPaths || []).map((path) => ({ path })),
    ];
    const foto = acak(VARIAN)
      .slice(0, JUMLAH_FOTO)
      .map((v, i) => ({ ...v, ...(sumber.length ? sumber[i % sumber.length] : {}) }));
    return acak([...foto, ...KAPIBARA]);
  });
  const [dipilih, setDipilih] = useState(() => new Set());
  const [pesan, setPesan] = useState('');
  const [gagal, setGagal] = useState(0);
  const [berhasil, setBerhasil] = useState(false);
  const kartuRef = useRef(null);

  useEffect(() => {
    if (!berhasil) return undefined;
    const t = setTimeout(onLanjut, 1900);
    return () => clearTimeout(t);
  }, [berhasil, onLanjut]);

  const pilih = (i) => {
    setPesan('');
    setDipilih((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  };

  const verifikasi = () => {
    const kapibaraTerpilih = kotak.filter((k, i) => k.kapibara && dipilih.has(i)).length;
    const kurang = kotak.filter((k, i) => !k.kapibara && !dipilih.has(i)).length;
    if (!kapibaraTerpilih && !kurang) {
      setBerhasil(true);
      return;
    }
    const ke = gagal + 1;
    setGagal(ke);
    if (dipilih.size === 0)
      setPesan('Pilih minimal satu gambar. Masa tidak kenal diri sendiri? 🤔');
    else if (ke >= 3)
      setPesan('Petunjuk rahasia: pilih semua gambar kecuali kapibara. Kapibara bukan WNI. 🤫');
    else if (kapibaraTerpilih)
      setPesan(
        `Ada ${kapibaraTerpilih} kapibara yang ikut terpilih. Kapibara bukan WNI, dan umurnya tidak nambah hari ini. 😌`,
      );
    else setPesan(`Verifikasi gagal. Anda melewatkan ${kurang} versi diri Anda yang lain. 🧐`);
    goyang(kartuRef.current);
  };

  return (
    <div
      ref={kartuRef}
      className={`${T.surface} ${T.ink} rounded-md overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,.5)]`}
    >
      <div className="bg-[#1a73e8] text-white px-5 py-4">
        <p className="text-sm">Pilih semua gambar yang berisi</p>
        <h2 className="text-2xl font-bold leading-tight">WNI yang umurnya nambah hari ini</h2>
        <p className="text-sm mt-1 opacity-90">Klik verifikasi setelah selesai. 😎</p>
      </div>

      <div className="relative">
        <div className="grid grid-cols-3 gap-1 p-2">
          {kotak.map((v, i) => {
            const aktif = dipilih.has(i);
            return (
              <button
                key={v.label}
                type="button"
                aria-pressed={aktif}
                aria-label={v.label}
                disabled={berhasil}
                onClick={() => pilih(i)}
                className="relative aspect-square overflow-hidden bg-slate-200 dark:bg-slate-800 text-3xl focus-visible:outline-2 focus-visible:outline-[#1a73e8]"
              >
                {v.kapibara ? (
                  <Kapibara
                    gaya={v.kapibara}
                    className={`w-full h-full motion-safe:transition-[scale] motion-safe:duration-200 ${aktif ? 'scale-[.8]' : ''}`}
                  />
                ) : (
                  <FotoWajah
                    pegawai={pegawai}
                    url={v.url}
                    path={v.path}
                    varian={v.kelas}
                    className={`w-full h-full motion-safe:transition-[scale] motion-safe:duration-200 ${aktif ? 'scale-[.8]' : ''}`}
                  />
                )}
                {v.pesta && (
                  <span aria-hidden="true" className="absolute bottom-1 right-1.5 text-2xl">
                    🥳
                  </span>
                )}
                {aktif && (
                  <span
                    aria-hidden="true"
                    className={`absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-[#1a73e8] text-white flex items-center justify-center ${ANIM.meletup}`}
                  >
                    <FaCheck size={11} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {berhasil && (
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/90 dark:bg-[#111D2E]/90 text-center p-6 ${ANIM.pudar}`}
          >
            <span className={`text-5xl ${ANIM.meletup}`} aria-hidden="true">
              👏
            </span>
            <p className="text-lg font-bold">
              Lolos! Anda bisa membedakan diri sendiri dari kapibara.
            </p>
            <p className={`text-sm ${T.ink2}`}>Tidak semua orang bisa.</p>
          </div>
        )}
      </div>

      <div aria-live="polite" className="px-4 min-h-[1.5rem]">
        {pesan && (
          <p key={gagal} className={`text-[13px] font-semibold text-[#d93025] ${ANIM.muncul}`}>
            {pesan}
          </p>
        )}
      </div>

      <div className={`flex items-center justify-between gap-3 border-t ${T.border} px-4 py-3`}>
        <p className={`text-[11.5px] ${T.inkMuted}`}>
          Gambar tidak jelas? Bisa jadi Anda, bisa jadi kapibara. 🙃
        </p>
        <button
          type="button"
          onClick={verifikasi}
          disabled={berhasil}
          className="shrink-0 bg-[#1a73e8] hover:bg-[#1765cc] disabled:opacity-60 text-white text-sm font-bold uppercase tracking-wide px-6 py-2.5 rounded-sm transition-colors"
        >
          Verifikasi
        </button>
      </div>
    </div>
  );
}
