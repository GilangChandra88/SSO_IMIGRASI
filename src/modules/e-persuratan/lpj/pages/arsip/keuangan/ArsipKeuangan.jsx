/**
 * Arsip untuk Admin/Keuangan (ArsipKeuangan purwarupa). Rute (satu komponen — filter tetap):
 *   /e-persuratan/arsip              → tab "Berkas LPJ"
 *   /e-persuratan/arsip/drpp         → tab "Daftar DRPP"
 *   /e-persuratan/arsip/drpp/:id     → detail satu DRPP
 * Data per tahun anggaran (docs/skema-database.md §5.2): ringkasan berkas di tahap Arsip
 * (`lpj_ringkas`; tahap arsip & drpp = daftar kerja, selesai = sudah masuk DRPP) dan `lpj_drpp`.
 * Kartu statistik memakai kueri hitung; progres & total DRPP dari field `masuk` (ditulis server).
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { FaArchive, FaBan, FaClock, FaLayerGroup, FaQrcode, FaRegFileAlt } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { useDaftarBerkas, useDaftarDrpp, useJumlahTahap } from '../../../hooks/useBerkas';
import { useLpjUser } from '../../../hooks/useLpjUser';
import {
  ambilDrpp,
  batalkanArsip,
  batalkanDrpp,
  buatDrpp,
  ubahDaftarDrpp,
  ubahKwitansi,
} from '../../../services/keuanganDb';
import { arsipkanBerkas, pesanUnggah, unggahDokumenDrpp } from '../../../services/unggahan';
import {
  TAHAP_ARSIP,
  barisLpj,
  drppAktif,
  drppLocked,
  lpjPendingDrpp,
} from '../../../utils/drppLogic';
import { daftarTahun } from '../../../../tahunAnggaran';
import ArsipLpjModal from '../ArsipLpjModal';
import LpjTab from './LpjTab';
import DrppTab from './DrppTab';
import DrppDetail from './DrppDetail';
import ScanLpjModal from './ScanLpjModal';
import CreateDrppModal from './CreateDrppModal';
import EditDaftarModal from './EditDaftarModal';
import DrppPickerModal from './DrppPickerModal';
import { PANJANG, LIMIT_KUERI } from '@/utils/batas';
import { keDate, tahunIni } from '@/utils/nilai';
import { pesanGalat } from '@/utils/pesanGalat';
import { useToast } from '@/utils/toastStore';
import { BTN, FONT, FORM, LAYOUT, STATUS, T } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';
import { AngkaBerjalan, useMunculBerurutan } from '@/components/animasi';

const TONE = {
  navy: 'bg-[rgba(23,61,104,.10)] text-[#173D68] dark:bg-[rgba(125,182,243,.14)] dark:text-[#7DB6F3]',
  neutral: `${T.surface2} ${T.ink2}`,
  warn: `${STATUS.warnBg} ${STATUS.warnInk}`,
  good: `${STATUS.doneBg} ${STATUS.doneInk}`,
  info: `${STATUS.infoBg} ${STATUS.infoInk}`,
};
const TAB =
  'px-4 py-[11px] -mb-px text-[13.5px] font-semibold border-b-[2.5px] motion-safe:transition-[color,border-color] motion-safe:duration-200';
const TAB_ON = 'text-[#173D68] border-[#173D68] dark:text-[#7DB6F3] dark:border-[#7DB6F3]';
const TAB_OFF = `border-transparent ${T.inkMuted} hover:text-[#55627A] dark:hover:text-[#A7B6CB]`;
const SELECT = `h-10 pl-3 pr-2 rounded-[9px] border ${T.borderStrong} ${T.surface} ${T.ink} text-[12.5px] font-semibold cursor-pointer outline-none ${T.focus} dark:[color-scheme:dark]`;

const BASE = '/e-persuratan/arsip';
// Daftar kerja (belum dipindai + belum masuk DRPP) biasanya sedikit; berkas yang sudah masuk DRPP
// dimuat terpisah supaya daftar kerja tidak terdesak berkas lama.
const TAHAP_KERJA = ['arsip', 'drpp'];
const BATAS = LIMIT_KUERI.halaman; // kueri hitung & daftar dibatasi limit rules
const waktuDari = (r) => keDate(r.diubahPada)?.getTime() || 0;
const waktuBuat = (r) => keDate(r.dibuatPada)?.getTime() || 0;

/** Gabung dua daftar ringkas tanpa duplikat (berkas yang baru pindah tahap: ambil yang terbaru). */
function gabungRingkas(...daftar) {
  const per = new Map();
  daftar.flat().forEach((r) => {
    const ada = per.get(r.id);
    if (!ada || waktuDari(r) >= waktuDari(ada)) per.set(r.id, r);
  });
  return [...per.values()].sort((a, b) => waktuBuat(b) - waktuBuat(a));
}

