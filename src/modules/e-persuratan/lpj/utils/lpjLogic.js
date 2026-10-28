/**
 * Logika inti berkas LPJ — port lpjLogic.js purwarupa untuk dokumen `lpj_berkas` skema 1
 * (docs/skema-database.md §5.2). Fungsi murni (tanpa Firestore/DOM) untuk Daftar, Detail, form,
 * dan Dashboard.
 *
 * Status dokumen = status kunci bagiannya: bagian terkunci (fase "Selesai", final) berarti semua
 * dokumennya selesai. Bagian selalu terkunci berurutan (dijaga rules), sehingga fungsi yang sama
 * juga bisa dipakai pada dokumen ringkas `lpj_ringkas` (kunci dibaca dari `progres.selesai`).
 */
import { BAGIAN, LPJ_DOCS, NP_PACK_DOCS, NP_RINCIAN_DOCS } from '../data/masterLpj';

export const STAGE_STATUS_LABEL = {
  selesai: 'Selesai',
  revisi: 'Perlu Revisi',
  proses: 'Dalam Proses',
  belum: 'Belum Dimulai',
  terkunci: 'Terkunci',
};

export const isPerjadin = (b) => b?.jenis === 'perjadin';
export const jenisLabel = (b) => (isPerjadin(b) ? 'Perjadin' : 'NON-Perjadin');
export const uraianOf = (b) => b?.uraian || '';
/** Dokumen ringkas (`lpj_ringkas`) — tidak memuat isi bagian. */
export const isRingkas = (b) => !!b && 'progres' in b;

/** Bagian sudah dikunci (final). */
export function terkunci(b, bagian) {
  if (!b) return false;
  if (isRingkas(b)) {
    const urutan = BAGIAN[isPerjadin(b) ? 'perjadin' : 'nonperjadin'];
    const i = urutan.indexOf(bagian);
    return i >= 0 && i < (b.progres?.selesai || 0);
  }
  return b[bagian]?.terkunci === true;
}

/** Pelaksana (Orang[]): "Kepada" Surat Perintah (Perjadin) atau pelaksana SPBy (Non-Perjadin). */
export function pelaksanaOf(b) {
  if (!b) return [];
  if (isRingkas(b)) return b.pelaksana || [];
  return (isPerjadin(b) ? b.sp?.kepada : b.spby?.pelaksana) || [];
}

// ─── Angka & transaksi ───────────────────────────────────────────────────────

/** "1.500.000" / 1500000 → 1500000 */
export const parseNum = (val) => Number(String(val ?? '').replace(/[^0-9]/g, '')) || 0;

/** 1500000 / "1500000" → "1.500.000" (kosong bila bukan angka) */
export function formatNum(val) {
  const digits = String(val ?? '').replace(/\D/g, '');
  return digits ? parseInt(digits, 10).toLocaleString('id-ID') : '';
}

export const rupiah = (n) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');

export function transaksiOf(b) {
  if (!b) return [];
  return (isPerjadin(b) ? b.lpj?.transaksi : b.spby?.transaksi) || [];
}

export function makOf(b) {
  if (!b) return null;
  return (isPerjadin(b) ? b.spd?.mak : b.spby?.mak) || null;
}

/** Total transaksi (dokumen ringkas sudah membawa `total`). */
export const lpjRowTotal = (b) =>
  isRingkas(b)
    ? b.total || 0
    : transaksiOf(b).reduce((sum, t) => sum + (Number.isInteger(t.jumlah) ? t.jumlah : 0), 0);

/** Semua baris transaksi lengkap: pelaksana, item, dan jumlah > 0 (diperiksa ulang di server). */
export const transaksiLengkap = (transaksi) =>
  transaksi.length > 0 && transaksi.every((t) => t.pelaksanaId && t.itemNodeId && t.jumlah > 0);

/**
 * Gabungkan baris transaksi dengan item yang sama jadi satu baris (panel "Detail Transaksi").
 * @returns {{ itemNodeId, itemKode, label, total }[]}
 */
