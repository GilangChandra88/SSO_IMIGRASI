import { useUrlBerkas } from '@/utils/useUrlBerkas';
import { thumbDari } from '../services/fotoPegawai';
import { K } from '../ui/kelas';

const UKURAN = { sm: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' };

/** Foto profil kecil pegawai (thumbnail foto pertama), atau inisial namanya. */
export default function AvatarPegawai({ pegawai, ukuran = 'sm' }) {
  const pertama = pegawai.fotoPaths?.[0];
  const { url } = useUrlBerkas(pertama ? thumbDari(pertama) : '');
  const kelas = `${UKURAN[ukuran] || UKURAN.sm} rounded-full shrink-0`;
  if (url) {
    return <img src={url} alt="" className={`${kelas} object-cover border ${K.garis}`} />;
  }
  return (
    <div className={`${kelas} ${K.lencanaAksen} flex items-center justify-center font-bold`}>
      {(pegawai.nama || '?')[0].toUpperCase()}
    </div>
  );
}
