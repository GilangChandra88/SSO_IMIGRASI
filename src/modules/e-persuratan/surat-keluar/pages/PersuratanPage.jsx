/**
 * Persuratan — Halaman Utama
 * ===========================
 * Hub manajemen semua jenis surat di sistem Imigrasi.
 *
 * Akses:
 *  - Semua member: bisa lihat Kartu Surat
 *  - Admin & Super Admin: bisa lihat Flow Visual (monitoring alur)
 *
 * Tab 1: Kartu Surat — Grid card visual semua jenis surat
 * Tab 2: Flow Visual — Diagram aliran koneksi antar surat (Admin only)
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTh, FaProjectDiagram, FaLock } from 'react-icons/fa';
import { SURAT_REGISTRY } from '@/data/surat';
import { useAuth } from '@/context/AuthContext';
import CardView from '../components/CardView';
import FlowView from '../components/FlowView';
import { ANIM } from '@/utils/animasi';
import SuratPreviewModal from '@/components/SuratPreview/SuratPreviewModal';

export default function Persuratan() {
  const navigate = useNavigate();
  const { isKeuangan } = useAuth();
  const canSeeFlow = isKeuangan;

  // Definisi surat adalah kode (SURAT_REGISTRY); tidak ada salinan di Firestore.
  const suratList = SURAT_REGISTRY;

  const [activeTab, setActiveTab] = useState('kartu');
  const [highlightId, setHighlightId] = useState(null);
  const [previewSurat, setPreviewSurat] = useState(null);

  // Klik "Buka" di card
  const handleSelectSurat = (surat) => {
    navigate(`/e-persuratan/persuratan/form/${surat.id}`);
  };

  // Klik "Lihat di Flow" di card → switch ke tab Flow + highlight node
  const handleShowInFlow = (suratId) => {
    if (!canSeeFlow) return;
    setHighlightId(suratId);
    setActiveTab('flow');
    setTimeout(() => setHighlightId(null), 3000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      {/* ── Header ── */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-5 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-wrap items-start justify-between gap-4">
          {/* Judul */}
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              Persuratan
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {canSeeFlow
                ? 'Monitor semua jenis surat dan aliran hubungan antar dokumen.'
                : 'Lihat semua jenis surat yang tersedia di sistem.'}
            </p>
          </div>
        </div>

        {/* ── Tab Switcher ── */}
        <div className="max-w-7xl mx-auto mt-4 flex items-center gap-6">
          <button
            onClick={() => setActiveTab('kartu')}
            className={`flex items-center gap-2 py-4 px-1 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'kartu'
                ? 'border-slate-800 dark:border-slate-300 text-slate-800 dark:text-slate-100'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <FaTh size={14} /> Kartu Surat
          </button>

          {canSeeFlow ? (
            <button
              onClick={() => setActiveTab('flow')}
              className={`flex items-center gap-2 py-4 px-1 text-sm font-bold border-b-2 transition-colors ${
                activeTab === 'flow'
                  ? 'border-slate-800 dark:border-slate-300 text-slate-800 dark:text-slate-100'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <FaProjectDiagram size={14} /> Flow Visual
            </button>
          ) : (
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
                            text-slate-300 cursor-not-allowed select-none"
              title="Hanya Admin yang dapat melihat Flow Monitoring"
            >
              <FaProjectDiagram size={13} />
              Flow Visual
              <FaLock size={10} />
            </div>
          )}
        </div>
      </div>

      {/* ── Konten ── */}
      <div className="flex-1 overflow-hidden p-6">
        <div className="max-w-7xl mx-auto h-full flex flex-col">
          {/* CardView — semua user */}
          {activeTab === 'kartu' && (
            <div className={`flex-1 min-h-0 flex flex-col ${ANIM.muncul}`}>
              <CardView
                suratList={suratList}
                onSelectSurat={handleSelectSurat}
                onPreviewSurat={setPreviewSurat}
                onShowInFlow={canSeeFlow ? handleShowInFlow : null}
              />
            </div>
          )}

          {/* FlowView — admin only */}
          {activeTab === 'flow' && canSeeFlow && (
            <div className={`flex-1 min-h-0 flex flex-col ${ANIM.pudar}`}>
              <FlowView
                suratList={suratList}
                highlightId={highlightId}
                onSelectSurat={handleSelectSurat}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal Preview Surat */}
      {previewSurat && (
        <SuratPreviewModal surat={previewSurat} onClose={() => setPreviewSurat(null)} />
      )}

      {/* ── Stats Footer ── */}
      <div className="bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-800 px-6 py-3 print:hidden">
        <div className="max-w-7xl mx-auto flex items-center gap-6 flex-wrap">
          <Stat value={suratList.length} label="Jenis Surat" />
          <Stat
            value={suratList.filter((s) => s.status === 'active').length}
            label="Aktif"
            color="text-emerald-600"
          />
          <Stat
            value={suratList.filter((s) => s.status === 'draft').length}
            label="Draft"
            color="text-amber-600"
          />
          <Stat
            value={suratList.reduce((a, s) => a + (s.connections?.length || 0), 0)}
            label="Total Koneksi"
            color="text-indigo-600"
          />
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label, color = 'text-slate-800 dark:text-slate-100' }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-lg font-bold ${color}`}>{value}</span>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}
