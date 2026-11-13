import { LIMIT_KUERI } from '@/utils/batas';
import { K } from '../../ui/kelas';
import { rupiah, tanggalPendek } from '../../ui/format';
import { useAnggota, usePengaturan } from '../../hooks/useAnggota';
import { useDaftarBerhalaman } from '../../hooks/useDaftarBerhalaman';
import { useKasBank } from '../../hooks/useKasBank';
import { ambilSimpanan, kueriSimpanan } from '../../services/bukuDb';
import Halaman from '../../components/Halaman';
import FormSetor from '../../components/anggota/FormSetor';

const KEMBALI = { to: '/koperasi/anggota', label: 'Anggota & Simpanan' };
const LABEL = { pokok: 'Pokok', wajib: 'Wajib', pengambilan: 'Pengambilan' };

export default function TransaksiSimpanan() {
  const { semua } = useAnggota();
  const { pengaturan } = usePengaturan();
  const { kas } = useKasBank();
  const { daftar, memuat, memuatLagi, adaLagi, muatLagi } = useDaftarBerhalaman(
    'koperasi_simpanan',
    () => kueriSimpanan(),
    ambilSimpanan,
    LIMIT_KUERI.simpananKoperasi,
    'Riwayat simpanan gagal dimuat.',
  );
  const pilihan = semua.filter((a) => a.status !== 'keluar');

  return (
    <Halaman
      judul="Transaksi Simpanan"
      sub="Setoran simpanan pokok dan wajib. Pengambilan dilakukan dari buku anggota saat anggota keluar."
      kembali={KEMBALI}
    >
      <div className={`${K.kartu} mb-5`}>
        <FormSetor anggota={pilihan} kas={kas} pengaturan={pengaturan} />
      </div>
      <h2 className={`${K.judulSeksi} mb-2`}>Transaksi terbaru</h2>
      {memuat ? (
        <p className={K.kosong}>Memuat…</p>
      ) : !daftar.length ? (
        <p className={K.kosong}>Belum ada transaksi simpanan.</p>
      ) : (
        <ul className={K.kartuDaftar}>
          {daftar.map((t) => (
            <li key={t.id} className={`${K.barisDaftar} px-4 py-2.5 flex justify-between gap-3`}>
              <span className="min-w-0">
                <span className={`${K.judulBaris} block truncate`}>
                  {t.nomor} · {t.anggotaNama}
                </span>
                <span className={`${K.redup} block`}>
                  {LABEL[t.jenis] ?? t.jenis} · {tanggalPendek(t.tanggal)}
                  {t.keterangan ? ` · ${t.keterangan}` : ''}
                </span>
              </span>
              <span className={K.nominal}>
                {t.jenis === 'pengambilan' ? '−' : '+'}
                {rupiah(t.jumlah)}
              </span>
            </li>
          ))}
        </ul>
      )}
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
    </Halaman>
  );
}
