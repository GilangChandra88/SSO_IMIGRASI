/**
 * Logika inti berkas LPJ — port dari src/utils/lpjLogic.js purwarupa, disesuaikan ke
 * dokumen Firestore `lpj_packs` skema 2 (bagian sp/spd/lpj/lap/np dalam satu dokumen).
 * Semua fungsi murni (tanpa Firestore/DOM) supaya dipakai bersama oleh Daftar, Detail,
 * form, dan Dashboard.
 */
import { LPJ_DOCS, NP_PACK_DOCS, NP_RINCIAN_DOCS } from '../data/masterLpj';

export const STAGE_STATUS_LABEL = {
  selesai: 'Selesai',
  revisi: 'Perlu Revisi',
  proses: 'Dalam Proses',
  belum: 'Belum Dimulai',
  terkunci: 'Terkunci',
};

// Berkas format lama (skema 1) memakai `type` dan `judul`; skema 2 memakai `jenis` dan `uraian`
export const isPerjadin = (pack) => (pack?.jenis || pack?.type) === 'perjadin';
export const isSkemaBaru = (pack) => pack?.skema === 2;
export const jenisLabel = (pack) => (isPerjadin(pack) ? 'Perjadin' : 'NON-Perjadin');
export const uraianOf = (pack) => pack?.uraian || pack?.judul || pack?.perihal || '';

/** Pelaksana berkas: "Kepada" Surat Perintah (Perjadin) atau pelaksana Non-Perjadin. */
export function pelaksanaOf(pack) {
  if (!pack) return [];
  if (!isSkemaBaru(pack)) return pack.pegawai_list || [];
  return (isPerjadin(pack) ? pack.sp?.kepada : pack.np?.pelaksana) || [];
}

// ─── Angka & transaksi ───────────────────────────────────────────────────────

/** "1.500.000" → 1500000 */
export const parseNum = (val) => Number(String(val ?? '').replace(/[^0-9]/g, '')) || 0;

/** 1500000 / "1500000" → "1.500.000" (kosong bila bukan angka) */
export function formatNum(val) {
  const digits = String(val ?? '').replace(/\D/g, '');
  return digits ? parseInt(digits, 10).toLocaleString('id-ID') : '';
}

export const rupiah = (n) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');

export function transaksiOf(pack) {
  if (!pack) return [];
  return (isPerjadin(pack) ? pack.lpj?.transaksi : pack.np?.transaksi) || [];
}

export function makOf(pack) {
  if (!pack) return null;
  return isPerjadin(pack) ? pack.spd?.mak : pack.np?.mak;
}

export const lpjRowTotal = (pack) =>
  transaksiOf(pack).reduce((sum, t) => sum + parseNum(t.jumlah), 0);

/**
 * Gabungkan baris transaksi dengan item yang sama jadi satu baris (panel "Detail Transaksi").
 * @returns {{ itemKode, label, total }[]}
 */
export function groupTransaksiByItem(transaksi) {
  const order = [];
  const map = {};
  (transaksi || []).forEach((t) => {
    if (!t.itemNodeId && !t.itemName) return;
    const key = (t.itemNodeId || '') + '|' + (t.itemName || '');
    if (!map[key]) {
      map[key] = { itemKode: t.itemKode || '', label: t.itemName || '', total: 0 };
      order.push(key);
    }
    map[key].total += parseNum(t.jumlah);
  });
  return order.map((k) => map[k]);
}

// ─── Apakah suatu bagian sudah mulai diisi ──────────────────────────────────

export function pfHasSpData(sp) {
  if (!sp) return false;
  return !!(
    sp.nomorSurat ||
    sp.menimbang ||
    sp.pejabat ||
    (sp.dasar || []).some((d) => d) ||
    (sp.untuk || []).some((u) => u)
  );
}

export function pfHasSpdData(spd) {
  if (!spd) return false;
  return !!(
    spd.nomorSPD ||
    spd.maksud ||
    spd.tujuan ||
    spd.alatAngkut ||
    spd.berangkat ||
    spd.kembali ||
    spd.seksi ||
    spd.kodeNo
  );
}

