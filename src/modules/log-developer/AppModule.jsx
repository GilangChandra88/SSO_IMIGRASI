import { Link, Navigate, Route, Routes } from 'react-router-dom';
import {
  FaArrowLeft,
  FaBug,
  FaCog,
  FaExclamationTriangle,
  FaFire,
  FaHistory,
  FaListUl,
  FaLock,
  FaServer,
  FaThLarge,
  FaUserShield,
  FaUsers,
} from 'react-icons/fa';
import AppLayout from '@/layouts/AppLayout';
import GerbangLogDev from './konteks/GerbangLogDev';
import { useLogDev } from './konteks/konteks';
import Ringkasan from './pages/Ringkasan';
import PenggunaAktif from './pages/PenggunaAktif';
import Aktivitas from './pages/Aktivitas';
import Perubahan from './pages/Perubahan';
import Galat from './pages/Galat';
import Anomali from './pages/Anomali';
import Fungsi from './pages/Fungsi';
import Akses from './pages/Akses';
import Pengaturan from './pages/Pengaturan';
import Firebase from './pages/Firebase';

const AKAR = '/log-developer';
const BRAND = {
  code: 'DEV',
  title: 'Log Developer',
  subtitle: 'Super Admin',
  mobileTitle: 'Log Developer',
};

const MENU = [
  { to: AKAR, label: 'Ringkasan', Ikon: FaThLarge, pas: true },
  { to: `${AKAR}/anomali`, label: 'Anomali', Ikon: FaExclamationTriangle },
  { to: `${AKAR}/galat`, label: 'Galat', Ikon: FaBug },
  { to: `${AKAR}/pengguna`, label: 'Pengguna', Ikon: FaUsers },
  { to: `${AKAR}/aktivitas`, label: 'Aktivitas', Ikon: FaListUl },
  { to: `${AKAR}/perubahan`, label: 'Jejak Perubahan', Ikon: FaHistory },
  { to: `${AKAR}/fungsi`, label: 'Function & Sistem', Ikon: FaServer },
  { to: `${AKAR}/firebase`, label: 'Pemakaian Firebase', Ikon: FaFire },
  { to: `${AKAR}/akses`, label: 'Akses & Segel', Ikon: FaUserShield },
  { to: `${AKAR}/pengaturan`, label: 'Pengaturan', Ikon: FaCog },
];

const aktif = (m, path) => (m.pas ? path === m.to || path === `${m.to}/` : path.startsWith(m.to));

/** Tombol kunci sekarang (di bilah samping; hanya tampil saat modul terbuka). */
function TombolKunci({ navItemClass, isCollapsed }) {
  const logDev = useLogDev();
  if (!logDev) return null;
  return (
    <button
      type="button"
      title="Kunci Log Developer"
      className={`${navItemClass(false)} w-full`}
      onClick={() => logDev.kunci('Log Developer dikunci.')}
    >
      <FaLock size={15} className="shrink-0 text-rose-400" />
      <span className={`truncate text-rose-400 ${isCollapsed ? 'md:hidden' : ''}`}>
        Kunci sekarang
      </span>
    </button>
  );
}

const renderNav = ({ isCollapsed, navItemClass, path }) => (
  <>
    <div className="space-y-1">
      <Link to="/" title="Kembali ke Portal" className={navItemClass(false)}>
        <FaArrowLeft size={16} className="shrink-0 text-rose-400" />
        <span className={`truncate text-rose-400 ${isCollapsed ? 'md:hidden' : ''}`}>
          Portal SSO
        </span>
      </Link>
    </div>
    <div>
      {(!isCollapsed || window.innerWidth < 768) && (
        <p
          className={`px-4 text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest ${isCollapsed ? 'md:hidden' : ''}`}
        >
          Pemantauan
        </p>
      )}
      <div className="space-y-1">
        {MENU.map((m) => (
          <Link key={m.to} to={m.to} title={m.label} className={navItemClass(aktif(m, path))}>
            <m.Ikon size={16} className="shrink-0" />
            <span className={`truncate ${isCollapsed ? 'md:hidden' : ''}`}>{m.label}</span>
          </Link>
        ))}
        <TombolKunci navItemClass={navItemClass} isCollapsed={isCollapsed} />
      </div>
    </div>
  </>
);

export default function AppModule() {
  return (
    <GerbangLogDev>
      <AppLayout
        brand={BRAND}
        accent="rose"
        sidebar={{
          navClassName: 'flex-1 flex flex-col px-3 py-4 space-y-6 overflow-y-auto',
          toggleClassName: 'px-4 mt-auto mb-4',
          renderNav,
        }}
      >
        <Routes>
          <Route path="/" element={<Ringkasan />} />
          <Route path="/anomali" element={<Anomali />} />
          <Route path="/galat" element={<Galat />} />
          <Route path="/pengguna" element={<PenggunaAktif />} />
          <Route path="/aktivitas" element={<Aktivitas />} />
          <Route path="/perubahan" element={<Perubahan />} />
          <Route path="/fungsi" element={<Fungsi />} />
          <Route path="/firebase" element={<Firebase />} />
          <Route path="/akses" element={<Akses />} />
          <Route path="/pengaturan" element={<Pengaturan />} />
          <Route path="*" element={<Navigate to={AKAR} replace />} />
        </Routes>
      </AppLayout>
    </GerbangLogDev>
  );
}
