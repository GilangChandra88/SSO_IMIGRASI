import { LIMIT_KUERI } from '@/utils/batas';
import { K } from '../../ui/kelas';
import { rupiah, tanggalPendek } from '../../ui/format';
import { LABEL_JENIS } from '../../data/jenisJurnal';
import { useBaganAkun } from '../../hooks/useBaganAkun';
import { useDaftarBerhalaman } from '../../hooks/useDaftarBerhalaman';
import { ambilJurnal, kueriJurnal } from '../../services/bukuDb';
import Halaman from '../../components/Halaman';

const KEMBALI = { to: '/koperasi/pembukuan', label: 'Pembukuan' };

/** Semua jurnal (debit/kredit) terbaru di atas. Ditulis otomatis; tidak bisa diubah. */
export default function Jurnal() {
  const { akun } = useBaganAkun();
  const nama = Object.fromEntries(akun.map((a) => [a.id, `${a.kode} ${a.nama}`]));
  const { daftar, memuat, memuatLagi, adaLagi, muatLagi } = useDaftarBerhalaman(
    'koperasi_jurnal',
    () => kueriJurnal(),
    ambilJurnal,
    LIMIT_KUERI.jurnalKoperasi,
    'Jurnal gagal dimuat.',
  );

  let isi;
  if (memuat) isi = <p className={K.kosong}>Memuat…</p>;
  else if (!daftar.length) isi = <p className={K.kosong}>Belum ada jurnal.</p>;
  else {
    isi = (
      <ul className="flex flex-col gap-2.5">
        {daftar.map((j) => (
          <li
            key={j.id}
            className={`${K.kartu} flex flex-col gap-2 ${j.dibatalkan ? 'opacity-70' : ''}`}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className={`${K.judulBaris} block`}>{LABEL_JENIS[j.jenis] ?? j.jenis}</span>
                <span className={`${K.redup} block`}>{tanggalPendek(j.tanggal)}</span>
                <span className={`${K.redup} block break-words`}>{j.keterangan}</span>
                {j.dibatalkan && (
                  <span className={K.lencanaBahaya}>Sudah dibalik (dibatalkan)</span>
                )}
              </span>
              <span className={K.nominal}>{rupiah(j.total)}</span>
            </div>
            <table className="w-full text-[13px]">
              <thead>
                <tr className={K.redup}>
                  <th className="text-left font-semibold py-1">Akun</th>
                  <th className="text-right font-semibold py-1 w-24">Debit</th>
                  <th className="text-right font-semibold py-1 w-24">Kredit</th>
                </tr>
              </thead>
              <tbody>
                {j.baris.map((b) => (
                  <tr key={b.akunId} className={K.teks}>
                    <td className={`py-0.5 pr-2 ${b.kredit ? 'pl-4' : ''}`}>
                      {nama[b.akunId] ?? b.akunId}
                    </td>
                    <td className="py-0.5 text-right tabular-nums">
                      {b.debit ? rupiah(b.debit) : ''}
                    </td>
                    <td className="py-0.5 text-right tabular-nums">
                      {b.kredit ? rupiah(b.kredit) : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Halaman
      judul="Jurnal"
      sub="Tercatat otomatis dari setiap transaksi. Koreksi memakai jurnal pembalik."
      kembali={KEMBALI}
    >
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
    </Halaman>
  );
}