const txFilled = (t) => t && (t.pelaksanaId || t.itemNodeId || t.jumlah);

export function pfHasLpjData(lpj) {
  if (!lpj) return false;
  if (lpj.tanggalLPJ || lpj.keterangan) return true;
  return (lpj.transaksi || []).some(txFilled);
}

export function pfHasLapData(lap) {
  if (!lap) return false;
  return !!(
    lap.tanggalLaporan ||
    lap.pendahuluan ||
    lap.pelaksanaan ||
    lap.hasil ||
    lap.kesimpulan ||
    lap.rekomendasi ||
    (lap.fotos && lap.fotos.length)
  );
}

export function npHasFormData(np) {
  if (!np) return false;
  return !!(np.tanggal || np.mak?.akunNodeId || (np.transaksi || []).some(txFilled));
}

// ─── Fase per jenis berkas ───────────────────────────────────────────────────

/**
 * Fase (kartu di halaman Detail & ringkasan "Progress Dokumen").
 * `isi` = sub-langkah form yang dibuka tombol aksi (query ?isi=).
 */
export function lpjDetailStages(pack) {
  const pelaksana = pelaksanaOf(pack);

  if (!isPerjadin(pack)) {
    const npRincianSubItems = [];
    NP_RINCIAN_DOCS.forEach((d) => {
      if (d.perPelaksana) {
        pelaksana.forEach((p) =>
          npRincianSubItems.push({
            key: `${d.key}_${p.id}`,
            docKey: d.key,
            pegawai: p,
            label: `${d.label} — ${p.nama}`,
            code: 'SPTJM',
          }),
        );
      } else {
        npRincianSubItems.push({
          key: d.key,
          docKey: d.key,
          label: d.label,
          code: NP_CODES[d.key],
        });
      }
    });
    return [
      {
        num: 1,
        label: 'SPBy & Rincian Bayar',
        sub: 'Data Umum, Kode MAK & Rincian Dokumen',
        items: [],
        groups: [
          {
            key: 'nprincian',
            label: 'Rincian Dokumen (SPBy, Nota Dinas, SPTJM, Kwitansi, Lembar Verifikasi)',
            isi: 'np',
            noEdit: true,
            code: 'SPBY',
            subItems: npRincianSubItems,
          },
        ],
      },
      {
        num: 2,
        label: 'Lampiran',
        sub: 'Bukti Pendukung Pembayaran',
        items: [],
        groups: [
          {
            key: 'nplampiran',
            label: 'Lampiran (Pack Dokumen)',
            isi: 'lampiran',
            noEdit: true,
            code: 'DOC',
            subItems: NP_PACK_DOCS.map((d) => ({
              key: d.key,
              docKey: d.key,
              label: d.label,
              code: 'DOC',
            })),
          },
        ],
      },
    ];
  }

  const lpjPackSubItems = [];
  // Urutan tampilan sama dengan purwarupa: ND, KWT, NOM, SPTJM/pelaksana, SPBy, RSB/pelaksana, SPP/pelaksana
  const ordered = [
    'nota_dinas',
    'kwitansi',
    'nominatif',
    'sptjm',
    'spby',
    'rincian_spby',
    'suratpernyataan',
  ];
  ordered.forEach((docKey) => {
    const d = LPJ_DOCS.find((x) => x.key === docKey);
    if (d.perPelaksana) {
      pelaksana.forEach((p) =>
        lpjPackSubItems.push({
          key: `${d.key}_${p.id}`,
          docKey: d.key,
          pegawai: p,
          label: `${d.label} — ${p.nama}`,
          code: LPJ_CODES[d.key],
        }),
      );
    } else {
      lpjPackSubItems.push({ key: d.key, docKey: d.key, label: d.label, code: LPJ_CODES[d.key] });
    }
  });

  return [
    {
      num: 1,
      label: 'Surat Perintah',
      sub: 'Dasar Penugasan, TTE & Nomor Surat',
      items: [{ key: 'sp', label: 'Surat Perintah', isi: 'sp', noEdit: true, code: 'SP' }],
      groups: [],
    },
    {
      num: 2,
      label: 'SPD (Surat Perjalanan Dinas)',
      sub: 'Upload Scan & Nomor Surat, lalu Cetak per Pelaksana',
      items: [],
      groups: [
        {
          key: 'spd',
          label: 'SPD (Surat Perjalanan Dinas)',
          isi: 'spd',
          noEdit: true,
          code: 'SPD',
          subItems: pelaksana.map((p) => ({
            key: `spd_${p.id}`,
            docKey: 'spd',
            pegawai: p,
            label: `SPD — ${p.nama}`,
            code: 'SPD',
          })),
        },
      ],
    },
    {
      num: 3,
      label: 'LPJ & SPBy',
      sub: 'Pack Dokumen Pertanggungjawaban',
      items: [],
      groups: [
        {
          key: 'lpjpack',
          label: 'LPJ & SPBy (Pack Dokumen)',
          isi: 'lpj',
          noEdit: true,
          code: 'LPJ',
          subItems: lpjPackSubItems,
        },
      ],
    },
    {
      num: 4,
      label: 'Laporan Kegiatan',
      sub: 'Hasil Perjalanan Dinas',
      items: [
        { key: 'laporan', label: 'Laporan Kegiatan', isi: 'laporan', noEdit: true, code: 'LAP' },
      ],
      groups: [],
    },
  ];
}

