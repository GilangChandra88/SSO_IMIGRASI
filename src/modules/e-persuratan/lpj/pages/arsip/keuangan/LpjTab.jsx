import React, { useEffect, useMemo, useRef } from 'react';
import {
  FaArchive,
  FaCheck,
  FaLayerGroup,
  FaQrcode,
  FaRegEye,
  FaSearch,
  FaTimes,
} from 'react-icons/fa';
import { STATUS_LABEL, lpjArsipStatus, lpjMatches, lpjPendingDrpp } from '../../../utils/drppLogic';
import { rupiah } from '../../../utils/lpjLogic';
import { formatTanggalPendek } from '../../../utils/formatTanggal';
import Kwitansi from '../../../components/arsip/Kwitansi';
import Pager from '../../../components/arsip/Pager';
import { StatusArsipPill } from '../../../components/arsip/ArsipPill';
import { BTN, FONT, NAVY, STATUS, T } from '@/utils/uiTokens';
import { ANIM, jedaKe } from '@/utils/animasi';

const LPJ_PAGE_SIZE = 12;

const CHIP = `px-[13px] py-[7px] rounded-full text-[12.5px] font-semibold whitespace-nowrap border border-transparent transition-colors`;
const CHIP_OFF = `${T.surface2} ${T.ink2} ${T.hoverSurfaceHover}`;
const CHIP_ON = 'bg-[#0E2340] text-[#EAF0FA] dark:bg-[#2F6FB8]';
const SELECT = `h-[38px] pl-3 pr-2 rounded-[9px] border ${T.borderStrong} ${T.surface} ${T.ink} text-[12.5px] font-semibold cursor-pointer outline-none ${T.focus} dark:[color-scheme:dark]`;
const TH = `text-left text-[11px] font-bold tracking-[.05em] uppercase px-3.5 py-3 whitespace-nowrap ${T.surface2} ${T.inkMuted}`;
const TD = `px-3.5 py-[13px] border-t text-[12.5px] align-middle ${T.border} max-md:block max-md:border-0 max-md:p-0`;
const MOBILE_LABEL = `md:hidden block text-[10px] font-bold tracking-[.06em] uppercase mb-0.5 ${T.inkMuted}`;
const CHECK = 'w-4 h-4 accent-[#0E2340] cursor-pointer disabled:cursor-not-allowed';
const BTN_SCAN = `inline-flex items-center gap-1.5 px-3 py-[7px] rounded-lg text-xs font-bold whitespace-nowrap ${NAVY.bg} ${NAVY.hoverBg} text-white`;

/**
 * Tab "Berkas LPJ" (LpjTab purwarupa): semua berkas yang sudah bernomor — pindai, lalu pilih
 * beberapa untuk dimasukkan ke DRPP.
 */
