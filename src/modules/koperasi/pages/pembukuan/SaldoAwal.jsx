import { Link } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { usePantauBersama } from '@/utils/usePantauBersama';
import { K } from '../../ui/kelas';
import { useBaganAkun } from '../../hooks/useBaganAkun';
import { refSaldoAwal } from '../../services/bukuDb';
import FormSaldoAwal from '../../components/akun/FormSaldoAwal';

const OPSI = { tahanMs: 10 * 60_000, pesan: 'Saldo awal gagal dimuat.' };

export default function SaldoAwal() {
  const { perKelompok, memuat: memuatAkun } = useBaganAkun();
  const { data, memuat } = usePantauBersama('koperasi_saldo_awal', refSaldoAwal, OPSI);

  return (
    <div className={K.latar}>
      <div className={K.halaman}>
        <Link to="/koperasi/pembukuan" className={K.kembali}>
          <FaArrowLeft size={11} aria-hidden="true" /> Pembukuan
        </Link>
        <h1 className={K.h1}>Saldo Awal</h1>
        <p className={`${K.sub} mb-4`}>
          Saldo akun neraca saat pembukuan di sistem dimulai. Total aset harus sama dengan total
          kewajiban dan ekuitas.
        </p>
        {memuat || memuatAkun ? (
          <p className={K.kosong}>Memuat…</p>
        ) : (
          <FormSaldoAwal
            key={data?.diubahPada?.toMillis?.() ?? 'baru'}
            awal={data}
            perKelompok={perKelompok}
          />
        )}
      </div>
    </div>
  );
}
