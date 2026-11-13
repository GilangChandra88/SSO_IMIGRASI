import { useState } from 'react';
import { PANJANG } from '@/utils/batas';
import { tanggalIso } from '@/utils/nilai';
import { pesanGalat } from '@/utils/pesanGalat';
import { showToast } from '@/utils/toastStore';
import { K } from '../../ui/kelas';
import { rupiah } from '../../ui/format';
import { catatSimpanan } from '../../services/fungsi';
import MasukanRupiah from '../MasukanRupiah';
import PilihAnggota from '../PilihAnggota';
import PilihKas from '../PilihKas';
import TabHalaman from '../TabHalaman';

const JENIS = [
  { id: 'pokok', label: 'Simpanan Pokok' },
  { id: 'wajib', label: 'Simpanan Wajib' },
];

/**
 * Setoran simpanan pokok/wajib. `anggota` = daftar pilihan (semua kecuali keluar); bila
 * `tetap` diisi, anggota sudah ditentukan (dari buku anggota).
 */
export default function FormSetor({ anggota, tetap, kas, pengaturan, onSelesai }) {
  const [anggotaId, setAnggotaId] = useState(tetap?.id ?? '');
  const dipilih = tetap ?? anggota.find((a) => a.id === anggotaId);
  const awalJenis = dipilih?.status === 'calon' ? 'pokok' : 'wajib';
  const [jenis, setJenis] = useState(awalJenis);
  const [jumlah, setJumlah] = useState(
    awalJenis === 'pokok' ? pengaturan.nominalPokok : pengaturan.nominalWajib,
  );
  const [kasId, setKasId] = useState('');
  const [tanggal, setTanggal] = useState(tanggalIso());
  const [keterangan, setKeterangan] = useState('');
  const [sibuk, setSibuk] = useState(false);

  const ubahJenis = (j) => {
    setJenis(j);
    setJumlah(j === 'pokok' ? pengaturan.nominalPokok : pengaturan.nominalWajib);
  };
  const pilihAnggota = (id) => {
    setAnggotaId(id);
    const a = anggota.find((x) => x.id === id);
    ubahJenis(a?.status === 'calon' ? 'pokok' : 'wajib');
  };

  let peringatan = '';
  if (dipilih && jenis === 'pokok' && dipilih.status !== 'calon') {
    peringatan = 'Simpanan pokok anggota ini sudah dibayar.';
  } else if (dipilih && jenis === 'wajib' && dipilih.status !== 'aktif') {
    peringatan = 'Bayar simpanan pokok lebih dulu.';
  } else if (jenis === 'pokok' && jumlah !== pengaturan.nominalPokok) {
    peringatan = `Simpanan pokok harus ${rupiah(pengaturan.nominalPokok)}.`;
  } else if (jenis === 'wajib' && jumlah % pengaturan.nominalWajib !== 0) {
    peringatan = `Simpanan wajib harus kelipatan ${rupiah(pengaturan.nominalWajib)}.`;
  }

  const simpan = async (e) => {
    e.preventDefault();
    setSibuk(true);
    try {
      await catatSimpanan({
        anggotaId: dipilih.id,
        jenis,
        jumlah,
        kasId,
        tanggal,
        keterangan: keterangan.trim(),
      });
      showToast('Setoran tersimpan.');
      onSelesai?.();
      if (!tetap) setAnggotaId('');
      setKeterangan('');
    } catch (err) {
      showToast(pesanGalat(err), 'error');
    } finally {
      setSibuk(false);
    }
  };

  return (
    <form className="flex flex-col gap-3.5" onSubmit={simpan}>
      {!tetap && <PilihAnggota anggota={anggota} nilai={anggotaId} onUbah={pilihAnggota} />}
      <TabHalaman daftar={JENIS} aktif={jenis} onUbah={ubahJenis} label="Jenis simpanan" />
      <label>
        <span className={K.label}>Jumlah</span>
        <MasukanRupiah nilai={jumlah} onUbah={setJumlah} />
        {jenis === 'wajib' && jumlah > 0 && jumlah % pengaturan.nominalWajib === 0 && (
          <span className={`${K.redup} block mt-1`}>
            Untuk {jumlah / pengaturan.nominalWajib} bulan
          </span>
        )}
      </label>
      <PilihKas kas={kas} nilai={kasId} onUbah={setKasId} label="Masuk ke kas" />
      <label>
        <span className={K.label}>Tanggal</span>
        <input
          type="date"
          className={K.masukan}
          max={tanggalIso()}
          value={tanggal}
          onChange={(e) => setTanggal(e.target.value)}
        />
      </label>
      <label>
        <span className={K.label}>Keterangan (boleh kosong)</span>
        <input
          className={K.masukan}
          maxLength={PANJANG.keteranganKoperasi}
          value={keterangan}
          onChange={(e) => setKeterangan(e.target.value)}
        />
      </label>
      {peringatan && <span className={K.pesanGalat}>{peringatan}</span>}
      <button
        type="submit"
        className={K.tombolUtama}
        disabled={sibuk || !dipilih || !kasId || !jumlah || !!peringatan}
      >
        {sibuk ? 'Menyimpan…' : 'Simpan setoran'}
      </button>
    </form>
  );
}
