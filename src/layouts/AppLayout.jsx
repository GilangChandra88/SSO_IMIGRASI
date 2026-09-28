import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { FaBars } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import { APP_ACCENTS } from '@/utils/appAccents';

/**
 * Kerangka halaman untuk semua aplikasi: sidebar, header mobile, dan area konten.
 *
 * Props:
 *  - brand   : { code, title, subtitle, mobileTitle }
 *  - accent  : 'blue' | 'amber' (lihat utils/appAccents.js)
 *  - sidebar : { navClassName, toggleClassName, renderNav } (diteruskan ke <Sidebar />)
 *  - children: isi halaman (biasanya <Routes>)
 */
export default function AppLayout({ brand, accent = 'blue', sidebar, children }) {
  const { currentUser } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => window.innerWidth < 768);
  const accentClasses = APP_ACCENTS[accent];

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!currentUser) return <Navigate to="/login" />;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors">
      {/* Mobile Overlay */}
      {!isSidebarCollapsed && (
        <div
          className="md:hidden fixed inset-0 bg-slate-900/50 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarCollapsed(true)}
        />
      )}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        brand={brand}
        accent={accent}
        {...sidebar}
      />

      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden print:h-auto print:overflow-visible">
        {/* Mobile Header (Only visible on small screens when logged in) */}
        <header className="md:hidden h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 shrink-0 shadow-sm z-30 relative">
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded ${accentClasses.badge} flex items-center justify-center font-bold shrink-0 text-xs`}
            >
              {brand.code}
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              {brand.mobileTitle}
            </span>
          </div>
          <button
            onClick={() => setIsSidebarCollapsed(false)}
            className="p-2 -mr-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            <FaBars size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar">{children}</div>
      </main>
    </div>
  );
}
