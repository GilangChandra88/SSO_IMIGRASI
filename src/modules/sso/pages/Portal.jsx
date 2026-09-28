import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaMoneyCheckAlt, FaBoxes, FaUserTie, FaSignOutAlt, FaChevronRight } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/config/firebase';

export default function Portal() {
  const navigate = useNavigate();
  const { currentUser, userData, userRole } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
  };

  const apps = [
    {
      id: 'e-persuratan',
      title: 'E-Persuratan & Keuangan',
      description: 'Sistem manajemen persuratan, LPJ, dan administrasi keuangan.',
      icon: <FaMoneyCheckAlt size={28} className="text-blue-500" />,
      path: '/e-persuratan',
      iconContainerClass: 'bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20',
      badge: 'Aktif',
    },
    {
      id: 'inventory',
      title: 'Inventory Umum',
      description: 'Sistem manajemen inventaris dan pencatatan barang milik negara.',
      icon: <FaBoxes size={28} className="text-emerald-500" />,
      path: '/inventory',
      iconContainerClass:
        'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20',
      badge: 'Pengembangan',
    },
    {
      id: 'kepegawaian',
      title: 'Kepegawaian',
      description: 'Sistem informasi manajemen sumber daya manusia dan data kepegawaian.',
      icon: <FaUserTie size={28} className="text-amber-500" />,
      path: '/kepegawaian',
      iconContainerClass:
        'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20',
      badge: 'Pengembangan',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 transition-colors">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header / Hero Card */}
        <div className="bg-[#1e293b] rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="absolute right-0 top-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

          <div className="relative z-10 flex items-start gap-6">
            <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-cyan-500/20 text-cyan-400 items-center justify-center font-bold text-2xl shrink-0 border border-cyan-500/30">
              {(userData?.nama || currentUser?.email || 'U')[0].toUpperCase()}
            </div>
            <div>
              <p className="text-cyan-400 font-bold text-[11px] uppercase tracking-widest mb-2">
                SSO IMIGRASI BULELENG
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
                Selamat datang,{' '}
                {userData?.nama
                  ? userData.nama.split(' ')[0]
                  : currentUser?.email?.split('@')[0] || 'Pengguna'}
              </h1>
              <p className="text-slate-400 text-sm max-w-md">
                Akses semua sistem informasi keimigrasian melalui satu portal terpadu.
              </p>
            </div>
          </div>

          <div className="relative z-10 shrink-0">
            <button
              onClick={handleLogout}
              className="bg-slate-800 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/50 text-slate-300 hover:text-rose-400 rounded-xl p-3 px-6 flex items-center gap-3 transition-all shadow-lg active:scale-95"
            >
              <FaSignOutAlt size={16} />
              <span className="font-bold text-sm">Keluar Akun</span>
            </button>
          </div>
        </div>

        {/* Title for Apps Section */}
        <div className="pt-4">
          <h2 className="font-bold text-slate-800 dark:text-slate-200 text-xl">Portal Layanan</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Pilih modul aplikasi yang ingin Anda tuju.
          </p>
        </div>

        {/* Apps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apps.map((app) => (
            <div
              key={app.id}
              onClick={() => navigate(app.path)}
              className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 hover:shadow-lg hover:border-cyan-400/50 dark:hover:border-cyan-500/50 transition-all cursor-pointer relative overflow-hidden flex flex-col h-full"
            >
              <div className="flex justify-between items-start mb-6">
                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center border group-hover:scale-110 transition-transform ${app.iconContainerClass}`}
                >
                  {app.icon}
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    app.badge === 'Aktif'
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
                      : app.badge === 'Baru'
                        ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {app.badge}
                </span>
              </div>

              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                {app.title}
              </h3>

              <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 flex-1 leading-relaxed">
                {app.description}
              </p>

              <div className="flex items-center text-sm font-bold text-cyan-600 dark:text-cyan-400 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all mt-auto">
                Masuk Sistem <FaChevronRight size={12} className="ml-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
