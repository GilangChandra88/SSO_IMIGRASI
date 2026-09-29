/**
 * PackDetail — Halaman Detail Paket LPJ
 * =======================================
 * Kartu ringkasan di atas, lalu satu kartu per fase berisi dokumen / kelompok dokumen
 * beserta status dan tombol aksinya (Buat Sekarang / Edit / Lihat / Tandai Selesai).
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowLeft,
  FaCheck,
  FaLock,
  FaClock,
  FaRegFileAlt,
  FaEye,
  FaEdit,
  FaPlus,
  FaCircleNotch,
} from 'react-icons/fa';
import { useLPJPackDetail } from '../hooks/useLPJ';
import { PACK_TYPES, PERJADIN_PHASES, NON_PERJADIN_PHASES } from '../data/packTemplates';
import { formatTanggal } from '../utils/formatTanggal';
import ConfirmSelesaiModal from '../components/ConfirmSelesaiModal';
import {
  doc,
  updateDoc,
  serverTimestamp,
  getDocs,
  collection,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import SuratPreviewModal from '@/components/SuratPreview/SuratPreviewModal';
import { SURAT_REGISTRY } from '@/data/surat';

// Dokumen turunan SPBY: isinya diambil dari SPBY sehingga selalu bisa dilihat
const SPBY_CHILDREN = [
  'nota-dinas',
  'surat-perintah-bayar',
  'rincian-spby',
  'rincian-perjalanan-tugas',
  'sptjm-pelaksana',
  'nominatif',
  'kwitansi',
];

// Label kelompok untuk dokumen induk yang disembunyikan (form hub)
const GROUP_LABELS = { spby: 'SPBy & Pack Dokumen' };

const STATUS_CFG = {
  selesai: {
    label: 'Selesai',
    badge:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30',
    card: 'border-blue-200 dark:border-blue-500/30',
  },
  proses: {
    label: 'Dalam Proses',
    badge:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30',
    card: 'border-blue-200 dark:border-blue-500/30',
  },
  belum: {
    label: 'Belum Dimulai',
    badge:
      'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    card: 'border-slate-200 dark:border-slate-800',
  },
  terkunci: {
    label: 'Terkunci',
    badge:
      'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700',
    card: 'border-slate-200 dark:border-slate-800',
  },
};

const BTN_SM =
  'inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[12.5px] font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
const BTN_ACTION =
  'inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg bg-[#0f2040] hover:bg-[#1e4080] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-[12.5px] font-semibold shrink-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_DONE =
  'inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[12.5px] font-semibold hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

const isDone = (item) => item.status === 'completed' || item.status === 'not_required';

/** Status tampilan satu dokumen: selesai | terkunci | proses | belum */
function statusOf(item) {
  if (isDone(item)) return 'selesai';
  if (item.is_blocked) return 'terkunci';
  return item.status === 'in_progress' ? 'proses' : 'belum';
}

/** Status gabungan beberapa dokumen (kelompok atau fase) */
function combinedStatus(list) {
  const s = list.map(statusOf);
  if (s.length === 0) return 'belum';
  if (s.every((x) => x === 'selesai')) return 'selesai';
  if (s.every((x) => x === 'terkunci')) return 'terkunci';
  if (s.some((x) => x === 'selesai' || x === 'proses')) return 'proses';
  return 'belum';
}

const canPreview = (item) =>
  SPBY_CHILDREN.includes(item.definition_id) ||
  !!item.instance_id ||
  Object.keys(item.data || {}).length > 0;

const formatRupiah = (n) => 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');

/**
 * Susun baris tampilan satu fase:
 * - fase dengan form hub tersembunyi (SPBY) → satu kelompok: hub + dokumen turunannya
 * - dokumen per pegawai (mis. SPD) → satu kelompok berisi satu baris per pegawai
 * - selain itu → satu baris per dokumen
 */
