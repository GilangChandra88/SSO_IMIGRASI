import { useMemo, useState } from 'react';
import { FaListOl, FaPlus, FaSearch } from 'react-icons/fa';
import { useDaftarRekapAbsensi, useNoAbsen } from '../../hooks/useAbsensi';
import { formatRentang, formatWaktu } from '../../utils/absensi';
import { K } from '../../ui/kelas';

/**
 * Daftar rekapan absensi (terbaru dulu). Klik baris untuk membuka rekapan: impor CSV dan rekap
 * bulanan. Rekapan batal disembunyikan kecuali diminta.
 */
export default function DaftarRekapAbsensi({ onBuka, onTambah, onAturNo }) {
  const { rekapan, memuat } = useDaftarRekapAbsensi();
  const { noAbsen, siap } = useNoAbsen();
  const adaNoAbsen = !siap || Object.keys(noAbsen).length > 0;
  const [cari, setCari] = useState('');
  const [tampilBatal, setTampilBatal] = useState(false);

  const aktif = rekapan.filter((r) => r.aktif !== false);
  const jumlahBatal = rekapan.length - aktif.length;
  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return rekapan.filter(
      (r) =>
        (tampilBatal || r.aktif !== false) &&
        (!q || `${r.nama} ${r.keterangan}`.toLowerCase().includes(q)),
    );
  }, [rekapan, cari, tampilBatal]);

  return (
    <>
      {!adaNoAbsen && (
        <div className={`${K.peringatan} flex-wrap justify-between`}>
          <span>
            No. absen (nomor pegawai di mesin) belum diatur. Atur dulu supaya rekap memakai nama
            dari Data Pegawai, atau langsung impor CSV: No. di berkas akan tercatat dan bisa
            dipetakan saat impor.
          </span>
          <button type="button" onClick={onAturNo} className={K.tombolKecil}>
            <FaListOl className={K.aksen} /> Atur No. Absen
          </button>
        </div>
      )}

      <div className={K.toolbar}>
        <label className={K.cari}>
          <FaSearch size={12} />
          <span className="sr-only">Cari rekapan</span>
          <input
            type="search"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari rekapan…"
            className={K.cariInput}
          />
        </label>
        <button type="button" onClick={onTambah} className={`${K.tombolTambah} sm:ml-auto`}>
          <FaPlus size={11} className={K.aksen} /> Buat Rekapan
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className={`text-[12.5px] ${K.redup}`}>
          {memuat ? 'Memuat rekapan…' : `${aktif.length} rekapan`}
        </p>
        {jumlahBatal > 0 && (
          <label className={`flex items-center gap-2 text-[12.5px] cursor-pointer ${K.teks2}`}>
            <input
              type="checkbox"
              checked={tampilBatal}
              onChange={(e) => setTampilBatal(e.target.checked)}
              className={K.centang}
            />
            Tampilkan {jumlahBatal} rekapan batal
          </label>
        )}
      </div>

      <div className={K.tabelWadah}>
        <table className={`${K.tabel} min-w-[720px]`}>
          <thead>
            <tr>
              <th className={`${K.th} w-12 text-center`}>No</th>
              <th className={K.th}>Nama Rekapan</th>
              <th className={K.th}>Periode Data</th>
              <th className={`${K.th} text-center`}>Impor</th>
              <th className={K.th}>Diperbarui</th>
            </tr>
          </thead>
          <tbody>
            {!memuat && tampil.length === 0 && (
              <tr>
                <td colSpan={5} className={K.kosong}>
                  {cari
                    ? 'Tidak ada rekapan yang cocok dengan pencarian.'
                    : 'Belum ada rekapan. Tekan Buat Rekapan untuk memulai.'}
                </td>
              </tr>
            )}
            {tampil.map((r, i) => {
              const batal = r.aktif === false;
              return (
                <tr
                  key={r.id}
                  onClick={batal ? undefined : () => onBuka(r.id)}
                  className={`${K.tr} ${batal ? 'opacity-60' : 'cursor-pointer'}`}
                >
                  <td className={`${K.td} text-center`}>
                    <span className={K.monoRedup}>{i + 1}</span>
                  </td>
                  <td className={K.td}>
                    <div className={`font-bold ${K.teks} ${batal ? 'line-through' : ''}`}>
                      {r.nama}
                    </div>
                    {r.keterangan && <div className={`text-[12px] ${K.redup}`}>{r.keterangan}</div>}
                    {batal && (
                      <span
                        className={`${K.lencana} ${K.lencanaNetral} mt-1`}
                        title={`Alasan: ${r.alasanBatal}`}
                      >
                        Dibatalkan
                      </span>
                    )}
                  </td>
                  <td className={K.td}>
                    {r.dari ? (
                      <span className="whitespace-nowrap">{formatRentang(r.dari, r.sampai)}</span>
                    ) : (
                      <span className={K.redup}>Belum ada data</span>
                    )}
                  </td>
                  <td className={`${K.td} text-center tabular-nums`}>{r.jumlahImpor || 0}</td>
                  <td className={K.td}>
                    <span className={K.monoRedup}>{formatWaktu(r.diubahPada)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
