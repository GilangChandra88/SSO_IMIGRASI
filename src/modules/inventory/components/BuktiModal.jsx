import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { FaPen, FaPrint, FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { showToast } from '@/utils/toastStore';
import { T } from '@/utils/uiTokens';
import { K } from '../ui/kelas';
import { useEscape } from '../hooks/useEscape';
import { useInventori } from '../hooks/useInventori';
import { formatTanggalPanjang, idTransaksi, totalBarang } from '../utils/stokLogic';
import BuktiPdf from './BuktiPdf';

/** Bukti serah terima barang keluar. Cetak = PDF di tab baru (penampil PDF punya tombol cetak). */
export default function BuktiModal({ transaksi, onTutup, onUbah }) {
  const { semuaBarang: barang } = useInventori();
  const [mencetak, setMencetak] = useState(false);
  useEscape(onTutup);

  async function cetak() {
    // Buka tab lebih dulu (masih dalam klik pengguna) agar tidak diblokir pemblokir pop-up
    const win = window.open('', '_blank');
    setMencetak(true);
    try {
      const blob = await pdf(<BuktiPdf transaksi={transaksi} barang={barang} />).toBlob();
      const url = URL.createObjectURL(blob);
      if (win) win.location.href = url;
      else window.open(url, '_blank');
    } catch {
      if (win) win.close();
      showToast('Bukti gagal dicetak.', 'error');
    } finally {
      setMencetak(false);
    }
  }

  return (
    <Modal onClose={onTutup} labelledBy="bukti-judul" widthClass="max-w-[640px]" lembar tinggiTetap>
      <div className={K.popupIsi}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className={K.popupJudul} id="bukti-judul">
              Bukti Serah Terima Barang
            </h2>
            <span className={K.subKartu}>
              Nomor transaksi {idTransaksi('keluar', transaksi.nomor)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {onUbah && (
              <button
                className={K.ikonBtn}
                type="button"
                aria-label="Ubah transaksi"
                title="Ubah transaksi"
                onClick={onUbah}
              >
                <FaPen size={14} />
              </button>
            )}
            <button className={K.ikonBtn} type="button" aria-label="Tutup" onClick={onTutup}>
              <FaTimes size={15} />
            </button>
          </div>
        </div>

        <dl className="grid grid-cols-[120px_1fr] sm:grid-cols-[140px_1fr] gap-x-3 gap-y-1.5 text-sm m-0">
          <dt className={T.inkMuted}>Pengambil</dt>
          <dd className="m-0 font-semibold">{transaksi.seksi || '-'}</dd>
          <dt className={T.inkMuted}>Tanggal ambil</dt>
          <dd className="m-0 font-semibold">{formatTanggalPanjang(transaksi.tanggal)}</dd>
          {transaksi.pegawai && (
            <>
              <dt className={T.inkMuted}>Pegawai pengambil</dt>
              <dd className="m-0 font-semibold">{transaksi.pegawai}</dd>
            </>
          )}
        </dl>

        <div className={`${K.tabelWrap} border rounded-[10px] ${T.border}`}>
          <table className={`${K.tabel} max-[820px]:text-[13px]`}>
            <thead>
              <tr>
                <th className={`${K.th} max-[820px]:px-2`}>Kode SAKTI</th>
                <th className={`${K.th} max-[820px]:px-2`}>Nama Barang</th>
                <th className={`${K.th} text-right max-[820px]:px-2`}>Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {transaksi.items.map((i) => {
                const b = barang.find((x) => x.id === i.barangId);
                return (
                  <tr key={i.barangId} className={K.trSorot}>
                    <td
                      className={`${K.td} ${K.mono} whitespace-nowrap max-[820px]:px-2 max-[820px]:text-xs`}
                    >
                      {b?.idSakti || '-'}
                    </td>
                    <td className={`${K.td} max-[820px]:px-2`}>
                      {b?.nama || '(barang sudah dihapus)'}
                    </td>
                    <td
                      className={`${K.td} text-right tabular-nums whitespace-nowrap max-[820px]:px-2`}
                    >
                      {i.jumlah} {b?.satuan || ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-baseline gap-2.5">
          <span className={T.inkMuted}>Total barang</span>
          <span className="text-2xl font-bold tabular-nums text-[#0f2040] dark:text-[#7DB6F3]">
            {totalBarang(transaksi.items)}
          </span>
        </div>

        <div className="flex justify-between gap-3 sm:gap-6 pt-2 text-[13px]">
          {[
            ['Pengambil', transaksi.pegawai || transaksi.seksi],
            ['Pengelola Persediaan', ''],
          ].map(([peran, nama]) => (
            <div key={peran} className="flex-1 text-center">
              {peran}
              <div className={`mt-14 pt-1 border-t border-current min-h-6 font-semibold`}>
                {nama}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <button className={K.btnUtama} type="button" disabled={mencetak} onClick={cetak}>
            <FaPrint size={13} />
            {mencetak ? 'Menyiapkan…' : 'Cetak'}
          </button>
          <button className={K.btn} type="button" onClick={onTutup}>
            Tutup
          </button>
        </div>
      </div>
    </Modal>
  );
}
