import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { FaUsers, FaArrowLeft } from 'react-icons/fa';
import AppLayout from '@/layouts/AppLayout';
import Pegawai from './pages/Pegawai';

const BRAND = {
  code: 'SDM',
  title: 'Kepegawaian',
  subtitle: 'SDM & Organisasi',
  mobileTitle: 'Kepegawaian',
};

const renderNav = ({ isCollapsed, navItemClass, isActive }) => (
  <>
    <Link
      to="/"
      className="flex items-center gap-3 py-2.5 px-4 rounded-xl font-medium transition-all text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 mb-2"
      title="Kembali ke Portal"
    >
      <FaArrowLeft size={14} />{' '}
      <span className={`truncate ${isCollapsed ? 'md:hidden' : ''}`}>Portal Utama</span>
    </Link>
    <Link to="/kepegawaian" title="Data Pegawai" className={navItemClass(isActive('/kepegawaian'))}>
      <FaUsers size={16} className="shrink-0" />
      <span className={`truncate ${isCollapsed ? 'md:hidden' : ''}`}>Data Pegawai</span>
    </Link>
  </>
);

export default function AppModule() {
  return (
    <AppLayout
      brand={BRAND}
      accent="amber"
      sidebar={{
        navClassName: 'flex-1 py-4 overflow-y-auto custom-scrollbar px-3 flex flex-col gap-1',
        toggleClassName: 'p-4 shrink-0 flex flex-col gap-3',
        renderNav,
      }}
    >
      <Routes>
        <Route path="/*" element={<Pegawai />} />
      </Routes>
    </AppLayout>
  );
}
