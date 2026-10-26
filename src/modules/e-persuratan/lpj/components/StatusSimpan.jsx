import React from 'react';
import { FaCircleNotch, FaExclamationTriangle, FaRegClock } from 'react-icons/fa';
import { formatJam } from '../utils/formatTanggal';
import { BTN, STATUS, T } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';

/** Peringatan di atas form saat isian tidak bisa disimpan otomatis (offline / server tak merespons). */
export function PeringatanSimpan({ status, onCoba }) {
  if (status !== 'luring' && status !== 'gagal') return null;
  return (
    // Lapisan luar padat: warna peringatan semi-transparan, isi form tidak boleh tembus saat digulir
    <div
      role="alert"
      className={`sticky top-2 z-20 mb-4 rounded-xl ${T.surface} ${T.shadowSm} ${ANIM.muncul}`}
    >
      <div
        className={`flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border ${STATUS.warnBg} ${STATUS.warnBorder} ${STATUS.warnInk}`}
      >
        <FaExclamationTriangle size={16} className="shrink-0" />
        <div className="flex-1 min-w-[200px] text-[12.5px] leading-normal">
          <strong className="block text-[13px]">
            {status === 'luring'
              ? 'Koneksi internet terputus — perubahan tidak tersimpan otomatis'
              : 'Perubahan belum tersimpan otomatis'}
          </strong>
          {status === 'luring'
            ? 'Isian akan disimpan begitu koneksi kembali. Jangan tutup atau muat ulang halaman ini.'
            : 'Server belum merespons, mungkin karena internet bermasalah. Jangan tutup halaman ini dulu.'}
        </div>
        {status === 'gagal' && (
          <button type="button" className={BTN.sm} onClick={onCoba}>
            Coba simpan lagi
          </button>
        )}
      </div>
    </div>
  );
}

/** Baris kecil di bawah judul form: "Menyimpan otomatis…" / "Tersimpan otomatis · terakhir disimpan". */
export function InfoSimpan({ status, lastSaved }) {
  const kelas = `-mt-2 pb-4 text-[11.5px] flex items-center gap-1.5 ${T.inkMuted}`;
  if (status === 'menyimpan') {
    return (
      <div className={kelas}>
        <FaCircleNotch size={11} className="animate-spin" /> Menyimpan otomatis…
      </div>
    );
  }
  if (!lastSaved) return null;
  return (
    <div className={kelas}>
      <FaRegClock size={11} /> Tersimpan otomatis · terakhir disimpan:{' '}
      <span key={lastSaved.getTime()} className={`font-semibold ${ANIM.meletup}`}>
        {formatJam(lastSaved)}
      </span>
    </div>
  );
}
