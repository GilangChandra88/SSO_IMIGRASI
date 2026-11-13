import { Link } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { K } from '../ui/kelas';

/**
 * Kerangka halaman Koperasi: tombol kembali (opsional), judul, keterangan, isi.
 * kembali: { to, label }.
 */
export default function Halaman({ judul, sub, kembali, aksi, children }) {
  return (
    <div className={K.latar}>
      <div className={K.halaman}>
        {kembali && (
          <Link to={kembali.to} className={K.kembali}>
            <FaArrowLeft size={11} aria-hidden="true" /> {kembali.label}
          </Link>
        )}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className={K.h1}>{judul}</h1>
            {sub && <p className={K.sub}>{sub}</p>}
          </div>
          {aksi}
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
