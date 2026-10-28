/**
 * Berkas Verifikasi (rute /e-persuratan/verifikasi dan /e-persuratan/verifikasi/:packId), khusus
 * Keuangan:
 * - tanpa packId → Daftar per tahap (Draft → Verifikasi → Upload SAKTI → Transfer → Arsip)
 * - packId       → halaman Draft (belum bernomor, lihat saja) atau halaman Verifikasi berkas itu
 */

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ToastViewport from '@/components/ToastViewport';
import { useBerkas, useKeuanganBerkas } from '../../hooks/useBerkas';
import { useLpjUser } from '../../hooks/useLpjUser';
import { lpjIdOf } from '../../utils/lpjLogic';
import LinkBack from '../../ui/LinkBack';
import DaftarVerifikasi from './DaftarVerifikasi';
import HalamanDraft from './HalamanDraft';
import HalamanVerifikasi from './HalamanVerifikasi';
import { LAYOUT, T } from '@/utils/uiTokens';

export default function VerifikasiPage() {
  const { packId } = useParams();
  return (
    <>
      {packId ? <BerkasVerifikasi key={packId} packId={packId} /> : <DaftarVerifikasi />}
      <ToastViewport />
    </>
  );
}

function BerkasVerifikasi({ packId }) {
  const navigate = useNavigate();
  const user = useLpjUser();
  const { berkas: pack, memuat: loading, galat: error } = useBerkas(packId);
  const bernomor = !!lpjIdOf(pack);
  const { keuangan, memuat: memuatKeuangan } = useKeuanganBerkas(bernomor ? packId : null);

  if (loading || (bernomor && memuatKeuangan)) {
    return (
      <div className={`min-h-full ${T.ground}`}>
        <div className={LAYOUT.page}>
          <div className={`${LAYOUT.card} animate-pulse space-y-4`}>
            <div className={`h-6 w-48 rounded ${T.surface2}`} />
            {[1, 2, 3].map((i) => (
              <div key={i} className={`h-24 rounded-[14px] ${T.surface2}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (error || !pack) {
    return (
      <div className={`min-h-full ${T.ground}`}>
        <div className={LAYOUT.page}>
          <LinkBack onClick={() => navigate('/e-persuratan/verifikasi')}>
            Kembali ke Berkas Verifikasi
          </LinkBack>
          <p className={`text-center py-9 text-[13.5px] ${T.inkMuted}`}>
            {error ? 'Berkas tidak dapat dibuka (tidak punya akses).' : 'Berkas tidak ditemukan.'}
          </p>
        </div>
      </div>
    );
  }
  if (!bernomor) return <HalamanDraft pack={pack} />;
  return <HalamanVerifikasi pack={pack} keuangan={keuangan} user={user} />;
}
