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
import {
  FaTh,
  FaProjectDiagram,
  FaSync,
  FaDatabase,
  FaExclamationCircle,
  FaLock,
  FaBolt,
} from 'react-icons/fa';
import { useSuratDefinitions } from '../hooks/useSuratDefinitions';
import { useAuth } from '@/context/AuthContext';
import CardView from '../components/CardView';
import FlowView from '../components/FlowView';
import SuratPreviewModal from '@/components/SuratPreview/SuratPreviewModal';

export default function Persuratan() {
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin } = useAuth();
  const canSeeFlow = isAdmin || isSuperAdmin;

  const { suratList, loading, error, syncToFirestore, isSynced } = useSuratDefinitions();

  const [activeTab, setActiveTab] = useState('kartu');
  const [highlightId, setHighlightId] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
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

  // Sync data registry lokal → Firestore
  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMsg('');
    try {
      await syncToFirestore();
      setSyncMsg('✓ Berhasil disinkronkan ke database!');
      setTimeout(() => setSyncMsg(''), 4000);
    } catch {
      setSyncMsg('✗ Gagal sinkronisasi. Coba lagi.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Hitung stats global
  const totalAktif = suratList.reduce((acc, s) => acc + (s.stats?.active || 0), 0);
  const totalBulanIni = suratList.reduce((acc, s) => acc + (s.stats?.thisMonth || 0), 0);

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

          {/* Aksi header — hanya untuk Admin */}
          {canSeeFlow && (
            <div className="flex items-center gap-3">
              {/* Alert: ada surat aktif */}
              {totalAktif > 0 && (
                <span
                  className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold
                                 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl"
                >
                  <FaBolt size={10} />
                  {totalAktif} surat sedang berjalan
                </span>
              )}

              {/* Status sync */}
              {!isSynced && !loading && (
                <span
                  className="flex items-center gap-1.5 text-xs text-amber-600 font-semibold
                                 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl"
                >
                  <FaDatabase size={10} />
                  Data lokal (belum disimpan ke DB)
                </span>
              )}
              {isSynced && (
                <span
                  className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold
                                 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl"
                >
                  <FaDatabase size={10} />
                  Tersinkron
                </span>
              )}

              {!isSynced && (
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="flex items-center gap-2 text-sm font-bold px-4 py-2 bg-slate-800 text-white
                             rounded-lg hover:bg-slate-900 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <FaSync size={12} className={isSyncing ? 'animate-spin' : ''} />
                  {isSyncing ? 'Menyinkronkan...' : 'Simpan ke Database'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pesan sync */}
        {syncMsg && (
          <div
            className={`max-w-7xl mx-auto mt-3 text-xs font-semibold px-3 py-2 rounded-xl ${
              syncMsg.startsWith('✓')
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {syncMsg}
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="max-w-7xl mx-auto mt-3 flex items-center gap-2 text-xs font-semibold
                          px-3 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200"
          >
            <FaExclamationCircle size={11} />
            {error}
          </div>
        )}

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
              {totalAktif > 0 && (
                <span
                  className="bg-amber-400 text-white text-[9px] font-bold
                                 px-1.5 py-0.5 rounded-full leading-none"
                >
                  {totalAktif}
                </span>
              )}
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
          {/* Loading skeleton */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 h-44 animate-pulse"
                >
                  <div className="flex gap-3 mb-3">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800/50 rounded-xl shrink-0" />
                    <div className="flex-1">
                      <div className="h-2.5 bg-slate-100 dark:bg-slate-800/50 rounded w-16 mb-1.5" />
                      <div className="h-3.5 bg-slate-100 dark:bg-slate-800/50 rounded w-3/4" />
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800/50 rounded w-full mb-1.5" />
                  <div className="h-2 bg-slate-100 dark:bg-slate-800/50 rounded w-2/3" />
                </div>
              ))}
            </div>
          )}

          {/* CardView — semua user */}
          {!loading && activeTab === 'kartu' && (
            <CardView
              suratList={suratList}
              onSelectSurat={handleSelectSurat}
              onPreviewSurat={setPreviewSurat}
              onShowInFlow={canSeeFlow ? handleShowInFlow : null}
            />
          )}

          {/* FlowView — admin only */}
          {!loading && activeTab === 'flow' && canSeeFlow && (
            <FlowView
              suratList={suratList}
              highlightId={highlightId}
              onSelectSurat={handleSelectSurat}
            />
          )}
        </div>
      </div>

      {/* Modal Preview Surat */}
      {previewSurat && (
        <SuratPreviewModal surat={previewSurat} onClose={() => setPreviewSurat(null)} />
      )}

      {/* ── Stats Footer ── */}
      {!loading && (
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
            {canSeeFlow && (
              <>
                <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
                <Stat value={totalAktif} label="Sedang Berjalan" color="text-amber-600" />
                <Stat
                  value={totalBulanIni}
                  label="Dibuat Bulan Ini"
                  color="text-slate-600 dark:text-slate-300"
                />
              </>
            )}
          </div>
        </div>
      )}
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
