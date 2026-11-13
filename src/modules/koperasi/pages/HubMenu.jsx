import { Link } from 'react-router-dom';
import { FaChevronRight } from 'react-icons/fa';
import { K } from '../ui/kelas';
import { jalurGrup } from '../data/menuKoperasi';

/** Halaman satu grup menu Pusat: daftar sub-menu beserta keterangannya. */
export default function HubMenu({ grup, siap = [] }) {
  return (
    <div className={K.latar}>
      <div className={K.halaman}>
        <h1 className={K.h1}>{grup.label}</h1>
        <p className={K.sub}>{grup.keterangan}</p>
        <ul className="mt-4 grid gap-2.5 md:grid-cols-2">
          {grup.sub.map((s) => (
            <li key={s.segmen}>
              <Link
                to={jalurGrup(grup, s.segmen)}
                className={`${K.kartu} ${K.tautan} flex items-center gap-3 h-full`}
              >
                <span className={K.ikonBulat} aria-hidden="true">
                  <s.Ikon size={14} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`${K.judulBaris} block`}>{s.label}</span>
                  <span className={`${K.redup} block`}>{s.keterangan}</span>
                  {!siap.includes(s.segmen) && <span className={K.lencana}>Menyusul</span>}
                </span>
                <FaChevronRight size={12} className={K.redup} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
