import { useState } from 'react';
import { tanggalIso } from '@/utils/nilai';
import { pesanGalat } from '@/utils/pesanGalat';
import { showToast } from '@/utils/toastStore';
import { K } from '../../ui/kelas';
import { namaPeriode } from '../../ui/format';
import { useBukuBesar } from '../../hooks/useBukuBesar';
import { tutupBuku } from '../../services/fungsi';
import Halaman from '../../components/Halaman';
import ModalForm from '../../components/ModalForm';

const KEMBALI = { to: '/koperasi/pembukuan', label: 'Pembukuan' };

/** Bulan berikutnya dari 'YYYY-MM'. */
const bulanSesudah = (p) => {
  const [y, m] = p.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
};

/** Kunci periode yang sudah selesai: transaksinya tidak bisa ditambah dan saldo awal terkunci. */
export default function TutupBuku() {
  const { saldoAwal, memuat } = useBukuBesar();
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const bulanIni = tanggalIso().slice(0, 7);
  const terkunci = saldoAwal?.terkunciSampai || '';
  const mulai = saldoAwal?.tanggalMulai?.slice(0, 7);
  const berikut = terkunci ? bulanSesudah(terkunci) : mulai;
  const bisa = !!berikut && berikut < bulanIni;

  const tutup = async (e) => {
    e.preventDefault();
    setSibuk(true);
    try {
      await tutupBuku({ sampai: berikut });
      showToast(`Buku ${namaPeriode(berikut)} ditutup.`);
      setKonfirmasi(false);
    } catch (err) {
      showToast(pesanGalat(err), 'error');
    } finally {
      setSibuk(false);
    }
  };

  let isi;
  if (memuat) isi = <p className={K.kosong}>Memuat…</p>;
  else if (!saldoAwal) isi = <p className={K.kosong}>Isi Saldo Awal lebih dulu.</p>;
  else {
    isi = (
      <div className={`${K.kartu} flex flex-col gap-3 max-w-xl`}>
        <p className={K.teks}>
          Pembukuan dimulai {namaPeriode(mulai)}.{' '}
          {terkunci
            ? `Sudah ditutup sampai ${namaPeriode(terkunci)}.`
            : 'Belum ada periode yang ditutup.'}
        </p>
        <p className={K.redup}>
          Tutup buku satu bulan setelah semua transaksinya lengkap dan kas sudah dicocokkan. Setelah
          ditutup, transaksi bertanggal di bulan itu ditolak dan Saldo Awal tidak bisa diubah lagi.
          Kesalahan setelahnya dikoreksi di bulan berjalan.
        </p>
        {bisa ? (
          <button type="button" className={K.tombolUtama} onClick={() => setKonfirmasi(true)}>
            Tutup buku {namaPeriode(berikut)}
          </button>
        ) : (
          <p className={K.redup}>Bulan berjalan belum bisa ditutup.</p>
        )}
      </div>
    );
  }

  return (
    <Halaman judul="Tutup Buku" kembali={KEMBALI}>
      {isi}
      {konfirmasi && (
        <ModalForm
          id="form-tutup"
          judul={`Tutup buku ${namaPeriode(berikut)}?`}
          onTutup={() => setKonfirmasi(false)}
          onSimpan={tutup}
        >
          <p className={K.teks}>Tindakan ini tidak bisa dibatalkan.</p>
          <button type="submit" className={K.tombolUtama} disabled={sibuk}>
            {sibuk ? 'Memproses…' : 'Ya, tutup buku'}
          </button>
        </ModalForm>
      )}
    </Halaman>
  );
}
