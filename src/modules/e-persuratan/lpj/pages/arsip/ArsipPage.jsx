/**
 * Arsip (rute /e-persuratan/arsip/*) — satu rute untuk dua tampilan seperti purwarupa:
 * Admin/Keuangan mengelola (pindai berkas, DRPP); pegawai pelaksana hanya melihat miliknya.
 */

import React from 'react';
import ToastViewport from '@/components/ToastViewport';
import { useLpjUser } from '../../hooks/useLpjUser';
import ArsipKeuangan from './keuangan/ArsipKeuangan';
import ArsipPelaksana from './ArsipPelaksana';

export default function ArsipPage() {
  const { isAdmin } = useLpjUser();
  return (
    <>
      {isAdmin ? <ArsipKeuangan /> : <ArsipPelaksana />}
      <ToastViewport />
    </>
  );
}
