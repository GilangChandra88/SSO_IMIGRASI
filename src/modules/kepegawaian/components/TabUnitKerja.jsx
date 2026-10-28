import { useMemo, useState } from 'react';
import { FaPen, FaPlus, FaSave, FaSitemap, FaToggleOff, FaToggleOn } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { showToast } from '@/utils/toastStore';
import { PANJANG } from '@/utils/batas';
import { JENIS_UNIT, labelJenisUnit, labelSeksi, tingkatUnit } from '@/utils/unitKerja';
import { perbaruiSeksiPegawai, pesanGalat } from '../services/pegawaiDb';
import { isiStrukturAwal, simpanUnit } from '../services/unitDb';
import { STRUKTUR_AWAL } from '../data/masterBaku';
import { K } from '../ui/kelas';

const INDEN = ['', 'pl-6 sm:pl-8', 'pl-12 sm:pl-16'];
const WARNA_JENIS = {
  kantor: K.lencanaInfo,
  subbagian: K.lencanaOk,
  seksi: K.lencanaOk,
  urusan: K.lencanaNetral,
  subseksi: K.lencanaNetral,
};
const POLA_KODE = /^[A-Z0-9][A-Z0-9-]{0,19}$/;

/**
 * Struktur unit kerja (kantor → subbagian/seksi → urusan/subseksi), bisa diubah Kepegawaian.
 * Unit tidak dihapus, tetapi dinonaktifkan; jenis unit tetap setelah dibuat. Setelah nama,
 * singkatan, atau induk berubah, label seksi pegawai di unit itu ikut diperbarui.
 * @param {{ unit: ReturnType<import('@/context/useUnitKerja').useUnitKerja>, pegawai: object[],
 *   uid: string, bolehUbah: boolean, superAdmin: boolean }} props
 */
