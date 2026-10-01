/**
 * Pengelola data berjenjang bergaya purwarupa admin (MAK Setup): kotak cari + hasil, pilihan
 * tampilan (Pohon/Explorer/Kolom + tampilan tambahan, mis. Rekap MAK), jendela Tambah/Edit,
 * dan konfirmasi hapus di baris. Dipakai MAK Setup dan Hierarki Kode Surat.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaColumns, FaFolder, FaSearch, FaSitemap } from 'react-icons/fa';
import { showToast } from '@/utils/toastStore';
import { ADMIN, FONT, STATUS, T } from '@/utils/uiTokens';
import ExplorerView from './ExplorerView';
import KolomView from './KolomView';
import NodeModal from './NodeModal';
import PohonView from './PohonView';
import { formatRupiah, idKeturunan, idLeluhur, indeksHierarki } from './hierarkiUtils';

const VIEW_BAWAAN = [
  { key: 'tree', label: 'Pohon', icon: FaSitemap },
  { key: 'explorer', label: 'Explorer', icon: FaFolder },
  { key: 'columns', label: 'Kolom', icon: FaColumns },
];
const MAKS_HASIL = 120;

/**
 * @param {object} props
 * @param {object[]} props.nodes            node { id, kode, name, type, parentId, pagu? }
 * @param {string[]} props.hierarchy        urutan tingkat, mis. ['Tahun', ..., 'Item']
 * @param {boolean} [props.denganPagu]      tingkat terakhir punya Pagu (MAK)
 * @param {{key,label,icon,render}[]} [props.viewTambahan]  tampilan sebelum Pohon (render(indeks))
 * @param {(ctx:{view:string, mencari:boolean}) => React.ReactNode} [props.slotToolbar]
 * @param {(node) => [string, React.ReactNode][]} [props.detailKolom]
 * @param {(data) => Promise<void>} props.onSimpan  data { mode, id, parentId, type, kode, name, pagu }
 * @param {(ids: string[]) => Promise<void>} props.onHapus
 * @param {string} [props.pesanPohonKosong]
 */
