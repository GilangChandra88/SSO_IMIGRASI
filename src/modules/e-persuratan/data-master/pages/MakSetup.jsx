/**
 * MAK Setup (MakSetupPage purwarupa admin) untuk Keuangan: Struktur MAK satu tahun anggaran
 * (`mak_node`) dengan tampilan Rekap/Pohon/Explorer/Kolom, Import CSV, Copy Tahun, dan DIPA.
 * Realisasi di Rekap dibaca dari `mak_rekap` (ditulis Cloud Function), bukan dihitung dari riwayat.
 * Sisa Awal Item (anggaran yang terpakai di luar aplikasi) diatur dari baris Item di Rekap.
 * Hapus node lewat Function: node yang sudah dipakai realisasi dinonaktifkan, bukan dihapus.
 */
import React, { useMemo, useRef, useState } from 'react';
import {
  FaCopy,
  FaDownload,
  FaExclamationTriangle,
  FaFilter,
  FaTable,
  FaUpload,
} from 'react-icons/fa';
import StrukturHierarki from '@/components/StrukturHierarki/StrukturHierarki';
import { formatRupiah, indeksHierarki } from '@/components/StrukturHierarki/hierarkiUtils';
import ToastViewport from '@/components/ToastViewport';
import { useAuth } from '@/context/AuthContext';
import { PANJANG } from '@/utils/batas';
import { tahunIni, tanggalIso } from '@/utils/nilai';
import { pesanGalat } from '@/utils/pesanGalat';
import { showToast } from '@/utils/toastStore';
import { ADMIN, GOLD, STATUS, T } from '@/utils/uiTokens';
import { LABEL_TINGKAT } from '../../makPohon';
import { useDipa } from '../../useDipa';
import { useMakTahun } from '../../useMakTahun';
import KartuDipa from '../components/KartuDipa';
import MakCopyModal from '../components/MakCopyModal';
import MakImportModal from '../components/MakImportModal';
import MakRekap from '../components/MakRekap';
import ModalSisaAwal from '../components/ModalSisaAwal';
import { useRekapMak } from '../hooks/useMakData';
import {
  aturRealisasiAwal,
  hapusNodeMak,
  idNodeBaru,
  salinTahun,
  simpanDipa,
  simpanImport,
  tambahNode,
  ubahNode,
} from '../services/makDb';
import {
  BULAN_NAMES,
  HIERARKI_MAK,
  TINGKAT_DARI_LABEL,
  buatAgregat,
  rencanaImportCsv,
  templateCsvMak,
} from '../utils/makUtils';

const MAK_BTN =
  'inline-flex items-center gap-[7px] px-[13px] py-2 rounded-[9px] text-[12.5px] font-bold whitespace-nowrap border';
const TAHUN_MIN = 2024;
const TAHUN_MAKS = 2100;

/** Galat dengan pesan siap tampil (StrukturHierarki menampilkan `pesan` apa adanya). */
const galatPengguna = (pesan) => Object.assign(new Error(pesan), { pesan });

