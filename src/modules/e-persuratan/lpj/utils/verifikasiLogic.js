/**
 * Logika Berkas Verifikasi (BerkasVerifikasi.js purwarupa admin) — fungsi murni.
 *
 * Data (diisi Admin/Keuangan):
 *   lpj_packs/{id}.verifikasi = { docStatus: { [kunci]: 'lengkap' }, docPrinted: { [kunci]: true },
 *                                 nominal: { lines, codes, poks }, selesai, selesaiAt, oleh }
 *   lpj_packs/{id}.arsip.kwitansi   nomor kwitansi SAKTI (sama dengan Arsip Keuangan)
 *   lpj_packs/{id}.pembayaran       bukti transfer (kartu "Status Pembayaran" di Detail LPJ)
 *   lpj_packs/{id}.arsip.scan       pindaian berkas; setelah ada, berkas pindah ke menu Arsip
 *
 * Tahap berkas berurutan dan dihitung dari data (satu berkas hanya berada di satu tab):
 *   Draft → Verifikasi → Upload SAKTI → Transfer → Arsip
 * Draft = belum punya ID LPJ (nomor terbit saat SPBy selesai); yang sudah ber-ID masuk Verifikasi.
 */

import {
  isPerjadin,
  isSkemaBaru,
  lpjIdOf,
  makOf,
  parseNum,
  pelaksanaOf,
  tanggalRingkas,
  transaksiOf,
  uraianOf,
} from './lpjLogic';

export const TAHAP = [
  { key: 'draft', label: 'Draft', kosong: 'Belum ada berkas yang belum memiliki ID LPJ.' },
  { key: 'verif', label: 'Verifikasi', kosong: 'Tidak ada berkas yang menunggu verifikasi.' },
  { key: 'sakti', label: 'Upload SAKTI', kosong: 'Tidak ada berkas yang menunggu nomor SAKTI.' },
  {
    key: 'transfer',
    label: 'Transfer',
    kosong: 'Tidak ada berkas yang menunggu bukti transfer.',
  },
  { key: 'arsip', label: 'Arsip', kosong: 'Belum ada berkas yang masuk tahap arsip.' },
];
export const TAHAP_KEYS = TAHAP.map((t) => t.key);
export const labelTahap = (key) => TAHAP.find((t) => t.key === key)?.label || key;

export const verifOf = (pack) => pack?.verifikasi || {};

/**
 * Tahap berkas: draft | verif | sakti | transfer | arsip, atau null bila sudah diarsipkan
 * (sudah dipindai → tampil di menu Arsip) atau berkas format lama.
 */
export function tahapBerkas(pack) {
  if (!isSkemaBaru(pack)) return null;
  if (pack.arsip?.scan) return null;
  // Masuk Verifikasi begitu ID LPJ terbit (SPBy selesai); sebelum itu masih Draft
  if (!lpjIdOf(pack)) return 'draft';
  if (!verifOf(pack).selesai) return 'verif';
  if (!pack.arsip?.kwitansi) return 'sakti';
  if (!pack.pembayaran?.buktiTransfer) return 'transfer';
  return 'arsip';
}

/** Cocok dengan ID LPJ, pelaksana, uraian, atau no. kwitansi SAKTI. */
export function cocokCari(pack, q) {
  if (!q) return true;
  const isi = [
    lpjIdOf(pack),
    uraianOf(pack),
    pack.arsip?.kwitansi,
    ...pelaksanaOf(pack).map((p) => p?.nama),
  ];
  return isi.some((v) =>
    String(v || '')
      .toLowerCase()
      .includes(q),
  );
}

/** Tanggal acuan urutan Daftar (tanggal SPBy, lalu waktu dibuat). */
export function tanggalUrut(pack) {
  return tanggalRingkas(pack).tanggalLPJ || pack.created_at?.toDate?.().toISOString() || '';
}

/** Nama pelaksana ringkas: banyak orang → "Nama pertama, dkk (n orang)". */
export function namaDkk(names) {
  return names.length > 3 ? `${names[0]}, dkk (${names.length} orang)` : names.join(', ');
}

