import { FaSyncAlt } from 'react-icons/fa';
import { ANIM } from '@/utils/animasi';
import { K } from '../ui/kelas';

/** Kerangka halaman: judul, keterangan, tombol segarkan, dan isi. */
export default function Halaman({ judul, sub, onSegarkan, memuat = false, aksi = null, children }) {
  return (
    <div className={K.halaman}>
      <div className={K.kepala}>
        <div className="min-w-0">
          <h1 className={K.h1}>{judul}</h1>
          {sub && <p className={K.sub}>{sub}</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          {aksi}
          {onSegarkan && (
            <button
              type="button"
              className={K.tombolKedua}
              onClick={onSegarkan}
              disabled={memuat}
              aria-label="Segarkan"
            >
              <FaSyncAlt size={12} className={memuat ? 'motion-safe:animate-spin' : ''} />
              <span className="max-sm:hidden">Segarkan</span>
            </button>
          )}
        </div>
      </div>
      <div className={ANIM.muncul}>{children}</div>
    </div>
  );
}
