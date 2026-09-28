/**
 * LPJ - Halaman Utama Manajemen Paket LPJ
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaPlus, FaSearch, FaChevronRight, FaFilter } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import { useLPJPacks } from '../hooks/useLPJ';
import { PACK_TYPES } from '../data/packTemplates';
import CreatePackModal from '../components/CreatePackModal';
import PackDetail from './PackDetail';

export default function LPJ() {
  const { packId } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAdmin, isSuperAdmin } = useAuth();
  const canManage = isAdmin || isSuperAdmin;

  const [showCreate, setShowCreate] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');

  const { packs, loading } = useLPJPacks({
    isAdmin: canManage,
    userUid: currentUser?.uid || '',
  });

  if (packId) {
    return <PackDetail packId={packId} currentUser={currentUser} isAdmin={canManage} />;
  }

  const filtered = packs.filter((p) => {
    const matchSearch =
      !search ||
      p.judul?.toLowerCase().includes(search.toLowerCase()) ||
      p.id?.toLowerCase().includes(search.toLowerCase());

    if (filterType === 'perjadin' && p.type !== 'perjadin') return false;
    if (filterType === 'non_perjadin' && p.type === 'perjadin') return false;

    return matchSearch;
  });

  const getSeksi = (pack) => {
    if (pack.tujuan && pack.tujuan.toLowerCase().includes('lalin')) return 'LALINTALKIM';
    if (pack.tujuan && pack.tujuan.toLowerCase().includes('intel')) return 'INTELDAKIM';
    if (pack.tujuan && pack.tujuan.toLowerCase().includes('tikim')) return 'TIKIM';
    if (pack.tujuan && pack.tujuan.toLowerCase().includes('keuangan')) return 'Keuangan';
    if (pack.tujuan && pack.tujuan.toLowerCase().includes('kepegawaian')) return 'Kepegawaian';
    if (pack.type === 'perjadin') return 'Umum';
    return 'Keuangan';
  };

  const getTahap = (pack) => {
    if (pack.status === 'completed') return 'Selesai';
    if (pack.status === 'archived') return 'Diarsipkan';
    const total = pack.progress?.total || 1;
    const completed = pack.progress?.completed || 0;

    if (completed === 0) return 'Tahap 1 - Dok. Awal';
    if (completed === total) return 'Selesai';
    if (completed > total / 2) return 'Tahap 3 - Validasi';
    return 'Tahap 2 - LPJ';
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0f172a]">
      {/* Header */}
      <div className="px-6 py-6 bg-slate-50 dark:bg-[#0f172a]">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Daftar LPJ
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {filtered.length} laporan tercatat
            </p>
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-[#1e293b] text-white dark:text-slate-100 text-sm font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <FaPlus size={12} /> Buat Laporan
          </button>
        </div>
      </div>

      {/* Controls Row */}
      <div className="px-6 pb-4 max-w-7xl mx-auto w-full">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex-1 w-full max-w-2xl relative">
            <FaSearch
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={14}
            />
            <input
              type="text"
              placeholder="Cari nama kegiatan atau nomor LPJ..."
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#162032] border border-slate-200 dark:border-[#1e293b] rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-400 dark:placeholder-slate-500 shadow-sm transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <button
              onClick={() => setFilterType('all')}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-colors ${filterType === 'all' ? 'bg-slate-900 dark:bg-slate-800 text-white' : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilterType('perjadin')}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-colors ${filterType === 'perjadin' ? 'bg-slate-900 dark:bg-slate-800 text-white' : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}`}
            >
              Perjadin
            </button>
            <button
              onClick={() => setFilterType('non_perjadin')}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-colors ${filterType === 'non_perjadin' ? 'bg-slate-900 dark:bg-slate-800 text-white' : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}`}
            >
              Non Perjadin
            </button>

            <button className="flex items-center gap-2 px-4 py-2 ml-2 bg-transparent text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#1e293b] rounded-full text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <FaFilter size={12} /> Filter
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="px-6 pb-8 flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-7xl mx-auto bg-white dark:bg-[#162032] rounded-xl border border-slate-200 dark:border-[#1e293b] overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#1e293b] bg-slate-50/50 dark:bg-transparent">
                <th className="py-4 pl-6 pr-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 w-12 uppercase tracking-wider"></th>
                <th className="py-4 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 w-32 uppercase tracking-wider">
                  ID
                </th>
                <th className="py-4 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-1/3">
                  JUDUL LPJ
                </th>
                <th className="py-4 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 w-48 uppercase tracking-wider">
                  PELAKSANA
                </th>
                <th className="py-4 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 w-32 uppercase tracking-wider">
                  SEKSI
                </th>
                <th className="py-4 pr-6 pl-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 w-40 uppercase tracking-wider">
                  TAHAP
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    {loading ? 'Memuat data LPJ...' : 'Belum ada data laporan yang sesuai.'}
                  </td>
                </tr>
              ) : (
                filtered.map((pack) => {
                  const typeLabel = PACK_TYPES[pack.type]?.label || 'NON-Perjadin';
                  const pelaksana =
                    pack.pegawai_list && pack.pegawai_list.length > 0
                      ? pack.pegawai_list[0].nama
                      : pack.created_by_nama;
                  const extraCount = pack.pegawai_list ? pack.pegawai_list.length - 1 : 0;

                  // split LPJ-2026-0001 to LPJ-2026- \n 0001
                  const idParts = pack.id ? pack.id.split('-') : [];
                  const idTop = idParts.length >= 3 ? idParts.slice(0, 2).join('-') + '-' : pack.id;
                  const idBot = idParts.length >= 3 ? idParts.slice(2).join('-') : '';

                  return (
                    <tr
                      key={pack.id}
                      onClick={() => navigate(`/e-persuratan/lpj/${pack.id}`)}
                      className="border-b border-slate-100 dark:border-[#1e293b] hover:bg-slate-50/50 dark:hover:bg-[#1a2436] transition-colors cursor-pointer group"
                    >
                      <td className="py-5 pl-6 pr-4 text-slate-300 dark:text-slate-500 group-hover:text-slate-400 dark:group-hover:text-slate-300 transition-colors">
                        <FaChevronRight size={12} />
                      </td>
                      <td className="py-5 px-4 align-top">
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-[13px] leading-tight">
                          {idTop}
                          <br />
                          {idBot}
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 uppercase font-semibold">
                          {typeLabel}
                        </div>
                      </td>
                      <td className="py-5 px-4 align-top">
                        <div
                          className="font-bold text-slate-800 dark:text-slate-200 text-[13px] line-clamp-2 max-w-sm"
                          title={pack.judul || pack.perihal}
                        >
                          {pack.judul || pack.perihal}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-500 mt-1 truncate max-w-sm">
                          {pack.tujuan || '-'}
                        </div>
                      </td>
                      <td className="py-5 px-4 align-top">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-[13px]">
                            {pelaksana}
                          </span>
                          {extraCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-[#1e293b] rounded-md text-[10px] font-bold text-slate-500 dark:text-slate-400">
                              +{extraCount}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-5 px-4 align-top">
                        <span className="inline-flex items-center px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-500/30 bg-transparent text-indigo-700 dark:text-indigo-300 text-[11px] font-bold tracking-wide">
                          {getSeksi(pack)}
                        </span>
                      </td>
                      <td className="py-5 pr-6 pl-4 align-top">
                        <span className="inline-flex items-center px-4 py-1 rounded-full bg-amber-50 dark:bg-amber-100 text-slate-800 dark:text-slate-900 text-[11px] font-bold shadow-sm">
                          {getTahap(pack)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <CreatePackModal
          currentUser={currentUser}
          onClose={() => setShowCreate(false)}
          onSuccess={(id) => {
            setShowCreate(false);
            navigate(`/e-persuratan/lpj/${id}`);
          }}
        />
      )}
    </div>
  );
}
