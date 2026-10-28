/**
 * Foto pegawai di Firebase Storage (docs/skema-database.md §5.1 & §7). Setiap foto disimpan dua kali
 * dengan nama berkas yang sama: `pegawai/{id}/foto/{nama}` (JPEG ≤300 KB, dibaca pemilik &
 * Kepegawaian, untuk captcha ulang tahun) dan `pegawai/{id}/thumb/{nama}` (JPEG ≤60 KB, dibaca semua
 * pegawai). Dokumen pegawai hanya menyimpan `fotoPaths`; thumbnail foto pertama diturunkan Cloud
 * Function ke `pegawai_ringkas.fotoThumbPath`.
 */
import { JALUR_BERKAS, TIPE_GAMBAR } from '@/config/koleksi';
import { UKURAN_BERKAS } from '@/utils/batas';
import { hapusDariStorage, unggahBerkas, validasiBerkas } from '@/utils/berkasStorage';
import { kompresGambar } from '@/utils/kompresGambar';

/** Batas berkas asli sebelum dikompres di browser (foto kamera ponsel). */
const MAKS_ASLI = 20 * 1024 * 1024;

/** @returns {string} pesan galat, atau '' bila sah */
export const validasiFoto = (file) =>
  validasiBerkas(file, { tipe: TIPE_GAMBAR, maksByte: MAKS_ASLI });

/** Path thumbnail dari path foto asli (nama berkas sama). */
export const thumbDari = (path) => String(path || '').replace(/\/foto\/([^/]+)$/, '/thumb/$1');

/**
 * Kompres lalu unggah foto asli + thumbnailnya. Bila thumbnail gagal, foto asli dihapus lagi.
 * @returns {Promise<string>} path foto asli (isi `fotoPaths`)
 */
export async function unggahFotoPegawai(pegawaiId, file, uid) {
  const [foto, thumb] = await Promise.all([
    kompresGambar(file, { targetByte: UKURAN_BERKAS.pegawaiFoto, sisiMaks: 1080, wajibJpeg: true }),
    kompresGambar(file, { targetByte: UKURAN_BERKAS.pegawaiThumb, sisiMaks: 240, wajibJpeg: true }),
  ]);
  const { path } = await unggahBerkas(JALUR_BERKAS.pegawaiFoto(pegawaiId), foto, { uid });
  try {
    await unggahBerkas(JALUR_BERKAS.pegawaiThumb(pegawaiId), thumb, {
      uid,
      nama: path.slice(path.lastIndexOf('/') + 1),
    });
  } catch (err) {
    await hapusDariStorage(path).catch(() => {});
    throw err;
  }
  return path;
}

/** Hapus foto asli + thumbnailnya; diam bila sudah tidak ada. */
export const hapusFotoPegawai = (path) =>
  Promise.all([hapusDariStorage(path), hapusDariStorage(thumbDari(path))]);
