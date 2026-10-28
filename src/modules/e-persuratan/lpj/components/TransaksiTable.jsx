import React from 'react';
import { FaPlus, FaRegTrashAlt } from 'react-icons/fa';
import { keRupiah } from '@/utils/nilai';
import { formatNum } from '../utils/lpjLogic';
import { BTN, FORM, T } from '@/utils/uiTokens';
import { ANIM, hapusBaris } from '@/utils/animasi';

const GRID = 'grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_130px_36px] gap-2';
const TAMBAH = `w-full flex items-center justify-center gap-1.5 py-2.5 rounded-[9px] border border-dashed text-[12.5px] font-semibold ${T.borderStrong} ${T.ink2} ${T.hoverSurface2} hover:border-[#0f2040] hover:text-[#0f2040] dark:hover:border-[#7DB6F3] dark:hover:text-[#7DB6F3] ${ANIM.tekan}`;
const MAKS_JUMLAH = 1e12; // sama dengan batas Function selesaikanSpby

/**
 * Baris Detail Transaksi: Pelaksana · Item (dari Akun MAK) · Jumlah.
 * Baris = Transaksi skema (§3): { barisId, pelaksanaId, itemNodeId, jumlah: int,
 * salinan: { itemKode, itemNama } }. Jumlah disimpan sebagai rupiah bulat, tampil berformat.
 * Tombol "Tambah Transaksi" selebar tabel ada tepat di bawah baris terakhir (`onTambah`).
 * @param {{ rows, onChange, onTambah, pelaksana, items, akunKode, resetJumlahOnItem? }} props
 *   pelaksana = Orang[]; items = node Item MAK aktif di bawah Akun terpilih
 */
export default function TransaksiTable({
  rows,
  onChange,
  onTambah,
  pelaksana,
  items,
  akunKode,
  resetJumlahOnItem,
}) {
  const disItem = !akunKode || items.length === 0;

  function updateRow(i, patch) {
    const next = rows.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }

  return (
    <>
      <div className="overflow-x-auto overflow-y-hidden">
        <div className="min-w-[520px]">
          <div className={`${GRID} py-2 border-b mb-2 ${T.border}`}>
            {['Pelaksana', `Item (Akun ${akunKode || '—'})`, 'Jumlah (Rp)', ''].map((h, i) => (
              <div key={i} className={`text-[11px] font-bold ${T.inkMuted}`}>
                {h}
              </div>
            ))}
          </div>
          {rows.map((tx, i) => (
            <div key={tx.barisId || i} className={`${GRID} mb-2 ${ANIM.muncul}`}>
              <select
                aria-label={`Pelaksana baris ${i + 1}`}
                value={tx.pelaksanaId}
                onChange={(e) => updateRow(i, { pelaksanaId: e.target.value })}
                className={`${FORM.select} ${FORM.borderOk} !text-[12.5px]`}
              >
                <option value="">— Pilih —</option>
                {pelaksana.map((p) => (
                  <option key={p.pegawaiId} value={p.pegawaiId}>
                    {p.nama}
                  </option>
                ))}
              </select>
              <select
                aria-label={`Item baris ${i + 1}`}
                value={tx.itemNodeId}
                disabled={disItem}
                onChange={(e) => {
                  const it = items.find((x) => x.id === e.target.value);
                  updateRow(i, {
                    itemNodeId: it?.id || '',
                    salinan: { itemKode: it?.kode || '', itemNama: it?.nama || '' },
                    ...(resetJumlahOnItem ? { jumlah: 0 } : {}),
                  });
                }}
                className={`${FORM.select} ${FORM.borderOk} !text-[12.5px]`}
              >
                <option value="">{akunKode ? '— Pilih Item —' : '— Pilih Akun dulu —'}</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.kode ? `${it.kode} — ${it.nama}` : it.nama}
                  </option>
                ))}
              </select>
              <input
                aria-label={`Jumlah baris ${i + 1}`}
                inputMode="numeric"
                value={tx.jumlah ? formatNum(tx.jumlah) : ''}
                placeholder="0"
                onChange={(e) =>
                  updateRow(i, { jumlah: Math.min(keRupiah(e.target.value), MAKS_JUMLAH) })
                }
                className={`${FORM.input} ${FORM.borderOk} !text-[12.5px]`}
              />
              <button
                type="button"
                aria-label={`Hapus baris ${i + 1}`}
                disabled={rows.length <= 1}
                onClick={(e) =>
                  hapusBaris(e.currentTarget.parentElement, () =>
                    onChange(rows.filter((_, j) => j !== i)),
                  )
                }
                className={BTN.trash}
              >
                <FaRegTrashAlt size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
      <button type="button" onClick={onTambah} className={TAMBAH}>
        <FaPlus size={11} /> Tambah Transaksi
      </button>
    </>
  );
}
