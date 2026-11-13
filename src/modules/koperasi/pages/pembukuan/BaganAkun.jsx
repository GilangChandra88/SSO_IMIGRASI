import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaPen, FaPlus } from 'react-icons/fa';
import { K } from '../../ui/kelas';
import { useBaganAkun } from '../../hooks/useBaganAkun';
import FormAkun from '../../components/akun/FormAkun';

const CATATAN = {
  pendapatan: 'Akun penjualan per kategori barang (31xx) menyusul bersama Kategori Barang.',
  hpp: 'Akun HPP per kategori barang (35xx) menyusul bersama Kategori Barang.',
};

export default function BaganAkun() {
  const { perKelompok, memuat } = useBaganAkun();
  // null = tertutup; {} = akun baru; dokumen = ubah
  const [form, setForm] = useState(null);

  return (
    <div className={K.latar}>
      <div className={K.halaman}>
        <Link to="/koperasi/pembukuan" className={K.kembali}>
          <FaArrowLeft size={11} aria-hidden="true" /> Pembukuan
        </Link>
        <h1 className={K.h1}>Bagan Akun</h1>
        <p className={K.sub}>Kode mengikuti buku koperasi. Ketuk akun untuk mengubah namanya.</p>
        <button
          type="button"
          className={`${K.tombolUtama} mt-4 mb-4`}
          disabled={memuat}
          onClick={() => setForm({})}
        >
          <FaPlus size={12} /> Tambah Akun
        </button>

        {memuat ? (
          <p className={K.kosong}>Menyiapkan akun…</p>
        ) : (
          <div className="flex flex-col gap-5">
            {perKelompok.map((k) => (
              <section key={k.id} aria-labelledby={`kelompok-${k.id}`}>
                <h2 id={`kelompok-${k.id}`} className={`${K.judulSeksi} mb-2`}>
                  {k.label} <span className={K.redup}>({k.akun.length})</span>
                </h2>
                {CATATAN[k.id] && <p className={`${K.redup} mb-2`}>{CATATAN[k.id]}</p>}
                <ul className={K.kartuDaftar}>
                  {k.akun.map((a) => (
                    <li key={a.id} className={K.barisDaftar}>
                      <button
                        type="button"
                        className={`${K.tombolBaris} ${a.aktif ? '' : 'opacity-60'}`}
                        onClick={() => setForm(a)}
                      >
                        <span className={`${K.nominal} w-11 shrink-0`}>{a.kode}</span>
                        <span className="flex-1 min-w-0">
                          <span className={`${K.judulBaris} block`}>{a.nama}</span>
                          {a.kas && <span className={K.lencana}>Kas/Bank</span>}{' '}
                          {!a.aktif && <span className={K.lencana}>Nonaktif</span>}
                        </span>
                        <FaPen size={12} className={K.redup} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
      {form && <FormAkun data={form.id ? form : null} onTutup={() => setForm(null)} />}
    </div>
  );
}
