import { useMemo } from 'react';
import { FaArrowLeft } from 'react-icons/fa';
import { formatNip } from '@/utils/dataPegawai';
import { useKegiatanPeriode, useRekapHadir } from '../../hooks/useKehadiran';
import { tabelRiwayat } from '../../utils/eksporKehadiran';
import {
  STATUS_BY_ID,
  formatPersen,
  formatTanggal,
  hitungPersen,
  labelJenis,
  labelPeriode,
  predikatDari,
  totalTercatat,
} from '../../utils/kehadiran';
import { K, NADA_LENCANA } from '../../ui/kelas';
import TombolEkspor from './TombolEkspor';

/** Riwayat kehadiran satu pegawai per kegiatan pada periode terpilih (dari Rekap Kehadiran). */
export default function RiwayatPegawai({ pegawai, tahun, semester, onKembali }) {
  const { kegiatan, memuat } = useKegiatanPeriode(tahun, semester);
  const { rekap } = useRekapHadir(tahun, semester);
  const c = rekap.pegawai[pegawai.id];
  const total = totalTercatat(c);
  const persen = hitungPersen(c);
  const predikat = total ? predikatDari(persen) : null;
  const ringkas = predikat ? `${formatPersen(persen)} (${predikat.label})` : 'Belum ada data';

  const riwayat = useMemo(
    () =>
      kegiatan
        .filter((k) => k.aktif !== false)
        .map((k) => ({
          kegiatan: k,
          isi: k.kehadiran?.[pegawai.id] || null,
          catatan: k.kehadiran ? 'Tidak tercatat' : 'Belum diisi',
        })),
    [kegiatan, pegawai.id],
  );

  return (
    <>
      <button type="button" onClick={onKembali} className={`${K.tombolKedua} mb-4`}>
        <FaArrowLeft size={12} /> Kembali
      </button>

      <div className={K.kepala}>
        <div className="min-w-0">
          <h2 className={K.judulLayar}>{pegawai.nama}</h2>
          <p className={`text-[12.5px] mt-0.5 ${K.redup}`}>
            {[pegawai.nip ? `NIP ${formatNip(pegawai.nip)}` : '', labelPeriode(tahun, semester)]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`${K.lencana} ${predikat ? NADA_LENCANA[predikat.nada] : K.lencanaNetral}`}
          >
            {ringkas}
          </span>
          <TombolEkspor
            nonaktif={memuat || !riwayat.length}
            buatTabel={() => tabelRiwayat({ pegawai, riwayat, tahun, semester, ringkas })}
          />
        </div>
      </div>

      <div className={K.tabelWadah}>
        <table className={`${K.tabel} min-w-[640px]`}>
          <thead>
            <tr>
              <th className={`${K.th} w-12 text-center`}>No</th>
              <th className={K.th}>Kegiatan</th>
              <th className={K.th}>Tanggal</th>
              <th className={K.th}>Status</th>
              <th className={K.th}>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {!memuat && riwayat.length === 0 && (
              <tr>
                <td colSpan={5} className={K.kosong}>
                  Belum ada kegiatan pada periode ini.
                </td>
              </tr>
            )}
            {riwayat.map((r, i) => {
              const s = r.isi && STATUS_BY_ID[r.isi.status];
              return (
                <tr key={r.kegiatan.id} className={K.tr}>
                  <td className={`${K.td} text-center`}>
                    <span className={K.monoRedup}>{i + 1}</span>
                  </td>
                  <td className={K.td}>
                    <div className={`font-bold ${K.teks}`}>{r.kegiatan.nama}</div>
                    <span className={K.labelAksen}>{labelJenis(r.kegiatan.jenis)}</span>
                  </td>
                  <td className={K.td}>
                    <span className={K.mono}>{formatTanggal(r.kegiatan.tanggal)}</span>
                  </td>
                  <td className={K.td}>
                    {s ? (
                      <span className={`${K.lencana} ${NADA_LENCANA[s.nada]}`}>{s.label}</span>
                    ) : (
                      <span className={`text-[12px] ${K.redup}`}>{r.catatan}</span>
                    )}
                  </td>
                  <td className={K.td}>{r.isi?.keterangan || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
