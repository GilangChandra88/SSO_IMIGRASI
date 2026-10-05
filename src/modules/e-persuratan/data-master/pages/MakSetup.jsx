/**
 * MAK Setup (MakSetupPage purwarupa admin): Struktur MAK dengan tampilan Rekap/Pohon/Explorer/
 * Kolom, Import CSV, dan Copy Tahun. Data di koleksi `MAK`, realisasi dari `MAK_History`.
 */
import React, { useMemo, useRef, useState } from 'react';
import { addDoc, collection, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { FaCopy, FaDownload, FaFilter, FaTable, FaUpload } from 'react-icons/fa';
import { db } from '@/config/firebase';
import StrukturHierarki from '@/components/StrukturHierarki/StrukturHierarki';
import { formatRupiah, indeksHierarki } from '@/components/StrukturHierarki/hierarkiUtils';
import ToastViewport from '@/components/ToastViewport';
import { showToast } from '@/utils/toastStore';
import { ADMIN, GOLD, STATUS, T } from '@/utils/uiTokens';
import MakCopyModal from '../components/MakCopyModal';
import MakImportModal from '../components/MakImportModal';
import MakRekap from '../components/MakRekap';
import { useMakHistory, useMakNodes } from '../hooks/useMakData';
import {
  BULAN_NAMES,
  MAK_HIERARCHY,
  buatAgregat,
  rencanaImportCsv,
  templateCsvMak,
} from '../utils/makUtils';

const MAK_BTN =
  'inline-flex items-center gap-[7px] px-[13px] py-2 rounded-[9px] text-[12.5px] font-bold whitespace-nowrap border';
const BATAS_BATCH = 450;

/** Tulis operasi Firestore per batch (maks. 500 per batch). */
async function commitBertahap(ops) {
  for (let i = 0; i < ops.length; i += BATAS_BATCH) {
    const batch = writeBatch(db);
    ops.slice(i, i + BATAS_BATCH).forEach((op) => op(batch));
    await batch.commit();
  }
}

export default function MakSetup() {
  const { data: nodes, loading } = useMakNodes();
  const { data: history } = useMakHistory();
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [rekapTertutup, setRekapTertutup] = useState(() => new Set());
  const [copyModal, setCopyModal] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const fileInputRef = useRef(null);
  const makCol = collection(db, 'MAK');

  const indeks = useMemo(() => indeksHierarki(nodes), [nodes]);
  const agregat = useMemo(
    () => buatAgregat(indeks, history, filterMonth, filterYear),
    [indeks, history, filterMonth, filterYear],
  );
  const tahunList = indeks.anakDari(null);

  // ─── Simpan / hapus node (dari StrukturHierarki) ──────────────────────────
  const simpanNode = async ({ mode, id, parentId, type, kode, name, pagu }) => {
    const isItem = type === 'Item';
    if (mode === 'edit') {
      await updateDoc(doc(db, 'MAK', id), { kode, name, ...(isItem ? { pagu } : {}) });
    } else {
      await addDoc(makCol, {
        kode,
        name,
        type,
        parentId: parentId ?? null,
        pagu: isItem ? pagu : 0,
        lockPagu: 0,
        createdAt: new Date().toISOString(),
      });
    }
  };

  const hapusNode = (ids) => commitBertahap(ids.map((id) => (b) => b.delete(doc(db, 'MAK', id))));

  // ─── Copy Tahun ───────────────────────────────────────────────────────────
  const submitCopy = async () => {
    const toName = copyModal.to.trim();
    if (!copyModal.from || !toName) {
      showToast('Pilih tahun sumber dan isi tahun tujuan.', 'error');
      return;
    }
    if (tahunList.some((n) => n.name === toName)) {
      showToast(`Tahun ${toName} sudah ada.`, 'error');
      return;
    }
    const sumber = indeks.byId.get(copyModal.from);
    if (!sumber) return;

    const ops = [];
    const antre = [{ lama: sumber, parentBaru: null }];
    while (antre.length) {
      const { lama, parentBaru } = antre.shift();
      const ref = doc(makCol);
      const data = {
        kode: lama.kode || '',
        name: lama.type === 'Tahun' ? toName : lama.name,
        type: lama.type,
        parentId: parentBaru,
        pagu: Number(lama.pagu) || 0,
        lockPagu: 0,
        createdAt: new Date().toISOString(),
      };
      ops.push((b) => b.set(ref, data));
      indeks.anakDari(lama.id).forEach((c) => antre.push({ lama: c, parentBaru: ref.id }));
    }

    setSibuk(true);
    try {
      await commitBertahap(ops);
      setCopyModal(null);
      showToast(`Berhasil menyalin ${ops.length} item ke tahun ${toName}.`);
    } catch {
      showToast('Gagal menyalin tahun.', 'error');
    } finally {
      setSibuk(false);
    }
  };

  // ─── Import CSV ───────────────────────────────────────────────────────────
  const downloadTemplate = () => {
    const url = URL.createObjectURL(
      new Blob([templateCsvMak()], { type: 'text/csv;charset=utf-8;' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Template_Import_MAK.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Template CSV berhasil diunduh.');
  };

  const prosesImport = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      showToast('Pilih file CSV terlebih dahulu.', 'error');
      return;
    }
    setSibuk(true);
    try {
      const { baru, ubahPagu } = rencanaImportCsv(nodes, await file.text(), () => doc(makCol).id);
      const createdAt = new Date().toISOString();
      const ops = [
        ...baru.map(
          ({ id, ...data }) =>
            (b) =>
              b.set(doc(db, 'MAK', id), { ...data, createdAt }),
        ),
        ...ubahPagu.map(
          ([id, pagu]) =>
            (b) =>
              b.update(doc(db, 'MAK', id), { pagu }),
        ),
      ];
      await commitBertahap(ops);
      setImportOpen(false);
      showToast(`Import CSV berhasil, ${baru.length} data baru ditambahkan.`);
    } catch (err) {
      showToast(`Gagal import: ${err.message}`, 'error');
    } finally {
      setSibuk(false);
    }
  };

  // ─── Tampilan ─────────────────────────────────────────────────────────────
  const toggleRekap = (id) =>
    setRekapTertutup((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const slotToolbar = ({ view, mencari }) => (
    <>
      {!mencari && (view === 'rekap' || view === 'columns') && (
        <div className="flex items-center gap-[7px] shrink-0">
          <FaFilter size={11} className={T.inkMuted} />
          <select
            aria-label="Pilih bulan"
            className={ADMIN.control}
            value={filterMonth}
            onChange={(e) => setFilterMonth(Number(e.target.value))}
          >
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
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <button
          type="button"
          className={`${MAK_BTN} cursor-pointer hover:brightness-95 ${STATUS.infoBg} ${STATUS.infoInk} ${STATUS.infoBorder}`}
          onClick={() => setImportOpen(true)}
        >
          <FaUpload size={11} />
          Import CSV
        </button>
        <button
          type="button"
          className={`${MAK_BTN} cursor-pointer hover:brightness-95 ${GOLD.tintBg} ${GOLD.strongText} ${GOLD.strongBorder}`}
          onClick={() => setCopyModal({ from: '', to: '' })}
        >
          <FaCopy size={11} />
          Copy Tahun
        </button>
        <button
          type="button"
          className={`${MAK_BTN} opacity-55 cursor-not-allowed ${T.surface2} ${T.inkMuted} ${T.border}`}
          disabled
          title="Segera hadir"
        >
          <FaDownload size={11} />
          Export
        </button>
      </div>
    </>
  );

  const viewRekap = {
    key: 'rekap',
    label: 'Rekap',
    icon: FaTable,
    render: () => (
      <MakRekap indeks={indeks} agregat={agregat} tertutup={rekapTertutup} onToggle={toggleRekap} />
    ),
  };

  const detailKolom = (node) => {
    const a = agregat(node.id);
    return [
      ['Pagu', `Rp ${formatRupiah(a.pagu)}`],
      ['Realisasi', `Rp ${formatRupiah(a.realisasi)}`],
      ['Sisa', `Rp ${formatRupiah(a.pagu - a.realisasi)}`],
    ];
  };

  return (
    <div className={`min-h-full ${T.ground}`}>
      <div className={ADMIN.page}>
        <section className={ADMIN.card}>
          <div className="mb-4">
            <h1 className={ADMIN.h1}>Struktur MAK</h1>
            <p className={ADMIN.sub}>
              Tahun → Program → Kegiatan → KRO → Output → Komponen → Sub Komponen → Akun → Item
            </p>
          </div>

          {loading ? (
            <p className={ADMIN.empty}>Memuat struktur MAK...</p>
          ) : (
            <StrukturHierarki
              nodes={nodes}
              hierarchy={MAK_HIERARCHY}
              denganPagu
              viewTambahan={[viewRekap]}
              slotToolbar={slotToolbar}
              detailKolom={detailKolom}
              onSimpan={simpanNode}
              onHapus={hapusNode}
              pesanPohonKosong="Belum ada data. Tambahkan Tahun anggaran lewat tampilan Explorer atau Import CSV."
            />
          )}
        </section>
      </div>

      {copyModal && (
        <MakCopyModal
          state={copyModal}
          tahunList={tahunList}
          onChange={setCopyModal}
          onClose={() => setCopyModal(null)}
          onSubmit={submitCopy}
          sibuk={sibuk}
        />
      )}
      {importOpen && (
        <MakImportModal
          fileInputRef={fileInputRef}
          onClose={() => setImportOpen(false)}
          onDownloadTemplate={downloadTemplate}
          onSubmit={prosesImport}
          sibuk={sibuk}
        />
      )}
      <ToastViewport />
    </div>
  );
}
