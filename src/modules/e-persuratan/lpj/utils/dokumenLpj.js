/**
 * Adaptor dokumen LPJ → template PDF di src/components/SuratPreview/SuratPreviewCanvas.jsx.
 * Mengubah bagian berkas `lpj_berkas` (sp/tte/spd/lpj/laporan atau spby/lampiran) menjadi kunci
 * data yang dibaca template (nomor_sp, pegawai_list, detail_transaksi, pejabat_ppk, dst.).
 */

import { SURAT_REGISTRY } from '@/data/surat';
import { teksDipa } from '../../useDipa';
import { LAP_PENUTUP_BAKU, NP_PACK_DOCS } from '../data/masterLpj';
import { isPerjadin, lpjIdOf, makOf, pelaksanaOf, transaksiOf } from './lpjLogic';
import { dataLembar } from './verifikasiLogic';

// Dokumen yang sudah punya template PDF (key dokumen → id definisi surat)
const TEMPLATE_BY_DOC = {
  sp: 'surat-perintah',
  spd: 'surat-perjalanan-dinas',
  nota_dinas: 'nota-dinas',
  kwitansi: 'kwitansi',
  nominatif: 'nominatif',
  sptjm: 'sptjm-pelaksana',
  rincian_spby: 'rincian-spby',
  suratpernyataan: 'surat-pernyataan-pengeluaran',
  // SPBy memakai format "Surat Perintah Bayar" kantor (template SPB yang sudah ada)
  spby: 'surat-perintah-bayar',
  laporan: 'laporan',
  lembar_verifikasi: 'lembar-verifikasi',
};

// Dokumen khusus LPJ yang punya template PDF tetapi tidak didaftarkan di SURAT_REGISTRY
// (supaya tidak muncul sebagai kartu di halaman Persuratan).
const SURAT_KHUSUS_LPJ = [
  {
    id: 'surat-pernyataan-pengeluaran',
    kode: 'SPP',
    nama: 'Surat Pernyataan Pengeluaran Biaya Perjalanan Dinas',
    variables: [],
  },
  { id: 'lembar-verifikasi', kode: 'LV', nama: 'Lembar Verifikasi', variables: [] },
];

// Lampiran Non-Perjadin berupa berkas unggahan (field di bagian `lampiran`)
const FILE_DOCS = NP_PACK_DOCS.map((d) => d.key);

/** Format baku string pegawai (sama dengan SuratForm): 4 baris. */
export const formatPegawai = (p) =>
  `${p.nama}\nNIP. ${p.nip || '-'}\nPangkat: ${p.pangkat || '-'}\nJabatan: ${p.jabatan || '-'}`;

/**
 * Tanggal acuan pejabat PPK & Bendahara untuk dokumen LPJ/SPBy sebuah berkas: tanggal LPJ (Perjadin,
 * sebelum itu tanggal SPD/SP) atau tanggal SPBy (Non-Perjadin). '' bila belum ada (pemanggil memakai
 * hari ini).
 */
export function tanggalPejabat(pack) {
  if (!pack) return '';
  if (isPerjadin(pack)) {
    return pack.lpj?.tanggalLpj || pack.spd?.tanggal || pack.tte?.tanggalSurat || '';
  }
  return pack.spby?.tanggal || '';
}

/** Label pegawai di baris transaksi: "NIP - Nama". */
export const labelPegawaiTransaksi = (p) => `${p.nip || '-'} - ${p.nama}`;

/**
 * Data gabungan satu berkas untuk semua template.
 * @param {{ dipa?: object|null, pejabat?: { ppk?: object, bendahara?: object, ppkSpd?: object } }} konteks
 *   dipa = dokumen mak_dipa tahun berkas; pejabat = salinan Orang PPK & Bendahara dokumen LPJ, dan
 *   PPK pada tanggal SPD (`ppkSpd`, untuk SPD); kosong → placeholder di PDF
 */
