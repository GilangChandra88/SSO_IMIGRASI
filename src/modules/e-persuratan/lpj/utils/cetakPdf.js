/**
 * Cetak dokumen PDF langsung: render template ke blob lalu buka di tab baru
 * (penampil PDF browser menyediakan tombol cetak & unduh).
 */

import { createElement, Fragment } from 'react';
import { Document, pdf } from '@react-pdf/renderer';
import { MyPdfDocument } from '@/components/SuratPreview/SuratPreviewCanvas';
import { isiPlaceholder } from '@/components/SuratPreview/isiPlaceholder';

const dokumenSurat = ({ surat, data, packItem }) =>
  createElement(MyPdfDocument, { surat, data: isiPlaceholder(surat, data), packItem });

/** Buka PDF hasil `buatDokumen()` (elemen <Document>) di tab baru. */
export async function bukaPdf(buatDokumen) {
  // Buka tab lebih dulu (masih dalam klik pengguna) supaya tidak diblokir pemblokir pop-up
  const win = window.open('', '_blank');
  try {
    const blob = await pdf(buatDokumen()).toBlob();
    const url = URL.createObjectURL(blob);
    if (win) win.location.href = url;
    else window.open(url, '_blank');
  } catch (err) {
    if (win) win.close();
    throw err;
  }
}

/** Unduh PDF hasil `buatDokumen()` dengan nama `namaBerkas`. */
export async function unduhPdf(buatDokumen, namaBerkas) {
  const blob = await pdf(buatDokumen()).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = namaBerkas;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export const cetakPdf = (dok) => bukaPdf(() => dokumenSurat(dok));

/**
 * Cetak beberapa dokumen sekaligus sebagai SATU PDF (halaman tiap template berurutan),
 * supaya tidak membuka banyak tab. `daftar` = hasil resolveDokumen berjenis 'pdf'.
 */
export const cetakGabungan = (daftar) =>
  bukaPdf(() =>
    createElement(
      Document,
      null,
      ...daftar.map((dok, i) =>
        // MyPdfDocument = <Document> berisi halaman-halaman template; ambil halamannya saja
        createElement(
          Fragment,
          { key: i },
          MyPdfDocument({ ...dok, data: isiPlaceholder(dok.surat, dok.data) }).props.children,
        ),
      ),
    ),
  );
