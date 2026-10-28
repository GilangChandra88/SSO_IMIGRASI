import { tahunIni } from '@/utils/nilai';
import { pilihanTahun } from '../../utils/kehadiran';
import { K } from '../../ui/kelas';

/** Saringan tahun + semester (0 = setahun) untuk Daftar Kegiatan dan Rekap Kehadiran. */
export default function PilihPeriode({ tahun, semester, onUbah }) {
  return (
    <>
      <select
        aria-label="Tahun"
        value={tahun}
        onChange={(e) => onUbah({ tahun: Number(e.target.value), semester })}
        className={K.kontrol}
      >
        {pilihanTahun(tahunIni()).map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <select
        aria-label="Semester"
        value={semester}
        onChange={(e) => onUbah({ tahun, semester: Number(e.target.value) })}
        className={K.kontrol}
      >
        <option value={1}>Semester 1</option>
        <option value={2}>Semester 2</option>
        <option value={0}>Setahun</option>
      </select>
    </>
  );
}
