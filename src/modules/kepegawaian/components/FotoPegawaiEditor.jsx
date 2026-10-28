import { useEffect, useMemo } from 'react';
import { FaCamera, FaTimes } from 'react-icons/fa';
import { ANIM } from '@/utils/animasi';
import { showToast } from '@/utils/toastStore';
import { JUMLAH } from '@/utils/batas';
import { useUrlBerkas } from '@/utils/useUrlBerkas';
import { thumbDari, validasiFoto } from '../services/fotoPegawai';
import { K } from '../ui/kelas';

const MAKS_FOTO = JUMLAH.fotoPegawai; // rules: pegawai.fotoPaths ≤ 9
const kotak = 'w-14 h-14 rounded-[10px] object-cover border';

function TombolBuang({ nomor, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title="Buang foto"
      aria-label={`Buang foto ${nomor}`}
      className={K.tombolBuangKecil}
    >
      <FaTimes size={9} />
    </button>
  );
}

/** Foto yang sudah tersimpan: ditampilkan dari thumbnail-nya di Storage. */
function FotoTersimpan({ path, nomor, onBuang, disabled }) {
  const { url } = useUrlBerkas(thumbDari(path));
  return (
    <div className={`relative ${ANIM.meletup}`}>
      {url ? (
        <img src={url} alt={`Foto ${nomor}`} className={`${kotak} ${K.garis}`} />
      ) : (
        <div className={`${kotak} ${K.garis} ${K.permukaan2} animate-pulse`} />
      )}
      <TombolBuang nomor={nomor} onClick={onBuang} disabled={disabled} />
    </div>
  );
}

/**
 * Foto pegawai di form (maks. MAKS_FOTO): foto tersimpan (path Storage) dan foto baru yang
 * belum diunggah (pratinjau lokal, berbingkai aksen). Foto dipakai bergiliran di kejutan ulang
 * tahun; foto pertama menjadi foto profil (thumbnail di pegawai ringkas). Diunggah saat disimpan.
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
    <section>
      <h3 className={K.judulBagian}>
        Foto pegawai ({jumlah}/{MAKS_FOTO})
      </h3>
      <div className="flex flex-wrap items-center gap-2.5">
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
          <div key={url} className={`relative ${ANIM.meletup}`}>
            <img src={url} alt={`Foto baru ${i + 1}`} className={`${kotak} ${K.garisAksen}`} />
            <TombolBuang
              nomor={tersimpan.length + i + 1}
              onClick={() => onBuangBaru(i)}
              disabled={disabled}
            />
          </div>
        ))}
        {jumlah < MAKS_FOTO && (
          <label className={`${K.tombolKecil} ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
            <FaCamera className={K.aksen} /> Tambah Foto
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
      <p className={K.bantuan}>
        JPG/PNG, dikecilkan otomatis sebelum diunggah. Foto pertama menjadi foto profil; semua foto
        dipakai bergiliran di kejutan ulang tahun.
      </p>
    </section>
  );
}
