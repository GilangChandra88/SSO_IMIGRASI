import { useMemo, useState } from 'react';
import { FaCheck, FaClipboardCheck, FaPlus, FaSearch } from 'react-icons/fa';
import { useKegiatanPeriode } from '../../hooks/useKehadiran';
import { formatTanggal, labelJenis, labelPeriode } from '../../utils/kehadiran';
import { K } from '../../ui/kelas';
import PilihPeriode from './PilihPeriode';

/** Jumlah hadir dari peta kehadiran tersimpan. */
const ringkasHadir = (peta) => {
  const isi = Object.values(peta || {});
  return { hadir: isi.filter((x) => x.status === 'hadir').length, total: isi.length };
};

/**
 * Tab Absensi Kegiatan: daftar kegiatan satu periode (terbaru dulu). Klik baris untuk mengisi atau
 * melihat/memperbarui kehadirannya; kegiatan batal disembunyikan kecuali diminta.
 */
export default function DaftarKegiatan({ tahun, semester, onPeriode, onBuka, onTambah }) {
  const { kegiatan, memuat } = useKegiatanPeriode(tahun, semester);
  const [cari, setCari] = useState('');
  const [tampilBatal, setTampilBatal] = useState(false);

  const aktif = kegiatan.filter((k) => k.aktif !== false);
  const terisi = aktif.filter((k) => k.kehadiran).length;
  const jumlahBatal = kegiatan.length - aktif.length;
  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return kegiatan.filter(
      (k) =>
        (tampilBatal || k.aktif !== false) &&
        (!q || `${k.nama} ${k.tempat} ${labelJenis(k.jenis)}`.toLowerCase().includes(q)),
    );
  }, [kegiatan, cari, tampilBatal]);

  return (
    <>
      <div className={K.toolbar}>
        <label className={K.cari}>
          <FaSearch size={12} />
          <span className="sr-only">Cari kegiatan</span>
          <input
            type="search"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari kegiatan…"
            className={K.cariInput}
          />
        </label>
        <PilihPeriode tahun={tahun} semester={semester} onUbah={onPeriode} />
        <button type="button" onClick={onTambah} className={`${K.tombolTambah} sm:ml-auto`}>
          <FaPlus size={11} className={K.aksen} /> Tambah Kegiatan
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className={`text-[12.5px] ${K.redup}`}>
          {memuat
            ? 'Memuat kegiatan…'
            : `${labelPeriode(tahun, semester)} · ${aktif.length} kegiatan · ${terisi} sudah diisi · ${aktif.length - terisi} belum diisi`}
        </p>
        {jumlahBatal > 0 && (
          <label className={`flex items-center gap-2 text-[12.5px] cursor-pointer ${K.teks2}`}>
            <input
              type="checkbox"
              checked={tampilBatal}
              onChange={(e) => setTampilBatal(e.target.checked)}
              className={K.centang}
            />
            Tampilkan {jumlahBatal} kegiatan batal
          </label>
        )}
      </div>

      <div className={K.tabelWadah}>
        <table className={`${K.tabel} min-w-[760px]`}>
          <thead>
            <tr>
              <th className={`${K.th} w-12 text-center`}>No</th>
              <th className={K.th}>Nama Kegiatan</th>
              <th className={K.th}>Tanggal</th>
              <th className={K.th}>Jam</th>
              <th className={K.th}>Tempat</th>
              <th className={K.th}>Kehadiran</th>
            </tr>
          </thead>
          <tbody>
            {!memuat && tampil.length === 0 && (
              <tr>
                <td colSpan={6} className={K.kosong}>
                  {cari
                    ? 'Tidak ada kegiatan yang cocok dengan pencarian.'
                    : 'Belum ada kegiatan pada periode ini. Tekan Tambah Kegiatan untuk membuat yang baru.'}
                </td>
              </tr>
            )}
            {tampil.map((k, i) => {
              const batal = k.aktif === false;
              const r = ringkasHadir(k.kehadiran);
              return (
                <tr
                  key={k.id}
                  onClick={batal ? undefined : () => onBuka(k.id)}
                  className={`${K.tr} ${batal ? 'opacity-60' : 'cursor-pointer'}`}
                >
                  <td className={`${K.td} text-center`}>
                    <span className={`${K.monoRedup}`}>{i + 1}</span>
                  </td>
                  <td className={K.td}>
                    <div className={`font-bold ${K.teks} ${batal ? 'line-through' : ''}`}>
                      {k.nama}
                    </div>
                    <span className={K.labelAksen}>{labelJenis(k.jenis)}</span>
                  </td>
                  <td className={K.td}>
                    <span className={K.mono}>{formatTanggal(k.tanggal)}</span>
                  </td>
                  <td className={K.td}>
                    <span className={K.mono}>{k.jam}</span>
                  </td>
                  <td className={K.td}>{k.tempat}</td>
                  <td className={K.td}>
                    {batal ? (
                      <span
                        className={`${K.lencana} ${K.lencanaNetral}`}
                        title={`Alasan: ${k.alasanBatal}`}
                      >
                        Dibatalkan
                      </span>
                    ) : k.kehadiran ? (
                      <div>
                        <span className={`${K.lencana} ${K.lencanaOk}`}>
                          <FaCheck size={9} /> Tersimpan
                        </span>
                        <div className={`text-[11.5px] mt-1 ${K.redup}`}>
                          {r.hadir} dari {r.total} hadir
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onBuka(k.id);
                        }}
                        className={K.tombolKecil}
                      >
                        <FaClipboardCheck className={K.aksen} /> Isi kehadiran
                      </button>
                    )}
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
