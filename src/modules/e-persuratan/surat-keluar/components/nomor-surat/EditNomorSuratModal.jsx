import React, { useState } from 'react';
import { FaHashtag, FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';
import { opsiSeksiDengan, useUnitKerja } from '@/context/useUnitKerja';
import { PANJANG } from '@/utils/batas';
import { pesanGalat } from '@/utils/pesanGalat';
import { showToast } from '@/utils/toastStore';
import { ADMIN } from '@/utils/uiTokens';
import { ubahKeteranganNomor } from '../../services/nomorSurat';

/**
 * Jendela "Edit" register nomor surat: tanggal (dalam tahun yang sama), seksi, perihal, tujuan.
 * Nomor, kode, dan tahun tetap (ditegakkan rules).
 */
export default function EditNomorSuratModal({ row, onClose }) {
  const { pilihanSeksi } = useUnitKerja();
  const { currentUser } = useAuth();
  const [form, setForm] = useState({
    tanggal: row.tanggal || '',
    seksi: row.seksi || '',
    perihal: row.perihal || '',
    tujuan: row.tujuan || '',
  });
  const [cekKosong, setCekKosong] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const ubah = (patch) => setForm((f) => ({ ...f, ...patch }));
  const kelas = (v) => (cekKosong && !String(v).trim() ? ADMIN.inputErr : ADMIN.input);
  const register = row.sumber === 'register';
  const tahunSama = String(form.tanggal).startsWith(`${row.tahun}-`);

  const simpan = async () => {
    const wajib = [form.tanggal, form.perihal, ...(register ? [form.seksi, form.tujuan] : [])];
    if (wajib.some((v) => !String(v).trim()) || !tahunSama) {
      setCekKosong(true);
      if (!tahunSama) showToast(`Tanggal harus di tahun ${row.tahun}.`, 'error');
      return;
    }
    setSibuk(true);
    try {
      await ubahKeteranganNomor(
        row.id,
        {
          tanggal: form.tanggal,
          seksi: form.seksi,
          perihal: form.perihal.trim(),
          tujuan: form.tujuan.trim(),
        },
        currentUser?.uid || '',
      );
      showToast('Perubahan berhasil disimpan.');
      onClose();
    } catch (err) {
      showToast(pesanGalat(err, 'Gagal menyimpan perubahan.'), 'error');
      setSibuk(false);
    }
  };

  return (
    <Modal
      onClose={sibuk ? undefined : onClose}
      widthClass="max-w-[480px]"
      labelledBy="judul-edit-nomor"
    >
      <form
        className={ADMIN.modalBody}
        onSubmit={(e) => {
          e.preventDefault();
          simpan();
        }}
      >
        <div className="flex justify-between items-start gap-3 mb-0.5">
          <h3 id="judul-edit-nomor" className={ADMIN.modalTitle}>
            Edit Nomor Surat
          </h3>
          <button
            type="button"
            className={ADMIN.modalClose}
            aria-label="Tutup"
            onClick={onClose}
            disabled={sibuk}
          >
            <FaTimes size={15} />
          </button>
        </div>
        <p className={ADMIN.modalSub}>Nomor surat tidak berubah; hanya keterangannya.</p>
        <div className="flex flex-col gap-[18px]">
          <div className={ADMIN.kodeFixed}>
            <FaHashtag size={11} className="shrink-0 opacity-60" />
            <span className="break-all">{row.nomor}</span>
          </div>
          <div>
            <label className={ADMIN.label} htmlFor="editTanggal">
              Tanggal
            </label>
            <input
              id="editTanggal"
              type="date"
              min={`${row.tahun}-01-01`}
              max={`${row.tahun}-12-31`}
              className={cekKosong && !tahunSama ? ADMIN.inputErr : kelas(form.tanggal)}
              value={form.tanggal}
              onChange={(e) => ubah({ tanggal: e.target.value })}
            />
          </div>
          <div>
            <label className={ADMIN.label} htmlFor="editSeksi">
              Seksi
            </label>
            <select
              id="editSeksi"
              className={register ? kelas(form.seksi) : ADMIN.input}
              value={form.seksi}
              onChange={(e) => ubah({ seksi: e.target.value })}
            >
              <option value="" disabled={register}>
                {register ? 'Pilih seksi/bagian' : '—'}
              </option>
              {opsiSeksiDengan(pilihanSeksi, form.seksi).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={ADMIN.label} htmlFor="editPerihal">
              Perihal
            </label>
            <input
              id="editPerihal"
              type="text"
              maxLength={PANJANG.perihalSurat}
              className={kelas(form.perihal)}
              value={form.perihal}
              onChange={(e) => ubah({ perihal: e.target.value })}
            />
          </div>
          <div>
            <label className={ADMIN.label} htmlFor="editTujuan">
              Tujuan
            </label>
            <input
              id="editTujuan"
              type="text"
              maxLength={PANJANG.tujuanSurat}
              className={register ? kelas(form.tujuan) : ADMIN.input}
              value={form.tujuan}
              onChange={(e) => ubah({ tujuan: e.target.value })}
            />
          </div>
        </div>
        <div className={ADMIN.modalActions}>
          <button type="button" className={ADMIN.btnGhost} onClick={onClose} disabled={sibuk}>
            Batal
          </button>
          <button type="submit" className={ADMIN.btnSolid} disabled={sibuk}>
            {sibuk ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
