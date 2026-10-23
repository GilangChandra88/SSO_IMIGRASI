import React from 'react';
import {
  FaCheckCircle,
  FaCircleNotch,
  FaDownload,
  FaExclamationTriangle,
  FaPlay,
  FaPlug,
  FaSyncAlt,
} from 'react-icons/fa';
import { BTN, FONT, NAVY, STATUS, T } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';
import {
  TAUTAN_NYALAKAN_AGEN,
  UKURAN_UNDUH_AGEN,
  URL_UNDUH_AGEN,
  VERSI_AGEN_TERBARU,
} from '../data/agen';

const TOMBOL_UTAMA = `inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-[10px] text-[13px] font-bold text-white ${NAVY.bg} ${NAVY.hoverBg} cursor-pointer ${ANIM.tekan}`;
const TAUTAN_KECIL = `underline underline-offset-2 cursor-pointer hover:text-[#1D5CA8] dark:hover:text-[#7DB6F3]`;

/** Tautan unduh setup; klik → web memeriksa agen lebih sering sampai tersambung. */
function TombolUnduh({ onKlik, label = 'Unduh Agen Scanner' }) {
  return (
    <a href={URL_UNDUH_AGEN} download className={TOMBOL_UTAMA} onClick={onKlik}>
      <FaDownload size={12} /> {label}
    </a>
  );
}

function Menunggu({ teks }) {
  return (
    <p
      className={`flex items-center gap-2 mt-3 text-[12px] font-semibold ${STATUS.infoInk} ${ANIM.muncul}`}
    >
      <FaCircleNotch size={11} className="animate-spin shrink-0" /> {teks}
    </p>
  );
}

function Langkah({ nomor, aktif, children }) {
  return (
    <li className="flex gap-2.5">
      <span
        className={`w-5 h-5 shrink-0 mt-px rounded-full grid place-items-center text-[10.5px] font-bold motion-safe:transition-colors motion-safe:duration-300 ${FONT.mono} ${
          aktif ? `${NAVY.bg} text-white` : `${T.surface2} ${T.inkMuted}`
        }`}
      >
        {nomor}
      </span>
      <div className={`flex-1 min-w-0 text-[12px] leading-[1.55] ${T.ink2}`}>{children}</div>
    </li>
  );
}

/**
 * Kartu status Agen Scanner + panduan pemasangan otomatis:
 *  - belum pernah terpasang → "Pasang Agen Scanner" (unduh → jalankan → otomatis tersambung);
 *  - pernah terpasang tetapi mati → "Nyalakan Agen" (tautan agenscanner://);
 *  - ditolak (agen versi lama tanpa izin domain web ini) / versi lama → "Perbarui".
 */
