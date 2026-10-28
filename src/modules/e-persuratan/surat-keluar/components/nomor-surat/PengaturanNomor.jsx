import React, { useState } from 'react';
import { PANJANG } from '@/utils/batas';
import { tahunIni } from '@/utils/nilai';
import { pesanGalat } from '@/utils/pesanGalat';
import { showToast } from '@/utils/toastStore';
import { ADMIN, FONT, T } from '@/utils/uiTokens';
import { useNomorTerakhir } from '../../hooks/useNomorSurat';
import { aturPenghitungSurat } from '../../services/nomorSurat';

/**
 * Pengaturan nomor urut terakhir per tahun (`sistem_penghitung/surat_{tahun}`, Keuangan), dipakai
 * bersama form surat. Diubah lewat Function `aturPenghitung`: wajib alasan, dicatat di log, dan
 * tidak bisa di bawah nomor yang sudah terbit di tahun itu.
 */
export default function PengaturanNomor() {
  const kini = tahunIni();
  const [tahun, setTahun] = useState(kini);
  const { nilai: terakhir, memuat } = useNomorTerakhir(tahun);
  const [nilai, setNilai] = useState(null); // null = ikuti data Firestore
  const [alasan, setAlasan] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const tampil = nilai ?? String(terakhir);
  const angka = /^\d+$/.test(tampil) ? Number(tampil) : NaN;
  const sah = Number.isInteger(angka) && angka >= 0 && angka <= 999999;
  const berubah = sah && angka !== terakhir;

  const simpan = async () => {
    if (!berubah) return;
    if (!alasan.trim()) {
      showToast('Alasan perubahan wajib diisi.', 'error');
      return;
    }
    setSibuk(true);
    try {
      await aturPenghitungSurat(tahun, angka, alasan.trim());
      setNilai(null);
      setAlasan('');
      showToast(`Nomor surat terakhir tahun ${tahun} berhasil disimpan.`);
    } catch (err) {
      showToast(pesanGalat(err, 'Gagal menyimpan pengaturan.'), 'error');
    } finally {
      setSibuk(false);
    }
  };

  return (
    <div className={`max-w-[640px] border rounded-[14px] p-4 sm:p-5 ${T.border}`}>
      <h2 className={ADMIN.modalTitle}>Pengaturan Nomor Surat</h2>
      <p className={ADMIN.modalSub}>
        Nomor urut surat dimulai lagi dari 0001 setiap tahun. Isi nomor urut terakhir yang sudah
        dikeluarkan sistem sebelumnya di tahun itu; penomoran lewat form surat maupun Daftar Nomor
        melanjutkan dari angka tersebut. Nomor terakhir tidak bisa diturunkan di bawah nomor yang
        sudah terbit.
      </p>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          simpan();
        }}
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="sm:w-[140px]">
            <label className={ADMIN.label} htmlFor="tahunNomor">
              Tahun
            </label>
            <select
              id="tahunNomor"
              className={`${ADMIN.input} ${FONT.mono}`}
              value={tahun}
              onChange={(e) => {
                setTahun(Number(e.target.value));
                setNilai(null);
              }}
            >
              {[kini - 1, kini, kini + 1].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className={ADMIN.label} htmlFor="nomorTerakhir">
              Nomor Terakhir
            </label>
            <input
              id="nomorTerakhir"
              type="number"
              min="0"
              max="999999"
              disabled={memuat}
              className={`${sah ? ADMIN.input : ADMIN.inputErr} ${FONT.mono}`}
              value={memuat ? '' : tampil}
              onChange={(e) => setNilai(e.target.value)}
            />
            <p className={ADMIN.hint}>
              Nomor berikutnya:{' '}
              <span className={`${FONT.mono} font-semibold`}>
                {sah ? String(angka + 1).padStart(4, '0') : '-'}
              </span>
            </p>
          </div>
        </div>
        {berubah && (
          <div>
            <label className={ADMIN.label} htmlFor="alasanNomor">
              Alasan perubahan
            </label>
            <input
              id="alasanNomor"
              type="text"
              maxLength={PANJANG.alasanBatal}
              className={ADMIN.input}
              placeholder="Mis. melanjutkan nomor dari buku agenda"
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
            />
          </div>
        )}
        <div className="flex justify-end">
          <button type="submit" className={ADMIN.btnSubmit} disabled={sibuk || !berubah}>
            {sibuk ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </form>
    </div>
  );
}
