import { Link, useLocation } from 'react-router-dom';
import { K } from '../ui/kelas';

/** Bilah menu bawah untuk ponsel (paling banyak 5 menu). menu: [{ to, label, pendek?, Ikon, aktif }]. */
export default function NavBawah({ menu }) {
  const { pathname } = useLocation();
  return (
    <nav className={K.navBawah} aria-label="Menu Koperasi">
      {menu.map(({ to, label, pendek, Ikon, aktif }) => {
        const terpilih = aktif(pathname);
        return (
          <Link
            key={to}
            to={to}
            aria-current={terpilih ? 'page' : undefined}
            className={`${K.navItem} ${terpilih ? K.navAktif : K.navPasif}`}
          >
            <Ikon size={18} aria-hidden="true" />
            <span className="max-w-full truncate px-1">{pendek ?? label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
