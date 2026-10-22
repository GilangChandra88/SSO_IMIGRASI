import React, { useRef } from 'react';
import { FaFileImport, FaPlus } from 'react-icons/fa';
import { ADMIN, STATUS, T } from '@/utils/uiTokens';

/**
 * Tombol impor gambar/PDF di panel tengah (PDF dipecah pada 200 dpi, lihat useImpor).
 * `varian`: 'besar' (kanvas kosong) atau 'kartu' (kartu "+ Tambah halaman" di ujung kanvas).
 * Tombol bertanda `data-asal-cadangan="impor"`: titik berangkat cadangan halaman yang terbang.
 */
export default function TombolImpor({ impor, sibuk, agenSiap, varian = 'kartu' }) {
  const input = useRef(null);
  const pilih = () => input.current?.click();

  return (
    <>
      <input
        ref={input}
        type="file"
        multiple
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          impor(e.target.files || []);
          e.target.value = '';
        }}
      />
      {varian === 'besar' ? (
        <div className="flex flex-col items-center gap-2.5">
          <button
            type="button"
            className={ADMIN.btnAdd}
            onClick={pilih}
            disabled={sibuk}
            data-asal-cadangan="impor"
          >
            <FaFileImport size={13} /> Pilih gambar / PDF
          </button>
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={pilih}
            disabled={sibuk}
            data-asal-cadangan="impor"
            className={`w-full flex items-center justify-center gap-2 py-4 rounded-[10px] border-[1.5px] border-dashed text-[12.5px] font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed motion-safe:transition-[border-color,color,scale] motion-safe:duration-200 motion-safe:enabled:active:scale-[.99] ${T.borderStrong} ${T.ink2} enabled:hover:border-[#2A78D6] enabled:hover:text-[#1D5CA8] dark:enabled:hover:border-[#7DB6F3] dark:enabled:hover:text-[#7DB6F3]`}
          >
            <FaPlus size={11} /> Tambah halaman (gambar / PDF)
          </button>
        </div>
      )}
      {!agenSiap && (
        <p className={`mt-2 text-center text-[11.5px] ${STATUS.warnInk}`}>
          Agen Scanner belum terhubung: PDF belum bisa dipecah, gambar tetap bisa diimpor.
        </p>
      )}
    </>
  );
}
