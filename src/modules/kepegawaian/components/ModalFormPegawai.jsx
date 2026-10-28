import { useRef, useState } from 'react';
import { FaSave, FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { showToast } from '@/utils/toastStore';
import { T } from '@/utils/uiTokens';
import { PANJANG } from '@/utils/batas';
import { pesanGagalUnggah } from '@/utils/berkasStorage';
import { labelSeksi } from '@/utils/unitKerja';
import {
  STATUS_KEPEGAWAIAN,
  alamatBersih,
  dataBelumLengkap,
  emailBersih,
  emailSah,
  formatWa,
  labelPangkat,
  nipBersih,
  statusAsn,
  tanggalDariNip,
  waBersih,
  waSah,
} from '@/utils/dataPegawai';
import { PEGAWAI_KOSONG, idPegawaiBaru, pesanGalat, simpanPegawai } from '../services/pegawaiDb';
import { hapusFotoPegawai, unggahFotoPegawai } from '../services/fotoPegawai';
import { K } from '../ui/kelas';
import FotoPegawaiEditor from './FotoPegawaiEditor';

const jenisPangkatUntuk = (status) =>
  status === 'pppk' ? 'pppk' : status === 'pns' || status === 'cpns' ? 'pns' : '';

/**
 * Popup tambah/ubah pegawai: identitas, kepangkatan & jabatan, unit kerja, kontak pribadi, dan
 * foto. Judul dan tombol Simpan menempel di atas/bawah, isinya bisa digulir; di HP tampil sebagai
 * lembar dari bawah. Menutup popup saat ada isian yang belum disimpan meminta konfirmasi.
 * Foto diunggah dulu, lalu pegawai + kontak disimpan dalam satu batch, baru foto yang dibuang
 * dihapus. Label seksi disalin dari unit kerja (dipakai modul lain lewat pegawai_ringkas).
 * @param {{ pegawai: object|null, kontak?: object, pangkat: object[], jabatan: object[],
 *   unit: ReturnType<import('@/context/useUnitKerja').useUnitKerja>, uid: string,
 *   onTutup: () => void }} props
 */
export default function ModalFormPegawai({
  pegawai,
  kontak,
  pangkat,
  jabatan,
  unit,
  uid,
  onTutup,
}) {
  const formRef = useRef(null);
  // Isian awal, pembanding "ada perubahan yang belum disimpan"
  const [awal] = useState(() => ({
    form: { ...PEGAWAI_KOSONG, ...(pegawai || {}) },
    kontak: {
      alamat: kontak?.alamat || '',
      emailPribadi: kontak?.emailPribadi || '',
      noWa: kontak?.noWa ? formatWa(kontak.noWa) : '',
    },
  }));
  const [form, setForm] = useState(awal.form);
  const [kontakForm, setKontakForm] = useState(awal.kontak);
  const [konfirmasiTutup, setKonfirmasiTutup] = useState(false);
  const [fotoBaru, setFotoBaru] = useState([]);
  const [fotoDihapus, setFotoDihapus] = useState([]);
  const [galat, setGalat] = useState({});
  const [menyimpan, setMenyimpan] = useState(false);

  const ubah = (isi) => setForm((f) => ({ ...f, ...isi }));
  const ubahKontak = (isi) => setKontakForm((k) => ({ ...k, ...isi }));

  const berubah =
    fotoBaru.length > 0 ||
    fotoDihapus.length > 0 ||
    JSON.stringify(form) !== JSON.stringify(awal.form) ||
    JSON.stringify(kontakForm) !== JSON.stringify(awal.kontak);

  /** Tutup popup; bila ada isian yang belum disimpan, minta konfirmasi dulu. */
  function mintaTutup() {
    if (menyimpan) return;
    if (berubah) setKonfirmasiTutup(true);
    else onTutup();
  }

  const jenisPangkat = jenisPangkatUntuk(form.statusKepegawaian);
  const opsiPangkat = pangkat.filter(
    (p) => p.jenis === jenisPangkat && (p.aktif !== false || p.id === form.pangkatId),
  );
  const opsiJabatan = jabatan.filter((j) => j.aktif !== false || j.id === form.jabatanId);
  const opsiUnit = unit.pohon.filter((u) => u.aktif !== false || u.id === form.unitId);
  const tglNip = tanggalDariNip(form.nip);
  const seksi = form.unitId ? labelSeksi(unit.byId, form.unitId) : '';

  function ubahStatus(status) {
    const p = pangkat.find((x) => x.id === form.pangkatId);
    const cocok = p && p.jenis === jenisPangkatUntuk(status);
    ubah({
      statusKepegawaian: status,
      ...(cocok ? {} : { pangkatId: '', pangkatNama: '', golongan: '' }),
    });
  }

  function ubahNip(v) {
    const nip = nipBersih(v).slice(0, 18);
    const tgl = tanggalDariNip(nip);
    ubah({ nip, ...(tgl && !form.tanggalLahir ? { tanggalLahir: tgl } : {}) });
  }

  function pilihPangkat(id) {
    const p = pangkat.find((x) => x.id === id);
    ubah({ pangkatId: p?.id || '', pangkatNama: p?.nama || '', golongan: p?.golongan || '' });
  }

  function pilihJabatan(id) {
    const j = jabatan.find((x) => x.id === id);
    ubah({ jabatanId: j?.id || '', jabatanNama: j?.nama || '' });
  }

  function periksa(nama, nip, kontakBaru) {
    const g = {};
    if (!nama) g.nama = 'Nama wajib diisi.';
    if (nip && nip.length !== 18) g.nip = 'NIP harus 18 digit angka.';
    if (kontakBaru.emailPribadi && !emailSah(kontakBaru.emailPribadi))
      g.emailPribadi = 'Format e-mail tidak sah.';
    if (kontakBaru.noWa && !waSah(kontakBaru.noWa))
      g.noWa = 'Nomor WA tidak sah (contoh 0812-3456-7890).';
    return g;
  }

  async function simpan(e) {
    e.preventDefault();
    const nama = form.nama.replace(/\s+/g, ' ').trim();
    const nip = nipBersih(form.nip);
    const kontakBaru = {
      alamat: alamatBersih(kontakForm.alamat),
      emailPribadi: emailBersih(kontakForm.emailPribadi),
      noWa: waBersih(kontakForm.noWa),
    };
    setKonfirmasiTutup(false);
    const g = periksa(nama, nip, kontakBaru);
    setGalat(g);
    if (Object.keys(g).length) {
      // Isian yang salah bisa berada di luar layar popup: arahkan ke sana
      requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }
    const kontakBerubah = ['alamat', 'emailPribadi', 'noWa'].some(
      (f) => kontakBaru[f] !== (kontak?.[f] || ''),
    );
    setMenyimpan(true);
    const id = form.id || idPegawaiBaru();
    try {
      const hasil = await Promise.allSettled(fotoBaru.map((f) => unggahFotoPegawai(id, f, uid)));
      const unggahan = hasil.filter((h) => h.status === 'fulfilled').map((h) => h.value);
      const gagal = hasil.find((h) => h.status === 'rejected');
      if (gagal) {
        unggahan.forEach((p) => hapusFotoPegawai(p).catch(() => {}));
        setGalat({
          umum: pesanGagalUnggah(
            gagal.reason,
            'Foto gagal diproses atau diunggah. Coba foto lain.',
          ),
        });
        return;
      }
      try {
        await simpanPegawai(
          { ...form, nama, nip, seksi, fotoPaths: [...form.fotoPaths, ...unggahan] },
          id,
          uid,
          { baru: !form.id, kontak: kontakBerubah ? kontakBaru : null, kontakAda: !!kontak },
        );
      } catch (err) {
        unggahan.forEach((p) => hapusFotoPegawai(p).catch(() => {}));
        throw err;
      }
      fotoDihapus.forEach((p) => hapusFotoPegawai(p).catch(() => {}));
      showToast(form.id ? 'Data pegawai diperbarui.' : 'Pegawai ditambahkan.');
      onTutup();
    } catch (err) {
      setGalat({ umum: pesanGalat(err, 'Data pegawai gagal disimpan.') });
    } finally {
      setMenyimpan(false);
    }
  }

  const kurang = dataBelumLengkap(form, {
    alamat: kontakForm.alamat.trim(),
    emailPribadi: kontakForm.emailPribadi.trim(),
    noWa: kontakForm.noWa.trim(),
  });
  const pesanGalatIsian = (f) =>
    galat[f] && <p className="text-[11px] text-rose-600 dark:text-rose-300 mt-1">{galat[f]}</p>;

  return (
    <Modal
      onClose={mintaTutup}
      labelledBy="judul-form-pegawai"
      widthClass="max-w-4xl"
      lembar
      tinggiTetap
    >
      <form ref={formRef} onSubmit={simpan} noValidate>
        <div
          className={`sticky top-0 z-10 ${T.surface} border-b ${T.border} px-4 sm:px-6 py-4 flex items-start justify-between gap-3`}
        >
          <div className="min-w-0">
            <h2
              id="judul-form-pegawai"
              className="font-bold text-lg text-slate-800 dark:text-slate-100"
            >
              {form.id ? 'Ubah Data Pegawai' : 'Tambah Pegawai'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {form.id
                ? pegawai?.nama
                : 'Isi sesuai SK. Kolom yang belum diketahui boleh dikosongkan dulu.'}
            </p>
          </div>
          <button
            type="button"
            onClick={mintaTutup}
            disabled={menyimpan}
            aria-label="Tutup"
            className={K.tombolIkon}
          >
            <FaTimes />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-5 space-y-6">
          <section>
            <h3 className={K.judulBagian}>Identitas</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="f-nama" className={K.label}>
                  NAMA LENGKAP (DENGAN GELAR SESUAI SK)
                </label>
                <input
                  id="f-nama"
                  maxLength={PANJANG.namaPegawai}
                  value={form.nama}
                  aria-invalid={!!galat.nama || undefined}
                  onChange={(e) => ubah({ nama: e.target.value })}
                  className={K.masukan}
                />
                {pesanGalatIsian('nama')}
              </div>
              <div>
                <label htmlFor="f-status" className={K.label}>
                  STATUS KEPEGAWAIAN
                </label>
                <select
                  id="f-status"
                  value={form.statusKepegawaian}
                  onChange={(e) => ubahStatus(e.target.value)}
                  className={K.masukan}
                >
                  <option value="">-- Pilih --</option>
                  {STATUS_KEPEGAWAIAN.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="f-nip" className={K.label}>
                  NIP{' '}
                  {statusAsn(form.statusKepegawaian) ? '(18 DIGIT)' : '(KOSONGKAN BILA NON-ASN)'}
                </label>
                <input
                  id="f-nip"
                  inputMode="numeric"
                  value={form.nip}
                  aria-invalid={!!galat.nip || undefined}
                  onChange={(e) => ubahNip(e.target.value)}
                  className={`${K.masukan} font-mono`}
                />
                {pesanGalatIsian('nip')}
              </div>
              <div>
                <label htmlFor="f-lahir" className={K.label}>
                  TANGGAL LAHIR
                </label>
                <input
                  id="f-lahir"
                  type="date"
                  value={form.tanggalLahir}
                  onChange={(e) => ubah({ tanggalLahir: e.target.value })}
                  className={`${K.masukan} dark:[color-scheme:dark]`}
                />
                {tglNip && form.tanggalLahir && tglNip !== form.tanggalLahir && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1">
                    Berbeda dengan tanggal di NIP.{' '}
                    <button
                      type="button"
                      onClick={() => ubah({ tanggalLahir: tglNip })}
                      className="underline font-semibold"
                    >
                      Pakai tanggal NIP
                    </button>
                  </p>
                )}
              </div>
            </div>
          </section>

          <section>
            <h3 className={K.judulBagian}>Kepangkatan, jabatan & unit kerja</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="f-pangkat" className={K.label}>
                  PANGKAT/GOLONGAN
                </label>
                <select
                  id="f-pangkat"
                  value={form.pangkatId}
                  disabled={!jenisPangkat}
                  onChange={(e) => pilihPangkat(e.target.value)}
                  className={K.masukan}
                >
                  <option value="">
                    {jenisPangkat ? '-- Pilih --' : 'Pilih status kepegawaian ASN dulu'}
                  </option>
                  {opsiPangkat.map((p) => (
                    <option key={p.id} value={p.id}>
                      {labelPangkat(p.nama, p.golongan)}
                    </option>
                  ))}
                </select>
                {jenisPangkat && !opsiPangkat.length && (
                  <p className={K.bantuan}>Master pangkat masih kosong (tab Master Pangkat).</p>
                )}
              </div>
              <div>
                <label htmlFor="f-jabatan" className={K.label}>
                  JABATAN
                </label>
                <select
                  id="f-jabatan"
                  value={form.jabatanId}
                  onChange={(e) => pilihJabatan(e.target.value)}
                  className={K.masukan}
                >
                  <option value="">-- Pilih --</option>
                  {opsiJabatan.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.nama}
                      {j.eselon ? ` (Eselon ${j.eselon})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="f-unit" className={K.label}>
                  UNIT KERJA
                </label>
                <select
                  id="f-unit"
                  value={form.unitId}
                  onChange={(e) => ubah({ unitId: e.target.value })}
                  className={K.masukan}
                >
                  <option value="">-- Pilih --</option>
                  {opsiUnit.map((u) => (
                    <option key={u.id} value={u.id}>
                      {'\u2003'.repeat(u.kedalaman)}
                      {u.nama}
                    </option>
                  ))}
                </select>
                <p className={K.bantuan}>
                  {opsiUnit.length
                    ? seksi
                      ? `Tercatat di modul lain sebagai seksi "${seksi}".`
                      : 'Seksi pegawai di modul lain mengikuti unit ini.'
                    : 'Struktur unit kerja masih kosong (tab Unit Kerja).'}
                </p>
              </div>
            </div>
          </section>

          <section>
            <h3 className={K.judulBagian}>Kontak pribadi (hanya Kepegawaian & pegawai ybs.)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label htmlFor="f-alamat" className={K.label}>
                  ALAMAT
                </label>
                <textarea
                  id="f-alamat"
                  rows={2}
                  maxLength={PANJANG.alamat}
                  value={kontakForm.alamat}
                  onChange={(e) => ubahKontak({ alamat: e.target.value })}
                  className={K.masukan}
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="f-email" className={K.label}>
                  E-MAIL PRIBADI
                </label>
                <input
                  id="f-email"
                  type="email"
                  inputMode="email"
                  maxLength={PANJANG.emailPribadi}
                  value={kontakForm.emailPribadi}
                  aria-invalid={!!galat.emailPribadi || undefined}
                  onChange={(e) => ubahKontak({ emailPribadi: e.target.value })}
                  className={K.masukan}
                />
                {pesanGalatIsian('emailPribadi')}
              </div>
              <div>
                <label htmlFor="f-wa" className={K.label}>
                  NO. WHATSAPP
                </label>
                <input
                  id="f-wa"
                  type="tel"
                  inputMode="tel"
                  maxLength={20}
                  placeholder="0812-3456-7890"
                  value={kontakForm.noWa}
                  aria-invalid={!!galat.noWa || undefined}
                  onChange={(e) => ubahKontak({ noWa: e.target.value })}
                  className={`${K.masukan} font-mono`}
                />
                {pesanGalatIsian('noWa')}
              </div>
            </div>
          </section>

          <FotoPegawaiEditor
            tersimpan={form.fotoPaths}
            baru={fotoBaru}
            onBuangTersimpan={(path) => {
              ubah({ fotoPaths: form.fotoPaths.filter((p) => p !== path) });
              setFotoDihapus((d) => [...d, path]);
            }}
            onTambah={(files) => setFotoBaru((d) => [...d, ...files])}
            onBuangBaru={(i) => setFotoBaru((d) => d.filter((_, j) => j !== i))}
            disabled={menyimpan}
          />

          <p className="text-[11px] text-slate-400">
            Akun login, peran, dan status aktif diatur dari tombol di daftar pegawai.
          </p>
        </div>

        <div
          className={`sticky bottom-0 z-10 ${T.surface} border-t ${T.border} px-4 sm:px-6 py-3 space-y-2`}
        >
          {galat.umum && (
            <p role="alert" className={K.galat}>
              {galat.umum}
            </p>
          )}
          {konfirmasiTutup ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                Ada perubahan yang belum disimpan. Tutup tanpa menyimpan?
              </p>
              <div className="flex gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setKonfirmasiTutup(false)}
                  className={K.tombolKedua}
                >
                  Lanjut mengisi
                </button>
                <button
                  type="button"
                  onClick={onTutup}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Tutup tanpa menyimpan
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap justify-between items-center gap-3">
              <p
                className={`text-[11px] max-w-xl ${kurang.length ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}
              >
                {kurang.length
                  ? `Belum lengkap: ${kurang.join(', ')}. Tetap bisa disimpan.`
                  : 'Data lengkap.'}
              </p>
              <div className="flex gap-2 ml-auto">
                <button
                  type="button"
                  onClick={mintaTutup}
                  disabled={menyimpan}
                  className={K.tombolBatal}
                >
                  Batal
                </button>
                <button type="submit" disabled={menyimpan} className={`${K.tombolUtama} px-6`}>
                  <FaSave />{' '}
                  {menyimpan ? (fotoBaru.length ? 'Mengunggah foto…' : 'Menyimpan…') : 'Simpan'}
                </button>
              </div>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
