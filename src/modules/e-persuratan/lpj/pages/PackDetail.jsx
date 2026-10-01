/**
 * Detail Dokumen (LpjDetailPage purwarupa) — pusat kendali satu berkas LPJ: kartu ringkasan
 * di atas, lalu satu kartu per Fase berisi dokumen/kelompok dokumen beserta status & aksinya.
 * Aksi "Buat Sekarang/Edit/Upload/Cetak SPD" membuka form (?isi=...), "Lihat/Print" membuka
 * dokumen (PDF asli bila templatenya ada).
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaCheck,
  FaClock,
  FaLock,
  FaPlus,
  FaPrint,
  FaRegEdit,
  FaRegEye,
  FaRegFileAlt,
  FaUpload,
} from 'react-icons/fa';
import { useLPJPack } from '../hooks/useLPJ';
import { useLpjUser } from '../hooks/useLpjUser';
import { usePegawaiList } from '../hooks/usePegawaiList';
import { useDokumenLpj } from '../hooks/useDokumenLpj';
import {
  STAGE_STATUS_LABEL,
  canEditPack,
  isPerjadin,
  isSkemaBaru,
  jenisLabel,
  lpjGroupStatus,
  lpjGroupSubDone,
  lpjRowTotal,
  lpjSingleStatus,
  lpjTahapDisplay,
  overallProgress,
  pelaksanaOf,
  stagesWithStatus,
  tanggalRingkas,
  uraianOf,
} from '../utils/lpjLogic';
import { formatTanggal } from '../utils/formatTanggal';
import LinkBack from '../ui/LinkBack';
import ProgressBar from '../ui/ProgressBar';
import { useToast } from '@/utils/toastStore';
import { BTN, FONT, LAYOUT, NAVY, STAGE_CLS, STATUS, T } from '@/utils/uiTokens';

export default function PackDetail({ packId }) {
  const navigate = useNavigate();
  const showToast = useToast();
  const user = useLpjUser();
  const { pack, loading, error } = useLPJPack(packId);
  const { pegawai } = usePegawaiList();
  const dok = useDokumenLpj({ pack, pegawai, showToast });

  const backToList = () => navigate('/e-persuratan/lpj');

  if (loading) return <LoadingSkeleton />;
  if (error || !pack) {
    return (
      <Shell>
        <LinkBack onClick={backToList}>Kembali ke Daftar LPJ</LinkBack>
        <p className={`text-center py-9 text-[13.5px] ${T.inkMuted}`}>
          {error || 'Berkas tidak ditemukan.'}
        </p>
      </Shell>
    );
  }
  if (!isSkemaBaru(pack)) {
    return (
      <Shell>
        <LinkBack onClick={backToList}>Kembali ke Daftar LPJ</LinkBack>
        <div className={`rounded-xl border p-6 text-center ${T.border} ${T.surface2}`}>
          <p className={`font-bold text-sm mb-1 ${T.ink}`}>{uraianOf(pack) || pack.id}</p>
          <p className={`text-[13px] ${T.ink2}`}>
            Berkas ini dibuat dengan format lama dan tidak didukung lagi oleh alur LPJ yang baru.
            Silakan buat berkas baru.
          </p>
        </div>
      </Shell>
    );
  }

  const canEdit = canEditPack(pack, user);
  const tahap = lpjTahapDisplay(pack);
  const total = lpjRowTotal(pack);
  const stages = stagesWithStatus(pack);
  const overall = overallProgress(pack);
  const pelaksana = pelaksanaOf(pack);
  const tgl = tanggalRingkas(pack);

  const goForm = (isi) => {
    if (!canEdit) return; // berkas final / tanpa hak edit tidak lagi bisa diubah
    navigate(`/e-persuratan/lpj/${pack.id}?isi=${isi}`);
  };

  const summary = [
    ['Pelaksana', pelaksana.map((p) => p.nama).join(', ')],
    ['Seksi', pack.spd?.seksi],
    ['Berangkat', tgl.berangkat && formatTanggal(tgl.berangkat)],
    ['Kembali', tgl.kembali && formatTanggal(tgl.kembali)],
    ['Tanggal LPJ', tgl.tanggalLPJ && formatTanggal(tgl.tanggalLPJ)],
    ['Total Biaya', 'Rp ' + total.toLocaleString('id-ID')],
  ];

  return (
    <Shell>
      <LinkBack onClick={backToList}>Kembali ke Daftar LPJ</LinkBack>

      {/* Kartu judul */}
      <div className={`${NAVY.gradient} rounded-[14px] px-5 sm:px-6 py-5 mb-5`}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className="text-[11.5px] font-bold px-2.5 py-[3px] rounded-[20px] bg-white/15 text-white border border-white/20">
                {pack.id}
              </span>
              <span className="text-[11.5px] font-bold px-2.5 py-[3px] rounded-[20px] bg-white/15 text-white border border-white/20">
                {jenisLabel(pack)}
              </span>
              <span
                className={`text-[11.5px] font-semibold px-2.5 py-[3px] rounded-[20px] bg-white border border-white/40 ${
                  tahap.done ? 'text-[#15803d]' : 'text-[#1d4ed8]'
                }`}
              >
                {tahap.label}
              </span>
            </div>
            <h1
              className={`${FONT.head} text-lg sm:text-[21px] leading-[1.32] font-bold text-white break-words`}
            >
              {pack.uraian}
            </h1>
            <p className="text-[12.5px] text-white/65 mt-2">
              {pelaksana.map((p) => p.nama).join(', ') || '—'} · TOTAL BIAYA{' '}
              <strong className="text-white">Rp {total.toLocaleString('id-ID')}</strong>
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className={`${FONT.head} text-[26px] font-extrabold text-white leading-none`}>
              {overall.pct}%
            </div>
            <div className="text-[11.5px] text-white/65 font-semibold mt-1 whitespace-nowrap">
              {overall.done}/{overall.total} dokumen selesai
            </div>
          </div>
        </div>
        <ProgressBar
          value={overall.pct}
          className={`mt-4 h-1.5 rounded-[3px] bg-white/15 [&::-webkit-progress-bar]:bg-white/15 [&::-webkit-progress-value]:rounded-[3px] [&::-moz-progress-bar]:rounded-[3px] ${
            overall.pct === 100
              ? '[&::-webkit-progress-value]:bg-[#4ade80] [&::-moz-progress-bar]:bg-[#4ade80]'
              : '[&::-webkit-progress-value]:bg-[#7dd3fc] [&::-moz-progress-bar]:bg-[#7dd3fc]'
          }`}
        />
      </div>

      {/* Ringkasan (Perjadin) */}
      {isPerjadin(pack) && (
        <div
          className={`rounded-[10px] border px-5 py-3.5 mb-6 flex flex-wrap gap-x-8 gap-y-3 ${T.surface2} ${T.border}`}
        >
          {summary.map(([label, val]) => (
            <div key={label} className="min-w-0">
              <div
                className={`text-[10.5px] font-bold uppercase tracking-[.05em] mb-0.5 ${T.inkMuted}`}
              >
                {label}
              </div>
              <div className={`text-[13px] font-medium break-words ${T.ink}`}>{val || '—'}</div>
            </div>
          ))}
        </div>
      )}

      {/* Kartu per fase */}
      <div>
        {stages.map(({ stage, display, locked, tally, pct }, si) => (
          <div
            key={stage.num}
            className={`${T.surface} border rounded-[14px] mb-4 overflow-hidden ${
              locked ? `${T.border} opacity-80` : STAGE_CLS[display].border
            }`}
          >
            <div className="flex flex-wrap items-center gap-3 px-4 sm:px-5 py-4">
              <div
                className={`w-9 h-9 shrink-0 rounded-[10px] flex items-center justify-center ${
                  display === 'selesai' || display === 'proses'
                    ? `${NAVY.bg} text-white`
                    : `${T.surface2} ${T.inkMuted}`
                }`}
              >
                {display === 'selesai' ? (
                  <FaCheck size={15} />
                ) : locked ? (
                  <FaLock size={14} />
                ) : (
                  <span className="text-sm font-extrabold">{stage.num}</span>
                )}
              </div>
              <div className="flex-1 min-w-[180px]">
                <h2 className={`${FONT.head} font-bold text-[14.5px] ${T.ink}`}>
                  Fase {stage.num} — {stage.label}
                </h2>
                <p className={`text-xs mt-0.5 ${T.inkMuted}`}>
                  {tally.done}/{tally.total} selesai · {stage.sub}
                  {locked ? ' · menunggu tahap sebelumnya' : ''}
                </p>
              </div>
              <span
                className={`text-[11px] font-bold px-2.5 py-[3px] rounded-[20px] border whitespace-nowrap shrink-0 ${STAGE_CLS[display].badge}`}
              >
                {STAGE_STATUS_LABEL[display]}
              </span>
            </div>
            <ProgressBar
              value={pct}
              className={`h-1 ${T.surface2} [&::-webkit-progress-bar]:bg-[#F3F5F8] dark:[&::-webkit-progress-bar]:bg-[#16243A] ${
                locked
                  ? '[&::-webkit-progress-value]:bg-[#E0E5EC] [&::-moz-progress-bar]:bg-[#E0E5EC] dark:[&::-webkit-progress-value]:bg-[#233450] dark:[&::-moz-progress-bar]:bg-[#233450]'
                  : '[&::-webkit-progress-value]:bg-[#0f2040] [&::-moz-progress-bar]:bg-[#0f2040] dark:[&::-webkit-progress-value]:bg-[#7DB6F3] dark:[&::-moz-progress-bar]:bg-[#7DB6F3]'
              }`}
            />

            {locked ? (
              <div
                className={`flex items-center gap-2 px-4 sm:px-5 py-4 text-[12.5px] border-t ${T.border} ${T.inkMuted}`}
              >
                <FaLock size={13} className="shrink-0" />
                <span>
                  Selesaikan fase "{stages[si - 1].stage.label}" terlebih dahulu untuk membuka fase
                  ini.
                </span>
              </div>
            ) : (
              <>
                {(stage.items || []).map((doc) => (
                  <SingleCard
                    key={doc.key}
                    doc={doc}
                    status={lpjSingleStatus(pack, stage, doc)}
                    canEdit={canEdit}
                    onForm={goForm}
                    onLihat={dok.lihat}
                    onPrint={dok.cetak}
                  />
                ))}
                {(stage.groups || []).map((group) => (
                  <GroupCard
                    key={group.key}
                    pack={pack}
                    stage={stage}
                    group={group}
                    status={lpjGroupStatus(pack, stage, group)}
                    canEdit={canEdit}
                    onForm={goForm}
                    onLihat={dok.lihat}
                    onPrint={dok.cetak}
                  />
                ))}
              </>
            )}
          </div>
        ))}
      </div>

      <StatusPembayaran pembayaran={pack.pembayaran} />

      {dok.modal}
    </Shell>
  );
}

