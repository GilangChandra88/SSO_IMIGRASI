import React, { useEffect, useRef } from 'react';
import { FaCheck } from 'react-icons/fa';
import { FONT } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';
import {
  figurDapatHalaman,
  mulaiAnimasiGambar,
  mulaiAnimasiPdf,
  mulaiMaskotPindai,
} from '../../animasiScanner';

const MULAI = { scan: mulaiMaskotPindai, pdf: mulaiAnimasiPdf, gambar: mulaiAnimasiGambar };

/** Maskot scanner: bermata, berkedip, cahaya pemindai, kertas keluar dari celah. */
function Scanner() {
  return (
    <div data-badan className="absolute inset-x-0 top-2">
      <div
        data-pantul
        className="relative h-[48px] rounded-[14px] bg-[#0f2040] shadow-[0_6px_14px_rgba(15,32,64,.35)]"
      >
        <div className="absolute left-3 right-3 top-2 h-[7px] rounded-full bg-[#1e4080] overflow-hidden">
          <div data-cahaya className="h-full w-1/3 rounded-full bg-[#C9973B] blur-[1px]" />
        </div>
        <div className="absolute left-0 right-0 top-[22px] flex justify-center gap-5">
          {[0, 1].map((i) => (
            <span
              key={i}
              data-mata
              className="w-[11px] h-[11px] rounded-full bg-white grid place-items-center"
            >
              <span className="w-[5px] h-[5px] rounded-full bg-[#0f2040] translate-x-[1px]" />
            </span>
          ))}
        </div>
        <span className="absolute left-1/2 -translate-x-1/2 bottom-[5px] w-[14px] h-[7px] rounded-b-full border-2 border-t-0 border-[#7DB6F3]" />
        <span className="absolute left-[30px] bottom-[9px] w-[6px] h-[3px] rounded-full bg-[#C9973B] opacity-70" />
        <span className="absolute right-[30px] bottom-[9px] w-[6px] h-[3px] rounded-full bg-[#C9973B] opacity-70" />
      </div>
      <div className="mx-auto w-[84px] h-[44px] overflow-hidden">
        <div
          data-kertas
          className="w-full h-full bg-white rounded-b-[4px] border border-t-0 border-[#E0E5EC] px-2 pt-2 space-y-1.5"
        >
          <div className="h-[3px] w-4/5 rounded bg-[#CBD3DE]" />
          <div className="h-[3px] w-3/5 rounded bg-[#CBD3DE]" />
          <div className="h-[3px] w-2/3 rounded bg-[#CBD3DE]" />
        </div>
      </div>
    </div>
  );
}

/** Garis-garis teks tiruan di atas kertas. */
const Baris = () => (
  <div className="space-y-1.5">
    <div className="h-[3px] w-4/5 rounded bg-[#CBD3DE]" />
    <div className="h-[3px] w-3/5 rounded bg-[#CBD3DE]" />
    <div className="h-[3px] w-2/3 rounded bg-[#CBD3DE]" />
  </div>
);

/** Dokumen PDF: lembar-lembar mengelupas keluar (dipecah per halaman). */
function Pdf() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div data-dokumen className="relative w-[66px] h-[84px]">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            data-lembar
            className="absolute inset-0 rounded-[6px] bg-white border border-[#E0E5EC] px-2 pt-3 shadow-[0_3px_8px_rgba(15,32,64,.15)]"
          >
            <Baris />
          </div>
        ))}
        <div
          data-pantul
          className="absolute inset-0 rounded-[6px] bg-white border border-[#CBD3DE] px-2 pt-3 shadow-[0_6px_14px_rgba(15,32,64,.25)] overflow-hidden"
        >
          {/* Sudut terlipat */}
          <span className="absolute -top-[9px] -right-[9px] w-[18px] h-[18px] rotate-45 bg-[#E0E5EC]" />
          <Baris />
          <span
            className={`absolute left-1.5 bottom-1.5 px-1.5 py-[1px] rounded-[4px] text-[10px] font-extrabold tracking-wide text-[#C9973B] bg-[#0f2040] ${FONT.mono}`}
          >
            PDF
          </span>
        </div>
      </div>
    </div>
  );
}

/** Bingkai foto: langit, gunung, matahari berdenyut, kilau menyapu. */
function Gambar() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div
        data-bingkai
        className="relative w-[92px] h-[72px] rounded-[10px] bg-white p-[5px] shadow-[0_6px_14px_rgba(15,32,64,.25)]"
      >
        <div
          data-pantul
          className="relative w-full h-full rounded-[6px] overflow-hidden bg-gradient-to-b from-[#BFDBF7] to-[#EAF3FD]"
        >
          <span
            data-matahari
            className="absolute right-3 top-2 w-[14px] h-[14px] rounded-full bg-[#C9973B]"
          />
          <span className="absolute -bottom-[22px] left-[2px] w-[44px] h-[44px] rotate-45 bg-[#1e4080]" />
          <span className="absolute -bottom-[26px] left-[30px] w-[50px] h-[50px] rotate-45 bg-[#0f2040]" />
          <span data-kilau className="absolute -top-2 left-0 w-[14px] h-[90px] bg-white/45" />
        </div>
      </div>
    </div>
  );
}

const FIGUR = { scan: Scanner, pdf: Pdf, gambar: Gambar };

/**
 * Figur animasi di panggung panel tengah sesuai sumber halaman: `mode` 'scan' | 'pdf' | 'gambar'.
 * Bergerak selama aktif (indikator memuat); setiap `jumlah` bertambah → figur memantul dan
 * lencana meletup. Bertanda `data-asal-halaman`: salinan halaman terbang dari sini ke kanvas.
 */
export default function FigurPanggung({ mode, jumlah, selesai }) {
  const akar = useRef(null);
  const Figur = FIGUR[mode] || Scanner;

  useEffect(() => {
    if (selesai) return undefined;
    return (MULAI[mode] || mulaiMaskotPindai)(akar.current);
  }, [mode, selesai]);

  useEffect(() => {
    if (jumlah > 0) figurDapatHalaman(akar.current);
  }, [jumlah]);

  return (
    <div ref={akar} data-asal-halaman className="relative w-[132px] h-[104px] shrink-0">
      <Figur />
      {(jumlah > 0 || selesai) && (
        <span
          key={selesai ? 'selesai' : jumlah}
          className={`absolute -top-1 -right-2 min-w-7 h-7 px-1.5 rounded-full grid place-items-center text-[12px] font-bold text-white shadow-[0_3px_8px_rgba(201,151,59,.45)] ${FONT.mono} ${ANIM.meletup} ${
            selesai ? 'bg-[#147C55]' : 'bg-[#C9973B]'
          }`}
        >
          {selesai ? <FaCheck size={11} /> : `+${jumlah}`}
        </span>
      )}
    </div>
  );
}
