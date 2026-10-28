/**
 * History MAK (MakHistoryPage purwarupa admin): log realisasi anggaran dari `mak_realisasi`
 * (ditulis Cloud Function saat SPBy selesai), dengan filter tahun anggaran/bulan/status, total
 * transaksi aktif (dari `mak_rekap`), dan Batalkan/Pulihkan lewat Function (Super Admin).
 */
import React, { useMemo, useState } from 'react';
import { FaCheck, FaHistory, FaSearch, FaTimes } from 'react-icons/fa';
import { formatRupiah } from '@/components/StrukturHierarki/hierarkiUtils';
import ToastViewport from '@/components/ToastViewport';
import { useAuth } from '@/context/AuthContext';
import { usePegawaiRingkas } from '@/context/usePegawaiRingkas';
import { tahunIni } from '@/utils/nilai';
import { pesanGalat } from '@/utils/pesanGalat';
import { showToast } from '@/utils/toastStore';
import { ADMIN, FONT, STATUS, T } from '@/utils/uiTokens';
import { ANIM, jedaKe } from '@/utils/animasi';
import { AngkaBerjalan } from '@/components/animasi';
import ModalBatalRealisasi from '../components/ModalBatalRealisasi';
import { useRealisasi, useRekapMak } from '../hooks/useMakData';
import { batalkanRealisasi, pulihkanRealisasi } from '../services/makDb';
import { BULAN_NAMES, formatTanggalID } from '../utils/makUtils';

const PILL =
  'inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[.03em] px-[9px] py-[3px] rounded-full whitespace-nowrap';
const AKSI_BTN = `w-[30px] h-[30px] rounded-lg grid place-items-center mx-auto cursor-pointer ${T.hoverSurface2}`;
const JENIS = { perjadin: 'Perjalanan Dinas', nonperjadin: 'Non-Perjalanan Dinas' };

