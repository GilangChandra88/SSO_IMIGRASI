import React, { useState } from 'react';
import { FaEye, FaPen, FaSearch } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import { tahunIni } from '@/utils/nilai';
import { ADMIN, FONT, STATUS, T } from '@/utils/uiTokens';
import { ANIM, jedaKe } from '@/utils/animasi';
import { daftarTahun } from '../../../tahunAnggaran';
import { useDaftarNomor } from '../../hooks/useNomorSurat';
import EditNomorSuratModal from './EditNomorSuratModal';
import NomorSuratDetailModal from './NomorSuratDetailModal';
import { bolehUbahNomor, formatTanggalNomor, kodeKop, kodeLanjutan } from './nomorSuratTampil';

/**
 * Daftar nomor surat (tabel NomorSuratPage purwarupa): register satu tahun (`surat_nomor`, sumber
 * register), cari, Lihat/Edit. Edit untuk pemohon nomor atau Keuangan selama nomor belum batal.
 */
export default function RegisterNomorSurat() {
  const { currentUser, isKeuangan } = useAuth();
  const uid = currentUser?.uid || '';
  const [search, setSearch] = useState('');
  const [tahun, setTahun] = useState(tahunIni);
  const [lihat, setLihat] = useState(null);
  const [edit, setEdit] = useState(null);
  const { rows, loading, bisaLagi, memuatLagi, muatLagi } = useDaftarNomor({
    tahun,
    sumber: 'register',
  });

  const q = search.trim().toLowerCase();
  const filtered = q
    ? rows.filter((r) => `${r.perihal} ${r.tujuan} ${r.nomor} ${r.seksi}`.toLowerCase().includes(q))
    : rows;
  // Baris dibuka dari data terbaru supaya jendela ikut berubah bila datanya berubah
  const lihatRow = lihat ? rows.find((r) => r.id === lihat.id) || lihat : null;

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
          value={tahun}
          onChange={(e) => setTahun(Number(e.target.value))}
        >
          {daftarTahun().map((y) => (
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
                    ? `Belum ada nomor surat tahun ${tahun}. Klik "Tambah Nomor Surat" untuk membuat.`
                    : 'Tidak ada data yang cocok.'}
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => {
                const batal = r.status === 'batal';
                return (
                  <tr
                    key={r.id}
                    data-nomor={r.nomor}
                    className={`${ADMIN.tr} ${ANIM.muncul} ${jedaKe(i)}`}
                  >
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
                      <span
                        className={`${ADMIN.mono} font-semibold ${batal ? `line-through ${T.inkMuted}` : ''}`}
                      >
                        {r.nomor}
                      </span>
                      {batal && (
                        <span
                          className={`ml-1.5 text-[10.5px] font-bold px-1.5 py-0.5 rounded ${STATUS.critBg} ${STATUS.critInk}`}
                        >
                          Batal
                        </span>
                      )}
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
                        {bolehUbahNomor(r, { uid, isKeuangan }) && (
                          <button
                            type="button"
                            className={ADMIN.rowBtn}
                            title="Edit"
                            aria-label="Edit"
                            onClick={() => setEdit(r)}
                          >
                            <FaPen size={11} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {bisaLagi && (
        <div className="flex justify-center mt-3">
          <button type="button" className={ADMIN.btnGhost} onClick={muatLagi} disabled={memuatLagi}>
            {memuatLagi ? 'Memuat…' : 'Muat lebih banyak'}
          </button>
        </div>
      )}

      {lihatRow && <NomorSuratDetailModal row={lihatRow} onClose={() => setLihat(null)} />}
      {edit && <EditNomorSuratModal row={edit} onClose={() => setEdit(null)} />}
    </>
  );
}
