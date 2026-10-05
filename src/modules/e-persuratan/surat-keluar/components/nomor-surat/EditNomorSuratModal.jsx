import React, { useState } from 'react';
import { FaHashtag, FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { showToast } from '@/utils/toastStore';
import { ADMIN } from '@/utils/uiTokens';
import { SEKSI_OPTIONS } from '../../data/nomorSuratConfig';
import { ubahNomorRegister } from '../../services/nomorSurat';

/** Jendela "Edit" register nomor surat: tanggal, seksi, perihal, tujuan (nomor tetap). */
export default function EditNomorSuratModal({ row, onClose }) {
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

  const simpan = async () => {
    if (!form.tanggal || !form.seksi || !form.perihal.trim() || !form.tujuan.trim()) {
      setCekKosong(true);
      return;
    }
    setSibuk(true);
    try {
      await ubahNomorRegister(row.id, {
        ...form,
        perihal: form.perihal.trim(),
        tujuan: form.tujuan.trim(),
      });
      showToast('Perubahan berhasil disimpan.');
      onClose();
    } catch {
      showToast('Gagal menyimpan perubahan.', 'error');
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
              className={kelas(form.tanggal)}
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
              className={kelas(form.seksi)}
              value={form.seksi}
              onChange={(e) => ubah({ seksi: e.target.value })}
            >
              <option value="" disabled>
                Pilih seksi/bagian
              </option>
              {SEKSI_OPTIONS.map((s) => (
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
              className={kelas(form.tujuan)}
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
