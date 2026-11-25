/**
 * Cetak & gabung PDF LPJ — pembungkus RINGAN. Pembuat PDF (@react-pdf/renderer, ±1,2 MB) baru
 * diunduh saat salah satu fungsi dipanggil pertama kali (docs/rencana-percepatan.md Tahap 3);
 * isinya di ./cetakPdfIsi.js. `siapkanPdf()` mengunduhnya lebih dulu (mis. saat tombol disorot).
 */

const muat = () => import('./cetakPdfIsi');

/** Unduh pembuat PDF lebih dulu tanpa menunggu; galat diabaikan (dicoba lagi saat dipakai). */
export function siapkanPdf() {
  muat().catch(() => {});
}

export const bukaPdf = async (buatDokumen) => (await muat()).bukaPdf(buatDokumen);
export const unduhPdf = async (buatDokumen, namaBerkas) =>
  (await muat()).unduhPdf(buatDokumen, namaBerkas);
export const cetakPdf = async (dok) => (await muat()).cetakPdf(dok);
export const cetakGabungan = async (daftar) => (await muat()).cetakGabungan(daftar);
export const pdfGabungan = async (daftar) => (await muat()).pdfGabungan(daftar);

/**
 * Cetak PDF (`blob`) lewat bingkai tersembunyi: dialog cetak browser muncul tanpa membuka tab baru.
 * Melempar galat bila browser tidak mengizinkan (pemanggil bisa membuka tab baru sebagai cadangan).
 * Bingkai tanpa `sandbox` (memblokir penampil PDF & cetak) karena isinya hanya blob PDF buatan
 * aplikasi sendiri (K26).
 */
export function cetakBlob(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const bingkai = document.createElement('iframe');
    bingkai.setAttribute('aria-hidden', 'true');
    bingkai.className = 'fixed right-0 bottom-0 w-px h-px opacity-0 pointer-events-none';
    const bersih = () => {
      bingkai.remove();
      URL.revokeObjectURL(url);
    };
    bingkai.onload = () => {
      // Beri waktu penampil PDF di dalam bingkai siap sebelum memanggil print()
      setTimeout(() => {
        try {
          bingkai.contentWindow.focus();
          bingkai.contentWindow.print();
          resolve();
        } catch (err) {
          reject(err);
        }
        setTimeout(bersih, 60000); // dialog cetak tidak memberi tanda selesai yang andal
      }, 300);
    };
    bingkai.src = url;
    document.body.appendChild(bingkai);
  });
}
