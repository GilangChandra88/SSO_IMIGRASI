/**
 * Kompres gambar di browser sebelum diunggah (CLAUDE.md 7.1 "Berkas"): sisi terpanjang dibatasi,
 * lalu kualitas JPEG diturunkan bertahap sampai ukuran ≤ target. PDF dan gambar yang sudah cukup
 * kecil dikembalikan apa adanya. Hasil kompresi selalu JPEG (PNG transparan diberi latar putih).
 */

const DIKOMPRES = ['image/jpeg', 'image/png'];
const KUALITAS = [0.85, 0.75, 0.65, 0.55];

function buatKanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const k = document.createElement('canvas');
  k.width = w;
  k.height = h;
  return k;
}

const keJpeg = (kanvas, kualitas) =>
  kanvas.convertToBlob
    ? kanvas.convertToBlob({ type: 'image/jpeg', quality: kualitas })
    : new Promise((selesai) => kanvas.toBlob(selesai, 'image/jpeg', kualitas));

const namaJpg = (nama) => `${String(nama || 'gambar').replace(/\.[^.]+$/, '')}.jpg`;

/**
 * @param {File} file
 * @param {{ targetByte: number, sisiMaks?: number, wajibJpeg?: boolean }} opsi  wajibJpeg = PNG yang
 *   sudah cukup kecil tetap diubah ke JPEG (folder yang hanya menerima JPEG, mis. foto pegawai)
 * @returns {Promise<File>} berkas asli bila bukan gambar atau sudah cukup kecil
 * @throws bila gambar tidak bisa dibaca atau tetap lebih besar dari target
 */
export async function kompresGambar(file, { targetByte, sisiMaks = 2000, wajibJpeg = false }) {
  if (!file || !DIKOMPRES.includes(file.type)) return file;
  const bitmap = await createImageBitmap(file);
  try {
    let skala = Math.min(1, sisiMaks / Math.max(bitmap.width, bitmap.height));
    const sudahJpeg = !wajibJpeg || file.type === 'image/jpeg';
    if (skala === 1 && file.size <= targetByte && sudahJpeg) return file;
    for (let putaran = 0; putaran < 5; putaran++) {
      const w = Math.max(1, Math.round(bitmap.width * skala));
      const h = Math.max(1, Math.round(bitmap.height * skala));
      const kanvas = buatKanvas(w, h);
      const ctx = kanvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(bitmap, 0, 0, w, h);
      for (const kualitas of KUALITAS) {
        const blob = await keJpeg(kanvas, kualitas);
        if (blob && blob.size <= targetByte) {
          return new File([blob], namaJpg(file.name), { type: 'image/jpeg' });
        }
      }
      skala *= 0.75;
    }
    throw new Error('Gambar terlalu besar dan tidak bisa diperkecil.');
  } finally {
    bitmap.close?.();
  }
}