export default function MakHistory() {
  const { isSuperAdmin } = useAuth();
  const { byId: pegawaiById } = usePegawaiRingkas();
  const [tahun, setTahun] = useState(tahunIni);
  const [tahunTeks, setTahunTeks] = useState(() => String(tahunIni()));
  const [filterMonth, setFilterMonth] = useState(0);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [prosesId, setProsesId] = useState(null);
  const [batal, setBatal] = useState(null); // realisasi yang sedang dibatalkan

  const { realisasi, memuat, bisaLagi, memuatLagi, muatLagi, ubahBaris } = useRealisasi({
    tahunAnggaran: tahun,
    bulan: filterMonth,
  });
  const { rekap } = useRekapMak(tahun);

  const namaPelaksana = (id) => pegawaiById[id]?.nama || '-';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return realisasi.filter((r) => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (!q) return true;
      const s = r.salinan || {};
      const nama = pegawaiById[r.pelaksanaId]?.nama || '';
      return `${s.makKode} ${s.itemKode} ${s.itemNama} ${s.uraian} ${r.nomorLpj} ${nama}`
        .toLowerCase()
        .includes(q);
    });
  }, [realisasi, filterStatus, search, pegawaiById]);

  // Tanpa pencarian, total dibaca dari rekap server (mencakup baris yang belum dimuat)
  const pakaiRekap = !search.trim() && filterStatus !== 'batal';
  const total = pakaiRekap
    ? Object.values(rekap?.item || {}).reduce(
        (s, e) => s + (Number(filterMonth ? e.real?.[filterMonth] : e.total) || 0),
        0,
      )
    : filtered.filter((r) => r.status === 'aktif').reduce((s, r) => s + (r.jumlah || 0), 0);

  const ubahTahun = (teks) => {
    setTahunTeks(teks);
    if (/^\d{4}$/.test(teks) && Number(teks) >= 2024) setTahun(Number(teks));
  };

  const jalankan = async (r, aksi, pesanSukses, keStatus) => {
    setProsesId(r.id);
    try {
      await aksi();
      ubahBaris(r.id, { status: keStatus });
      showToast(pesanSukses);
      return true;
    } catch (err) {
      showToast(pesanGalat(err, 'Gagal mengubah status transaksi.'), 'error');
      return false;
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
              Log realisasi anggaran yang tercatat saat SPBy berkas LPJ selesai.
            </p>
          </div>

          <div className={ADMIN.toolbar}>
            <div className={ADMIN.search}>
              <FaSearch size={12} className="shrink-0" />
              <input
                type="search"
                className={ADMIN.searchInput}
                placeholder="Cari uraian, pelaksana, MAK, nomor LPJ..."
                aria-label="Cari history MAK"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-[7px] shrink-0">
              <input
                type="number"
                min={2024}
                aria-label="Tahun anggaran"
                title="Tahun anggaran"
                className={`${ADMIN.control} w-[86px]`}
                value={tahunTeks}
                onChange={(e) => ubahTahun(e.target.value)}
              />
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
              <select
                aria-label="Filter status"
                className={ADMIN.control}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Semua Status</option>
                <option value="aktif">Aktif</option>
                <option value="batal">Dibatalkan</option>
              </select>
            </div>
          </div>

          <div
            className={`flex justify-between items-center gap-3 border rounded-t-[14px] px-4 py-3 text-[13px] font-semibold ${T.surface2} ${T.border} ${T.ink2}`}
          >
            <span>Total Transaksi Aktif (Filter):</span>
            <strong className={`${FONT.mono} text-base ${STATUS.infoInk}`}>
              Rp <AngkaBerjalan nilai={total} format={formatRupiah} />
            </strong>
          </div>
          <div className={`border border-t-0 rounded-b-[14px] overflow-x-auto ${T.border}`}>
            <table className={`${ADMIN.table} min-w-[840px]`}>
              <thead>
                <tr>
                  <th className={ADMIN.th}>Tanggal</th>
                  <th className={ADMIN.th}>Nomor LPJ / Pelaksana</th>
                  <th className={ADMIN.th}>MAK / Item</th>
                  <th className={ADMIN.th}>Uraian</th>
                  <th className={`${ADMIN.thBase} text-right`}>Jumlah (Rp)</th>
                  <th className={`${ADMIN.thBase} text-center`}>Status</th>
                  {isSuperAdmin && <th className={`${ADMIN.thBase} text-center`}>Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {memuat ? (
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
                  filtered.map((r, i) => {
                    const aktif = r.status === 'aktif';
                    const s = r.salinan || {};
                    return (
                      <tr
                        key={r.id}
                        className={`${ADMIN.tr} ${ANIM.muncul} ${jedaKe(i)} ${aktif ? '' : 'opacity-55'}`}
                      >
                        <td className={ADMIN.td}>
                          <span className={ADMIN.mono}>{formatTanggalID(r.tanggal)}</span>
                        </td>
                        <td className={ADMIN.td}>
                          <div className={`${FONT.mono} text-[12px] font-semibold`}>
                            {r.nomorLpj || '-'}
                          </div>
                          <div
                            className={`text-[11.5px] mt-0.5 max-w-[220px] truncate ${T.inkMuted}`}
                            title={`${JENIS[r.jenis] || ''} · ${namaPelaksana(r.pelaksanaId)}`}
                          >
                            {namaPelaksana(r.pelaksanaId)}
                          </div>
                        </td>
                        <td className={ADMIN.td}>
                          <div
                            className={`${FONT.mono} text-[10px] mb-0.5 max-w-[230px] truncate ${T.inkMuted}`}
                            title={s.makKode}
                          >
                            {s.makKode}
                          </div>
                          <span className={ADMIN.tag}>
                            {s.itemKode} - {s.itemNama}
                          </span>
                        </td>
                        <td className={`${ADMIN.td} max-w-[230px]`}>{s.uraian || '-'}</td>
                        <td className={`${ADMIN.td} text-right`}>
                          <span className={`${FONT.mono} font-bold whitespace-nowrap`}>
                            {formatRupiah(r.jumlah)}
                          </span>
                        </td>
                        <td className={`${ADMIN.td} text-center`}>
                          {aktif ? (
                            <span
                              key="aktif"
                              className={`${PILL} ${ANIM.meletup} ${STATUS.goodBg} ${STATUS.goodInk}`}
                            >
                              <FaCheck size={8} />
                              Aktif
                            </span>
                          ) : (
                            <span
                              key="batal"
                              title={r.alasanBatal ? `Alasan: ${r.alasanBatal}` : undefined}
                              className={`${PILL} ${ANIM.meletup} ${STATUS.critBg} ${STATUS.critInk}`}
                            >
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
                                disabled={prosesId === r.id}
                                onClick={() => setBatal(r)}
                              >
                                <FaTimes size={12} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                className={`${AKSI_BTN} ${STATUS.goodInk}`}
                                title="Pulihkan Transaksi"
                                aria-label="Pulihkan Transaksi"
                                disabled={prosesId === r.id}
                                onClick={() =>
                                  jalankan(
                                    r,
                                    () => pulihkanRealisasi(r.id),
                                    'Transaksi dipulihkan.',
                                    'aktif',
                                  )
                                }
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
          {bisaLagi && (
            <div className="flex justify-center mt-4">
              <button
                type="button"
                className={ADMIN.btnGhost}
                onClick={muatLagi}
                disabled={memuatLagi}
              >
                {memuatLagi ? 'Memuat...' : 'Muat lebih banyak'}
              </button>
            </div>
          )}
        </section>
      </div>
      {batal && (
        <ModalBatalRealisasi
          realisasi={batal}
          sibuk={prosesId === batal.id}
          onClose={() => setBatal(null)}
          onSubmit={async (alasan) => {
            const ok = await jalankan(
              batal,
              () => batalkanRealisasi(batal.id, alasan),
              'Transaksi dibatalkan.',
              'batal',
            );
            if (ok) setBatal(null);
          }}
        />
      )}
      <ToastViewport />
    </div>
  );
}
