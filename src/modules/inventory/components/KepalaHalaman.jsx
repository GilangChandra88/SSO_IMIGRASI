import { K } from '../ui/kelas';

/** Judul halaman + subjudul, tombol aksi di kanan (PageHead purwarupa). */
export default function KepalaHalaman({ judul, sub, children }) {
  return (
    <header className="min-h-10 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className={K.judul}>{judul}</h1>
        {sub && <span className={K.subJudul}>{sub}</span>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </header>
  );
}
