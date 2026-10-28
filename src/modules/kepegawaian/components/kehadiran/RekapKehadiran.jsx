import { useMemo, useState } from 'react';
import { FaExclamationTriangle, FaSearch } from 'react-icons/fa';
import { formatNip } from '@/utils/dataPegawai';
import { useRekapHadir } from '../../hooks/useKehadiran';
import { tabelRekap } from '../../utils/eksporKehadiran';
import { STATUS_HADIR, barisRekap, formatPersen, labelPeriode } from '../../utils/kehadiran';
import { K, NADA_LENCANA, PROGRES_NADA } from '../../ui/kelas';
import PilihPeriode from './PilihPeriode';
import TombolEkspor from './TombolEkspor';

/**
 * Tab Rekap Kehadiran: angka dari pegawai_rekap_hadir (ditulis Function). Total Kegiatan per
 * pegawai = kegiatan yang kehadirannya sudah disimpan dan mencatat pegawai itu; kegiatan yang
 * belum diisi hanya diperingatkan. Klik baris untuk riwayat per kegiatan.
 */
export default function RekapKehadiran({ tahun, semester, pegawai, onPeriode, onBuka }) {
  const { rekap, memuat } = useRekapHadir(tahun, semester);
  const [cari, setCari] = useState('');
  const baris = useMemo(() => barisRekap(pegawai, rekap), [pegawai, rekap]);
  const q = cari.trim().toLowerCase();
  const tampil = baris.filter(
    (r) => !q || `${r.pegawai.nama} ${r.pegawai.nip}`.toLowerCase().includes(q),
  );
  const kosong = rekap.kegiatan - rekap.kegiatanTerisi;

  return (
    <>
      <div className={K.toolbar}>
        <label className={K.cari}>
          <FaSearch size={12} />
          <span className="sr-only">Cari pegawai</span>
          <input
            type="search"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari nama atau NIP…"
            className={K.cariInput}
          />
        </label>
        <PilihPeriode tahun={tahun} semester={semester} onUbah={onPeriode} />
        <div className="sm:ml-auto">
          <TombolEkspor
            nonaktif={memuat || !baris.length}
            buatTabel={() =>
              tabelRekap({ baris, tahun, semester, kegiatanTerisi: rekap.kegiatanTerisi })
            }
          />
        </div>
      </div>

      <p className={`text-[12.5px] mb-3 ${K.redup}`}>
        {memuat
          ? 'Memuat rekap…'
          : `${labelPeriode(tahun, semester)} · ${rekap.kegiatanTerisi} kegiatan terisi · angka diperbarui otomatis beberapa detik setelah kehadiran disimpan.`}
      </p>
      {kosong > 0 && (
        <p className={K.peringatan}>
          <FaExclamationTriangle className="mt-0.5 shrink-0" />
          <span>
            {kosong} kegiatan belum diisi kehadirannya, jadi belum dihitung di rekap. Isi dari tab
            Absensi Kegiatan.
          </span>
        </p>
      )}

      <div className={K.tabelWadah}>
        <table className={`${K.tabel} min-w-[860px]`}>
          <thead>
            <tr>
              <th className={`${K.th} w-12 text-center`}>No</th>
              <th className={K.th}>Nama Pegawai</th>
              {STATUS_HADIR.map((s) => (
                <th key={s.id} className={`${K.th} text-center`}>
                  {s.label}
                </th>
              ))}
              <th className={`${K.th} text-center`}>Total Kegiatan</th>
              <th className={`${K.th} min-w-[170px]`}>% Hadir</th>
              <th className={K.th}>Predikat</th>
            </tr>
          </thead>
          <tbody>
            {!memuat && tampil.length === 0 && (
              <tr>
                <td colSpan={9} className={K.kosong}>
                  {q ? 'Tidak ada pegawai yang cocok.' : 'Belum ada pegawai.'}
                </td>
              </tr>
            )}
            {tampil.map((r, i) => (
              <tr
                key={r.pegawai.id}
                onClick={() => onBuka(r.pegawai.id)}
                className={`${K.tr} cursor-pointer`}
              >
                <td className={`${K.td} text-center`}>
                  <span className={K.monoRedup}>{i + 1}</span>
                </td>
                <td className={K.td}>
                  <div className={`font-bold ${K.teks}`}>{r.pegawai.nama}</div>
                  <div className={`text-[11.5px] ${K.redup}`}>
                    {r.pegawai.nip ? formatNip(r.pegawai.nip) : 'Tanpa NIP'}
                  </div>
                </td>
                {STATUS_HADIR.map((s) => (
                  <td key={s.id} className={`${K.td} text-center tabular-nums`}>
                    <span
                      className={
                        s.id === 'alpa' && r.c.alpa ? `font-extrabold ${K.teksBahaya}` : ''
                      }
                    >
                      {r.c[s.id]}
                    </span>
                  </td>
                ))}
                <td className={`${K.td} text-center font-bold tabular-nums`}>{r.total}</td>
                <td className={K.td}>
                  {r.total ? (
                    <div className="flex items-center gap-2.5">
                      <progress
                        value={r.persen}
                        max={100}
                        aria-label={`% hadir ${r.pegawai.nama}`}
                        className={PROGRES_NADA[r.predikat.nada]}
                      />
                      <span className="w-[68px] shrink-0 text-right font-bold tabular-nums">
                        {formatPersen(r.persen)}
                      </span>
                    </div>
                  ) : (
                    <span className={K.redup}>—</span>
                  )}
                </td>
                <td className={K.td}>
                  {r.predikat ? (
                    <span className={`${K.lencana} ${NADA_LENCANA[r.predikat.nada]}`}>
                      {r.predikat.label}
                    </span>
                  ) : (
                    <span className={`text-[12px] ${K.redup}`}>Belum ada data</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