export function groupTransaksiByItem(transaksi) {
  const order = [];
  const map = {};
  (transaksi || []).forEach((t) => {
    if (!t.itemNodeId) return;
    if (!map[t.itemNodeId]) {
      map[t.itemNodeId] = {
        itemNodeId: t.itemNodeId,
        itemKode: t.salinan?.itemKode || '',
        label: t.salinan?.itemNama || '',
        total: 0,
      };
      order.push(t.itemNodeId);
    }
    map[t.itemNodeId].total += Number.isInteger(t.jumlah) ? t.jumlah : 0;
  });
  return order.map((k) => map[k]);
}

// ─── Apakah suatu bagian sudah mulai diisi ──────────────────────────────────

const ada = (v) => (typeof v === 'string' ? v.trim() !== '' : !!v);

export function pfHasSpData(sp) {
  if (!sp) return false;
  return !!(
    ada(sp.menimbang) ||
    sp.pejabat ||
    (sp.dasar || []).some(ada) ||
    (sp.untuk || []).some(ada)
  );
}

export const pfHasTteData = (tte) => !!(tte && (ada(tte.nomorSurat) || tte.scan));

export function pfHasSpdData(spd) {
  if (!spd) return false;
  // nomorSpd (dari nomor SP) dan maksud (dari uraian kegiatan) terisi otomatis, bukan isian pengguna
  return !!(ada(spd.tujuan) || spd.alatAngkut || spd.berangkat || spd.kembali || spd.seksi);
}

const txFilled = (t) => t && (t.pelaksanaId || t.itemNodeId || t.jumlah);

export function pfHasLpjData(lpj) {
  if (!lpj) return false;
  if (lpj.tanggalLpj || ada(lpj.keterangan)) return true;
  return (lpj.transaksi || []).some(txFilled);
}

export function pfHasLapData(lap) {
  if (!lap) return false;
  return !!(
    lap.tanggalLaporan ||
    ['pendahuluan', 'maksud', 'ruangLingkup', 'pelaksanaan', 'hasil', 'kesimpulan', 'penutup'].some(
      (k) => ada(lap[k]),
    ) ||
    lap.penandatangan ||
    (lap.foto || []).length
  );
}

export function npHasFormData(spby) {
  if (!spby) return false;
  return !!(spby.tanggal || spby.mak?.akunNodeId || (spby.transaksi || []).some(txFilled));
}

// ─── Fase per jenis berkas ───────────────────────────────────────────────────

const subPerPelaksana = (d, pelaksana, code) =>
  pelaksana.map((p) => ({
    key: `${d.key}_${p.pegawaiId}`,
    docKey: d.key,
    pegawai: p,
    docLabel: d.label,
    label: `${d.label} — ${p.nama}`,
    code,
  }));

/**
 * Fase (kartu di halaman Detail & ringkasan "Progress Dokumen").
 * `isi` = sub-langkah form yang dibuka tombol aksi (query ?isi=).
 */
