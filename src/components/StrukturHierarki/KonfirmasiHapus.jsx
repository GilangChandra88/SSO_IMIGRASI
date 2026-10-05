import React from 'react';
import { ADMIN } from '@/utils/uiTokens';

/** Konfirmasi hapus kecil di baris ("Hapus? Ya / Batal"), pengganti window.confirm. */
export default function KonfirmasiHapus({ teks = 'Hapus?', onYa, onBatal, busy }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={ADMIN.confirmText}>{teks}</span>
      <button type="button" className={ADMIN.miniYes} onClick={onYa} disabled={busy}>
        Ya
      </button>
      <button type="button" className={ADMIN.miniNo} onClick={onBatal} disabled={busy}>
        Batal
      </button>
    </span>
  );
}
