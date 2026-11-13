import { Link } from 'react-router-dom';
import { FaChevronRight } from 'react-icons/fa';
import { K } from '../ui/kelas';
import { UNIT_USAHA, jalurUnit } from '../data/unitUsaha';

export default function UnitUsaha() {
  return (
    <div className={K.latar}>
      <div className={K.halaman}>
        <h1 className={K.h1}>Unit Usaha</h1>
        <p className={K.sub}>Pilih unit usaha untuk masuk ke modulnya.</p>
        <ul className="mt-4 flex flex-col gap-2.5">
          {UNIT_USAHA.map((unit) => (
            <li key={unit.id}>
              <Link
                to={jalurUnit(unit)}
                className={`${K.kartu} ${K.tautan} flex items-center gap-3`}
              >
                <span className={K.ikonBulat} aria-hidden="true">
                  <unit.Ikon size={14} />
                </span>
                <span className={`${K.judulSeksi} flex-1 min-w-0 truncate`}>{unit.nama}</span>
                <FaChevronRight size={12} className={K.redup} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
