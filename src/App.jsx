import React, { useState, useEffect } from 'react';
import SplashScreen from '@/components/SplashScreen';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Login, Portal, PopupUcapan, GantiSandi, Profil, AkunBelumTerdaftar } from '@/modules/sso';
import { EPersuratanApp } from '@/modules/e-persuratan';
import { InventoryApp } from '@/modules/inventory';
import { KepegawaianApp } from '@/modules/kepegawaian';
import { KoperasiApp } from '@/modules/koperasi';
import { LogDeveloperApp } from '@/modules/log-developer';
import PantauSesi from '@/components/PantauSesi';

/**
 * Penjaga rute (tampilan saja; data dijaga rules & Functions):
 * belum login → /login; login tanpa claim aktif → layar "Akun belum terdaftar";
 * wajib ganti kata sandi → /ganti-sandi sebelum halaman lain.
 */
function ProtectedRoute({ children, halamanGantiSandi = false }) {
  const { currentUser, statusAkun, wajibGantiSandi } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (statusAkun !== 'aktif') return <AkunBelumTerdaftar />;
  if (wajibGantiSandi && !halamanGantiSandi) return <Navigate to="/ganti-sandi" replace />;
  return children;
}

function AppContent() {
  return (
    <Router>
      {/* Detak sesi untuk Log Developer (siapa online & halaman yang dibuka) */}
      <PantauSesi />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/ganti-sandi"
          element={
            <ProtectedRoute halamanGantiSandi>
              <GantiSandi />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profil"
          element={
            <ProtectedRoute>
              <Profil />
            </ProtectedRoute>
          }
        />

        {/* SSO Portal */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Portal />
            </ProtectedRoute>
          }
        />

        {/* E-Persuratan & Keuangan Module */}
        <Route
          path="/e-persuratan/*"
          element={
            <ProtectedRoute>
              <EPersuratanApp />
            </ProtectedRoute>
          }
        />

        {/* Inventory Module */}
        <Route
          path="/inventory/*"
          element={
            <ProtectedRoute>
              <InventoryApp />
            </ProtectedRoute>
          }
        />

        {/* Kepegawaian Module */}
        <Route
          path="/kepegawaian/*"
          element={
            <ProtectedRoute>
              <KepegawaianApp />
            </ProtectedRoute>
          }
        />

        {/* Koperasi Module */}
        <Route
          path="/koperasi/*"
          element={
            <ProtectedRoute>
              <KoperasiApp />
            </ProtectedRoute>
          }
        />

        {/* Log Developer (khusus Super Admin; data dijaga Function) */}
        <Route
          path="/log-developer/*"
          element={
            <ProtectedRoute>
              <LogDeveloperApp />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const handleTrigger = () => setShowSplash(true);
    window.addEventListener('triggerSplash', handleTrigger);
    return () => window.removeEventListener('triggerSplash', handleTrigger);
  }, []);

  return (
    <AuthProvider>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      <AppContent />
      {/* Ucapan ulang tahun dari rekan kerja: popup di halaman mana pun */}
      <PopupUcapan />
    </AuthProvider>
  );
}

export default App;
