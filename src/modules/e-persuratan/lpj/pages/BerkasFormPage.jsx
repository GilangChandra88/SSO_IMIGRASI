/**
 * Memuat berkas lalu membuka form sesuai jenisnya (Perjadin / Non-Perjadin).
 * Berkas final, format lama, atau tanpa hak edit dikembalikan ke Detail Dokumen.
 */

import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useLPJPack } from '../hooks/useLPJ';
import { useLpjUser } from '../hooks/useLpjUser';
import { canEditPack, isPerjadin, isSkemaBaru } from '../utils/lpjLogic';
import LinkBack from '../ui/LinkBack';
import { LAYOUT, T } from '../ui/tokens';
import PerjadinFormPage from './perjadin/PerjadinFormPage';
import NonPerjadinFormPage from './nonperjadin/NonPerjadinFormPage';

export default function BerkasFormPage({ packId, isi }) {
  const navigate = useNavigate();
  const user = useLpjUser();
  const { pack, loading, error } = useLPJPack(packId);
  const detailUrl = `/e-persuratan/lpj/${packId}`;

  if (loading) {
    return (
      <div className={`min-h-full ${T.ground}`}>
        <div className={LAYOUT.page}>
          <section className={LAYOUT.card}>
            <div className="animate-pulse space-y-4">
              <div className={`h-4 w-40 rounded ${T.surface2}`} />
              <div className={`h-8 w-64 rounded ${T.surface2}`} />
              {[1, 2, 3].map((i) => (
                <div key={i} className={`h-32 rounded-xl ${T.surface2}`} />
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (error || !pack) {
    return (
      <div className={`min-h-full ${T.ground}`}>
        <div className={LAYOUT.page}>
          <section className={LAYOUT.card}>
            <LinkBack onClick={() => navigate('/e-persuratan/lpj')}>Kembali ke Daftar LPJ</LinkBack>
            <p className={`text-center py-9 text-[13.5px] ${T.inkMuted}`}>
              {error || 'Berkas tidak ditemukan.'}
            </p>
          </section>
        </div>
      </div>
    );
  }

  if (!isSkemaBaru(pack) || !canEditPack(pack, user)) return <Navigate to={detailUrl} replace />;

  return isPerjadin(pack) ? (
    <PerjadinFormPage pack={pack} isi={isi} user={user} />
  ) : (
    <NonPerjadinFormPage pack={pack} isi={isi} user={user} />
  );
}
