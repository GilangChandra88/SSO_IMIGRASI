import React from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { FaArrowLeft, FaStore, FaThLarge } from 'react-icons/fa';
import ToastViewport from '@/components/ToastViewport';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/layouts/AppLayout';
import { PERAN } from '@/utils/peran';
import KerangkaHalaman from './components/KerangkaHalaman';
import NavBawah from './components/NavBawah';
import TombolKasir from './components/TombolKasir';
import { GRUP_MENU, jalurGrup } from './data/menuKoperasi';
import {
  AKAR_UNIT,
  JALUR_KASIR_KANTIN,
  UNIT_USAHA,
  jalurUnit,
  unitDariPath,
} from './data/unitUsaha';
import BukuAnggota from './pages/anggota/BukuAnggota';
import DaftarAnggota from './pages/anggota/DaftarAnggota';
import PotongGaji from './pages/anggota/PotongGaji';
import SaldoAwalSimpanan from './pages/anggota/SaldoAwalSimpanan';
import TransaksiSimpanan from './pages/anggota/TransaksiSimpanan';
import LaporanArusKas from './pages/laporan/LaporanArusKas';
import LaporanNeraca from './pages/laporan/LaporanNeraca';
import LaporanPersediaan from './pages/laporan/LaporanPersediaan';
import LaporanPhu from './pages/laporan/LaporanPhu';
import Jurnal from './pages/pembukuan/Jurnal';
import PelunasanUtang from './pages/pembukuan/PelunasanUtang';
import { Penerimaan, Pengeluaran } from './pages/pembukuan/TransaksiUmum';
import TutupBuku from './pages/pembukuan/TutupBuku';
import AlokasiShu from './pages/shu/AlokasiShu';
import ShuAnggota from './pages/shu/ShuAnggota';
import BaganAkun from './pages/pembukuan/BaganAkun';
import Beranda from './pages/Beranda';
import BonAnggota from './pages/kantin/BonAnggota';
import Pembelian from './pages/kantin/Pembelian';
import PengaturanPembayaran from './pages/kantin/PengaturanPembayaran';
import { PengaturanSimpanan, PersentaseShu } from './pages/Pengaturan';
import HalamanBarang from './pages/kantin/HalamanBarang';
import HistoryTransaksi from './pages/kantin/HistoryTransaksi';
import HubMenu from './pages/HubMenu';
import Kas from './pages/pembukuan/Kas';
import Kasir from './pages/kantin/Kasir';
import SaldoAwal from './pages/pembukuan/SaldoAwal';
import StokBarang from './pages/kantin/StokBarang';
import UnitUsaha from './pages/UnitUsaha';

const BRAND = {
  code: 'KOP',
  title: 'Koperasi',
  subtitle: 'Pegawai',
  mobileTitle: 'Koperasi',
};

/** Halaman yang sudah dibangun; menu lain tampil sebagai kerangka. Kunci: `<grup|unit>/<segmen>`. */
const HALAMAN = {
  'anggota/daftar': DaftarAnggota,
  'anggota/transaksi': TransaksiSimpanan,
  'anggota/potong-gaji': PotongGaji,
  'anggota/saldo-awal': SaldoAwalSimpanan,
  'anggota/pengaturan': PengaturanSimpanan,
  'pembukuan/kas': Kas,
  'pembukuan/akun': BaganAkun,
  'pembukuan/saldo-awal': SaldoAwal,
  'pembukuan/jurnal': Jurnal,
  'pembukuan/pengeluaran': Pengeluaran,
  'pembukuan/penerimaan': Penerimaan,
  'pembukuan/pelunasan-utang': PelunasanUtang,
  'pembukuan/tutup-buku': TutupBuku,
  'laporan/laba-rugi': LaporanPhu,
  'laporan/neraca': LaporanNeraca,
  'laporan/arus-kas': LaporanArusKas,
  'laporan/persediaan': LaporanPersediaan,
  'shu/alokasi': AlokasiShu,
  'shu/anggota': ShuAnggota,
  'shu/pengaturan': PersentaseShu,
  'kantin/stok': StokBarang,
  'kantin/pembelian': Pembelian,
  'kantin/history': HistoryTransaksi,
  'kantin/bon': BonAnggota,
  'kantin/pembayaran': PengaturanPembayaran,
};
const siapDi = (id) =>
  Object.keys(HALAMAN)
    .filter((k) => k.startsWith(`${id}/`))
    .map((k) => k.slice(id.length + 1));

const adalahBeranda = (p) => p === '/koperasi' || p === '/koperasi/';
const itemMenu = (to, label, Ikon, pendek) => ({
  to,
  label,
  pendek,
  Ikon,
  aktif: (p) => p.startsWith(to),
});

// Tepat 5 menu: batas NavBawah di ponsel
const MENU = [
  itemMenu(AKAR_UNIT, 'Unit Usaha', FaStore),
  ...GRUP_MENU.map((g) => itemMenu(jalurGrup(g), g.label, g.Ikon, g.pendek)),
];

const keItem =
  (unit) =>
  ({ segmen, label, Ikon, pendek }) =>
    itemMenu(jalurUnit(unit, segmen), label, Ikon, pendek);