export default function MakSetup() {
  const { currentUser, isSuperAdmin } = useAuth();
  const uid = currentUser?.uid || '';
  const [tahun, setTahun] = useState(tahunIni);
  const [tahunTeks, setTahunTeks] = useState(() => String(tahunIni()));
  const [bulan, setBulan] = useState(() => Number(tanggalIso().slice(5, 7)));
  const [rekapTertutup, setRekapTertutup] = useState(() => new Set());
  const [copyKe, setCopyKe] = useState(null); // null = jendela tertutup
  const [importOpen, setImportOpen] = useState(false);
  const [sisaItem, setSisaItem] = useState(null); // node Item yang Sisa Awal-nya diatur
  const [sibuk, setSibuk] = useState(false);
  const fileInputRef = useRef(null);

  const { nodes, memuat } = useMakTahun(tahun);
  const { rekap } = useRekapMak(tahun);
  const { dipa } = useDipa(tahun);
  // Sama dengan rules: anggaran lebih dari setahun lalu hanya diubah Super Admin
  const terbuka = tahun >= tahunIni() - 1 || isSuperAdmin;
  const akarTahun = nodes.find((n) => n.tingkat === 'tahun') || null;

  // Bentuk node untuk StrukturHierarki (nama field tampilan komponen bersama)
  const tampil = useMemo(
    () =>
      nodes.map((n) => ({
        id: n.id,
        kode: n.kode || '',
        name: n.aktif === false ? `${n.nama} · nonaktif` : n.nama,
        nameAsli: n.nama,
        type: LABEL_TINGKAT[n.tingkat],
        parentId: n.indukId ?? null,
        pagu: n.pagu,
        realisasiAwal: Number(n.realisasiAwal) || 0,
        aktif: n.aktif !== false,
      })),
    [nodes],
  );
  const indeks = useMemo(() => indeksHierarki(tampil), [tampil]);
  const agregat = useMemo(() => buatAgregat(indeks, rekap, bulan), [indeks, rekap, bulan]);

  const ubahTahun = (teks) => {
    setTahunTeks(teks);
    const t = Number(teks);
    if (/^\d{4}$/.test(teks) && t >= TAHUN_MIN && t <= TAHUN_MAKS) setTahun(t);
  };

  // ─── Simpan / hapus node (dari StrukturHierarki) ──────────────────────────
  const simpanNode = async ({ mode, id, parentId, type, kode, name, pagu, aktif }) => {
    if (!terbuka)
      throw galatPengguna(
        `Anggaran ${tahun} sudah ditutup; hanya Super Admin yang bisa mengubahnya.`,
      );
    const tingkat = TINGKAT_DARI_LABEL[type];
    if (kode.length > PANJANG.kodeMak)
      throw galatPengguna(`Kode maksimal ${PANJANG.kodeMak} karakter.`);
    if (name.length > PANJANG.namaMak)
      throw galatPengguna(`Nama maksimal ${PANJANG.namaMak} karakter.`);
    if (tingkat === 'item' && !(Number.isInteger(pagu) && pagu >= 0 && pagu <= 1e12)) {
      throw galatPengguna('Pagu harus berupa rupiah bulat.');
    }
    const terpakaiLuar = mode === 'edit' ? indeks.byId.get(id)?.realisasiAwal || 0 : 0;
    if (tingkat === 'item' && pagu < terpakaiLuar) {
      throw galatPengguna(
        `Pagu tidak boleh kurang dari anggaran yang sudah terpakai di luar aplikasi (Rp ${formatRupiah(terpakaiLuar)}). Ubah dulu Sisa Awal Item ini di tampilan Rekap.`,
      );
    }
    if (mode !== 'edit' && tingkat === 'tahun') {
      if (akarTahun) throw galatPengguna(`Tahun anggaran ${tahun} sudah ada.`);
      if (name !== String(tahun)) {
        throw galatPengguna(
          `Isi Nama dengan ${tahun}. Untuk tahun lain, ganti pilihan Tahun Anggaran di atas.`,
        );
      }
    }
    try {
      if (mode === 'edit') await ubahNode(id, { tingkat, kode, nama: name, pagu, aktif }, uid);
      else {
        await tambahNode(
          { tahunAnggaran: tahun, tingkat, kode, nama: name, indukId: parentId, pagu },
          uid,
        );
      }
    } catch (err) {
      throw galatPengguna(pesanGalat(err, 'Gagal menyimpan data.'));
    }
  };

  const hapusNode = async ([akarId]) => {
    if (!terbuka)
      throw galatPengguna(
        `Anggaran ${tahun} sudah ditutup; hanya Super Admin yang bisa mengubahnya.`,
      );
    try {
      const hasil = await hapusNodeMak(akarId);
      return hasil.dinonaktifkan
        ? `Sudah dipakai realisasi, jadi ${hasil.dinonaktifkan} data dinonaktifkan (tidak bisa dipilih lagi).`
        : `${hasil.dihapus} data berhasil dihapus.`;
    } catch (err) {
      throw galatPengguna(pesanGalat(err, 'Gagal menghapus data.'));
    }
  };

  // ─── Copy Tahun ───────────────────────────────────────────────────────────
  const submitCopy = async () => {
    const ke = Number(copyKe);
    if (!/^\d{4}$/.test(copyKe || '') || ke < TAHUN_MIN || ke > TAHUN_MAKS) {
      showToast('Isi tahun tujuan dengan 4 digit, mis. 2027.', 'error');
      return;
    }
    if (ke === tahun) {
      showToast('Tahun tujuan harus berbeda dengan tahun sumber.', 'error');
      return;
    }
    if (!akarTahun) {
      showToast(`Tahun ${tahun} belum punya struktur MAK untuk disalin.`, 'error');
      return;
    }
    setSibuk(true);
    try {
      const jumlah = await salinTahun(nodes, ke, uid);
      setCopyKe(null);
      showToast(`Berhasil menyalin ${jumlah} data ke tahun ${ke}.`);
    } catch (err) {
      showToast(err.pesan || pesanGalat(err, 'Gagal menyalin tahun.'), 'error');
    } finally {
      setSibuk(false);
    }
  };

  // ─── Import CSV ───────────────────────────────────────────────────────────
  const downloadTemplate = () => {
    const url = URL.createObjectURL(
      new Blob([templateCsvMak(tahun)], { type: 'text/csv;charset=utf-8;' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `Template_Import_MAK_${tahun}.csv`;
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
      let rencana;
      try {
        rencana = rencanaImportCsv(nodes, await file.text(), idNodeBaru, tahun);
      } catch (err) {
        showToast(`Gagal import: ${err.message}`, 'error');
        return;
      }
      await simpanImport(rencana, uid);
      setImportOpen(false);
      showToast(
        `Import CSV berhasil: ${rencana.baru.length} data baru, ${rencana.ubah.length} Item diperbarui (pagu/Sisa Awal).`,
      );
    } catch (err) {
      showToast(pesanGalat(err, 'Gagal menyimpan hasil import.'), 'error');
    } finally {
      setSibuk(false);
    }
  };

  const simpanDataDipa = async (data) => {
    try {
      await simpanDipa(tahun, data, uid, !!dipa);
      showToast(`DIPA ${tahun} tersimpan.`);
    } catch (err) {
      showToast(pesanGalat(err, 'Gagal menyimpan DIPA.'), 'error');
      throw err;
    }
  };

  const simpanSisaAwal = async (realisasiAwal) => {
    setSibuk(true);
    try {
      await aturRealisasiAwal(sisaItem.id, realisasiAwal, uid);
      showToast(`Sisa Awal ${sisaItem.kode || sisaItem.name} tersimpan.`);
      setSisaItem(null);
    } catch (err) {
      showToast(pesanGalat(err, 'Gagal menyimpan Sisa Awal.'), 'error');
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
            aria-label="Pilih bulan realisasi"
            className={ADMIN.control}
            value={bulan}
            onChange={(e) => setBulan(Number(e.target.value))}
          >
            {BULAN_NAMES.map((name, i) => (
              <option value={i + 1} key={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <button
          type="button"
          className={`${MAK_BTN} cursor-pointer hover:brightness-95 disabled:opacity-55 disabled:cursor-not-allowed ${STATUS.infoBg} ${STATUS.infoInk} ${STATUS.infoBorder}`}
          onClick={() => setImportOpen(true)}
          disabled={!terbuka}
        >
          <FaUpload size={11} />
          Import CSV
        </button>
        <button
          type="button"
          className={`${MAK_BTN} cursor-pointer hover:brightness-95 ${GOLD.tintBg} ${GOLD.strongText} ${GOLD.strongBorder}`}
          onClick={() => setCopyKe(String(tahun + 1))}
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
      <MakRekap
        indeks={indeks}
        agregat={agregat}
        tertutup={rekapTertutup}
        onToggle={toggleRekap}
        onAturSisa={terbuka ? setSisaItem : undefined}
      />
    ),
  };

  const detailKolom = (node) => {
    const a = agregat(node.id);
    return [
      ['Pagu', `Rp ${formatRupiah(a.pagu)}`],
      ...(node.realisasiAwal > 0
        ? [['Terpakai di luar aplikasi', `Rp ${formatRupiah(node.realisasiAwal)}`]]
        : []),
      ['Realisasi', `Rp ${formatRupiah(a.realisasi)}`],
      ['Sisa', `Rp ${formatRupiah(a.sisa)}`],
    ];
  };

  return (
    <div className={`min-h-full ${T.ground}`}>
      <div className={ADMIN.page}>
        <section className={ADMIN.card}>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className={ADMIN.h1}>Struktur MAK</h1>
              <p className={ADMIN.sub}>
                Tahun → Program → Kegiatan → KRO → Output → Komponen → Sub Komponen → Akun → Item
              </p>
            </div>
            <label className={`flex items-center gap-2 text-[12.5px] font-semibold ${T.ink2}`}>
              Tahun Anggaran
              <input
                type="number"
                min={TAHUN_MIN}
                max={TAHUN_MAKS}
                className={`${ADMIN.control} w-[86px]`}
                value={tahunTeks}
                onChange={(e) => ubahTahun(e.target.value)}
              />
            </label>
          </div>

          {!terbuka && (
            <div className={`${ADMIN.warnBanner} mb-4`}>
              <FaExclamationTriangle size={12} className="shrink-0 mt-0.5" />
              <span>
                Anggaran {tahun} sudah ditutup: struktur hanya bisa dilihat. Perubahan hanya oleh
                Super Admin.
              </span>
            </div>
          )}

          {/* Kunci harus beda dengan StrukturHierarki di bawah: kunci kembar dalam satu induk
              membuat kartu lama tidak dibuang React sehingga menumpuk setiap ganti tahun. */}
          <KartuDipa
            key={`dipa-${tahun}`}
            tahun={tahun}
            tahunNodeId={akarTahun?.id || ''}
            dipa={dipa}
            bolehUbah={terbuka}
            onSimpan={simpanDataDipa}
          />

          {memuat ? (
            <p className={ADMIN.empty}>Memuat struktur MAK...</p>
          ) : (
            <StrukturHierarki
              key={`struktur-${tahun}`}
              nodes={tampil}
              hierarchy={HIERARKI_MAK}
              denganPagu
              denganStatus
              viewTambahan={[viewRekap]}
              slotToolbar={slotToolbar}
              detailKolom={detailKolom}
              onSimpan={simpanNode}
              onHapus={hapusNode}
              pesanPohonKosong={`Belum ada struktur MAK ${tahun}. Tambahkan Tahun ${tahun} lewat tampilan Explorer, Import CSV, atau Copy Tahun dari tahun sebelumnya.`}
            />
          )}
        </section>
      </div>

      {copyKe !== null && (
        <MakCopyModal
          dariTahun={tahun}
          keTahun={copyKe}
          onChange={setCopyKe}
          onClose={() => setCopyKe(null)}
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
      {sisaItem && (
        <ModalSisaAwal
          item={sisaItem}
          realisasiAplikasi={Number(rekap?.item?.[sisaItem.id]?.total) || 0}
          onClose={() => setSisaItem(null)}
          onSubmit={simpanSisaAwal}
          sibuk={sibuk}
        />
      )}
      <ToastViewport />
    </div>
  );
}
