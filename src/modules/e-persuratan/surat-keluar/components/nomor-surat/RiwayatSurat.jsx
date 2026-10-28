import React, { useState } from 'react';
import { FaEye, FaSearch } from 'react-icons/fa';
import { usePegawaiRingkas } from '@/context/usePegawaiRingkas';
import { keDate, tahunIni } from '@/utils/nilai';
import { ADMIN, FONT, STATUS, T } from '@/utils/uiTokens';
import { ANIM, jedaKe } from '@/utils/animasi';
import { daftarTahun } from '../../../tahunAnggaran';
import { useDaftarNomor } from '../../hooks/useNomorSurat';
import NomorSuratDetailModal from './NomorSuratDetailModal';
import { LABEL_SUMBER, formatTanggalNomor } from './nomorSuratTampil';

const SUMBER = ['form', 'srikandi'];
const KETERANGAN = {
  form: 'Nomor yang dibuat lewat tombol Generate di form pembuatan surat.',
  srikandi:
    'Nomor Surat Perintah ber-TTE dari Srikandi yang dicatat saat fase TTE berkas LPJ selesai.',
};

/**
 * Riwayat surat keluar selain Daftar Nomor (`surat_nomor` sumber form & srikandi), satu tahun.
 * Isi surat tidak disimpan di database; yang tercatat hanya data register nomornya.
 */
export default function RiwayatSurat() {
  const [sumber, setSumber] = useState('form');
  const [tahun, setTahun] = useState(tahunIni);
  const [search, setSearch] = useState('');
  const [lihat, setLihat] = useState(null);
  const { semua: pegawai } = usePegawaiRingkas();
  const namaAkun = (uid) => (uid && pegawai.find((p) => p.authUid === uid)?.nama) || '';
  const { rows, loading, bisaLagi, memuatLagi, muatLagi } = useDaftarNomor({ tahun, sumber });

  const q = search.trim().toLowerCase();
  const filtered = q
    ? rows.filter((s) =>
        `${s.nomor} ${s.jenisSurat || ''} ${s.perihal || ''} ${s.tujuan || ''}`
          .toLowerCase()
          .includes(q),
      )
    : rows;
  const lihatRow = lihat ? rows.find((r) => r.id === lihat.id) || lihat : null;

  return (
    <>
      <div className={`${ADMIN.seg} w-fit mb-3`} role="tablist" aria-label="Sumber nomor">
        {SUMBER.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={sumber === s}
            className={sumber === s ? ADMIN.segActive : ADMIN.segBtn}
            onClick={() => setSumber(s)}
          >
            {LABEL_SUMBER[s]}
          </button>
        ))}
      </div>
      <p className={`text-[12.5px] leading-[1.6] mb-3.5 ${T.inkMuted}`}>{KETERANGAN[sumber]}</p>
      <div className="flex flex-wrap gap-2.5 items-center justify-between mb-3.5">
        <div className={ADMIN.search}>
          <FaSearch size={12} className="shrink-0" />
          <input
            type="search"
            className={ADMIN.searchInput}
            placeholder="Cari nomor, jenis surat, perihal, atau tujuan"
            aria-label="Cari riwayat surat"
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
        <table className={`${ADMIN.table} min-w-[860px]`}>
          <thead>
            <tr>
              <th className={ADMIN.th}>Tanggal</th>
              <th className={ADMIN.th}>Nomor Surat</th>
              <th className={ADMIN.th}>Jenis / Perihal</th>
              <th className={ADMIN.th}>Tujuan</th>
              <th className={`${ADMIN.thBase} text-right`}>Dibuat</th>
              <th className={`${ADMIN.thBase} text-center`}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className={ADMIN.emptyRow}>
                  Memuat data...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className={ADMIN.emptyRow}>
                  {rows.length === 0
                    ? `Belum ada riwayat surat tahun ${tahun}.`
                    : 'Tidak ada data yang cocok.'}
                </td>
              </tr>
            ) : (
              filtered.map((s, i) => {
                const batal = s.status === 'batal';
                const oleh = namaAkun(s.dibuatOleh);
                return (
                  <tr key={s.id} className={`${ADMIN.tr} ${ANIM.muncul} ${jedaKe(i)}`}>
                    <td className={ADMIN.td}>
                      <span className={ADMIN.mono}>{formatTanggalNomor(s.tanggal)}</span>
                    </td>
                    <td className={ADMIN.td}>
                      <span
                        className={`${ADMIN.mono} font-semibold ${batal ? `line-through ${T.inkMuted}` : ''}`}
                      >
                        {s.nomor}
                      </span>
                      {batal && (
                        <span
                          className={`ml-1.5 text-[10.5px] font-bold px-1.5 py-0.5 rounded ${STATUS.critBg} ${STATUS.critInk}`}
                        >
                          Batal
                        </span>
                      )}
                    </td>
                    <td className={`${ADMIN.td} max-w-[320px]`}>
                      {s.jenisSurat && <div className="font-semibold">{s.jenisSurat}</div>}
                      <span className={`line-clamp-2 ${T.ink2}`} title={s.perihal}>
                        {s.perihal || '-'}
                      </span>
                    </td>
                    <td className={ADMIN.td}>
                      <span className={T.ink2}>{s.tujuan || '-'}</span>
                    </td>
                    <td className={`${ADMIN.td} text-right`}>
                      <span className={`text-xs whitespace-nowrap ${T.inkMuted}`}>
                        {keDate(s.dibuatPada)?.toLocaleString('id-ID') || '-'}
                        {oleh && <span className="block">{oleh}</span>}
                      </span>
                    </td>
                    <td className={`${ADMIN.td} text-center`}>
                      <button
                        type="button"
                        className={`${ADMIN.rowBtn} mx-auto`}
                        title="Lihat"
                        aria-label="Lihat"
                        onClick={() => setLihat(s)}
                      >
                        <FaEye size={13} />
                      </button>
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
    </>
  );
}