export function dataDokumen(pack, { dipa = null, pejabat = {} } = {}) {
  const pelaksana = pelaksanaOf(pack);
  const byId = Object.fromEntries(pelaksana.map((p) => [p.pegawaiId, p]));
  const { ppk, bendahara, ppkSpd } = pejabat || {};

  // Urutkan mengikuti urutan pelaksana (baris pertama = pelaksana pertama = penerima uang)
  const urutan = Object.fromEntries(pelaksana.map((p, i) => [p.pegawaiId, i]));
  const detail_transaksi = transaksiOf(pack)
    .filter((t) => t.itemNodeId || t.jumlah > 0)
    .map((t, i) => ({ t, i }))
    .sort(
      (a, b) =>
        (urutan[a.t.pelaksanaId] ?? pelaksana.length) -
          (urutan[b.t.pelaksanaId] ?? pelaksana.length) || a.i - b.i,
    )
    .map(({ t }, i) => {
      const p = byId[t.pelaksanaId];
      const itemKode = t.salinan?.itemKode || '';
      const itemName = t.salinan?.itemNama || '';
      return {
        id: i + 1,
        pegawai: p ? labelPegawaiTransaksi(p) : '',
        detail: [itemKode, itemName].filter(Boolean).join(' - '),
        itemKode,
        itemName,
        uraian: itemName,
        jumlah: String(Number.isInteger(t.jumlah) ? t.jumlah : 0),
      };
    });

  const data = {
    pegawai_list: pelaksana.map(formatPegawai),
    detail_transaksi,
    pejabat_ppk: ppk ? formatPegawai(ppk) : '',
    bendahara: bendahara ? formatPegawai(bendahara) : '',
    mak: makOf(pack)?.kode || '',
    uraian: pack.uraian || '',
    nomor_bundle: lpjIdOf(pack),
  };

  if (!isPerjadin(pack)) {
    return { ...data, non_perjadin: true, tanggal_spby: pack.spby?.tanggal || '' };
  }

  const sp = pack.sp || {};
  const tte = pack.tte || {};
  const spd = pack.spd || {};
  const lpj = pack.lpj || {};
  const lap = pack.laporan || {};
  return {
    ...data,
    // Surat Perintah (nomor & tanggal resmi dari TTE Srikandi)
    nomor_sp: tte.nomorSurat || '',
    menimbang: sp.menimbang || '',
    dasar: [...(sp.dasar || []).filter(Boolean), teksDipa(dipa)],
    kegiatan_poin_1: (sp.untuk || [])[0] || '',
    tempat_terbit: 'Singaraja',
    tanggal_sp: tte.tanggalSurat || '',
    pejabat_ttd: sp.pejabat ? formatPegawai(sp.pejabat) : '',
    kategori_pejabat: sp.pejabat?.kategori || '',
    // SPD
    nomor_spd: spd.nomorSpd || '',
    ppk: ppkSpd || ppk ? formatPegawai(ppkSpd || ppk) : '',
    tingkat_biaya: 'Tingkat C',
    maksud: spd.maksud || '',
    alat_angkut: spd.alatAngkut || '',
    berangkat_dari: 'Singaraja',
    tempat_tujuan: spd.tujuan || '',
    tanggal_berangkat: spd.berangkat || '',
    tanggal_kembali: spd.kembali || '',
    tanggal_mulai: spd.berangkat || '',
    akun: spd.mak?.kode || '',
    tempat_dikeluarkan: 'Singaraja',
    tanggal_dikeluarkan: spd.tanggal || '',
    // LPJ & SPBy
    tanggal_spby: lpj.tanggalLpj || '',
    // Laporan Kegiatan (dasar, maksud, dan pegawai_list dipakai juga)
    lap_judul: pack.uraian || '',
    lap_tanggal: lap.tanggalLaporan || '',
    lap_pendahuluan: lap.pendahuluan || '', // A.1 Umum
    lap_maksud: lap.maksud || '',
    lap_ruang_lingkup: lap.ruangLingkup || '',
    lap_pelaksanaan: lap.pelaksanaan || '', // B.3 Uraian Kegiatan
    lap_hasil: lap.hasil || '',
    lap_kesimpulan: lap.kesimpulan || '',
    lap_penutup: lap.penutup || LAP_PENUTUP_BAKU,
    lap_ttd: lap.penandatangan ? formatPegawai(lap.penandatangan) : '',
  };
}

/** true bila dokumen punya template PDF (bisa dicetak/digabung), bukan unggahan atau placeholder. */
export function punyaTemplatePdf(item) {
  const suratId = TEMPLATE_BY_DOC[item.docKey || item.key];
  return !!suratId && [...SURAT_REGISTRY, ...SURAT_KHUSUS_LPJ].some((s) => s.id === suratId);
}

/**
 * Tentukan cara menampilkan satu dokumen.
 * @param item dokumen/sub-dokumen dari lpjDetailStages: { key, docKey?, pegawai?, label }
 * @param {{ dipa?, pejabat?, mak?, verifikasi? }} konteks  mak = konteks MAK (POK & Sisa Anggaran
 *   Lembar Verifikasi; tanpa ini kolom POK/Sisa berisi "—"); verifikasi = bagian verifikasi
 *   keuangan/status (centang dokumen & koreksi nominal)
 * @returns {{kind:'pdf', label, surat, data, packItem}|{kind:'files', label, files}|{kind:'placeholder', label}}
 */
export function resolveDokumen(pack, item, konteks = {}) {
  const docKey = item.docKey || item.key;
  if (FILE_DOCS.includes(docKey)) {
    return { kind: 'files', label: item.label, files: pack.lampiran?.[docKey] || [] };
  }
  // Scan Surat Perintah ber-TTE (opsional saat upload)
  if (docKey === 'scan_sp') {
    return { kind: 'files', label: item.label, files: pack.tte?.scan ? [pack.tte.scan] : [] };
  }

  const suratId = TEMPLATE_BY_DOC[docKey];
  const surat = [...SURAT_REGISTRY, ...SURAT_KHUSUS_LPJ].find((s) => s.id === suratId);
  if (!surat) return { kind: 'placeholder', label: item.label };

  const data = dataDokumen(pack, konteks);
  if (docKey === 'lembar_verifikasi') data.lembar = dataLembar(pack, konteks);
  let packItem;
  if (item.pegawai) {
    if (docKey === 'spd') data.pegawai = formatPegawai(item.pegawai);
    if (docKey === 'rincian_spby' || docKey === 'suratpernyataan') {
      data._filterPegawai = labelPegawaiTransaksi(item.pegawai);
    }
    if (docKey === 'sptjm') packItem = { assigned_name: item.pegawai.nama };
  } else if (docKey === 'spd') {
    const first = pelaksanaOf(pack)[0];
    if (first) data.pegawai = formatPegawai(first);
  }
  return { kind: 'pdf', label: item.label, surat, data, packItem };
}