function buildRows(phaseItems, templatePhase) {
  const hub = phaseItems.find((i) => i.is_hub && i.is_hidden);
  if (hub) {
    return [
      {
        type: 'group',
        key: hub.id,
        label: GROUP_LABELS[hub.definition_id] || hub.surat_nama,
        kode: hub.kode,
        formItem: hub,
        members: phaseItems,
        subItems: phaseItems.filter((i) => i.id !== hub.id),
      },
    ];
  }

  const rows = [];
  const groups = {};
  phaseItems.forEach((item) => {
    const tpl = templatePhase?.items.find((t) => t.kode === item.kode);
    if (tpl?.per_pegawai) {
      if (!groups[item.kode]) {
        groups[item.kode] = {
          type: 'group',
          key: `kelompok-${item.kode}`,
          label: tpl.surat_nama,
          kode: item.kode,
          subItems: [],
        };
        rows.push(groups[item.kode]);
      }
      groups[item.kode].subItems.push(item);
    } else {
      rows.push({ type: 'single', key: item.id, item });
    }
  });

  Object.values(groups).forEach((g) => {
    g.formItem = g.subItems[0];
    g.members = g.subItems;
  });
  return rows;
}

/** Nama pelaksana: dari form Surat Perintah, cadangan dari data paket. */
function namaPelaksana(items, pack) {
  const list = items.find((i) => i.kode === 'SP')?.data?.pegawai_list;
  if (Array.isArray(list) && list.length > 0) return list.map((s) => String(s).split('\n')[0]);
  return (pack.pegawai_list || []).map((p) => p.nama).filter(Boolean);
}

/** Total biaya dari detail transaksi SPBY, cadangan dari data paket. */
function totalBiaya(items, pack) {
  const rows = items.find((i) => i.kode === 'SPBY')?.data?.detail_transaksi;
  if (Array.isArray(rows) && rows.length > 0) {
    return rows.reduce(
      (sum, r) => sum + (Number(String(r.jumlah ?? '').replace(/[^0-9]/g, '')) || 0),
      0,
    );
  }
  return Number(pack.total_biaya) || 0;
}

/**
 * @param {{
 *   packId: string,
 *   currentUser: object
 * }} props
 */