/** NIP 18 digit dipisah spasi: "19900101 201501 1 001". */
export function nipSpasi(nip) {
  const s = String(nip || '');
  return s.length === 18
    ? `${s.slice(0, 8)} ${s.slice(8, 14)} ${s.slice(14, 15)} ${s.slice(15)}`
    : s || '—';
}

// ─── Dokumen yang diperiksa ──────────────────────────────────────────────────
// Dokumen: { key, nama, singkat, cetak, sub }
//   cetak = { jenis: 'pdf', item } (item untuk resolveDokumen) | { jenis: 'files', files } | null
//   (null = dokumen fisik dari pelaksana, mis. tiket — hanya dicentang)

const pdf = (item) => ({ jenis: 'pdf', item });

function dokTunggal(key, nama, docKey = key) {
  return { key, nama, singkat: nama, cetak: pdf({ key, docKey, label: nama }) };
}

/** Dokumen per pelaksana; jadi kelompok yang bisa dibuka bila pelaksananya lebih dari satu. */
function perOrang(pelaksana, docKey, nama) {
  const docs = pelaksana.map((p) => ({
    key: `${docKey}_${p.id}`,
    nama: `${nama} — ${p.nama}`,
    singkat: p.nama,
    cetak: pdf({ key: `${docKey}_${p.id}`, docKey, pegawai: p, label: `${nama} — ${p.nama}` }),
  }));
  if (docs.length > 1) return { label: nama, kelompok: true, docs };
  if (docs.length === 1) {
    return {
      label: null,
      docs: [{ ...docs[0], nama, singkat: nama, sub: `Pelaksana: ${pelaksana[0].nama}` }],
    };
  }
  return { label: null, docs: [{ key: docKey, nama, singkat: nama, cetak: null }] };
}

/** Lampiran unggahan pelaksana: kelompok berisi satu baris per berkas. */
function kelompokLampiran(files) {
  if (!files.length) {
    return {
      label: null,
      docs: [
        {
          key: 'lampiran',
          nama: 'Lampiran',
          singkat: 'Lampiran',
          cetak: null,
          sub: 'Belum ada lampiran yang diunggah pelaksana',
        },
      ],
    };
  }
  return {
    label: 'Lampiran',
    kelompok: true,
    docs: files.map(({ key, judul, file }) => ({
      key,
      nama: `Lampiran — ${file.name || judul}`,
      singkat: judul ? `${judul} · ${file.name || ''}` : file.name || 'Berkas',
      cetak: { jenis: 'files', files: [file] },
    })),
  };
}

/**
 * Kelompok dokumen Pemeriksaan Dokumen (pegawai2DocGroups purwarupa, dipetakan ke dokumen
 * berkas): { label, kelompok, docs }[]. Kunci dokumen aman dipakai sebagai nama field Firestore.
 */
export function kelompokDokumen(pack) {
  const pelaksana = pelaksanaOf(pack);
  if (!isPerjadin(pack)) {
    const lamp = pack.np?.lampiran || {};
    const files = [
      ...(lamp.foto_bukti || []).map((file, i) => ({
        key: `foto_bukti_${i}`,
        judul: 'Foto Bukti/Produk',
        file,
      })),
      ...(lamp.nota_pembayaran || []).map((file, i) => ({
        key: `nota_pembayaran_${i}`,
        judul: 'Nota Pembayaran',
        file,
      })),
    ];
    return [
      { label: null, docs: [dokTunggal('spby', 'SPBy'), dokTunggal('nota_dinas', 'Nota Dinas')] },
      perOrang(pelaksana, 'sptjm', 'SPTJM'),
      { label: null, docs: [dokTunggal('kwitansi', 'Kwitansi')] },
      kelompokLampiran(files),
    ];
  }

  const fotos = (pack.lap?.fotos || []).map((file, i) => ({
    key: `foto_laporan_${i}`,
    judul: 'Foto Kegiatan',
    file,
  }));
  return [
    { label: 'Surat Perintah', docs: [dokTunggal('sp', 'Surat Perintah (SP)')] },
    perOrang(pelaksana, 'spd', 'SPD'),
    { label: 'LPJ & SPBy', docs: [dokTunggal('spby', 'SPBy')] },
    perOrang(pelaksana, 'rincian_spby', 'Rincian SPBy'),
    {
      label: null,
      docs: [dokTunggal('nota_dinas', 'Nota Dinas'), dokTunggal('kwitansi', 'Kwitansi')],
    },
    perOrang(pelaksana, 'sptjm', 'SPTJM'),
    perOrang(pelaksana, 'suratpernyataan', 'Surat Pernyataan Pengeluaran'),
    { label: null, docs: [dokTunggal('nominatif', 'Daftar Nominatif')] },
    { label: 'Lap. Kegiatan', docs: [dokTunggal('laporan', 'Laporan Kegiatan')] },
    kelompokLampiran(fotos),
    {
      label: 'Bukti Perjalanan',
      docs: [
        {
          key: 'tiket',
          nama: 'Tiket dan Boarding Pass',
          singkat: 'Tiket dan Boarding Pass',
          cetak: null,
        },
        { key: 'bill_hotel', nama: 'Bill Hotel', singkat: 'Bill Hotel', cetak: null },
      ],
    },
  ];
}

