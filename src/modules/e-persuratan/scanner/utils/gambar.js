/**
 * Olah gambar halaman di browser (Canvas bawaan): ukuran, putar, dan potong area untuk OCR.
 * Rotasi halaman hanya disimpan sebagai angka (0/90/180/270) dan baru "dibakar" ke piksel saat
 * dibutuhkan (penampil, OCR, ekspor PDF).
 */

export const ROTASI = [0, 90, 180, 270];

/** Kelas rotasi gambar mini; gambar tegak yang diputar 90° diperkecil agar muat di kotak 3:4. */
export function kelasRotasi(rotasi, tegak) {
  if (rotasi === 90) return tegak ? 'rotate-90 scale-75' : 'rotate-90';
  if (rotasi === 180) return 'rotate-180';
  if (rotasi === 270) return tegak ? '-rotate-90 scale-75' : '-rotate-90';
  return '';
}

/** Rotasi berikutnya searah (+90) atau berlawanan (-90) jarum jam. */
export const putarRotasi = (rotasi, delta) => (((rotasi + delta) % 360) + 360) % 360;

function canvasKeBlob(canvas, type, kualitas) {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Gagal mengolah gambar.'))),
      type,
      kualitas,
    ),
  );
}

/**
 * Siapkan gambar impor: JPEG digambar ulang lewat canvas agar orientasi EXIF (foto ponsel) ikut
 * "dibakar" — browser menghormati EXIF, sedangkan agen (OCR) tidak, sehingga koordinat bisa
 * meleset. Format lain dipakai apa adanya. Mengembalikan { blob, lebar, tinggi }.
 */
export async function siapkanGambar(file) {
  const bmp = await createImageBitmap(file);
  const lebar = bmp.width;
  const tinggi = bmp.height;
  if (file.type !== 'image/jpeg') {
    bmp.close();
    return { blob: file, lebar, tinggi };
  }
  const canvas = document.createElement('canvas');
  canvas.width = lebar;
  canvas.height = tinggi;
  canvas.getContext('2d').drawImage(bmp, 0, 0);
  bmp.close();
  return { blob: await canvasKeBlob(canvas, 'image/jpeg', 0.92), lebar, tinggi };
}

/** Gambar dengan rotasi diterapkan ke piksel (JPEG). Rotasi 0 = blob asli. */
export async function blobTerputar(blob, rotasi, { type = 'image/jpeg', kualitas = 0.9 } = {}) {
  if (!rotasi) return blob;
  const bmp = await createImageBitmap(blob);
  const miring = rotasi % 180 !== 0;
  const canvas = document.createElement('canvas');
  canvas.width = miring ? bmp.height : bmp.width;
  canvas.height = miring ? bmp.width : bmp.height;
  const ctx = canvas.getContext('2d');
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotasi * Math.PI) / 180);
  ctx.drawImage(bmp, -bmp.width / 2, -bmp.height / 2);
  bmp.close();
  return canvasKeBlob(canvas, type, kualitas);
}

/**
 * Potong area (pecahan 0–1 dari gambar) menjadi PNG untuk OCR. Potongan kecil diperbesar agar
 * huruf cukup besar bagi Tesseract (±30 px tinggi huruf terbaca paling baik).
 */
export async function potongArea(blob, { x, y, w, h }) {
  const bmp = await createImageBitmap(blob);
  const sx = Math.round(x * bmp.width);
  const sy = Math.round(y * bmp.height);
  const sw = Math.max(1, Math.round(w * bmp.width));
  const sh = Math.max(1, Math.round(h * bmp.height));
  const skala = sw < 1200 ? Math.min(3, 1200 / sw) : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sw * skala);
  canvas.height = Math.round(sh * skala);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return canvasKeBlob(canvas, 'image/png');
}

/** Blob → data URL (untuk <Image> @react-pdf/renderer). */
export function blobKeDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/** Unduh blob sebagai berkas (tanpa membuka tab). */
export function unduhBlob(blob, nama) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nama;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
