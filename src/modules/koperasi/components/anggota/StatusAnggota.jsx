import { K } from '../../ui/kelas';
import { statusWajib } from '../../hooks/useAnggota';

/** Lencana status keanggotaan + simpanan wajib (tunggakan / bayar di muka / lunas). */
export default function StatusAnggota({ a, nominalWajib }) {
  if (a.status === 'keluar') return <span className={K.lencana}>Sudah keluar</span>;
  if (a.status === 'calon') return <span className={K.lencanaPeringatan}>Belum bayar pokok</span>;
  const s = statusWajib(a, nominalWajib);
  if (!s) return null;
  if (s.selisih < 0) return <span className={K.lencanaBahaya}>Tunggakan {-s.selisih} bulan</span>;
  if (s.selisih > 0) return <span className={K.lencanaBaik}>Bayar di muka {s.selisih} bulan</span>;
  return <span className={K.lencanaBaik}>Lunas</span>;
}
