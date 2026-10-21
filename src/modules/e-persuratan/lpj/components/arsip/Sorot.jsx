import React from 'react';
import { STATUS } from '@/utils/uiTokens';

/** Menyorot kata kunci pencarian `q` (huruf kecil) di dalam `text`. */
export default function Sorot({ text, q }) {
  const s = String(text || '');
  const i = q ? s.toLowerCase().indexOf(q) : -1;
  if (i < 0) return s;
  return (
    <>
      {s.slice(0, i)}
      <mark className={`${STATUS.warnBg} text-inherit rounded-[3px] px-px`}>
        {s.slice(i, i + q.length)}
      </mark>
      {s.slice(i + q.length)}
    </>
  );
}
