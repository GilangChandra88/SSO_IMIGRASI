import React, { useState } from 'react';
import { FaEye, FaSearch } from 'react-icons/fa';
import { ADMIN, STATUS, T } from '@/utils/uiTokens';
import PreviewSuratModal from './PreviewSuratModal';

/** Riwayat surat yang dibuat lewat form surat (surat_perintah + surat_dokumen). */
export default function RiwayatSurat({ rows, loading }) {
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState(null);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? rows.filter((s) =>
        `${s.nomor} ${s.templateNama || ''} ${s.untuk?.[0] || ''} ${s.kepada?.[0]?.nama || ''}`
          .toLowerCase()
          .includes(q),
      )
    : rows;

  return (
    <>
      <p className={`text-[12.5px] leading-[1.6] mb-3.5 ${T.inkMuted}`}>
        Daftar surat yang nomornya dibuat melalui form pembuatan surat.
      </p>
      <div className="flex flex-wrap gap-2.5 items-center mb-3.5">
        <div className={ADMIN.search}>
          <FaSearch size={12} className="shrink-0" />
          <input
            type="search"
            className={ADMIN.searchInput}
            placeholder="Cari nomor, perihal, atau pegawai"
            aria-label="Cari riwayat surat"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className={ADMIN.tableWrap}>
        <table className={`${ADMIN.table} min-w-[860px]`}>
          <thead>
            <tr>
              <th className={ADMIN.th}>Tanggal</th>
              <th className={ADMIN.th}>Nomor Surat</th>
              <th className={ADMIN.th}>Perihal / Untuk</th>
              <th className={ADMIN.th}>Penugasan</th>
              <th className={`${ADMIN.thBase} text-right`}>Dibuat Pada</th>
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
                    ? 'Belum ada riwayat surat keluar.'
                    : 'Tidak ada data yang cocok.'}
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className={ADMIN.tr}>
                  <td className={ADMIN.td}>
                    <span className={ADMIN.mono}>
                      {s.tanggal ? new Date(s.tanggal).toLocaleDateString('id-ID') : '-'}
                    </span>
                  </td>
                  <td className={ADMIN.td}>
                    <span className={`${ADMIN.mono} font-semibold`}>{s.nomor}</span>
                  </td>
                  <td className={`${ADMIN.td} max-w-[320px]`}>
                    <span className="line-clamp-2" title={s.templateNama || s.untuk?.[0]}>
                      {s.templateNama || s.untuk?.[0] || '-'}
                    </span>
                  </td>
                  <td className={ADMIN.td}>
                    {s.kepada?.length > 0 ? (
                      <div className="flex flex-col">
                        <span className="font-semibold">{s.kepada[0].nama}</span>
                        {s.kepada.length > 1 && (
                          <span className={`text-xs mt-0.5 ${STATUS.infoInk}`}>
                            +{s.kepada.length - 1} pegawai lainnya
                          </span>
                        )}
                      </div>
                    ) : s.templateId ? (
                      <span className={ADMIN.tag}>Template Bebas</span>
                    ) : (
                      <span className={T.inkMuted}>-</span>
                    )}
                  </td>
                  <td className={`${ADMIN.td} text-right`}>
                    <span className={`text-xs whitespace-nowrap ${T.inkMuted}`}>
                      {s.createdAt ? new Date(s.createdAt).toLocaleString('id-ID') : '-'}
                    </span>
                  </td>
                  <td className={`${ADMIN.td} text-center`}>
                    <button
                      type="button"
                      className={`${ADMIN.rowBtn} mx-auto`}
                      title="Lihat"
                      aria-label="Lihat"
                      onClick={() => setPreview(s)}
                    >
                      <FaEye size={13} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {preview && <PreviewSuratModal surat={preview} onClose={() => setPreview(null)} />}
    </>
  );
}
