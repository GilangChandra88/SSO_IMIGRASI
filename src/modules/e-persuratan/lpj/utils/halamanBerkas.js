/**
 * Ubah berkas unggahan (gambar / PDF di Firebase Storage) menjadi gambar JPEG per halaman agar
 * bisa digabung ke PDF cetakan (@react-pdf hanya menerima JPG/PNG). PDF dipecah per halaman
 * dengan PDF.js; pustakanya dimuat hanya saat dibutuhkan (import dinamis).
 */

const MAKS_SISI = 2400; // batas sisi terpanjang (px) per halaman agar memori tidak membengkak

let pdfjs = null;

function muatPdfjs() {
  if (!pdfjs) {
    pdfjs = Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
      .then(([lib, worker]) => {
        lib.GlobalWorkerOptions.workerSrc = worker.default;
        return lib;
      })
      .catch((err) => {
        pdfjs = null; // izinkan coba lagi
        throw err;
      });
  }
  return pdfjs;
}

const keJpeg = (canvas) => canvas.toDataURL('image/jpeg', 0.88);

async function gambarKeJpeg(blob) {
  const bmp = await createImageBitmap(blob);
  const skala = Math.min(1, MAKS_SISI / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * skala);
  canvas.height = Math.round(bmp.height * skala);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; // latar putih untuk gambar transparan
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close?.();
  return keJpeg(canvas);
}

async function pdfKeJpeg(blob, onHalaman) {
  const lib = await muatPdfjs();
  const tugas = lib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
  const hasil = [];
  try {
    const doc = await tugas.promise;
    for (let i = 1; i <= doc.numPages; i++) {
      const hal = await doc.getPage(i);
      const dasar = hal.getViewport({ scale: 1 });
      const skala = Math.min(2, MAKS_SISI / Math.max(dasar.width, dasar.height));
      const vp = hal.getViewport({ scale: skala });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(vp.width);
      canvas.height = Math.round(vp.height);
      // pdfjs-dist v6: berikan elemen canvas (bukan canvasContext), sama dengan Scanner
      await hal.render({ canvas, viewport: vp }).promise;
      hasil.push(keJpeg(canvas));
      onHalaman?.(hasil.slice()); // halaman yang sudah jadi bisa langsung ditampilkan
      // Lepas memori kanvas & halaman sebelum lanjut ke halaman berikutnya
      canvas.width = 0;
      canvas.height = 0;
      hal.cleanup();
    }
  } finally {
    // pdfjs-dist v6: bersihkan lewat tugas pemuatan (dokumen tidak punya destroy), sama dengan Scanner
    tugas.destroy();
  }
  return hasil;
}

async function olahBerkas(file, onHalaman) {
  let res;
  try {
    res = await fetch(file.url);
  } catch {
    // TypeError tanpa status = permintaan ditolak browser (CORS) atau koneksi putus
    throw new Error(
      'Berkas tidak bisa diunduh browser dari Firebase Storage (aturan CORS bucket belum dipasang, atau koneksi terputus).',
    );
  }
  if (!res.ok) throw new Error(`Gagal mengambil berkas dari Storage (status ${res.status}).`);
  const blob = await res.blob();
  const jenis = file.type || blob.type;
  try {
    if (jenis === 'application/pdf') return await pdfKeJpeg(blob, onHalaman);
    const hasil = [await gambarKeJpeg(blob)];
    onHalaman?.(hasil);
    return hasil;
  } catch (err) {
    throw new Error(`Berkas terunduh, tetapi gagal dibaca: ${err?.message || err}`);
  }
}

// Hasil olahan disimpan per berkas (sesi ini) agar Lihat / Cetak Semua berikutnya langsung jadi
const MAKS_SIMPANAN = 6;
const simpanan = new Map(); // path → { promise, halaman, dengar }

/**
 * Gambar JPEG (data URL) per halaman dari satu berkas unggahan `{ url, path, type, name }`.
 * Hasil disimpan sehingga pemanggilan berikutnya (atau yang sedang berjalan) tidak mengulang
 * unduh & render. `onHalaman(halaman)` dipanggil setiap ada halaman baru yang jadi.
 * Melempar galat bila berkas tidak bisa diambil (koneksi / akses Storage) atau dibaca.
 */
export function halamanDariBerkas(file, { onHalaman } = {}) {
  const kunci = file.path || file.url;
  let e = simpanan.get(kunci);
  if (!e) {
    e = { halaman: [], dengar: new Set() };
    e.promise = olahBerkas(file, (h) => {
      e.halaman = h;
      e.dengar.forEach((f) => f(h));
    }).catch((err) => {
      simpanan.delete(kunci); // gagal: boleh dicoba lagi
      throw err;
    });
    simpanan.set(kunci, e);
    if (simpanan.size > MAKS_SIMPANAN) simpanan.delete(simpanan.keys().next().value);
  }
  if (onHalaman) {
    if (e.halaman.length) onHalaman(e.halaman);
    e.dengar.add(onHalaman);
    e.promise.finally(() => e.dengar.delete(onHalaman)).catch(() => {});
  }
  return e.promise;
}

/** Siapkan berkas di latar belakang (unduh + render) agar Lihat / Cetak Semua terasa instan. */
export function siapkanBerkas(file) {
  if (file?.url) halamanDariBerkas(file).catch(() => {});
}
