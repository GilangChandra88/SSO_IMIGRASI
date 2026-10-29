import React from 'react';
import { keDate } from '@/utils/nilai';
import { STATUS, T } from '@/utils/uiTokens';
import { ANIM, jedaKe } from '@/utils/animasi';
import { lpjIdOf, uraianOf } from '@/modules/e-persuratan/lpj';
import { ikonAktivitas, waktuRelatif } from '../utils/aktivitas';

/**
 * Aktivitas terakhir tiap berkas (`aktivitasTerakhir` ringkasan). `dua` = susunan dua kolom
 * kartu Aktivitas Terbaru Dashboard Keuangan; tanpa itu satu kolom (kolom samping Berkas Saya).
 */
export default function DaftarAktivitas({ aktivitas, uid, dua = false }) {
  return (
    <ul
      className={dua ? 'grid grid-cols-2 gap-x-7 gap-y-5 max-[760px]:grid-cols-1' : 'flex flex-col'}
    >
      {aktivitas.map((p, i) => {
        const a = p.aktivitasTerakhir;
        const Icon = ikonAktivitas(a.teks);
        const siapa = a.oleh && a.oleh === uid ? 'Anda' : a.olehNama || 'Seseorang';
        const berkas = lpjIdOf(p) || uraianOf(p);
        return (
          <li
            key={p.id}
            className={`flex ${dua ? 'gap-3' : 'gap-[11px] px-1 py-2.5'} ${ANIM.muncul} ${jedaKe(i)}`}
          >
            <div
              className={`shrink-0 rounded-full flex items-center justify-center ${
                dua
                  ? `w-[34px] h-[34px] ${STATUS.doneBg} ${STATUS.doneInk}`
                  : `w-7 h-7 ${T.surface2} ${T.ink2}`
              }`}
            >
              <Icon size={dua ? 13 : 12} />
            </div>
            <div className="min-w-0">
              <p className={`text-[13px] ${dua ? 'leading-normal' : 'leading-[1.45]'} ${T.ink}`}>
                {a.teks}
                {!a.teks.includes(berkas) && (
                  <>
                    {' '}
                    &middot; <strong className="font-semibold">{berkas}</strong>
                  </>
                )}
              </p>
              <p className={`text-[11.5px] mt-0.5 ${T.inkMuted}`}>
                oleh {siapa} &middot; {waktuRelatif(keDate(a.pada))}
              </p>
            </div>
          </li>
        );
      })}
      {aktivitas.length === 0 && (
        <li className={`px-1 py-2.5 text-[13px] ${T.inkMuted}`}>Belum ada aktivitas.</li>
      )}
    </ul>
  );
}
