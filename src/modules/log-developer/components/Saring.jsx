import { K } from '../ui/kelas';

/** Pilihan saring berbentuk tombol segmen. `pilihan` = [{ id, label }]; id '' = semua. */
export default function Saring({ pilihan, nilai, onUbah, label }) {
  return (
    <div className={K.seg} role="group" aria-label={label}>
      {pilihan.map((p) => (
        <button
          key={p.id}
          type="button"
          className={p.id === nilai ? K.segAktif : K.segBtn}
          aria-pressed={p.id === nilai}
          onClick={() => onUbah(p.id)}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