export default function ArsipKeuangan() {
  const navigate = useNavigate();
  const showToast = useToast();
  const { uid, isSuperAdmin } = useLpjUser();
  const [tahun, setTahun] = useState(tahunIni);
  const kerja = useDaftarBerkas({ uid, semua: true, tahunAnggaran: tahun, tahap: TAHAP_KERJA });
  const sudahMasuk = useDaftarBerkas({ uid, semua: true, tahunAnggaran: tahun, tahap: 'selesai' });
  const {
    list: semuaDrpp,
    memuat: memuatDrpp,
    galat: galatDrpp,
  } = useDaftarDrpp({ uid, semua: true, tahunAnggaran: tahun });

  const parts = (useParams()['*'] || '').split('/').filter(Boolean);
  const tab = parts[0] === 'drpp' ? 'drpp' : 'lpj';
  const detailId = parts[0] === 'drpp' && parts[1] ? decodeURIComponent(parts[1]) : null;
  // Kartu statistik muncul berurutan (sekali, setelah data dimuat)
  const statRef = useMunculBerurutan('statistik');

  // filter & seleksi (tetap tersimpan saat pindah tab)
  const [lpjFilter, setLpjFilter] = useState({ q: '', status: 'all', type: 'all' });
  const [lpjPage, setLpjPage] = useState(1);
  const [selected, setSelected] = useState({});
  const [assignTarget, setAssignTarget] = useState(null); // mode "masukkan langsung" ke satu DRPP
  const [drppSearch, setDrppSearch] = useState('');

  // jendela
  // Baris yang dibuka (bisa dari detail DRPP yang tidak ada di daftar termuat)
  const [lihat, setLihat] = useState(null);
  const [scan, setScan] = useState(null);
  const [create, setCreate] = useState(null); // null | { initialExpectedIds, thenAssign }
  const [pickerIds, setPickerIds] = useState(null);
  const [editId, setEditId] = useState(null);
  const [batalDrppId, setBatalDrppId] = useState(null);
  const [alasanBatal, setAlasanBatal] = useState('');
  const [membatalkan, setMembatalkan] = useState(false);

  const drpps = useMemo(() => drppAktif(semuaDrpp), [semuaDrpp]);
  const packs = useMemo(
    () => gabungRingkas(kerja.berkas, sudahMasuk.berkas),
    [kerja.berkas, sudahMasuk.berkas],
  );
  const packsById = useMemo(() => Object.fromEntries(packs.map((p) => [p.id, p])), [packs]);
  const rows = useMemo(() => packs.map(barisLpj), [packs]);
  const rowById = useMemo(() => Object.fromEntries(rows.map((r) => [r.packId, r])), [rows]);
  const jumlah = useJumlahTahap({
    tahunAnggaran: tahun,
    daftarTahap: TAHAP_ARSIP,
    segar: `${kerja.berkas.length}:${kerja.berkas.filter((b) => b.tahap === 'arsip').length}:${sudahMasuk.berkas.length}`,
  });

  const loading = kerja.memuat || sudahMasuk.memuat || memuatDrpp;
  const error = kerja.galat || sudahMasuk.galat || galatDrpp;
  const detail = detailId ? drpps.find((d) => d.id === detailId) : null;
  const adaDetail = !!detail;

  // Tautan langsung ke DRPP tahun anggaran lain: baca DRPP-nya sekali lalu pindah tahun
  const [taDicek, setTaDicek] = useState('');
  useEffect(() => {
    if (!detailId || loading || error || adaDetail || taDicek === detailId) return undefined;
    let aktif = true;
    const selesai = () => aktif && setTaDicek(detailId);
    ambilDrpp(detailId).then((d) => {
      if (aktif && d && d.status !== 'batal' && d.tahunAnggaran && d.tahunAnggaran !== tahun) {
        setTahun(d.tahunAnggaran);
      }
      selesai();
    }, selesai);
    return () => {
      aktif = false;
    };
  }, [detailId, loading, error, adaDetail, taDicek, tahun]);

  if (!loading && !error && detailId && !detail && taDicek === detailId) {
    return <Navigate to={`${BASE}/drpp`} replace />;
  }

  const lihatRow = lihat ? rowById[lihat.packId] || lihat : null;
  const scanRow = scan ? rowById[scan.packId] || scan : null;

  const gotoTab = (t) => {
    setAssignTarget(null);
    navigate(t === 'drpp' ? `${BASE}/drpp` : BASE);
  };
  const openDrpp = (id) => navigate(`${BASE}/drpp/${encodeURIComponent(id)}`);
  const gantiTahun = (t) => {
    setTahun(t);
    setSelected({});
    setAssignTarget(null);
    setLpjPage(1);
  };

  // ─── Aksi ──────────────────────────────────────────────────────────────────

  async function saveScan({ file, kwitansi }) {
    const r = scanRow;
    const menunggu = !r.diarsip && lpjPendingDrpp(drpps, r.pack);
    try {
      // No. kwitansi dikoreksi lebih dulu: setelah arsip selesai hanya Super Admin yang bisa
      if (kwitansi.trim() !== r.kwitansi) await ubahKwitansi(r.packId, kwitansi, uid);
      await arsipkanBerkas(r.packId, file, uid);
      showToast(
        `Berkas ${r.id} berhasil dipindai${menunggu ? ' dan otomatis masuk ke ' + menunggu.id : ''}.`,
      );
      setScan(null);
      return true;
    } catch (err) {
      showToast(pesanUnggah(err), 'error');
      return false;
    }
  }

  async function submitCreate({ files, expectedIds }) {
    const wasAssign = create.thenAssign;
    let hasil;
    try {
      hasil = await buatDrpp(tahun, expectedIds);
    } catch (err) {
      showToast(pesanGalat(err, 'Gagal membuat DRPP.'), 'error');
      return false;
    }
    // Dokumen pindaian diunggah setelah nomor DRPP terbit (jalur Storage memakai nomornya)
    const gagalUnggah = [];
    for (const [jenis, file] of Object.entries(files)) {
      try {
        await unggahDokumenDrpp(hasil.id, jenis, file, uid);
      } catch {
        gagalUnggah.push(jenis.toUpperCase());
      }
    }
    showToast(
      `${hasil.id} berhasil dibuat · ${hasil.masuk} LPJ langsung masuk` +
        (hasil.menunggu > 0 ? `, ${hasil.menunggu} menunggu scan` : '') +
        '.',
    );
    if (gagalUnggah.length) {
      showToast(
        `Dokumen ${gagalUnggah.join(', ')} gagal diunggah. Pindai ulang dari detail DRPP.`,
        'error',
      );
    }
    setCreate(null);
    if (wasAssign) setSelected({});
    openDrpp(hasil.id);
    return true;
  }

  async function assignTo(ids, drppId) {
    const d = drpps.find((x) => x.id === drppId);
    if (!d || drppLocked(d)) {
      showToast('DRPP ini sudah terkunci. LPJ tidak bisa ditambahkan lagi.', 'error');
      return false;
    }
    try {
      await ubahDaftarDrpp(d.id, [...new Set([...(d.berkasIds || []), ...ids])]);
      showToast(`${ids.length} berkas berhasil dimasukkan ke ${drppId}.`);
      setSelected({});
      setPickerIds(null);
      setAssignTarget(null);
      openDrpp(drppId);
      return true;
    } catch (err) {
      showToast(pesanGalat(err, 'Gagal memasukkan berkas ke DRPP.'), 'error');
      return false;
    }
  }

  async function saveExpected(ids) {
    const d = drpps.find((x) => x.id === editId);
    try {
      await ubahDaftarDrpp(d.id, ids);
      showToast(`Daftar LPJ untuk ${d.id} berhasil diperbarui.`);
      setEditId(null);
      return true;
    } catch (err) {
      showToast(pesanGalat(err, 'Gagal menyimpan daftar LPJ.'), 'error');
      return false;
    }
  }

  async function konfirmBatalDrpp() {
    const alasan = alasanBatal.trim();
    if (!alasan) {
      showToast('Alasan pembatalan wajib diisi.', 'error');
      return;
    }
    setMembatalkan(true);
    try {
      await batalkanDrpp(batalDrppId, alasan);
      showToast(`${batalDrppId} dibatalkan. Berkas di dalamnya kembali "Belum Masuk DRPP".`);
      setBatalDrppId(null);
      setAlasanBatal('');
      navigate(`${BASE}/drpp`);
    } catch (err) {
      showToast(pesanGalat(err, 'Gagal membatalkan DRPP.'), 'error');
    } finally {
      setMembatalkan(false);
    }
  }

  async function batalArsipLpj(r) {
    try {
      await batalkanArsip(r.packId, uid);
      showToast(`Arsip ${r.id} dibatalkan. Berkas kembali "Belum Discan".`);
      setLihat(null);
      return true;
    } catch (err) {
      showToast(pesanGalat(err, 'Gagal membatalkan arsip.'), 'error');
      return false;
    }
  }

  async function scanDoc(d, key, file) {
    try {
      await unggahDokumenDrpp(d.id, key, file, uid);
      showToast(`Dokumen ${key.toUpperCase()} berhasil dipindai.`);
    } catch (err) {
      showToast(pesanUnggah(err), 'error');
    }
  }

  // Muat lebih banyak mengikuti filter status tab Berkas LPJ
  const sumberLpj =
    lpjFilter.status === 'masuk_drpp'
      ? [sudahMasuk]
      : lpjFilter.status === 'all'
        ? [kerja, sudahMasuk]
        : [kerja];
  const lanjutan = {
    bisaLagi: sumberLpj.some((s) => s.bisaLagi),
    memuatLagi: sumberLpj.some((s) => s.memuatLagi),
    muatLagi: () => sumberLpj.filter((s) => s.bisaLagi).forEach((s) => s.muatLagi()),
  };

  // ─── Isi halaman ───────────────────────────────────────────────────────────

  let body;
  if (loading || (detailId && !detail && !error)) {
    body = (
      <div className={`${LAYOUT.card} animate-pulse space-y-3`}>
        <div className={`h-10 rounded-[9px] ${T.surface2}`} />
        {[1, 2, 3].map((i) => (
          <div key={i} className={`h-16 rounded-xl ${T.surface2}`} />
        ))}
      </div>
    );
  } else if (error) {
    body = (
      <p className={`rounded-[10px] px-3.5 py-3 text-[12.5px] ${STATUS.critBg} ${STATUS.critInk}`}>
        Arsip tidak dapat dimuat. Muat ulang halaman; bila berulang, hubungi admin.
      </p>
    );
  } else if (detail) {
    body = (
      <DrppDetail
        key={detail.id}
        drpp={detail}
        packsById={packsById}
        onBack={() => navigate(`${BASE}/drpp`)}
        onScanDoc={scanDoc}
        onEditList={(d) => setEditId(d.id)}
        onGoAssign={(id) => {
          setAssignTarget(id);
          setSelected({});
          setLpjFilter({ q: '', status: 'belum_drpp', type: 'all' });
          setLpjPage(1);
          navigate(BASE);
        }}
        onLihat={setLihat}
        onBatal={isSuperAdmin ? (d) => setBatalDrppId(d.id) : undefined}
      />
    );
  } else {
    const n = (k) => jumlah[k] ?? 0;
    const lebih = (k) => n(k) >= BATAS;
    const cards = [
      {
        label: 'Total Berkas Diserahkan',
        num: TAHAP_ARSIP.reduce((s, k) => s + n(k), 0),
        plus: TAHAP_ARSIP.some(lebih),
        Icon: FaArchive,
        tone: 'navy',
      },
      {
        label: 'Belum Discan',
        num: n('arsip'),
        plus: lebih('arsip'),
        Icon: FaQrcode,
        tone: 'neutral',
      },
      {
        label: 'Sudah Discan · Belum DRPP',
        num: n('drpp'),
        plus: lebih('drpp'),
        Icon: FaClock,
        tone: 'warn',
      },
      {
        label: 'Sudah Masuk DRPP',
        num: n('selesai'),
        plus: lebih('selesai'),
        Icon: FaLayerGroup,
        tone: 'good',
      },
      {
        label: 'Total DRPP Dibuat',
        num: drpps.length,
        plus: semuaDrpp.length >= BATAS,
        Icon: FaRegFileAlt,
        tone: 'info',
      },
    ];
    body = (
      <>
        <div
          ref={statRef}
          className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-2.5 sm:gap-3.5 mb-5"
        >
          {cards.map(({ label, num, plus, Icon, tone }) => (
            <div
              key={label}
              data-bertahap
              className={`flex items-start sm:items-center gap-2.5 sm:gap-3.5 p-3 sm:px-[18px] sm:py-4 rounded-[14px] border last:odd:col-span-2 sm:last:odd:col-span-1 motion-safe:transition-[translate] motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 ${T.surface} ${T.border} ${T.shadowSm}`}
            >
              <span
                className={`w-[42px] h-[42px] shrink-0 rounded-xl grid place-items-center ${TONE[tone]}`}
              >
                <Icon size={18} />
              </span>
              <div>
                <div className={`${FONT.head} text-[22px] font-extrabold leading-[1.15] ${T.ink}`}>
                  <AngkaBerjalan
                    nilai={num}
                    format={(v) => `${Math.round(v).toLocaleString('id-ID')}${plus ? '+' : ''}`}
                  />
                </div>
                <div className={`text-xs font-semibold mt-px ${T.inkMuted}`}>{label}</div>
              </div>
            </div>
          ))}
        </div>
        <section className={LAYOUT.card}>
          <div role="tablist" className={`flex flex-wrap gap-1.5 border-b mb-[18px] ${T.border}`}>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'lpj'}
              className={`${TAB} ${tab === 'lpj' ? TAB_ON : TAB_OFF}`}
              onClick={() => gotoTab('lpj')}
            >
              Berkas LPJ
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'drpp'}
              className={`${TAB} ${tab === 'drpp' ? TAB_ON : TAB_OFF}`}
              onClick={() => gotoTab('drpp')}
            >
              Daftar DRPP ({drpps.length})
            </button>
          </div>
          <div key={tab} className={ANIM.muncul}>
            {tab === 'lpj' ? (
              <LpjTab
                rows={rows}
                drpps={drpps}
                filter={lpjFilter}
                setFilter={setLpjFilter}
                page={lpjPage}
                setPage={setLpjPage}
                selected={selected}
                setSelected={setSelected}
                assignTarget={assignTarget}
                lanjutan={lanjutan}
                onCancelAssign={() => setAssignTarget(null)}
                onScan={setScan}
                onLihat={setLihat}
                onGroup={setPickerIds}
                onAssignDirect={(ids) => assignTo(ids, assignTarget)}
              />
            ) : (
              <DrppTab
                drpps={drpps}
                packsById={packsById}
                search={drppSearch}
                setSearch={setDrppSearch}
                onOpen={openDrpp}
                onCreate={() => setCreate({ initialExpectedIds: [], thenAssign: false })}
              />
            )}
          </div>
        </section>
      </>
    );
  }

  const editDrpp = editId ? drpps.find((d) => d.id === editId) : null;
  // Berkas yang sudah diarsipkan hanya bisa diubah Super Admin (rules); DRPP lengkap mengunci
  const drppLihat = lihatRow?.drppId ? drpps.find((x) => x.id === lihatRow.drppId) : null;
  const lihatTerkunci =
    !!lihatRow && ((lihatRow.diarsip && !isSuperAdmin) || (!!drppLihat && drppLocked(drppLihat)));

  return (
    <div className={`min-h-full ${T.ground}`}>
      <div className={LAYOUT.page}>
        {!detail && (
          <div className={LAYOUT.head}>
            <div>
              <h1 className={LAYOUT.h1}>Arsip</h1>
              <p className={LAYOUT.sub}>
                Kelola berkas LPJ yang sudah terpindai &amp; lengkap, lalu kelompokkan ke DRPP
              </p>
            </div>
            <select
              aria-label="Tahun anggaran"
              value={tahun}
              onChange={(e) => gantiTahun(Number(e.target.value))}
              className={SELECT}
            >
              {daftarTahun().map((t) => (
                <option key={t} value={t}>
                  TA {t}
                </option>
              ))}
            </select>
          </div>
        )}
        {body}
      </div>

      {lihatRow && !scanRow && (
        <ArsipLpjModal
          row={lihatRow}
          kelola
          terkunci={lihatTerkunci}
          onClose={() => setLihat(null)}
          onHapusPindaian={isSuperAdmin ? batalArsipLpj : undefined}
        />
      )}
      {scanRow && (
        <ScanLpjModal
          row={scanRow}
          pendingDrppId={lpjPendingDrpp(drpps, scanRow.pack)?.id}
          onClose={() => setScan(null)}
          onSave={saveScan}
        />
      )}
      {create && (
        <CreateDrppModal
          rows={rows}
          drpps={drpps}
          initialExpectedIds={create.initialExpectedIds}
          onClose={() => setCreate(null)}
          onSubmit={submitCreate}
        />
      )}
      {pickerIds && !create && (
        <DrppPickerModal
          rows={pickerIds.map((id) => rowById[id]).filter(Boolean)}
          drpps={drpps}
          onClose={() => setPickerIds(null)}
          onConfirm={(drppId) => assignTo(pickerIds, drppId)}
          onCreateNew={() => {
            setCreate({ initialExpectedIds: pickerIds, thenAssign: true });
            setPickerIds(null);
          }}
        />
      )}
      {batalDrppId && (
        <Modal
          widthClass="max-w-[440px]"
          onClose={membatalkan ? undefined : () => setBatalDrppId(null)}
          labelledBy="judul-batal-drpp"
        >
          <div className="p-6">
            <h3 id="judul-batal-drpp" className={`${FONT.head} font-bold text-base ${T.ink}`}>
              Batalkan {batalDrppId}?
            </h3>
            <p className={`mt-1.5 text-[13px] leading-[1.55] ${T.inkMuted}`}>
              DRPP tidak dihapus: tetap tersimpan berstatus batal beserta dokumen pindaiannya.
              Berkas LPJ di dalamnya lepas dan kembali "Belum Masuk DRPP".
            </p>
            <label className={`${FORM.label} mt-4`} htmlFor="alasan-batal-drpp">
              Alasan pembatalan
            </label>
            <textarea
              id="alasan-batal-drpp"
              rows={3}
              value={alasanBatal}
              maxLength={PANJANG.alasanBatal}
              disabled={membatalkan}
              onChange={(e) => setAlasanBatal(e.target.value)}
              placeholder="Mis. daftar LPJ salah, DRPP dibuat ulang"
              className={`${FORM.input} ${FORM.borderOk} resize-y`}
            />
            <div className="flex justify-end gap-2 pt-5">
              <button
                type="button"
                className={BTN.ghost}
                onClick={() => setBatalDrppId(null)}
                disabled={membatalkan}
              >
                Kembali
              </button>
              <button
                type="button"
                className={BTN.danger}
                onClick={konfirmBatalDrpp}
                disabled={membatalkan || !alasanBatal.trim()}
              >
                <FaBan size={12} /> {membatalkan ? 'Membatalkan…' : 'Ya, Batalkan'}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {editDrpp && (
        <EditDaftarModal
          drpp={editDrpp}
          rows={rows}
          drpps={drpps}
          onClose={() => setEditId(null)}
          onSave={saveExpected}
        />
      )}
    </div>
  );
}
