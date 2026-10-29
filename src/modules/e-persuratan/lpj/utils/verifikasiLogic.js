/**
 * Logika Berkas Verifikasi (BerkasVerifikasi.js purwarupa admin) — fungsi murni.
 *
 * Data tahap Keuangan ada di `lpj_berkas/{id}/keuangan/status` (docs/skema-database.md §5.2):
 *   verifikasi = { statusDokumen: { [kunci]: 'lengkap' }, dicetak: { [kunci]: true },
 *                  koreksi: { [itemNodeId asli]: { jumlah?, itemNodeId?, pok? } },
 *                  selesai, selesaiPada, selesaiOleh }
 *   sakti = { selesai, nomorKwitansi, berkas } · transfer = { selesai, tanggal, berkas }
 *   arsip = { selesai, tanggalArsip, berkas, drppId } · pokBeku · pejabatBeku
 *
 * Tahap berkas dihitung Function (`lpj_ringkas.tahap`): Draft → Verifikasi → Upload SAKTI →
 * Transfer → Arsip; setelah arsip selesai berkas pindah ke menu Arsip (DRPP).
 */

import { isPerjadin, lpjIdOf, makOf, pelaksanaOf, transaksiOf, uraianOf } from './lpjLogic';

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

/** Bagian verifikasi dari dokumen keuangan/status (kosong bila belum dimulai). */
export const verifOf = (keuangan) => keuangan?.verifikasi || {};

/** Tahap Keuangan berkas bernomor dari dokumen keuangan/status (null bila arsip selesai). */
export function tahapDariKeuangan(k) {
  if (!k?.verifikasi?.selesai) return 'verif';
  if (!k.sakti?.selesai) return 'sakti';
  if (!k.transfer?.selesai) return 'transfer';
  if (!k.arsip?.selesai) return 'arsip';
  return null;
}

/**
 * Tahap Berkas Verifikasi dari dokumen ringkas: draft | verif | sakti | transfer | arsip, atau
 * null bila sudah diarsipkan (menunggu/masuk DRPP → tampil di menu Arsip).
 */
export const tahapBerkas = (r) => (TAHAP_KEYS.includes(r?.tahap) ? r.tahap : null);

/** Cocok dengan ID LPJ, pelaksana, uraian, atau no. kwitansi SAKTI (dokumen ringkas). */
export function cocokCari(r, q) {
  if (!q) return true;
  const isi = [
    lpjIdOf(r),
    uraianOf(r),
    r.keuangan?.nomorKwitansi,
    ...pelaksanaOf(r).map((p) => p?.nama),
  ];
  return isi.some((v) =>
    String(v || '')
      .toLowerCase()
      .includes(q),
  );
}

