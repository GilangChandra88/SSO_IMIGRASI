import { K } from '../../ui/kelas';
import { rupiah } from '../../ui/format';

/**
 * Laporan satu kolom yang nyaman di ponsel. bagian: [{ judul, baris: [{ label, nilai, kode? }],
 * total?: { label, nilai } }]. Baris bernilai nol disembunyikan.
 */
export default function TabelLaporan({ bagian, akhir }) {
  return (
    <div className="flex flex-col gap-4">
      {bagian.map((b) => {
        const baris = b.baris.filter((x) => x.nilai !== 0);
        return (
          <section key={b.judul} className={K.kartuDaftar}>
            <h2 className={`${K.judulBaris} px-4 py-2.5 ${K.kepalaBagian}`}>{b.judul}</h2>
            {baris.length ? (
              <ul>
                {baris.map((x) => (
                  <li
                    key={x.label}
                    className={`${K.barisDaftar} px-4 py-2 flex justify-between gap-3`}
                  >
                    <span className={`${K.teks} min-w-0`}>
                      {x.kode && <span className={`${K.redup} mr-2`}>{x.kode}</span>}
                      {x.label}
                    </span>
                    <span className={`${K.teks} tabular-nums whitespace-nowrap`}>
                      {rupiah(x.nilai)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={`${K.redup} px-4 py-2 ${K.barisDaftar}`}>Tidak ada.</p>
            )}
            {b.total && (
              <div className={`${K.barisDaftar} px-4 py-2.5 flex justify-between gap-3`}>
                <span className={K.judulBaris}>{b.total.label}</span>
                <span className={K.nominal}>{rupiah(b.total.nilai)}</span>
              </div>
            )}
          </section>
        );
      })}
      {akhir && (
        <div className={`${K.kartu} flex justify-between gap-3`}>
          <span className={K.judulSeksi}>{akhir.label}</span>
          <span className={`${K.nominal} text-base`}>{rupiah(akhir.nilai)}</span>
        </div>
      )}
    </div>
  );
}