export default function StrukturHierarki({
  nodes,
  hierarchy,
  denganPagu = false,
  viewTambahan = [],
  slotToolbar,
  detailKolom,
  onSimpan,
  onHapus,
  pesanPohonKosong = 'Belum ada data. Tambahkan lewat tampilan Explorer.',
}) {
  const indeks = useMemo(() => indeksHierarki(nodes), [nodes]);
  const tipeAkhir = hierarchy[hierarchy.length - 1];
  const views = [...viewTambahan, ...VIEW_BAWAAN];

  const [view, setView] = useState(views[0].key);
  const [cari, setCari] = useState('');
  const [tertutup, setTertutup] = useState(() => new Set());
  const [jalur, setJalur] = useState([]);
  const [pilihan, setPilihan] = useState([]);
  const [pendingHapus, setPendingHapus] = useState(null);
  const [modal, setModal] = useState(null);
  const [sorotId, setSorotId] = useState(null);
  const [sibuk, setSibuk] = useState(false);
  const pohonRef = useRef(null);

  // Hasil cari yang dipilih: gulir ke barisnya di Pohon, lalu sorotan memudar
  useEffect(() => {
    if (!sorotId || view !== 'tree' || !pohonRef.current) return;
    const baris = pohonRef.current.querySelector(`[data-node-id="${CSS.escape(sorotId)}"]`);
    baris?.scrollIntoView({ block: 'center' });
  }, [sorotId, view]);
  useEffect(() => {
    if (!sorotId) return undefined;
    const t = setTimeout(() => setSorotId(null), 2200);
    return () => clearTimeout(t);
  }, [sorotId]);

  const toggle = (id) =>
    setTertutup((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const bukaCabang = (ids) =>
    setTertutup((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });

  const aksi = {
    tambah: (parentId, type) =>
      setModal({ mode: 'add', parentId, type, kode: '', name: '', pagu: '', error: false }),
    ubah: (id) => {
      const n = indeks.byId.get(id);
      if (!n) return;
      setModal({
        mode: 'edit',
        id,
        parentId: n.parentId ?? null,
        type: n.type,
        kode: n.kode || '',
        name: n.name || '',
        pagu: n.pagu ?? '',
        error: false,
      });
    },
    mintaHapus: (id) => setPendingHapus(id),
    batalHapus: () => setPendingHapus(null),
    hapus: async (id) => {
      setSibuk(true);
      try {
        await onHapus([id, ...idKeturunan(indeks, id)]);
        setPendingHapus(null);
        showToast('Data berhasil dihapus.');
      } catch {
        showToast('Gagal menghapus data.', 'error');
      } finally {
        setSibuk(false);
      }
    },
  };

  const simpanModal = async () => {
    if (!modal.name.trim()) {
      setModal({ ...modal, error: true });
      return;
    }
    setSibuk(true);
    try {
      await onSimpan({
        mode: modal.mode,
        id: modal.id,
        parentId: modal.parentId,
        type: modal.type,
        kode: modal.kode.trim(),
        name: modal.name.trim(),
        pagu: Number(modal.pagu) || 0,
      });
      if (modal.mode === 'add' && modal.parentId) bukaCabang([modal.parentId]);
      showToast(
        modal.mode === 'edit'
          ? 'Perubahan berhasil disimpan.'
          : `${modal.type} baru berhasil ditambahkan.`,
      );
      setModal(null);
    } catch {
      showToast('Gagal menyimpan data.', 'error');
    } finally {
      setSibuk(false);
    }
  };

  const q = cari.trim().toLowerCase();
  const hasil = q
    ? nodes.filter(
        (n) => (n.name || '').toLowerCase().includes(q) || (n.kode || '').toLowerCase().includes(q),
      )
    : [];

  const pilihHasil = (n) => {
    setCari('');
    bukaCabang(idLeluhur(indeks, n.id));
    setSorotId(n.id);
    setView('tree');
  };

  const ctx = { indeks, hierarchy, tipeAkhir, denganPagu, pendingHapus, aksi, sibuk };
  const viewTambahanAktif = viewTambahan.find((v) => v.key === view);

  return (
    <>
      <div className={ADMIN.toolbar}>
        <div className={ADMIN.search}>
          <FaSearch size={12} className="shrink-0" />
          <input
            type="search"
            className={ADMIN.searchInput}
            placeholder="Cari kode / keterangan..."
            aria-label="Cari struktur"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
          />
        </div>
        {slotToolbar?.({ view, mencari: !!q })}
        <div className={ADMIN.seg} role="tablist" aria-label="Pilihan tampilan">
          {views.map((v) => {
            const Icon = v.icon;
            const aktif = view === v.key && !q;
            return (
              <button
                type="button"
                role="tab"
                aria-selected={aktif}
                key={v.key}
                className={aktif ? ADMIN.segActive : ADMIN.segBtn}
                onClick={() => {
                  setCari('');
                  setView(v.key);
                }}
              >
                <Icon size={12} />
                {v.label}
              </button>
            );
          })}
        </div>
      </div>

      {q ? (
        <div>
          <p className={`${ADMIN.sub} mb-3`}>
            Hasil Pencarian ({hasil.length})
            {hasil.length > MAKS_HASIL && ` · menampilkan ${MAKS_HASIL} teratas`}
          </p>
          {hasil.length === 0 ? (
            <p className={ADMIN.empty}>Tidak ada data yang cocok dengan pencarian Anda.</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3">
              {hasil.slice(0, MAKS_HASIL).map((n) => (
                <button
                  type="button"
                  key={n.id}
                  className={`flex flex-col gap-1.5 p-[13px] rounded-xl border text-left cursor-pointer transition-[border-color,box-shadow] ${T.surface} ${T.border} hover:border-[#CBD3DE] dark:hover:border-[#304864] hover:shadow-[0_1px_2px_rgba(16,26,44,.07)]`}
                  onClick={() => pilihHasil(n)}
                >
                  <span
                    className={`w-fit text-[9.5px] font-bold uppercase tracking-[.04em] px-2 py-0.5 rounded-full ${STATUS.infoBg} ${STATUS.infoInk}`}
                  >
                    {n.type}
                  </span>
                  {n.kode && (
                    <span className={`${FONT.mono} text-[11.5px] font-bold ${T.ink2}`}>
                      {n.kode}
                    </span>
                  )}
                  <span className={`text-[13px] font-semibold leading-[1.4] ${T.ink}`}>
                    {n.name}
                  </span>
                  {denganPagu && n.type === tipeAkhir && Number(n.pagu) > 0 && (
                    <span className={`text-[11.5px] font-semibold ${STATUS.goodInk}`}>
                      Rp {formatRupiah(n.pagu)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : viewTambahanAktif ? (
        viewTambahanAktif.render(indeks)
      ) : view === 'tree' ? (
        <PohonView
          {...ctx}
          wadahRef={pohonRef}
          tertutup={tertutup}
          onToggle={toggle}
          sorotId={sorotId}
          pesanKosong={pesanPohonKosong}
        />
      ) : view === 'explorer' ? (
        <ExplorerView {...ctx} jalur={jalur} setJalur={setJalur} />
      ) : (
        <KolomView {...ctx} pilihan={pilihan} setPilihan={setPilihan} detailKolom={detailKolom} />
      )}

      {modal && (
        <NodeModal
          data={modal}
          setData={setModal}
          denganPagu={denganPagu && modal.type === tipeAkhir}
          onTutup={() => setModal(null)}
          onSimpan={simpanModal}
          sibuk={sibuk}
        />
      )}
    </>
  );
}
