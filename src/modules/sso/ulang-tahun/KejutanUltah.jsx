import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaPassport } from 'react-icons/fa';
import { FONT } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';
import { setKejutanAktif } from './kejutanAktif';
import TahapPindai from './TahapPindai';
import TahapCaptcha from './TahapCaptcha';
import TahapRobot from './TahapRobot';
import TahapVisa from './TahapVisa';

const JUMLAH_TAHAP = 4;

/**
 * Kejutan ulang tahun setelah login: "pemeriksaan keimigrasian" 4 tahap (pemindaian biometrik →
 * captcha pilih foto sendiri → kotak "bukan robot" yang kabur → Visa Kunjungan Usia Baru).
 * Layar penuh di atas Portal; `uji` = pratinjau admin (diberi label, tidak dicatat).
 */
export default function KejutanUltah({ pegawai, uji = false, onSelesai }) {
  const [tahap, setTahap] = useState(0);
  const lanjut = useCallback(() => setTahap((t) => t + 1), []);
  // Foto kamera dari tahap pemindaian (object URL, hanya di memori): ikut jadi kotak captcha & foto visa
  const [selfie, setSelfie] = useState('');
  useEffect(() => () => selfie && URL.revokeObjectURL(selfie), [selfie]);

  useEffect(() => {
    setKejutanAktif(true);
    document.body.classList.add('overflow-hidden');
    return () => {
      setKejutanAktif(false);
      document.body.classList.remove('overflow-hidden');
    };
  }, []);

  const isi = [
    <TahapPindai
      key="pindai"
      pegawai={pegawai}
      selfie={selfie}
      onFoto={setSelfie}
      onLanjut={lanjut}
    />,
    <TahapCaptcha key="captcha" pegawai={pegawai} selfie={selfie} onLanjut={lanjut} />,
    <TahapRobot key="robot" onLanjut={lanjut} />,
    <TahapVisa key="visa" pegawai={pegawai} selfie={selfie} onSelesai={onSelesai} />,
  ][tahap];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Kejutan ulang tahun"
      className={`${FONT.body} fixed inset-0 z-[1050] overflow-y-auto overflow-x-hidden bg-[#020617] text-white ${ANIM.latar}`}
    >
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-[linear-gradient(rgba(30,41,59,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.5)_1px,transparent_1px)] bg-[length:40px_40px] opacity-30 pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="fixed top-0 left-0 w-[30rem] h-[30rem] bg-cyan-600/20 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      />

      <div className="relative min-h-full flex flex-col items-center justify-center px-4 py-8 sm:p-8">
        <div className="w-full max-w-md mb-5">
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <p className="flex items-center gap-2 text-cyan-300 text-[11px] font-bold uppercase tracking-widest">
              <FaPassport size={14} /> Pemeriksaan Keimigrasian
            </p>
            <p className={`${FONT.mono} text-[11px] text-cyan-200/60`}>
              Tahap {tahap + 1}/{JUMLAH_TAHAP}
            </p>
          </div>
          <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
            {Array.from({ length: JUMLAH_TAHAP }, (_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-colors duration-300 ${i <= tahap ? 'bg-cyan-400' : 'bg-slate-700'}`}
              />
            ))}
          </div>
          {uji && (
            <p className="mt-3 text-center text-[11px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg py-1.5">
              Mode uji admin · tidak dicatat
            </p>
          )}
        </div>

        <div key={tahap} className={`w-full max-w-md ${ANIM.geserKiri}`}>
          {isi}
        </div>

        {tahap < JUMLAH_TAHAP - 1 && (
          <button
            type="button"
            onClick={onSelesai}
            className="mt-6 text-xs text-cyan-200/40 hover:text-cyan-200/80 underline underline-offset-2 transition-colors"
          >
            Lewati pemeriksaan
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
