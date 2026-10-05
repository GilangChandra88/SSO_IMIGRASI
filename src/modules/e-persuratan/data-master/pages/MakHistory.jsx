/**
 * History MAK (MakHistoryPage purwarupa admin): log realisasi anggaran dari `MAK_History`,
 * dengan filter bulan/tahun/status, total transaksi aktif, dan Batalkan/Pulihkan (Super Admin).
 */
import React, { useMemo, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { FaCheck, FaHistory, FaSearch, FaTimes } from 'react-icons/fa';
import { db } from '@/config/firebase';
import { formatRupiah } from '@/components/StrukturHierarki/hierarkiUtils';
import ToastViewport from '@/components/ToastViewport';
import { useAuth } from '@/context/AuthContext';
import { showToast } from '@/utils/toastStore';
import { ADMIN, FONT, STATUS, T } from '@/utils/uiTokens';
import { useMakHistory } from '../hooks/useMakData';
import { BULAN_NAMES, formatTanggalID } from '../utils/makUtils';

const PILL =
  'inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[.03em] px-[9px] py-[3px] rounded-full whitespace-nowrap';
const AKSI_BTN = `w-[30px] h-[30px] rounded-lg grid place-items-center mx-auto cursor-pointer ${T.hoverSurface2}`;

export default function MakHistory() {
  const { isSuperAdmin } = useAuth();
  const { data: history, loading } = useMakHistory();
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [prosesId, setProsesId] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return history.filter((item) => {
      if (filterMonth !== 0 && item.bulan !== filterMonth) return false;
      if (filterYear && item.tahun !== filterYear) return false;
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      if (q) {
        const s =
          `${item.makString} ${item.itemName} ${item.uraian} ${item.suratRef?.pegawai || ''} ${item.suratRef?.kode || ''}`.toLowerCase();
        if (!s.includes(q)) return false;
      }
      return true;
    });
  }, [history, filterMonth, filterYear, filterStatus, search]);

  const total = filtered
    .filter((h) => h.status === 'active')
    .reduce((s, h) => s + (Number(h.jumlah) || 0), 0);

  const ubahStatus = async (item, status) => {
    setProsesId(item.id);
    try {
      await updateDoc(doc(db, 'MAK_History', item.id), {
        status,
        updatedAt: new Date().toISOString(),
      });
      showToast(status === 'cancelled' ? 'Transaksi dibatalkan.' : 'Transaksi dipulihkan.');
    } catch {
      showToast('Gagal mengubah status transaksi.', 'error');
    } finally {
      setProsesId(null);
    }
  };

  const kolom = isSuperAdmin ? 7 : 6;

  return (
    <div className={`min-h-full ${T.ground}`}>
      <div className={ADMIN.page}>
        <section className={ADMIN.card}>
          <div className="mb-4">
            <h1 className={`${ADMIN.h1} flex items-center gap-[9px]`}>
              <FaHistory size={18} className={STATUS.infoInk} />
              History MAK
            </h1>
            <p className={`text-[13.5px] mt-[5px] ${T.inkMuted}`}>
              Log pencatatan realisasi anggaran dari surat/transaksi.
            </p>
          </div>

          <div className={ADMIN.toolbar}>
            <div className={ADMIN.search}>
              <FaSearch size={12} className="shrink-0" />
              <input
                type="search"
                className={ADMIN.searchInput}
                placeholder="Cari uraian, pegawai, MAK..."
                aria-label="Cari history MAK"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-[7px] shrink-0">
              <select
                aria-label="Pilih bulan"
                className={ADMIN.control}
                value={filterMonth}
                onChange={(e) => setFilterMonth(Number(e.target.value))}
              >
                <option value={0}>Semua Bulan</option>
                {BULAN_NAMES.map((name, i) => (
                  <option value={i + 1} key={name}>
                    {name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                aria-label="Pilih tahun"
                className={`${ADMIN.control} w-[78px]`}
                value={filterYear}
                onChange={(e) => setFilterYear(Number(e.target.value))}
              />
              <select
                aria-label="Filter status"
                className={ADMIN.control}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="cancelled">Dibatalkan</option>
              </select>
            </div>
          </div>

          <div
            className={`flex justify-between items-center gap-3 border rounded-t-[14px] px-4 py-3 text-[13px] font-semibold ${T.surface2} ${T.border} ${T.ink2}`}
          >
            <span>Total Transaksi Aktif (Filter):</span>
            <strong className={`${FONT.mono} text-base ${STATUS.infoInk}`}>
              Rp {formatRupiah(total)}
            </strong>
          </div>
          <div className={`border border-t-0 rounded-b-[14px] overflow-x-auto ${T.border}`}>
            <table className={`${ADMIN.table} min-w-[840px]`}>
              <thead>
                <tr>
                  <th className={ADMIN.th}>Tanggal</th>
                  <th className={ADMIN.th}>Sumber / Pegawai</th>
                  <th className={ADMIN.th}>MAK / Item</th>
                  <th className={ADMIN.th}>Uraian</th>
                  <th className={`${ADMIN.thBase} text-right`}>Jumlah (Rp)</th>
                  <th className={`${ADMIN.thBase} text-center`}>Status</th>
                  {isSuperAdmin && <th className={`${ADMIN.thBase} text-center`}>Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={kolom} className={ADMIN.emptyRow}>
                      Memuat history transaksi...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={kolom} className={ADMIN.emptyRow}>
                      Tidak ada riwayat transaksi ditemukan.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => {
                    const aktif = item.status === 'active';
                    return (
                      <tr key={item.id} className={`${ADMIN.tr} ${aktif ? '' : 'opacity-55'}`}>
                        <td className={ADMIN.td}>
                          <span className={ADMIN.mono}>{formatTanggalID(item.tanggal)}</span>
                        </td>
                        <td className={ADMIN.td}>
                          <div className="font-semibold">{item.suratRef?.kode || 'Manual'}</div>
                          <div
                            className={`text-[11.5px] mt-0.5 max-w-[220px] truncate ${T.inkMuted}`}
                            title={item.suratRef?.pegawai}
                          >
                            {item.suratRef?.pegawai || '-'}
                          </div>
                        </td>
                        <td className={ADMIN.td}>
                          <div
                            className={`${FONT.mono} text-[10px] mb-0.5 max-w-[230px] truncate ${T.inkMuted}`}
                            title={item.makString}
                          >
                            {item.makString}
                          </div>
                          <span className={ADMIN.tag}>
                            {item.itemKode} - {item.itemName}
                          </span>
                        </td>
                        <td className={`${ADMIN.td} max-w-[230px]`}>{item.uraian || '-'}</td>
                        <td className={`${ADMIN.td} text-right`}>
                          <span className={`${FONT.mono} font-bold whitespace-nowrap`}>
                            {formatRupiah(item.jumlah)}
                          </span>
                        </td>
                        <td className={`${ADMIN.td} text-center`}>
                          {aktif ? (
                            <span className={`${PILL} ${STATUS.goodBg} ${STATUS.goodInk}`}>
                              <FaCheck size={8} />
                              Aktif
                            </span>
                          ) : (
                            <span className={`${PILL} ${STATUS.critBg} ${STATUS.critInk}`}>
                              <FaTimes size={8} />
                              Dibatalkan
                            </span>
                          )}
                        </td>
                        {isSuperAdmin && (
                          <td className={`${ADMIN.td} text-center`}>
                            {aktif ? (
                              <button
                                type="button"
                                className={`${AKSI_BTN} ${STATUS.critInk}`}
                                title="Batalkan Transaksi"
                                aria-label="Batalkan Transaksi"
                                disabled={prosesId === item.id}
                                onClick={() => ubahStatus(item, 'cancelled')}
                              >
                                <FaTimes size={12} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                className={`${AKSI_BTN} ${STATUS.goodInk}`}
                                title="Pulihkan Transaksi"
                                aria-label="Pulihkan Transaksi"
                                disabled={prosesId === item.id}
                                onClick={() => ubahStatus(item, 'active')}
                              >
                                <FaCheck size={12} />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <ToastViewport />
    </div>
  );
}
