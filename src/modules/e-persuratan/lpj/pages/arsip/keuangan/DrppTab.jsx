import React from 'react';
import { FaArchive, FaCheck, FaChevronRight, FaClock, FaPlus, FaSearch } from 'react-icons/fa';
import {
  DOC_KEYS,
  barisLpj,
  docsOf,
  drppMembers,
  drppProgress,
  drppStatus,
  lpjMatches,
} from '../../../utils/drppLogic';
import { rupiah } from '../../../utils/lpjLogic';
import { formatTanggalPendek } from '../../../utils/formatTanggal';
import { DrppStatusPill } from '../../../components/arsip/ArsipPill';
import { FONT, NAVY, STATUS, T } from '@/utils/uiTokens';
import { useMunculBerurutan } from '@/components/animasi';

/** Tab "Daftar DRPP" (DrppTab purwarupa): kartu per DRPP, klik → halaman detail. */
export default function DrppTab({ drpps, packs, packsById, search, setSearch, onOpen, onCreate }) {
  // Kartu DRPP muncul berurutan (diulang saat pencarian berganti)
  const daftarRef = useMunculBerurutan(`${search}|${drpps.length > 0}`);
  const q = search.trim().toLowerCase();
  const list = drpps.filter(
    (d) =>
      !q ||
      d.id.toLowerCase().includes(q) ||
      drppMembers(packs, d).some((p) => lpjMatches(barisLpj(p), q)),
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <label
          className={`flex items-center gap-2 flex-[1_1_260px] min-w-[200px] h-10 px-[11px] rounded-[9px] border border-transparent ${T.surface2} ${T.inkMuted} focus-within:border-[#2A78D6] focus-within:bg-white dark:focus-within:bg-[#111D2E]`}
        >
          <FaSearch size={13} className="shrink-0" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Cari DRPP"
            placeholder="Cari ID DRPP, ID LPJ, no. kwitansi, atau uraian…"
            className={`flex-1 min-w-0 bg-transparent border-0 outline-none text-[13.5px] ${T.ink} ${T.placeholder}`}
          />
        </label>
        <button
          type="button"
          onClick={onCreate}
          className={`ml-auto max-md:ml-0 inline-flex items-center gap-2 px-[18px] py-[11px] rounded-[11px] bg-[#0E2340] hover:bg-[#173D68] dark:bg-[#2F6FB8] dark:hover:bg-[#3C80CC] text-white font-bold text-[13.5px] whitespace-nowrap ${T.shadowSm}`}
        >
          <FaPlus size={12} /> Buat DRPP Baru
        </button>
      </div>

      <div ref={daftarRef} className="flex flex-col gap-3">
        {list.map((d) => {
          const rows = drppMembers(packs, d).map(barisLpj);
          const total = rows.reduce((s, r) => s + r.total, 0);
          const prog = drppProgress(packsById, packs, d);
          const docs = docsOf(d);
          return (
            <button
              type="button"
              key={d.id}
              data-bertahap
              onClick={() => onOpen(d.id)}
              className={`group flex flex-wrap items-center gap-3.5 w-full px-[18px] py-4 text-left border rounded-2xl transition motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[.99] ${T.border} ${T.surface} ${T.shadowSm} hover:border-[#CBD3DE] dark:hover:border-[#304864] max-md:relative max-md:pr-11`}
            >
              <span
                className={`w-11 h-11 shrink-0 rounded-xl grid place-items-center text-white ${NAVY.gradient}`}
              >
                <FaArchive size={18} />
              </span>
              <span className="flex-1 min-w-0">
                <span className={`block ${FONT.head} font-bold text-[15px] ${T.ink}`}>{d.id}</span>
                <span className={`block text-xs mt-0.5 ${T.inkMuted}`}>
                  Dibuat {formatTanggalPendek(d.tanggalDibuat)}
                  {d.dibuatOleh ? ` oleh ${d.dibuatOleh.split(',')[0]}` : ''}
                </span>
                <span className="flex flex-wrap items-center gap-1.5 mt-2">
                  {DOC_KEYS.map((k) => (
                    <span
                      key={k}
                      className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-[9px] py-[3px] rounded-full border ${
                        docs[k]
                          ? `${STATUS.doneBg} ${STATUS.doneInk} border-transparent`
                          : `${T.surface2} ${T.inkMuted} ${T.border}`
                      }`}
                    >
                      {docs[k] ? <FaCheck size={9} /> : <FaClock size={9} />} {k.toUpperCase()}
                    </span>
                  ))}
                  <DrppStatusPill status={drppStatus(packsById, packs, d)} />
                </span>
              </span>
              <span className="flex flex-col items-end gap-[3px] text-right shrink-0 max-md:w-full max-md:flex-row max-md:justify-between max-md:items-baseline max-md:text-left">
                <span className={`${FONT.mono} text-base font-semibold whitespace-nowrap ${T.ink}`}>
                  {rupiah(total)}
                </span>
                <span className={`text-xs whitespace-nowrap ${T.inkMuted}`}>
                  <b className={T.ink2}>{rows.length} LPJ</b> masuk · {prog.done}/{prog.total}{' '}
                  sesuai daftar
                </span>
              </span>
              <span
                className={`shrink-0 transition-transform motion-safe:group-hover:translate-x-0.5 ${T.inkMuted} max-md:absolute max-md:top-[22px] max-md:right-3.5`}
              >
                <FaChevronRight size={14} />
              </span>
            </button>
          );
        })}
        {list.length === 0 && (
          <div className={`text-center px-2.5 py-11 text-[13.5px] ${T.inkMuted}`}>
            <FaArchive size={30} className="block mx-auto mb-3 opacity-40" />
            {drpps.length === 0
              ? 'Belum ada DRPP dibuat.'
              : 'Tidak ada DRPP yang cocok dengan pencarian ini.'}
          </div>
        )}
      </div>
    </>
  );
}