export default function PackDetail({ packId, currentUser }) {
  const navigate = useNavigate();
  const { pack, items, loading, error } = useLPJPackDetail(packId);
  const [busy, setBusy] = useState(''); // key baris yang sedang ditandai selesai
  const [confirm, setConfirm] = useState(null); // { key, label, items }
  const [previewItem, setPreviewItem] = useState(null);

  if (loading) return <LoadingSkeleton />;
  if (error || !pack) return <ErrorState message={error} />;

  const isPerjadin = pack.type === 'perjadin';
  const packType = isPerjadin ? PACK_TYPES.perjadin : PACK_TYPES.non_perjadin;
  const templatePhases = isPerjadin ? PERJADIN_PHASES : NON_PERJADIN_PHASES;

  // Kelompokkan item per fase (urutan mengikuti `urutan` item)
  const phaseMap = new Map();
  items.forEach((item) => {
    const key = item.phase_id || 'lainnya';
    if (!phaseMap.has(key)) {
      phaseMap.set(key, { id: key, label: item.phase_label || 'Lainnya', items: [] });
    }
    phaseMap.get(key).items.push(item);
  });
  const phases = [...phaseMap.values()].map((p) => {
    const tpl = templatePhases.find((t) => t.id === p.id);
    const done = p.items.filter(isDone).length;
    return {
      ...p,
      deskripsi: tpl?.deskripsi || '',
      rows: buildRows(p.items, tpl),
      done,
      total: p.items.length,
      pct: p.items.length ? Math.round((done / p.items.length) * 100) : 0,
      status: combinedStatus(p.items),
    };
  });

  const overallDone = items.filter(isDone).length;
  const overallPct = items.length ? Math.round((overallDone / items.length) * 100) : 0;
  const faseAktif = phases.find((p) => p.status !== 'selesai');
  const pelaksana = namaPelaksana(items, pack);
  const biaya = totalBiaya(items, pack);
  const spdData = items.find((i) => i.kode === 'SPD' && i.data?.tanggal_berangkat)?.data || {};

  const handleStatusChange = async (item, newStatus) => {
    try {
      const itemRef = doc(db, 'lpj_packs', packId, 'surat_items', item.id);

      const updateData = {
        status: newStatus,
        updated_at: serverTimestamp(),
      };

      if (newStatus === 'completed') {
        updateData.completed_at = serverTimestamp();
        updateData.completed_by = currentUser?.uid;
        updateData.completed_by_nama = currentUser?.displayName || currentUser?.email;
      } else if (newStatus === 'in_progress') {
        updateData.started_at = serverTimestamp();
      }

      await updateDoc(itemRef, updateData);

      // --- FALLBACK FRONTEND UNTUK UNLOCK DEPENDENCY ---
      if (newStatus === 'completed') {
        const itemsSnap = await getDocs(collection(db, 'lpj_packs', packId, 'surat_items'));
        const allItems = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const completedIds = new Set(
          allItems.filter((i) => i.status === 'completed' || i.id === item.id).map((i) => i.id),
        );

        const batch = writeBatch(db);
        let hasUnlocks = false;

        allItems.forEach((depItem) => {
          if (depItem.status === 'completed') return;
          if (!depItem.depends_on || depItem.depends_on.length === 0) return;
          if (!depItem.is_blocked) return;

          const allDepsMet = depItem.depends_on.every((dep) => {
            if (completedIds.has(dep)) return true;
            const prefixItems = allItems.filter((i) => i.id === dep || i.id.startsWith(dep + '-'));
            if (prefixItems.length === 0) return false;
            return prefixItems.every((i) => completedIds.has(i.id));
          });

          if (allDepsMet) {
            const depRef = doc(db, 'lpj_packs', packId, 'surat_items', depItem.id);
            batch.update(depRef, { is_blocked: false, updated_at: serverTimestamp() });
            hasUnlocks = true;
          }
        });

        if (hasUnlocks) {
          await batch.commit();
        }

        // --- FALLBACK PROGRESS CALCULATION ---
        const total = allItems.length;
        const completedCount = completedIds.size;
        const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;

        await updateDoc(doc(db, 'lpj_packs', packId), {
          'progress.total': total,
          'progress.completed': completedCount,
          'progress.percentage': percentage,
          status: percentage === 100 ? 'completed' : 'in_progress',
          updated_at: serverTimestamp(),
        });
      }
      return true;
    } catch (err) {
      console.error('Gagal update status:', err);
      alert('Gagal mengupdate status surat.');
      return false;
    }
  };

  const handlePreview = (item) => {
    const suratDef = SURAT_REGISTRY.find((s) => s.id === item.definition_id);
    if (!suratDef) {
      alert('Definisi surat tidak ditemukan!');
      return;
    }

    let instanceData = {};

    // Merge semua data dari item yang sudah ada agar variabel lintas dokumen tersedia
    items.forEach((i) => {
      if (i.data) {
        instanceData = { ...instanceData, ...i.data };
      }
    });

    // Override dengan data item ini sendiri
    if (item.data) {
      instanceData = { ...instanceData, ...item.data };
    }

    // Phase 2 Child sync: Inject SPBY data dynamically
    if (SPBY_CHILDREN.includes(item.definition_id)) {
      const spbyItem = items.find((i) => i.definition_id === 'spby');
      if (spbyItem && spbyItem.data) {
        instanceData = { ...instanceData, ...spbyItem.data };
      }
    }

    // Inject pack info
    instanceData.nomor_bundle = pack.nomor_bundle;

    if (item._filterPegawai && Array.isArray(instanceData.detail_transaksi)) {
      instanceData.detail_transaksi = instanceData.detail_transaksi.filter(
        (r) => r.pegawai === item._filterPegawai,
      );
    }

    setPreviewItem({
      ...suratDef,
      instanceData,
      _packItem: item,
    });
  };

  // Buka form surat untuk item tertentu (status → in_progress bila belum dimulai)
  const handleOpenForm = (item) => {
    if (item.status === 'not_started') handleStatusChange(item, 'in_progress');
    navigate(
      `/e-persuratan/persuratan/form/${item.definition_id}?packId=${packId}&itemId=${item.id}`,
    );
  };

  // Tandai selesai berurutan (induk lebih dulu agar dokumen turunannya terbuka)
  const handleConfirmSelesai = async () => {
    const { key, items: targets } = confirm;
    setConfirm(null);
    setBusy(key);
    for (const item of targets) {
      if (isDone(item)) continue;
      const ok = await handleStatusChange(item, 'completed');
      if (!ok) break;
    }
    setBusy('');
  };

  const askSelesai = (key, label, targets) => setConfirm({ key, label, items: targets });

  const summary = [
    ['Pelaksana', pelaksana.join(', ')],
    ['Seksi', ''],
    ['Berangkat', formatTanggal(spdData.tanggal_berangkat || pack.tanggal_mulai)],
    ['Kembali', formatTanggal(spdData.tanggal_kembali || pack.tanggal_selesai)],
    [
      'Tanggal LPJ',
      pack.created_at?.toDate ? pack.created_at.toDate().toLocaleDateString('id-ID') : '',
    ],
    ['Total Biaya', formatRupiah(biaya)],
  ];

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] overflow-y-auto custom-scrollbar">
      <div className="px-4 sm:px-6 lg:px-12 py-6 sm:py-8 max-w-5xl mx-auto w-full shrink-0">
        <button
          onClick={() => navigate('/e-persuratan/lpj')}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white font-semibold mb-5 transition-colors"
        >
          <FaArrowLeft size={12} /> Kembali ke Daftar LPJ
        </button>

        {/* Kartu judul */}
        <div className="bg-gradient-to-r from-[#0f2040] to-[#1e4080] rounded-2xl px-5 sm:px-6 py-5 mb-5 text-white shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2.5">
                <span className="text-[11.5px] font-bold px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20">
                  {pack.id}
                </span>
                <span className="text-[11.5px] font-bold px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20">
                  {packType.label}
                </span>
                <span
                  className={`text-[11.5px] font-semibold px-2.5 py-0.5 rounded-full bg-white border border-white/40 ${
                    faseAktif ? 'text-blue-700' : 'text-green-700'
                  }`}
                >
                  {faseAktif ? faseAktif.label : 'Selesai'}
                </span>
              </div>
              <h1 className="text-lg sm:text-[21px] font-bold leading-snug break-words">
                {pack.judul || pack.perihal}
              </h1>
              <p className="text-[12.5px] text-white/65 mt-2">
                {pelaksana.join(', ') || '—'} · TOTAL BIAYA{' '}
                <strong className="text-white">{formatRupiah(biaya)}</strong>
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-2xl sm:text-[26px] font-extrabold leading-none">
                {overallPct}%
              </div>
              <div className="text-[11.5px] text-white/65 font-semibold mt-1 whitespace-nowrap">
                {overallDone}/{items.length} dokumen selesai
              </div>
            </div>
          </div>
          <ProgressBar
            value={overallPct}
            className={`mt-4 h-1.5 rounded-full bg-white/15 [&::-webkit-progress-bar]:bg-white/15 [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:rounded-full ${
              overallPct === 100
                ? '[&::-webkit-progress-value]:bg-green-400 [&::-moz-progress-bar]:bg-green-400'
                : '[&::-webkit-progress-value]:bg-sky-300 [&::-moz-progress-bar]:bg-sky-300'
            }`}
          />
        </div>

        {/* Ringkasan (khusus Perjalanan Dinas) */}
        {isPerjadin && (
          <div className="bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-3.5 mb-6 flex flex-wrap gap-x-8 gap-y-3">
            {summary.map(([label, val]) => (
              <div key={label} className="min-w-0">
                <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                  {label}
                </div>
                <div className="text-[13px] font-medium text-slate-800 dark:text-slate-200 break-words">
                  {val || '—'}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Kartu per fase */}
        <div className="space-y-4">
          {phases.map((phase, idx) => {
            const locked = phase.status === 'terkunci';
            const cfg = STATUS_CFG[phase.status];
            const aktif = phase.status === 'selesai' || phase.status === 'proses';
            return (
              <section
                key={phase.id}
                className={`bg-white dark:bg-[#162032] border rounded-2xl overflow-hidden ${cfg.card} ${
                  locked ? 'opacity-80' : ''
                }`}
              >
                <div className="flex flex-wrap items-center gap-3 px-4 sm:px-5 py-4">
                  <div
                    className={`w-9 h-9 shrink-0 rounded-[10px] flex items-center justify-center ${
                      aktif
                        ? 'bg-[#0f2040] dark:bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {phase.status === 'selesai' ? (
                      <FaCheck size={14} />
                    ) : locked ? (
                      <FaLock size={13} />
                    ) : (
                      <span className="text-sm font-extrabold">{idx + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <h2 className="font-bold text-[14.5px] text-slate-900 dark:text-white">
                      {phase.label}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {phase.done}/{phase.total} selesai
                      {phase.deskripsi ? ` · ${phase.deskripsi}` : ''}
                      {locked ? ' · menunggu tahap sebelumnya' : ''}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${cfg.badge}`}
                  >
                    {cfg.label}
                  </span>
                </div>
                <ProgressBar
                  value={phase.pct}
                  className={`h-1 bg-slate-100 dark:bg-slate-800 [&::-webkit-progress-bar]:bg-slate-100 dark:[&::-webkit-progress-bar]:bg-slate-800 ${
                    locked
                      ? '[&::-webkit-progress-value]:bg-slate-300 [&::-moz-progress-bar]:bg-slate-300'
                      : '[&::-webkit-progress-value]:bg-[#0f2040] [&::-moz-progress-bar]:bg-[#0f2040] dark:[&::-webkit-progress-value]:bg-blue-500 dark:[&::-moz-progress-bar]:bg-blue-500'
                  }`}
                />

                {locked ? (
                  <div className="flex items-center gap-2 px-4 sm:px-5 py-4 text-[12.5px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800">
                    <FaLock size={13} className="shrink-0" />
                    <span>
                      {idx > 0
                        ? `Selesaikan "${phases[idx - 1].label}" terlebih dahulu untuk membuka fase ini.`
                        : 'Fase ini masih terkunci.'}
                    </span>
                  </div>
                ) : (
                  phase.rows.map((row) =>
                    row.type === 'group' ? (
                      <GroupRow
                        key={row.key}
                        row={row}
                        busy={busy === row.key}
                        onOpenForm={handleOpenForm}
                        onPreview={handlePreview}
                        onSelesai={() => askSelesai(row.key, row.label, row.members)}
                      />
                    ) : (
                      <DocRow
                        key={row.key}
                        item={row.item}
                        busy={busy === row.key}
                        onOpenForm={handleOpenForm}
                        onPreview={handlePreview}
                        onSelesai={() => askSelesai(row.key, row.item.surat_nama, [row.item])}
                      />
                    ),
                  )
                )}
              </section>
            );
          })}
        </div>
      </div>

      {confirm && (
        <ConfirmSelesaiModal
          label={confirm.label}
          onYes={handleConfirmSelesai}
          onNo={() => setConfirm(null)}
        />
      )}
      {previewItem && (
        <SuratPreviewModal surat={previewItem} onClose={() => setPreviewItem(null)} />
      )}
    </div>
  );
}

// ─── Sub-komponen ─────────────────────────────────────────────────────────────

/** Bilah progres tanpa inline style; warna diatur lewat kelas pseudo-element. */
function ProgressBar({ value, className = '' }) {
  return (
    <progress
      value={value}
      max={100}
      aria-label={`${value}% selesai`}
      className={`block w-full appearance-none border-0 overflow-hidden ${className}`}
    />
  );
}

function StatusIcon({ status }) {
  const cls = {
    selesai: 'bg-green-600 text-white',
    proses: 'bg-[#0f2040] dark:bg-blue-600 text-white',
    belum: 'bg-slate-100 dark:bg-slate-800 text-slate-400',
    terkunci: 'bg-slate-100 dark:bg-slate-800 text-slate-400',
  }[status];
  const Icon = { selesai: FaCheck, proses: FaClock, belum: FaRegFileAlt, terkunci: FaLock }[status];
  return (
    <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${cls}`}>
      <Icon size={13} />
    </div>
  );
}

function KodeBadge({ kode }) {
  if (!kode) return null;
  return (
    <span className="text-[10px] font-extrabold tracking-wide px-[7px] py-[3px] rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0 whitespace-nowrap">
      {kode}
    </span>
  );
}

function BusyLabel() {
  return (
    <>
      <FaCircleNotch className="animate-spin" size={12} /> Memproses...
    </>
  );
}

/** Tombol aksi sesuai status: belum → Buat Sekarang; proses → Edit + Tandai Selesai; selesai → Edit */
function Actions({ status, busy, previewItem, onPreview, onOpen, onSelesai }) {
  if (status === 'terkunci') return null;
  if (status === 'belum') {
    return (
      <button type="button" className={BTN_ACTION} onClick={onOpen}>
        <FaPlus size={11} /> Buat Sekarang
      </button>
    );
  }
  return (
    <div className="flex flex-wrap gap-2 shrink-0">
      {previewItem && (
        <button
          type="button"
          className={BTN_SM}
          disabled={!canPreview(previewItem)}
          onClick={() => onPreview(previewItem)}
        >
          <FaEye size={12} /> Lihat
        </button>
      )}
      <button type="button" className={BTN_SM} onClick={onOpen} disabled={busy}>
        <FaEdit size={12} /> Edit
      </button>
      {status === 'proses' && (
        <button type="button" className={BTN_DONE} onClick={onSelesai} disabled={busy}>
          {busy ? (
            <BusyLabel />
          ) : (
            <>
              <FaCheck size={11} /> Tandai Selesai
            </>
          )}
        </button>
      )}
    </div>
  );
}

function DocRow({ item, busy, onOpenForm, onPreview, onSelesai }) {
  const status = statusOf(item);
  const locked = status === 'terkunci';
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-[13px] border-t border-slate-200 dark:border-slate-800 ${
        locked ? 'opacity-70' : ''
      }`}
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <StatusIcon status={status} />
        <KodeBadge kode={item.kode} />
        <div className="flex-1 min-w-0">
          <div
            className={`text-[13px] font-semibold ${
              locked ? 'text-slate-400' : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {item.surat_nama}
          </div>
          <div className="text-[11px] text-slate-400 mt-px">
            {locked
              ? 'Menunggu dokumen sebelumnya selesai'
              : item.assigned_name
                ? `Ditugaskan ke ${item.assigned_name}`
                : ''}
          </div>
        </div>
      </div>
      <Actions
        status={status}
        busy={busy}
        previewItem={item}
        onPreview={onPreview}
        onOpen={() => onOpenForm(item)}
        onSelesai={onSelesai}
      />
    </div>
  );
}

function GroupRow({ row, busy, onOpenForm, onPreview, onSelesai }) {
  const status = combinedStatus(row.members);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-[13px] border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <StatusIcon status={status} />
          <KodeBadge kode={row.kode} />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
              {row.label}
            </div>
            <div className="text-[11px] text-slate-400 mt-px">
              {row.subItems.filter(isDone).length}/{row.subItems.length} dokumen selesai
            </div>
          </div>
        </div>
        <Actions
          status={status}
          busy={busy}
          onPreview={onPreview}
          onOpen={() => onOpenForm(row.formItem)}
          onSelesai={onSelesai}
        />
      </div>

      {row.subItems.map((sub) => {
        const subStatus = statusOf(sub);
        const done = subStatus === 'selesai';
        const tersedia = subStatus !== 'terkunci' && canPreview(sub);
        return (
          <div
            key={sub.id}
            className="flex items-center justify-between gap-2.5 py-[9px] pl-6 sm:pl-[52px] pr-4 sm:pr-5 border-t border-slate-200 dark:border-slate-800"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-[18px] h-[18px] shrink-0 rounded-md flex items-center justify-center ${
                  done ? 'bg-green-600 text-white' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                {done && <FaCheck size={9} />}
              </span>
              <KodeBadge kode={sub.kode} />
              <span className="text-[12.5px] text-slate-600 dark:text-slate-300 truncate">
                {sub.surat_nama}
              </span>
            </div>
            {tersedia ? (
              <button
                type="button"
                className={`${BTN_SM} px-2.5 py-1 text-[11.5px]`}
                onClick={() => onPreview(sub)}
              >
                <FaEye size={11} /> Lihat
              </button>
            ) : (
              <span className="text-[11px] text-slate-400 shrink-0">Belum tersedia</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-12 space-y-4 animate-pulse max-w-6xl mx-auto w-full">
      <div className="h-8 bg-slate-200 rounded w-1/3 mb-6" />
      <div className="h-32 bg-slate-100 rounded-2xl w-full mb-8" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 mt-6">
          <div className="h-6 bg-slate-100 rounded w-1/4 mb-4" />
          {[1, 2].map((j) => (
            <div key={j} className="h-14 bg-slate-50 rounded-xl mb-3" />
          ))}
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6 text-center">
      <div>
        <p className="text-4xl mb-3">??</p>
        <p className="text-slate-600 font-medium">{message || 'Terjadi kesalahan.'}</p>
      </div>
    </div>
  );
}
