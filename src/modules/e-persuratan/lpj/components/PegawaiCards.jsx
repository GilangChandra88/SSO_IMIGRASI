import React from 'react';
import { T } from '@/utils/uiTokens';

/** Kartu data pelaksana hanya-baca: Nama · NIP · Pangkat/Gol · Jabatan. */
export default function PegawaiCards({ list }) {
  return (
    <>
      {list.map((p) => (
        <div
          key={p.id}
          className={`grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 mb-2 rounded-lg border text-[12.5px] font-semibold ${T.surface2} ${T.border} ${T.ink}`}
        >
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
      ))}
    </>
  );
}