const LPJ_CODES = {
  nota_dinas: 'ND',
  kwitansi: 'KWT',
  nominatif: 'NOM',
  sptjm: 'SPTJM',
  spby: 'SPBY',
  rincian_spby: 'RSB',
  suratpernyataan: 'SPP',
};

const NP_CODES = { spby: 'SPBY', nota_dinas: 'ND', kwitansi: 'KWT', lembar_verifikasi: 'LV' };

// ─── Status dokumen & fase ───────────────────────────────────────────────────
// selesai | menunggu | proses | belum  (+ terkunci untuk fase)

export function lpjSingleStatus(pack, stage, doc) {
  const selesai = pack.selesai || {};
  const done = doc.key === 'sp' ? !!selesai.sp : doc.key === 'laporan' ? !!selesai.laporan : false;
  if (done) return 'selesai';
  if (doc.key === 'sp' && pack.sp?.locked) return 'menunggu';
  const started =
    doc.key === 'sp'
      ? pfHasSpData(pack.sp)
      : doc.key === 'laporan'
        ? pfHasLapData(pack.lap)
        : false;
  return started ? 'proses' : 'belum';
}

export function lpjGroupSubDone(pack, stage, group, item) {
  if (group.key === 'spd') return !!pack.spd?.locked;
  if (group.key === 'lpjpack') return !!pack.selesai?.lpjDocs?.[item.key];
  if (group.key === 'nprincian') return !!pack.np?.npDocs?.[item.key];
  if (group.key === 'nplampiran') return (pack.np?.lampiran?.[item.key] || []).length > 0;
  return false;
}

export function lpjGroupStatus(pack, stage, group) {
  const doneCount = group.subItems.filter((it) => lpjGroupSubDone(pack, stage, group, it)).length;
  if (group.subItems.length > 0 && doneCount === group.subItems.length) return 'selesai';
  if (group.key === 'spd' && pack.spd?.locked) return 'menunggu';
  if (doneCount > 0) return 'proses';
  const started =
    group.key === 'spd'
      ? pfHasSpdData(pack.spd)
      : group.key === 'lpjpack'
        ? pfHasLpjData(pack.lpj)
        : group.key === 'nprincian'
          ? npHasFormData(pack.np)
          : false;
  return started ? 'proses' : 'belum';
}

export function lpjStageStatus(pack, stage) {
  const statuses = (stage.items || [])
    .map((d) => lpjSingleStatus(pack, stage, d))
    .concat((stage.groups || []).map((g) => lpjGroupStatus(pack, stage, g)));
  if (statuses.length === 0) return 'belum';
  if (statuses.every((s) => s === 'selesai')) return 'selesai';
  if (statuses.some((s) => s === 'selesai' || s === 'proses')) return 'proses';
  return 'belum';
}

