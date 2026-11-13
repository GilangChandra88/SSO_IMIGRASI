import { FaTimes } from 'react-icons/fa';
import { PANJANG } from '@/utils/batas';
import { K } from '../../ui/kelas';

/** Isian barkode dengan tombol Kosongkan. `galat` = pesan masalah (tidak standar / kembar). */
export default function MasukanBarkode({ label, nilai, onUbah, galat }) {
  return (
    <div>
      <label className={K.label} htmlFor={`barkode-${label}`}>
        {label} (boleh kosong)
      </label>
      <div className="flex gap-2">
        <input
          id={`barkode-${label}`}
          className={K.masukan}
          maxLength={PANJANG.barkode}
          inputMode="numeric"
          autoComplete="off"
          aria-invalid={galat ? 'true' : undefined}
          value={nilai}
          onChange={(e) => onUbah(e.target.value.replace(/\s/g, ''))}
        />
        <button
          type="button"
          className={K.tombolKotak}
          aria-label={`Kosongkan ${label.toLowerCase()}`}
          title="Kosongkan barkode"
          disabled={!nilai}
          onClick={() => onUbah('')}
        >
          <FaTimes size={13} />
        </button>
      </div>
      {galat && <span className={K.pesanGalat}>{galat}</span>}
    </div>
  );
}
