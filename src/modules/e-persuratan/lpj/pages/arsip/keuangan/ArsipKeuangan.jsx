/**
 * Arsip untuk Admin/Keuangan (ArsipKeuangan purwarupa). Rute (satu komponen — filter tetap):
 *   /e-persuratan/arsip              → tab "Berkas LPJ"
 *   /e-persuratan/arsip/drpp         → tab "Daftar DRPP"
 *   /e-persuratan/arsip/drpp/:id     → detail satu DRPP
 * Data: semua berkas LPJ bernomor (`lpj_packs`, field `arsip`) + koleksi `drpp`.
 */

import React, { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  FaArchive,
  FaClock,
  FaLayerGroup,
  FaQrcode,
  FaRegFileAlt,
  FaRegTrashAlt,
} from 'react-icons/fa';
import Modal from '@/components/Modal';
import { useLPJPacks } from '../../../hooks/useLPJ';
import { useLpjUser } from '../../../hooks/useLpjUser';
import { usePegawaiList } from '../../../hooks/usePegawaiList';
import {
  assignToDrpp,
  createDrpp,
  deleteDrpp,
  hapusPindaian,
  scanDrppDoc,
  scanLpj,
  setExpectedList,
  useDrppList,
} from '../../../hooks/useDrpp';
import { pesanGagalUnggah } from '../../../services/lpjStorage';
import {
  barisLpj,
  berkasArsip,
  drppLocked,
  lpjArsipStatus,
  lpjPendingDrpp,
} from '../../../utils/drppLogic';
import ArsipLpjModal from '../ArsipLpjModal';
import LpjTab from './LpjTab';
import DrppTab from './DrppTab';
import DrppDetail from './DrppDetail';
import ScanLpjModal from './ScanLpjModal';
import CreateDrppModal from './CreateDrppModal';
import EditDaftarModal from './EditDaftarModal';
import DrppPickerModal from './DrppPickerModal';
import { useToast } from '@/utils/toastStore';
import { BTN, FONT, LAYOUT, STATUS, T } from '@/utils/uiTokens';
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

const BASE = '/e-persuratan/arsip';

