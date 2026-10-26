import React, { useMemo } from 'react';
import { FaSearch } from 'react-icons/fa';
import { lpjMatches, lpjTakenElsewhere } from '../../../utils/drppLogic';
import Kwitansi from '../../../components/arsip/Kwitansi';
import { ADMIN, FONT, STATUS, T } from '@/utils/uiTokens';

const BADGE = 'text-[10.5px] font-bold px-2 py-[3px] rounded-md whitespace-nowrap shrink-0';

/**
 * Daftar centang LPJ untuk daftar sebuah DRPP (dipakai Buat DRPP & Edit Daftar).
 * `rows` = barisLpj semua berkas Arsip; berkas yang sudah dimuat/dicantumkan DRPP lain dinonaktifkan.
 * `selected` = { packId: true }.
 */
export default function LpjChecklist({
  rows,
  drpps,
  selected,
  onToggle,
  search,
  onSearch,
  currentDrppId,
}) {
  const q = search.trim().toLowerCase();
  const items = useMemo(
    () =>
      rows
        .filter((r) => lpjMatches(r, q))
        .map((r) => ({ r, taken: lpjTakenElsewhere(drpps, r.pack, currentDrppId) }))
        .sort((a, b) => (a.taken ? 1 : 0) - (b.taken ? 1 : 0)),
    [rows, drpps, q, currentDrppId],
  );
  // Tercentang tetapi tidak ada di daftar berkas (dokumen lpj_packs terhapus): tetap tampil agar
  // bisa dilepas, supaya DRPP tidak macet menunggu berkas yang tidak akan pernah masuk
  const rowIds = new Set(rows.map((r) => r.packId));
  const hilang = Object.keys(selected).filter((k) => selected[k] && !rowIds.has(k));
  const takenOf = Object.fromEntries(items.map(({ r, taken }) => [r.packId, taken]));
  const selCount = Object.keys(selected).filter(
    (k) => selected[k] && rowIds.has(k) && !takenOf[k],
  ).length;

  return (
    <>
      <label className={`${ADMIN.search} mb-2 w-full`}>
        <FaSearch size={13} className="shrink-0" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          aria-label="Cari LPJ"
          placeholder="Cari ID LPJ, no. kwitansi, atau uraian…"
          className={ADMIN.searchInput}
        />
      </label>
      <div className={`max-h-[260px] overflow-y-auto border rounded-[11px] p-1.5 ${T.border}`}>
        {items.length === 0 && (
          <p className={`text-xs p-2.5 ${T.inkMuted}`}>Tidak ada LPJ yang cocok.</p>
        )}
        {items.map(({ r, taken }) => {
          const checked = !!selected[r.packId];
          // Berkas milik DRPP lain tidak bisa dicentang; bila sudah tercentang (data bentrok),
          // centangnya masih bisa dilepas
          const kunci = !!taken && !checked;
          return (
            <label
              key={r.packId}
              className={`flex items-center gap-3 px-3 py-2.5 mb-1 rounded-[10px] border ${
                kunci
                  ? `opacity-55 cursor-not-allowed ${T.border}`
                  : checked
                    ? `cursor-pointer ${STATUS.infoBorder} ${STATUS.infoBg}`
                    : `cursor-pointer ${T.border} ${T.hoverSurface2}`
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={kunci}
                onChange={(e) => onToggle(r.packId, e.target.checked)}
                className="w-4 h-4 shrink-0 accent-[#0E2340] cursor-pointer disabled:cursor-not-allowed"
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
                  <span className={`${FONT.mono} font-bold ${T.ink}`}>{r.id}</span>
                  <Kwitansi value={r.kwitansi} />
                </div>
                <div className={`text-xs mt-0.5 truncate ${T.inkMuted}`}>{r.uraian}</div>
              </div>
              {taken ? (
                <span
                  className={`${BADGE} ${checked ? `${STATUS.warnBg} ${STATUS.warnInk}` : `${STATUS.infoBg} ${STATUS.infoInk}`}`}
                >
                  {checked ? `Bentrok: di ${taken}` : `Di ${taken}`}
                </span>
              ) : !r.scan ? (
                <span className={`${BADGE} ${T.surface2} ${T.ink2}`}>Belum discan</span>
              ) : (
                <span className={`${BADGE} ${STATUS.doneBg} ${STATUS.doneInk}`}>Sudah discan</span>
              )}
            </label>
          );
        })}
        {hilang.map((id) => (
          <label
            key={id}
            className={`flex items-center gap-3 px-3 py-2.5 mb-1 rounded-[10px] border cursor-pointer ${T.border}`}
          >
            <input
              type="checkbox"
              checked
              onChange={() => onToggle(id, false)}
              className="w-4 h-4 shrink-0 accent-[#0E2340] cursor-pointer"
            />
            <div className={`flex-1 min-w-0 text-[12.5px] ${STATUS.critInk}`}>
              Berkas LPJ tidak ditemukan (mungkin sudah dihapus) — lepas centang untuk mengeluarkan
            </div>
          </label>
        ))}
      </div>
      <p className={`text-[11.5px] mt-1.5 ${T.inkMuted}`}>
        {selCount} LPJ dipilih. LPJ yang belum discan tetap bisa dipilih dan otomatis masuk ke DRPP
        ini begitu discan.
      </p>
    </>
  );
}
