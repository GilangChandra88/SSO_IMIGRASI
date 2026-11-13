import { useState } from 'react';
import { usePegawaiRingkas } from '@/context/usePegawaiRingkas';
import { PANJANG } from '@/utils/batas';
import { pesanGalat } from '@/utils/pesanGalat';
import { showToast } from '@/utils/toastStore';
import { K } from '../../ui/kelas';
import { simpanAnggota } from '../../services/fungsi';
import ModalForm from '../ModalForm';
import TabHalaman from '../TabHalaman';

const JENIS = [
  { id: 'pegawai', label: 'Pegawai' },
  { id: 'luar', label: 'Anggota Luar' },
];

/**
 * Tambah anggota (pegawai dari Kepegawaian, atau anggota luar tanpa akun), atau ubah bila `data`
 * diisi (nama hanya untuk anggota luar; catatan untuk semua).
 */
export default function FormAnggota({ data, semua, onTutup, onTersimpan }) {
  const { pegawai } = usePegawaiRingkas();
  const [jenis, setJenis] = useState(data?.jenis ?? 'pegawai');
  const [pegawaiId, setPegawaiId] = useState('');
  const [nama, setNama] = useState(data?.nama ?? '');
  const [catatan, setCatatan] = useState(data?.catatan ?? '');
  const [sibuk, setSibuk] = useState(false);

  const sudah = new Set(semua.map((a) => a.pegawaiId).filter(Boolean));
  const calon = pegawai.filter((p) => !sudah.has(p.id));
  const bisaSimpan = data
    ? data.jenis === 'pegawai' || nama.trim()
    : jenis === 'pegawai'
      ? !!pegawaiId
      : !!nama.trim();

  const simpan = async (e) => {
    e.preventDefault();
    setSibuk(true);
    try {
      const hasil = await simpanAnggota(
        data
          ? { id: data.id, nama: nama.trim(), catatan: catatan.trim() }
          : { jenis, pegawaiId, nama: nama.trim(), catatan: catatan.trim() },
      );
      showToast(data ? 'Data anggota diperbarui.' : `Anggota ${hasil.nomor} ditambahkan.`);
      onTersimpan?.(hasil);
      onTutup();
    } catch (err) {
      showToast(pesanGalat(err), 'error');
      setSibuk(false);
    }
  };

  return (
    <ModalForm
      id="form-anggota"
      judul={data ? 'Ubah Anggota' : 'Tambah Anggota'}
      onTutup={onTutup}
      onSimpan={simpan}
    >
      {!data && <TabHalaman daftar={JENIS} aktif={jenis} onUbah={setJenis} label="Jenis anggota" />}
      {!data && jenis === 'pegawai' ? (
        <label>
          <span className={K.label}>Pegawai</span>
          <select
            className={K.masukan}
            value={pegawaiId}
            onChange={(e) => setPegawaiId(e.target.value)}
          >
            <option value="">Pilih pegawai…</option>
            {calon.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama}
              </option>
            ))}
          </select>
          {!calon.length && <span className={K.redup}>Semua pegawai sudah terdaftar.</span>}
        </label>
      ) : (
        <label>
          <span className={K.label}>Nama</span>
          <input
            className={K.masukan}
            maxLength={PANJANG.namaAnggota}
            value={nama}
            disabled={data?.jenis === 'pegawai'}
            onChange={(e) => setNama(e.target.value)}
          />
          {data?.jenis === 'pegawai' && (
            <span className={`${K.redup} block mt-1`}>
              Nama pegawai mengikuti data Kepegawaian.
            </span>
          )}
        </label>
      )}
      <label>
        <span className={K.label}>Catatan (boleh kosong)</span>
        <input
          className={K.masukan}
          maxLength={PANJANG.keteranganKoperasi}
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
        />
      </label>
      {!data && (
        <p className={K.redup}>Anggota baru berstatus calon sampai simpanan pokoknya dibayar.</p>
      )}
      <button type="submit" className={K.tombolUtama} disabled={sibuk || !bisaSimpan}>
        {sibuk ? 'Menyimpan…' : 'Simpan'}
      </button>
    </ModalForm>
  );
}
