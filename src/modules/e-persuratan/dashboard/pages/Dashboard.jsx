/**
 * Dashboard e-Persuratan (DashboardPage purwarupa): sambutan + tombol Buat LPJ, Status Berkas,
 * Berkas LPJ Saya, Perlu Dilengkapi, dan Aktivitas Terbaru — semuanya dari berkas LPJ di Firestore.
 */

import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaCheck,
  FaChevronDown,
  FaChevronRight,
  FaFilter,
  FaPlus,
  FaRegFileAlt,
  FaSearch,
  FaUpload,
} from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import {
  formatTanggalPendek,
  isSkemaBaru,
  lpjDashStatus,
  lpjDashType,
  lpjRowTotal,
  lpjUi,
  pelaksanaOf,
  stagesWithStatus,
  uraianOf,
  useLPJPacks,
} from '@/modules/e-persuratan/lpj';

const { T, FONT, STATUS } = lpjUi;

const STATUS_LABEL = { baru: 'Baru', draft: 'Draft', selesai: 'Selesai' };
const FILTER_LABEL = { all: 'Filter', baru: 'Baru', draft: 'Draft', selesai: 'Selesai' };
const STATUS_PILL = {
  baru: `${STATUS.warnBg} ${STATUS.warnInk}`,
  draft: `${STATUS.infoBg} ${STATUS.infoInk}`,
  selesai: `${STATUS.goodBg} ${STATUS.goodInk}`,
};

const CARD = `${T.surface} ${T.border} ${T.shadowSm} ${T.ink} border rounded-[20px] p-5`;
const H2 = `${FONT.head} text-[16.5px] font-bold ${T.ink}`;
const CHIP =
  'px-[13px] py-[7px] rounded-full text-[12.5px] font-semibold whitespace-nowrap border border-transparent transition-colors';
const CHIP_OFF = `${T.surface2} ${T.ink2} ${T.hoverSurfaceHover}`;
const CHIP_ON = 'bg-[#0E2340] text-[#EAF0FA] dark:bg-[#1F4C80]';

/** Jumlah fase selesai / total fase. */
function faseRingkas(pack) {
  const list = stagesWithStatus(pack);
  return { done: list.filter((s) => s.raw === 'selesai').length, total: list.length };
}

/** "Baru saja", "5 menit lalu", "2 jam lalu", "Kemarin, 09.15", atau tanggal. */
function waktuRelatif(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const menit = Math.floor((Date.now() - d.getTime()) / 60000);
  const jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  if (menit < 1) return 'Baru saja';
  if (menit < 60) return `${menit} menit lalu`;
  const kemarin = new Date();
  kemarin.setDate(kemarin.getDate() - 1);
  if (d.toDateString() === new Date().toDateString()) return `${Math.floor(menit / 60)} jam lalu`;
  if (d.toDateString() === kemarin.toDateString()) return `Kemarin, ${jam}`;
  return `${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}, ${jam}`;
}

function ikonAktivitas(teks) {
  if (/unggah/i.test(teks)) return FaUpload;
  if (/selesai/i.test(teks)) return FaCheck;
  return FaRegFileAlt;
}

