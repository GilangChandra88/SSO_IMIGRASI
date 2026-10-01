import React, { useMemo, useState } from 'react';
import { FaEye, FaPen, FaSearch } from 'react-icons/fa';
import { ADMIN, FONT, T } from '@/utils/uiTokens';
import EditNomorSuratModal from './EditNomorSuratModal';
import NomorSuratDetailModal from './NomorSuratDetailModal';
import { formatTanggalNomor, kodeKop, kodeLanjutan } from './nomorSuratTampil';

/** Daftar nomor surat (tabel NomorSuratPage purwarupa): cari, filter tahun, Lihat/Edit. */
export default function RegisterNomorSurat({ rows, loading }) {
  const tahunIni = String(new Date().getFullYear());
  const [search, setSearch] = useState('');
  const [year, setYear] = useState(tahunIni);
  const [lihat, setLihat] = useState(null);
  const [edit, setEdit] = useState(null);

  const years = useMemo(() => {
    const s = new Set(rows.map((r) => String(r.tanggal || '').slice(0, 4)).filter(Boolean));
    s.add(tahunIni);
    return [...s].sort().reverse();
  }, [rows, tahunIni]);

  const q = search.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    const cocokCari =
      !q || `${r.perihal} ${r.tujuan} ${r.nomor} ${r.seksi}`.toLowerCase().includes(q);
    return cocokCari && (!year || String(r.tanggal || '').slice(0, 4) === year);
  });

  return (
    <>
      <div className="flex flex-wrap gap-2.5 items-center justify-between mb-3.5">
        <div className={ADMIN.search}>
          <FaSearch size={12} className="shrink-0" />
          <input
            type="search"
            className={ADMIN.searchInput}
            placeholder="Masukkan Pencarian"
            aria-label="Cari nomor surat"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={`${ADMIN.input} ${FONT.mono} max-w-[160px]`}
          aria-label="Pilih tahun"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div className={ADMIN.tableWrap}>
        <table className={`${ADMIN.table} min-w-[940px]`}>
          <thead>
            <tr>
              {[
                'No.',
                'Tgl',
                'Seksi',
                'KOP',
                'Kode Surat',
                'No Surat',
                'Perihal',
                'Tujuan',
                'Aksi',
              ].map((h) => (
                <th key={h} className={ADMIN.th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className={ADMIN.emptyRow}>
                  Memuat data...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className={ADMIN.emptyRow}>
                  {rows.length === 0
                    ? 'Belum ada nomor surat. Klik "Tambah Nomor Surat" untuk membuat.'
                    : 'Tidak ada data yang cocok.'}
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className={ADMIN.tr}>
                  <td className={ADMIN.td}>{r.nomorUrut || '-'}</td>
                  <td className={ADMIN.td}>
                    <span className={ADMIN.mono}>{formatTanggalNomor(r.tanggal)}</span>
                  </td>
                  <td className={ADMIN.td}>
                    {r.seksi ? <span className={ADMIN.tag}>{r.seksi}</span> : '-'}
                  </td>
                  <td className={ADMIN.td}>
                    <span className={ADMIN.mono}>{kodeKop(r)}</span>
                  </td>
                  <td className={ADMIN.td}>
                    <span className={ADMIN.mono}>{kodeLanjutan(r)}</span>
                  </td>
                  <td className={ADMIN.td}>
                    <span className={`${ADMIN.mono} font-semibold`}>{r.nomor}</span>
                  </td>
                  <td className={`${ADMIN.td} max-w-[320px]`}>{r.perihal}</td>
                  <td className={ADMIN.td}>
                    <span className={T.ink2}>{r.tujuan}</span>
                  </td>
                  <td className={ADMIN.td}>
                    <div className="flex gap-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        className={ADMIN.rowBtn}
                        title="Lihat"
                        aria-label="Lihat"
                        onClick={() => setLihat(r)}
                      >
                        <FaEye size={13} />
                      </button>
                      <button
                        type="button"
                        className={ADMIN.rowBtn}
                        title="Edit"
                        aria-label="Edit"
                        onClick={() => setEdit(r)}
                      >
                        <FaPen size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {lihat && <NomorSuratDetailModal row={lihat} onClose={() => setLihat(null)} />}
      {edit && <EditNomorSuratModal row={edit} onClose={() => setEdit(null)} />}
    </>
  );
}
