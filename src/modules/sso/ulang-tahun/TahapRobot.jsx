import { useEffect, useRef, useState } from 'react';
import { FaCheck, FaRobot } from 'react-icons/fa';
import { T } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';
import { kaburkan } from './animasiUltah';

// Ejekan ke-i tampil setelah kotak kabur i kali; kotak berhenti kabur setelah MAKS_KABUR kali.
const EJEKAN = [
  'Centang kotak di atas untuk melanjutkan.',
  'Eits! 🙈',
  'Hampir kena! 😜',
  'Kurang cepat sedikit lagi… 🏃',
  'Refleksnya melambat ya? Faktor umur mungkin. 🤭',
  'Sistem curiga: robot yang berulang tahun? 🤖',
  'Ayo, jangan menyerah! Visa sudah menunggu. 🛂',
  'Kotaknya juga ikut merayakan, jadi agak lincah. 🎉',
  'Baiklah, kotaknya capek. Silakan centang sekarang. 😮‍💨',
];
const MAKS_KABUR = EJEKAN.length - 1;

/** Tahap 3: kotak "Saya bukan robot" yang kabur berkali-kali sebelum mau dicentang. */
export default function TahapRobot({ onLanjut }) {
  const [kabur, setKabur] = useState(0);
  const [status, setStatus] = useState('siap'); // siap | memeriksa | lolos

  const kotakRef = useRef(null);

  useEffect(() => {
    if (status === 'memeriksa') {
      const t = setTimeout(() => setStatus('lolos'), 900);
      return () => clearTimeout(t);
    }
    if (status === 'lolos') {
      const t = setTimeout(onLanjut, 1700);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [status, onLanjut]);

  const lari = () => {
    kaburkan(kotakRef.current);
    setKabur((k) => k + 1);
  };

  const klik = () => {
    if (status !== 'siap') return;
    if (kabur < MAKS_KABUR) lari();
    else setStatus('memeriksa');
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-cyan-500/30 p-6 sm:p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-center">
        Verifikasi Manusia
      </h2>
      <p className="text-cyan-200/60 text-sm text-center mt-1 mb-5">
        Langkah terakhir sebelum visa diterbitkan.
      </p>

      <div className="relative h-56 rounded-2xl border border-dashed border-cyan-500/25 bg-slate-950/40">
        <button
          ref={kotakRef}
          type="button"
          onClick={klik}
          onPointerEnter={(e) => {
            if (e.pointerType === 'mouse' && status === 'siap' && kabur < MAKS_KABUR) lari();
          }}
          className={`absolute z-20 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[264px] max-w-[calc(100%-16px)] flex items-center gap-3 ${T.surface} ${T.ink} border ${T.border} rounded-md px-3.5 py-3 shadow-[0_8px_30px_rgba(0,0,0,.45)] text-left`}
        >
          <span
            className={`w-7 h-7 shrink-0 rounded-sm border-2 flex items-center justify-center ${status === 'lolos' ? 'border-transparent' : 'border-[#c1c1c1]'}`}
          >
            {status === 'memeriksa' && (
              <span className="w-5 h-5 border-[3px] border-[#1a73e8]/30 border-t-[#1a73e8] rounded-full animate-spin" />
            )}
            {status === 'lolos' && (
              <FaCheck size={22} className={`text-[#0f9d58] ${ANIM.meletup}`} />
            )}
          </span>
          <span
            key={status === 'lolos' ? 'ultah' : 'robot'}
            className={`flex-1 text-sm font-medium ${ANIM.muncul}`}
          >
            {status === 'lolos' ? 'Saya sedang berulang tahun 🎂' : 'Saya bukan robot'}
          </span>
          <span className="flex flex-col items-center shrink-0 text-[#1a73e8]">
            <FaRobot size={18} />
            <span className={`text-[8px] mt-0.5 ${T.inkMuted}`}>ultahCAPTCHA</span>
          </span>
        </button>
      </div>

      <p
        key={status === 'siap' ? kabur : status}
        aria-live="polite"
        className={`text-sm text-center mt-4 min-h-[1.25rem] ${status === 'lolos' ? 'text-emerald-300' : 'text-cyan-100/80'} ${ANIM.muncul}`}
      >
        {status === 'lolos'
          ? 'Terverifikasi: manusia yang sedang berulang tahun. ✅'
          : status === 'memeriksa'
            ? 'Memeriksa…'
            : EJEKAN[Math.min(kabur, EJEKAN.length - 1)]}
      </p>
    </div>
  );
}
