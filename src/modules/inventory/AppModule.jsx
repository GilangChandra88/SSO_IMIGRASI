import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { FaBox, FaExchangeAlt, FaArrowLeft } from 'react-icons/fa';
import AppLayout from '@/layouts/AppLayout';
import StokBarang from './pages/StokBarang';
import Transaksi from './pages/Transaksi';

const BRAND = {
  code: 'INV',
  title: 'Inventory',
  subtitle: 'Umum',
  mobileTitle: 'Inventory Umum',
};

const renderNav = ({ isCollapsed, navItemClass, isActive, path }) => (
  <>
    {/* Menu Portal SSO */}
    <div>
      <div className="space-y-1">
        <Link to="/" title="Kembali ke Portal" className={navItemClass(false)}>
          <FaArrowLeft size={16} className="shrink-0 text-amber-500" />
          <span className={`truncate text-amber-500 ${isCollapsed ? 'md:hidden' : ''}`}>
            Portal SSO
          </span>
        </Link>
      </div>
    </div>

    {/* Menu UTAMA */}
    <div>
      {(!isCollapsed || window.innerWidth < 768) && (
        <p
          className={`px-4 text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest ${isCollapsed ? 'md:hidden' : ''}`}
        >
          Utama
        </p>
      )}
      <div className="space-y-1">
        <Link
          to="/inventory"
          title="Stok Barang"
          className={navItemClass(path === '/inventory' || path === '/inventory/')}
        >
          <FaBox size={16} className="shrink-0" />
          <span className={`truncate ${isCollapsed ? 'md:hidden' : ''}`}>Stok Barang</span>
        </Link>
        <Link
          to="/inventory/transaksi"
          title="Transaksi"
          className={navItemClass(isActive('/inventory/transaksi'))}
        >
          <FaExchangeAlt size={16} className="shrink-0" />
          <span className={`truncate ${isCollapsed ? 'md:hidden' : ''}`}>Transaksi</span>
        </Link>
      </div>
    </div>
  </>
);

export default function AppModule() {
  return (
    <AppLayout
      brand={BRAND}
      accent="blue"
      sidebar={{
        navClassName: 'flex-1 flex flex-col px-3 py-4 space-y-6 overflow-y-auto custom-scrollbar',
        toggleClassName: 'px-4 mt-auto mb-4',
        renderNav,
      }}
    >
      <Routes>
        <Route path="/" element={<StokBarang />} />
        <Route path="/transaksi" element={<Transaksi />} />
      </Routes>
    </AppLayout>
  );
}