export default function LpjTab({
  rows: semua,
  drpps,
  filter,
  setFilter,
  page,
  setPage,
  selected,
  setSelected,
  assignTarget,
  onCancelAssign,
  onScan,
  onLihat,
  onGroup,
  onAssignDirect,
}) {
  const q = filter.q.trim().toLowerCase();
  const all = useMemo(
    () =>
      semua.filter((r) => {
        if (filter.type !== 'all' && (filter.type === 'perjadin') !== (r.jenis === 'Perjadin'))
          return false;
        if (filter.status !== 'all' && lpjArsipStatus(r.pack) !== filter.status) return false;
        return lpjMatches(r, q);
      }),
    [semua, filter, q],
  );

  const pages = Math.max(1, Math.ceil(all.length / LPJ_PAGE_SIZE));
  const cur = Math.min(page, pages);
  const rows = all.slice((cur - 1) * LPJ_PAGE_SIZE, cur * LPJ_PAGE_SIZE);

  // Pilihan hanya untuk berkas yang masih "Belum Masuk DRPP"
  const bolehPilih = new Set(
    semua.filter((r) => lpjArsipStatus(r.pack) === 'belum_drpp').map((r) => r.packId),
  );
  const selIds = Object.keys(selected).filter((k) => selected[k] && bolehPilih.has(k));
  const checkable = rows.filter((r) => bolehPilih.has(r.packId));
  const nChecked = checkable.filter((r) => selected[r.packId]).length;
  const allChecked = checkable.length > 0 && nChecked === checkable.length;
  const someChecked = nChecked > 0 && !allChecked;
  const checkAllRef = useRef(null);
  useEffect(() => {
    if (checkAllRef.current) checkAllRef.current.indeterminate = someChecked;
  }, [someChecked]);

  const set = (patch) => {
    setFilter({ ...filter, ...patch });
    setPage(1);
  };

  return (
    <>
      {assignTarget && (
        <div
          className={`flex flex-wrap items-center gap-2.5 rounded-xl px-4 py-[11px] mb-3.5 text-[13px] font-semibold ${STATUS.infoBg} ${STATUS.infoInk}`}
        >
          <FaArchive size={14} />
          <span>
            Memasukkan LPJ langsung ke <b className={FONT.mono}>{assignTarget}</b> — centang berkas
            lalu klik "Masukkan"
          </span>
          <button
            type="button"
            className="ml-auto inline-flex items-center gap-1 underline"
            onClick={onCancelAssign}
          >
            <FaTimes size={11} /> Batal
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <label
          className={`flex items-center gap-2 flex-[1_1_260px] min-w-[200px] h-10 px-[11px] rounded-[9px] border border-transparent ${T.surface2} ${T.inkMuted} focus-within:border-[#2A78D6] focus-within:bg-white dark:focus-within:bg-[#111D2E]`}
        >
          <FaSearch size={13} className="shrink-0" />
          <input
            type="search"
            value={filter.q}
            onChange={(e) => set({ q: e.target.value })}
            aria-label="Cari berkas LPJ"
            placeholder="Cari ID LPJ, no. kwitansi, atau uraian kegiatan…"
            className={`flex-1 min-w-0 bg-transparent border-0 outline-none text-[13.5px] ${T.ink} ${T.placeholder}`}
          />
        </label>
        <div className="flex flex-wrap gap-[7px]">
          {[
            ['all', 'Semua Jenis'],
            ['perjadin', 'Perjadin'],
            ['non-perjadin', 'Non Perjadin'],
          ].map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={`${CHIP} ${filter.type === k ? CHIP_ON : CHIP_OFF}`}
              onClick={() => set({ type: k })}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="ml-auto max-md:ml-0">
          <select
            className={SELECT}
            aria-label="Filter status"
            value={filter.status}
            onChange={(e) => set({ status: e.target.value })}
          >
            {['all', 'belum_scan', 'belum_drpp', 'masuk_drpp'].map((st) => (
              <option key={st} value={st}>
                {st === 'all' ? 'Semua Status' : STATUS_LABEL[st]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        className={`border rounded-[14px] overflow-x-auto ${T.border} max-md:border-0 max-md:overflow-visible`}
      >
        <table className="w-full border-collapse min-w-[920px] max-md:min-w-0 max-md:block">
          <thead className="max-md:hidden">
            <tr>
              <th className={`${TH} w-9`}>
                <input
                  type="checkbox"
                  ref={checkAllRef}
                  className={CHECK}
                  aria-label="Pilih semua di halaman ini"
                  disabled={checkable.length === 0}
                  checked={allChecked}
                  onChange={(e) => {
                    const next = { ...selected };
                    checkable.forEach((r) => (next[r.packId] = e.target.checked));
                    setSelected(next);
                  }}
                />
              </th>
              {[
                'ID LPJ / Kwitansi SAKTI',
                'Pelaksana',
                'Uraian',
                'Total',
                'Tgl Diarsipkan',
                'Status DRPP',
                '',
              ].map((h) => (
                <th key={h} className={TH}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="max-md:flex max-md:flex-col max-md:gap-2.5">
            {rows.length === 0 && (
              <tr className="max-md:block">
                <td colSpan={8} className="max-md:block">
                  <div className={`text-center px-2.5 py-11 text-[13.5px] ${T.inkMuted}`}>
                    <FaArchive size={30} className="block mx-auto mb-3 opacity-40" />
                    {semua.length === 0
                      ? 'Belum ada berkas LPJ bernomor. Nomor LPJ terbit setelah SPBy selesai.'
                      : 'Tidak ada berkas yang cocok dengan filter ini.'}
                  </div>
                </td>
              </tr>
            )}
            {rows.map((r, i) => {
              const st = lpjArsipStatus(r.pack);
              const pd = st === 'belum_scan' ? lpjPendingDrpp(drpps, r.pack) : null;
              return (
                <tr
                  key={r.packId}
                  className={`${T.hoverSurface2} ${ANIM.muncul} ${jedaKe(i)} max-md:relative max-md:flex max-md:flex-col max-md:gap-1.5 max-md:p-3.5 ${st === 'belum_drpp' ? 'max-md:pl-11' : ''} max-md:border max-md:rounded-[14px] ${T.border}`}
                >
                  <td className={`${TD} max-md:absolute max-md:left-3.5 max-md:top-4`}>
                    {st === 'belum_drpp' && (
                      <input
                        type="checkbox"
                        className={CHECK}
                        aria-label={`Pilih ${r.id}`}
                        checked={!!selected[r.packId]}
                        onChange={(e) => setSelected({ ...selected, [r.packId]: e.target.checked })}
                      />
                    )}
                  </td>
                  <td className={TD}>
                    <div className={`${FONT.mono} font-bold text-[12.5px] whitespace-nowrap`}>
                      {r.id}
                    </div>
                    <Kwitansi value={r.kwitansi} />
                    <div>
                      <span
                        className={`inline-block mt-1.5 text-[10.5px] font-bold tracking-[.03em] px-2 py-[3px] rounded-md border ${T.surface2} ${T.ink2} ${T.border}`}
                      >
                        {r.jenis}
                      </span>
                    </div>
                  </td>
                  <td className={TD}>
                    <span className={MOBILE_LABEL}>Pelaksana</span>
                    <span className={T.ink2}>{r.pelaksana.join(', ') || '—'}</span>
                  </td>
                  <td className={`${TD} md:max-w-[260px]`}>{r.uraian}</td>
                  <td className={`${TD} ${FONT.mono} font-semibold whitespace-nowrap`}>
                    <span className={`${MOBILE_LABEL} ${FONT.body}`}>Total</span>
                    {rupiah(r.total)}
                  </td>
                  <td className={`${TD} ${FONT.mono} whitespace-nowrap`}>
                    <span className={`${MOBILE_LABEL} ${FONT.body}`}>Tgl Diarsipkan</span>
                    {r.tanggalArsip ? formatTanggalPendek(r.tanggalArsip) : '—'}
                  </td>
                  <td className={TD}>
                    <span className={MOBILE_LABEL}>Status DRPP</span>
                    <span key={st} className={`inline-block ${ANIM.meletup}`}>
                      <StatusArsipPill status={st} drppId={r.drppId} />
                    </span>
                    {pd && (
                      <div
                        className={`flex items-center gap-1.5 mt-[5px] text-[11px] ${T.inkMuted}`}
                      >
                        <FaLayerGroup size={10} /> Otomatis masuk {pd.id} setelah discan
                      </div>
                    )}
                  </td>
                  <td className={`${TD} text-right max-md:text-left max-md:pt-1`}>
                    {st === 'belum_scan' ? (
                      <button type="button" className={BTN_SCAN} onClick={() => onScan(r)}>
                        <FaQrcode size={11} /> Scan Berkas
                      </button>
                    ) : (
                      <button type="button" className={BTN.sm} onClick={() => onLihat(r)}>
                        <FaRegEye size={12} /> Lihat
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pager
        total={all.length}
        page={cur}
        pageSize={LPJ_PAGE_SIZE}
        noun="berkas"
        onPage={setPage}
      />

      {selIds.length > 0 && (
        <div
          className={`sticky bottom-3.5 mt-4 flex flex-wrap items-center gap-3.5 rounded-[14px] px-[18px] py-3 text-white ${ANIM.naik} ${NAVY.bg} ${T.shadowMd}`}
        >
          <FaLayerGroup size={16} />
          <strong className={FONT.head}>{selIds.length} berkas dipilih</strong>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-[15px] py-[9px] rounded-[9px] border border-white/30 text-[12.5px] font-semibold hover:bg-white/10"
            onClick={() => setSelected({})}
          >
            Batal Pilih
          </button>
          <button
            type="button"
            className="ml-auto max-md:ml-0 max-md:w-full max-md:justify-center inline-flex items-center gap-2 px-[18px] py-[11px] rounded-[11px] bg-[#C9973B] hover:bg-[#A97C24] text-[#1F1606] text-[13.5px] font-bold"
            onClick={() => (assignTarget ? onAssignDirect(selIds) : onGroup(selIds))}
          >
            {assignTarget ? <FaCheck size={13} /> : <FaArchive size={13} />}
            {assignTarget ? `Masukkan ke ${assignTarget}` : 'Masukkan ke DRPP'}
          </button>
        </div>
      )}
    </>
  );
}
