import { tahunIni } from '@/utils/nilai';
import { K } from '../../ui/kelas';
import { NAMA_BULAN } from '../../ui/format';
import { BULAN } from '../../utils/laporan';

/** Pilihan tahun dan bulan. `setahun` = tambahkan pilihan "Setahun" (nilai ''). */
export default function PilihPeriode({
  tahun,
  bulan,
  onTahun,
  onBulan,
  setahun = true,
  tahunAwal,
  hanyaTahun = false,
}) {
  const akhir = tahunIni();
  const awal = Number.isFinite(tahunAwal) ? Math.min(tahunAwal, akhir) : akhir;
  const daftarTahun = Array.from({ length: akhir - awal + 1 }, (_, i) => akhir - i);
  return (
    <div className="grid grid-cols-2 gap-2 mb-4 sm:max-w-md">
      <label>
        <span className={K.label}>Tahun</span>
        <select
          className={K.masukan}
          value={tahun}
          onChange={(e) => onTahun(Number(e.target.value))}
        >
          {daftarTahun.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label className={hanyaTahun ? 'hidden' : ''}>
        <span className={K.label}>Periode</span>
        <select className={K.masukan} value={bulan} onChange={(e) => onBulan(e.target.value)}>
          {setahun && <option value="">Setahun</option>}
          {BULAN.map((b, i) => (
            <option key={b} value={b}>
              {NAMA_BULAN[i]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
