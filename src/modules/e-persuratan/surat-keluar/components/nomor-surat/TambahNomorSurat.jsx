import React, { useState } from 'react';
import { FaArrowLeft, FaExclamationTriangle, FaHashtag } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import { namaPengguna } from '@/modules/e-persuratan/lpj';
import { showToast } from '@/utils/toastStore';
import { ADMIN } from '@/utils/uiTokens';
import { SEKSI_OPTIONS, formatNomorSurat, prefixKode } from '../../data/nomorSuratConfig';
import { buatNomorRegister } from '../../services/nomorSurat';
import PilihKodeSurat from './PilihKodeSurat';

const hariIni = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Form "Tambah Nomor Surat" (purwarupa admin) dengan kode dari hierarki kode surat. */
export default function TambahNomorSurat({ indeks, lastNumber, onKembali }) {
  const { currentUser, userData } = useAuth();
  const [form, setForm] = useState({ tanggal: hariIni(), seksi: '', perihal: '', tujuan: '' });
  const [kodeIds, setKodeIds] = useState([]);
  const [error, setError] = useState(null);
  const [cekKosong, setCekKosong] = useState(false);
  const [sibuk, setSibuk] = useState(false);

  const ubah = (patch) => setForm((f) => ({ ...f, ...patch }));
  const kodeList = kodeIds.map((id) => indeks.byId.get(id)).filter(Boolean);
  const terakhir = kodeList[kodeList.length - 1];
  const kodeLengkap = !!terakhir && indeks.anakDari(terakhir.id).length === 0;
  const pratinjau = kodeList.length
    ? kodeLengkap
      ? formatNomorSurat(kodeList, lastNumber + 1)
      : `${prefixKode(kodeList)}-…`
    : 'Pilih kode surat';

  const kelasIsian = (nilai) => (cekKosong && !String(nilai).trim() ? ADMIN.inputErr : ADMIN.input);

  const submit = async () => {
    const kurang =
      !form.tanggal || !form.seksi || !form.perihal.trim() || !form.tujuan.trim() || !kodeLengkap;
    if (kurang) {
      setCekKosong(true);
      setError(
        !kodeLengkap && kodeList.length
          ? 'Pilih kode surat sampai tingkat terakhir.'
          : 'Mohon lengkapi field yang wajib diisi.',
      );
      return;
    }
    setError(null);
    setSibuk(true);
    try {
      const nomor = await buatNomorRegister({
        tanggal: form.tanggal,
        seksi: form.seksi,
        perihal: form.perihal.trim(),
        tujuan: form.tujuan.trim(),
        kode: kodeList.map((n) => ({ type: n.type, kode: n.kode || '', name: n.name || '' })),
        uid: currentUser?.uid,
        nama: namaPengguna(currentUser, userData),
      });
      showToast(`Nomor surat ${nomor} berhasil ditambahkan.`);
      onKembali();
    } catch {
      showToast('Gagal membuat nomor surat.', 'error');
      setSibuk(false);
    }
  };

  return (
    <>
      <button type="button" className={ADMIN.crumb} onClick={onKembali}>
        <FaArrowLeft size={11} />
        Kembali ke Daftar
      </button>
      <h1 className={`${ADMIN.h1} mb-5`}>Tambah Nomor Surat</h1>
      {error && (
        <div className={ADMIN.errorBanner} role="alert">
          <FaExclamationTriangle size={12} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      <form
        className="flex flex-col gap-[18px]"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div>
          <label className={ADMIN.label} htmlFor="nsTanggal">
            Tanggal
          </label>
          <input
            id="nsTanggal"
            type="date"
            className={kelasIsian(form.tanggal)}
            value={form.tanggal}
            onChange={(e) => ubah({ tanggal: e.target.value })}
          />
        </div>
        <div>
          <label className={ADMIN.label} htmlFor="nsSeksi">
            Seksi
          </label>
          <select
            id="nsSeksi"
            className={kelasIsian(form.seksi)}
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
          <span className={ADMIN.label}>Kode Surat</span>
          <div className={`${ADMIN.kodeFixed} mb-2.5`}>
            <FaHashtag size={11} className="shrink-0 opacity-60" />
            <span className="break-all">{pratinjau}</span>
          </div>
          <PilihKodeSurat
            indeks={indeks}
            value={kodeIds}
            onChange={setKodeIds}
            error={cekKosong && !kodeLengkap}
          />
          <p className={ADMIN.hint}>
            Nomor urut memakai penghitung yang sama dengan pembuatan surat, jadi tidak ada nomor
            ganda. Nomor pasti muncul setelah data disimpan.
          </p>
        </div>
        <div>
          <label className={ADMIN.label} htmlFor="nsPerihal">
            Perihal
          </label>
          <input
            id="nsPerihal"
            type="text"
            className={kelasIsian(form.perihal)}
            placeholder="Perihal surat"
            value={form.perihal}
            onChange={(e) => ubah({ perihal: e.target.value })}
          />
        </div>
        <div>
          <label className={ADMIN.label} htmlFor="nsTujuan">
            Tujuan
          </label>
          <input
            id="nsTujuan"
            type="text"
            className={kelasIsian(form.tujuan)}
            placeholder="Tujuan surat"
            value={form.tujuan}
            onChange={(e) => ubah({ tujuan: e.target.value })}
          />
        </div>
        <div className="mt-1.5 flex justify-end">
          <button type="submit" className={ADMIN.btnSubmit} disabled={sibuk}>
            {sibuk ? 'Menyimpan...' : 'Tambah Data'}
          </button>
        </div>
      </form>
    </>
  );
}
