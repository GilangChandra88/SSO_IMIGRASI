import React from 'react';
import { pecahKwitansi } from '../../utils/drppLogic';
import { FONT, GOLD } from '@/utils/uiTokens';

const BOX = `inline-flex items-baseline mt-[5px] px-[7px] py-0.5 rounded-md whitespace-nowrap ${FONT.mono} text-[11.5px] font-medium ${GOLD.tintBg} ${GOLD.text}`;

/** No. kwitansi SAKTI "01456/KW/693459/2026": nomor urut & tahun ditebalkan (hanya itu yang berubah). */
export default function Kwitansi({ value }) {
  if (!value) return null;
  const p = pecahKwitansi(value);
  if (!p) return <span className={BOX}>{value}</span>;
  return (
    <span className={BOX}>
      <b className={`font-bold ${GOLD.strongText}`}>{p[0]}</b>/{p[1]}/{p[2]}/
      <b className={`font-bold ${GOLD.strongText}`}>{p[3]}</b>
    </span>
  );
}