export default function ArsipKeuangan() {
  const navigate = useNavigate();
  const showToast = useToast();
  const { uid, nama, isSuperAdmin } = useLpjUser();
  const {
    packs,
    loading: loadingPacks,
    error: errPacks,
  } = useLPJPacks({
    isAdmin: true,
    userUid: uid,
  });
  const { list: drpps, loading: loadingDrpp, error: errDrpp } = useDrppList({ uid });
  const { pegawai } = usePegawaiList();

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
  const [lihatId, setLihatId] = useState(null);
  const [scanId, setScanId] = useState(null);
  const [create, setCreate] = useState(null); // null | { initialExpectedIds, thenAssign }
  const [pickerIds, setPickerIds] = useState(null);
  const [editId, setEditId] = useState(null);
  const [hapusDrppId, setHapusDrppId] = useState(null);
  const [menghapus, setMenghapus] = useState(false);

  const arsipPacks = useMemo(() => berkasArsip(packs), [packs]);
  const packsById = useMemo(
    () => Object.fromEntries(arsipPacks.map((p) => [p.id, p])),
    [arsipPacks],
  );
  const rows = useMemo(() => arsipPacks.map(barisLpj), [arsipPacks]);
  const rowById = useMemo(() => Object.fromEntries(rows.map((r) => [r.packId, r])), [rows]);

  const loading = loadingPacks || loadingDrpp;
  const error = errPacks || errDrpp;
  const detail = detailId ? drpps.find((d) => d.id === detailId) : null;
  if (!loading && !error && detailId && !detail) return <Navigate to={`${BASE}/drpp`} replace />;

  const gotoTab = (t) => {
    setAssignTarget(null);
    navigate(t === 'drpp' ? `${BASE}/drpp` : BASE);
  };
  const openDrpp = (id) => navigate(`${BASE}/drpp/${encodeURIComponent(id)}`);

  // ─── Aksi ──────────────────────────────────────────────────────────────────

  async function saveScan({ file, kwitansi }) {
    const r = rowById[scanId];
    try {
      const { autoDrppId } = await scanLpj({ pack: r.pack, file, kwitansi, uid, nama, drpps });
      showToast(
        `Berkas ${r.id} berhasil dipindai${autoDrppId ? ' dan otomatis masuk ke ' + autoDrppId : ''}.`,
      );
      setScanId(null);
      return true;
    } catch (err) {
      console.error('scanLpj error:', err);
      showToast(
        err?.code?.startsWith('storage/') ? pesanGagalUnggah(err) : 'Gagal menyimpan pindaian.',
        'error',
      );
      return false;
    }
  }

  async function submitCreate({ files, expectedIds }) {
    const wasAssign = create.thenAssign;
    try {
      const r = await createDrpp({ files, expectedIds, packsById, drpps, uid, nama });
      showToast(
        `${r.id} berhasil dibuat` +
          (expectedIds.length
            ? ` · ${r.nowIn} LPJ langsung masuk` +
              (r.waiting > 0 ? `, ${r.waiting} menunggu scan` : '')
            : '') +
          '.',
      );
      if (r.gagalUnggah.length) {
        showToast(
          `Dokumen ${r.gagalUnggah.join(', ')} gagal diunggah. Pindai ulang dari detail DRPP.`,
          'error',
        );
      }
      setCreate(null);
      if (wasAssign) setSelected({});
      openDrpp(r.id);
      return true;
    } catch (err) {
      console.error('createDrpp error:', err);
      showToast('Gagal membuat DRPP.', 'error');
      return false;
    }
  }

  async function assignTo(ids, drppId) {
    const d = drpps.find((x) => x.id === drppId);
    if (!d || drppLocked(packsById, arsipPacks, d)) {
      showToast('DRPP ini sudah terkunci. LPJ tidak bisa ditambahkan lagi.', 'error');
      return false;
    }
    try {
      const n = await assignToDrpp({ drpp: d, packIds: ids, packsById, drpps });
      showToast(`${n} berkas berhasil dimasukkan ke ${drppId}.`);
      setSelected({});
      setPickerIds(null);
      setAssignTarget(null);
      openDrpp(drppId);
      return true;
    } catch (err) {
      console.error('assignToDrpp error:', err);
      showToast('Gagal memasukkan berkas ke DRPP.', 'error');
      return false;
    }
  }

  async function saveExpected(ids) {
    const d = drpps.find((x) => x.id === editId);
    try {
      await setExpectedList({ drpp: d, ids, packs: arsipPacks, packsById, drpps });
      showToast(`Daftar LPJ untuk ${d.id} berhasil diperbarui.`);
      setEditId(null);
      return true;
    } catch (err) {
      console.error('setExpectedList error:', err);
      showToast('Gagal menyimpan daftar LPJ.', 'error');
      return false;
    }
  }

  async function konfirmHapusDrpp() {
    const d = drpps.find((x) => x.id === hapusDrppId);
    if (!d) {
      setHapusDrppId(null);
      showToast(`${hapusDrppId} sudah tidak ada (mungkin sudah dihapus).`);
      navigate(`${BASE}/drpp`);
      return;
    }
    setMenghapus(true);
    try {
      await deleteDrpp({ drpp: d, packs: arsipPacks });
      showToast(`${d.id} dihapus. Berkas di dalamnya kembali "Belum Masuk DRPP".`);
      setHapusDrppId(null);
      navigate(`${BASE}/drpp`);
    } catch (err) {
      console.error('deleteDrpp error:', err);
      showToast('Gagal menghapus DRPP.', 'error');
    } finally {
      setMenghapus(false);
    }
  }

  async function hapusArsipLpj(r) {
    try {
      await hapusPindaian(r.pack);
      showToast(`Pindaian ${r.id} dihapus.`);
      setLihatId(null);
      return true;
    } catch (err) {
      console.error('hapusPindaian error:', err);
      showToast('Gagal menghapus pindaian.', 'error');
      return false;
    }
  }

  async function scanDoc(d, key, file) {
    try {
      await scanDrppDoc(d, key, file, uid);
      showToast(`Dokumen ${key.toUpperCase()} berhasil dipindai.`);
    } catch (err) {
      console.error('scanDrppDoc error:', err);
      showToast(pesanGagalUnggah(err), 'error');
    }
  }

  // ─── Isi halaman ───────────────────────────────────────────────────────────

  let body;
  if (loading) {
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
        {error}
      </p>
    );
  } else if (detail) {
    body = (
      <DrppDetail
        key={detail.id}
        drpp={detail}
        packs={arsipPacks}
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
        onLihat={(r) => setLihatId(r.packId)}
        onHapus={isSuperAdmin ? (d) => setHapusDrppId(d.id) : undefined}
      />
    );
  } else {
    const c = { belum_scan: 0, belum_drpp: 0, masuk_drpp: 0 };
    arsipPacks.forEach((p) => c[lpjArsipStatus(p)]++);
    const cards = [
      { label: 'Total Berkas Diserahkan', num: arsipPacks.length, Icon: FaArchive, tone: 'navy' },
      { label: 'Belum Discan', num: c.belum_scan, Icon: FaQrcode, tone: 'neutral' },
      { label: 'Sudah Discan · Belum DRPP', num: c.belum_drpp, Icon: FaClock, tone: 'warn' },
      { label: 'Sudah Masuk DRPP', num: c.masuk_drpp, Icon: FaLayerGroup, tone: 'good' },
      { label: 'Total DRPP Dibuat', num: drpps.length, Icon: FaRegFileAlt, tone: 'info' },
    ];
    body = (
      <>
        <div
          ref={statRef}
          className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-2.5 sm:gap-3.5 mb-5"
        >
          {cards.map(({ label, num, Icon, tone }) => (
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
                  <AngkaBerjalan nilai={num} />
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
                onCancelAssign={() => setAssignTarget(null)}
                onScan={(r) => setScanId(r.packId)}
                onLihat={(r) => setLihatId(r.packId)}
                onGroup={setPickerIds}
                onAssignDirect={(ids) => assignTo(ids, assignTarget)}
              />
            ) : (
              <DrppTab
                drpps={drpps}
                packs={arsipPacks}
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

  const lihatRow = lihatId ? rowById[lihatId] : null;
  const scanRow = scanId ? rowById[scanId] : null;
  const editDrpp = editId ? drpps.find((d) => d.id === editId) : null;

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
          </div>
        )}
        {body}
      </div>

      {lihatRow && !scanRow && (
        <ArsipLpjModal
          row={lihatRow}
          pegawai={pegawai}
          kelola
          terkunci={(() => {
            const d = lihatRow.drppId && drpps.find((x) => x.id === lihatRow.drppId);
            return !!d && drppLocked(packsById, arsipPacks, d);
          })()}
          onClose={() => setLihatId(null)}
          onGantiScan={(r) => setScanId(r.packId)}
          onHapusPindaian={isSuperAdmin ? hapusArsipLpj : undefined}
        />
      )}
      {scanRow && (
        <ScanLpjModal
          row={scanRow}
          pendingDrppId={lpjPendingDrpp(drpps, scanRow.pack)?.id}
          onClose={() => setScanId(null)}
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
          packs={arsipPacks}
          packsById={packsById}
          onClose={() => setPickerIds(null)}
          onConfirm={(drppId) => assignTo(pickerIds, drppId)}
          onCreateNew={() => {
            setCreate({ initialExpectedIds: pickerIds, thenAssign: true });
            setPickerIds(null);
          }}
        />
      )}
      {hapusDrppId && (
        <Modal
          widthClass="max-w-[420px]"
          onClose={menghapus ? undefined : () => setHapusDrppId(null)}
          labelledBy="judul-hapus-drpp"
        >
          <div className="p-6">
            <h3 id="judul-hapus-drpp" className={`${FONT.head} font-bold text-base ${T.ink}`}>
              Hapus {hapusDrppId}?
            </h3>
            <p className={`mt-1.5 text-[13px] leading-[1.55] ${T.inkMuted}`}>
              Dokumen DRPP, SPM, dan SP2D yang sudah dipindai ikut terhapus. Berkas LPJ di dalamnya
              tidak terhapus; statusnya kembali "Belum Masuk DRPP".
            </p>
            <div className="flex justify-end gap-2 pt-5">
              <button
                type="button"
                className={BTN.ghost}
                onClick={() => setHapusDrppId(null)}
                disabled={menghapus}
              >
                Batal
              </button>
              <button
                type="button"
                className={BTN.danger}
                onClick={konfirmHapusDrpp}
                disabled={menghapus}
              >
                <FaRegTrashAlt size={12} /> {menghapus ? 'Menghapus…' : 'Ya, Hapus'}
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
