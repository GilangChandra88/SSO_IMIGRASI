import { useState } from 'react';
import { FaBoxes, FaPlus } from 'react-icons/fa';
import { K } from '../../ui/kelas';
import { rupiah } from '../../ui/format';
import FormAkun from '../akun/FormAkun';

const KAS_BARU = { kelompok: 'asetLancar', kas: true, kode: '1001' };

/** Rekening kas & bank beserta saldonya, ditambah nilai Persediaan (bukan uang). */
export default function DaftarKas({ kas, persediaan, memuat }) {
  const [tambah, setTambah] = useState(false);
  const total = kas.reduce((n, k) => n + k.saldo, 0);
  return (
    <>
      <button type="button" className={`${K.tombolUtama} mb-3`} onClick={() => setTambah(true)}>
        <FaPlus size={12} /> Tambah Kas/Bank
      </button>
      {memuat ? (
        <p className={K.kosong}>Memuat…</p>
      ) : (
        <>
          <ul className="flex flex-col gap-2.5">
            {kas.map((k) => (
              <li key={k.id} className={`${K.kartu} flex items-center justify-between gap-3`}>
                <span className="min-w-0">
                  <span className={`${K.judulBaris} block truncate`}>{k.nama}</span>
                  <span className={K.redup}>{k.kode}</span>
                </span>
                <span className={K.nominal}>{rupiah(k.saldo)}</span>
              </li>
            ))}
          </ul>
          <div className={`${K.barisTotal} mt-3 px-1`}>
            <span className={K.judulBaris}>Total kas & bank</span>
            <span className={K.nominal}>{rupiah(total)}</span>
          </div>
          {persediaan && (
            <div className={`${K.kartu} flex items-center gap-3 mt-4`}>
              <span className={K.ikonBulat} aria-hidden="true">
                <FaBoxes size={14} />
              </span>
              <span className="flex-1 min-w-0">
                <span className={`${K.judulBaris} block`}>{persediaan.nama}</span>
                <span className={K.redup}>
                  Nilai barang di kantin (bukan uang, tidak bisa ditransfer)
                </span>
              </span>
              <span className={K.nominal}>{rupiah(persediaan.saldo)}</span>
            </div>
          )}
        </>
      )}
      {tambah && <FormAkun preset={KAS_BARU} onTutup={() => setTambah(false)} />}
    </>
  );
}
