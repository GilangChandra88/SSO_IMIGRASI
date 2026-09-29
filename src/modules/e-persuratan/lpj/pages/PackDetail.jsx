/**
 * PackDetail — Halaman Detail Paket LPJ
 * =======================================
 * Tampilan timeline per fase, status tiap surat, siapa assignee-nya,
 * dan aksi yang bisa dilakukan (Kerjakan / Selesai / Lihat).
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowLeft,
  FaCheck,
  FaPlay,
  FaLock,
  FaUser,
  FaClock,
  FaChevronDown,
  FaChevronUp,
  FaRegCircle,
  FaCircleNotch,
  FaCheckCircle,
  FaMinusCircle,
  FaRegFileAlt,
  FaEye,
  FaEdit,
} from 'react-icons/fa';
import { useLPJPackDetail } from '../hooks/useLPJ';
import { PACK_TYPES } from '../data/packTemplates';
import { formatTanggal } from '../utils/formatTanggal';
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

const STATUS_CONFIG = {
  not_started: { label: 'Belum Mulai', icon: <FaRegCircle />, color: 'text-slate-400' },
  in_progress: {
    label: 'Sedang Dikerjakan',
    icon: <FaCircleNotch className="animate-spin" />,
    color: 'text-indigo-500',
  },
  completed: { label: 'Selesai', icon: <FaCheckCircle />, color: 'text-slate-700' },
  not_required: { label: 'Tidak Diperlukan', icon: <FaMinusCircle />, color: 'text-slate-300' },
};

/**
 * @param {{
 *   packId: string,
 *   currentUser: object,
 *   isAdmin: boolean
 * }} props
 */
