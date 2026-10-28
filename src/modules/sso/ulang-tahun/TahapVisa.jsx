import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FaDoorOpen } from 'react-icons/fa';
import { FONT } from '@/utils/uiTokens';
import { ANIM, jedaKe } from '@/utils/animasi';
import { tanggalIso } from '@/utils/nilai';
import FotoWajah from './FotoWajah';
import { hentakCap, konfeti } from './animasiUltah';

/** Tahap 4: Visa Kunjungan Usia Baru, dicap "DIIZINKAN MASUK", lalu konfeti. */
export default function TahapVisa({ pegawai, selfie, onSelesai }) {
  const [cap, setCap] = useState(false);
  const [ucapan, setUcapan] = useState(false);
  const kartuRef = useRef(null);
  const capRef = useRef(null);

  const hariIni = new Date();
  const nama = (pegawai?.nama || 'Pegawai').toUpperCase();
  const namaDepan = (pegawai?.nama || '').split(/\s+/)[0] || 'Anda';
  const tanggal = hariIni.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const tanggalCap = hariIni
    .toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase();
  const iso = tanggalIso(hariIni);
  const nomor = `ULT-${iso.slice(0, 4)}-${iso.slice(5).replace('-', '')}`;
  const mrz = `V<IDN${nama.replace(/[^A-Z]+/g, '<')}`.padEnd(44, '<').slice(0, 44);

  useEffect(() => {
    const t = setTimeout(() => setCap(true), 700);
    return () => clearTimeout(t);
  }, []);

  // Sebelum digambar, agar cap tidak sempat tampil utuh sebelum dihentakkan
  useLayoutEffect(() => {
    if (!cap) return;
    let batal = false;
    hentakCap(capRef.current, kartuRef.current).then(() => {
      if (batal) return;
      konfeti(capRef.current);
      setUcapan(true);
    });
    return () => {
      batal = true;
    };
  }, [cap]);

  const baris = [
    ['Nama', nama],
    ['Jenis Visa', 'Kunjungan Usia Baru'],
    [
      'Usia',
      <>
        <s className="opacity-60">XX</s> <b>[DIRAHASIAKAN NEGARA]</b>
      </>,
    ],
    ['Masa Berlaku', '365 hari, bisa diperpanjang tiap tahun'],
    ['Dikeluarkan di', `Singaraja, ${tanggal}`],
  ];

  return (
    <div>
      <div
        ref={kartuRef}
        className="relative rounded-2xl overflow-hidden bg-[#FBF7EE] text-[#3B2F1A] border-2 border-[#C9973B] shadow-[0_10px_40px_rgba(0,0,0,.5)]"
      >
        <div className="bg-gradient-to-r from-[#0f2040] to-[#1e4080] px-5 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold tracking-[.25em] text-[#E8C37A]">
              REPUBLIK INDONESIA
            </p>
            <h2 className={`${FONT.head} text-white font-bold text-lg leading-tight`}>
              VISA · Kunjungan Usia Baru
            </h2>
          </div>
          <span className={`${FONT.mono} text-[11px] text-[#E8C37A] shrink-0`}>{nomor}</span>
        </div>

        <div className="p-4 sm:p-5 flex gap-4">
          <FotoWajah
            pegawai={pegawai}
            url={selfie || undefined}
            alt={`Foto ${pegawai?.nama || 'pegawai'}`}
            className="w-24 h-32 sm:w-28 sm:h-36 rounded-md border border-[#C9973B]/60 shrink-0 text-2xl"
          />
          <dl className="flex-1 min-w-0 space-y-1.5 text-[12.5px]">
            {baris.map(([label, isi]) => (
              <div key={label}>
                <dt className="text-[9.5px] font-bold uppercase tracking-widest text-[#A97C24]">
                  {label}
                </dt>
                <dd className="font-semibold break-words">{isi}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div
          className={`${FONT.mono} bg-[#F3EAD3] border-t border-[#C9973B]/40 px-4 py-2 text-[10px] sm:text-[11px] tracking-[.12em] leading-relaxed overflow-hidden whitespace-nowrap`}
        >
          <p>{mrz}</p>
          <p>{`${nomor.replace(/-/g, '')}<<SELAMAT<ULANG<TAHUN<<<<<<<<<<<`.slice(0, 44)}</p>
        </div>

        {cap && (
          <div
            ref={capRef}
            aria-hidden="true"
            className="absolute right-3 bottom-14 sm:right-6 -rotate-12 border-[3px] border-[#1D5CA8] text-[#1D5CA8] rounded-lg px-3 py-1.5 text-center bg-[#FBF7EE]/60 mix-blend-multiply"
          >
            <p className="text-base sm:text-lg font-black tracking-wider leading-none">
              DIIZINKAN MASUK
            </p>
            <p className={`${FONT.mono} text-[9.5px] font-bold mt-1`}>
              KANIM BULELENG · {tanggalCap}
            </p>
          </div>
        )}
      </div>

      {ucapan && (
        <div className="text-center mt-6">
          <h2 className={`text-2xl sm:text-3xl font-bold ${ANIM.muncul}`}>
            Selamat ulang tahun, {namaDepan}! 🎂
          </h2>
          <p
            className={`text-cyan-100/80 text-sm mt-2 max-w-sm mx-auto ${ANIM.muncul} ${jedaKe(2)}`}
          >
            Semoga sehat selalu, bahagia, dan makin sukses. Visa usia baru Anda sudah terbit,
            selamat menikmati masa berlakunya!
          </p>
          <div className={`mt-5 ${ANIM.muncul} ${jedaKe(4)}`}>
            <button
              type="button"
              onClick={onSelesai}
              className="inline-flex items-center gap-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3.5 px-8 rounded-2xl transition-colors active:scale-[0.98]"
            >
              <FaDoorOpen /> Masuk ke Portal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
