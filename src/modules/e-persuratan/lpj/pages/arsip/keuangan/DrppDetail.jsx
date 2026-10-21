import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  FaArchive,
  FaCheck,
  FaCircleNotch,
  FaClock,
  FaPlus,
  FaPrint,
  FaQrcode,
  FaRegEdit,
  FaRegEye,
  FaRegFileAlt,
  FaRegTrashAlt,
  FaSearch,
  FaUpload,
} from 'react-icons/fa';
import { bukaBerkas, validasiBerkas } from '../../../services/lpjStorage';
import {
  DRPP_DOCS,
  barisLpj,
  docsOf,
  drppExpectedRows,
  drppLocked,
  drppLockNote,
  drppMembers,
  drppProgress,
  drppStatus,
  lpjMatches,
} from '../../../utils/drppLogic';
import { rupiah } from '../../../utils/lpjLogic';
import { formatTanggalPendek } from '../../../utils/formatTanggal';
import Kwitansi from '../../../components/arsip/Kwitansi';
import Sorot from '../../../components/arsip/Sorot';
import Pager from '../../../components/arsip/Pager';
import ArsipPill, { DrppStatusPill } from '../../../components/arsip/ArsipPill';
import LinkBack from '../../../ui/LinkBack';
import ProgressBar from '../../../ui/ProgressBar';
import { useToast } from '@/utils/toastStore';
import { BTN, FONT, LAYOUT, NAVY, STATUS, T } from '@/utils/uiTokens';
import { ANIM, jedaKe, munculBerurutan, rayakan } from '@/utils/animasi';

const PAGE_SIZE = 10;
const SELECT = `h-[38px] pl-3 pr-2 rounded-[9px] border ${T.borderStrong} ${T.surface} ${T.ink} text-[12.5px] font-semibold cursor-pointer outline-none ${T.focus} dark:[color-scheme:dark]`;
const TH = `text-left text-[11px] font-bold tracking-[.05em] uppercase px-3.5 py-3 whitespace-nowrap ${T.surface2} ${T.inkMuted}`;
const TD = `px-3.5 py-[13px] border-t text-[12.5px] align-middle ${T.border} max-md:block max-md:border-0 max-md:p-0`;
const MOBILE_LABEL = `md:hidden block text-[10px] font-bold tracking-[.06em] uppercase mb-0.5 ${T.inkMuted}`;
const LINK = `inline-flex items-center gap-[5px] text-[12.5px] font-bold ${STATUS.infoInk} hover:underline`;

/**
 * Detail satu DRPP (DrppDetail purwarupa): dokumen (pindai), progres daftar LPJ, tabel LPJ dengan
 * cari/filter/paginasi. Dipasang dengan key={drpp.id} sehingga filter reset saat ganti DRPP.
 */