// ─── Sub-komponen ─────────────────────────────────────────────────────────────

function Shell({ children }) {
  return (
    <div className={`min-h-full ${T.ground}`}>
      <div className={LAYOUT.page}>
        <section className={LAYOUT.card}>{children}</section>
      </div>
    </div>
  );
}

function DocIcon({ status }) {
  const cls =
    {
      selesai: `${STATUS.goodSolid} text-white dark:text-[#0A121D]`,
      proses: `${NAVY.bg} text-white`,
      menunggu: `${STATUS.warnSolid} text-white`,
    }[status] || `${T.surface2} ${T.inkMuted}`;
  const Icon = { selesai: FaCheck, proses: FaClock, menunggu: FaLock }[status] || FaRegFileAlt;
  return (
    <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${cls}`}>
      <Icon size={13} />
    </div>
  );
}

function CodeBadge({ code }) {
  return (
    <span
      className={`text-[10px] font-extrabold tracking-[.02em] px-[7px] py-[3px] rounded-md border shrink-0 whitespace-nowrap ${T.surface2} ${T.ink2} ${T.border}`}
    >
      {code || ''}
    </span>
  );
}

function SingleCard({ doc, status, canEdit, onForm, onLihat, onPrint }) {
  let actions = null;
  if (status === 'selesai') {
    actions = (
      <div className="flex flex-wrap gap-2 shrink-0">
        <button type="button" className={BTN.sm} onClick={() => onLihat(doc)}>
          <FaRegEye size={12} /> Lihat
        </button>
        <button type="button" className={BTN.sm} onClick={() => onPrint(doc)}>
          <FaPrint size={12} /> Print
        </button>
        {!doc.noEdit && canEdit && (
          <button type="button" className={BTN.sm} onClick={() => onForm(doc.isi)}>
            <FaRegEdit size={12} /> Edit
          </button>
        )}
      </div>
    );
  } else if (status === 'menunggu') {
    actions = (
      <div className="flex flex-wrap gap-2 shrink-0">
        <button type="button" className={BTN.sm} onClick={() => onLihat(doc)}>
          <FaRegEye size={12} /> Lihat
        </button>
        {canEdit && (
          <button type="button" className={BTN.warnSolid} onClick={() => onForm('tte')}>
            <FaUpload size={12} /> Upload
          </button>
        )}
      </div>
    );
  } else if (status === 'proses') {
    actions = (
      <div className="flex flex-wrap gap-2 shrink-0">
        <button type="button" className={BTN.sm} onClick={() => onLihat(doc)}>
          <FaRegEye size={12} /> Lihat
        </button>
        {canEdit && (
          <button type="button" className={BTN.sm} onClick={() => onForm(doc.isi)}>
            <FaRegEdit size={12} /> Edit
          </button>
        )}
      </div>
    );
  } else if (canEdit) {
    actions = (
      <button type="button" className={BTN.action} onClick={() => onForm(doc.isi)}>
        <FaPlus size={11} /> Buat Sekarang
      </button>
    );
  }

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-[13px] border-t ${T.border}`}
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <DocIcon status={status} />
        <CodeBadge code={doc.code} />
        <div className="flex-1 min-w-0">
          <div className={`text-[13px] font-semibold ${T.ink}`}>{doc.label}</div>
          {status === 'selesai' && doc.noEdit && (
            <div className={`text-[11px] mt-px ${T.inkMuted}`}>
              Sudah final — tidak dapat diubah
            </div>
          )}
          {status === 'menunggu' && (
            <div className={`text-[11px] mt-px ${STATUS.warnInk}`}>
              Sudah ditandai selesai — tidak dapat diedit lagi, menunggu upload nomor TTE
            </div>
          )}
        </div>
      </div>
      {actions}
    </div>
  );
}

