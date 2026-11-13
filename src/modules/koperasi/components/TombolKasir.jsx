import { Link } from 'react-router-dom';
import { FaCashRegister } from 'react-icons/fa';
import { K } from '../ui/kelas';
import { JALUR_KASIR_KANTIN } from '../data/unitUsaha';

/** Tombol melayang menuju Kasir, tampil di semua halaman modul Kantin. */
export default function TombolKasir() {
  return (
    <Link to={JALUR_KASIR_KANTIN} className={K.tombolMelayang} aria-label="Kasir" title="Kasir">
      <FaCashRegister size={20} aria-hidden="true" />
    </Link>
  );
}
