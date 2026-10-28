import { useState } from 'react';
import { FaFileExcel, FaFilePdf } from 'react-icons/fa';
import { pdf } from '@react-pdf/renderer';
import { showToast } from '@/utils/toastStore';
import { simpanBerkas } from '@/utils/xlsx';
import { unduhExcel } from '../../utils/eksporKehadiran';
import { K } from '../../ui/kelas';
import TabelPdf from './TabelPdf';

const waktuCetak = () =>
  new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Makassar',
  }).format(new Date());

/** Tombol ekspor Excel & PDF. `buatTabel` dipanggil saat tombol ditekan (data terbaru). */
export default function TombolEkspor({ buatTabel, nonaktif }) {
  const [proses, setProses] = useState('');

  async function ekspor(jenis) {
    setProses(jenis);
    try {
      const tabel = buatTabel();
      if (jenis === 'xlsx') unduhExcel(tabel);
      else {
        const blob = await pdf(
          <TabelPdf tabel={tabel} dicetak={`${waktuCetak()} WITA`} />,
        ).toBlob();
        simpanBerkas(blob, `${tabel.nama}.pdf`);
      }
      showToast(`Berkas ${jenis === 'xlsx' ? 'Excel' : 'PDF'} siap.`);
    } catch {
      showToast('Ekspor gagal. Coba lagi.', 'error');
    } finally {
      setProses('');
    }
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => ekspor('xlsx')}
        disabled={nonaktif || !!proses}
        className={K.tombolKecil}
      >
        <FaFileExcel className={K.teksOk} /> {proses === 'xlsx' ? 'Menyiapkan…' : 'Excel'}
      </button>
      <button
        type="button"
        onClick={() => ekspor('pdf')}
        disabled={nonaktif || !!proses}
        className={K.tombolKecil}
      >
        <FaFilePdf className={K.teksBahaya} /> {proses === 'pdf' ? 'Menyiapkan…' : 'PDF'}
      </button>
    </div>
  );
}