function GroupCard({ pack, stage, group, status, canEdit, onForm, onLihat, onPrint }) {
  let headerAction = null;
  if (status === 'selesai') {
    if (!group.noEdit && canEdit) {
      headerAction = (
        <button type="button" className={BTN.sm} onClick={() => onForm(group.isi)}>
          <FaRegEdit size={12} /> Edit
        </button>
      );
    }
  } else if (status === 'menunggu') {
    if (canEdit) {
      headerAction = (
        <button type="button" className={BTN.warnSolid} onClick={() => onForm('cetak-spd')}>
          <FaPrint size={12} /> Cetak SPD
        </button>
      );
    }
  } else if (status === 'proses') {
    if (canEdit) {
      headerAction = (
        <button type="button" className={BTN.sm} onClick={() => onForm(group.isi)}>
          <FaRegEdit size={12} /> Edit
        </button>
      );
    }
  } else if (canEdit) {
    headerAction = (
      <button type="button" className={BTN.action} onClick={() => onForm(group.isi)}>
        <FaPlus size={11} /> Buat Sekarang
      </button>
    );
  }

  return (
    <div>
      <div
        className={`flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-[13px] border-t ${T.border}`}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <DocIcon status={status} />
          <CodeBadge code={group.code} />
          <div className="flex-1 min-w-0">
            <div className={`text-[13px] font-semibold ${T.ink}`}>{group.label}</div>
            {status === 'selesai' && group.noEdit && (
              <div className={`text-[11px] mt-px ${T.inkMuted}`}>
                Sudah final — tidak dapat diubah
              </div>
            )}
            {status === 'menunggu' && (
              <div className={`text-[11px] mt-px ${STATUS.warnInk}`}>
                Sudah ditandai selesai — tinggal dicetak satu per satu
              </div>
            )}
          </div>
        </div>
        {headerAction}
      </div>

      {group.subItems.length === 0 && (
        <div
          className={`py-[9px] pl-6 sm:pl-[52px] pr-4 sm:pr-5 border-t text-[12px] ${T.border} ${T.inkMuted}`}
        >
          Belum ada pelaksana. Isi Surat Perintah terlebih dahulu.
        </div>
      )}
      {group.subItems.map((item) => {
        const subDone = lpjGroupSubDone(pack, stage, group, item);
        return (
          <div
            key={item.key}
            className={`flex items-center justify-between gap-2.5 py-[9px] pl-6 sm:pl-[52px] pr-4 sm:pr-5 border-t ${T.border}`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-[18px] h-[18px] shrink-0 rounded-md flex items-center justify-center ${
                  subDone
                    ? `${STATUS.goodSolid} text-white dark:text-[#0A121D]`
                    : `${T.bgBorder} ${T.inkMuted}`
                }`}
              >
                {subDone && <FaCheck size={9} />}
              </span>
              <CodeBadge code={item.code} />
              <span className={`text-[12.5px] ${T.ink2} break-words`}>{item.label}</span>
            </div>
            {subDone ? (
              <div className="flex gap-1.5 shrink-0">
                <button type="button" className={BTN.xs} onClick={() => onLihat(item)}>
                  <FaRegEye size={11} /> Lihat
                </button>
                <button type="button" className={BTN.xs} onClick={() => onPrint(item)}>
                  <FaPrint size={11} /> Print
                </button>
              </div>
            ) : (
              <span className={`text-[11px] shrink-0 ${T.inkMuted}`}>Belum tersedia</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatusPembayaran({ pembayaran }) {
  const p = pembayaran || {};
  return (
    <div className={`rounded-xl border p-[22px] mb-3.5 ${T.surface} ${T.border} ${T.ink}`}>
      <h3 className={`text-[13.5px] font-bold mb-1 ${T.ink}`}>Status Pembayaran dari Bendahara</h3>
      <p className={`text-xs mb-3.5 ${T.ink2}`}>
        Bukti transfer diunggah oleh Bendahara setelah verifikasi selesai
      </p>
      {p.buktiTransfer ? (
        <div
          className={`flex items-center gap-3 px-4 py-3.5 rounded-[10px] border ${STATUS.goodBg} ${STATUS.goodBorder}`}
        >
          <div className="w-8 h-8 shrink-0 rounded-full bg-[#16a34a] text-white flex items-center justify-center">
            <FaCheck size={14} />
          </div>
          <div>
            <div className={`text-[13px] font-semibold ${STATUS.goodInk}`}>
              Bukti transfer sudah diunggah
            </div>
            <div className={`text-[11.5px] mt-0.5 ${T.ink2}`}>
              {p.buktiTransfer}
              {p.tanggalTransfer ? ' · ' + p.tanggalTransfer : ''}
              {p.nomorRekening ? ' · ' + p.nomorRekening : ''}
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`flex items-center gap-3 px-4 py-3.5 rounded-[10px] border border-dashed ${T.surface2} ${T.borderStrong}`}
        >
          <div
            className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${T.bgBorder} ${T.ink2}`}
          >
            <FaClock size={14} />
          </div>
          <div>
            <div className={`text-[13px] font-semibold ${T.ink}`}>
              Belum ada bukti transfer dari Bendahara
            </div>
            <div className={`text-[11.5px] mt-0.5 ${T.inkMuted}`}>
              Status ini akan diperbarui begitu Bendahara mengunggah bukti pembayaran
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <Shell>
      <div className="animate-pulse space-y-4">
        <div className={`h-4 w-40 rounded ${T.surface2}`} />
        <div className={`h-32 rounded-[14px] ${T.surface2}`} />
        {[1, 2, 3].map((i) => (
          <div key={i} className={`h-24 rounded-[14px] ${T.surface2}`} />
        ))}
      </div>
    </Shell>
  );
}
