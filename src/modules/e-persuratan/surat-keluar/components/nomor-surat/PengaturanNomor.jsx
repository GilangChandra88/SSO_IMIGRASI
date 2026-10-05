import React, { useState } from 'react';
import { showToast } from '@/utils/toastStore';
import { ADMIN, FONT, T } from '@/utils/uiTokens';
import { simpanNomorTerakhir } from '../../services/nomorSurat';

/** Pengaturan nomor urut terakhir (`settings/nomor_surat`), dipakai bersama SuratForm. */
export default function PengaturanNomor({ lastNumber }) {
  const [nilai, setNilai] = useState(null); // null = ikuti data Firestore
  const [sibuk, setSibuk] = useState(false);
  const tampil = nilai ?? String(lastNumber);
  const angka = parseInt(tampil, 10);
  const sah = Number.isInteger(angka) && angka >= 0;

  const simpan = async () => {
    if (!sah) return;
    setSibuk(true);
    try {
      await simpanNomorTerakhir(angka);
      setNilai(null);
      showToast('Nomor surat terakhir berhasil disimpan.');
    } catch {
      showToast('Gagal menyimpan pengaturan.', 'error');
    } finally {
      setSibuk(false);
    }
  };

  return (
    <div className={`max-w-[640px] border rounded-[14px] p-4 sm:p-5 ${T.border}`}>
      <h2 className={ADMIN.modalTitle}>Pengaturan Nomor Surat</h2>
      <p className={ADMIN.modalSub}>
        Tentukan nomor urut surat terakhir yang dikeluarkan oleh sistem sebelumnya. Sistem akan
        otomatis melanjutkan penomoran dari angka tersebut, baik untuk surat yang dibuat lewat form
        maupun nomor yang ditambahkan di daftar.
      </p>
      <form
        className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          simpan();
        }}
      >
        <div className="flex-1">
          <label className={ADMIN.label} htmlFor="nomorTerakhir">
            Nomor Terakhir
          </label>
          <input
            id="nomorTerakhir"
            type="number"
            min="0"
            className={`${sah ? ADMIN.input : ADMIN.inputErr} ${FONT.mono}`}
            value={tampil}
            onChange={(e) => setNilai(e.target.value)}
          />
          <p className={ADMIN.hint}>
            Nomor berikutnya:{' '}
            <span className={`${FONT.mono} font-semibold`}>
              {sah ? String(angka + 1).padStart(4, '0') : '-'}
            </span>
          </p>
        </div>
        <button
          type="submit"
          className={`${ADMIN.btnSubmit} sm:mb-[22px]`}
          disabled={sibuk || !sah}
        >
          {sibuk ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </button>
      </form>
    </div>
  );
}
