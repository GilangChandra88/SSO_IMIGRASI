import { NavLink } from 'react-router-dom';
import { FaFileDownload, FaPrint } from 'react-icons/fa';
import { K } from '../ui/kelas';

const TAB = [
  { to: '/inventory/transaksi', label: 'Barang Masuk', Ikon: FaFileDownload },
  { to: '/inventory/transaksi/cetak', label: 'Cetak Terima Barang', Ikon: FaPrint },
];

/** Tab sub menu Transaksi: riwayat Barang Masuk (dan keluar) serta Cetak Terima Barang. */
export default function TabTransaksi() {
  return (
    <nav className={`${K.tabbar} -mt-2`} aria-label="Sub menu transaksi">
      {TAB.map(({ to, label, Ikon }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) => `${K.tab} ${isActive ? K.tabAktif : K.tabPasif}`}
        >
          <Ikon size={14} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
