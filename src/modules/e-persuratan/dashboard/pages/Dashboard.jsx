/**
 * Dashboard e-Persuratan.
 * - Pegawai: tampilan "Berkas Saya" (berkas LPJ yang dibuat/diikuti pengguna).
 * - Keuangan/Super Admin: dua tab di kartu sambutan (Dashboard2 purwarupa admin) — "Berkas
 *   Verifikasi" (bawaan; ringkasan tahap Berkas Verifikasi) dan "Berkas Saya". Tab tersimpan di
 *   URL (?tab=saya) agar kembali ke tab yang sama setelah membuka berkas.
 * Angka per tahap dihitung Function hitungTahapLpj (sekali saat dibuka, diulang saat ada berkas
 * yang pindah tahap); dipakai juga untuk lencana tab Berkas Verifikasi.
 */

import React, { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { tahunIni } from '@/utils/nilai';
import { formatTanggalDate, useRekapTahap } from '@/modules/e-persuratan/lpj';
import PanelSaya from '../components/PanelSaya';
import PanelVerifikasi from '../components/PanelVerifikasi';
import TabDashboard from '../components/TabDashboard';
import { TAHAP_PROSES } from '../utils/tahap';

export default function Dashboard() {
  const { isKeuangan, userData } = useAuth();
  const [sp, setSp] = useSearchParams();
  const tab = isKeuangan && sp.get('tab') !== 'saya' ? 'verif' : 'saya';
  const tahunAnggaran = tahunIni();

  const [segar, setSegar] = useState(0);
  const tahapBerubah = useCallback(() => setSegar((n) => n + 1), []);
  const { rekap, galat } = useRekapTahap({ tahunAnggaran, aktif: isKeuangan, segar });
  const jumlahProses = rekap ? TAHAP_PROSES.reduce((s, k) => s + (rekap.tahap[k] || 0), 0) : 0;

  // Nama hari + tanggal hari/bulan/tahun, mis. "Jumat, 23/10/2026"
  const sekarang = new Date();
  const tanggal = `${sekarang.toLocaleDateString('id-ID', { weekday: 'long' })}, ${formatTanggalDate(sekarang)}`;
  const namaDepan = userData?.nama?.split(' ')[0] || 'Pengguna';

  const tabs = isKeuangan ? (
    <TabDashboard
      tab={tab}
      jumlahProses={jumlahProses}
      onPilih={(k) => setSp(k === 'saya' ? { tab: 'saya' } : {}, { replace: true })}
    />
  ) : null;

  return tab === 'verif' ? (
    <PanelVerifikasi
      tabs={tabs}
      rekap={rekap}
      galat={galat}
      tahunAnggaran={tahunAnggaran}
      tanggal={tanggal}
      namaDepan={namaDepan}
      onTahapBerubah={tahapBerubah}
    />
  ) : (
    <PanelSaya tabs={tabs} tanggal={tanggal} namaDepan={namaDepan} />
  );
}
