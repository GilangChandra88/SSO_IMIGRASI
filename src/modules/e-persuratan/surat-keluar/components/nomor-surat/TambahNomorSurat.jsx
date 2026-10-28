import React, { useState } from 'react';
import { FaArrowLeft, FaExclamationTriangle, FaHashtag } from 'react-icons/fa';
import { useUnitKerja } from '@/context/useUnitKerja';
import { PANJANG } from '@/utils/batas';
import { tanggalIso } from '@/utils/nilai';
import { pesanGalat } from '@/utils/pesanGalat';
import { showToast } from '@/utils/toastStore';
import { ADMIN } from '@/utils/uiTokens';
import { useMekarDariTombol } from '@/components/animasi';
import { gulirKeGalat } from '../../../gulirPintar';
import { formatNomorSurat, prefixKode } from '../../data/nomorSuratConfig';
import { useNomorTerakhir } from '../../hooks/useNomorSurat';
import { terbitkanNomorSurat } from '../../services/nomorSurat';
import PilihKodeSurat from './PilihKodeSurat';

/**
 * Form "Tambah Nomor Surat" (purwarupa admin) dengan kode dari hierarki kode surat (node aktif).
 * Nomor terbit lewat Function (semua pegawai aktif); nomor urut mulai ulang tiap tahun surat.
 * `onKembali(nomor?)`: nomor terisi bila nomor baru berhasil dibuat.
 */
export default function TambahNomorSurat({ indeks, onKembali }) {
  const { pilihanSeksi } = useUnitKerja();
  // Dibuka dari "Tambah Nomor Surat": form mekar dari tombol itu
  const mekarRef = useMekarDariTombol();
  const [form, setForm] = useState({ tanggal: tanggalIso(), seksi: '', perihal: '', tujuan: '' });
  const [kodeIds, setKodeIds] = useState([]);
  const [error, setError] = useState(null);
  const [cekKosong, setCekKosong] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const tahun = Number(form.tanggal.slice(0, 4)) || null;
  const { nilai: terakhir } = useNomorTerakhir(tahun);

  const ubah = (patch) => setForm((f) => ({ ...f, ...patch }));
  const kodeList = kodeIds.map((id) => indeks.byId.get(id)).filter(Boolean);
  const ujung = kodeList[kodeList.length - 1];
  const kodeLengkap = !!ujung && indeks.anakDari(ujung.id).length === 0;
  const pratinjau = kodeList.length
    ? kodeLengkap
      ? formatNomorSurat(kodeList, terakhir + 1)
      : `${prefixKode(kodeList)}-…`
    : 'Pilih kode surat';

  const kosong = (nilai) => cekKosong && !String(nilai).trim();
  const kelasIsian = (nilai) => (kosong(nilai) ? ADMIN.inputErr : ADMIN.input);

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
      gulirKeGalat(mekarRef.current);
      return;
    }
    setError(null);
    setSibuk(true);
    try {
      const { nomor } = await terbitkanNomorSurat({
        sumber: 'register',
        tanggal: form.tanggal,
        kodeIds,
        seksi: form.seksi,
        perihal: form.perihal.trim(),
        tujuan: form.tujuan.trim(),
      });
      showToast(`Nomor surat ${nomor} berhasil ditambahkan.`);
      onKembali(nomor); // Daftar menggulir ke baris nomor baru
    } catch (err) {
      showToast(pesanGalat(err, 'Gagal membuat nomor surat.'), 'error');
      setSibuk(false);
    }
  };

  return (
    <div ref={mekarRef}>
      <button type="button" className={ADMIN.crumb} onClick={() => onKembali()}>
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
            aria-invalid={kosong(form.tanggal) || undefined}
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
            aria-invalid={kosong(form.seksi) || undefined}
            value={form.seksi}
            onChange={(e) => ubah({ seksi: e.target.value })}
          >
            <option value="" disabled>
              Pilih seksi/bagian
            </option>
            {pilihanSeksi.map((s) => (
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
            Nomor urut memakai penghitung yang sama dengan pembuatan surat dan mulai lagi dari 0001
            setiap tahun. Nomor pasti muncul setelah data disimpan.
          </p>
        </div>
        <div>
          <label className={ADMIN.label} htmlFor="nsPerihal">
            Perihal
          </label>
          <input
            id="nsPerihal"
            type="text"
            maxLength={PANJANG.perihalSurat}
            className={kelasIsian(form.perihal)}
            aria-invalid={kosong(form.perihal) || undefined}
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
            maxLength={PANJANG.tujuanSurat}
            className={kelasIsian(form.tujuan)}
            aria-invalid={kosong(form.tujuan) || undefined}
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
    </div>
  );
}
