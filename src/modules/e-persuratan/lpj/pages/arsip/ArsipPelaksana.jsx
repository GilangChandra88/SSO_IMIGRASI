/**
 * Arsip untuk pelaksana (ArsipPelaksana purwarupa) — DRPP yang memuat LPJ milik pengguna, dengan
 * dokumen DRPP/SPM/SP2D dan daftar LPJ-nya; hanya melihat/mencetak. Rute /e-persuratan/arsip
 * (daftar) dan /e-persuratan/arsip/:drppId (detail) memakai satu komponen ini sehingga filter
 * tetap tersimpan saat kembali dari detail.
 *
 * Sumber data (per tahun anggaran): ringkasan berkas yang mencantumkan pengguna dan sudah masuk
 * DRPP (`lpj_ringkas`, tahap `selesai`) digabung dengan DRPP yang memuat berkasnya (`lpj_drpp`).
 * Pindaian berkas (`keuangan/status.arsip.berkas`) baru dibaca saat dibuka/dicetak.
 */

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FaArchive,
  FaCheck,
  FaChevronRight,
  FaPrint,
  FaRegEye,
  FaRegFileAlt,
  FaSearch,
  FaTimes,
} from 'react-icons/fa';
import { useDaftarBerkas, useDaftarDrpp } from '../../hooks/useBerkas';
import { useLpjUser } from '../../hooks/useLpjUser';
import { ambilBerkasArsip, ambilDrpp } from '../../services/keuanganDb';
import { DRPP_DOCS, drppListForPelaksana, lpjMatches, pelaksanaText } from '../../utils/drppLogic';
import { rupiah } from '../../utils/lpjLogic';
import { formatTanggalPendek } from '../../utils/formatTanggal';
import { daftarTahun } from '../../../tahunAnggaran';
import Kwitansi from '../../components/arsip/Kwitansi';
import Sorot from '../../components/arsip/Sorot';
import Pager from '../../components/arsip/Pager';
import DrppDocChips from '../../components/arsip/DrppDocChips';
import LinkBack from '../../ui/LinkBack';
import ArsipLpjModal from './ArsipLpjModal';
import { bukaBerkas, pesanGagalUnggah } from '@/utils/berkasStorage';
import { tahunIni } from '@/utils/nilai';
import { useToast } from '@/utils/toastStore';
import { BTN, FONT, LAYOUT, NAVY, STATUS, T } from '@/utils/uiTokens';
import { ANIM, jedaKe, munculBerurutan } from '@/utils/animasi';
import { useMunculBerurutan } from '@/components/animasi';

const BULAN = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];
const PAGE_SIZE = 10;
const FILTER_AWAL = { q: '', bulan: 'all', urut: 'terbaru' };

const sumTotal = (rows) => rows.reduce((s, r) => s + r.total, 0);
const lpjMatch = (r, q) => lpjMatches(r, q, true);

// Kelas bersama (.ar-* purwarupa)
const SEARCH = `flex items-center gap-2 flex-[1_1_280px] min-w-[200px] h-10 px-[11px] rounded-[9px] border border-transparent ${T.surface2} ${T.inkMuted} focus-within:border-[#2A78D6] focus-within:bg-white dark:focus-within:bg-[#111D2E]`;
const SEARCH_INPUT = `flex-1 min-w-0 bg-transparent border-0 outline-none text-[13.5px] ${T.ink} ${T.placeholder}`;
const SELECT = `h-10 pl-3 pr-2 rounded-[9px] border ${T.borderStrong} ${T.surface} ${T.ink} text-[12.5px] font-semibold cursor-pointer outline-none ${T.focus} dark:[color-scheme:dark] max-md:flex-1 max-md:min-w-0`;
const ICON_BOX = `w-11 h-11 shrink-0 rounded-xl grid place-items-center text-white ${NAVY.gradient}`;
const AMT = `${FONT.mono} text-base font-semibold whitespace-nowrap`;
const ROW_BTN = `${BTN.sm} max-md:flex-1 max-md:justify-center max-md:py-2.5`;
const MOBILE_LABEL = `md:hidden block text-[10px] font-bold tracking-[.06em] uppercase mb-0.5 ${T.inkMuted}`;
// Sel tabel; di layar sempit (< md) tiap baris tampil sebagai kartu
const TD = `px-3.5 py-[13px] border-t text-[12.5px] align-middle ${T.border} max-md:block max-md:border-0 max-md:p-0`;

