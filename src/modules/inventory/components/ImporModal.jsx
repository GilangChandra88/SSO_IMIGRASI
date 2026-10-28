import { useRef, useState } from 'react';
import { FaFileCsv, FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { FONT, T } from '@/utils/uiTokens';
import { K } from '../ui/kelas';
import { useEscape } from '../hooks/useEscape';
import { CONTOH_IMPOR, KOLOM_IMPOR, periksaImpor } from '../utils/csvImpor';
import { simpanBerkas } from '@/utils/xlsx';

/** Popup Impor CSV di Stok Barang: pilih berkas, periksa isinya, lalu tambahkan barang yang valid. */
export default function ImporModal({ kategoriList, barang, onImpor, onTutup }) {
  const [berkas, setBerkas] = useState('');
  const [hasil, setHasil] = useState(null);
  const [sibuk, setSibuk] = useState(false);
  const inputRef = useRef(null);
  useEscape(onTutup);

  async function pilihBerkas(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    setBerkas(f.name);
    try {
      setHasil(periksaImpor(await f.text(), kategoriList, barang));
    } catch {
      setHasil({ galatUmum: 'Berkas tidak dapat dibaca.', valid: [], galat: [], total: 0 });
    }
  }

  function unduhTemplat() {
    const blob = new Blob([`FEFF${KOLOM_IMPOR}\r\n${CONTOH_IMPOR}\r\n`], {
      type: 'text/csv;charset=utf-8',
    });
    simpanBerkas(blob, 'Templat Impor Barang.csv');
  }

  const jumlahValid = hasil ? hasil.valid.length : 0;

  return (
    <Modal onClose={onTutup} labelledBy="impor-judul" widthClass="max-w-[560px]" lembar>
      <div className={K.popupIsi}>
        <div className="flex items-center justify-between gap-3">
          <h2 className={K.popupJudul} id="impor-judul">
            Impor CSV
          </h2>
          <button className={K.ikonBtn} type="button" aria-label="Tutup" onClick={onTutup}>
            <FaTimes size={15} />
          </button>
        </div>
        <p className={`m-0 text-[13.5px] leading-[1.5] ${T.inkMuted}`}>
          Tambahkan banyak barang sekaligus dari berkas CSV. Baris pertama berisi judul kolom:{' '}
          <code
            className={`${FONT.mono} text-xs px-1.5 py-0.5 rounded-md break-all ${T.surface2} ${T.ink}`}
          >
            {KOLOM_IMPOR}
          </code>
          . Kode kategori dan kode barang boleh dikosongkan; pemisah boleh koma atau titik koma.{' '}
          <button
            className={`${K.tautan} text-[13.5px] whitespace-nowrap`}
            type="button"
            onClick={unduhTemplat}
          >
            Unduh templat CSV
          </button>
        </p>
        <div>
          <input
            ref={inputRef}
            className="sr-only"
            id="impor-berkas"
            type="file"
            accept=".csv,text/csv"
            onChange={pilihBerkas}
          />
          <button className={K.btn} type="button" onClick={() => inputRef.current?.click()}>
            <FaFileCsv size={14} />
            Pilih berkas CSV
          </button>
        </div>
        {berkas && (
          <div className={`text-[13.5px] break-all ${T.inkMuted}`}>
            Berkas: <strong className={T.ink}>{berkas}</strong>
          </div>
        )}
        {hasil && hasil.galatUmum && (
          <div className={K.galat} role="alert">
            {hasil.galatUmum}
          </div>
        )}
        {hasil && !hasil.galatUmum && (
          <>
            <div className={jumlahValid > 0 ? K.sukses : K.galat} role="status">
              {jumlahValid} dari {hasil.total} baris siap diimpor
              {hasil.galat.length ? `, ${hasil.galat.length} baris bermasalah dilewati` : ''}.
            </div>
            {hasil.galat.length > 0 && (
              <ul className="m-0 pl-5 text-[13px] flex flex-col gap-1 list-disc text-[#A62D2D] dark:text-[#F19191]">
                {hasil.galat.slice(0, 6).map((g) => (
                  <li key={g.nomor}>
                    Baris {g.nomor}: {g.teks}
                  </li>
                ))}
                {hasil.galat.length > 6 && <li>dan {hasil.galat.length - 6} baris lain.</li>}
              </ul>
            )}
          </>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            className={K.btnUtama}
            type="button"
            disabled={jumlahValid === 0 || sibuk}
            onClick={async () => {
              setSibuk(true);
              const berhasil = await onImpor(hasil.valid);
              if (!berhasil) setSibuk(false);
            }}
          >
            {sibuk ? 'Mengimpor…' : jumlahValid > 0 ? `Impor ${jumlahValid} barang` : 'Impor'}
          </button>
          <button className={K.btn} type="button" onClick={onTutup}>
            Batal
          </button>
        </div>
      </div>
    </Modal>
  );
}
