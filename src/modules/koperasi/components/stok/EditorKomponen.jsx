import { FaPlus, FaTimes } from 'react-icons/fa';
import { K } from '../../ui/kelas';
import { rupiah } from '../../ui/format';
import { adalahResep } from '../../utils/barang';
import { BATAS } from '../../data/aturan';

/**
 * Komponen resep: barang yang stoknya berkurang setiap resep terjual. Bahan habis pakai (es, gula,
 * sedotan, cup) tidak dimasukkan; pembeliannya langsung dibebankan.
 */
export default function EditorKomponen({ komponen, onUbah, barang, petaBarang }) {
  const pilihan = barang.filter((b) => !adalahResep(b) && b.aktif);
  const ubah = (i, isi) => onUbah(komponen.map((k, n) => (n === i ? { ...k, ...isi } : k)));
  return (
    <div className="flex flex-col gap-2.5">
      <div>
        <span className={K.label}>Komponen</span>
        <span className={`${K.redup} block`}>
          Barang yang terpakai untuk satu porsi. Es, gula, sedotan, dan cup tidak perlu dimasukkan
          (bahan habis pakai).
        </span>
      </div>
      {komponen.map((k, i) => {
        const b = petaBarang.get(k.barangId);
        return (
          <div
            key={`${k.barangId}-${i}`}
            className={`${K.kotakBaris} grid gap-2 sm:grid-cols-[1fr_110px_auto] sm:items-end`}
          >
            <label>
              <span className={K.label}>Barang</span>
              <select
                className={K.masukan}
                value={k.barangId}
                onChange={(e) => ubah(i, { barangId: e.target.value })}
              >
                <option value="">Pilih barang…</option>
                {pilihan.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nama} ({x.satuan})
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={K.label}>Jumlah{b ? ` (${b.satuan})` : ''}</span>
              <input
                className={K.masukan}
                inputMode="numeric"
                value={k.jumlah || ''}
                onChange={(e) =>
                  ubah(i, {
                    jumlah: Math.min(1000, Number(e.target.value.replace(/[^0-9]/g, '')) || 0),
                  })
                }
              />
            </label>
            <button
              type="button"
              className={K.tombolKotak}
              aria-label="Hapus komponen"
              onClick={() => onUbah(komponen.filter((_, n) => n !== i))}
            >
              <FaTimes size={13} />
            </button>
            {b && (
              <span className={`${K.redup} sm:col-span-3`}>
                Harga pokok {rupiah(b.hargaPokok || 0)} per {b.satuan} · stok {b.stok}
              </span>
            )}
          </div>
        );
      })}
      {komponen.length < BATAS.komponen && (
        <button
          type="button"
          className={`${K.tombolKedua} self-start`}
          onClick={() => onUbah([...komponen, { barangId: '', jumlah: 1 }])}
        >
          <FaPlus size={11} /> Tambah komponen
        </button>
      )}
    </div>
  );
}
