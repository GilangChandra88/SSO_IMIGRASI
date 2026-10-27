import { daftarFoto } from '@/utils/ulangTahun';

/**
 * Foto pegawai (bawaan: foto pertamanya), atau inisial namanya bila belum ada foto. `url` memilih
 * foto tertentu; `varian` = kelas tambahan untuk gambar (filter/transform captcha); ukuran &
 * bentuk lewat `className`.
 */
export default function FotoWajah({ pegawai, url, varian = '', alt = '', className = '' }) {
  const src = url || daftarFoto(pegawai)[0]?.url;
  const inisial = (pegawai?.nama || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((k) => k[0])
    .join('')
    .toUpperCase();
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt}
          draggable="false"
          className={`w-full h-full object-cover select-none ${varian}`}
        />
      ) : (
        <div
          role={alt ? 'img' : undefined}
          aria-label={alt || undefined}
          className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1e4080] to-[#2A78D6] text-white font-bold text-[2em] select-none ${varian}`}
        >
          {inisial}
        </div>
      )}
    </div>
  );
}
