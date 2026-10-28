import { useUrlBerkas } from '@/utils/useUrlBerkas';
import { thumbDari } from '../services/fotoPegawai';

/** Foto profil kecil pegawai (thumbnail foto pertama), atau inisial namanya. */
export default function AvatarPegawai({ pegawai }) {
  const pertama = pegawai.fotoPaths?.[0];
  const { url } = useUrlBerkas(pertama ? thumbDari(pertama) : '');
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
      />
    );
  }
  return (
    <div className="w-9 h-9 rounded-full shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center text-sm font-bold">
      {(pegawai.nama || '?')[0].toUpperCase()}
    </div>
  );
}
