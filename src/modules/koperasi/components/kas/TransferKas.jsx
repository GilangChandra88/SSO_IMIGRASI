import { useState } from 'react';
import { PANJANG } from '@/utils/batas';
import { tanggalIso } from '@/utils/nilai';
import { pesanGalat } from '@/utils/pesanGalat';
import { showToast } from '@/utils/toastStore';
import { K } from '../../ui/kelas';
import { transferKas } from '../../services/fungsi';
import MasukanRupiah from '../MasukanRupiah';
import PilihKas from '../PilihKas';

/** Pindahkan dana antar rekening kas/bank. */
export default function TransferKas({ kas, onSelesai }) {
  const [dari, setDari] = useState('');
  const [ke, setKe] = useState('');
  const [jumlah, setJumlah] = useState(0);
  const [tanggal, setTanggal] = useState(tanggalIso());
  const [keterangan, setKeterangan] = useState('');
  const [sibuk, setSibuk] = useState(false);

  if (kas.length < 2) {
    return <p className={K.kosong}>Perlu minimal dua rekening kas/bank untuk transfer.</p>;
  }
  const kasDari = kas.find((k) => k.id === dari);
  const lebih = !!kasDari && jumlah > kasDari.saldo;

  const kirim = async (e) => {
    e.preventDefault();
    setSibuk(true);
    try {
      await transferKas({
        dariKasId: dari,
        keKasId: ke,
        jumlah,
        tanggal,
        keterangan: keterangan.trim(),
      });
      showToast('Transfer berhasil.');
      onSelesai();
    } catch (err) {
      showToast(pesanGalat(err), 'error');
      setSibuk(false);
    }
  };

  return (
    <form className={`${K.kartu} flex flex-col gap-3.5`} onSubmit={kirim}>
      <PilihKas kas={kas} nilai={dari} onUbah={setDari} label="Dari kas" kecuali={ke} />
      <PilihKas kas={kas} nilai={ke} onUbah={setKe} label="Ke kas" kecuali={dari} />
      <label>
        <span className={K.label}>Jumlah</span>
        <MasukanRupiah nilai={jumlah} onUbah={setJumlah} />
        {lebih && <span className={K.pesanGalat}>Melebihi saldo {kasDari.nama}.</span>}
      </label>
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
      <button
        type="submit"
        className={K.tombolUtama}
        disabled={sibuk || !dari || !ke || !jumlah || !tanggal || lebih}
      >
        {sibuk ? 'Memproses…' : 'Transfer'}
      </button>
    </form>
  );
}