export default function StatusAgen({
  status,
  info,
  periksa,
  pernahTerpasang,
  perluPembaruan,
  menunggu,
  tunggu,
}) {
  if (status === 'terhubung') {
    return (
      <div className={`rounded-[14px] px-3.5 py-3 ${STATUS.goodBg} ${ANIM.muncul}`}>
        <div className="flex items-center gap-3">
          <FaCheckCircle size={16} className={`shrink-0 ${STATUS.goodInk}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-[13px] font-bold ${STATUS.goodInk}`}>Agen Scanner terhubung</p>
            <p className={`text-[11.5px] ${T.ink2}`}>Versi {info?.versi} · scanner siap dipakai</p>
          </div>
        </div>
        {perluPembaruan && (
          <div className={`mt-2.5 pt-2.5 border-t border-[rgba(20,124,85,.2)] ${ANIM.muncul}`}>
            <p className={`text-[12px] mb-2 ${T.ink2}`}>
              Versi baru <b>{VERSI_AGEN_TERBARU}</b> tersedia. Unduh lalu jalankan — agen lama
              diganti otomatis.
            </p>
            <a
              href={URL_UNDUH_AGEN}
              download
              className={`${BTN.xs} justify-center w-full`}
              onClick={tunggu}
            >
              <FaDownload size={10} /> Perbarui Agen Scanner
            </a>
            {menunggu && <Menunggu teks="Menunggu agen versi baru…" />}
          </div>
        )}
      </div>
    );
  }

  if (status === 'memeriksa') {
    return (
      <div className={`flex items-center gap-3 rounded-[14px] px-3.5 py-3 ${T.surface2}`}>
        <FaCircleNotch size={14} className={`animate-spin ${T.inkMuted}`} />
        <p className={`text-[13px] ${T.ink2}`}>Menghubungi Agen Scanner…</p>
      </div>
    );
  }

  // Agen hidup tetapi menolak domain ini: hampir pasti versi lama → perbarui
  if (status === 'ditolak') {
    return (
      <div className={`rounded-[14px] px-3.5 py-3 ${STATUS.warnBg} ${ANIM.muncul}`}>
        <div className="flex items-start gap-3 mb-3">
          <FaExclamationTriangle size={15} className={`shrink-0 mt-0.5 ${STATUS.warnInk}`} />
          <div className="min-w-0">
            <p className={`text-[13px] font-bold ${STATUS.warnInk}`}>
              Agen Scanner perlu diperbarui
            </p>
            <p className={`text-[12px] mt-1 leading-[1.55] ${T.ink2}`}>
              Agen di PC ini versi lama dan belum mengenali alamat web ini. Unduh versi terbaru lalu
              jalankan; agen lama diganti otomatis.
            </p>
          </div>
        </div>
        <TombolUnduh onKlik={tunggu} label="Unduh pembaruan" />
        {menunggu && <Menunggu teks="Menunggu agen versi baru…" />}
      </div>
    );
  }

  // Pernah terpasang di browser ini → kemungkinan besar hanya sedang mati
  if (pernahTerpasang) {
    return (
      <div className={`rounded-[14px] px-3.5 py-3 ${STATUS.warnBg} ${ANIM.muncul}`}>
        <div className="flex items-start gap-3 mb-3">
          <FaPlug size={15} className={`shrink-0 mt-0.5 ${STATUS.warnInk}`} />
          <div className="min-w-0">
            <p className={`text-[13px] font-bold ${STATUS.warnInk}`}>Agen Scanner tidak berjalan</p>
            <p className={`text-[12px] mt-1 leading-[1.55] ${T.ink2}`}>
              Nyalakan agennya. Bila browser bertanya "Buka Agen Scanner Imigrasi?", pilih{' '}
              <b>Buka</b> (centang "selalu izinkan" agar tidak ditanya lagi).
            </p>
          </div>
        </div>
        <a href={TAUTAN_NYALAKAN_AGEN} className={TOMBOL_UTAMA} onClick={tunggu}>
          <FaPlay size={11} /> Nyalakan Agen Scanner
        </a>
        {menunggu && <Menunggu teks="Menunggu agen menyala…" />}
        <p className={`mt-2.5 text-[11.5px] ${T.inkMuted}`}>
          Belum terpasang di PC ini?{' '}
          <a href={URL_UNDUH_AGEN} download className={TAUTAN_KECIL} onClick={tunggu}>
            Unduh Agen Scanner
          </a>
        </p>
      </div>
    );
  }

  // Belum pernah terpasang → panduan pemasangan 3 langkah
  return (
    <div
      className={`rounded-[16px] border p-4 ${T.surface} ${T.border} ${T.shadowSm} ${ANIM.muncul}`}
    >
      <p className={`${FONT.head} text-[14px] font-bold ${T.ink}`}>Pasang Agen Scanner</p>
      <p className={`text-[12px] mt-0.5 mb-3.5 leading-[1.5] ${T.inkMuted}`}>
        Sekali saja per PC, hanya untuk memindai dari scanner. Impor gambar/PDF dan OCR tetap bisa
        dipakai tanpa agen.
      </p>
      <ol className="space-y-3">
        <Langkah nomor={1} aktif={!menunggu}>
          <TombolUnduh onKlik={tunggu} />
          <span className={`block mt-1 text-[11px] ${T.inkMuted}`}>
            Windows 10/11 · {UKURAN_UNDUH_AGEN} · tanpa hak admin
          </span>
        </Langkah>
        <Langkah nomor={2} aktif={menunggu}>
          Buka berkas <b>AgenScanner-Setup.exe</b> yang terunduh. Bila muncul "Windows melindungi PC
          Anda", klik <b>Info selengkapnya → Tetap jalankan</b>.
        </Langkah>
        <Langkah nomor={3} aktif={menunggu}>
          Bila browser meminta izin mengakses <b>perangkat di jaringan lokal</b>, pilih{' '}
          <b>Izinkan</b>.
        </Langkah>
      </ol>
      {menunggu ? (
        <Menunggu teks="Menunggu Agen Scanner… halaman tersambung otomatis." />
      ) : (
        <p className={`mt-3.5 text-[11.5px] ${T.inkMuted}`}>
          Sudah pernah dipasang?{' '}
          <a href={TAUTAN_NYALAKAN_AGEN} className={TAUTAN_KECIL} onClick={tunggu}>
            Nyalakan agen
          </a>{' '}
          ·{' '}
          <button type="button" className={TAUTAN_KECIL} onClick={periksa}>
            <FaSyncAlt size={9} className="inline -mt-0.5" /> Cek ulang
          </button>
        </p>
      )}
    </div>
  );
}
