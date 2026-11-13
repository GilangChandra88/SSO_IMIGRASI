import { useState } from 'react';
import { LIMIT_KUERI } from '@/utils/batas';
import { pesanGalat } from '@/utils/pesanGalat';
import { showToast } from '@/utils/toastStore';
import { K } from '../../ui/kelas';
import { rupiah, waktuPendek } from '../../ui/format';
import { useDaftarBerhalaman } from '../../hooks/useDaftarBerhalaman';
import { ambilHistory, kueriHistory, labelBayar } from '../../services/kasirDb';
import { batalkanPenjualan } from '../../services/fungsi';
import Halaman from '../../components/Halaman';
import ModalForm from '../../components/ModalForm';

function FormBatal({ t, onTutup }) {
  const [alasan, setAlasan] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const simpan = async (e) => {
    e.preventDefault();
    setSibuk(true);
    try {
      await batalkanPenjualan({ id: t.id, alasan: alasan.trim() });
      showToast('Transaksi dibatalkan.');
      onTutup();
    } catch (err) {
      showToast(pesanGalat(err), 'error');
      setSibuk(false);
    }
  };
  return (
    <ModalForm id="form-batal" judul="Batalkan Transaksi" onTutup={onTutup} onSimpan={simpan}>
      <p className={K.teks}>
        {rupiah(t.total)} · {t.pembeli?.nama ?? 'UMUM'} · {labelBayar(t)}
      </p>
      <p className={K.redup}>
        Stok dikembalikan dan dicatat jurnal pembalik hari ini. Catatan aslinya tetap ada.
      </p>
      <label>
        <span className={K.label}>Alasan</span>
        <input
          className={K.masukan}
          maxLength={200}
          value={alasan}
          onChange={(e) => setAlasan(e.target.value)}
        />
      </label>
      <button type="submit" className={K.tombolUtama} disabled={sibuk || !alasan.trim()}>
        {sibuk ? 'Memproses…' : 'Batalkan transaksi'}
      </button>
    </ModalForm>
  );
}

/** Riwayat penjualan Kasir Kantin, terbaru di atas. */
export default function HistoryTransaksi() {
  const [batal, setBatal] = useState(null);
  const { daftar, memuat, memuatLagi, adaLagi, muatLagi } = useDaftarBerhalaman(
    'koperasi_kantin_transaksi',
    () => kueriHistory(),
    ambilHistory,
    LIMIT_KUERI.historyKasir,
    'History transaksi gagal dimuat.',
  );

  let isi;
  if (memuat) isi = <p className={K.kosong}>Memuat…</p>;
  else if (!daftar.length) isi = <p className={K.kosong}>Belum ada transaksi.</p>;
  else {
    isi = (
      <ul className="flex flex-col gap-2.5">
        {daftar.map((t) => (
          <li key={t.id} className={`${K.kartu} flex flex-col gap-2`}>
            <div className="flex items-start justify-between gap-3">
              <div className={`min-w-0 ${t.status === 'batal' ? 'opacity-60' : ''}`}>
                <span className={`${K.judulBaris} block`}>{t.pembeli?.nama ?? 'UMUM'}</span>
                <span className={`${K.redup} block`}>{waktuPendek(t.dibuatPada)}</span>
                <span className={`${K.redup} block truncate`}>
                  {labelBayar(t)}
                  {t.kasNama ? ` · ${t.kasNama}` : ''}
                </span>
                {t.status === 'batal' && (
                  <span className={K.lencanaBahaya}>Dibatalkan: {t.alasanBatal}</span>
                )}
              </div>
              <span className={K.nominal}>{rupiah(t.total)}</span>
            </div>
            <ul className="flex flex-col gap-0.5">
              {t.items.map((i) => (
                <li
                  key={`${i.barangId}-${i.kemasanId || ''}`}
                  className={`${K.teks} flex justify-between gap-3`}
                >
                  <span className="min-w-0 truncate">
                    {i.jumlah} {i.isi > 1 ? i.satuan : '×'} {i.nama}
                  </span>
                  <span className="whitespace-nowrap">{rupiah(i.subtotal)}</span>
                </li>
              ))}
            </ul>
            {t.status !== 'batal' && (
              <button
                type="button"
                className={`${K.tombolKedua} self-start`}
                onClick={() => setBatal(t)}
              >
                Batalkan
              </button>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Halaman judul="History Transaksi">
      {isi}
      {adaLagi && (
        <button
          type="button"
          className={`${K.tombolKedua} mt-3`}
          disabled={memuatLagi}
          onClick={muatLagi}
        >
          {memuatLagi ? 'Memuat…' : 'Muat lagi'}
        </button>
      )}
      {batal && <FormBatal t={batal} onTutup={() => setBatal(null)} />}
    </Halaman>
  );
}