export const semuaDokumen = (kelompok) => kelompok.flatMap((g) => g.docs);

export const dokLengkap = (verif, key) => verif.docStatus?.[key] === 'lengkap';
export const dokDicetak = (verif, key) => !!verif.docPrinted?.[key];

// ─── Nominal (Detail Transaksi & Lembar Verifikasi) ──────────────────────────

/**
 * Konteks MAK untuk POK Terakhir: `byId` = node MAK, `realisasiLain` = realisasi MAK_History
 * aktif per Item dari berkas LAIN. POK Terakhir = pagu Item − realisasiLain (sisa pagu sebelum
 * tagihan ini); null bila Item tidak ditemukan.
 */
export function pokItem(mak, nodeId) {
  const node = mak?.byId?.[nodeId];
  if (!node) return null;
  return (Number(node.pagu) || 0) - (mak.realisasiLain?.[nodeId] || 0);
}

/** Kode & nama Item dari node MAK (cadangan: data baris transaksi). */
function infoItem(mak, nodeId, cadangan) {
  const node = mak?.byId?.[nodeId];
  return {
    kode: node?.kode || cadangan.kode || '',
    label: node?.name || cadangan.label || '',
  };
}

/**
 * Nominal tiap Item berkas (pegawai2Nominal purwarupa). Transaksi dengan Item yang sama
 * dijumlahkan. `verif.nominal` hanya menyimpan yang DIUBAH admin (kunci = Item asli):
 *   lines: { [itemAsli]: nominal }, codes: { [itemAsli]: itemBaru }, poks: { [itemAsli]: pok }
 * Perjadin: Jumlah/POK/Sisa dibaca per Item; Non-Perjadin: satu Jumlah, POK, & Sisa untuk berkas.
 */
export function nominalBerkas(pack, verif, mak) {
  const nm = verif?.nominal || {};
  const urut = [];
  const asliByKey = {};
  transaksiOf(pack).forEach((t) => {
    if (!t.itemNodeId && !parseNum(t.jumlah)) return;
    const key = t.itemNodeId || 'tanpa_item';
    if (!asliByKey[key]) {
      asliByKey[key] = { kode: t.itemKode || '', label: t.itemName || '', total: 0 };
      urut.push(key);
    }
    asliByKey[key].total += parseNum(t.jumlah);
  });

  const lines = urut.map((key) => {
    const asli = asliByKey[key];
    const itemId = nm.codes?.[key] || key;
    const info = itemId === key ? infoItem(mak, key, asli) : infoItem(mak, itemId, {});
    const nilai = nm.lines?.[key] ?? asli.total;
    const pokDef = pokItem(mak, itemId);
    const pok = nm.poks?.[key] ?? pokDef;
    return {
      key,
      itemId,
      codeAsli: key,
      kode: info.kode,
      label: info.label,
      asli: asli.total,
      nilai,
      pokDef,
      pok,
      sisa: pok == null ? null : pok - nilai,
    };
  });

  const perItem = isPerjadin(pack);
  const total = lines.reduce((a, l) => a + l.nilai, 0);
  const jumlahAsli = lines.reduce((a, l) => a + l.asli, 0);
  const multi = perItem && lines.length > 1;
  let pok = null;
  if (!multi) {
    const ada = lines.filter((l) => l.pok != null);
    pok = ada.length ? ada.reduce((a, l) => a + l.pok, 0) : null;
  }
  const edited =
    total !== jumlahAsli ||
    lines.some((l) => l.nilai !== l.asli || l.itemId !== l.codeAsli || nm.poks?.[l.key] != null);
  return {
    lines,
    total,
    jumlah: total,
    jumlahAsli,
    perItem,
    multi,
    pok,
    sisa: pok == null ? null : pok - total,
    edited,
  };
}

