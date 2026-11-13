import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PANJANG } from '@/utils/batas';
import { pesanGalat } from '@/utils/pesanGalat';
import { showToast } from '@/utils/toastStore';
import { K } from '../../ui/kelas';
import { KELOMPOK_AKUN } from '../../data/baganAkun';
import { tambahAkun, ubahAkun } from '../../services/akunDb';
import ModalForm from '../ModalForm';

const KODE_SAH = /^[0-9]{4}$/;

/**
 * Tambah akun, atau ubah bila `data` diisi. Akun bawaan hanya bisa diganti namanya;
 * kelompok dan jenis kas/bank tidak bisa diubah setelah akun dibuat.
 */
export default function FormAkun({ data, preset, onTutup }) {
  const { currentUser } = useAuth();
  const uid = currentUser.uid;
  const bawaan = !!data?.sistem;
  const awal = data ?? preset ?? {};
  const [kelompok, setKelompok] = useState(awal.kelompok ?? 'beban');
  const [kode, setKode] = useState(awal.kode ?? '');
  const [nama, setNama] = useState(awal.nama ?? '');
  const [kas, setKas] = useState(awal.kas ?? false);
  const [sibuk, setSibuk] = useState(false);

  const namaBersih = nama.trim();
  const kodeSah = KODE_SAH.test(kode);
  const bolehKas = kelompok === 'asetLancar';

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
    if (data) {
      const isi = bawaan ? { nama: namaBersih } : { nama: namaBersih, kode };
      jalankan(() => ubahAkun(data.id, isi, uid), 'Akun diperbarui.');
    } else {
      jalankan(
        () => tambahAkun({ kode, nama: namaBersih, kelompok, kas: bolehKas && kas }, uid),
        'Akun ditambahkan.',
      );
    }
  };

  return (
    <ModalForm
      id="form-akun"
      judul={data ? 'Ubah Akun' : 'Tambah Akun'}
      onTutup={onTutup}
      onSimpan={simpan}
    >
      <label>
        <span className={K.label}>Kelompok</span>
        <select
          className={K.masukan}
          value={kelompok}
          disabled={!!data}
          onChange={(e) => setKelompok(e.target.value)}
        >
          {KELOMPOK_AKUN.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className={K.label}>Kode (4 angka)</span>
        <input
          className={K.masukan}
          inputMode="numeric"
          maxLength={4}
          value={kode}
          disabled={bawaan}
          onChange={(e) => setKode(e.target.value.replace(/[^0-9]/g, ''))}
        />
      </label>
      <label>
        <span className={K.label}>Nama akun</span>
        <input
          className={K.masukan}
          maxLength={PANJANG.namaAkun}
          value={nama}
          onChange={(e) => setNama(e.target.value)}
        />
      </label>
      {!data && bolehKas && (
        <label className={K.barisCentang}>
          <input type="checkbox" checked={kas} onChange={(e) => setKas(e.target.checked)} />
          <span>Rekening kas atau bank</span>
        </label>
      )}
      {bawaan && (
        <p className={K.redup}>
          Akun bawaan dipakai pencatatan otomatis, jadi kode dan statusnya tidak bisa diubah.
        </p>
      )}
      <button type="submit" className={K.tombolUtama} disabled={sibuk || !namaBersih || !kodeSah}>
        {sibuk ? 'Menyimpan…' : 'Simpan'}
      </button>
      {data && !bawaan && (
        <button
          type="button"
          className={K.tombolKedua}
          disabled={sibuk}
          onClick={() =>
            jalankan(
              () => ubahAkun(data.id, { aktif: !data.aktif }, uid),
              data.aktif ? 'Akun dinonaktifkan.' : 'Akun diaktifkan.',
            )
          }
        >
          {data.aktif ? 'Nonaktifkan' : 'Aktifkan'}
        </button>
      )}
    </ModalForm>
  );
}
