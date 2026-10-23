/**
 * Pecah PDF menjadi gambar per halaman langsung di browser (PDF.js / pdfjs-dist), tanpa Agen
 * Scanner. Pustaka & worker-nya dimuat hanya saat PDF pertama diimpor (import dinamis), jadi
 * halaman lain tidak bertambah berat.
 */

const MAKS_SISI = 4000; // batas sisi terpanjang (px) agar PDF berukuran besar tidak menghabiskan memori

let pdfjs = null;

function muatPdfjs() {
  if (!pdfjs) {
    pdfjs = Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
      .then(([lib, worker]) => {
        lib.GlobalWorkerOptions.workerSrc = worker.default;
        return lib;
      })
      .catch((err) => {
        pdfjs = null; // izinkan coba lagi (mis. koneksi putus saat memuat)
        throw err;
      });
  }
  return pdfjs;
}

const galatBatal = () => new DOMException('Impor dibatalkan.', 'AbortError');

function keBlob(canvas) {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Gagal mengubah halaman PDF menjadi gambar.'))),
      'image/jpeg',
      0.85,
    ),
  );
}

/**
 * Render setiap halaman `file` (Blob/File PDF) pada `dpi`, lalu `onHalaman({ ke, lebar, tinggi,
 * blob })` per halaman begitu selesai (bentuk sama dengan hasil agen). Batalkan lewat `signal`.
 * Mengembalikan jumlah halaman.
 */
export async function pecahPdfWeb(file, { dpi = 200, onHalaman, signal } = {}) {
  const lib = await muatPdfjs();
  if (signal?.aborted) throw galatBatal();

  const tugas = lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const batal = () => tugas.destroy();
  signal?.addEventListener('abort', batal);
  try {
    let doc;
    try {
      doc = await tugas.promise;
    } catch (err) {
      if (signal?.aborted) throw galatBatal();
      if (err?.name === 'PasswordException') {
        throw new Error('PDF terkunci kata sandi. Buka kuncinya dulu lalu impor ulang.');
      }
      throw new Error('Berkas PDF rusak atau tidak bisa dibaca.');
    }
    if (!doc.numPages) throw new Error('PDF tidak berisi halaman.');

    for (let ke = 1; ke <= doc.numPages; ke++) {
      if (signal?.aborted) throw galatBatal();
      const page = await doc.getPage(ke);
      const dasar = page.getViewport({ scale: 1 });
      const skala = Math.min(dpi / 72, MAKS_SISI / Math.max(dasar.width, dasar.height));
      const viewport = page.getViewport({ scale: skala });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      await page.render({ canvas, viewport }).promise;
      const blob = await keBlob(canvas);
      const { width: lebar, height: tinggi } = canvas;
      // Lepas memori kanvas & halaman sebelum lanjut ke halaman berikutnya
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();
      if (signal?.aborted) throw galatBatal();
      onHalaman?.({ ke, lebar, tinggi, blob });
    }
    return doc.numPages;
  } catch (err) {
    if (signal?.aborted && err?.name !== 'AbortError') throw galatBatal();
    throw err;
  } finally {
    signal?.removeEventListener('abort', batal);
    tugas.destroy();
  }
}
