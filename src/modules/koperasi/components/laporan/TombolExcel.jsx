import { FaFileExcel } from 'react-icons/fa';
import { buatXlsx, simpanBerkas } from '@/utils/xlsx';
import { K } from '../../ui/kelas';

/** Unduh lembar Excel. buatLembar() → [{ nama, lebar, baris }] (lihat @/utils/xlsx). */
export default function TombolExcel({ namaBerkas, buatLembar, disabled }) {
  return (
    <button
      type="button"
      className={K.tombolKedua}
      disabled={disabled}
      onClick={() => simpanBerkas(buatXlsx(buatLembar()), namaBerkas)}
    >
      <FaFileExcel size={13} aria-hidden="true" /> Unduh Excel
    </button>
  );
}
