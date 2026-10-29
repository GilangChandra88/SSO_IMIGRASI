import { FaCheck, FaRegFileAlt, FaUpload } from 'react-icons/fa';
import { keDate } from '@/utils/nilai';
import { formatTanggalDate } from '@/modules/e-persuratan/lpj';

/** "Baru saja", "5 menit lalu", "2 jam lalu", "Kemarin, 09.15", atau tanggal. */
export function waktuRelatif(d) {
  if (!d || Number.isNaN(d.getTime())) return '';
  const menit = Math.floor((Date.now() - d.getTime()) / 60000);
  const jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  if (menit < 1) return 'Baru saja';
  if (menit < 60) return `${menit} menit lalu`;
  const kemarin = new Date();
  kemarin.setDate(kemarin.getDate() - 1);
  if (d.toDateString() === new Date().toDateString()) return `${Math.floor(menit / 60)} jam lalu`;
  if (d.toDateString() === kemarin.toDateString()) return `Kemarin, ${jam}`;
  return `${formatTanggalDate(d)}, ${jam}`;
}

export function ikonAktivitas(teks) {
  if (/unggah/i.test(teks)) return FaUpload;
  if (/selesai/i.test(teks)) return FaCheck;
  return FaRegFileAlt;
}

/** Berkas ringkas dengan aktivitas terakhir (ditulis Function dari riwayat), terbaru dulu. */
export const aktivitasTerbaru = (daftar, n) =>
  daftar
    .filter((p) => keDate(p.aktivitasTerakhir?.pada))
    .sort((a, b) => keDate(b.aktivitasTerakhir.pada) - keDate(a.aktivitasTerakhir.pada))
    .slice(0, n);
