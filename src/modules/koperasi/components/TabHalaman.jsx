import { K } from '../ui/kelas';

/** Tab selebar layar, dibagi rata. daftar: [{ id, label }]. */
export default function TabHalaman({ daftar, aktif, onUbah, label }) {
  return (
    <div className={K.seg} role="tablist" aria-label={label}>
      {daftar.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={aktif === t.id}
          className={`${K.segBtn} ${aktif === t.id ? K.segAktif : K.segPasif}`}
          onClick={() => onUbah(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
