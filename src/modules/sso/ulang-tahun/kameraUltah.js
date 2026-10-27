/**
 * Kamera depan untuk "pemindaian biometrik" kejutan ulang tahun. Foto hanya dipakai di layar
 * (object URL di memori), tidak diunggah ke mana pun.
 */

/** true bila halaman terbuka di dalam bingkai (mis. pratinjau VS Code) yang biasanya tak bisa meminta izin. */
export function dalamBingkai() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/** Status izin kamera situs ini: 'granted' | 'denied' | 'prompt' | '' (browser tidak memberi tahu). */
async function statusIzin() {
  try {
    return (await navigator.permissions.query({ name: 'camera' })).state;
  } catch {
    return '';
  }
}

const galat = (name) => Object.assign(new Error(name), { name });

/** Buka kamera depan. @returns {Promise<MediaStream>} */
export async function bukaKamera() {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
    throw galat('TidakDidukung');
  // Sudah diblokir: Chrome menolak tanpa menampilkan jendela izin lagi
  if ((await statusIzin()) === 'denied') throw galat('Diblokir');
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } },
      audio: false,
    });
  } catch (err) {
    // Batasan resolusi tidak terpenuhi: coba lagi tanpa batasan
    if (err?.name !== 'OverconstrainedError') throw err;
    return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  }
}

export function hentikanKamera(stream) {
  stream?.getTracks().forEach((t) => t.stop());
}

/** Pesan galat yang bisa dibaca pengguna (+ kode teknisnya untuk pelacakan). */
export function pesanGalatKamera(err) {
  const kode = err?.name || 'Error';
  let pesan = 'Kamera gagal dibuka. Coba lagi.';
  if (kode === 'Diblokir' || kode === 'NotAllowedError' || kode === 'SecurityError') {
    pesan = dalamBingkai()
      ? 'Halaman ini terbuka di dalam pratinjau/bingkai yang tidak bisa memakai kamera. Buka alamat yang sama di tab Chrome atau Edge biasa.'
      : 'Kamera diblokir untuk situs ini. Klik ikon di kiri bilah alamat → Kamera → Izinkan, lalu muat ulang halaman.';
  } else if (kode === 'NotFoundError') {
    pesan = 'Kamera tidak ditemukan di perangkat ini.';
  } else if (kode === 'NotReadableError' || kode === 'AbortError') {
    pesan =
      'Kamera sedang dipakai aplikasi lain (mis. Zoom, Discord, OBS). Tutup dulu, lalu coba lagi.';
  } else if (kode === 'TidakDidukung') {
    pesan = 'Kamera hanya bisa dibuka lewat HTTPS atau localhost, dan tidak di browser ini.';
  }
  return `${pesan} (kode: ${kode})`;
}

/**
 * Ambil satu bingkai dari `video` (dicerminkan, sama seperti pratinjau kamera depan).
 * @returns {Promise<string>} object URL gambar JPEG; lepaskan dengan URL.revokeObjectURL
 */
export function ambilGambar(video) {
  const lebar = video.videoWidth || 640;
  const tinggi = video.videoHeight || 480;
  const kanvas = document.createElement('canvas');
  kanvas.width = lebar;
  kanvas.height = tinggi;
  const ctx = kanvas.getContext('2d');
  ctx.translate(lebar, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, lebar, tinggi);
  return new Promise((resolve, reject) =>
    kanvas.toBlob(
      (blob) => (blob ? resolve(URL.createObjectURL(blob)) : reject(new Error('gagal'))),
      'image/jpeg',
      0.9,
    ),
  );
}
