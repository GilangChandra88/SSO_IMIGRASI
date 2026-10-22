/**
 * Gabungkan halaman menjadi satu PDF A4 (satu gambar per halaman, orientasi mengikuti gambar).
 * Dibuat di browser dengan @react-pdf/renderer; rotasi halaman diterapkan lebih dulu.
 */

import { createElement as h } from 'react';
import { Document, Image, Page, StyleSheet, pdf } from '@react-pdf/renderer';
import { blobKeDataUrl, blobTerputar } from './gambar';

const gaya = StyleSheet.create({
  halaman: { backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  gambar: { width: '100%', height: '100%', objectFit: 'contain' },
});

/** `halaman` = [{ blob, rotasi, lebar, tinggi }] → Blob PDF. */
export async function buatPdf(halaman, { judul = 'Hasil Pindaian' } = {}) {
  const isi = [];
  for (const hl of halaman) {
    const blob = await blobTerputar(hl.blob, hl.rotasi);
    const miring = hl.rotasi % 180 !== 0;
    const lebar = miring ? hl.tinggi : hl.lebar;
    const tinggi = miring ? hl.lebar : hl.tinggi;
    isi.push({ src: await blobKeDataUrl(blob), mendatar: lebar > tinggi });
  }
  const doc = h(
    Document,
    { title: judul, creator: 'Imigrasi Super Web' },
    isi.map((x, i) =>
      h(
        Page,
        {
          key: i,
          size: 'A4',
          orientation: x.mendatar ? 'landscape' : 'portrait',
          style: gaya.halaman,
        },
        h(Image, { src: x.src, style: gaya.gambar }),
      ),
    ),
  );
  return pdf(doc).toBlob();
}