export default function Dashboard() {
  const { currentUser, userData, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const uid = currentUser?.uid || '';
  const { packs } = useLPJPacks({ isAdmin: !!(isAdmin || isSuperAdmin), userUid: uid });

  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);

  // "Berkas LPJ Saya": berkas yang dibuat pengguna atau mencantumkan dirinya sebagai pelaksana
  const milikSaya = useMemo(
    () =>
      packs.filter(
        (p) =>
          isSkemaBaru(p) &&
          (p.created_by === uid || pelaksanaOf(p).some((x) => x.uid && x.uid === uid)),
      ),
    [packs, uid],
  );

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return milikSaya.filter((p) => {
      if (type !== 'all' && lpjDashType(p) !== type) return false;
      if (status !== 'all' && lpjDashStatus(p) !== status) return false;
      if (qq && !uraianOf(p).toLowerCase().includes(qq) && !p.id.toLowerCase().includes(qq))
        return false;
      return true;
    });
  }, [milikSaya, type, status, q]);

  // Daftar dari Firestore sudah terurut terbaru di atas
  const miniList = filtered.slice(0, 8);

  const statusCounts = useMemo(() => {
    const c = { baru: 0, draft: 0, selesai: 0 };
    milikSaya.forEach((p) => c[lpjDashStatus(p)]++);
    return c;
  }, [milikSaya]);
  const statusTotal = statusCounts.baru + statusCounts.draft + statusCounts.selesai;

  const perluDilengkapi = useMemo(
    () =>
      milikSaya
        .filter((p) => p.status !== 'selesai')
        .map((p) => ({ pack: p, fase: faseRingkas(p) }))
        .sort((a, b) => a.fase.done - b.fase.done)
        .slice(0, 2),
    [milikSaya],
  );

  const aktivitas = useMemo(
    () =>
      milikSaya
        .filter((p) => p.aktivitas?.at)
        .sort((a, b) => String(b.aktivitas.at).localeCompare(String(a.aktivitas.at)))
        .slice(0, 3),
    [milikSaya],
  );

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const namaDepan = userData?.nama
    ? userData.nama.split(' ')[0]
    : currentUser?.email?.split('@')[0] || 'Pengguna';

  // Segmen bar status (SVG, lebar dalam persen)
  const segmen = [];
  if (statusTotal > 0) {
    let x = 0;
    [
      ['baru', 'fill-[#eda100] dark:fill-[#c98500]'],
      ['draft', 'fill-[#2a78d6] dark:fill-[#3987e5]'],
      ['selesai', 'fill-[#1baf7a] dark:fill-[#199e70]'],
    ].forEach(([key, cls]) => {
      const w = (statusCounts[key] / statusTotal) * 100;
      if (w > 0) segmen.push({ key, cls, x, w });
      x += w;
    });
  }

  return (
    <div className={`min-h-full ${T.ground} ${FONT.body}`}>
      <div className="grid grid-cols-1 gap-[18px] w-full max-w-[1400px] mx-auto px-4 pt-[18px] pb-[100px] sm:pb-11 min-[1080px]:grid-cols-[minmax(0,1fr)_360px] min-[1080px]:gap-[22px] min-[1080px]:px-8 min-[1080px]:pt-[26px] min-[1080px]:items-start">
        {/* Sambutan */}
        <section className="order-1 min-w-0 min-[1080px]:col-start-1 min-[1080px]:row-start-1">
          <div className="rounded-[20px] overflow-hidden text-[#EAF0FA] bg-gradient-to-br from-[#0E2340] to-[#1F4C80] dark:from-[#081524] dark:to-[#173A60] shadow-[0_10px_28px_-10px_rgba(16,26,44,.18)]">
            <div className="flex flex-wrap items-center gap-[22px] p-6">
              <div className="flex-1 min-w-[220px]">
                <p className="text-[12.5px] font-semibold tracking-[.04em] uppercase text-[#C9973B] mb-2">
                  {today}
                </p>
                <h1
                  className={`${FONT.head} text-[clamp(20px,3.6vw,26px)] font-extrabold mb-[9px]`}
                >
                  Selamat datang kembali, {namaDepan}
                </h1>
                <p className="text-sm text-[#B7C7DE] max-w-[46ch] leading-[1.55]">
                  Segera selesaikan SPBy dengan tepat agar istirahat lebih cepat.
                </p>
              </div>
              <div className="shrink-0">
                <button
                  type="button"
                  onClick={() => navigate('/e-persuratan/lpj')}
                  className="group flex items-center gap-4 py-[17px] pl-[17px] pr-[26px] rounded-[18px] bg-white text-[#16213C] shadow-[0_16px_34px_-12px_rgba(4,10,22,.5)] transition hover:-translate-y-[3px] active:-translate-y-px"
                >
                  <span className="w-[46px] h-[46px] shrink-0 rounded-[13px] flex items-center justify-center bg-gradient-to-br from-[#C9973B] to-[#A97C24] shadow-[0_5px_12px_-3px_rgba(169,124,36,.6)] transition-transform group-hover:scale-105">
                    <FaPlus size={18} className="text-white" />
                  </span>
                  <span className="flex flex-col items-start gap-0.5">
                    <strong className={`${FONT.head} font-extrabold text-[18.5px] leading-tight`}>
                      Buat LPJ
                    </strong>
                    <small className="text-[12.5px] font-semibold text-[#7C8798]">
                      Buat SPBy baru
                    </small>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Status Berkas */}
        <section
          className={`order-3 min-w-0 ${CARD} min-[1080px]:col-start-1 min-[1080px]:row-start-2`}
        >
          <div className="mb-3.5">
            <h2 className={H2}>Status Berkas</h2>
          </div>
          <svg
            viewBox="0 0 100 14"
            preserveAspectRatio="none"
            role="img"
            aria-label={`Distribusi status berkas: ${statusCounts.baru} baru, ${statusCounts.draft} draft, ${statusCounts.selesai} selesai`}
            className="block w-full h-3.5 rounded-[7px] overflow-hidden"
          >
            <rect
              x="0"
              y="0"
              width="100"
              height="14"
              className="fill-[#F3F5F8] dark:fill-[#16243A]"
            />
            {segmen.map((s, i) => (
              <rect
                key={s.key}
                x={s.x + (i > 0 ? 0.3 : 0)}
                y="0"
                width={Math.max(s.w - (i > 0 ? 0.3 : 0), 0)}
                height="14"
                className={s.cls}
              />
            ))}
          </svg>
          <ul className="flex flex-wrap gap-x-5 gap-y-3.5 mt-4">
            {[
              ['baru', 'Baru', 'bg-[#eda100] dark:bg-[#c98500]'],
              ['draft', 'Draft', 'bg-[#2a78d6] dark:bg-[#3987e5]'],
              ['selesai', 'Selesai', 'bg-[#1baf7a] dark:bg-[#199e70]'],
            ].map(([key, label, dot]) => (
              <li key={key} className={`flex items-center gap-[7px] text-[13px] ${T.ink2}`}>
                <i className={`w-[9px] h-[9px] rounded-full shrink-0 ${dot}`} />
                {label} <b className={`${FONT.mono} ml-0.5 ${T.ink}`}>{statusCounts[key]}</b>
              </li>
            ))}
          </ul>
        </section>

        {/* Berkas LPJ Saya */}
        <section
          className={`order-4 min-w-0 ${CARD} min-[1080px]:col-start-1 min-[1080px]:row-start-3`}
        >
          <div className="flex items-baseline justify-between gap-3 mb-3.5">
            <div>
              <h2 className={H2}>Berkas LPJ Saya</h2>
              <p className={`text-[13px] mt-[3px] ${T.inkMuted}`}>
                Berkas yang Anda buat atau ikuti sebagai pelaksana
              </p>
            </div>
            <Link
              to="/e-persuratan/lpj"
              className={`text-[13px] font-semibold whitespace-nowrap flex items-center gap-[3px] hover:underline ${STATUS.infoInk}`}
            >
              Lihat semua <FaChevronRight size={11} />
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 mb-3.5">
            <div
              className={`flex items-center gap-2 flex-1 min-w-[180px] h-9 px-[11px] rounded-[9px] border border-transparent ${T.surface2} ${T.inkMuted} focus-within:border-[#2A78D6] focus-within:bg-white dark:focus-within:bg-[#111D2E]`}
            >
              <FaSearch size={13} className="shrink-0" />
              <input
                type="search"
                placeholder="Cari nama kegiatan atau nomor LPJ…"
                aria-label="Cari berkas LPJ"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className={`flex-1 min-w-0 bg-transparent border-0 outline-none text-sm ${T.ink} ${T.placeholder}`}
              />
            </div>
            <div className="flex flex-wrap gap-[7px]">
              {[
                ['all', 'Semua'],
                ['perjadin', 'Perjadin'],
                ['non-perjadin', 'Non Perjadin'],
              ].map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setType(val)}
                  className={`${CHIP} ${type === val ? CHIP_ON : CHIP_OFF}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="ml-auto relative">
              <button
                type="button"
                aria-haspopup="true"
                aria-expanded={filterOpen}
                onClick={() => setFilterOpen((v) => !v)}
                className={`${CHIP} flex items-center gap-1.5 ${status !== 'all' ? CHIP_ON : CHIP_OFF}`}
              >
                <FaFilter size={11} />
                <span>{FILTER_LABEL[status]}</span>
                <FaChevronDown size={11} />
              </button>
              {filterOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Tutup filter"
                    className="fixed inset-0 z-20 cursor-default"
                    onClick={() => setFilterOpen(false)}
                  />
                  <div
                    className={`absolute top-[calc(100%+8px)] right-0 z-30 min-w-[160px] p-1.5 flex flex-col gap-px rounded-xl border ${T.surface} ${T.border} ${T.shadowMd}`}
                  >
                    {['all', 'baru', 'draft', 'selesai'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setStatus(s);
                          setFilterOpen(false);
                        }}
                        className={`w-full text-left px-3 py-[9px] rounded-lg text-[13px] font-semibold ${
                          status === s
                            ? 'bg-[#F7EEDC] text-[#A97C24] dark:bg-[rgba(201,151,59,.16)] dark:text-[#C9973B]'
                            : `${T.ink2} ${T.hoverSurface2}`
                        }`}
                      >
                        {s === 'all' ? 'Semua Status' : STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {miniList.map((p) => {
              const st = lpjDashStatus(p);
              const fase = faseRingkas(p);
              const dibuat = p.created_at?.toDate
                ? formatTanggalPendek(p.created_at.toDate().toLocaleDateString('sv-SE'))
                : '-';
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => navigate(`/e-persuratan/lpj/${p.id}`)}
                  className={`relative block w-full text-left rounded-[14px] border p-4 pr-11 transition ${T.surface} ${T.border} hover:border-[#CBD3DE] dark:hover:border-[#304864] hover:shadow-[0_1px_2px_rgba(16,26,44,.07)]`}
                >
                  <div className="flex items-center justify-between gap-2.5">
                    <span
                      className={`text-[10.5px] font-bold tracking-[.03em] px-2 py-[3px] rounded-md border ${T.surface2} ${T.ink2} ${T.border}`}
                    >
                      {lpjDashType(p) === 'perjadin' ? 'Perjadin' : 'Non Perjadin'}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-[5px] rounded-full text-[11.5px] font-bold tracking-[.02em] whitespace-nowrap ${STATUS_PILL[st]}`}
                    >
                      <span className="w-[7px] h-[7px] rounded-full bg-current shrink-0" />
                      {STATUS_LABEL[st]}
                    </span>
                  </div>
                  <FaChevronRight
                    size={13}
                    className={`absolute top-1/2 right-3.5 -translate-y-1/2 ${T.inkMuted}`}
                  />
                  <p className={`${FONT.mono} text-[11.5px] mt-3 ${T.inkMuted}`}>{p.id}</p>
                  <p className={`font-bold text-[14.5px] mt-[3px] leading-[1.35] ${T.ink}`}>
                    {uraianOf(p)}
                  </p>
                  <div className={`flex flex-wrap gap-2.5 text-[12.5px] mt-2 ${T.inkMuted}`}>
                    <span>Dibuat {dibuat}</span>
                    <span className={FONT.mono}>Rp {lpjRowTotal(p).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex items-center gap-2.5 mt-3">
                    <progress
                      value={fase.total ? Math.round((fase.done / fase.total) * 100) : 0}
                      max={100}
                      aria-label={`Fase ${fase.done} dari ${fase.total}`}
                      className="block flex-1 h-1.5 appearance-none border-0 rounded-full overflow-hidden bg-[#F3F5F8] dark:bg-[#16243A] [&::-webkit-progress-bar]:bg-[#F3F5F8] dark:[&::-webkit-progress-bar]:bg-[#16243A] [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-[#2a78d6] [&::-moz-progress-bar]:bg-[#2a78d6]"
                    />
                    <span className={`text-[11.5px] font-semibold whitespace-nowrap ${T.inkMuted}`}>
                      Fase {fase.done}/{fase.total}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          {miniList.length === 0 && (
            <p className={`text-center py-[34px] px-2.5 text-[13.5px] ${T.inkMuted}`}>
              {milikSaya.length === 0
                ? 'Belum ada berkas. Klik "Buat LPJ" untuk memulai.'
                : 'Tidak ada berkas yang cocok dengan pencarian ini.'}
            </p>
          )}
        </section>

        {/* Kolom samping: di HP melebur ke grid utama supaya urutannya bisa diatur */}
        <div className="contents min-[1080px]:flex min-[1080px]:flex-col min-[1080px]:gap-[22px] min-[1080px]:col-start-2 min-[1080px]:row-start-1 min-[1080px]:row-span-3 min-[1080px]:sticky min-[1080px]:top-6 min-[1080px]:self-start">
          <section className={`order-2 min-w-0 ${CARD}`}>
            <div className="mb-3.5">
              <h2 className={H2}>Perlu Dilengkapi</h2>
              <p className={`text-[13px] mt-[3px] ${T.inkMuted}`}>
                {perluDilengkapi.length} berkas perlu ditindaklanjuti
              </p>
            </div>
            <ul className="flex flex-col gap-0.5 mb-2.5">
              {perluDilengkapi.map(({ pack, fase }) => (
                <li key={pack.id}>
                  <Link
                    to={`/e-persuratan/lpj/${pack.id}`}
                    className={`flex items-start gap-[11px] px-1.5 py-2.5 rounded-[10px] ${T.hoverSurface2}`}
                  >
                    <span className="w-[9px] h-[9px] mt-[5px] rounded-full shrink-0 bg-[#8A5B00] dark:bg-[#F0B93E]" />
                    <div className="min-w-0">
                      <p className={`${FONT.mono} text-[11px] mb-0.5 ${T.inkMuted}`}>{pack.id}</p>
                      <p className={`text-[13.5px] font-semibold leading-[1.35] ${T.ink}`}>
                        {uraianOf(pack)}
                      </p>
                      <p className={`text-xs mt-[3px] ${T.inkMuted}`}>
                        <strong className={STATUS.warnInk}>
                          Fase {fase.done}/{fase.total}
                        </strong>{' '}
                        &middot; perlu ditindaklanjuti
                      </p>
                    </div>
                    <FaChevronRight size={12} className={`ml-auto mt-1 shrink-0 ${T.inkMuted}`} />
                  </Link>
                </li>
              ))}
              {perluDilengkapi.length === 0 && (
                <li className={`px-1 py-2.5 text-[13px] ${T.inkMuted}`}>
                  Semua berkas sudah lengkap.
                </li>
              )}
            </ul>
          </section>

          <section className={`order-5 min-w-0 ${CARD}`}>
            <div className="mb-3.5">
              <h2 className={H2}>Aktivitas Terbaru</h2>
            </div>
            <ul className="flex flex-col">
              {aktivitas.map((p) => {
                const a = p.aktivitas;
                const Icon = ikonAktivitas(a.teks);
                const siapa = a.uid && a.uid === uid ? 'Anda' : a.oleh || 'Seseorang';
                return (
                  <li key={p.id} className="flex gap-[11px] px-1 py-2.5">
                    <div
                      className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center ${T.surface2} ${T.ink2}`}
                    >
                      <Icon size={12} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-[13px] leading-[1.45] ${T.ink}`}>
                        {siapa} {a.teks}
                        {!a.teks.includes(p.id) && (
                          <>
                            {' '}
                            pada <strong className="font-semibold">{p.id}</strong>
                          </>
                        )}
                      </p>
                      <p className={`text-[11.5px] mt-0.5 ${T.inkMuted}`}>{waktuRelatif(a.at)}</p>
                    </div>
                  </li>
                );
              })}
              {aktivitas.length === 0 && (
                <li className={`px-1 py-2.5 text-[13px] ${T.inkMuted}`}>Belum ada aktivitas.</li>
              )}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
