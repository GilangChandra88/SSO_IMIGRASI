import { Link } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { K } from '../ui/kelas';

/** Kerangka halaman yang isinya belum dibangun. kembali: { to, label } (opsional). */
export default function KerangkaHalaman({ judul, keterangan, kembali }) {
  return (
    <div className={K.latar}>
      <div className={K.halaman}>
        {kembali && (
          <Link to={kembali.to} className={K.kembali}>
            <FaArrowLeft size={11} aria-hidden="true" /> {kembali.label}
          </Link>
        )}
        <h1 className={K.h1}>{judul}</h1>
        <p className={K.sub}>{keterangan}</p>
        <p className={K.kosong}>Halaman ini menyusul.</p>
      </div>
    </div>
  );
}
