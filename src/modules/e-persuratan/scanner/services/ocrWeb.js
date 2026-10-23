/**
 * OCR langsung di browser (tesseract.js, mesin Tesseract yang sama dengan Agen Scanner), tanpa
 * agen. Berjalan di web worker sehingga halaman tidak macet. Mesin (WASM) & data bahasa
 * Indonesia + Inggris disajikan dari situs sendiri (`public/ocr/`), bukan CDN luar; dimuat saat
 * OCR pertama dipakai lalu disimpan browser (IndexedDB) untuk pemakaian berikutnya.
 */

const BAHASA = ['ind', 'eng'];
const OEM_LSTM = 1; // mesin LSTM saja (cocok dengan berkas inti *-lstm.wasm.js)
const PSM = { blok: '6', halaman: '3' }; // 6 = satu blok teks (potongan kecil), 3 = otomatis

const alamat = (p) => new URL(`${import.meta.env.BASE_URL}ocr/${p}`, window.location.origin).href;

let pekerja = null;
let siap = false;
let antre = Promise.resolve(); // satu pekerja → pekerjaan dijalankan berurutan

const BATAS_MUAT = 90_000; // unduhan pertama ±10 MB; lebih dari ini dianggap gagal

/**
 * Buat pekerja OCR. tesseract.js melaporkan kegagalan inisialisasi lewat `errorHandler` tanpa
 * menolak janji `createWorker` (menunggu selamanya), jadi galat itu & batas waktu diubah menjadi
 * penolakan agar pengguna mendapat pesan, bukan putaran tanpa akhir.
 */
function buatPekerja() {
  return new Promise((resolve, reject) => {
    const batas = setTimeout(
      () => reject(new Error('Waktu memuat habis. Periksa koneksi lalu coba lagi.')),
      BATAS_MUAT,
    );
    import('tesseract.js')
      .then(({ createWorker }) =>
        createWorker(BAHASA, OEM_LSTM, {
          workerPath: alamat('worker.min.js'),
          corePath: alamat('core'),
          langPath: alamat('lang'),
          // Data bahasa disajikan TANPA gzip: server (Vite/Vercel) bisa menambahkan header
          // Content-Encoding pada berkas .gz sehingga browser membukanya lebih dulu dan
          // tesseract.js gagal membukanya lagi
          gzip: false,
          workerBlobURL: false,
          errorHandler: (e) => reject(new Error(String(e?.message || e))),
        }),
      )
      .then(resolve, reject)
      .finally(() => clearTimeout(batas));
  });
}

function dapatkanPekerja() {
  if (!pekerja) {
    pekerja = buatPekerja()
      .then((w) => {
        siap = true;
        return w;
      })
      .catch((err) => {
        pekerja = null; // izinkan coba lagi
        throw new Error(`Mesin OCR gagal dimuat. ${err?.message || err}`);
      });
  }
  return pekerja;
}

/** true bila mesin OCR sudah dimuat (OCR berikutnya tidak perlu mengunduh ±10 MB lagi). */
export const ocrSudahSiap = () => siap;

const kotak = (bbox) => ({ x: bbox.x0, y: bbox.y0, w: bbox.x1 - bbox.x0, h: bbox.y1 - bbox.y0 });

/**
 * OCR satu gambar (Blob). Mengembalikan { teks, baris: [{ teks, x, y, w, h }], kata: [...] } —
 * koordinat dalam piksel gambar yang dikirim (sama dengan bentuk hasil Agen Scanner).
 * `mode`: 'blok' (potongan kecil, mis. nomor kwitansi) atau 'halaman'. `signal` membatalkan
 * penantian hasil (pekerjaan yang sedang berjalan tetap selesai di latar belakang).
 */
export function bacaTeksWeb(blob, { mode = 'blok', signal } = {}) {
  const tugas = antre.then(async () => {
    if (signal?.aborted) throw new DOMException('OCR dibatalkan.', 'AbortError');
    const w = await dapatkanPekerja();
    await w.setParameters({ tessedit_pageseg_mode: PSM[mode] || PSM.blok });
    const { data } = await w.recognize(blob, {}, { text: true, blocks: true });
    const baris = [];
    const kata = [];
    for (const b of data.blocks || []) {
      for (const p of b.paragraphs) {
        for (const l of p.lines) {
          baris.push({ teks: l.text.trim(), ...kotak(l.bbox) });
          for (const k of l.words) kata.push({ teks: k.text, ...kotak(k.bbox) });
        }
      }
    }
    // Satu baris teks per baris hasil (tanpa baris kosong), sama dengan format hasil agen
    const teks = baris
      .map((b) => b.teks)
      .filter(Boolean)
      .join('\n');
    return { teks: teks || (data.text || '').trim(), baris, kata };
  });
  antre = tugas.catch(() => {});

  if (!signal) return tugas;
  return new Promise((resolve, reject) => {
    const batal = () => reject(new DOMException('OCR dibatalkan.', 'AbortError'));
    if (signal.aborted) return batal();
    signal.addEventListener('abort', batal, { once: true });
    tugas.then(resolve, reject).finally(() => signal.removeEventListener('abort', batal));
  });
}
