/**
 * SuratNode — Komponen Node di Flow Diagram
 * ===========================================
 * Satu node merepresentasikan satu jenis surat.
 * Menampilkan: nama, kode, kategori, status aktif, dan badge load (jumlah instance).
 */

import React from 'react';

const NODE_W = 192;
const NODE_H = 100;

/**
 * @param {{
 *   surat: object,
 *   x: number,
 *   y: number,
 *   isSelected: boolean,
 *   onSelect: () => void,
 *   onDragStart: (e: MouseEvent) => void
 * }} props
 */
export default function SuratNode({ surat, x, y, isSelected, onSelect, onDragStart }) {
  const connCount = surat.connections?.length || 0;
  const activeCount = surat.stats?.active || 0;
  const monthCount = surat.stats?.thisMonth || 0;

  return (
    <foreignObject
      x={x}
      y={y}
      width={NODE_W}
      height={NODE_H}
      style={{ overflow: 'visible', cursor: 'grab' }}
      onMouseDown={onDragStart}
      onClick={onSelect}
    >
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        className={`
          w-full h-full rounded-2xl border-2 bg-white dark:bg-slate-800 select-none
          transition-all duration-150 flex flex-col justify-between p-3
          ${
            isSelected
              ? 'border-indigo-500 shadow-xl shadow-indigo-200/60'
              : 'border-slate-200 dark:border-slate-700 shadow-md hover:border-indigo-300 hover:shadow-indigo-100/60'
          }
        `}
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        {/* ── Header: icon + kode + status dot ── */}
        <div className="flex items-start gap-2">
          <span className="text-lg leading-none mt-0.5 shrink-0">{surat.icon || '📄'}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <p
                className="text-[9px] font-bold uppercase tracking-wider leading-tight"
                style={{ color: surat.warna || '#6366f1' }}
              >
                {surat.kode}
              </p>
              {/* Status dot */}
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  surat.status === 'active'
                    ? 'bg-emerald-400'
                    : surat.status === 'draft'
                      ? 'bg-amber-400'
                      : 'bg-slate-300'
                }`}
              />
            </div>
            <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100 leading-tight line-clamp-2">
              {surat.nama}
            </p>
          </div>
        </div>

        {/* ── Footer: kategori + load badges ── */}
        <div className="flex items-center justify-between mt-2 gap-1">
          <span
            className="text-[8px] font-bold px-1.5 py-0.5 rounded-full text-white truncate max-w-[90px]"
            style={{ backgroundColor: surat.warna || '#6366f1' }}
          >
            {surat.kategori}
          </span>

          <div className="flex items-center gap-1 shrink-0">
            {/* Badge: sedang berjalan (aktif) */}
            {activeCount > 0 && (
              <span
                className="flex items-center gap-0.5 bg-amber-50 border border-amber-200 text-amber-700
                               text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                title={`${activeCount} surat sedang berjalan`}
              >
                ⚡ {activeCount}
              </span>
            )}
            {/* Badge: dibuat bulan ini */}
            {monthCount > 0 && (
              <span
                className="flex items-center bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400
                               text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                title={`${monthCount} dibuat bulan ini`}
              >
                {monthCount}×
              </span>
            )}
            {/* Badge: jumlah koneksi */}
            {connCount > 0 && (
              <span
                className="bg-indigo-50 text-indigo-400 text-[9px] font-semibold
                               px-1.5 py-0.5 rounded-full"
                title={`${connCount} koneksi`}
              >
                ⇢{connCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </foreignObject>
  );
}

export { NODE_W, NODE_H };
