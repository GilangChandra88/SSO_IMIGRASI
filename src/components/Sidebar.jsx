import React from 'react';
import { useLocation } from 'react-router-dom';
import { FaSignOutAlt, FaSun, FaMoon, FaBars } from 'react-icons/fa';
import { signOut } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { APP_ACCENTS } from '@/utils/appAccents';

/**
 * Sidebar bersama untuk semua aplikasi (e-Persuratan, Inventory, Kepegawaian).
 * Bingkai (header merek, tombol dark mode, profil pengguna) sama untuk semua aplikasi;
 * isi menu diberikan tiap aplikasi lewat `renderNav`.
 *
 * Props:
 *  - isCollapsed, setIsCollapsed : status sidebar (dikelola AppLayout)
 *  - brand                        : { code, title, subtitle }
 *  - accent                       : kunci di APP_ACCENTS ('blue' | 'amber')
 *  - navClassName                 : kelas Tailwind untuk pembungkus menu
 *  - toggleClassName              : kelas Tailwind untuk pembungkus tombol dark mode
 *  - renderNav({ isCollapsed, navItemClass, isActive, path }) : isi menu
 */
export default function Sidebar({
  isCollapsed,
  setIsCollapsed,
  brand,
  accent = 'blue',
  navClassName,
  toggleClassName,
  renderNav,
}) {
  const location = useLocation();
  const path = location.pathname;
  const { currentUser, userData, userRole, isDark, toggleDarkMode } = useAuth();
  const accentClasses = APP_ACCENTS[accent];

  const isActive = (prefix) => path === prefix || path.startsWith(prefix + '/');

  const handleLogout = async () => {
    await signOut(auth);
  };

  const navItemClass = (active) => `
    flex items-center gap-3 py-2.5 px-4 rounded-xl font-medium transition-all text-sm
    ${active ? accentClasses.navActive : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}
    ${isCollapsed ? 'md:justify-center px-4 md:px-0' : ''}
  `;

  return (
    <nav
      className={`print:hidden bg-[#1e293b] border-r border-slate-800 flex flex-col h-screen shrink-0 transition-all duration-300 z-50 fixed inset-y-0 left-0 md:sticky md:top-0 ${isCollapsed ? '-translate-x-full md:translate-x-0 md:w-20' : 'translate-x-0 w-64'}`}
    >
      {/* Brand Header */}
      <div
        className={`p-4 sm:p-5 flex items-center ${isCollapsed ? 'md:justify-center justify-between' : 'justify-between'}`}
      >
        {!isCollapsed ? (
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              className={`w-9 h-9 rounded ${accentClasses.badge} flex items-center justify-center font-bold shrink-0`}
            >
              {brand.code}
            </div>
            <div className="flex flex-col truncate">
              <span className="font-bold text-slate-100 text-sm tracking-wide">{brand.title}</span>
              <span className="text-[10px] text-slate-400">{brand.subtitle}</span>
            </div>
          </div>
        ) : (
          <div
            className={`hidden md:flex w-10 h-10 rounded ${accentClasses.badge} items-center justify-center font-bold shrink-0`}
          >
            {brand.code}
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 text-slate-500 hover:text-slate-300 transition-colors shrink-0 md:block hidden"
        >
          <FaBars size={16} />
        </button>
      </div>

      {/* Menu (diisi tiap aplikasi) */}
      <div className={navClassName}>{renderNav({ isCollapsed, navItemClass, isActive, path })}</div>

      {/* Dark Mode Slider Toggle */}
      <div className={toggleClassName}>
        <div className={`${isCollapsed ? 'md:hidden' : 'block'}`}>
          <div
            onClick={toggleDarkMode}
            className="w-full bg-slate-900/80 hover:bg-slate-900 rounded-full p-1 flex items-center cursor-pointer relative border border-slate-700/50 transition-colors shadow-inner"
          >
            <div
              className={`absolute left-1 top-1 bottom-1 w-[calc(50%-4px)] ${accentClasses.slider} rounded-full transition-transform duration-300 ease-out shadow-sm ${isDark ? 'translate-x-full' : 'translate-x-0'}`}
            ></div>

            <div
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 z-10 transition-colors duration-300 ${!isDark ? 'text-white' : 'text-slate-400'}`}
            >
              <FaSun size={12} /> <span className="text-[10px] font-bold">Light</span>
            </div>

            <div
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 z-10 transition-colors duration-300 ${isDark ? 'text-white' : 'text-slate-400'}`}
            >
              <FaMoon size={12} /> <span className="text-[10px] font-bold">Dark</span>
            </div>
          </div>
        </div>

        <button
          onClick={toggleDarkMode}
          className={`w-full flex justify-center p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors shadow-sm ${isCollapsed ? 'hidden md:flex' : 'hidden'}`}
        >
          {isDark ? <FaMoon size={16} /> : <FaSun size={16} />}
        </button>
      </div>

      {/* User Profile Footer */}
      <div className="p-4 bg-slate-900/50 border-t border-slate-800">
        <div className={`flex items-center gap-3 ${isCollapsed ? 'md:justify-center' : ''}`}>
          <div className="w-10 h-10 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-sm shrink-0">
            {(userData?.nama || currentUser?.email || 'U')[0].toUpperCase()}
          </div>
          <div className={`flex-1 min-w-0 ${isCollapsed ? 'md:hidden' : ''}`}>
            <p className="text-xs font-bold text-slate-200 truncate">
              {userData?.nama || currentUser.email}
            </p>
            <p className="text-[10px] text-slate-500 truncate">{userRole || 'Pegawai'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className={`mt-4 w-full flex items-center justify-center gap-2 font-semibold text-xs text-slate-400 hover:text-white hover:bg-rose-500/10 p-2.5 rounded-lg transition-colors ${isCollapsed ? 'md:px-0' : ''}`}
        >
          <FaSignOutAlt size={14} />
          <span className={`${isCollapsed ? 'md:hidden' : ''}`}>Keluar Akun</span>
        </button>
      </div>
    </nav>
  );
}
