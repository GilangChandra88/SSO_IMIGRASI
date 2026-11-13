import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PANJANG } from '@/utils/batas';
import { pesanGalat } from '@/utils/pesanGalat';
import { showToast } from '@/utils/toastStore';
import { K } from '../../ui/kelas';
import { tambahKategori, ubahKategori } from '../../services/stokDb';
import ModalForm from '../ModalForm';

/** Tambah kategori baru, atau ubah/nonaktifkan bila `data` diisi. */
export default function FormKategori({ data, semua, onTutup }) {
  const { currentUser } = useAuth();
  const uid = currentUser.uid;
  const [nama, setNama] = useState(data?.nama ?? '');
  const [sibuk, setSibuk] = useState(false);
  const bersih = nama.trim();
  const kembar = semua.some(
    (k) => k.id !== data?.id && k.nama.toLowerCase() === bersih.toLowerCase(),
  );

  const jalankan = async (aksi, pesan) => {
    setSibuk(true);
    try {
      await aksi();
      showToast(pesan);
      onTutup();
    } catch (err) {
      showToast(pesanGalat(err), 'error');
      setSibuk(false);
    }
  };

  const simpan = (e) => {
    e.preventDefault();
    jalankan(
      () => (data ? ubahKategori(data.id, { nama: bersih }, uid) : tambahKategori(bersih, uid)),
      data ? 'Kategori diperbarui.' : 'Kategori ditambahkan.',
    );
  };

  return (
    <ModalForm
      id="form-kategori"
      judul={data ? 'Ubah Kategori' : 'Tambah Kategori'}
      onTutup={onTutup}
      onSimpan={simpan}
    >
      <label>
        <span className={K.label}>Nama kategori</span>
        <input
          className={K.masukan}
          maxLength={PANJANG.namaKategoriKantin}
          placeholder="Mis. Minuman, Makanan Ringan"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
        />
        {kembar && <span className={K.pesanGalat}>Kategori ini sudah ada.</span>}
      </label>
      <button type="submit" className={K.tombolUtama} disabled={sibuk || !bersih || kembar}>
        {sibuk ? 'Menyimpan…' : 'Simpan'}
      </button>
      {data && (
        <button
          type="button"
          className={K.tombolKedua}
          disabled={sibuk}
          onClick={() =>
            jalankan(
              () => ubahKategori(data.id, { aktif: !data.aktif }, uid),
              data.aktif ? 'Kategori dinonaktifkan.' : 'Kategori diaktifkan.',
            )
          }
        >
          {data.aktif ? 'Nonaktifkan' : 'Aktifkan'}
        </button>
      )}
    </ModalForm>
  );
}