const menuUnit = (unit) => unit.menu.map(keItem(unit));
// Menu samping (layar lebar saja) = menu unit + menu khusus samping, mis. Kasir
const menuSampingUnit = (unit) => [
  ...(unit.menuSamping || []).map(keItem(unit)),
  ...menuUnit(unit),
];

const renderNav = ({ isCollapsed, navItemClass, path }) => {
  const unit = unitDariPath(path);
  const menu = unit ? menuSampingUnit(unit) : MENU;
  return (
    <>
      {/* Menu Portal SSO, lalu Beranda Koperasi atau jalan keluar dari modul unit */}
      <div>
        <div className="space-y-1">
          <Link to="/" title="Kembali ke Portal" className={navItemClass(false)}>
            <FaArrowLeft size={16} className="shrink-0 text-amber-500" />
            <span className={`truncate text-amber-500 ${isCollapsed ? 'md:hidden' : ''}`}>
              Portal SSO
            </span>
          </Link>
          {unit ? (
            <Link to={AKAR_UNIT} title="Kembali ke Koperasi" className={navItemClass(false)}>
              <FaArrowLeft size={16} className="shrink-0" />
              <span className={`truncate ${isCollapsed ? 'md:hidden' : ''}`}>Koperasi</span>
            </Link>
          ) : (
            <Link to="/koperasi" title="Beranda" className={navItemClass(adalahBeranda(path))}>
              <FaThLarge size={16} className="shrink-0" />
              <span className={`truncate ${isCollapsed ? 'md:hidden' : ''}`}>Beranda</span>
            </Link>
          )}
        </div>
      </div>

      {/* Menu UTAMA: layar lebar saja; di ponsel lewat NavBawah */}
      <div className="hidden md:block">
        {!isCollapsed && (
          <p className="px-4 text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">
            {unit ? unit.nama : 'Menu'}
          </p>
        )}
        <div className="space-y-1">
          {menu.map(({ to, label, Ikon, aktif }) => (
            <Link key={to} to={to} title={label} className={navItemClass(aktif(path))}>
              <Ikon size={16} className="shrink-0" />
              <span className={`truncate ${isCollapsed ? 'md:hidden' : ''}`}>{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
};

export default function AppModule() {
  const { punyaPeran } = useAuth();
  const { pathname } = useLocation();
  // Tampilan saja; datanya dijaga rules & Function
  if (!punyaPeran(PERAN.koperasi)) return <Navigate to="/" replace />;

  const unit = unitDariPath(pathname);
  const brand = unit
    ? { code: unit.kode, title: unit.nama, subtitle: 'Unit Usaha', mobileTitle: unit.nama }
    : BRAND;

  return (
    <AppLayout
      brand={brand}
      accent="blue"
      sidebar={{
        navClassName: 'flex-1 flex flex-col px-3 py-4 space-y-6 overflow-y-auto custom-scrollbar',
        toggleClassName: 'px-4 mt-auto mb-4',
        renderNav,
      }}
    >
      <Routes>
        <Route path="/" element={<Beranda />} />
        <Route path="/unit-usaha" element={<UnitUsaha />} />

        {UNIT_USAHA.map((u) => (
          <Route
            key={u.id}
            path={`/unit-usaha/${u.id}`}
            element={<Navigate to={jalurUnit(u, u.menu[0].segmen)} replace />}
          />
        ))}
        {UNIT_USAHA.flatMap((u) =>
          u.menu.map((m) => {
            const Halaman = HALAMAN[`${u.id}/${m.segmen}`];
            return (
              <Route
                key={`${u.id}/${m.segmen}`}
                path={`/unit-usaha/${u.id}/${m.segmen}`}
                element={
                  Halaman ? (
                    <Halaman />
                  ) : (
                    <KerangkaHalaman judul={m.label} keterangan={m.keterangan} />
                  )
                }
              />
            );
          }),
        )}
        <Route path="/unit-usaha/kantin/kasir" element={<Kasir />} />
        <Route path="/unit-usaha/kantin/stok/tambah" element={<HalamanBarang />} />
        <Route path="/unit-usaha/kantin/stok/:id/ubah" element={<HalamanBarang />} />
        <Route path="/anggota/daftar/:id" element={<BukuAnggota />} />

        {GRUP_MENU.map((g) => (
          <Route key={g.id} path={`/${g.id}`} element={<HubMenu grup={g} siap={siapDi(g.id)} />} />
        ))}
        {GRUP_MENU.flatMap((g) =>
          g.sub.map((s) => {
            const Halaman = HALAMAN[`${g.id}/${s.segmen}`];
            return (
              <Route
                key={`${g.id}/${s.segmen}`}
                path={`/${g.id}/${s.segmen}`}
                element={
                  Halaman ? (
                    <Halaman />
                  ) : (
                    <KerangkaHalaman
                      judul={s.label}
                      keterangan={s.keterangan}
                      kembali={{ to: jalurGrup(g), label: g.label }}
                    />
                  )
                }
              />
            );
          }),
        )}
        <Route path="*" element={<Navigate to="/koperasi" replace />} />
      </Routes>
      <NavBawah menu={unit ? menuUnit(unit) : MENU} />
      {unit?.id === 'kantin' && pathname !== JALUR_KASIR_KANTIN && <TombolKasir />}
      <ToastViewport />
    </AppLayout>
  );
}
