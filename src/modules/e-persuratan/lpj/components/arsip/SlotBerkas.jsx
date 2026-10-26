import React, { useRef } from 'react';
import { FaCheck, FaQrcode, FaUpload } from 'react-icons/fa';
import { STATUS, T } from '@/utils/uiTokens';

/**
 * Slot unggah berkas pindaian (.upload-slot purwarupa). Klik → pilih file (gambar/PDF).
 * `file` = File terpilih (belum diunggah) atau metadata berkas tersimpan ({ name }).
 */
export default function SlotBerkas({ label, file, onPick, disabled, hint, err }) {
  const ref = useRef(null);
  const ada = !!file;
  return (
    <div className="mb-2.5">
      <input
        ref={ref}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          onPick(e.target.files?.[0] || null);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => ref.current?.click()}
        className={`w-full flex items-center gap-3 p-3.5 rounded-[11px] border-[1.5px] text-left transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
          ada
            ? T.surface
            : `border-dashed ${T.surface2} hover:border-[#0E2340] dark:hover:border-[#7DB6F3]`
        } ${err ? 'border-[#ef4444]' : T.borderStrong}`}
      >
        <span
          className={`w-[34px] h-[34px] shrink-0 rounded-[9px] grid place-items-center ${
            ada ? `${STATUS.doneBg} ${STATUS.doneInk}` : `${T.surface} ${T.inkMuted}`
          }`}
        >
          {ada ? <FaCheck size={14} /> : <FaUpload size={13} />}
        </span>
        <span className="flex-1 min-w-0">
          <span className={`block text-[13px] font-semibold ${T.ink}`}>{label}</span>
          <span className={`block text-[11px] mt-px break-all ${T.inkMuted}`}>
            {ada
              ? file.name
              : hint || 'Klik untuk memilih berkas hasil pindaian (gambar/PDF, < 5 MB)'}
          </span>
        </span>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-[7px] rounded-lg border text-xs font-semibold shrink-0 ${T.surface} ${T.border} ${T.ink2}`}
        >
          <FaQrcode size={11} /> {ada ? 'Ganti' : 'Pilih'}
        </span>
      </button>
      {err && <p className={`mt-1 text-[11.5px] font-semibold ${STATUS.critInk}`}>{err}</p>}
    </div>
  );
}
