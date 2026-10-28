import React from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { FaArrowLeft, FaBoxes, FaExchangeAlt, FaThLarge } from 'react-icons/fa';
import AppLayout from '@/layouts/AppLayout';
import InventoriProvider from './konteks/InventoriProvider';
import Dashboard from './pages/Dashboard';
import StokBarang from './pages/StokBarang';
import RiwayatTransaksi from './pages/RiwayatTransaksi';
import CetakTerima from './pages/CetakTerima';

const BRAND = {
  code: 'INV',
  title: 'Inventory',
  subtitle: 'Umum',
  mobileTitle: 'Inventory Umum',
};

// Menu purwarupa inventory-ui: Dashboard, Stok Barang, Transaksi (Barang Masuk & Cetak Terima Barang)
const MENU = [
  {
    to: '/inventory',
    label: 'Dashboard',
    Ikon: FaThLarge,
    aktif: (p) => p === '/inventory' || p === '/inventory/',
  },
  {
    to: '/inventory/stok',
    label: 'Stok Barang',
    Ikon: FaBoxes,
    aktif: (p) => p.startsWith('/inventory/stok'),
  },
  {
    to: '/inventory/transaksi',
    label: 'Transaksi',
    Ikon: FaExchangeAlt,
    aktif: (p) => p.startsWith('/inventory/transaksi'),
  },
];

const renderNav = ({ isCollapsed, navItemClass, path }) => (
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
          Menu
        </p>
      )}
      <div className="space-y-1">
        {MENU.map(({ to, label, Ikon, aktif }) => (
          <Link key={to} to={to} title={label} className={navItemClass(aktif(path))}>
            <Ikon size={16} className="shrink-0" />
            <span className={`truncate ${isCollapsed ? 'md:hidden' : ''}`}>{label}</span>
          </Link>
        ))}
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
      <InventoriProvider>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/stok" element={<StokBarang />} />
          <Route path="/transaksi" element={<RiwayatTransaksi />} />
          <Route path="/transaksi/cetak" element={<CetakTerima />} />
          <Route path="*" element={<Navigate to="/inventory" replace />} />
        </Routes>
      </InventoriProvider>
    </AppLayout>
  );
}
