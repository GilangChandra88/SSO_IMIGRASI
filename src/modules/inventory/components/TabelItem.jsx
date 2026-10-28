import { useEffect, useRef } from 'react';
import { FaPlus, FaTrashAlt } from 'react-icons/fa';
import { T } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';
import { K } from '../ui/kelas';
import { PilihCari } from './Pilihan';

// Di HP (≤ 820 px) tabel menjadi satu kartu per barang: pilihan + tombol hapus di atas, jumlah & stok di bawah
const TH = `${K.th} max-[820px]:hidden`;
const TD = `px-3 py-2 border-b align-middle ${T.border} max-[820px]:p-0 max-[820px]:border-0 max-[820px]:min-w-0`;
const TR = `max-[820px]:grid max-[820px]:grid-cols-[minmax(0,1fr)_auto] max-[820px]:gap-2.5 max-[820px]:p-3 max-[820px]:mb-2.5 max-[820px]:items-center max-[820px]:rounded-xl max-[820px]:border ${T.border} max-[820px]:bg-[#F3F5F8] dark:max-[820px]:bg-[#16243A] [&:last-child>td]:border-b-0`;

/**
 * Tabel "Detail Barang" di form transaksi (item-tbl purwarupa). baris: [{ kunci, barangId, jumlah, b, opsi, stok }]
 * stok = isi kolom ketiga (stok setelah / sisa). bisaTambah: tampilkan tombol Tambah Barang dan hapus baris.
 */
export default function TabelItem({
  id,
  judulStok,
  baris,
  fokusKunci,
  bisaTambah,
  onUbah,
  onTambah,
  onHapus,
}) {
  const akhirRef = useRef(null);

  // Baris baru: gulir ke baris itu (kolom pilihan barang sudah fokus lewat autoFocus)
  useEffect(() => {
    if (fokusKunci && akhirRef.current)
      akhirRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [fokusKunci, baris.length]);

  return (
    <div className="flex flex-col gap-3">
      <div className={`border rounded-[10px] ${T.border} max-[820px]:border-0`}>
        <table className="w-full border-separate border-spacing-0 table-fixed text-sm max-[820px]:block">
          <colgroup className="max-[820px]:hidden">
            <col className="w-[52px]" />
            <col />
            <col className="w-[210px]" />
            <col className="w-[170px]" />
            {bisaTambah && <col className="w-[52px]" />}
          </colgroup>
          <thead className="max-[820px]:hidden">
            <tr>
              <th className={`${TH} rounded-tl-[10px]`}>No</th>
              <th className={TH}>Barang (Kode SAKTI dan nama)</th>
              <th className={TH}>Jumlah</th>
              <th className={`${TH} ${bisaTambah ? '' : 'rounded-tr-[10px]'}`}>{judulStok}</th>
              {bisaTambah && <th className={`${TH} rounded-tr-[10px]`} aria-label="Aksi" />}
            </tr>
          </thead>
          <tbody className="max-[820px]:block">
            {baris.map((r, n) => (
              <tr
                key={r.kunci}
                ref={n === baris.length - 1 ? akhirRef : undefined}
                className={`${TR} ${r.kunci === fokusKunci ? ANIM.muncul : ''}`}
              >
                <td className={`${TD} ${T.inkMuted} tabular-nums max-[820px]:hidden`}>{n + 1}</td>
                <td className={`${TD} max-[820px]:col-start-1 max-[820px]:row-start-1`}>
                  <PilihCari
                    id={`${id}-barang-${r.kunci}`}
                    autoFocus={r.kunci === fokusKunci}
                    ariaLabel={`Barang ${n + 1}`}
                    placeholder="Cari Kode SAKTI atau nama barang..."
                    nilai={r.barangId}
                    opsi={r.opsi}
                    onPilih={(v) => onUbah(r.kunci, { barangId: v })}
                  />
                </td>
                <td className={`${TD} max-[820px]:col-span-2`}>
                  <div
                    className={`flex items-stretch h-10 rounded-lg border overflow-hidden ${T.borderStrong} ${T.surface} focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#2A78D6]`}
                  >
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="0"
                      aria-label={`Jumlah barang ${n + 1}`}
                      value={r.jumlah}
                      onChange={(e) => onUbah(r.kunci, { jumlah: e.target.value })}
                      className={`flex-1 w-0 min-w-0 border-0 px-3 bg-transparent outline-none text-base sm:text-sm ${T.ink} ${T.placeholder}`}
                    />
                    <span
                      className={`flex items-center pr-3.5 text-sm font-semibold ${T.inkMuted}`}
                      aria-label="Satuan"
                    >
                      {r.b ? r.b.satuan : '-'}
                    </span>
                  </div>
                </td>
                <td className={`${TD} max-[820px]:col-span-2`} aria-live="polite">
                  {r.stok}
                </td>
                {bisaTambah && (
                  <td
                    className={`${TD} text-right max-[820px]:col-start-2 max-[820px]:row-start-1`}
                  >
                    {baris.length > 1 && (
                      <button
                        className={`${K.ikonBtn} ${K.ikonHapus}`}
                        type="button"
                        aria-label={`Hapus baris barang ${n + 1}`}
                        title="Hapus baris"
                        onClick={(e) => onHapus(r.kunci, e.currentTarget.closest('tr'))}
                      >
                        <FaTrashAlt size={14} />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3">
        {bisaTambah ? (
          <button className={K.btn} type="button" onClick={onTambah}>
            <FaPlus size={12} />
            Tambah Barang
          </button>
        ) : (
          <span />
        )}
        <span className={`text-[13px] ${T.inkMuted}`}>{baris.length} barang</span>
      </div>
    </div>
  );
}
