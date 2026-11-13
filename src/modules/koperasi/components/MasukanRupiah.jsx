import { keRupiah } from '@/utils/nilai';
import { K } from '../ui/kelas';
import { angka } from '../ui/format';

/** Isian rupiah: tampil bertitik ribuan, nilainya bilangan bulat; papan angka di ponsel. */
export default function MasukanRupiah({ nilai, onUbah, ...lain }) {
  return (
    <input
      inputMode="numeric"
      className={K.masukan}
      placeholder="0"
      value={nilai ? angka(nilai) : ''}
      onChange={(e) => onUbah(keRupiah(e.target.value))}
      {...lain}
    />
  );
}
