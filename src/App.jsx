import React, { useState, useEffect } from 'react';
import SplashScreen from '@/components/SplashScreen';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Login, Portal } from '@/modules/sso';
import { EPersuratanApp } from '@/modules/e-persuratan';
import { InventoryApp } from '@/modules/inventory';
import { KepegawaianApp } from '@/modules/kepegawaian';

function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" />;
  return children;
}

function AppContent() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

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
    </AuthProvider>
  );
}

export default App;
