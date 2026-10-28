import { useUrlBerkas } from '@/utils/useUrlBerkas';

/**
 * Foto pegawai, atau inisial namanya bila belum ada foto (atau foto gagal dimuat). Bawaan: foto
 * pertama dokumen pegawai (`fotoPaths`, hanya pemilik & Kepegawaian) atau thumbnail pegawai ringkas
 * (`fotoThumbPath`, semua pegawai). `path` memilih foto Storage tertentu, `url` memakai URL lokal
 * (mis. foto kamera); `varian` = kelas tambahan untuk gambar (filter/transform captcha); ukuran &
 * bentuk lewat `className`.
 */
export default function FotoWajah({ pegawai, path, url, varian = '', alt = '', className = '' }) {
  const jalur = url ? '' : path || pegawai?.fotoPaths?.[0] || pegawai?.fotoThumbPath || '';
  const { url: urlBerkas } = useUrlBerkas(jalur);
  const src = url || urlBerkas;
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
