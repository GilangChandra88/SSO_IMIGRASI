import { useMemo, useState } from 'react';
import { FaPen, FaPlus } from 'react-icons/fa';
import { K } from '../../ui/kelas';
import FormKategori from './FormKategori';

export default function KategoriBarang({ kategori, barang, memuat }) {
  // null = tertutup; {} = kategori baru; dokumen = ubah
  const [form, setForm] = useState(null);
  const jumlah = useMemo(() => {
    const peta = new Map();
    barang.forEach((b) => peta.set(b.kategoriId, (peta.get(b.kategoriId) ?? 0) + 1));
    return peta;
  }, [barang]);

  let isi;
  if (memuat) isi = <p className={K.kosong}>Memuat…</p>;
  else if (!kategori.length) isi = <p className={K.kosong}>Belum ada kategori.</p>;
  else {
    isi = (
      <ul className="flex flex-col gap-2.5">
        {kategori.map((k) => (
          <li key={k.id} className={`${K.kartu} flex items-center gap-3`}>
            <div className={`flex-1 min-w-0 ${k.aktif ? '' : 'opacity-60'}`}>
              <span className={`${K.judulBaris} block truncate`}>{k.nama}</span>
              <span className={`${K.redup} block`}>{jumlah.get(k.id) ?? 0} barang</span>
              {!k.aktif && <span className={K.lencana}>Nonaktif</span>}
            </div>
            <button
              type="button"
              className={K.tombolIkon}
              aria-label={`Ubah ${k.nama}`}
              onClick={() => setForm(k)}
            >
              <FaPen size={13} />
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <>
      <button type="button" className={`${K.tombolUtama} mb-3`} onClick={() => setForm({})}>
        <FaPlus size={12} /> Tambah Kategori
      </button>
      {isi}
      {form && (
        <FormKategori data={form.id ? form : null} semua={kategori} onTutup={() => setForm(null)} />
      )}
    </>
  );
}