export default function ArsipPelaksana() {
  const navigate = useNavigate();
  // Detail di /arsip/drpp/:id (sama dengan tampilan Keuangan, jadi tautan & ganti peran tetap cocok)
  const parts = (useParams()['*'] || '').split('/').filter(Boolean);
  const drppId = parts[0] === 'drpp' && parts[1] ? decodeURIComponent(parts[1]) : '';
  const { uid } = useLpjUser();
  const [tahun, setTahun] = useState(tahunIni);
  // Hanya berkas yang mencantumkan pengguna (pembuat atau pelaksana) dan sudah masuk DRPP
  const daftar = useDaftarBerkas({ uid, tahunAnggaran: tahun, tahap: 'selesai' });
  const {
    list,
    memuat: memuatDrpp,
    galat: galatDrpp,
  } = useDaftarDrpp({
    uid,
    tahunAnggaran: tahun,
  });
  const [filters, setFilters] = useState(FILTER_AWAL);
  const drppList = useMemo(() => drppListForPelaksana(list, daftar.berkas), [list, daftar.berkas]);

  const loading = daftar.memuat || memuatDrpp;
  const error = daftar.galat || galatDrpp;
  const detail = drppId ? drppList.find((d) => d.id === drppId) : null;
  const adaDetail = !!detail;

  // Tautan langsung ke DRPP tahun anggaran lain: baca DRPP-nya sekali lalu pindah tahun
  const dicari = useRef('');
  useEffect(() => {
    if (!drppId || loading || error || adaDetail || dicari.current === drppId) return;
    dicari.current = drppId;
    ambilDrpp(drppId).then(
      (d) => d?.tahunAnggaran && d.tahunAnggaran !== tahun && setTahun(d.tahunAnggaran),
      () => {},
    );
  }, [drppId, loading, error, adaDetail, tahun]);

  return (
    <div className={`min-h-full ${T.ground}`}>
      <div className={LAYOUT.page}>
        <h1 className={LAYOUT.h1}>Arsip</h1>
        <p className={LAYOUT.sub}>
          Berkas DRPP yang memuat LPJ Anda — buka untuk melihat atau mencetak dokumennya
        </p>

        {error && (
          <p
            className={`mt-4 rounded-[10px] px-3.5 py-3 text-[12.5px] ${STATUS.critBg} ${STATUS.critInk}`}
          >
            Arsip tidak dapat dimuat. Muat ulang halaman; bila berulang, hubungi admin.
          </p>
        )}

        {error ? null : loading ? (
          <div className={`${LAYOUT.card} mt-[18px] animate-pulse space-y-3`}>
            <div className={`h-10 rounded-[9px] ${T.surface2}`} />
            {[1, 2, 3].map((i) => (
              <div key={i} className={`h-24 rounded-2xl ${T.surface2}`} />
            ))}
          </div>
        ) : drppId ? (
          detail ? (
            <ArsipDetail
              key={detail.id}
              drpp={detail}
              onBack={() => navigate('/e-persuratan/arsip')}
            />
          ) : (
            <div className={`${LAYOUT.card} mt-[18px]`}>
              <LinkBack onClick={() => navigate('/e-persuratan/arsip')}>Kembali ke Arsip</LinkBack>
              <p className={`text-center py-9 text-[13.5px] ${T.inkMuted}`}>
                DRPP tidak ditemukan atau tidak memuat LPJ Anda.
              </p>
            </div>
          )
        ) : (
          <ArsipList
            drppList={drppList}
            filters={filters}
            setFilters={setFilters}
            tahun={tahun}
            setTahun={setTahun}
            lanjutan={daftar}
            onOpen={(id) => navigate('/e-persuratan/arsip/drpp/' + encodeURIComponent(id))}
          />
        )}
      </div>
    </div>
  );
}

