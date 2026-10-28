import React, { useEffect, useRef, useState } from 'react';
import SuratPreviewModal from '@/components/SuratPreview/SuratPreviewModal';
import { usePejabat } from '@/context/usePejabat';
import { useDipa } from '../../useDipa';
import { resolveDokumen, tanggalPejabat } from '../utils/dokumenLpj';
import { cetakPdf, pdfGabungan } from '../utils/cetakPdf';
import DocPreviewPopup from '../ui/DocPreviewPopup';
import LampiranViewer from '../components/LampiranViewer';
import PdfGabunganModal from '../components/PdfGabunganModal';

/**
 * Tombol Lihat/Print dokumen LPJ.
 * - Dokumen dengan template PDF → pratinjau PDF / cetak di tab baru.
 * - Lampiran unggahan → penampil berkas.
 * - Belum ada template → pratinjau placeholder (seperti purwarupa).
 * - `cetakSemua(items, label)` → dokumen ber-template PDF & berkas unggahan digabung jadi satu
 *   PDF dan ditampilkan di popup (Cetak / Unduh).
 * `mak` & `verifikasi` (opsional) mengisi Lembar Verifikasi (POK/Sisa, centang dokumen, koreksi
 * nominal); `pejabat` (opsional, `{ ppk, bendahara }` salinan Orang yang dibekukan saat
 * verifikasi) mengisi tanda tangan PPK/Bendahara; yang kosong diisi pejabat yang berlaku pada
 * tanggal dokumen (`pegawai_pejabat`, lihat tanggalPejabat), dan SPD memakai PPK pada tanggal SPD.
 * Teks DIPA dibaca dari `mak_dipa` tahun anggaran berkas. Render `modal` di halaman pemanggil.
 */
export function useDokumenLpj({ pack, showToast, mak, pejabat, verifikasi }) {
  const [preview, setPreview] = useState(null);
  const urutGabungan = useRef(0); // abaikan hasil penyusunan yang popupnya sudah ditutup
  const { dipa } = useDipa(pack?.tahunAnggaran);
  const { pejabatPada } = usePejabat();
  const tanggal = tanggalPejabat(pack);
  const konteks = {
    dipa,
    pejabat: {
      ppk: pejabat?.ppk || pejabatPada('ppk', tanggal),
      bendahara: pejabat?.bendahara || pejabatPada('bendahara', tanggal),
      ppkSpd: pejabatPada('ppk', pack?.spd?.tanggal || tanggal),
    },
    mak,
    verifikasi,
  };

  const lihat = (item) => setPreview(resolveDokumen(pack, item, konteks));

  const cetak = async (item) => {
    const r = resolveDokumen(pack, item, konteks);
    if (r.kind !== 'pdf') {
      setPreview(r);
      return;
    }
    try {
      await cetakPdf(r);
    } catch {
      showToast?.('Gagal menyiapkan dokumen untuk dicetak.', 'error');
    }
  };

  /**
   * Cetak beberapa dokumen sekaligus (satu PDF di popup): template PDF + berkas unggahan (mis.
   * scan SP ber-TTE). Dokumen tanpa template (placeholder) dilewati.
   */
  const cetakSemua = async (items, label = 'Cetak Semua') => {
    const siap = items
      .map((item) => resolveDokumen(pack, item, konteks))
      .filter((r) => r.kind === 'pdf' || (r.kind === 'files' && r.files.length > 0));
    if (!siap.length) {
      showToast?.('Belum ada dokumen yang bisa dicetak.', 'error');
      return;
    }
    const ke = ++urutGabungan.current;
    setPreview({ kind: 'gabungan', label, url: null });
    try {
      const { blob, gagal } = await pdfGabungan(siap);
      if (urutGabungan.current !== ke) return; // popup sudah ditutup / diganti
      setPreview({ kind: 'gabungan', label, url: URL.createObjectURL(blob) });
      if (gagal) {
        showToast?.(
          'Sebagian berkas unggahan tidak bisa digabung ke cetakan; buka lewat tombol Lihat.',
          'error',
        );
      }
    } catch {
      if (urutGabungan.current === ke) setPreview(null);
      showToast?.('Gagal menyiapkan dokumen untuk dicetak.', 'error');
    }
  };

  // Lepas URL PDF gabungan saat popup ditutup / diganti
  const urlGabungan = preview?.kind === 'gabungan' ? preview.url : null;
  useEffect(() => () => urlGabungan && URL.revokeObjectURL(urlGabungan), [urlGabungan]);

  const close = () => {
    urutGabungan.current++;
    setPreview(null);
  };
  let modal = null;
  if (preview?.kind === 'gabungan') {
    modal = (
      <PdfGabunganModal
        label={preview.label}
        url={preview.url}
        namaBerkas={`${preview.label}.pdf`}
        onClose={close}
      />
    );
  } else if (preview?.kind === 'pdf') {
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

  return { lihat, cetak, cetakSemua, modal, konteks };
}
