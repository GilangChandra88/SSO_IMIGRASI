/**
 * TEMPLATE PAKET LPJ
 * ===================
 * Mendefinisikan struktur & urutan dokumen untuk tiap tipe paket.
 * Saat paket dibuat, surat_items di-generate otomatis dari template ini.
 *
 * assign_to_role:
 *   'admin'       → admin yang membuat paket
 *   'bendahara'   → pegawai dengan role bendahara (jika ada) atau admin
 *   'per_pegawai' → satu item per pegawai dalam pegawai_list
 *   'manual'      → admin assign manual saat setup
 */

// ─── FLOW A: PERJADIN ─────────────────────────────────────────────────────────

export const PERJADIN_PHASES = [
  {
    id: 'sp',
    label: 'Fase 1 — Surat Perintah',
    icon: '',
    color: '#1e293b',
    items: [
      {
        template_id: 'surat-perintah',
        definition_id: 'surat-perintah',
        kode: 'SP',
        surat_nama: 'Surat Perintah',
        icon: '',
        warna: '#1e293b',
        urutan: 1,
        depends_on: [],
        is_hub: true,
        assign_to_role: 'admin',
        per_pegawai: false,
      },
    ],
  },
  {
    id: 'spd',
    label: 'Fase 2 — Surat Perjalanan Dinas',
    icon: '',
    color: '#1e293b',
    items: [
      {
        template_id: 'surat-perjalanan-dinas',
        definition_id: 'surat-perjalanan-dinas',
        kode: 'SPD',
        surat_nama: 'Surat Perjalanan Dinas',
        icon: '',
        warna: '#334155',
        urutan: 2,
        depends_on: ['surat-perintah'],
        assign_to_role: 'per_pegawai',
        per_pegawai: true,
      },
    ],
  },
  {
    id: 'spby',
    label: 'Fase 3 — SPBY',
    icon: '',
    color: '#334155',
    items: [
      {
        template_id: 'spby',
        definition_id: 'spby',
        kode: 'SPBY',
        surat_nama: 'SPBY (Form Hub)',
        icon: '',
        warna: '#1e293b',
        urutan: 10,
        depends_on: ['surat-perjalanan-dinas'],
        is_hub: true,
        is_hidden: true,
        assign_to_role: 'admin',
        per_pegawai: false,
      },
      {
        template_id: 'nota-dinas',
        definition_id: 'nota-dinas',
        kode: 'NDINAS',
        surat_nama: 'Nota Dinas',
        icon: '',
        warna: '#334155',
        urutan: 11,
        depends_on: ['spby'],
        assign_to_role: 'bendahara',
        per_pegawai: false,
      },
      {
        template_id: 'surat-perintah-bayar',
        definition_id: 'surat-perintah-bayar',
        kode: 'SPB',
        surat_nama: 'Surat Perintah Bayar',
        icon: '',
        warna: '#475569',
        urutan: 12,
        depends_on: ['spby'],
        assign_to_role: 'bendahara',
        per_pegawai: false,
      },
      {
        template_id: 'rincian-spby',
        definition_id: 'rincian-spby',
        kode: 'RSPBY',
        surat_nama: 'Rincian SPBy',
        icon: '',
        warna: '#1e293b',
        urutan: 13,
        depends_on: ['spby'],
        assign_to_role: 'bendahara',
        per_pegawai: false,
      },
      {
        template_id: 'rincian-perjalanan',
        definition_id: 'rincian-perjalanan-tugas',
        kode: 'RPERT',
        surat_nama: 'Rincian Perjalanan Tugas',
        icon: '',
        warna: '#334155',
        urutan: 14,
        depends_on: ['spby'],
        assign_to_role: 'bendahara',
        per_pegawai: false,
      },
      {
        template_id: 'sptjm-pelaksana',
        definition_id: 'sptjm-pelaksana',
        kode: 'SPTJM',
        surat_nama: 'SPTJM Pelaksana',
        icon: '',
        warna: '#475569',
        urutan: 15,
        depends_on: ['spby'],
        assign_to_role: 'per_pegawai',
        per_pegawai: true,
      },
      {
        template_id: 'nominatif',
        definition_id: 'nominatif',
        kode: 'NOM',
        surat_nama: 'Nominatif',
        icon: '',
        warna: '#475569',
        urutan: 16,
        depends_on: ['spby'],
        assign_to_role: 'bendahara',
        per_pegawai: false,
      },
      {
        template_id: 'kwitansi',
        definition_id: 'kwitansi',
        kode: 'KWT',
        surat_nama: 'Kwitansi',
        icon: '',
        warna: '#475569',
        urutan: 17,
        depends_on: ['spby'],
        assign_to_role: 'bendahara',
        per_pegawai: false,
      },
    ],
  },
  {
    id: 'penutup',
    label: 'Fase 4 — Penutupan dan Arsip',
    icon: '',
    color: '#475569',
    items: [
      {
        template_id: 'lembar-verifikasi',
        definition_id: 'lembar-verifikasi',
        kode: 'LVER',
        surat_nama: 'Lembar Verifikasi (Cover)',
        icon: '',
        warna: '#1e293b',
        urutan: 20,
        depends_on: ['nota-dinas', 'surat-perintah-bayar', 'rincian-spby'],
        assign_to_role: 'admin',
        per_pegawai: false,
      },
      {
        template_id: 'laporan',
        definition_id: 'laporan',
        kode: 'LAP',
        surat_nama: 'Laporan',
        icon: '',
        warna: '#334155',
        urutan: 21,
        depends_on: ['spby'],
        assign_to_role: 'admin',
        per_pegawai: false,
      },
      {
        template_id: 'lampiran',
        definition_id: 'lampiran',
        kode: 'LMP',
        surat_nama: 'Lampiran',
        icon: '',
        warna: '#475569',
        urutan: 22,
        depends_on: [],
        assign_to_role: 'admin',
        per_pegawai: false,
      },
    ],
  },
];

