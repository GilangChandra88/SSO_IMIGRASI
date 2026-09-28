/**
 * CardView — Tampilan Grid Kartu Surat
 * ======================================
 * Menampilkan semua jenis surat sebagai card grid yang responsif.
 * Tiap card menampilkan info singkat + aksi yang relevan.
 */

import React, { useState } from 'react';
import { FaLink, FaFileAlt, FaProjectDiagram, FaSearch, FaRegFileAlt, FaEye } from 'react-icons/fa';

// Hapus warna kategori yang bermacam-macam, ganti dengan style seragam yang elegan
const KATEGORI_WARNA = {
  'Layanan WNA':
    'bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700',
  'Surat Dinas':
    'bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700',
  'Layanan Umum':
    'bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700',
  Internal:
    'bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700',
};

/**
 * @param {{
 *   suratList: object[],
 *   onSelectSurat: (surat: object) => void,
 *   onPreviewSurat: (surat: object) => void,
 *   onShowInFlow: (suratId: string) => void
 * }} props
 */
export default function CardView({ suratList, onSelectSurat, onPreviewSurat, onShowInFlow }) {
  const [search, setSearch] = useState('');
  const [filterKategori, setFilterKategori] = useState('Semua');

  const kategoriList = ['Semua', ...new Set(suratList.map((s) => s.kategori).filter(Boolean))];

  const filtered = suratList.filter((s) => {
    const matchSearch =
      !search ||
      s.nama?.toLowerCase().includes(search.toLowerCase()) ||
      s.kode?.toLowerCase().includes(search.toLowerCase()) ||
      s.deskripsi?.toLowerCase().includes(search.toLowerCase());
    const matchKategori = filterKategori === 'Semua' || s.kategori === filterKategori;
    return matchSearch && matchKategori;
  });

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-2 pb-6">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <FaSearch
            size={13}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Cari dokumen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg
                       focus:outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-slate-800 focus:border-slate-800 transition-all shadow-sm"
          />
        </div>

        {/* Filter Kategori */}
        <div className="flex gap-2 flex-wrap">
          {kategoriList.map((k) => (
            <button
              key={k}
              onClick={() => setFilterKategori(k)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${
                filterKategori === k
                  ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grid Kartu ── */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-20">
          <FaRegFileAlt size={48} className="mb-4 opacity-20" />
          <p className="font-medium text-sm">Tidak ada dokumen yang ditemukan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((surat) => (
            <SuratCard
              key={surat.id}
              surat={surat}
              onOpen={() => onSelectSurat(surat)}
              onShowInFlow={() => onShowInFlow(surat.id)}
              onPreview={() => onPreviewSurat(surat)}
            />
          ))}
        </div>
      )}

      {/* ── Count ── */}
      {filtered.length > 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-6 border-t border-slate-200 dark:border-slate-700 pt-4">
          Menampilkan{' '}
          <strong className="text-slate-800 dark:text-slate-100 font-bold">
            {filtered.length}
          </strong>{' '}
          dari{' '}
          <strong className="text-slate-800 dark:text-slate-100 font-bold">
            {suratList.length}
          </strong>{' '}
          jenis dokumen
        </p>
      )}
    </div>
  );
}

// ─── Sub-komponen Card ────────────────────────────────────────────────────────

function SuratCard({ surat, onOpen, onShowInFlow, onPreview }) {
  const connCount = surat.connections?.length || 0;
  const varCount = surat.variables?.length || 0;
  const kategoriClass =
    KATEGORI_WARNA[surat.kategori] ||
    'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700';

  return (
    <div className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 flex flex-col relative overflow-hidden">
      {/* Garis Aksen Biru Dongker di Atas */}
      <div className="absolute top-0 left-0 w-full h-1 bg-slate-800 opacity-0 group-hover:opacity-100 transition-opacity"></div>

      {/* ── Document Thumbnail Preview ── */}
      <div className="w-full h-32 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-3 mb-4 flex flex-col relative overflow-hidden group-hover:border-slate-300 dark:hover:border-slate-600 group-hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
        {/* KOP Surat Skeleton */}
        <div className="flex gap-2 items-center border-b-2 border-slate-300 dark:border-slate-600 pb-1.5 mb-2">
          <div className="w-5 h-5 rounded-full bg-slate-300 shrink-0"></div>
          <div className="flex-1 flex flex-col gap-0.5 items-center">
            <div className="h-1 bg-slate-400 rounded w-3/4"></div>
            <div className="h-0.5 bg-slate-300 rounded w-1/2"></div>
            <div className="h-[1px] bg-slate-300 rounded w-full mt-0.5"></div>
          </div>
        </div>

        {/* Body Skeleton */}
        <div className="flex flex-col gap-1 flex-1">
          <div className="h-1 bg-slate-300 rounded w-1/4 mb-1"></div>
          <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
          <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
          <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded w-5/6 mb-1"></div>

          <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
          <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded w-4/5 mb-1"></div>
          <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
        </div>

        {/* Signature Skeleton */}
        <div className="flex justify-end mt-auto">
          <div className="flex flex-col gap-0.5 items-center">
            <div className="h-0.5 bg-slate-300 rounded w-8"></div>
            <div className="h-3"></div>
            <div className="h-1 bg-slate-400 rounded w-12"></div>
            <div className="h-0.5 bg-slate-300 rounded w-10"></div>
          </div>
        </div>

        {/* Floating Badges */}
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1.5">
          <span
            className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-white dark:bg-slate-800 shadow-sm ${kategoriClass}`}
          >
            {surat.kategori || 'Umum'}
          </span>
          <span
            className={`text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm ${surat.status === 'active' ? 'bg-slate-800 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}
          >
            {surat.status === 'active' ? 'AKTIF' : 'DRAFT'}
          </span>
        </div>
      </div>

      {/* ── Nama & Kode ── */}
      <div className="mb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
          {surat.kode}
        </p>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2">
          {surat.nama}
        </h3>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 flex-1 leading-relaxed">
        {surat.deskripsi}
      </p>

      {/* ── Stats Meta ── */}
      <div className="flex items-center gap-4 border-t border-slate-100 dark:border-slate-800 pt-4 mb-4">
        <div
          className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400"
          title={`${varCount} Variabel Data`}
        >
          <FaFileAlt className="text-slate-400" />
          {varCount}
        </div>
        {connCount > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShowInFlow();
            }}
            className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 transition-colors"
            title={`${connCount} Koneksi (Lihat di Flow)`}
          >
            <FaLink className="text-slate-400" />
            {connCount}
          </button>
        )}
      </div>

      {/* ── Tombol Aksi ── */}
      <div className="flex gap-2">
        <button
          onClick={onPreview}
          title="Lihat Format Surat"
          className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 transition-colors"
        >
          <FaEye size={14} />
        </button>
        <button
          onClick={onOpen}
          className="flex-1 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          Isi Form
        </button>
      </div>
    </div>
  );
}
