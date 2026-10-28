import React from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import {
  FaHome,
  FaSitemap,
  FaFileAlt,
  FaEnvelope,
  FaFolderOpen,
  FaHistory,
  FaArrowLeft,
  FaArchive,
  FaPrint,
  FaClipboardCheck,
} from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/layouts/AppLayout';
import TransisiHalaman from './TransisiHalaman';
import { Dashboard } from './dashboard';
import { PersuratanPage, SuratForm, NomorSuratKanim } from './surat-keluar';
import { LPJPage, ArsipPage, VerifikasiPage } from './lpj';
import { MakSetup, MakHistory } from './data-master';
import { ScannerPage } from './scanner';

const BRAND = {
  code: 'KI',
  title: 'e-Persuratan',
  subtitle: 'Arsip Pribadi',
  mobileTitle: 'e-Persuratan',
};

function ProtectedRoute({ children, requireRole }) {
  const { currentUser, isSuperAdmin, isKeuangan } = useAuth();
  if (!currentUser) return <Navigate to="/login" />;

  if (requireRole === 'superadmin' && !isSuperAdmin) return <Navigate to="/e-persuratan" />;
  if (requireRole === 'keuangan' && !isKeuangan) return <Navigate to="/e-persuratan" />;

  return children;
}

export default function AppModule() {
  const { isSuperAdmin, isKeuangan } = useAuth();

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
            to="/e-persuratan"
            title="Dashboard"
            className={navItemClass(path === '/e-persuratan' || path === '/e-persuratan/')}
          >
            <FaHome size={16} className="shrink-0" />
            <span className={`truncate ${isCollapsed ? 'md:hidden' : ''}`}>Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Menu DATA */}
      <div>
        {(!isCollapsed || window.innerWidth < 768) && (
          <p
            className={`px-4 text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest ${isCollapsed ? 'md:hidden' : ''}`}
          >
            Data
          </p>
        )}
        <div className="space-y-1">
          <Link
            to="/e-persuratan/persuratan"
            title="Persuratan"
            className={navItemClass(isActive('/e-persuratan/persuratan'))}
          >
            <FaEnvelope size={16} className="shrink-0" />
            <span className={`truncate ${isCollapsed ? 'md:hidden' : ''}`}>Persuratan</span>
          </Link>
          {/* Semua pegawai bisa meminta nomor surat; tab Hierarki & Pengaturan khusus Keuangan */}
          <Link
            to="/e-persuratan/nomor-surat-kanim"
            title="Nomor Surat"
            className={navItemClass(path === '/e-persuratan/nomor-surat-kanim')}
          >
            <FaFileAlt size={16} className="shrink-0" />
            <span className={`truncate ${isCollapsed ? 'md:hidden' : ''}`}>Nomor Surat</span>
          </Link>
        </div>
      </div>

      {/* Menu LPJ */}
      <div>
        {(!isCollapsed || window.innerWidth < 768) && (
          <p
            className={`px-4 text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest ${isCollapsed ? 'md:hidden' : ''}`}
          >
            LPJ
          </p>
        )}
        <div className="space-y-1">
          <Link
            to="/e-persuratan/lpj"
            title="LPJ"
            className={navItemClass(isActive('/e-persuratan/lpj'))}
          >
            <FaFolderOpen size={16} className="shrink-0" />
            <span className={`truncate ${isCollapsed ? 'md:hidden' : ''}`}>Berkas LPJ</span>
          </Link>
          {(isSuperAdmin || isKeuangan) && (
            <Link
              to="/e-persuratan/verifikasi"
              title="Berkas Verifikasi"
              className={navItemClass(isActive('/e-persuratan/verifikasi'))}
            >
              <FaClipboardCheck size={16} className="shrink-0" />
              <span className={`truncate ${isCollapsed ? 'md:hidden' : ''}`}>
                Berkas Verifikasi
              </span>
            </Link>
          )}
          <Link
            to="/e-persuratan/arsip"
            title="Arsip"
            className={navItemClass(isActive('/e-persuratan/arsip'))}
          >
            <FaArchive size={16} className="shrink-0" />
            <span className={`truncate ${isCollapsed ? 'md:hidden' : ''}`}>Arsip</span>
          </Link>
          {(isSuperAdmin || isKeuangan) && (
            <Link
              to="/e-persuratan/scanner"
              title="Scanner"
              className={navItemClass(path === '/e-persuratan/scanner')}
            >
              <FaPrint size={16} className="shrink-0" />
              <span className={`truncate ${isCollapsed ? 'md:hidden' : ''}`}>Scanner</span>
            </Link>
          )}
        </div>
      </div>

      {/* Menu PENGATURAN */}
      {(isSuperAdmin || isKeuangan) && (
        <div>
          {(!isCollapsed || window.innerWidth < 768) && (
            <p
              className={`px-4 text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest ${isCollapsed ? 'md:hidden' : ''}`}
            >
              Pengaturan
            </p>
          )}
          <div className="space-y-1">
            {(isSuperAdmin || isKeuangan) && (
              <Link
                to="/e-persuratan/mak-setup"
                title="MAK Setup"
                className={navItemClass(path === '/e-persuratan/mak-setup')}
              >
                <FaSitemap size={16} className="shrink-0" />
                <span className={`truncate ${isCollapsed ? 'md:hidden' : ''}`}>MAK Setup</span>
              </Link>
            )}
            {(isSuperAdmin || isKeuangan) && (
              <Link
                to="/e-persuratan/mak-history"
                title="History MAK"
                className={navItemClass(path === '/e-persuratan/mak-history')}
              >
                <FaHistory size={16} className="shrink-0" />
                <span className={`truncate ${isCollapsed ? 'md:hidden' : ''}`}>History MAK</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );

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
      <TransisiHalaman>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/persuratan" element={<PersuratanPage />} />
          <Route path="/persuratan/form/:suratId" element={<SuratForm />} />
          <Route path="/lpj" element={<LPJPage />} />
          <Route path="/lpj/:packId" element={<LPJPage />} />
          <Route path="/arsip/*" element={<ArsipPage />} />
          <Route
            path="/verifikasi"
            element={
              <ProtectedRoute requireRole="keuangan">
                <VerifikasiPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/verifikasi/:packId"
            element={
              <ProtectedRoute requireRole="keuangan">
                <VerifikasiPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mak-setup"
            element={
              <ProtectedRoute requireRole="keuangan">
                <MakSetup />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mak-history"
            element={
              <ProtectedRoute requireRole="keuangan">
                <MakHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scanner"
            element={
              <ProtectedRoute requireRole="keuangan">
                <ScannerPage />
              </ProtectedRoute>
            }
          />
          <Route path="/nomor-surat-kanim" element={<NomorSuratKanim />} />
        </Routes>
      </TransisiHalaman>
    </AppLayout>
  );
}
