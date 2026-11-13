import { useState } from 'react';
import { tanggalIso } from '@/utils/nilai';
import { pesanGalat } from '@/utils/pesanGalat';
import { showToast } from '@/utils/toastStore';
import { K } from '../../ui/kelas';
import { rupiah } from '../../ui/format';
import { useAnggota } from '../../hooks/useAnggota';
import { useKasBank } from '../../hooks/useKasBank';
import { lunasiBon } from '../../services/fungsi';
import Halaman from '../../components/Halaman';
import MasukanRupiah from '../../components/MasukanRupiah';
import ModalForm from '../../components/ModalForm';
import PilihKas from '../../components/PilihKas';

function FormLunasiBon({ a, kas, onTutup }) {
  const [jumlah, setJumlah] = useState(a.piutang);
  const [kasId, setKasId] = useState('');
  const [tanggal, setTanggal] = useState(tanggalIso());
  const [keterangan, setKeterangan] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const simpan = async (e) => {
    e.preventDefault();
    setSibuk(true);
    try {
      await lunasiBon({ anggotaId: a.id, jumlah, kasId, tanggal, keterangan: keterangan.trim() });
      showToast('Pelunasan bon tersimpan.');
      onTutup();
    } catch (err) {
      showToast(pesanGalat(err), 'error');
      setSibuk(false);
    }
  };
  return (
    <ModalForm id="form-lunasi-bon" judul="Lunasi Bon" onTutup={onTutup} onSimpan={simpan}>
      <p className={K.teks}>
        {a.nomor} · {a.nama} · bon {rupiah(a.piutang)}
      </p>
      <label>
        <span className={K.label}>Jumlah dibayar</span>
        <MasukanRupiah nilai={jumlah} onUbah={setJumlah} />
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
          maxLength={200}
          placeholder="Mis. potong gaji November"
          value={keterangan}
          onChange={(e) => setKeterangan(e.target.value)}
        />
      </label>
      <button
        type="submit"
        className={K.tombolUtama}
        disabled={sibuk || !kasId || !jumlah || jumlah > a.piutang}
      >
        {sibuk ? 'Menyimpan…' : 'Simpan pelunasan'}
      </button>
    </ModalForm>
  );
}

/** Anggota yang masih punya bon di Kantin. */
export default function BonAnggota() {
  const { semua, memuat } = useAnggota();
  const { kas } = useKasBank();
  const [pilih, setPilih] = useState(null);
  const berbon = semua.filter((a) => a.piutang > 0).sort((a, b) => b.piutang - a.piutang);
  const total = berbon.reduce((n, a) => n + a.piutang, 0);

  let isi;
  if (memuat) isi = <p className={K.kosong}>Memuat…</p>;
  else if (!berbon.length) isi = <p className={K.kosong}>Tidak ada bon yang belum lunas.</p>;
  else {
    isi = (
      <>
        <div className={`${K.barisTotal} mb-3 px-1`}>
          <span className={K.judulBaris}>Total bon {berbon.length} anggota</span>
          <span className={K.nominal}>{rupiah(total)}</span>
        </div>
        <ul className="flex flex-col gap-2.5">
          {berbon.map((a) => (
            <li key={a.id} className={`${K.kartu} flex items-center gap-3`}>
              <span className="flex-1 min-w-0">
                <span className={`${K.judulBaris} block truncate`}>{a.nama}</span>
                <span className={K.redup}>{a.nomor}</span>
              </span>
              <span className="flex flex-col items-end gap-1.5">
                <span className={K.nominal}>{rupiah(a.piutang)}</span>
                <button type="button" className={K.tombolKedua} onClick={() => setPilih(a)}>
                  Lunasi
                </button>
              </span>
            </li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <Halaman judul="Bon Anggota" sub="Belanja anggota dengan bon yang belum dibayar.">
      {isi}
      {pilih && <FormLunasiBon a={pilih} kas={kas} onTutup={() => setPilih(null)} />}
    </Halaman>
  );
}
