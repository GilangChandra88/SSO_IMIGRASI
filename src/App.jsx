import React, { Suspense, lazy, useState, useEffect } from 'react';
import SplashScreen from '@/components/SplashScreen';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Login, Portal, PopupUcapan, GantiSandi, Profil, AkunBelumTerdaftar } from '@/modules/sso';
import PantauSesi from '@/components/PantauSesi';
import MemuatHalaman from '@/components/MemuatHalaman';

// ─── Aplikasi dimuat saat dibuka (docs/rencana-percepatan.md Tahap 2) ─────────
// Membuka Portal tidak lagi mengunduh kode e-Persuratan, Inventory, Kepegawaian, Koperasi, dan
// Log Developer. Kode tiap aplikasi diunduh saat rutenya dibuka, atau lebih dulu saat kartunya
// di Portal disentuh (siapkanAplikasi).
const IMPOR_APLIKASI = {
  '/e-persuratan': () => import('@/modules/e-persuratan'),
  '/inventory': () => import('@/modules/inventory'),
  '/kepegawaian': () => import('@/modules/kepegawaian'),
  '/koperasi': () => import('@/modules/koperasi'),
  '/log-developer': () => import('@/modules/log-developer'),
};
const KUNCI_MUAT_ULANG = 'muatUlangVersiBaru';

/**
 * Komponen lazy dari ekspor bernama sebuah modul. Bila potongan kode gagal diunduh (biasanya karena
 * versi baru baru saja dipasang dan berkas lama sudah tidak ada), halaman dimuat ulang SEKALI.
 */
function aplikasiLazy(jalur, nama) {
  return lazy(() =>
    IMPOR_APLIKASI[jalur]()
      .then((m) => {
        try {
          sessionStorage.removeItem(KUNCI_MUAT_ULANG);
        } catch {
          // penyimpanan sesi tidak tersedia
        }
        return { default: m[nama] };
      })
      .catch((err) => {
        let sudah = true;
        try {
          sudah = sessionStorage.getItem(KUNCI_MUAT_ULANG) === '1';
          if (!sudah) sessionStorage.setItem(KUNCI_MUAT_ULANG, '1');
        } catch {
          // tanpa penyimpanan sesi: jangan memuat ulang berulang-ulang
        }
        if (!sudah) window.location.reload();
        throw err;
      }),
  );
}

const EPersuratanApp = aplikasiLazy('/e-persuratan', 'EPersuratanApp');
const InventoryApp = aplikasiLazy('/inventory', 'InventoryApp');
const KepegawaianApp = aplikasiLazy('/kepegawaian', 'KepegawaianApp');
const KoperasiApp = aplikasiLazy('/koperasi', 'KoperasiApp');
const LogDeveloperApp = aplikasiLazy('/log-developer', 'LogDeveloperApp');

/** Unduh kode aplikasi lebih dulu (kartu Portal disentuh/difokus); galat diabaikan. */
function siapkanAplikasi(path) {
  IMPOR_APLIKASI[path]?.().catch(() => {});
}

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
      <Suspense fallback={<MemuatHalaman />}>
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
                <Portal siapkanAplikasi={siapkanAplikasi} />
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
      </Suspense>
    </Router>
  );
}

function App() {
  // Layar pembuka hanya sesudah login berhasil (peristiwa triggerSplash dari Login), tidak setiap
  // kali halaman dibuka/dimuat ulang (docs/rencana-percepatan.md Tahap 1)
  const [showSplash, setShowSplash] = useState(false);

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