/** Jumlah dokumen selesai/total dalam satu fase (sub-item kelompok dihitung satu per satu). */
export function stageTally(pack, stage) {
  let total = 0;
  let done = 0;
  (stage.items || []).forEach((d) => {
    total++;
    if (lpjSingleStatus(pack, stage, d) === 'selesai') done++;
  });
  (stage.groups || []).forEach((g) => {
    g.subItems.forEach((it) => {
      total++;
      if (lpjGroupSubDone(pack, stage, g, it)) done++;
    });
  });
  return { total, done };
}

/**
 * Status tiap fase untuk tampilan: fase ke-n terkunci selama fase sebelumnya belum selesai.
 * @returns {{ stage, raw, display, locked, tally, pct }[]}
 */
export function stagesWithStatus(pack) {
  const stages = lpjDetailStages(pack);
  const raws = stages.map((s) => lpjStageStatus(pack, s));
  return stages.map((stage, i) => {
    const locked = i > 0 && raws[i - 1] !== 'selesai';
    const tally = stageTally(pack, stage);
    return {
      stage,
      raw: raws[i],
      display: locked ? 'terkunci' : raws[i],
      locked,
      tally,
      pct: tally.total ? Math.round((tally.done / tally.total) * 100) : 0,
    };
  });
}

/** Ringkasan progres seluruh berkas. */
export function overallProgress(pack) {
  let total = 0;
  let done = 0;
  lpjDetailStages(pack).forEach((s) => {
    const t = stageTally(pack, s);
    total += t.total;
    done += t.done;
  });
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

// ─── Status berkas untuk Daftar/Dashboard ────────────────────────────────────

/** baru | draft | selesai */
export function lpjDashStatus(pack) {
  if (!isSkemaBaru(pack)) return pack?.status === 'completed' ? 'selesai' : 'draft';
  if (pack.status === 'selesai') return 'selesai';
  return adaIsian(pack) ? 'draft' : 'baru';
}

/** Apakah berkas sudah mulai diisi (bagian mana pun). */
export function adaIsian(pack) {
  if (isPerjadin(pack)) {
    return (
      pfHasSpData(pack.sp) ||
      !!pack.sp?.locked ||
      pfHasSpdData(pack.spd) ||
      pfHasLpjData(pack.lpj) ||
      pfHasLapData(pack.lap)
    );
  }
  const np = pack.np || {};
  return (
    npHasFormData(np) ||
    !!np.formLocked ||
    Object.values(np.lampiran || {}).some((files) => (files || []).length > 0)
  );
}

export const lpjDashType = (pack) => (isPerjadin(pack) ? 'perjadin' : 'non-perjadin');

/** Label kolom "Tahap": Draft / Selesai (+ gaya) */
export function lpjTahapDisplay(pack) {
  if (!isSkemaBaru(pack)) return { label: 'Format lama', done: false, legacy: true };
  if (pack.status === 'selesai') return { label: 'Selesai', done: true };
  return { label: 'Draft', done: false };
}

/** Fase aktif pertama yang belum selesai, mis. "Fase 2 — SPD (Surat Perjalanan Dinas)". */
export function faseAktifLabel(pack) {
  const list = stagesWithStatus(pack);
  const aktif = list.find((s) => s.raw !== 'selesai');
  return aktif ? `Fase ${aktif.stage.num} — ${aktif.stage.label}` : 'Selesai';
}

/** Pengguna boleh mengubah berkas: admin, pembuat, atau pelaksana, dan berkas belum final. */
export function canEditPack(pack, { uid, isAdmin }) {
  if (!pack || pack.status === 'selesai' || !isSkemaBaru(pack)) return false;
  if (isAdmin) return true;
  if (pack.created_by === uid) return true;
  return pelaksanaOf(pack).some((p) => p.uid && p.uid === uid);
}

/** Tanggal ringkasan untuk Daftar/Detail. */
export function tanggalRingkas(pack) {
  if (isPerjadin(pack)) {
    return {
      berangkat: pack.spd?.berangkat || '',
      kembali: pack.spd?.kembali || '',
      tanggalLPJ: pack.lpj?.tanggalLPJ || '',
    };
  }
  const t = pack.np?.tanggal || '';
  return { berangkat: t, kembali: t, tanggalLPJ: t };
}