// ─── Lembar Verifikasi ───────────────────────────────────────────────────────

/** "Rp.195.000,-" seperti penulisan di lembar. */
export const rpTitik = (n) => 'Rp.' + Math.round(Number(n) || 0).toLocaleString('id-ID') + ',-';

/** "Tiket PP (Pulang Pergi)" → "Tiket PP", "Biaya Penginapan / Hotel" → "Penginapan / Hotel". */
export const itemSingkat = (label) =>
  String(label || '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/^Biaya\s+/i, '')
    .trim();

/**
 * Baris tabel lembar: satu baris per JENIS dokumen (dokumen per pelaksana / per berkas
 * cukup satu baris; tercentang bila semua dokumen di kelompoknya tercentang).
 */
export function barisLembar(kelompok, verif) {
  return kelompok.reduce((acc, g) => {
    if (g.kelompok) {
      const ok = g.docs.every((d) => dokLengkap(verif, d.key));
      acc.push({ label: g.label, staf: ok, ppk: ok, ket: ok ? 'Ada' : '' });
    } else {
      g.docs.forEach((d) => {
        const ok = dokLengkap(verif, d.key);
        acc.push({ label: d.nama, staf: ok, ppk: ok, ket: ok ? 'Ada' : '' });
      });
    }
    return acc;
  }, []);
}

/** Isi "Catatan Staf PPK": "Lengkap", atau dokumen yang belum diperiksa. */
export function catatanLembar(docs, verif) {
  const tunggu = docs.filter((d) => !dokLengkap(verif, d.key));
  if (!tunggu.length) return 'Lengkap';
  return (
    'Menunggu pemeriksaan: ' +
    (tunggu.length > 3 ? `${tunggu.length} dokumen` : tunggu.map((d) => d.nama).join(', '))
  );
}

function namaBendahara(pegawaiList) {
  const b = (pegawaiList || []).find((p) =>
    String(p.status_khusus || '')
      .toLowerCase()
      .includes('bendahara'),
  );
  return b?.nama || '';
}

/** Data lengkap Lembar Verifikasi (dipakai pratinjau di layar & PDF). */
export function dataLembar(pack, mak, pegawaiList) {
  const verif = verifOf(pack);
  const kelompok = kelompokDokumen(pack);
  const nom = nominalBerkas(pack, verif, mak);
  const pelaksana = pelaksanaOf(pack).map((p) => p.nama);
  return {
    id: lpjIdOf(pack),
    jenisTeks: isPerjadin(pack) ? 'PERJALANAN DINAS' : 'KEGIATAN NON-PERJADIN',
    meta: [
      [
        ['Biro/ Divisi', 'Sub Bagian Tata Usaha'],
        ['Bagian', (isPerjadin(pack) ? pack.spd?.seksi : '') || ''],
        ['Kegiatan', uraianOf(pack)],
      ],
      [
        ['MAK', makOf(pack)?.kode || ''],
        ['Jumlah', nom.multi ? null : rpTitik(nom.jumlah)],
      ],
      [
        ['Nama Pelaksana', pelaksana.length > 3 ? `${pelaksana[0]}, dkk` : pelaksana.join(', ')],
        ['Nama BPP / Bendahara', namaBendahara(pegawaiList)],
      ],
    ],
    nom,
    rows: barisLembar(kelompok, verif),
    catatan: catatanLembar(semuaDokumen(kelompok), verif),
  };
}
