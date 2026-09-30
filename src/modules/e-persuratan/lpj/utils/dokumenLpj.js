/**
 * Adaptor dokumen LPJ → template PDF di src/components/SuratPreview/SuratPreviewCanvas.jsx.
 * Mengubah bagian berkas (sp/spd/lpj/np) menjadi kunci data yang dibaca template
 * (nomor_sp, pegawai_list, detail_transaksi, pejabat_ppk, dst.).
 */

import { SURAT_REGISTRY } from '@/data/surat';
import { DIPA_DASAR_TEXT } from '../data/masterLpj';
import { isPerjadin, makOf, parseNum, pelaksanaOf, transaksiOf } from './lpjLogic';

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
];

// Lampiran Non-Perjadin berupa berkas unggahan
const FILE_DOCS = ['foto_bukti', 'nota_pembayaran'];

/** Format baku string pegawai (sama dengan SuratForm): 4 baris. */
export const formatPegawai = (p) =>
  `${p.nama}\nNIP. ${p.nip || '-'}\nPangkat: ${p.pangkat || '-'}\nJabatan: ${p.jabatan || '-'}`;

/** Label pegawai di baris transaksi: "NIP - Nama". */
export const labelPegawaiTransaksi = (p) => `${p.nip || '-'} - ${p.nama}`;

function pejabatKhusus(pegawaiList, jenis) {
  const list = pegawaiList || [];
  if (jenis === 'PPK') return list.find((p) => p.status_khusus === 'PPK');
  return list.find((p) =>
    String(p.status_khusus || '')
      .toLowerCase()
      .includes('bendahara'),
  );
}

/** Data gabungan satu berkas untuk semua template. */
export function dataDokumen(pack, pegawaiList) {
  const pelaksana = pelaksanaOf(pack);
  const byId = Object.fromEntries(pelaksana.map((p) => [p.id, p]));
  const ppk = pejabatKhusus(pegawaiList, 'PPK');
  const bendahara = pejabatKhusus(pegawaiList, 'Bendahara');

  const detail_transaksi = transaksiOf(pack)
    .filter((t) => t.itemNodeId || parseNum(t.jumlah) > 0)
    .map((t, i) => {
      const p = byId[t.pelaksanaId];
      return {
        id: i + 1,
        pegawai: p ? labelPegawaiTransaksi(p) : '',
        detail: [t.itemKode, t.itemName].filter(Boolean).join(' - '),
        itemKode: t.itemKode || '',
        itemName: t.itemName || '',
        uraian: t.itemName || '',
        jumlah: String(parseNum(t.jumlah)),
      };
    });

  const data = {
    pegawai_list: pelaksana.map(formatPegawai),
    detail_transaksi,
    pejabat_ppk: ppk ? formatPegawai(ppk) : '',
    bendahara: bendahara ? formatPegawai(bendahara) : '',
    mak: makOf(pack)?.kode || '',
    uraian: pack.uraian || '',
    nomor_bundle: pack.id,
  };

  if (!isPerjadin(pack)) {
    const np = pack.np || {};
    return { ...data, uraian: np.uraian || pack.uraian || '', tanggal_spby: np.tanggal || '' };
  }

  const sp = pack.sp || {};
  const spd = pack.spd || {};
  const lpj = pack.lpj || {};
  return {
    ...data,
    // Surat Perintah
    nomor_sp: sp.nomorSurat || '',
    menimbang: sp.menimbang || '',
    dasar: [...(sp.dasar || []).filter(Boolean), DIPA_DASAR_TEXT],
    kegiatan_poin_1: (sp.untuk || [])[0] || '',
    tempat_terbit: 'Singaraja',
    tanggal_sp: sp.tanggal || '',
    pejabat_ttd: sp.pejabat ? formatPegawai(sp.pejabat) : '',
    // SPD
    nomor_spd: spd.nomorSPD || '',
    ppk: ppk ? formatPegawai(ppk) : '',
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
    tanggal_spby: lpj.tanggalLPJ || '',
  };
}

/**
 * Tentukan cara menampilkan satu dokumen.
 * @param item dokumen/sub-dokumen dari lpjDetailStages: { key, docKey?, pegawai?, label }
 * @returns {{kind:'pdf', label, surat, data, packItem}|{kind:'files', label, files}|{kind:'placeholder', label}}
 */
export function resolveDokumen(pack, item, pegawaiList) {
  const docKey = item.docKey || item.key;
  if (FILE_DOCS.includes(docKey)) {
    return { kind: 'files', label: item.label, files: pack.np?.lampiran?.[docKey] || [] };
  }

  const suratId = TEMPLATE_BY_DOC[docKey];
  const surat = [...SURAT_REGISTRY, ...SURAT_KHUSUS_LPJ].find((s) => s.id === suratId);
  if (!surat) return { kind: 'placeholder', label: item.label };

  const data = dataDokumen(pack, pegawaiList);
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
