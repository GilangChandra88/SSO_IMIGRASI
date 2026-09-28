import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/config/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import {
  FaFolderOpen,
  FaPlus,
  FaSearch,
  FaFilter,
  FaRegCircle,
  FaCheckCircle,
  FaCloudUploadAlt,
  FaLock,
  FaChevronRight,
} from 'react-icons/fa';
import { useMyLPJTasks } from '@/modules/e-persuratan/lpj';

export default function Dashboard() {
  const { userData, userRole, currentUser } = useAuth();
  const navigate = useNavigate();

  const isSuperAdmin = userRole === 'Super Admin' || userRole === 'Admin';

  // ── Tugas LPJ untuk user ini ────────────────────────────────────────────────
  const { tasks: lpjTasks, loading: loadingLpj } = useMyLPJTasks(currentUser?.uid);

  // Status mapping
  const statusCounts = {
    baru: lpjTasks.filter((t) => t.status === 'not_started').length,
    draft: lpjTasks.filter((t) => t.status === 'in_progress').length,
    selesai: lpjTasks.filter((t) => t.status === 'completed').length,
  };
  const totalTasks = lpjTasks.length || 1;

  // Tabs for LPJ
  const [activeTab, setActiveTab] = useState('semua');

  const filteredTasks = lpjTasks.filter((t) => {
    if (activeTab === 'perjadin') return t.kategori === 'perjadin'; // Assumes 'kategori' field exists, fallback to all if none
    if (activeTab === 'non_perjadin') return t.kategori === 'non_perjadin';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 transition-colors">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Main Content (Left 3 Columns) */}
        <div className="xl:col-span-3 space-y-6">
          {/* Hero Card */}
          <div className="bg-[#1e293b] rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
            <div className="relative z-10">
              <p className="text-amber-500 font-bold text-[11px] uppercase tracking-widest mb-3">
                {new Date().toLocaleDateString('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
                Selamat datang kembali,{' '}
                {userData?.nama
                  ? userData.nama.split(' ')[0]
                  : currentUser?.email?.split('@')[0] || 'Pengguna'}
              </h1>
              <p className="text-slate-400 text-sm max-w-md">
                Segera selesaikan SPBy dengan tepat agar istirahat lebih cepat.
              </p>
            </div>
            <div className="relative z-10 shrink-0">
              <button
                onClick={() => navigate('/e-persuratan/lpj')}
                className="bg-white hover:bg-slate-50 text-slate-800 rounded-2xl p-3 pr-8 flex items-center gap-5 transition-all shadow-lg hover:shadow-xl active:scale-95"
              >
                <div className="w-14 h-14 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-inner">
                  <FaPlus size={18} />
                </div>
                <div className="text-left">
                  <p className="font-extrabold text-lg leading-none">Buat LPJ</p>
                  <p className="text-xs font-medium text-slate-500 mt-1.5">Buat SPBy baru</p>
                </div>
              </button>
            </div>
          </div>

          {/* Status Berkas */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition-colors">
            <h2 className="font-bold text-slate-800 dark:text-slate-200 text-lg mb-6">
              Status Berkas
            </h2>

            {/* Progress Bar Segmented */}
            <div className="flex h-3 w-full rounded-full overflow-hidden mb-4 bg-slate-100 dark:bg-slate-800">
              <div
                style={{ width: `${(statusCounts.baru / totalTasks) * 100}%` }}
                className="bg-amber-400 transition-all duration-500"
              ></div>
              <div
                style={{ width: `${(statusCounts.draft / totalTasks) * 100}%` }}
                className="bg-blue-500 border-l border-white dark:border-slate-900 transition-all duration-500"
              ></div>
              <div
                style={{ width: `${(statusCounts.selesai / totalTasks) * 100}%` }}
                className="bg-emerald-500 border-l border-white dark:border-slate-900 transition-all duration-500"
              ></div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                <span className="text-slate-500 dark:text-slate-400">
                  Baru{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-200 ml-1">
                    {statusCounts.baru}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                <span className="text-slate-500 dark:text-slate-400">
                  Draft{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-200 ml-1">
                    {statusCounts.draft}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                <span className="text-slate-500 dark:text-slate-400">
                  Selesai{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-200 ml-1">
                    {statusCounts.selesai}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Berkas LPJ Saya */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
              <div>
                <h2 className="font-bold text-slate-800 dark:text-slate-200 text-lg">
                  Berkas LPJ Saya
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Berkas yang Anda buat sendiri
                </p>
              </div>
              <button
                onClick={() => navigate('/e-persuratan/lpj')}
                className="text-blue-600 dark:text-blue-400 text-sm font-bold hover:underline"
              >
                Lihat semua &gt;
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm transition-colors">
              {/* Toolbar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                  <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama kegiatan atau nomor LPJ..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-full py-2.5 pl-10 pr-4 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-slate-50 dark:bg-slate-950 p-1 rounded-full border border-slate-200 dark:border-slate-800 flex items-center text-sm font-medium">
                    <button
                      onClick={() => setActiveTab('semua')}
                      className={`px-4 py-1.5 rounded-full transition-colors ${activeTab === 'semua' ? 'bg-[#1e293b] text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                      Semua
                    </button>
                    <button
                      onClick={() => setActiveTab('perjadin')}
                      className={`px-4 py-1.5 rounded-full transition-colors ${activeTab === 'perjadin' ? 'bg-[#1e293b] text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                      Perjadin
                    </button>
                    <button
                      onClick={() => setActiveTab('non_perjadin')}
                      className={`px-4 py-1.5 rounded-full transition-colors ${activeTab === 'non_perjadin' ? 'bg-[#1e293b] text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                      Non Perjadin
                    </button>
                  </div>
                  <button className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full py-2 px-4 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <FaFilter size={12} /> Filter
                  </button>
                </div>
              </div>

              {/* List LPJ */}
              {loadingLpj ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-32 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl"
                    />
                  ))}
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                  <FaFolderOpen
                    size={40}
                    className="mx-auto text-slate-300 dark:text-slate-600 mb-3"
                  />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">
                    Belum ada berkas LPJ
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => navigate(`/e-persuratan/lpj/${task.packId}`)}
                      className="group border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer relative overflow-hidden bg-white dark:bg-slate-900"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[10px] font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                          {task.kategori === 'non_perjadin' ? 'Non Perjadin' : 'Perjadin'}
                        </span>

                        {task.status === 'completed' && (
                          <span className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Selesai
                          </span>
                        )}
                        {task.status === 'in_progress' && (
                          <span className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Draft
                          </span>
                        )}
                        {task.status === 'not_started' && (
                          <span className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div> Baru
                          </span>
                        )}
                      </div>

                      <p className="text-[10px] text-slate-400 mb-1">{task.kode || 'LPJ - Baru'}</p>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {task.surat_nama || 'Dokumen LPJ'}
                      </h3>

                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-5">
                        <span>
                          Dibuat{' '}
                          {new Date(task.createdAt || Date.now()).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <span>•</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Rp {task.amount || '0'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${task.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-600'} w-full`}
                          ></div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                          Tahap Selesai
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar (Aside) */}
        <div className="space-y-6">
          {/* Perlu Dilengkapi */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition-colors">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Perlu Dilengkapi</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              2 berkas perlu ditindaklanjuti
            </p>

            <div className="space-y-4">
              {/* Dummy Item 1 */}
              <div className="flex items-start gap-3 cursor-pointer group">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0"></div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[10px] text-slate-400">LPJ-2026-0003</p>
                    <FaChevronRight
                      size={10}
                      className="text-slate-300 group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors"
                    />
                  </div>
                  <p className="font-bold text-sm text-slate-700 dark:text-slate-200 leading-snug group-hover:text-amber-600 transition-colors">
                    Laporan Koordinasi Layanan Keimigrasian
                  </p>
                  <p className="text-[10px] mt-1.5 text-slate-500">
                    <span className="font-bold text-amber-600 dark:text-amber-500">
                      Kurang 4 tahap
                    </span>{' '}
                    · baru 1/5 selesai
                  </p>
                </div>
              </div>

              {/* Dummy Item 2 */}
              <div className="flex items-start gap-3 cursor-pointer group">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0"></div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[10px] text-slate-400">LPJ-2026-0006</p>
                    <FaChevronRight
                      size={10}
                      className="text-slate-300 group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors"
                    />
                  </div>
                  <p className="font-bold text-sm text-slate-700 dark:text-slate-200 leading-snug group-hover:text-amber-600 transition-colors">
                    Sosialisasi Layanan Paspor di Kecamatan Gerokgak
                  </p>
                  <p className="text-[10px] mt-1.5 text-slate-500">
                    <span className="font-bold text-amber-600 dark:text-amber-500">
                      Menunggu Bendahara
                    </span>{' '}
                    · 4/5 selesai
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Aktivitas Terbaru */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition-colors">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-5">Aktivitas Terbaru</h3>

            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-3.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
              {/* Activity Item 1 */}
              <div className="relative flex items-start justify-between gap-4">
                <div className="absolute left-0 w-7 h-7 rounded-full bg-blue-50 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-blue-500 z-10 shrink-0">
                  <FaCloudUploadAlt size={12} />
                </div>
                <div className="pl-10">
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Anda mengunggah <strong>Kuitansi & Bukti Transportasi</strong> ke{' '}
                    <span className="font-semibold text-slate-800 dark:text-white">
                      LPJ-2026-0001
                    </span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">2 jam lalu</p>
                </div>
              </div>

              {/* Activity Item 2 */}
              <div className="relative flex items-start justify-between gap-4">
                <div className="absolute left-0 w-7 h-7 rounded-full bg-emerald-50 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-emerald-500 z-10 shrink-0">
                  <FaCheckCircle size={12} />
                </div>
                <div className="pl-10">
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Anda menandai{' '}
                    <span className="font-semibold text-slate-800 dark:text-white">
                      LPJ-2026-0002
                    </span>{' '}
                    sebagai <strong>Selesai</strong>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Kemarin, 09:15</p>
                </div>
              </div>

              {/* Activity Item 3 */}
              <div className="relative flex items-start justify-between gap-4">
                <div className="absolute left-0 w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-slate-500 z-10 shrink-0">
                  <FaLock size={10} />
                </div>
                <div className="pl-10">
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Anda membuat berkas baru{' '}
                    <span className="font-semibold text-slate-800 dark:text-white">
                      LPJ-2026-0006
                    </span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Kemarin, 08:00</p>
                </div>
              </div>

              {/* Activity Item 4 */}
              <div className="relative flex items-start justify-between gap-4">
                <div className="absolute left-0 w-7 h-7 rounded-full bg-blue-50 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-blue-500 z-10 shrink-0">
                  <FaCloudUploadAlt size={12} />
                </div>
                <div className="pl-10">
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Anda mengunggah <strong>SPT</strong> untuk{' '}
                    <span className="font-semibold text-slate-800 dark:text-white">
                      LPJ-2026-0006
                    </span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">2 hari lalu</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
