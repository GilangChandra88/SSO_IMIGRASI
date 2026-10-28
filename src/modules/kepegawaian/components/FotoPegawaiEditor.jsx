import { useEffect, useMemo } from 'react';
import { FaCamera, FaTimes } from 'react-icons/fa';
import { showToast } from '@/utils/toastStore';
import { JUMLAH } from '@/utils/batas';
import { useUrlBerkas } from '@/utils/useUrlBerkas';
import { thumbDari, validasiFoto } from '../services/fotoPegawai';

const MAKS_FOTO = JUMLAH.fotoPegawai; // rules: pegawai.fotoPaths ≤ 9
const kotak = 'w-12 h-12 rounded-lg object-cover border';

function TombolBuang({ nomor, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title="Buang foto"
      aria-label={`Buang foto ${nomor}`}
      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-700 hover:bg-rose-600 disabled:opacity-60 text-white flex items-center justify-center shadow"
    >
      <FaTimes size={9} />
    </button>
  );
}

/** Foto yang sudah tersimpan: ditampilkan dari thumbnail-nya di Storage. */
function FotoTersimpan({ path, nomor, onBuang, disabled }) {
  const { url } = useUrlBerkas(thumbDari(path));
  return (
    <div className="relative">
      {url ? (
        <img
          src={url}
          alt={`Foto ${nomor}`}
          className={`${kotak} border-slate-300 dark:border-slate-700`}
        />
      ) : (
        <div
          className={`${kotak} border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 animate-pulse`}
        />
      )}
      <TombolBuang nomor={nomor} onClick={onBuang} disabled={disabled} />
    </div>
  );
}

/**
 * Foto pegawai di form (maks. MAKS_FOTO): foto tersimpan (path Storage) dan foto baru yang
 * belum diunggah (pratinjau lokal). Foto dipakai bergiliran di captcha ulang tahun; foto pertama
 * menjadi foto profil (thumbnail di pegawai ringkas). Diunggah saat form disimpan.
 */
export default function FotoPegawaiEditor({
  tersimpan,
  baru,
  onBuangTersimpan,
  onTambah,
  onBuangBaru,
  disabled,
}) {
  const pratinjau = useMemo(() => baru.map((f) => URL.createObjectURL(f)), [baru]);
  useEffect(() => () => pratinjau.forEach((u) => URL.revokeObjectURL(u)), [pratinjau]);
  const jumlah = tersimpan.length + baru.length;

  function pilih(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    const galat = files.map(validasiFoto).find(Boolean);
    if (galat) showToast(galat, 'error');
    const sah = files.filter((f) => !validasiFoto(f));
    const sisa = MAKS_FOTO - jumlah;
    if (sah.length > sisa) showToast(`Maksimal ${MAKS_FOTO} foto per pegawai.`, 'error');
    if (sisa > 0 && sah.length) onTambah(sah.slice(0, sisa));
  }

  return (
    <div>
      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
        <FaCamera className="text-amber-500" /> FOTO PEGAWAI ({jumlah}/{MAKS_FOTO})
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {tersimpan.map((path, i) => (
          <FotoTersimpan
            key={path}
            path={path}
            nomor={i + 1}
            onBuang={() => onBuangTersimpan(path)}
            disabled={disabled}
          />
        ))}
        {pratinjau.map((url, i) => (
          <div key={url} className="relative">
            <img
              src={url}
              alt={`Foto baru ${i + 1}`}
              className={`${kotak} border-indigo-400 dark:border-indigo-500`}
            />
            <TombolBuang
              nomor={tersimpan.length + i + 1}
              onClick={() => onBuangBaru(i)}
              disabled={disabled}
            />
          </div>
        ))}
        {jumlah < MAKS_FOTO && (
          <label
            className={`text-xs font-bold bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 px-3 py-2 rounded-lg border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 ${disabled ? 'opacity-60' : 'cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30'}`}
          >
            <FaCamera /> Tambah Foto
            <input
              type="file"
              accept="image/jpeg,image/png"
              multiple
              disabled={disabled}
              onChange={pilih}
              className="sr-only"
            />
          </label>
        )}
      </div>
      <p className="text-[11px] text-slate-400 mt-1">
        JPG/PNG, dikecilkan otomatis sebelum diunggah. Foto pertama menjadi foto profil; semua foto
        dipakai bergiliran di kejutan ulang tahun.
      </p>
    </div>
  );
}
