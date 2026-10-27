/**
 * Cetak dokumen PDF langsung: render template ke blob lalu buka di tab baru
 * (penampil PDF browser menyediakan tombol cetak & unduh).
 */

import { createElement, Fragment } from 'react';
import { Document, Image, Page, StyleSheet, Text, pdf } from '@react-pdf/renderer';
import { MyPdfDocument } from '@/components/SuratPreview/SuratPreviewCanvas';
import { isiPlaceholder } from '@/components/SuratPreview/isiPlaceholder';
import { halamanDariBerkas } from './halamanBerkas';

const dokumenSurat = ({ surat, data, packItem }) =>
  createElement(MyPdfDocument, { surat, data: isiPlaceholder(surat, data), packItem });

/** Buka PDF hasil `buatDokumen()` (elemen <Document>, boleh lewat Promise) di tab baru. */
export async function bukaPdf(buatDokumen) {
  // Buka tab lebih dulu (masih dalam klik pengguna) supaya tidak diblokir pemblokir pop-up;
  // penyusunan dokumen (mis. mengambil scan unggahan) baru berjalan sesudahnya
  const win = window.open('', '_blank');
  try {
    const blob = await pdf(await buatDokumen()).toBlob();
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

// Halaman untuk berkas unggahan (scan) di dalam cetakan gabungan
const gayaBerkas = StyleSheet.create({
  halaman: { padding: 18, backgroundColor: '#ffffff' },
  gambar: { width: '100%', height: '100%', objectFit: 'contain' },
  gagal: { margin: 'auto', fontSize: 11, textAlign: 'center', color: '#555555' },
});

/** Halaman-halaman PDF untuk satu berkas unggahan; halaman pemberitahuan bila gagal diambil. */
async function halamanUnggahan(file, key) {
  try {
    const gambar = await halamanDariBerkas(file);
    return {
      gagal: false,
      halaman: gambar.map((src, i) =>
        createElement(
          Page,
          { key: `${key}-${i}`, size: 'A4', style: gayaBerkas.halaman },
          createElement(Image, { src, style: gayaBerkas.gambar }),
        ),
      ),
    };
  } catch (err) {
    console.error('halamanDariBerkas error:', err);
    const teks = `${file.name || 'Berkas unggahan'} tidak dapat digabung ke cetakan ini.\nBuka dan cetak dari tombol "Lihat" di Detail LPJ.\n\nPenyebab: ${err?.message || err}`;
    return {
      gagal: true,
      halaman: [
        createElement(
          Page,
          { key, size: 'A4', style: gayaBerkas.halaman },
          createElement(Text, { style: gayaBerkas.gagal }, teks),
        ),
      ],
    };
  }
}

/**
 * Susun beberapa dokumen menjadi SATU <Document> (halaman tiap dokumen berurutan). `daftar` =
 * hasil resolveDokumen berjenis 'pdf' (template) atau 'files' (berkas unggahan gambar/PDF, mis.
 * scan SP ber-TTE: tiap halaman jadi satu halaman A4).
 * @returns {Promise<{ dokumen, gagal: number }>} gagal = berkas unggahan yang tidak bisa digabung
 */
async function susunGabungan(daftar) {
  let gagal = 0;
  const bagian = [];
  for (const [i, dok] of daftar.entries()) {
    if (dok.kind === 'files') {
      for (const [j, file] of dok.files.entries()) {
        const h = await halamanUnggahan(file, `f${i}-${j}`);
        if (h.gagal) gagal++;
        bagian.push(...h.halaman);
      }
    } else {
      // MyPdfDocument = <Document> berisi halaman-halaman template; ambil halamannya saja
      bagian.push(
        createElement(
          Fragment,
          { key: i },
          MyPdfDocument({ ...dok, data: isiPlaceholder(dok.surat, dok.data) }).props.children,
        ),
      );
    }
  }
  return { dokumen: createElement(Document, null, ...bagian), gagal };
}

/**
 * Cetak beberapa dokumen sekaligus sebagai SATU PDF di tab baru (lihat susunGabungan).
 * @returns {Promise<number>} jumlah berkas unggahan yang gagal digabung
 */
export async function cetakGabungan(daftar) {
  let gagal = 0;
  await bukaPdf(async () => {
    const r = await susunGabungan(daftar);
    gagal = r.gagal;
    return r.dokumen;
  });
  return gagal;
}

/**
 * Cetak PDF (`blob`) lewat bingkai tersembunyi: dialog cetak browser muncul tanpa membuka tab baru.
 * Melempar galat bila browser tidak mengizinkan (pemanggil bisa membuka tab baru sebagai cadangan).
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

/**
 * Seperti cetakGabungan, tetapi mengembalikan PDF-nya (untuk ditampilkan di popup).
 * @returns {Promise<{ blob: Blob, gagal: number }>}
 */
export async function pdfGabungan(daftar) {
  const { dokumen, gagal } = await susunGabungan(daftar);
  return { blob: await pdf(dokumen).toBlob(), gagal };
}
