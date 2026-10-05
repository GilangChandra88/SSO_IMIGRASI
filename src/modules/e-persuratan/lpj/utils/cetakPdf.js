/**
 * Cetak dokumen PDF langsung: render template ke blob lalu buka di tab baru
 * (penampil PDF browser menyediakan tombol cetak & unduh).
 */

import { createElement } from 'react';
import { pdf } from '@react-pdf/renderer';
import { MyPdfDocument } from '@/components/SuratPreview/SuratPreviewCanvas';
import { isiPlaceholder } from '@/components/SuratPreview/isiPlaceholder';

export async function cetakPdf({ surat, data, packItem }) {
  // Buka tab lebih dulu (masih dalam klik pengguna) supaya tidak diblokir pemblokir pop-up
  const win = window.open('', '_blank');
  try {
    const doc = createElement(MyPdfDocument, {
      surat,
      data: isiPlaceholder(surat, data),
      packItem,
    });
    const blob = await pdf(doc).toBlob();
    const url = URL.createObjectURL(blob);
    if (win) win.location.href = url;
    else window.open(url, '_blank');
  } catch (err) {
    if (win) win.close();
    throw err;
  }
}
