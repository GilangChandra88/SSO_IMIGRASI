import { FaPlus, FaTimes } from 'react-icons/fa';
import { PANJANG } from '@/utils/batas';
import { K } from '../../ui/kelas';
import { idKemasan } from '../../utils/barang';
import MasukanRupiah from '../MasukanRupiah';
import MasukanBarkode from './MasukanBarkode';
import { BATAS } from '../../data/aturan';

/**
 * Kemasan jual lain (mis. bungkus = 16 batang). Stok tetap satu angka dalam satuan dasar;
 * menjual 1 kemasan mengurangi stok sebanyak `isi`.
 */
export default function EditorKemasan({ kemasan, onUbah, satuanDasar, galatBarkode }) {
  const ubah = (id, isi) => onUbah(kemasan.map((k) => (k.id === id ? { ...k, ...isi } : k)));
  return (
    <div className="flex flex-col gap-2.5">
      <div>
        <span className={K.label}>Kemasan lain (boleh kosong)</span>
        <span className={`${K.redup} block`}>
          Mis. bungkus atau dus. Stok tetap dihitung per {satuanDasar || 'satuan dasar'}.
        </span>
      </div>
      {kemasan.map((k) => (
        <div key={k.id} className={`${K.kotakBaris} grid gap-2 sm:grid-cols-2`}>
          <label>
            <span className={K.label}>Nama kemasan</span>
            <input
              className={K.masukan}
              maxLength={PANJANG.satuanBarang}
              placeholder="Mis. bungkus"
              value={k.nama}
              onChange={(e) => ubah(k.id, { nama: e.target.value })}
            />
          </label>
          <label>
            <span className={K.label}>Isi ({satuanDasar || 'satuan dasar'})</span>
            <input
              className={K.masukan}
              inputMode="numeric"
              placeholder="Mis. 16"
              value={k.isi || ''}
              onChange={(e) =>
                ubah(k.id, {
                  isi: Math.min(10000, Number(e.target.value.replace(/[^0-9]/g, '')) || 0),
                })
              }
            />
          </label>
          <label>
            <span className={K.label}>Harga jual per kemasan</span>
            <MasukanRupiah nilai={k.hargaJual} onUbah={(v) => ubah(k.id, { hargaJual: v })} />
          </label>
          <MasukanBarkode
            label={`Barkode ${k.nama || 'kemasan'}`}
            nilai={k.barkode}
            onUbah={(v) => ubah(k.id, { barkode: v })}
            galat={galatBarkode?.[k.id]}
          />
          <button
            type="button"
            className={`${K.tombolKedua} sm:col-span-2`}
            onClick={() => onUbah(kemasan.filter((x) => x.id !== k.id))}
          >
            <FaTimes size={11} /> Hapus kemasan
          </button>
        </div>
      ))}
      {kemasan.length < BATAS.kemasan && (
        <button
          type="button"
          className={`${K.tombolKedua} self-start`}
          onClick={() =>
            onUbah([...kemasan, { id: idKemasan(), nama: '', isi: 0, hargaJual: 0, barkode: '' }])
          }
        >
          <FaPlus size={11} /> Tambah kemasan
        </button>
      )}
    </div>
  );
}
