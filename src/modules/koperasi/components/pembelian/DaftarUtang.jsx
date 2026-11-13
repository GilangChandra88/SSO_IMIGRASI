import { useState } from 'react';
import { tanggalIso } from '@/utils/nilai';
import { pesanGalat } from '@/utils/pesanGalat';
import { showToast } from '@/utils/toastStore';
import { usePantauBersama } from '@/utils/usePantauBersama';
import { K } from '../../ui/kelas';
import { rupiah, tanggalPendek } from '../../ui/format';
import { kueriUtang } from '../../services/bukuDb';
import { lunasiUtang } from '../../services/fungsi';
import MasukanRupiah from '../MasukanRupiah';
import ModalForm from '../ModalForm';
import PilihKas from '../PilihKas';

const OPSI = { pesan: 'Daftar utang gagal dimuat.' };

function FormLunasi({ p, kas, onTutup }) {
  const [jumlah, setJumlah] = useState(p.sisaUtang);
  const [kasId, setKasId] = useState('');
  const [tanggal, setTanggal] = useState(tanggalIso());
  const [sibuk, setSibuk] = useState(false);
  const kasDipilih = kas.find((k) => k.id === kasId);
  const simpan = async (e) => {
    e.preventDefault();
    setSibuk(true);
    try {
      await lunasiUtang({ pembelianId: p.id, jumlah, kasId, tanggal });
      showToast('Pelunasan utang tersimpan.');
      onTutup();
    } catch (err) {
      showToast(pesanGalat(err), 'error');
      setSibuk(false);
    }
  };
  return (
    <ModalForm id="form-lunasi-utang" judul="Lunasi Utang" onTutup={onTutup} onSimpan={simpan}>
      <p className={K.teks}>
        {p.pemasok || 'Tanpa nama pemasok'} · sisa {rupiah(p.sisaUtang)}
      </p>
      <label>
        <span className={K.label}>Jumlah dibayar</span>
        <MasukanRupiah nilai={jumlah} onUbah={setJumlah} />
      </label>
      <PilihKas kas={kas} nilai={kasId} onUbah={setKasId} label="Dibayar dari kas" />
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
      <button
        type="submit"
        className={K.tombolUtama}
        disabled={
          sibuk ||
          !kasId ||
          !jumlah ||
          jumlah > p.sisaUtang ||
          (kasDipilih && jumlah > kasDipilih.saldo)
        }
      >
        {sibuk ? 'Menyimpan…' : 'Bayar'}
      </button>
    </ModalForm>
  );
}

/** Pembelian yang belum lunas, dengan tombol pelunasan. */
export default function DaftarUtang({ kas }) {
  const { data, memuat } = usePantauBersama('koperasi_utang', kueriUtang, OPSI);
  const [pilih, setPilih] = useState(null);
  const daftar = [...(data || [])].sort((a, b) =>
    (a.jatuhTempo || '9').localeCompare(b.jatuhTempo || '9'),
  );
  const total = daftar.reduce((n, p) => n + p.sisaUtang, 0);
  if (memuat) return <p className={K.kosong}>Memuat…</p>;
  if (!daftar.length) return <p className={K.kosong}>Tidak ada utang pembelian.</p>;
  return (
    <>
      <div className={`${K.barisTotal} mb-3 px-1`}>
        <span className={K.judulBaris}>Total utang</span>
        <span className={K.nominal}>{rupiah(total)}</span>
      </div>
      <ul className="flex flex-col gap-2.5">
        {daftar.map((p) => (
          <li key={p.id} className={`${K.kartu} flex items-center gap-3`}>
            <span className="flex-1 min-w-0">
              <span className={`${K.judulBaris} block truncate`}>
                {p.pemasok || 'Tanpa nama pemasok'}
              </span>
              <span className={`${K.redup} block`}>
                Beli {tanggalPendek(p.tanggal)} · total {rupiah(p.total)}
              </span>
              {p.jatuhTempo && (
                <span className={p.jatuhTempo < tanggalIso() ? K.lencanaBahaya : K.lencana}>
                  Jatuh tempo {tanggalPendek(p.jatuhTempo)}
                </span>
              )}
            </span>
            <span className="flex flex-col items-end gap-1.5">
              <span className={K.nominal}>{rupiah(p.sisaUtang)}</span>
              <button type="button" className={K.tombolKedua} onClick={() => setPilih(p)}>
                Lunasi
              </button>
            </span>
          </li>
        ))}
      </ul>
      {pilih && <FormLunasi p={pilih} kas={kas} onTutup={() => setPilih(null)} />}
    </>
  );
}
