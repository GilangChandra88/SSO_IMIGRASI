import { useState } from 'react';
import { Link } from 'react-router-dom';
import { pesanGalat } from '@/utils/pesanGalat';
import { showToast } from '@/utils/toastStore';
import { K } from '../../ui/kelas';
import { idTransaksiBaru } from '../../services/kasirDb';
import { catatPenjualan } from '../../services/fungsi';
import { jalurUnit, UNIT_USAHA } from '../../data/unitUsaha';
import ModalForm from '../ModalForm';
import PilihAnggota from '../PilihAnggota';
import { rupiah } from '../../ui/format';

const BON = 'bon';
const JALUR_PEMBAYARAN = jalurUnit(UNIT_USAHA[0], 'pembayaran');

/**
 * Pilih pembeli (bawaan UMUM) dan cara bayar, lalu catat penjualan. Kas tujuan mengikuti pengaturan
 * cara bayar (menu Pembayaran); bon khusus anggota.
 */
export default function BayarKasir({
  baris,
  total,
  pembayaran,
  namaKas,
  anggota,
  onTutup,
  onSelesai,
}) {
  const [id] = useState(idTransaksiBaru);
  const [pembeli, setPembeli] = useState('');
  const [cara, setCara] = useState(pembayaran[0]?.id ?? '');
  const [sibuk, setSibuk] = useState(false);
  const bon = cara === BON;
  const dipilih = pembayaran.find((p) => p.id === cara);

  const simpan = async (e) => {
    e.preventDefault();
    setSibuk(true);
    try {
      await catatPenjualan({
        id,
        items: baris.map((b) => ({
          barangId: b.barang.id,
          kemasanId: b.satuan.id,
          jumlah: b.jumlah,
        })),
        ...(bon ? { caraBayar: 'bon' } : { pembayaranId: cara }),
        anggotaId: pembeli,
        total,
      });
      showToast('Transaksi tersimpan.');
      onSelesai();
    } catch (err) {
      showToast(pesanGalat(err), 'error');
      setSibuk(false);
    }
  };

  const pilihan = [
    ...pembayaran.map((p) => ({ id: p.id, nama: p.nama })),
    { id: BON, nama: 'Bon' },
  ];

  return (
    <ModalForm id="form-bayar" judul="Pembayaran" onTutup={onTutup} onSimpan={simpan}>
      <div className={K.barisTotal}>
        <span className={K.judulBaris}>Total</span>
        <span className={K.nominal}>{rupiah(total)}</span>
      </div>
      <PilihAnggota anggota={anggota} nilai={pembeli} onUbah={setPembeli} label="Pembeli" umum />
      <div>
        <span className={K.label}>Cara bayar</span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cara bayar">
          {pilihan.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={cara === p.id}
              className={`${K.chip} ${cara === p.id ? K.chipAktif : K.chipPasif}`}
              onClick={() => setCara(p.id)}
            >
              {p.nama}
            </button>
          ))}
        </div>
        {!pembayaran.length && (
          <span className={`${K.redup} block mt-1.5`}>
            Belum ada cara bayar selain bon.{' '}
            <Link to={JALUR_PEMBAYARAN} className="underline">
              Atur di menu Pembayaran
            </Link>
            .
          </span>
        )}
      </div>
      {bon
        ? !pembeli && (
            <p className={K.pesanGalat}>Bon hanya untuk anggota. Pilih nama pembelinya.</p>
          )
        : dipilih && (
            <p className={K.redup}>Uang masuk ke {namaKas[dipilih.kasId] ?? 'kas yang diatur'}.</p>
          )}
      <button
        type="submit"
        className={K.tombolUtama}
        disabled={sibuk || !cara || (bon && !pembeli)}
      >
        {sibuk ? 'Menyimpan…' : 'Selesaikan'}
      </button>
    </ModalForm>
  );
}