export default function TabUnitKerja({ unit, pegawai, uid, bolehUbah, superAdmin }) {
  const [form, setForm] = useState(null); // { id?, kode, nama, singkatan, jenis, indukId, urutan }
  const [galat, setGalat] = useState('');
  const [proses, setProses] = useState(false);

  // Jumlah pegawai aktif per unit, termasuk anak-anaknya
  const jumlahPegawai = useMemo(() => {
    const hitung = {};
    pegawai
      .filter((p) => p.aktif !== false && p.unitId)
      .forEach((p) => {
        let u = unit.byId[p.unitId];
        for (let i = 0; u && i < 4; i++) {
          hitung[u.id] = (hitung[u.id] || 0) + 1;
          u = unit.byId[u.indukId];
        }
      });
    return hitung;
  }, [pegawai, unit.byId]);

  const anakAktif = (id) => unit.semua.some((u) => u.indukId === id && u.aktif !== false);

  function buka(u, induk) {
    setGalat('');
    if (u) {
      setForm({ ...u, singkatan: u.singkatan || '' });
      return;
    }
    const jenis = induk
      ? induk.jenis === 'kantor'
        ? 'seksi'
        : induk.jenis === 'subbagian'
          ? 'urusan'
          : 'subseksi'
      : unit.semua.some((x) => x.jenis === 'kantor')
        ? 'seksi'
        : 'kantor';
    const saudara = unit.semua.filter((x) => x.indukId === (induk?.id || ''));
    setForm({
      kode: '',
      nama: '',
      singkatan: '',
      jenis,
      indukId: induk?.id || unit.semua.find((x) => x.jenis === 'kantor')?.id || '',
      urutan: (Math.max(0, ...saudara.map((x) => x.urutan || 0)) || 0) + 10,
    });
  }

  /** Perbarui label seksi pegawai sesuai struktur terbaru (setelah unit disimpan). */
  async function segarkanSeksi(unitBaru) {
    const byId = { ...unit.byId, [unitBaru.id]: unitBaru };
    const perubahan = pegawai
      .filter((p) => p.unitId && (superAdmin || !(p.peran || []).includes('superadmin')))
      .map((p) => ({ id: p.id, seksi: labelSeksi(byId, p.unitId), lama: p.seksi || '' }))
      .filter((p) => p.seksi !== p.lama);
    if (perubahan.length) await perbaruiSeksiPegawai(perubahan, uid);
    return perubahan.length;
  }

  async function simpan(e) {
    e.preventDefault();
    const kode = form.kode.trim().toUpperCase();
    if (!POLA_KODE.test(kode))
      return setGalat('Kode 1–20 karakter: huruf besar, angka, atau tanda hubung (mis. SUB-TI).');
    if (unit.semua.some((u) => u.id !== form.id && u.kode === kode))
      return setGalat(`Kode ${kode} sudah dipakai unit lain.`);
    if (!form.nama.trim()) return setGalat('Nama unit wajib diisi.');
    if (!form.singkatan.trim())
      return setGalat('Label pendek wajib diisi (tampil sebagai seksi di modul lain).');
    if (form.jenis !== 'kantor' && !form.indukId) return setGalat('Pilih unit induk.');
    setGalat('');
    setProses(true);
    try {
      const id = await simpanUnit({ ...form, kode }, form.id, uid);
      const diubah = await segarkanSeksi({
        ...form,
        id,
        kode,
        nama: form.nama.trim(),
        singkatan: form.singkatan.trim(),
        indukId: form.jenis === 'kantor' ? '' : form.indukId,
      });
      showToast(
        `Unit ${kode} disimpan.${diubah ? ` Label seksi ${diubah} pegawai diperbarui.` : ''}`,
      );
      setForm(null);
    } catch (err) {
      setGalat(pesanGalat(err, 'Unit kerja gagal disimpan.'));
    } finally {
      setProses(false);
    }
  }

  async function aturAktif(u) {
    const nonaktifkan = u.aktif !== false;
    if (nonaktifkan && anakAktif(u.id)) {
      showToast('Nonaktifkan dulu sub-unit di bawahnya.', 'error');
      return;
    }
    try {
      await simpanUnit({ ...u, aktif: !nonaktifkan }, u.id, uid);
      const sisa = jumlahPegawai[u.id] || 0;
      showToast(
        nonaktifkan
          ? `${u.nama} dinonaktifkan.${sisa ? ` ${sisa} pegawai masih tercatat di unit ini.` : ''}`
          : `${u.nama} diaktifkan kembali.`,
      );
    } catch (err) {
      showToast(pesanGalat(err, 'Status unit gagal diubah.'), 'error');
    }
  }

  async function isiAwal() {
    setProses(true);
    try {
      const n = await isiStrukturAwal(uid);
      showToast(`${n} unit kerja ditambahkan. Silakan sesuaikan bila perlu.`);
    } catch (err) {
      showToast(pesanGalat(err, 'Struktur awal gagal ditambahkan.'), 'error');
    } finally {
      setProses(false);
    }
  }

  const opsiInduk = form
    ? unit.pohon.filter(
        (u) =>
          tingkatUnit(u.jenis) === tingkatUnit(form.jenis) - 1 &&
          (u.aktif !== false || u.id === form.indukId),
      )
    : [];

  return (
    <div className={K.kartu}>
      <div className={K.kepalaKartu}>
        <div>
          <h2 className={K.judulKartu}>Struktur Unit Kerja ({unit.semua.length})</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Dipakai untuk unit kerja pegawai dan pilihan "Seksi / Bagian" di LPJ, Nomor Surat, dan
            Inventory.
          </p>
        </div>
        {bolehUbah && (
          <div className="flex flex-wrap gap-2">
            {!unit.memuat && unit.semua.length === 0 && (
              <button type="button" onClick={isiAwal} disabled={proses} className={K.tombolKedua}>
                <FaSitemap /> Isi struktur awal ({STRUKTUR_AWAL.length} unit)
              </button>
            )}
            <button type="button" onClick={() => buka(null)} className={K.tombolUtama}>
              <FaPlus /> Tambah Unit
            </button>
          </div>
        )}
      </div>

      {unit.memuat ? (
        <p className="p-8 text-center text-sm text-slate-400">Memuat unit kerja…</p>
      ) : unit.pohon.length === 0 ? (
        <p className="p-8 text-center text-sm text-slate-400">
          Belum ada unit kerja. Pakai "Isi struktur awal" untuk memulai dari struktur kantor, lalu
          sesuaikan.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {unit.pohon.map((u) => {
            const nonaktif = u.aktif === false;
            return (
              <li
                key={u.id}
                className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 ${nonaktif ? 'opacity-60' : ''}`}
              >
                <div className={`flex-1 min-w-[14rem] ${INDEN[Math.min(u.kedalaman, 2)]}`}>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`${K.lencana} ${WARNA_JENIS[u.jenis] || K.lencanaNetral}`}>
                      {labelJenisUnit(u.jenis)}
                    </span>
                    <span
                      className={`font-semibold text-sm text-slate-800 dark:text-slate-100 ${nonaktif ? 'line-through' : ''}`}
                    >
                      {u.nama}
                    </span>
                    {nonaktif && (
                      <span className={`${K.lencana} ${K.lencanaBahaya}`}>Nonaktif</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    <span className="font-mono">{u.kode}</span>
                    {u.singkatan && <> · label "{u.singkatan}"</>} · {jumlahPegawai[u.id] || 0}{' '}
                    pegawai
                  </div>
                </div>
                {bolehUbah && (
                  <div className="flex items-center gap-1 ml-auto">
                    {tingkatUnit(u.jenis) < 2 && !nonaktif && (
                      <button
                        type="button"
                        onClick={() => buka(null, u)}
                        title="Tambah sub-unit"
                        aria-label={`Tambah sub-unit di ${u.nama}`}
                        className={K.tombolIkon}
                      >
                        <FaPlus size={12} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => buka(u)}
                      title="Ubah"
                      aria-label={`Ubah ${u.nama}`}
                      className={K.tombolIkon}
                    >
                      <FaPen size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => aturAktif(u)}
                      title={nonaktif ? 'Aktifkan' : 'Nonaktifkan'}
                      aria-label={`${nonaktif ? 'Aktifkan' : 'Nonaktifkan'} ${u.nama}`}
                      className={`p-2 rounded-lg ${nonaktif ? 'text-slate-400 hover:text-emerald-600' : 'text-emerald-600 hover:text-slate-500'}`}
                    >
                      {nonaktif ? <FaToggleOff size={18} /> : <FaToggleOn size={18} />}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {form && (
        <Modal
          onClose={proses ? () => {} : () => setForm(null)}
          labelledBy="judul-form-unit"
          widthClass="max-w-lg"
          lembar
        >
          <form onSubmit={simpan} noValidate className="p-5 space-y-4">
            <h2
              id="judul-form-unit"
              className="font-bold text-lg text-slate-800 dark:text-slate-100"
            >
              {form.id ? 'Ubah Unit Kerja' : 'Tambah Unit Kerja'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="u-jenis" className={K.label}>
                  JENIS UNIT
                </label>
                <select
                  id="u-jenis"
                  value={form.jenis}
                  disabled={!!form.id}
                  onChange={(e) => {
                    const jenis = e.target.value;
                    const induk = unit.byId[form.indukId];
                    const cocok = induk && tingkatUnit(induk.jenis) === tingkatUnit(jenis) - 1;
                    setForm({ ...form, jenis, indukId: cocok ? form.indukId : '' });
                  }}
                  className={K.masukan}
                >
                  {JENIS_UNIT.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.label}
                    </option>
                  ))}
                </select>
                {form.id && <p className={K.bantuan}>Jenis tidak bisa diubah setelah dibuat.</p>}
              </div>
              <div>
                <label htmlFor="u-kode" className={K.label}>
                  KODE
                </label>
                <input
                  id="u-kode"
                  maxLength={PANJANG.kodeUnit}
                  value={form.kode}
                  placeholder="mis. SUB-TI"
                  onChange={(e) => setForm({ ...form, kode: e.target.value.toUpperCase() })}
                  className={`${K.masukan} font-mono uppercase`}
                />
              </div>
              {form.jenis !== 'kantor' && (
                <div className="sm:col-span-2">
                  <label htmlFor="u-induk" className={K.label}>
                    UNIT INDUK
                  </label>
                  <select
                    id="u-induk"
                    value={form.indukId}
                    onChange={(e) => setForm({ ...form, indukId: e.target.value })}
                    className={K.masukan}
                  >
                    <option value="">-- Pilih --</option>
                    {opsiInduk.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nama}
                      </option>
                    ))}
                  </select>
                  {!opsiInduk.length && (
                    <p className={K.bantuan}>
                      Belum ada unit satu tingkat di atasnya untuk jenis ini.
                    </p>
                  )}
                </div>
              )}
              <div className="sm:col-span-2">
                <label htmlFor="u-nama" className={K.label}>
                  NAMA UNIT
                </label>
                <input
                  id="u-nama"
                  maxLength={PANJANG.namaMaster}
                  value={form.nama}
                  placeholder="mis. Subseksi Teknologi Informasi Keimigrasian"
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  className={K.masukan}
                />
              </div>
              <div>
                <label htmlFor="u-singkatan" className={K.label}>
                  LABEL PENDEK
                </label>
                <input
                  id="u-singkatan"
                  maxLength={PANJANG.singkatanUnit}
                  value={form.singkatan}
                  placeholder="mis. Tikim"
                  onChange={(e) => setForm({ ...form, singkatan: e.target.value })}
                  className={K.masukan}
                />
                <p className={K.bantuan}>Tampil sebagai seksi di LPJ, Nomor Surat, Inventory.</p>
              </div>
              <div>
                <label htmlFor="u-urutan" className={K.label}>
                  URUTAN
                </label>
                <input
                  id="u-urutan"
                  type="number"
                  min={0}
                  max={9999}
                  value={form.urutan}
                  onChange={(e) => setForm({ ...form, urutan: e.target.value })}
                  className={K.masukan}
                />
              </div>
            </div>
            {galat && (
              <p role="alert" className={K.galat}>
                {galat}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setForm(null)}
                disabled={proses}
                className={K.tombolBatal}
              >
                Batal
              </button>
              <button type="submit" disabled={proses} className={K.tombolUtama}>
                <FaSave /> {proses ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
