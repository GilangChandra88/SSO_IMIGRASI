/**
 * Halaman modul LPJ (rute /e-persuratan/lpj dan /e-persuratan/lpj/:packId):
 * - tanpa packId          → Daftar LPJ
 * - packId                → Detail Dokumen
 * - packId + ?isi=langkah → form fase (sp, tte, spd, cetak-spd, lpj, laporan, np, lampiran)
 */

import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import ToastViewport from '@/components/ToastViewport';
import BerkasListPage from './BerkasListPage';
import PackDetail from './PackDetail';
import BerkasFormPage from './BerkasFormPage';

export default function LPJPage() {
  const { packId } = useParams();
  const [searchParams] = useSearchParams();
  const isi = searchParams.get('isi');

  let view;
  if (!packId) view = <BerkasListPage />;
  else if (isi) view = <BerkasFormPage key={packId} packId={packId} isi={isi} />;
  else view = <PackDetail key={packId} packId={packId} />;

  return (
    <>
      {view}
      <ToastViewport />
    </>
  );
}