/* ───────────── DAFTAR DRPP ───────────── */
function ArsipList({ drppList, filters, setFilters, tahun, setTahun, lanjutan, onOpen }) {
  const { q, bulan, urut } = filters;
  const query = q.trim().toLowerCase();
  const set = (patch) => setFilters({ ...filters, ...patch });
  const filtered = !!(query || bulan !== 'all');

  const items = useMemo(() => {
    const out = [];
    drppList.forEach((d) => {
      let rows = d.lpj;
      if (bulan !== 'all') rows = rows.filter((r) => r.tanggalLPJ.slice(5, 7) === bulan);
      if (!rows.length) return;
      const idHit = query && d.id.toLowerCase().includes(query);
      if (query && !idHit) {
        rows = rows.filter((r) => lpjMatch(r, query));
        if (!rows.length) return;
      }
      out.push({ d, rows, showMatches: (query && !idHit) || bulan !== 'all' });
    });
    out.sort((a, b) => {
      const c = a.d.tanggalDibuat.localeCompare(b.d.tanggalDibuat) || a.d.id.localeCompare(b.d.id);
      return urut === 'terlama' ? c : -c;
    });
    return out;
  }, [drppList, query, bulan, urut]);

  const nLpj = items.reduce((s, it) => s + it.rows.length, 0);
  // Kartu DRPP muncul berurutan (diulang saat filter berganti)
  const daftarRef = useMunculBerurutan(`${query}|${bulan}|${tahun}|${urut}|${items.length > 0}`);

  return (
    <div className={`${LAYOUT.card} mt-[18px]`}>
      <div className="flex flex-wrap items-center gap-2.5 mb-3.5">
        <label className={SEARCH}>
          <FaSearch size={13} className="shrink-0" />
          <input
            type="search"
            value={q}
            onChange={(e) => set({ q: e.target.value })}
            aria-label="Cari arsip"
            placeholder="Cari kegiatan, ID LPJ, no. kwitansi, ID DRPP, atau nama rekan…"
            className={SEARCH_INPUT}
          />
        </label>
        <div className="flex gap-2.5 ml-auto max-md:ml-0 max-md:w-full max-md:gap-2">
          <select
            className={SELECT}
            aria-label="Filter bulan"
            value={bulan}
            onChange={(e) => set({ bulan: e.target.value })}
          >
            <option value="all">Bulan</option>
            {BULAN.map((n, i) => (
              <option key={n} value={String(i + 1).padStart(2, '0')}>
                {n}
              </option>
            ))}
          </select>
          <select
            className={SELECT}
            aria-label="Tahun anggaran"
            value={tahun}
            onChange={(e) => setTahun(Number(e.target.value))}
          >
            {daftarTahun().map((t) => (
              <option key={t} value={t}>
                TA {t}
              </option>
            ))}
          </select>
          <select
            className={SELECT}
            aria-label="Urutkan"
            value={urut}
            onChange={(e) => set({ urut: e.target.value })}
          >
            <option value="terbaru">Terbaru</option>
            <option value="terlama">Terlama</option>
          </select>
        </div>
      </div>

      <div
        className={`flex flex-wrap items-center justify-between gap-2.5 mb-3.5 text-[12.5px] ${T.inkMuted}`}
      >
        <span>
          <b className={T.ink2}>{items.length} DRPP</b> · {nLpj} LPJ Anda
          {filtered ? ' cocok dengan filter' : ''}
        </span>
        {filtered && (
          <button
            type="button"
            className={`inline-flex items-center gap-[5px] text-[12.5px] font-bold ${T.ink2} hover:text-[#101A2C] dark:hover:text-[#EAF0F8]`}
            onClick={() => setFilters({ ...filters, q: '', bulan: 'all' })}
          >
            <FaTimes size={11} /> Reset filter
          </button>
        )}
      </div>

      <div ref={daftarRef} className="flex flex-col gap-3">
        {items.map(({ d, rows, showMatches }) => (
          <div
            key={d.id}
            data-bertahap
            className={`border rounded-2xl overflow-hidden transition motion-safe:hover:-translate-y-0.5 ${T.border} ${T.surface} hover:border-[#CBD3DE] dark:hover:border-[#304864] hover:shadow-[0_4px_14px_rgba(15,32,64,.06)]`}
          >
            <button
              type="button"
              onClick={() => onOpen(d.id)}
              className="group flex items-center gap-3.5 w-full px-[18px] py-4 text-left max-md:flex-wrap max-md:relative max-md:pr-11"
            >
              <div className={ICON_BOX}>
                <FaArchive size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`${FONT.head} font-bold text-[15px] ${T.ink}`}>{d.id}</div>
                <div className={`text-xs mt-0.5 ${T.inkMuted}`}>
                  Dibuat {formatTanggalPendek(d.tanggalDibuat)}
                </div>
                <DrppDocChips docs={d.docs} />
              </div>
              <div
                className={`flex flex-col items-end gap-[3px] text-right shrink-0 max-md:order-5 max-md:w-full max-md:flex-row max-md:justify-between max-md:items-baseline max-md:pt-2.5 max-md:border-t max-md:border-dashed max-md:text-left ${T.border}`}
              >
                <span className={`${AMT} ${T.ink} max-md:order-2`}>{rupiah(sumTotal(rows))}</span>
                <span className={`text-xs whitespace-nowrap ${T.inkMuted}`}>
                  <b className={T.ink2}>{rows.length} LPJ</b> milik Anda
                </span>
              </div>
              <span
                className={`shrink-0 transition-transform motion-safe:group-hover:translate-x-0.5 ${T.inkMuted} max-md:absolute max-md:top-[22px] max-md:right-3.5`}
              >
                <FaChevronRight size={14} />
              </span>
            </button>
            {showMatches && (
              <button
                type="button"
                onClick={() => onOpen(d.id)}
                className={`flex flex-col gap-[7px] w-full text-left border-t border-dashed pl-[76px] pr-[18px] pt-2.5 pb-3.5 max-md:px-3.5 ${T.border} ${T.surface2}`}
              >
                {rows.slice(0, 3).map((r) => (
                  <div key={r.id} className="flex flex-wrap items-baseline gap-2.5 text-[12.5px]">
                    <span className={`${FONT.mono} font-bold whitespace-nowrap ${T.ink}`}>
                      <Sorot text={r.id} q={query} />
                    </span>
                    <span className={`flex-[1_1_220px] min-w-0 ${T.ink}`}>
                      <Sorot text={r.uraian} q={query} />
                    </span>
                    <span className={`${FONT.mono} text-[11.5px] whitespace-nowrap ${T.inkMuted}`}>
                      {rupiah(r.total)}
                    </span>
                  </div>
                ))}
                {rows.length > 3 && (
                  <div className={`text-[11.5px] font-bold ${T.inkMuted}`}>
                    + {rows.length - 3} LPJ lainnya — buka untuk melihat semua
                  </div>
                )}
              </button>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <div className={`text-center px-2.5 py-11 text-[13.5px] ${T.inkMuted}`}>
            <FaSearch size={30} className="block mx-auto mb-3 opacity-40" />
            {drppList.length === 0
              ? `Belum ada berkas LPJ Anda yang masuk DRPP pada TA ${tahun}.`
              : 'Tidak ada berkas yang cocok. Coba kata kunci lain atau reset filter.'}
          </div>
        )}
      </div>
      {lanjutan.bisaLagi && (
        <div className="flex flex-col items-center gap-1.5 mt-3.5">
          <span className={`text-xs ${T.inkMuted}`}>Sebagian berkas lama belum dimuat.</span>
          <button
            type="button"
            className={BTN.sm}
            onClick={lanjutan.muatLagi}
            disabled={lanjutan.memuatLagi}
          >
            {lanjutan.memuatLagi ? 'Memuat…' : 'Muat lebih banyak'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ───────────── DETAIL DRPP ───────────── */
function ArsipDetail({ drpp, onBack }) {
  const showToast = useToast();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [lihatId, setLihatId] = useState(null);
  // Saat DRPP dibuka, isinya mengalir dari atas ke bawah
  const kartuRef = useRef(null);
  useLayoutEffect(() => munculBerurutan(kartuRef.current), []);
  const query = q.trim().toLowerCase();

  const rows = useMemo(() => [...drpp.lpj].sort((a, b) => a.id.localeCompare(b.id)), [drpp]);
  const filtered = useMemo(() => rows.filter((r) => lpjMatch(r, query)), [rows, query]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const pageRows = filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);
  // Ambil baris terbaru dari data langsung supaya modal ikut ter-update
  const lihat = lihatId ? rows.find((r) => r.id === lihatId) : null;

  const gagalBuka = (err) => showToast(pesanGagalUnggah(err, 'Berkas gagal dibuka.'), 'error');
  const lihatFile = (file) => bukaBerkas(file).catch(gagalBuka);
  const cetakFile = (file) =>
    bukaBerkas(file).then((dibuka) => {
      if (dibuka) showToast('Berkas dibuka di tab baru — cetak dari penampil (Ctrl+P).');
      return dibuka;
    }, gagalBuka);

  // Pindaian dibaca saat ditekan (1 dokumen); tab dibuka saat itu juga supaya tidak diblokir
  const cetakLpj = (r) =>
    cetakFile(ambilBerkasArsip(r.packId)).then((dibuka) => {
      if (dibuka !== false) return;
      setLihatId(r.id);
      showToast('Scan dari Keuangan belum ada. Cetak dokumen satu per satu dari daftar ini.');
    });

  return (
    <>
      <div className="mt-[18px]">
        <LinkBack onClick={onBack}>Kembali ke Arsip</LinkBack>
      </div>
      <div ref={kartuRef} className={LAYOUT.card}>
        <div
          data-bertahap
          className={`flex flex-wrap items-center gap-3.5 pb-[18px] mb-[18px] border-b ${T.border}`}
        >
          <div className={ICON_BOX}>
            <FaArchive size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className={`${FONT.head} font-bold text-lg ${T.ink}`}>{drpp.id}</div>
            <div className={`text-xs mt-0.5 ${T.inkMuted}`}>
              Dibuat {formatTanggalPendek(drpp.tanggalDibuat)}
            </div>
          </div>
          <div className="flex flex-col items-end gap-[3px] text-right shrink-0">
            <span className={`${AMT} ${T.ink}`}>{rupiah(sumTotal(rows))}</span>
            <span className={`text-xs whitespace-nowrap ${T.inkMuted}`}>
              <b className={T.ink2}>{rows.length} LPJ</b> milik Anda
            </span>
          </div>
        </div>

        <div className={`${LAYOUT.label} mb-2.5`}>Dokumen DRPP</div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
          {DRPP_DOCS.map(({ key, label }) => {
            const file = drpp.docs[key];
            return (
              <div
                key={key}
                data-bertahap
                className={`flex flex-wrap gap-x-3 gap-y-2.5 px-3.5 py-3 rounded-[11px] border ${T.border} ${T.surface}`}
              >
                <div
                  className={`w-[34px] h-[34px] shrink-0 rounded-[9px] grid place-items-center ${
                    file ? `${STATUS.doneBg} ${STATUS.doneInk}` : `${T.surface2} ${T.inkMuted}`
                  }`}
                >
                  {file ? <FaCheck size={14} /> : <FaRegFileAlt size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-[13px] font-semibold ${T.ink}`}>{label}</div>
                  <div className={`text-[11px] mt-px break-all ${T.inkMuted}`}>
                    {file ? file.nama : 'Belum tersedia'}
                  </div>
                </div>
                {file && (
                  <div className="flex gap-2 ml-[46px] w-[calc(100%-46px)]">
                    <button type="button" className={BTN.xs} onClick={() => lihatFile(file)}>
                      <FaRegEye size={11} /> Lihat
                    </button>
                    <button type="button" className={BTN.xs} onClick={() => cetakFile(file)}>
                      <FaPrint size={11} /> Cetak
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 mb-3">
          <h2 className={`${FONT.head} text-[15px] font-bold ${T.ink}`}>
            Berkas LPJ Anda dalam DRPP ini
          </h2>
          <p className={`text-[12.5px] mt-0.5 ${T.inkMuted}`}>
            {rows.length} berkas LPJ atas nama Anda
          </p>
        </div>

        {(rows.length > PAGE_SIZE || query) && (
          <div className="flex flex-wrap items-center gap-2.5 mb-3.5">
            <label className={SEARCH}>
              <FaSearch size={13} className="shrink-0" />
              <input
                type="search"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                aria-label="Cari LPJ di DRPP ini"
                placeholder="Cari di DRPP ini: ID LPJ, no. kwitansi, uraian, atau rekan…"
                className={SEARCH_INPUT}
              />
            </label>
          </div>
        )}

        <div
          className={`border rounded-[14px] overflow-x-auto ${T.border} max-md:border-0 max-md:overflow-visible`}
        >
          <table className="w-full border-collapse min-w-[780px] max-md:min-w-0 max-md:block">
            <thead className="max-md:hidden">
              <tr>
                {['ID LPJ / Kwitansi SAKTI', 'Uraian', 'Pelaksana', 'Total', ''].map((h) => (
                  <th
                    key={h}
                    className={`text-left text-[11px] font-bold tracking-[.05em] uppercase px-3.5 py-3 whitespace-nowrap ${T.surface2} ${T.inkMuted}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="max-md:flex max-md:flex-col max-md:gap-2.5">
              {pageRows.length === 0 && (
                <tr className="max-md:block">
                  <td colSpan={5} className="max-md:block">
                    <div className={`text-center px-2.5 py-11 text-[13.5px] ${T.inkMuted}`}>
                      Tidak ada LPJ yang cocok dengan pencarian ini.
                    </div>
                  </td>
                </tr>
              )}
              {pageRows.map((r, i) => (
                <tr
                  key={r.id}
                  className={`${T.hoverSurface2} ${ANIM.muncul} ${jedaKe(i)} max-md:flex max-md:flex-col max-md:gap-1.5 max-md:p-3.5 max-md:border max-md:rounded-[14px] ${T.border}`}
                >
                  <td className={TD}>
                    <div className={`${FONT.mono} font-bold text-[12.5px] whitespace-nowrap`}>
                      <Sorot text={r.id} q={query} />
                    </div>
                    <Kwitansi value={r.kwitansi} />
                  </td>
                  <td className={`${TD} md:min-w-[220px] md:max-w-[340px]`}>
                    <Sorot text={r.uraian} q={query} />
                  </td>
                  <td className={`${TD} ${T.ink2}`}>
                    <span className={MOBILE_LABEL}>Pelaksana</span>
                    {pelaksanaText(r)}
                  </td>
                  <td className={`${TD} ${FONT.mono} font-semibold whitespace-nowrap`}>
                    <span className={`${MOBILE_LABEL} ${FONT.body}`}>Total</span>
                    {rupiah(r.total)}
                  </td>
                  <td className={TD}>
                    <div className="flex gap-1.5">
                      <button type="button" className={ROW_BTN} onClick={() => setLihatId(r.id)}>
                        <FaRegEye size={12} /> Lihat
                      </button>
                      <button type="button" className={ROW_BTN} onClick={() => cetakLpj(r)}>
                        <FaPrint size={12} /> Cetak
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager
          total={filtered.length}
          page={cur}
          pageSize={PAGE_SIZE}
          onPage={setPage}
          noun="berkas"
        />
      </div>

      {lihat && <ArsipLpjModal row={lihat} onClose={() => setLihatId(null)} />}
    </>
  );
}