// ────────── FLOW B: NON PERJADIN ──────────────────────────────────────────────────────────────────

export const NON_PERJADIN_PHASES = [
  {
    id: 'pembayaran',
    label: 'Fase 1 — Dokumen Pembayaran',
    icon: '',
    color: '#475569',
    items: [
      {
        template_id: 'surat-perintah-bayar',
        definition_id: 'surat-perintah-bayar',
        kode: 'SPB',
        surat_nama: 'Surat Perintah Bayar',
        icon: '',
        warna: '#1e293b',
        urutan: 1,
        depends_on: [],
        assign_to_role: 'bendahara',
        per_pegawai: false,
      },
      {
        template_id: 'nota-dinas',
        definition_id: 'nota-dinas',
        kode: 'NDINAS',
        surat_nama: 'Nota Dinas',
        icon: '',
        warna: '#334155',
        urutan: 2,
        depends_on: ['surat-perintah-bayar'],
        assign_to_role: 'bendahara',
        per_pegawai: false,
      },
      {
        template_id: 'sptjm-pihak-ketiga',
        definition_id: 'sptjm-pelaksana',
        kode: 'SPTJM3',
        surat_nama: 'SPTJM Pihak Ketiga',
        icon: '',
        warna: '#475569',
        urutan: 3,
        depends_on: ['surat-perintah-bayar'],
        assign_to_role: 'admin',
        per_pegawai: false,
      },
      {
        template_id: 'kwitansi',
        definition_id: 'kwitansi',
        kode: 'KWT',
        surat_nama: 'Kwitansi',
        icon: '',
        warna: '#475569',
        urutan: 4,
        depends_on: ['surat-perintah-bayar'],
        assign_to_role: 'bendahara',
        per_pegawai: false,
      },
    ],
  },
  {
    id: 'penutup',
    label: 'Fase 2 — Penutup & Arsip',
    icon: '',
    color: '#475569',
    items: [
      {
        template_id: 'lembar-verifikasi',
        definition_id: 'lembar-verifikasi',
        kode: 'LVER',
        surat_nama: 'Lembar Verifikasi/Cover Kegiatan',
        icon: '',
        warna: '#1e293b',
        urutan: 10,
        depends_on: ['nota-dinas', 'sptjm-pihak-ketiga', 'kwitansi'],
        assign_to_role: 'admin',
        per_pegawai: false,
      },
      {
        template_id: 'lampiran',
        definition_id: 'lampiran',
        kode: 'LMP',
        surat_nama: 'Lampiran',
        icon: '',
        warna: '#334155',
        urutan: 11,
        depends_on: [],
        assign_to_role: 'admin',
        per_pegawai: false,
      },
    ],
  },
];

