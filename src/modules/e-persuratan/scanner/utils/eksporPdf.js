/**
 * Ekspor PDF Scanner — pembungkus RINGAN: pembuat PDF baru diunduh saat ekspor pertama kali
 * (docs/rencana-percepatan.md Tahap 3). Isinya di ./eksporPdfIsi.js.
 */

/** `halaman` = [{ blob, rotasi, lebar, tinggi }] → Blob PDF. */
export async function buatPdf(halaman, opsi) {
  return (await import('./eksporPdfIsi')).buatPdf(halaman, opsi);
}
