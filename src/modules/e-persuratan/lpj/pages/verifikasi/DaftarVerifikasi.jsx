/**
 * Daftar Berkas Verifikasi (BerkasVerifikasiPage purwarupa admin): berkas dipisah per TAHAP lewat
 * tab — Draft → Verifikasi → Upload SAKTI → Transfer → Arsip. Aksi per tahap:
 *   Draft        → halaman lihat-saja (progres pelaksana per fase)
 *   Verifikasi   → halaman verifikasi (detail berkas + Pemeriksaan Dokumen + Lembar Verifikasi)
 *   Upload SAKTI → jendela isi nomor kwitansi SAKTI
 *   Transfer     → jendela unggah bukti transfer
 *   Arsip        → jendela unggah pindaian berkas; setelah itu berkas pindah ke menu Arsip
 * Daftar tiap tab dibaca dari `lpj_ringkas` (tahap dihitung Function, 50 per halaman); jumlah per
 * tab lewat kueri hitung. Tab aktif tersimpan di URL (?tab=). Dibuka dengan state `{ buka: id }`
 * (dari Dashboard) → jendela aksi berkas itu langsung terbuka bila berkasnya masih di tab ini.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { FaArrowRight, FaRegEye, FaSearch, FaSort, FaSortDown, FaSortUp } from 'react-icons/fa';
import { tahunIni } from '@/utils/nilai';
import {
  useBerkas,
  useDaftarBerkas,
  useDaftarDrpp,
  useJumlahTahap,
  useKeuanganBerkas,
} from '../../hooks/useBerkas';
import { useLpjUser } from '../../hooks/useLpjUser';
import { useMakBerkas } from '../../hooks/useMakBerkas';
import { simpanSakti } from '../../services/keuanganDb';
import { arsipkanBerkas, kirimTransfer, pesanUnggah } from '../../services/unggahan';
import {
  isPerjadin,
  jenisLabel,
  lpjIdLabel,
  lpjIdOf,
  pelaksanaOf,
  rupiah,
  stagesWithStatus,
  uraianOf,
} from '../../utils/lpjLogic';
import {
  TAHAP,
  TAHAP_KEYS,
  cocokCari,
  labelTahap,
  nominalBerkas,
  nominalRingkas,
  tanggalUrut,
  verifOf,
} from '../../utils/verifikasiLogic';
import { daftarTahun } from '../../../tahunAnggaran';
import TabTahap from '../../components/verifikasi/TabTahap';
import ModalSakti from '../../components/verifikasi/ModalSakti';
import ModalTransfer from '../../components/verifikasi/ModalTransfer';
import ModalArsip from '../../components/verifikasi/ModalArsip';
import Pemberitahuan from '../../components/verifikasi/Pemberitahuan';
import { AKSI_TAHAP, IKON_TAHAP, JENIS_DOT, TONE } from '../../components/verifikasi/tahapTampil';
import { useToast } from '@/utils/toastStore';
import { ADMIN, FONT, LAYOUT, STATUS, T } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';
import { useMunculBerurutan } from '@/components/animasi';

const BASE = '/e-persuratan/verifikasi';
const SELECT = `h-9 pl-3 pr-2 rounded-lg border min-w-[130px] ${T.borderStrong} ${T.surface} ${T.ink} text-[13px] cursor-pointer outline-none ${T.focus} dark:[color-scheme:dark]`;
const TH = `text-left text-[10.5px] font-bold tracking-[.05em] uppercase px-3 py-2 whitespace-nowrap ${T.surface2} ${T.inkMuted}`;
const TD = `px-3 py-[9px] border-t align-middle ${T.border} max-md:border-0 max-md:p-0`;
const BTN_AKSI = `inline-flex items-center justify-center gap-1.5 w-[136px] max-md:w-auto max-md:min-w-[150px] h-[34px] max-md:h-10 px-2.5 max-md:px-4 rounded-lg max-md:rounded-[10px] text-[12.5px] max-md:text-[13px] font-bold whitespace-nowrap ${ANIM.tekan}`;
const BATAS_HITUNG = 50; // kueri hitung dibatasi limit daftar rules

/** Fase pelaksana yang sedang berjalan, mis. "Fase 2/4 — SPD" (dari dokumen ringkas). */
function faseBerjalan(r) {
  const list = stagesWithStatus(r);
  const cur = list.find((s) => s.raw !== 'selesai') || list[list.length - 1];
  return { teks: `Fase ${cur.stage.num}/${list.length} — ${cur.stage.label}`, list };
}

