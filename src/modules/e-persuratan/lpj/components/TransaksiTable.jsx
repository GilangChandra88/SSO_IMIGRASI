import React from 'react';
import { FaRegTrashAlt } from 'react-icons/fa';
import { formatNum } from '../utils/lpjLogic';
import { BTN, FORM, T } from '@/utils/uiTokens';

const GRID = 'grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_130px_36px] gap-2';

/**
 * Baris Detail Transaksi: Pelaksana · Item (dari Akun MAK) · Jumlah.
 * @param {{ rows, onChange, pelaksana, items, akunKode, resetJumlahOnItem? }} props
 */
export default function TransaksiTable({
  rows,
  onChange,
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
    <div className="overflow-x-auto">
      <div className="min-w-[520px]">
        <div className={`${GRID} py-2 border-b mb-2 ${T.border}`}>
          {['Pelaksana', `Item (Akun ${akunKode || '—'})`, 'Jumlah (Rp)', ''].map((h, i) => (
            <div key={i} className={`text-[11px] font-bold ${T.inkMuted}`}>
              {h}
            </div>
          ))}
        </div>
        {rows.map((tx, i) => (
          <div key={i} className={`${GRID} mb-2`}>
            <select
              aria-label={`Pelaksana baris ${i + 1}`}
              value={tx.pelaksanaId}
              onChange={(e) => updateRow(i, { pelaksanaId: e.target.value })}
              className={`${FORM.select} ${FORM.borderOk} !text-[12.5px]`}
            >
              <option value="">— Pilih —</option>
              {pelaksana.map((p) => (
                <option key={p.id} value={p.id}>
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
                  itemKode: it?.kode || '',
                  itemName: it?.name || '',
                  ...(resetJumlahOnItem ? { jumlah: '' } : {}),
                });
              }}
              className={`${FORM.select} ${FORM.borderOk} !text-[12.5px]`}
            >
              <option value="">{akunKode ? '— Pilih Item —' : '— Pilih Akun dulu —'}</option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.kode ? `${it.kode} — ${it.name}` : it.name}
                </option>
              ))}
            </select>
            <input
              aria-label={`Jumlah baris ${i + 1}`}
              inputMode="numeric"
              value={tx.jumlah}
              placeholder="0"
              onChange={(e) => updateRow(i, { jumlah: formatNum(e.target.value) })}
              className={`${FORM.input} ${FORM.borderOk} !text-[12.5px]`}
            />
            <button
              type="button"
              aria-label={`Hapus baris ${i + 1}`}
              disabled={rows.length <= 1}
              onClick={() => onChange(rows.filter((_, j) => j !== i))}
              className={BTN.trash}
            >
              <FaRegTrashAlt size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