export function lpjDetailStages(b) {
  const pelaksana = pelaksanaOf(b);

  if (!isPerjadin(b)) {
    const npRincianSubItems = NP_RINCIAN_DOCS.flatMap((d) =>
      d.perPelaksana
        ? subPerPelaksana(d, pelaksana, 'SPTJM')
        : [{ key: d.key, docKey: d.key, label: d.label, code: NP_CODES[d.key] }],
    );
    return [
      {
        num: 1,
        label: 'SPBy & Rincian Bayar',
        sub: 'Data Umum, Kode MAK & Rincian Dokumen',
        bagian: ['spby'],
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
        bagian: ['lampiran'],
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

  // Urutan tampilan sama dengan Pemeriksaan Dokumen di Berkas Verifikasi (kelompokDokumen):
  // SPBy, Rincian SPBy/pelaksana, Nota Dinas, Kwitansi, SPTJM/pelaksana, SPP/pelaksana, Nominatif
  const ordered = [
    'spby',
    'rincian_spby',
    'nota_dinas',
    'kwitansi',
    'sptjm',
    'suratpernyataan',
    'nominatif',
  ];
  const lpjPackSubItems = ordered.flatMap((docKey) => {
    const d = LPJ_DOCS.find((x) => x.key === docKey);
    return d.perPelaksana
      ? subPerPelaksana(d, pelaksana, LPJ_CODES[d.key])
      : [{ key: d.key, docKey: d.key, label: d.label, code: LPJ_CODES[d.key] }];
  });

  return [
    {
      num: 1,
      label: 'Surat Perintah',
      sub: 'Dasar Penugasan & Penandatangan',
      bagian: ['sp'],
      items: [{ key: 'sp', label: 'Surat Perintah', isi: 'sp', noEdit: true, code: 'SP' }],
      groups: [],
    },
    {
      num: 2,
      label: 'SPD (Surat Perjalanan Dinas)',
      sub: 'Upload SP ber-TTE & Nomor Surat, lalu Isi & Cetak SPD per Pelaksana',
      bagian: ['tte', 'spd'],
      // Upload SP harus selesai dulu sebelum form SPD bisa diisi (lihat lpjGroupStatus)
      items: [
        {
          key: 'tte',
          docKey: 'scan_sp',
          label: 'Upload Scan & Nomor Surat Perintah (TTE)',
          isi: 'tte',
          noEdit: true,
          berkas: true,
          code: 'TTE',
        },
      ],
      groups: [
        {
          key: 'spd',
          label: 'SPD (Surat Perjalanan Dinas)',
          isi: 'spd',
          noEdit: true,
          code: 'SPD',
          subItems: pelaksana.map((p) => ({
            key: `spd_${p.pegawaiId}`,
            docKey: 'spd',
            pegawai: p,
            docLabel: 'SPD',
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
      bagian: ['lpj'],
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
      bagian: ['laporan'],
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

/** Bagian berkas yang menghasilkan dokumen fase (item tunggal / kelompok). */
const BAGIAN_ITEM = { sp: 'sp', tte: 'tte', laporan: 'laporan' };
const BAGIAN_KELOMPOK = { spd: 'spd', lpjpack: 'lpj', nprincian: 'spby', nplampiran: 'lampiran' };

// ─── Status dokumen & fase ───────────────────────────────────────────────────
// selesai | proses | belum | terkunci (dokumen menunggu dokumen lain di fase yang sama)

export function lpjSingleStatus(b, stage, doc) {
  const bagian = BAGIAN_ITEM[doc.key];
  if (terkunci(b, bagian)) return 'selesai';
  const started =
    bagian === 'sp'
      ? pfHasSpData(b.sp)
      : bagian === 'tte'
        ? pfHasTteData(b.tte)
        : pfHasLapData(b.laporan);
  return started ? 'proses' : 'belum';
}

/** Dokumen kelompok selesai = bagiannya sudah terkunci (dokumen dicetak dari isi final). */
export const lpjGroupSubDone = (b, stage, group) => terkunci(b, BAGIAN_KELOMPOK[group.key]);

export function lpjGroupStatus(b, stage, group) {
  if (group.subItems.length > 0 && lpjGroupSubDone(b, stage, group)) return 'selesai';
  // Form SPD baru terbuka setelah SP ber-TTE tersimpan (nomor SPD mengikuti nomor SP)
  if (group.key === 'spd' && !terkunci(b, 'tte')) return 'terkunci';
  const started =
    group.key === 'spd'
      ? pfHasSpdData(b.spd)
      : group.key === 'lpjpack'
        ? pfHasLpjData(b.lpj)
        : group.key === 'nprincian'
          ? npHasFormData(b.spby)
          : !!((b.lampiran?.foto || []).length || (b.lampiran?.nota || []).length);
  return started ? 'proses' : 'belum';
}

export function lpjStageStatus(b, stage) {
  const statuses = (stage.items || [])
    .map((d) => lpjSingleStatus(b, stage, d))
    .concat((stage.groups || []).map((g) => lpjGroupStatus(b, stage, g)));
  if (statuses.length === 0) return 'belum';
  if (statuses.every((s) => s === 'selesai')) return 'selesai';
  if (statuses.some((s) => s === 'selesai' || s === 'proses')) return 'proses';
  return 'belum';
}

/** Jumlah dokumen selesai/total dalam satu fase (sub-item kelompok dihitung satu per satu). */
export function stageTally(b, stage) {
  let total = 0;
  let done = 0;
  (stage.items || []).forEach((d) => {
    total++;
    if (lpjSingleStatus(b, stage, d) === 'selesai') done++;
  });
  (stage.groups || []).forEach((g) => {
    total += g.subItems.length;
    if (lpjGroupSubDone(b, stage, g)) done += g.subItems.length;
  });
  return { total, done };
}

/**
 * Status tiap fase untuk tampilan: fase ke-n terkunci selama fase sebelumnya belum selesai.
 * @returns {{ stage, raw, display, locked, tally, pct }[]}
 */
export function stagesWithStatus(b) {
  const stages = lpjDetailStages(b);
  const raws = stages.map((s) => lpjStageStatus(b, s));
  // Dokumen ringkas tidak memuat isi: fase berjalan dianggap "proses" bila berkas pernah disunting
  const aktif = raws.findIndex((r) => r !== 'selesai');
  if (isRingkas(b) && b.adaIsian && aktif >= 0 && raws[aktif] === 'belum') raws[aktif] = 'proses';
  return stages.map((stage, i) => {
    const locked = i > 0 && raws[i - 1] !== 'selesai';
    const tally = stageTally(b, stage);
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
export function overallProgress(b) {
  let total = 0;
  let done = 0;
  lpjDetailStages(b).forEach((s) => {
    const t = stageTally(b, s);
    total += t.total;
    done += t.done;
  });
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

// ─── Status berkas untuk Daftar/Dashboard ────────────────────────────────────

/** Apakah berkas sudah mulai diisi (bagian mana pun). */
export function adaIsian(b) {
  if (isRingkas(b)) return !!b.adaIsian;
  const urutan = BAGIAN[isPerjadin(b) ? 'perjadin' : 'nonperjadin'];
  if (urutan.some((bag) => terkunci(b, bag))) return true;
  return isPerjadin(b) ? pfHasSpData(b.sp) : npHasFormData(b.spby);
}

/** baru | draft | selesai */
export function lpjDashStatus(b) {
  if (b?.status === 'selesai') return 'selesai';
  return adaIsian(b) ? 'draft' : 'baru';
}

export const lpjDashType = (b) => (isPerjadin(b) ? 'perjadin' : 'non-perjadin');

/** Label kolom "Tahap": Draft / Selesai (+ gaya) */
export function lpjTahapDisplay(b) {
  if (b?.status === 'selesai') return { label: 'Selesai', done: true };
  return { label: 'Draft', done: false };
}

/** Fase aktif pertama yang belum selesai, mis. "Fase 2 — SPD (Surat Perjalanan Dinas)". */
export function faseAktifLabel(b) {
  const aktif = stagesWithStatus(b).find((s) => s.raw !== 'selesai');
  return aktif ? `Fase ${aktif.stage.num} — ${aktif.stage.label}` : 'Selesai';
}

/**
 * Pengguna boleh mengubah isi berkas: anggota berkas (pembuat/pelaksana ber-akun) selama belum
 * final. Keuangan tidak menyunting isi fase (rules menolak). Tampilan saja; rules yang menegakkan.
 */
export const canEditPack = (b, { uid }) =>
  !!b && b.status !== 'selesai' && (b.anggotaUids || []).includes(uid);

/** Tanggal ringkasan untuk Daftar/Detail. */
export function tanggalRingkas(b) {
  if (isPerjadin(b)) {
    return {
      berangkat: b.spd?.berangkat || '',
      kembali: b.spd?.kembali || '',
      tanggalLPJ: b.lpj?.tanggalLpj || '',
    };
  }
  const t = b?.spby?.tanggal || '';
  return { berangkat: t, kembali: t, tanggalLPJ: t };
}

// ─── Nomor LPJ ───────────────────────────────────────────────────────────────

/** SPBy sudah selesai (nomor LPJ terbit bersamaan, lewat Function selesaikanSpby). */
export const spbySelesai = (b) => terkunci(b, isPerjadin(b) ? 'lpj' : 'spby');

/** Nomor LPJ (`LPJ-TAHUN-BULAN-NNNN`) atau '' bila belum terbit. */
export const lpjIdOf = (b) => b?.nomorLpj || '';

/** Label nomor untuk tampilan: nomor LPJ, atau keterangan bila belum terbit. */
export const lpjIdLabel = (b) => lpjIdOf(b) || 'Belum bernomor';

/**
 * Tampilkan tombol hapus: draf tanpa nomor oleh pembuatnya; Super Admin juga berkas bernomor
 * yang belum diarsip. Tampilan saja; Function hapusBerkas yang menegakkan.
 */
export function canDeletePack(b, { uid, isSuperAdmin }) {
  if (!b) return false;
  if (isSuperAdmin) return !(b.keuangan?.arsip === true);
  return !lpjIdOf(b) && b.dibuatOleh === uid;
}
