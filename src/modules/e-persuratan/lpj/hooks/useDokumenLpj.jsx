import React, { useState } from 'react';
import SuratPreviewModal from '@/components/SuratPreview/SuratPreviewModal';
import { resolveDokumen } from '../utils/dokumenLpj';
import { cetakPdf } from '../utils/cetakPdf';
import DocPreviewPopup from '../ui/DocPreviewPopup';
import LampiranViewer from '../components/LampiranViewer';

/**
 * Tombol Lihat/Print dokumen LPJ.
 * - Dokumen dengan template PDF → pratinjau PDF / cetak di tab baru.
 * - Lampiran unggahan → penampil berkas.
 * - Belum ada template → pratinjau placeholder (seperti purwarupa).
 * Render `modal` di halaman pemanggil.
 */
export function useDokumenLpj({ pack, pegawai, showToast }) {
  const [preview, setPreview] = useState(null);

  const lihat = (item) => setPreview(resolveDokumen(pack, item, pegawai));

  const cetak = async (item) => {
    const r = resolveDokumen(pack, item, pegawai);
    if (r.kind !== 'pdf') {
      setPreview(r);
      return;
    }
    try {
      await cetakPdf(r);
    } catch (err) {
      console.error('cetakPdf error:', err);
      showToast?.('Gagal menyiapkan dokumen untuk dicetak.', 'error');
    }
  };

  const close = () => setPreview(null);
  let modal = null;
  if (preview?.kind === 'pdf') {
    modal = (
      <SuratPreviewModal
        surat={{ ...preview.surat, instanceData: preview.data, _packItem: preview.packItem }}
        onClose={close}
      />
    );
  } else if (preview?.kind === 'files') {
    modal = <LampiranViewer label={preview.label} files={preview.files} onClose={close} />;
  } else if (preview) {
    modal = <DocPreviewPopup label={preview.label} onClose={close} />;
  }

  return { lihat, cetak, modal };
}