/** Tanggal acuan urutan Daftar (tanggal SPBy, lalu waktu dibuat). */
export function tanggalUrut(r) {
  return r?.tanggalLpj || r?.dibuatPada?.toDate?.().toISOString() || '';
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
// Dokumen: { key, nama, singkat, code, cetak, sub }
//   code  = kode singkat dokumen (sama dengan badge di Detail LPJ)
//   cetak = { jenis: 'pdf', item } (item untuk resolveDokumen) | { jenis: 'files', files } | null
//   (null = dokumen fisik dari pelaksana, mis. tiket — hanya dicentang)

const pdf = (item) => ({ jenis: 'pdf', item });

function dokTunggal(key, nama, code) {
  return { key, nama, singkat: nama, code, cetak: pdf({ key, docKey: key, label: nama }) };
}

/** Dokumen per pelaksana; jadi kelompok yang bisa dibuka bila pelaksananya lebih dari satu. */
function perOrang(pelaksana, docKey, nama, code) {
  const docs = pelaksana.map((p) => ({
    key: `${docKey}_${p.pegawaiId}`,
    nama: `${nama} — ${p.nama}`,
    singkat: p.nama,
    code,
    cetak: pdf({
      key: `${docKey}_${p.pegawaiId}`,
      docKey,
      pegawai: p,
      label: `${nama} — ${p.nama}`,
    }),
  }));
  if (docs.length > 1) return { label: nama, code, kelompok: true, satuan: 'pelaksana', docs };
  if (docs.length === 1) {
    return {
      label: null,
      docs: [{ ...docs[0], nama, singkat: nama, sub: `Pelaksana: ${pelaksana[0].nama}` }],
    };
  }
  return { label: null, docs: [{ key: docKey, nama, singkat: nama, code, cetak: null }] };
}

/** Lampiran unggahan pelaksana: kelompok berisi satu baris per berkas (Meta). */
function kelompokLampiran(files, code) {
  if (!files.length) {
    return {
      label: null,
      docs: [
        {
          key: 'lampiran',
          nama: 'Lampiran',
          singkat: 'Lampiran',
          code,
          cetak: null,
          sub: 'Belum ada lampiran yang diunggah pelaksana',
        },
      ],
    };
  }
  return {
    label: 'Lampiran',
    code,
    kelompok: true,
    satuan: 'berkas',
    docs: files.map(({ key, judul, file }) => ({
      key,
      nama: `Lampiran — ${file.nama || judul}`,
      singkat: judul ? `${judul} · ${file.nama || ''}` : file.nama || 'Berkas',
      code,
      cetak: { jenis: 'files', files: [file] },
    })),
  };
}

/**
 * Kelompok dokumen Pemeriksaan Dokumen (pegawai2DocGroups purwarupa, dipetakan ke dokumen
 * berkas): { label, code, kelompok, satuan, docs }[], urut seperti Detail LPJ.
 * Kunci dokumen hanya huruf/angka/garis bawah, aman sebagai nama field Firestore.
 */
export function kelompokDokumen(berkas) {
  const pelaksana = pelaksanaOf(berkas);
  if (!isPerjadin(berkas)) {
    const lamp = berkas.lampiran || {};
    const files = [
      ...(lamp.foto || []).map((file, i) => ({
        key: `foto_bukti_${i}`,
        judul: 'Foto Bukti/Produk',
        file,
      })),
      ...(lamp.nota || []).map((file, i) => ({
        key: `nota_pembayaran_${i}`,
        judul: 'Nota Pembayaran',
        file,
      })),
    ];
    return [
      {
        label: null,
        docs: [dokTunggal('spby', 'SPBy', 'SPBY'), dokTunggal('nota_dinas', 'Nota Dinas', 'ND')],
      },
      perOrang(pelaksana, 'sptjm', 'SPTJM', 'SPTJM'),
      { label: null, docs: [dokTunggal('kwitansi', 'Kwitansi', 'KWT')] },
      kelompokLampiran(files, 'DOC'),
    ];
  }

  const fotos = (berkas.laporan?.foto || []).map((file, i) => ({
    key: `foto_laporan_${i}`,
    judul: 'Foto Kegiatan',
    file,
  }));
  return [
    { label: null, docs: [dokTunggal('sp', 'Surat Perintah (SP)', 'SP')] },
    perOrang(pelaksana, 'spd', 'SPD', 'SPD'),
    { label: null, docs: [dokTunggal('spby', 'SPBy', 'SPBY')] },
    perOrang(pelaksana, 'rincian_spby', 'Rincian SPBy', 'RSB'),
    {
      label: null,
      docs: [
        dokTunggal('nota_dinas', 'Nota Dinas', 'ND'),
        dokTunggal('kwitansi', 'Kwitansi', 'KWT'),
      ],
    },
    perOrang(pelaksana, 'sptjm', 'SPTJM', 'SPTJM'),
    perOrang(pelaksana, 'suratpernyataan', 'Surat Pernyataan Pengeluaran', 'SPP'),
    { label: null, docs: [dokTunggal('nominatif', 'Daftar Nominatif', 'NOM')] },
    { label: null, docs: [dokTunggal('laporan', 'Laporan Kegiatan', 'LAP')] },
    kelompokLampiran(fotos, 'FOTO'),
    {
      label: null,
      docs: [
        {
          key: 'tiket',
          nama: 'Tiket dan Boarding Pass',
          singkat: 'Tiket dan Boarding Pass',
          code: 'TKT',
          cetak: null,
        },
        { key: 'bill_hotel', nama: 'Bill Hotel', singkat: 'Bill Hotel', code: 'HTL', cetak: null },
      ],
    },
  ];
}

export const semuaDokumen = (kelompok) => kelompok.flatMap((g) => g.docs);

export const dokLengkap = (verif, key) => verif.statusDokumen?.[key] === 'lengkap';
export const dokDicetak = (verif, key) => !!verif.dicetak?.[key];

// ─── Nominal (Detail Transaksi & Lembar Verifikasi) ──────────────────────────

/**
 * POK Terakhir (sisa pagu Item sebelum tagihan ini). Konteks `mak`:
 *   - sebelum verifikasi selesai: { byId (node MAK), rekap (mak_rekap tahun itu),
 *     milikSendiri: { [itemNodeId]: realisasi berkas ini } } → pagu − terpakai di luar aplikasi
 *     (`realisasiAwal`) − (total − milikSendiri);
 *   - sesudahnya: { pok } (= pokBeku, dibekukan saat verifikasi).
 * null bila Item tidak ditemukan.
 */
export function pokItem(mak, nodeId) {
  if (mak?.pok) return mak.pok[nodeId] ?? null;
  const node = mak?.byId?.[nodeId];
  if (!node) return null;
  const total = Number(mak.rekap?.item?.[nodeId]?.total) || 0;
  const terpakaiLuar = Number(node.realisasiAwal) || 0;
  return (Number(node.pagu) || 0) - terpakaiLuar - (total - (mak.milikSendiri?.[nodeId] || 0));
}

/** Kode & nama Item dari node MAK (cadangan: salinan di baris transaksi). */
function infoItem(mak, nodeId, cadangan) {
  const node = mak?.byId?.[nodeId];
  return {
    kode: node?.kode || cadangan.kode || '',
    label: node?.nama || cadangan.label || '',
  };
}

/** Realisasi berkas ini per Item (jumlah transaksi asli = yang dicatat saat SPBy selesai). */
export function realisasiPerItem(berkas) {
  const hasil = {};
  transaksiOf(berkas).forEach((t) => {
    if (t.itemNodeId && Number.isInteger(t.jumlah)) {
      hasil[t.itemNodeId] = (hasil[t.itemNodeId] || 0) + t.jumlah;
    }
  });
  return hasil;
}

/**
 * Nominal tiap Item berkas (pegawai2Nominal purwarupa). Transaksi dengan Item yang sama
 * dijumlahkan. `verif.koreksi` hanya menyimpan yang DIUBAH Keuangan, berkunci Item asli:
 *   { [itemAsli]: { jumlah?, itemNodeId?, itemKode?, itemNama? (Item pengganti), pok? (POK manual) } }
 * Perjadin: Jumlah/POK/Sisa dibaca per Item; Non-Perjadin: satu Jumlah, POK, & Sisa untuk berkas.
 */
export function nominalBerkas(berkas, verif, mak) {
  const koreksi = verif?.koreksi || {};
  const urut = [];
  const asliByKey = {};
  transaksiOf(berkas).forEach((t) => {
    if (!t.itemNodeId && !t.jumlah) return;
    const key = t.itemNodeId || 'tanpa_item';
    if (!asliByKey[key]) {
      asliByKey[key] = {
        kode: t.salinan?.itemKode || '',
        label: t.salinan?.itemNama || '',
        total: 0,
      };
      urut.push(key);
    }
    asliByKey[key].total += Number.isInteger(t.jumlah) ? t.jumlah : 0;
  });

  const lines = urut.map((key) => {
    const asli = asliByKey[key];
    const k = koreksi[key] || {};
    const itemId = k.itemNodeId || key;
    // Item pengganti membawa salinan kode/nama sendiri (dipakai setelah pohon MAK tidak dimuat)
    const info =
      itemId === key
        ? infoItem(mak, key, asli)
        : infoItem(mak, itemId, { kode: k.itemKode, label: k.itemNama });
    const nilai = k.jumlah ?? asli.total;
    const pokDef = pokItem(mak, itemId);
    const pok = k.pok ?? pokDef;
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

  const perItem = isPerjadin(berkas);
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
    lines.some((l) => l.nilai !== l.asli || l.itemId !== l.codeAsli || koreksi[l.key]?.pok != null);
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

/** POK per Item yang dibekukan saat verifikasi selesai (`keuangan/status.pokBeku`). */
export function pokUntukDibekukan(berkas, verif, mak) {
  const hasil = {};
  nominalBerkas(berkas, verif, mak).lines.forEach((l) => {
    if (l.pok != null) hasil[l.itemId] = Math.round(l.pok);
  });
  return hasil;
}

// ─── Lembar Verifikasi ───────────────────────────────────────────────────────

/** "Rp.195.000,-" seperti penulisan di lembar. */
export const rpTitik = (n) => 'Rp.' + Math.round(Number(n) || 0).toLocaleString('id-ID') + ',-';

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

/**
 * Data lengkap Lembar Verifikasi untuk template PDF `lembar-verifikasi` di
 * src/components/SuratPreview/SuratPreviewCanvas.jsx (lewat resolveDokumen → `data.lembar`).
 * @param {{ mak?, pejabat?, verifikasi? }} konteks  verifikasi = bagian verifikasi keuangan/status
 */
export function dataLembar(berkas, { mak, pejabat, verifikasi } = {}) {
  const verif = verifikasi || {};
  const kelompok = kelompokDokumen(berkas);
  const nom = nominalBerkas(berkas, verif, mak);
  const pelaksana = pelaksanaOf(berkas).map((p) => p.nama);
  return {
    id: lpjIdOf(berkas),
    jenisTeks: isPerjadin(berkas) ? 'PERJALANAN DINAS' : 'KEGIATAN NON-PERJADIN',
    meta: [
      [
        ['Biro/ Divisi', 'Sub Bagian Tata Usaha'],
        ['Bagian', (isPerjadin(berkas) ? berkas.spd?.seksi : '') || ''],
        ['Kegiatan', uraianOf(berkas)],
      ],
      [
        ['MAK', makOf(berkas)?.kode || ''],
        ['Jumlah', nom.multi ? null : rpTitik(nom.jumlah)],
      ],
      [
        ['Nama Pelaksana', pelaksana.length > 3 ? `${pelaksana[0]}, dkk` : pelaksana.join(', ')],
        ['Nama BPP / Bendahara', pejabat?.bendahara?.nama || ''],
      ],
    ],
    nom,
    rows: barisLembar(kelompok, verif),
    catatan: catatanLembar(semuaDokumen(kelompok), verif),
  };
}