// ─── Helper: generate surat_items dari template + pegawai_list ────────────────

/**
 * Menghasilkan array surat_item yang siap disimpan ke Firestore.
 * Menangani kasus SPD yang dibuat 1× per pegawai.
 *
 * @param {'perjadin'|'non_perjadin'} type
 * @param {object[]} pegawaiList - list pegawai yang ditugaskan
 * @param {object} assignees - { admin: {uid, nama}, bendahara: {uid, nama} }
 * @returns {object[]} surat_items
 */
export function generateSuratItems(type, pegawaiList = [], assignees = {}) {
  const phases = type === 'perjadin' ? PERJADIN_PHASES : NON_PERJADIN_PHASES;
  const items = [];

  phases.forEach((phase) => {
    phase.items.forEach((tpl) => {
      if (tpl.per_pegawai && pegawaiList.length > 0) {
        // Buat 1 item per pegawai
        pegawaiList.forEach((pegawai, idx) => {
          items.push(
            buildItem({
              ...tpl,
              template_id: `${tpl.template_id}-${pegawai.nip || idx}`,
              surat_nama: `${tpl.surat_nama} — ${pegawai.nama}`,
              phase_id: phase.id,
              phase_label: phase.label,
              assigned_to: pegawai.uid || '',
              assigned_name: pegawai.nama || '',
            }),
          );
        });
      } else {
        // Tentukan assignee berdasarkan role
        let assigned_to = '';
        let assigned_name = '';

        if (tpl.assign_to_role === 'admin') {
          assigned_to = assignees.admin?.uid || '';
          assigned_name = assignees.admin?.nama || '';
        } else if (tpl.assign_to_role === 'bendahara') {
          assigned_to = assignees.bendahara?.uid || assignees.admin?.uid || '';
          assigned_name = assignees.bendahara?.nama || assignees.admin?.nama || '';
        }

        items.push(
          buildItem({
            ...tpl,
            phase_id: phase.id,
            phase_label: phase.label,
            assigned_to,
            assigned_name,
          }),
        );
      }
    });
  });

  return items;
}

function buildItem(tpl) {
  return {
    id: tpl.template_id,
    definition_id: tpl.definition_id,
    kode: tpl.kode,
    surat_nama: tpl.surat_nama,
    icon: tpl.icon,
    warna: tpl.warna,
    urutan: tpl.urutan,
    phase_id: tpl.phase_id,
    phase_label: tpl.phase_label,
    depends_on: tpl.depends_on || [],
    is_hub: tpl.is_hub || false,
    is_hidden: tpl.is_hidden || false,
    // Status
    status: 'not_started', // 'not_started'|'in_progress'|'completed'|'not_required'
    is_blocked: tpl.depends_on?.length > 0, // blocked jika ada dependency
    // Assignment
    assigned_to: tpl.assigned_to || '',
    assigned_name: tpl.assigned_name || '',
    // Data isian surat (diisi saat dikerjakan)
    data: {},
    nomor_surat: '',
    instance_id: '',
    // Timestamps
    started_at: null,
    started_by: '',
    completed_at: null,
    completed_by: '',
    notes: '',
    is_locked: false,
  };
}

// ─── Konstanta metadata tipe pack ─────────────────────────────────────────────

export const PACK_TYPES = {
  perjadin: {
    id: 'perjadin',
    label: 'Perjalanan Dinas',
    icon: '',
    color: '#1e293b', // slate-800
    bgColor: 'bg-slate-800',
    textColor: 'text-white',
    borderColor: 'border-slate-800',
    phases: PERJADIN_PHASES,
  },
  non_perjadin: {
    id: 'non_perjadin',
    label: 'Non Perjalanan Dinas',
    icon: '',
    color: '#475569', // slate-600
    bgColor: 'bg-white',
    textColor: 'text-slate-800',
    borderColor: 'border-slate-300',
    phases: NON_PERJADIN_PHASES,
  },
};