export default function DrppDetail({
  drpp: d,
  packs,
  packsById,
  onBack,
  onScanDoc,
  onEditList,
  onGoAssign,
  onLihat,
  onHapus,
}) {
  const showToast = useToast();
  const [q0, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const q = q0.trim().toLowerCase();

  const st = drppStatus(packsById, packs, d);
  // Saat dibuka, isi mengalir dari atas ke bawah; saat DRPP berubah menjadi Lengkap: stempel
  const kartuRef = useRef(null);
  useLayoutEffect(() => munculBerurutan(kartuRef.current), []);
  const stLalu = useRef(st);
  useEffect(() => {
    if (stLalu.current !== 'lengkap' && st === 'lengkap') {
      rayakan({ judul: 'DRPP Lengkap', sub: d.id, nada: 'final' });
    }
    stLalu.current = st;
  }, [st, d.id]);
  const anggota = drppMembers(packs, d);
  const total = anggota.reduce((s, p) => s + barisLpj(p).total, 0);
  const prog = drppProgress(packsById, packs, d);
  const locked = drppLocked(packsById, packs, d);
  const pct = prog.total ? Math.round((prog.done / prog.total) * 100) : 0;

  const all = useMemo(
    () =>
      drppExpectedRows(packsById, packs, d).map((e) => ({
        ...e,
        row: e.pack ? barisLpj(e.pack) : null,
        key: e.masuk ? 'masuk' : e.pack && !e.pack.arsip?.scan ? 'menunggu' : 'belum',
      })),
    [packsById, packs, d],
  );
  const cnt = { masuk: 0, menunggu: 0, belum: 0 };
  all.forEach((e) => cnt[e.key]++);
  const filtered = all.filter((e) => {
    if (status !== 'all' && e.key !== status) return false;
    return !q || (e.row ? lpjMatches(e.row, q, true) : e.packId.toLowerCase().includes(q));
  });
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const pageRows = filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

  const cetak = (file) => {
    bukaBerkas(file);
    showToast('Berkas dibuka di tab baru — cetak dari penampil (Ctrl+P).');
  };

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <LinkBack onClick={onBack}>Kembali ke Daftar DRPP</LinkBack>
        {onHapus && (
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg border text-[12.5px] cursor-pointer ${T.surface} ${T.border} ${STATUS.critInk} ${T.hoverSurface2}`}
            onClick={() => onHapus(d)}
          >
            <FaRegTrashAlt size={12} /> Hapus DRPP
          </button>
        )}
      </div>
      <section ref={kartuRef} className={LAYOUT.card}>
        <div
          data-bertahap
          className={`flex flex-wrap items-center gap-3.5 pb-[18px] mb-[18px] border-b ${T.border}`}
        >
          <span
            className={`w-11 h-11 shrink-0 rounded-xl grid place-items-center text-white ${NAVY.gradient}`}
          >
            <FaArchive size={18} />
          </span>
          <div className="flex-1 min-w-[200px]">
            <div className={`${FONT.head} font-bold text-lg ${T.ink}`}>{d.id}</div>
            <div className={`text-xs mt-0.5 ${T.inkMuted}`}>
              Dibuat {formatTanggalPendek(d.tanggalDibuat)}
              {d.dibuatOleh ? ` oleh ${d.dibuatOleh.split(',')[0]}` : ''}
            </div>
            <div className="mt-2">
              <span key={st} className={`inline-block ${ANIM.meletup}`}>
                <DrppStatusPill status={st} />
              </span>
            </div>
            {prog.total > 0 && (
              <ProgressBar
                value={pct}
                className={`mt-2.5 h-1.5 w-full max-w-[320px] rounded-md ${T.surface2} [&::-webkit-progress-bar]:bg-[#F3F5F8] dark:[&::-webkit-progress-bar]:bg-[#16243A] [&::-webkit-progress-value]:bg-[#147C55] [&::-moz-progress-bar]:bg-[#147C55] dark:[&::-webkit-progress-value]:bg-[#4FD39B] dark:[&::-moz-progress-bar]:bg-[#4FD39B]`}
              />
            )}
          </div>
          <div className="flex flex-col items-end gap-[3px] text-right shrink-0">
            <span className={`${FONT.mono} text-base font-semibold whitespace-nowrap ${T.ink}`}>
              {rupiah(total)}
            </span>
            <span className={`text-xs whitespace-nowrap ${T.inkMuted}`}>
              <b className={T.ink2}>{anggota.length} LPJ</b> masuk · {prog.done}/{prog.total} sesuai
              daftar
            </span>
          </div>
        </div>

        <div className={`${LAYOUT.label} mb-2.5`}>Dokumen DRPP</div>
        <div className="flex flex-col gap-2">
          {DRPP_DOCS.map(({ key, label }) => (
            <BarisDokumen
              key={key}
              label={label}
              file={docsOf(d)[key]}
              onScan={(f) => onScanDoc(d, key, f)}
              onLihat={bukaBerkas}
              onCetak={cetak}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3 mt-6 mb-3">
          <div>
            <h2 className={`${FONT.head} text-[15px] font-bold ${T.ink}`}>
              Berkas LPJ dalam DRPP ini
            </h2>
            <p className={`text-[12.5px] mt-0.5 ${T.inkMuted}`}>
              {prog.done} dari {prog.total} LPJ pada daftar sudah masuk
            </p>
          </div>
          {!locked && (
            <div className="flex flex-wrap gap-3.5">
              <button type="button" className={LINK} onClick={() => onEditList(d)}>
                <FaRegEdit size={12} /> Edit Daftar
              </button>
              <button type="button" className={LINK} onClick={() => onGoAssign(d.id)}>
                <FaPlus size={11} /> Masukkan LPJ ke DRPP Ini
              </button>
            </div>
          )}
        </div>
        {locked && (
          <div
            className={`flex items-center gap-2.5 mb-3.5 px-3.5 py-[11px] rounded-[11px] text-[12.5px] font-semibold ${ANIM.meletup} ${STATUS.goodBg} ${STATUS.goodInk}`}
          >
            <FaCheck size={13} className="shrink-0" />
            <span>{drppLockNote(packsById, packs, d)}</span>
          </div>
        )}

        {prog.total === 0 ? (
          <p className={`text-[12.5px] ${T.inkMuted}`}>Daftar LPJ untuk DRPP ini belum diisi.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2.5 mb-3.5">
              <label
                className={`flex items-center gap-2 flex-[1_1_260px] min-w-[200px] h-10 px-[11px] rounded-[9px] border border-transparent ${T.surface2} ${T.inkMuted} focus-within:border-[#2A78D6] focus-within:bg-white dark:focus-within:bg-[#111D2E]`}
              >
                <FaSearch size={13} className="shrink-0" />
                <input
                  type="search"
                  value={q0}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Cari LPJ di DRPP ini"
                  placeholder="Cari di DRPP ini: ID LPJ, no. kwitansi, uraian, atau pelaksana…"
                  className={`flex-1 min-w-0 bg-transparent border-0 outline-none text-[13.5px] ${T.ink} ${T.placeholder}`}
                />
              </label>
              <select
                className={`${SELECT} ml-auto max-md:ml-0`}
                aria-label="Filter status LPJ"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">Semua Status ({all.length})</option>
                <option value="masuk">Sudah Masuk ({cnt.masuk})</option>
                <option value="menunggu">Menunggu Scan ({cnt.menunggu})</option>
                <option value="belum">Belum Masuk ({cnt.belum})</option>
              </select>
            </div>
            <div
              className={`border rounded-[14px] overflow-x-auto ${T.border} max-md:border-0 max-md:overflow-visible`}
            >
              <table className="w-full border-collapse min-w-[860px] max-md:min-w-0 max-md:block">
                <thead className="max-md:hidden">
                  <tr>
                    {['ID LPJ / Kwitansi SAKTI', 'Uraian', 'Pelaksana', 'Total', 'Status', ''].map(
                      (h) => (
                        <th key={h} className={TH}>
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="max-md:flex max-md:flex-col max-md:gap-2.5">
                  {pageRows.length === 0 && (
                    <tr className="max-md:block">
                      <td colSpan={6} className="max-md:block">
                        <div className={`text-center px-2.5 py-11 text-[13.5px] ${T.inkMuted}`}>
                          Tidak ada LPJ yang cocok dengan pencarian ini.
                        </div>
                      </td>
                    </tr>
                  )}
                  {pageRows.map((e, i) => {
                    const r = e.row;
                    return (
                      <tr
                        key={e.packId}
                        className={`${T.hoverSurface2} ${ANIM.muncul} ${jedaKe(i)} max-md:flex max-md:flex-col max-md:gap-1.5 max-md:p-3.5 max-md:border max-md:rounded-[14px] ${T.border}`}
                      >
                        <td className={TD}>
                          <div className={`${FONT.mono} font-bold text-[12.5px] whitespace-nowrap`}>
                            <Sorot text={r ? r.id : e.packId} q={q} />
                          </div>
                          {r && <Kwitansi value={r.kwitansi} />}
                        </td>
                        <td className={`${TD} md:min-w-[220px]`}>
                          {r ? (
                            <Sorot text={r.uraian} q={q} />
                          ) : (
                            <span className={STATUS.critInk}>(Berkas LPJ tidak ditemukan)</span>
                          )}
                        </td>
                        <td className={TD}>
                          <span className={MOBILE_LABEL}>Pelaksana</span>
                          <span className={T.ink2}>{r ? r.pelaksana.join(', ') : '—'}</span>
                        </td>
                        <td className={`${TD} ${FONT.mono} font-semibold whitespace-nowrap`}>
                          <span className={`${MOBILE_LABEL} ${FONT.body}`}>Total</span>
                          {r ? rupiah(r.total) : '—'}
                        </td>
                        <td className={TD}>
                          <span className={MOBILE_LABEL}>Status</span>
                          {e.key === 'masuk' ? (
                            <ArsipPill tone="good" icon={FaCheck}>
                              Sudah Masuk
                            </ArsipPill>
                          ) : e.key === 'menunggu' ? (
                            <ArsipPill tone="neutral" icon={FaQrcode}>
                              Menunggu Scan
                            </ArsipPill>
                          ) : (
                            <ArsipPill tone="warn" icon={FaClock}>
                              Belum Masuk
                            </ArsipPill>
                          )}
                        </td>
                        <td className={`${TD} text-right max-md:text-left`}>
                          {e.masuk && (
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
              total={filtered.length}
              page={cur}
              pageSize={PAGE_SIZE}
              noun="LPJ"
              onPage={setPage}
            />
          </>
        )}
      </section>
    </>
  );
}

/** Satu baris dokumen DRPP/SPM/SP2D: Lihat/Cetak bila sudah dipindai, "Scan Sekarang" bila belum. */
function BarisDokumen({ label, file, onScan, onLihat, onCetak }) {
  const ref = useRef(null);
  const showToast = useToast();
  const [busy, setBusy] = useState(false);

  async function pilih(f) {
    if (!f) return;
    const pesan = validasiBerkas(f);
    if (pesan) {
      showToast(pesan, 'error');
      return;
    }
    setBusy(true);
    await onScan(f);
    setBusy(false);
  }

  return (
    <div
      data-bertahap
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-3.5 py-3 rounded-[11px] border ${T.border} ${T.surface}`}
    >
      <input
        ref={ref}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          pilih(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <div
        key={file ? 'ada' : 'belum'}
        className={`w-[34px] h-[34px] shrink-0 rounded-[9px] grid place-items-center ${ANIM.meletup} ${
          file ? `${STATUS.goodBg} ${STATUS.goodInk}` : `${T.surface2} ${T.inkMuted}`
        }`}
      >
        {file ? <FaCheck size={14} /> : <FaRegFileAlt size={14} />}
      </div>
      <div className="flex-1 min-w-[180px]">
        <div className={`text-[13px] font-semibold ${T.ink}`}>{label}</div>
        <div className={`text-[11px] mt-px break-all ${T.inkMuted}`}>
          {file ? file.name : 'Belum di-scan'}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        {file ? (
          <>
            <button type="button" className={BTN.sm} onClick={() => onLihat(file)}>
              <FaRegEye size={12} /> Lihat
            </button>
            <button type="button" className={BTN.sm} onClick={() => onCetak(file)}>
              <FaPrint size={12} /> Cetak
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => ref.current?.click()}
            className={`inline-flex items-center gap-1.5 px-3 py-[7px] rounded-lg text-xs font-bold whitespace-nowrap ${NAVY.bg} ${NAVY.hoverBg} text-white disabled:opacity-50`}
          >
            {busy ? <FaCircleNotch size={11} className="animate-spin" /> : <FaUpload size={11} />}
            {busy ? 'Mengunggah…' : 'Scan Sekarang'}
          </button>
        )}
      </div>
    </div>
  );
}