export default function PackDetail({ packId, currentUser, isAdmin }) {
  const navigate = useNavigate();
  const { pack, items, loading, error } = useLPJPackDetail(packId);
  const [updating, setUpdating] = useState(''); // itemId yang sedang diupdate
  const [collapsedPhases, setCollapsedPhases] = useState(new Set());
  const [previewItem, setPreviewItem] = useState(null);

  if (loading) return <LoadingSkeleton />;
  if (error || !pack) return <ErrorState message={error} />;

  const packType = PACK_TYPES[pack.type];

  // Group items by phase
  const phaseGroups = {};
  items.forEach((item) => {
    const key = item.phase_id || 'lainnya';
    if (!phaseGroups[key]) {
      phaseGroups[key] = { label: item.phase_label || 'Lainnya', items: [] };
    }
    phaseGroups[key].items.push(item);
  });

  const handlePhaseComplete = async (phaseItems) => {
    for (const item of phaseItems) {
      if (item.status !== 'completed' && !item.is_blocked) {
        await handleStatusChange(item, 'completed');
      }
    }
  };

  const handleStatusChange = async (item, newStatus) => {
    try {
      setUpdating(item.id);
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
    } catch (err) {
      console.error('Gagal update status:', err);
      alert('Gagal mengupdate status surat.');
    } finally {
      setUpdating(null);
    }
  };

  const togglePhase = (phaseId) => {
    setCollapsedPhases((prev) => {
      const next = new Set(prev);
      next.has(phaseId) ? next.delete(phaseId) : next.add(phaseId);
      return next;
    });
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
    const isPhase2Child = [
      'nota-dinas',
      'surat-perintah-bayar',
      'rincian-spby',
      'rincian-perjalanan-tugas',
      'sptjm-pelaksana',
      'nominatif',
      'kwitansi',
    ].includes(item.definition_id);

    if (isPhase2Child) {
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

  const handleNavigateToForm = (phaseItems) => {
    let hub = phaseItems.find((i) => i.definition_id === 'surat-perintah');
    if (!hub) hub = phaseItems.find((i) => i.definition_id === 'spby');
    if (!hub) hub = phaseItems[0];

    if (hub) {
      if (hub.status === 'not_started') handleStatusChange(hub, 'in_progress');
      navigate(
        `/e-persuratan/persuratan/form/${hub.definition_id}?packId=${packId}&itemId=${hub.id}`,
      );
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] overflow-y-auto custom-scrollbar">
      <div className="px-6 lg:px-12 py-8 max-w-6xl mx-auto w-full shrink-0">
        <button
          onClick={() => navigate('/e-persuratan/lpj')}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold mb-6 transition-colors"
        >
          <FaArrowLeft size={12} /> Kembali ke Daftar LPJ
        </button>

        {/* Hero Card */}
        <div className="bg-[#1e293b] rounded-[24px] p-8 lg:p-10 text-white mb-4 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl -mr-20 -mt-20"></div>

          {/* Top badges */}
          <div className="flex flex-wrap items-center gap-3 mb-8 relative z-10">
            <span className="px-4 py-1.5 bg-[#0f172a] text-white text-xs font-bold rounded-full border border-slate-700/50">
              Draft Aktif
            </span>
            <span className="px-4 py-1.5 bg-white text-slate-800 text-xs font-bold rounded-full">
              {packType?.label || pack.type}
            </span>
            <span className="px-4 py-1.5 bg-white/20 text-white text-xs font-bold rounded-full">
              {pack.status === 'completed' ? 'Selesai' : 'Draft'}
            </span>
          </div>

          <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-6 relative z-10">
            <div>
              <h1 className="text-3xl lg:text-4xl font-extrabold mb-3 tracking-tight">
                {pack.judul || pack.perihal}
              </h1>
              <p className="text-slate-300 text-sm font-medium">
                {pack.pegawai_list?.map((p) => p.nama).join(', ') || pack.created_by_nama}
                <span className="mx-3 text-slate-500">•</span>
                TOTAL BIAYA{' '}
                <span className="font-bold text-white">
                  {pack.total_biaya
                    ? new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                        minimumFractionDigits: 0,
                      }).format(pack.total_biaya)
                    : 'Rp 0'}
                </span>
              </p>
            </div>

            <div className="text-right">
              <div className="text-5xl lg:text-6xl font-black tracking-tighter mb-2">
                {pack.progress?.percentage || 0}%
              </div>
              <div className="text-slate-400 text-sm font-medium">
                {pack.progress?.completed || 0}/{pack.progress?.total || items.length} dokumen
                selesai
              </div>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 lg:p-8 mb-8 flex flex-wrap gap-8 lg:gap-16 text-sm shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              PELAKSANA
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {pack.pegawai_list?.[0]?.nama || pack.created_by_nama}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              SEKSI
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200">-</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              BERANGKAT
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {formatTanggal(pack.tanggal_mulai)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              KEMBALI
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {formatTanggal(pack.tanggal_selesai)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              TANGGAL LPJ
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {pack.created_at?.toDate ? pack.created_at.toDate().toLocaleDateString('id-ID') : '-'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              TOTAL BIAYA
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {pack.total_biaya
                ? new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0,
                  }).format(pack.total_biaya)
                : 'Rp 0'}
            </span>
          </div>
        </div>

        {/* Phases list */}
        <div className="space-y-4">
          {Object.entries(phaseGroups).map(([phaseId, group], index) => {
            const isLast = index === Object.keys(phaseGroups).length - 1;
            const allItems = group.items;
            const visibleItems = allItems.filter((i) => !i.is_hidden);

            const completedCount = allItems.filter(
              (i) => i.status === 'completed' || i.status === 'not_required',
            ).length;
            const isPhaseCompleted = completedCount === allItems.length && allItems.length > 0;
            const isPhaseInProgress = completedCount > 0 && completedCount < allItems.length;
            const isPhaseLocked = allItems.length > 0 && allItems[0].is_blocked;

            let badgeUI = null;
            if (isPhaseLocked) {
              badgeUI = (
                <span className="px-3 py-1 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-[11px] font-bold rounded-full border border-slate-200 dark:border-slate-700">
                  Terkunci
                </span>
              );
            } else if (isPhaseCompleted) {
              badgeUI = (
                <span className="px-3 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-bold rounded-full border border-slate-900 dark:border-white">
                  Selesai
                </span>
              );
            } else if (isPhaseInProgress) {
              badgeUI = (
                <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-[11px] font-bold rounded-full border border-blue-200 dark:border-blue-800/50">
                  Dalam Proses
                </span>
              );
            } else {
              badgeUI = (
                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-bold rounded-full border border-slate-200 dark:border-slate-700">
                  Belum Dimulai
                </span>
              );
            }

            return (
              <div
                key={phaseId}
                className="bg-white dark:bg-[#162032] border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 lg:p-8 shadow-sm"
              >
                {/* Phase Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-start sm:items-center gap-4 sm:gap-6">
                    <div className="w-12 h-12 shrink-0 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-800 dark:text-slate-200 font-bold border border-slate-100 dark:border-slate-700">
                      {isPhaseLocked ? <FaLock size={14} className="text-slate-400" /> : index + 1}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                        {group.label}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {completedCount}/{allItems.length} selesai -{' '}
                        {visibleItems
                          .map((i) => i.kode || i.surat_nama)
                          .slice(0, 3)
                          .join(', ')}
                        {visibleItems.length > 3 ? '...' : ''}
                        {isPhaseLocked ? ' - Menunggu tahap sebelumnya' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {badgeUI}

                    {!isPhaseLocked && !isPhaseCompleted && allItems.length > 0 && (
                      <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-3">
                        <button
                          onClick={() => handleNavigateToForm(allItems)}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-lg shadow-sm transition-colors"
                        >
                          Isi Form
                        </button>
                        <button
                          onClick={() => handlePhaseComplete(allItems)}
                          className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-600 text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                        >
                          <FaCheck size={10} /> Selesai
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Document Items */}
                <div className="space-y-0 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/20">
                  {isPhaseLocked ? (
                    <div className="flex items-center gap-3 p-6 text-sm text-slate-400 font-medium">
                      <FaLock />
                      Selesaikan fase sebelumnya terlebih dahulu untuk membuka fase ini.
                    </div>
                  ) : (
                    visibleItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className={
                          idx !== visibleItems.length - 1
                            ? 'border-b border-slate-100 dark:border-slate-800'
                            : ''
                        }
                      >
                        <SuratItemRow
                          item={item}
                          isAdmin={isAdmin}
                          isUpdating={updating === item.id}
                          currentUserUid={currentUser?.uid}
                          onStatusChange={handleStatusChange}
                          packId={packId}
                          navigate={navigate}
                          onPreview={() => handlePreview(item)}
                        />
                      </div>
                    ))
                  )}

                  {isLast && !isPhaseCompleted && !isPhaseLocked && (
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400 font-semibold text-sm">
                        <FaRegFileAlt size={14} /> Laporan Kegiatan
                      </div>
                      <button className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors shrink-0">
                        + Buat Sekarang
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {previewItem && (
        <SuratPreviewModal surat={previewItem} onClose={() => setPreviewItem(null)} />
      )}
    </div>
  );
}

// Sub-komponen
function SuratItemRow({
  item,
  isAdmin,
  isUpdating,
  currentUserUid,
  onStatusChange,
  packId,
  navigate,
  onPreview,
}) {
  const isCompleted = item.status === 'completed' || item.status === 'not_required';
  const isPhase2Child = [
    'nota-dinas',
    'surat-perintah-bayar',
    'rincian-spby',
    'rincian-perjalanan-tugas',
    'sptjm-pelaksana',
    'nominatif',
    'kwitansi',
  ].includes(item.definition_id);

  if (item.is_blocked) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 lg:px-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
            <FaLock size={14} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {item.kode && <span className="mr-2 text-slate-400">{item.kode}</span>}
              {item.surat_nama}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Selesaikan tahap sebelumnya terlebih dahulu
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 lg:px-6 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
      <div className="flex items-center gap-4">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isCompleted
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border border-slate-900 dark:border-white'
              : 'bg-white dark:bg-[#1e293b] text-slate-500 border border-slate-200 dark:border-slate-700 shadow-sm'
          }`}
        >
          {isCompleted ? <FaCheck size={14} /> : <FaRegFileAlt size={14} />}
        </div>
        <div>
          <p
            className={`text-sm font-bold ${isCompleted ? 'text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}
          >
            {item.kode && <span className="mr-2 text-slate-400">{item.kode}</span>}
            {item.surat_nama} {item.assigned_name ? `• ${item.assigned_name}` : ''}
          </p>
        </div>
      </div>

      <div className="flex items-center shrink-0">
        <button
          onClick={onPreview}
          disabled={!isPhase2Child && !item.instance_id}
          className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
        >
          Lihat
        </button>
      </div>
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