export default function DaftarVerifikasi() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sp, setSp] = useSearchParams();
  const showToast = useToast();
  const user = useLpjUser();
  const [tahun, setTahun] = useState(tahunIni);

  const tab = TAHAP_KEYS.includes(sp.get('tab')) ? sp.get('tab') : 'verif';
  const {
    berkas: daftarTab,
    memuat: loading,
    galat: error,
    bisaLagi,
    memuatLagi,
    muatLagi,
  } = useDaftarBerkas({ uid: user.uid, semua: true, tahunAnggaran: tahun, tahap: tab });
  const { list: drpps } = useDaftarDrpp({ uid: user.uid, semua: true, tahunAnggaran: tahun });
  const hitung = useJumlahTahap({
    tahunAnggaran: tahun,
    daftarTahap: TAHAP_KEYS,
    segar: daftarTab.map((r) => r.id).join(),
  });

  const [q, setQ] = useState('');
  const [jenis, setJenis] = useState('');
  const [urut, setUrut] = useState({ key: null, arah: 'asc' });
  const [jendela, setJendela] = useState(null); // { jenis: 'sakti'|'transfer'|'arsip', id }
  const [sorot, setSorot] = useState(null); // tab tujuan yang disorot sebentar setelah berkas pindah
  const [info, setInfo] = useState(null);
  const sorotTimer = useRef(null);

  // Pemberitahuan dari halaman Verifikasi (state navigasi) cukup tampil sekali
  useEffect(() => {
    const p = location.state?.pemberitahuan;
    if (!p) return;
    setInfo(p);
    setSorot(p.tab);
    clearTimeout(sorotTimer.current);
    sorotTimer.current = setTimeout(() => setSorot(null), 2200);
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [location.state, location.pathname, location.search, navigate]);
  useEffect(() => () => clearTimeout(sorotTimer.current), []);
  const tutupInfo = useCallback(() => setInfo(null), []);

  // Dibuka dari Dashboard (state `buka`): jendela aksi berkas itu terbuka setelah tab termuat
  const bukaId = location.state?.buka;
  const bukaTerakhir = useRef(null);
  useEffect(() => {
    if (!bukaId || loading || bukaTerakhir.current === bukaId) return;
    bukaTerakhir.current = bukaId;
    if (daftarTab.some((r) => r.id === bukaId) && ['sakti', 'transfer', 'arsip'].includes(tab)) {
      setJendela({ jenis: tab, id: bukaId });
    } else {
      showToast('Berkas itu sudah tidak berada di tahap ini.', 'error');
    }
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [bukaId, loading, daftarTab, tab, showToast, navigate, location.pathname, location.search]);

  // Jumlah tiap tab dari server (pencarian & filter jenis hanya menyaring tab yang dibuka)
  const jumlah = Object.fromEntries(
    TAHAP_KEYS.map((k) => [
      k,
      hitung[k] == null ? '…' : hitung[k] >= BATAS_HITUNG ? `${BATAS_HITUNG}+` : hitung[k],
    ]),
  );
  const totalBerkas = TAHAP_KEYS.reduce((s, k) => s + (hitung[k] || 0), 0);

  const rows = useMemo(() => {
    const kata = q.trim().toLowerCase();
    const out = daftarTab.filter((r) => {
      if (jenis && (jenis === 'perjadin') !== isPerjadin(r)) return false;
      return cocokCari(r, kata);
    });
    if (urut.key) {
      const arah = urut.arah === 'asc' ? 1 : -1;
      const nilai = (r) => (urut.key === 'id' ? lpjIdOf(r) || '~' : pelaksanaOf(r)[0]?.nama || '~');
      return out.sort((a, b) => nilai(a).localeCompare(nilai(b), 'id') * arah);
    }
    return out.sort((a, b) => tanggalUrut(b).localeCompare(tanggalUrut(a)));
  }, [daftarTab, q, jenis, urut]);

  const wadahRef = useMunculBerurutan(`${tab}|${rows.length > 0}|${loading}`);

  const pilihTab = (k) => setSp({ tab: k }, { replace: true });
  const ubahUrut = (key) =>
    setUrut((u) =>
      u.key === key ? { key, arah: u.arah === 'asc' ? 'desc' : 'asc' } : { key, arah: 'asc' },
    );

  function aksi(r, tahap) {
    setInfo(null);
    if (tahap === 'draft' || tahap === 'verif') navigate(`${BASE}/${r.id}`);
    else setJendela({ jenis: tahap, id: r.id });
  }

  /** Berkas pindah ke tab berikutnya: sorot tab tujuan dan tampilkan pemberitahuan. */
  function pindah(ke, n) {
    setJendela(null);
    setSorot(ke);
    clearTimeout(sorotTimer.current);
    sorotTimer.current = setTimeout(() => setSorot(null), 2200);
    setInfo({ key: Date.now(), ke: labelTahap(ke), ...n });
  }

  const gagal = (err, pesan) => {
    showToast(pesanUnggah(err) || pesan, 'error');
    return false;
  };

  async function simpanNoSakti(pack, no) {
    try {
      await simpanSakti(pack.id, no, user.uid);
      pindah('transfer', {
        judul: 'Nomor kwitansi SAKTI tersimpan',
        id: lpjIdLabel(pack),
        tambahan: no,
        dari: 'Upload SAKTI',
      });
      return true;
    } catch (err) {
      return gagal(err, 'Gagal menyimpan nomor kwitansi SAKTI.');
    }
  }

  async function kirimBukti(pack, file) {
    try {
      await kirimTransfer(pack.id, file, user.uid);
      pindah('arsip', { judul: 'Bukti transfer terkirim', id: lpjIdLabel(pack), dari: 'Transfer' });
      return true;
    } catch (err) {
      return gagal(err, 'Gagal mengirim bukti transfer.');
    }
  }

  async function arsipkan(pack, file, drppMenunggu) {
    try {
      await arsipkanBerkas(pack.id, file, user.uid);
      setJendela(null);
      setInfo({
        key: Date.now(),
        judul: 'Berkas diarsipkan',
        id: lpjIdLabel(pack),
        tambahan: drppMenunggu ? `masuk ${drppMenunggu}` : '',
        dari: 'Arsip',
        ke: 'Menu Arsip',
      });
      return true;
    } catch (err) {
      return gagal(err, 'Gagal mengarsipkan berkas.');
    }
  }

  const salin = (pack) => {
    if (!navigator.clipboard?.writeText) {
      showToast('Browser tidak mendukung salin otomatis.', 'error');
      return;
    }
    navigator.clipboard.writeText(uraianOf(pack)).then(
      () => showToast('Uraian kegiatan disalin.'),
      () => showToast('Gagal menyalin, coba salin manual.', 'error'),
    );
  };

  const cur = TAHAP.find((t) => t.key === tab);
  const IkonKosong = IKON_TAHAP[tab];
  const ikonUrut = (key) =>
    urut.key !== key ? (
      <FaSort size={10} className="opacity-40" />
    ) : urut.arah === 'asc' ? (
      <FaSortUp size={10} />
    ) : (
      <FaSortDown size={10} />
    );

  let isi;
  if (loading) {
    isi = (
      <div className="animate-pulse space-y-2.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-14 rounded-xl ${T.surface2}`} />
        ))}
      </div>
    );
  } else if (error) {
    isi = (
      <p className={ADMIN.errorBanner}>
        Daftar berkas tidak dapat dimuat. Muat ulang halaman; bila berulang, hubungi pemilik proyek.
      </p>
    );
  } else {
    isi = (
      <div
        id="daftar-verifikasi"
        role="tabpanel"
        aria-labelledby={`tab-tahap-${tab}`}
        className={`border rounded-[14px] overflow-x-auto overflow-y-hidden ${T.border} max-md:border-0 max-md:overflow-visible`}
      >
        <table className="w-full border-collapse min-w-[820px] max-md:min-w-0 max-md:block">
          <thead className="max-md:hidden">
            <tr>
              <th className={TH}>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 uppercase"
                  onClick={() => ubahUrut('id')}
                >
                  ID {ikonUrut('id')}
                </button>
              </th>
              <th className={TH}>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 uppercase"
                  onClick={() => ubahUrut('pelaksana')}
                >
                  Pelaksana {ikonUrut('pelaksana')}
                </button>
              </th>
              <th className={TH}>Uraian</th>
              <th className={TH}>Nominal</th>
              <th className={`${TH} ${tab === 'draft' ? '' : 'text-right'}`}>
                {tab === 'draft' ? 'Progres' : 'Aksi'}
              </th>
            </tr>
          </thead>
          <tbody ref={wadahRef} className="max-md:flex max-md:flex-col max-md:gap-3">
            {rows.length === 0 && (
              <tr className="max-md:block">
                <td colSpan={5} className="max-md:block">
                  <div
                    className={`flex flex-col items-center gap-1.5 px-2.5 py-[18px] max-md:py-7 max-md:border max-md:border-dashed max-md:rounded-[14px] ${T.borderStrong} ${T.inkMuted} ${ANIM.muncul}`}
                  >
                    <span
                      className={`grid place-items-center w-[46px] h-[46px] mb-1 rounded-full ${T.surface2}`}
                    >
                      <IkonKosong size={18} />
                    </span>
                    <b className={`text-sm ${T.ink}`}>
                      {q || jenis ? 'Tidak ada hasil' : 'Tab ini masih kosong'}
                    </b>
                    <span className="text-[12.5px] text-center">
                      {q || jenis
                        ? 'Tidak ada berkas di tab ini yang sesuai pencarian.'
                        : cur.kosong}
                    </span>
                  </div>
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const draft = tab === 'draft';
              const nomor = lpjIdOf(r);
              const nama = pelaksanaOf(r).map((p) => p.nama);
              const Ikon = IKON_TAHAP[tab];
              const fase = draft ? faseBerjalan(r) : null;
              return (
                <tr
                  key={r.id}
                  data-bertahap
                  onClick={() => aksi(r, tab)}
                  className={`cursor-pointer ${T.surface} ${T.hoverSurface2} max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-y-1.5 max-md:p-3.5 max-md:rounded-2xl max-md:border ${T.border} max-md:shadow-[0_1px_2px_rgba(16,26,44,.07)]`}
                >
                  <td
                    className={`${TD} max-md:col-span-2 max-md:flex max-md:items-center max-md:gap-2.5 max-md:flex-wrap`}
                  >
                    <div
                      className={`whitespace-nowrap ${nomor ? `${FONT.mono} font-bold text-[13px] max-md:text-[15px] ${T.ink}` : `italic text-[13px] ${T.inkMuted}`}`}
                    >
                      {nomor || (draft ? 'Draft' : 'Belum bernomor')}
                    </div>
                    <div
                      className={`inline-flex items-center gap-1.5 mt-1 max-md:mt-0 text-xs font-medium whitespace-nowrap ${T.inkMuted} max-md:px-2 max-md:py-[3px] max-md:rounded-full max-md:border max-md:text-[9.5px] ${T.border} max-md:bg-[#F3F5F8] dark:max-md:bg-[#16243A]`}
                    >
                      <i
                        className={`w-[7px] h-[7px] rounded-full ${isPerjadin(r) ? JENIS_DOT.perjadin : JENIS_DOT.non}`}
                      />
                      {jenisLabel(r) === 'Perjadin' ? 'Perjadin' : 'Non-Perjadin'}
                    </div>
                  </td>
                  <td className={`${TD} max-md:col-span-2`}>
                    <span className={`font-semibold text-[13px] max-md:text-sm ${T.ink}`}>
                      {nama[0] || '—'}
                    </span>
                    {nama.length > 1 && (
                      <span
                        className={`ml-1.5 inline-block px-1.5 py-px rounded-md text-[10.5px] font-bold ${STATUS.infoBg} ${STATUS.infoInk}`}
                      >
                        +{nama.length - 1}
                      </span>
                    )}
                  </td>
                  <td className={`${TD} max-md:col-span-2 max-md:mb-1`}>
                    <div
                      className={`text-[12.5px] leading-[1.45] md:max-w-[300px] line-clamp-2 ${T.ink2}`}
                    >
                      {uraianOf(r) || <span className={`italic ${T.inkMuted}`}>Belum diisi</span>}
                    </div>
                  </td>
                  <td
                    className={`${TD} max-md:pt-3 max-md:border-t max-md:border-dashed max-md:flex max-md:flex-col max-md:justify-center ${T.border}`}
                  >
                    <span
                      className={`md:hidden text-[10px] font-bold tracking-[.06em] uppercase ${T.inkMuted}`}
                    >
                      Nominal
                    </span>
                    <span
                      className={`font-bold text-[13px] max-md:text-[15px] whitespace-nowrap ${T.ink}`}
                    >
                      {rupiah(nominalRingkas(r))}
                    </span>
                  </td>
                  <td
                    className={`${TD} max-md:pt-3 max-md:pl-3 max-md:border-t max-md:border-dashed max-md:flex max-md:items-center max-md:justify-end ${T.border} ${draft ? 'md:min-w-[210px]' : 'text-right'}`}
                  >
                    {draft ? (
                      <span
                        role="img"
                        aria-label={`Progres pelaksana: ${fase.teks}`}
                        title={fase.list
                          .map(
                            (s) =>
                              `Fase ${s.stage.num} ${s.stage.label}: ${s.raw === 'selesai' ? 'Selesai' : s.locked ? 'Terkunci' : 'Berjalan'}`,
                          )
                          .join('\n')}
                        className={`inline-flex max-w-full px-[13px] py-1.5 rounded-full border text-[10.5px] font-bold tracking-[.04em] uppercase whitespace-nowrap ${T.surface2} ${T.border} ${T.ink2}`}
                      >
                        <span className="min-w-0 truncate">{fase.teks}</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className={`${BTN_AKSI} ${TONE[tab].solid}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          aksi(r, tab);
                        }}
                      >
                        <Ikon size={13} />
                        <span>{AKSI_TAHAP[tab]}</span>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={`min-h-full ${T.ground}`}>
      <div className={LAYOUT.page}>
        <section className={LAYOUT.card}>
          <div className="mb-1">
            <h1
              className={`${FONT.head} text-lg sm:text-xl font-extrabold tracking-[-.01em] ${T.ink}`}
            >
              Berkas Verifikasi
            </h1>
            <p className={`text-xs mt-0.5 ${T.inkMuted}`}>
              {totalBerkas} berkas · pilih tahap di bawah untuk melihat berkas yang perlu diproses
            </p>
          </div>
          <div className="flex flex-wrap gap-2 pt-3.5 pb-4">
            <label className={ADMIN.search}>
              <FaSearch size={12} />
              <input
                type="search"
                aria-label="Cari berkas"
                placeholder="Cari ID, pelaksana, uraian, No. SAKTI…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className={`${ADMIN.searchInput} text-[13px] max-sm:text-base`}
              />
            </label>
            <select
              aria-label="Filter jenis"
              value={jenis}
              onChange={(e) => setJenis(e.target.value)}
              className={SELECT}
            >
              <option value="">Semua Jenis</option>
              <option value="perjadin">Perjadin</option>
              <option value="non-perjadin">Non-Perjadin</option>
            </select>
            <select
              aria-label="Tahun anggaran"
              value={tahun}
              onChange={(e) => setTahun(Number(e.target.value))}
              className={SELECT}
            >
              {daftarTahun().map((t) => (
                <option key={t} value={t}>
                  TA {t}
                </option>
              ))}
            </select>
          </div>

          <TabTahap tab={tab} jumlah={jumlah} sorot={sorot} onPilih={pilihTab} />
          <div key={tab} className={ANIM.muncul}>
            {isi}
          </div>
          {bisaLagi && (
            <div className="flex justify-center mt-3">
              <button
                type="button"
                className={ADMIN.btnGhost}
                onClick={muatLagi}
                disabled={memuatLagi}
              >
                {memuatLagi ? 'Memuat…' : 'Muat lebih banyak'}
              </button>
            </div>
          )}
          {tab === 'draft' && rows.length > 0 && (
            <p className={`flex items-center gap-1.5 mt-3 text-xs ${T.inkMuted}`}>
              <FaRegEye size={11} /> Berkas Draft hanya bisa dilihat. Berkas masuk tab Verifikasi
              setelah memiliki ID LPJ (terbit saat SPBy selesai).
            </p>
          )}
          {tab === 'arsip' && rows.length > 0 && (
            <p className={`flex items-center gap-1.5 mt-3 text-xs ${T.inkMuted}`}>
              <FaArrowRight size={10} /> Setelah diarsipkan, berkas pindah ke menu Arsip untuk
              dikelompokkan ke DRPP.
            </p>
          )}
        </section>
      </div>

      {jendela && (
        <JendelaAksi
          jenis={jendela.jenis}
          berkasId={jendela.id}
          drpps={drpps}
          onClose={() => setJendela(null)}
          onSalin={salin}
          onSakti={simpanNoSakti}
          onTransfer={kirimBukti}
          onArsip={arsipkan}
        />
      )}
      <Pemberitahuan info={info} onClose={tutupInfo} />
    </div>
  );
}

/**
 * Jendela aksi tahap: berkas lengkap & tahap Keuangannya dimuat saat jendela terbuka; nominal
 * memakai POK yang dibekukan saat verifikasi (tanpa mengunduh pohon MAK).
 */
function JendelaAksi({ jenis, berkasId, drpps, onClose, onSalin, onSakti, onTransfer, onArsip }) {
  const { berkas: pack } = useBerkas(berkasId);
  const { keuangan } = useKeuanganBerkas(berkasId);
  const { mak } = useMakBerkas(pack, keuangan);
  if (!pack) return null;
  const nom = nominalBerkas(pack, verifOf(keuangan), mak);
  if (jenis === 'sakti') {
    return (
      <ModalSakti
        pack={pack}
        keuangan={keuangan}
        nom={nom}
        onSalin={() => onSalin(pack)}
        onClose={onClose}
        onSave={(no) => onSakti(pack, no)}
      />
    );
  }
  if (jenis === 'transfer') {
    return (
      <ModalTransfer pack={pack} nom={nom} onClose={onClose} onSave={(f) => onTransfer(pack, f)} />
    );
  }
  const menunggu = drpps.find((d) => (d.berkasIds || []).includes(berkasId))?.id;
  return (
    <ModalArsip
      pack={pack}
      keuangan={keuangan}
      pendingDrppId={menunggu}
      onClose={onClose}
      onSave={(f) => onArsip(pack, f, menunggu)}
    />
  );
}
