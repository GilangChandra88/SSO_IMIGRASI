import React from 'react';
import { FaTimes } from 'react-icons/fa';
import { T } from '@/utils/uiTokens';
import { ANIM, hapusBaris } from '@/utils/animasi';

/**
 * Kartu data pelaksana: Nama · NIP · Pangkat/Gol · Jabatan. Dengan `onHapus(p)` tiap kartu punya
 * tombol hapus (pegawai terpilih di `PegawaiPicker` hanya tampil di sini); tanpa itu hanya-baca.
 */
export default function PegawaiCards({ list, onHapus }) {
  return (
    <>
      {list.map((p) => (
        <div
          key={p.pegawaiId}
          className={`flex items-start gap-2 p-3 mb-2 rounded-lg border text-[12.5px] font-semibold ${T.surface2} ${T.border} ${T.ink} ${onHapus ? ANIM.muncul : ''}`}
        >
          <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              ['Nama', p.nama],
              ['NIP', p.nip],
              ['Pangkat/Gol', p.pangkat],
              ['Jabatan', p.jabatan],
            ].map(([label, val]) => (
              <div key={label} className="min-w-0 break-words">
                <span className={`block text-[11px] font-medium ${T.inkMuted}`}>{label}</span>
                {val || '-'}
              </div>
            ))}
          </div>
          {onHapus && (
            <button
              type="button"
              title="Hapus pegawai"
              aria-label={`Hapus ${p.nama}`}
              onClick={(e) => hapusBaris(e.currentTarget.parentElement, () => onHapus(p))}
              className={`shrink-0 w-7 h-7 -mt-0.5 -mr-0.5 rounded-md grid place-items-center ${T.inkMuted} hover:text-[#ef4444] hover:bg-[#ef4444]/10 ${ANIM.tekan}`}
            >
              <FaTimes size={12} />
            </button>
          )}
        </div>
      ))}
    </>
  );
}
