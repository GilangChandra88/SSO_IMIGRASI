import { useMemo, useState } from 'react';
import { FaPlus, FaSave, FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { showToast } from '@/utils/toastStore';
import { tanggalIso } from '@/utils/nilai';
import {
  JENIS_PEJABAT,
  berlakuPada,
  penetapanPada,
  usePenetapanPejabat,
} from '@/context/usePejabat';
import { pesanGalat } from '../services/pegawaiDb';
import { akhiriPejabat, sehariSebelum, tetapkanPejabat } from '../services/pejabatDb';
import { K } from '../ui/kelas';
import CariPegawai from './CariPegawai';

const tgl = (iso) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return '';
  const [t, b, h] = iso.split('-').map(Number);
  return new Date(t, b - 1, h).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};
const rentang = (p) =>
  `${tgl(p.berlakuMulai)} – ${p.berlakuSampai ? tgl(p.berlakuSampai) : 'sekarang'}`;

// Dokumen yang memakai tiap jabatan
const PEMAKAIAN = {
  ppk: 'Tanda tangan PPK di SPD, dokumen LPJ, Lembar Verifikasi, dan form surat.',
  bendahara: 'Tanda tangan Bendahara di dokumen LPJ dan form surat.',
  kpa: 'Catatan penetapan (belum dipakai di dokumen).',
  kepala: 'Pilihan cepat penandatangan Surat Perintah.',
  plt: 'Pilihan cepat penandatangan Surat Perintah.',
  plh: 'Pilihan cepat penandatangan Surat Perintah.',
};

const WARNA_STATUS = { berlaku: K.lencanaOk, datang: K.lencanaInfo, lalu: K.lencanaNetral };

function statusPenetapan(p, kini, hariIni) {
  if (p.id === kini?.id) return ['berlaku', 'Berlaku'];
  if (p.berlakuMulai > hariIni) return ['datang', 'Akan datang'];
  if (berlakuPada(p, hariIni)) return ['lalu', 'Digantikan'];
  return ['lalu', 'Selesai'];
}

/**
 * Pejabat penandatangan (PPK, Bendahara, KPA, Kepala, PLT, PLH) dengan masa berlaku. PPK &
 * Bendahara dipakai otomatis di dokumen LPJ dan form surat sesuai tanggal dokumennya; Kepala/PLT/PLH
 * menjadi pilihan cepat penandatangan Surat Perintah. Penetapan tidak diubah atau dihapus (rules);
 * jabatan diakhiri lewat tanggal akhir. Menetapkan pejabat baru otomatis mengakhiri penetapan jenis
 * yang sama yang masih berjalan, sehari sebelum tanggal mulai baru.
 */
export default function TabPejabat({ pegawai, uid, bolehUbah }) {
  const { daftar, memuat } = usePenetapanPejabat();
  const [form, setForm] = useState(null); // null = popup tertutup
  const [galatForm, setGalatForm] = useState('');
  const [proses, setProses] = useState(false);
  const [akhiri, setAkhiri] = useState(null); // { penetapan, tanggal }

  const hariIni = tanggalIso();
  const pegawaiById = useMemo(() => Object.fromEntries(pegawai.map((p) => [p.id, p])), [pegawai]);
  const pilihanPegawai = pegawai.filter((p) => p.aktif !== false);
  const nama = (p) => pegawaiById[p.pegawaiId]?.nama || '(pegawai tidak ditemukan)';

  // Penetapan jenis yang sama yang masih terbuka dan dimulai sebelum tanggal mulai baru
  const diakhiri =
    form?.jenis && form.berlakuMulai
      ? daftar.filter(
          (p) => p.jenis === form.jenis && !p.berlakuSampai && p.berlakuMulai < form.berlakuMulai,
        )
      : [];

  function buka() {
    setGalatForm('');
    setForm({ jenis: '', pegawaiId: '', berlakuMulai: hariIni, berlakuSampai: '' });
  }

  async function simpan(e) {
    e.preventDefault();
    if (!form.jenis || !form.pegawaiId || !form.berlakuMulai)
      return setGalatForm('Jabatan, pegawai, dan tanggal mulai wajib diisi.');
    if (form.berlakuSampai && form.berlakuSampai < form.berlakuMulai)
      return setGalatForm('Tanggal akhir tidak boleh sebelum tanggal mulai.');
    setGalatForm('');
    setProses(true);
    try {
      const sampai = sehariSebelum(form.berlakuMulai);
      await tetapkanPejabat(
        form,
        diakhiri.map((p) => ({ id: p.id, berlakuSampai: sampai })),
        uid,
      );
      showToast('Pejabat ditetapkan.');
      setForm(null);
    } catch (err) {
      setGalatForm(pesanGalat(err, 'Penetapan pejabat gagal disimpan.'));
    } finally {
      setProses(false);
    }
  }

  async function simpanAkhir(e) {
    e.preventDefault();
    const { penetapan, tanggal } = akhiri;
    if (!tanggal || tanggal < penetapan.berlakuMulai) return;
    setProses(true);
    try {
      await akhiriPejabat(penetapan.id, tanggal, uid);
      showToast('Masa jabatan diakhiri.');
      setAkhiri(null);
    } catch (err) {
      showToast(pesanGalat(err, 'Tanggal akhir gagal disimpan.'), 'error');
    } finally {
      setProses(false);
    }
  }

  const tombolAkhiri = (p) =>
    bolehUbah &&
    !p.berlakuSampai && (
      <button
        type="button"
        onClick={() =>
          setAkhiri({
            penetapan: p,
            tanggal: p.berlakuMulai > hariIni ? p.berlakuMulai : hariIni,
          })
        }
        className={`${K.tombolKecilBahaya} shrink-0`}
      >
        Akhiri
      </button>
    );

  const kepalaPopup = (id, judul, tutup) => (
    <div className="flex items-start justify-between gap-3">
      <h2 id={id} className={K.modalJudul}>
        {judul}
      </h2>
      <button
        type="button"
        onClick={tutup}
        disabled={proses}
        aria-label="Tutup"
        className={K.modalTutup}
      >
        <FaTimes />
      </button>
    </div>
  );

  return (
    <div>
      <div className={K.kepala}>
        <div>
          <h2 className={K.judulSeksi}>Pejabat Penandatangan</h2>
          <p className={K.subSeksi}>
            PPK & Bendahara dipakai otomatis di dokumen LPJ dan form surat sesuai tanggal
            dokumennya.
          </p>
        </div>
        {bolehUbah && (
          <button type="button" onClick={buka} className={K.tombolTambah}>
            <FaPlus size={11} className={K.aksen} /> Tetapkan Pejabat
          </button>
        )}
      </div>

      {memuat ? (
        <p className={K.kosong}>Memuat data pejabat…</p>
      ) : (
        <div className={`${K.wadah} grid grid-cols-1 md:grid-cols-2 gap-px ${K.permukaan2}`}>
          {JENIS_PEJABAT.map((j) => {
            const riwayat = daftar.filter((p) => p.jenis === j.id);
            const kini = penetapanPada(daftar, j.id, hariIni);
            const lain = riwayat.filter((p) => p.id !== kini?.id);
            const orangKini = kini && pegawaiById[kini.pegawaiId];
            return (
              <section key={j.id} className={`${K.permukaan} p-4`}>
                <h3 className={K.labelAksen}>{j.label}</h3>
                <p className={`text-[11.5px] mt-0.5 ${K.redup}`}>{PEMAKAIAN[j.id]}</p>
                {kini ? (
                  <div className="mt-2.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`font-bold truncate ${K.teks}`}>{nama(kini)}</p>
                      <p className={`text-[12px] mt-0.5 ${K.teks2}`}>
                        {orangKini?.nip ? `NIP ${orangKini.nip} · ` : ''}
                        {rentang(kini)}
                      </p>
                    </div>
                    {tombolAkhiri(kini)}
                  </div>
                ) : (
                  <p className={`mt-2.5 text-[13px] ${K.redup}`}>Belum ditetapkan</p>
                )}
                {lain.length > 0 && (
                  <ul className={`mt-3 pt-3 border-t ${K.garis} space-y-1.5`}>
                    {lain.map((p) => {
                      const [warna, label] = statusPenetapan(p, kini, hariIni);
                      return (
                        <li
                          key={p.id}
                          className="flex items-center justify-between gap-2 text-[12px]"
                        >
                          <span className={`min-w-0 ${K.teks2}`}>
                            <span className="font-semibold">{nama(p)}</span> · {rentang(p)}
                          </span>
                          <span className="flex items-center gap-1 shrink-0">
                            <span className={`${K.lencana} ${WARNA_STATUS[warna]}`}>{label}</span>
                            {tombolAkhiri(p)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {form && (
        <Modal
          onClose={proses ? () => {} : () => setForm(null)}
          labelledBy="judul-tetapkan-pejabat"
          widthClass="max-w-lg"
          lembar
        >
          <form onSubmit={simpan} noValidate className={K.modalIsi}>
            {kepalaPopup('judul-tetapkan-pejabat', 'Tetapkan Pejabat', () => setForm(null))}
            <p className={K.modalSub}>
              Kosongkan tanggal akhir bila masih menjabat. Penetapan tidak bisa dihapus; salah input
              diperbaiki dengan penetapan baru.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="pj-jenis" className={K.label}>
                  Jabatan
                </label>
                <select
                  id="pj-jenis"
                  value={form.jenis}
                  onChange={(e) => setForm({ ...form, jenis: e.target.value })}
                  className={K.masukan}
                >
                  <option value="">-- Pilih --</option>
                  {JENIS_PEJABAT.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="pj-pegawai" className={K.label}>
                  Pegawai
                </label>
                <CariPegawai
                  id="pj-pegawai"
                  pegawai={pilihanPegawai}
                  nilai={form.pegawaiId}
                  onPilih={(pegawaiId) => setForm((f) => ({ ...f, pegawaiId }))}
                />
              </div>
              <div>
                <label htmlFor="pj-mulai" className={K.label}>
                  Berlaku mulai
                </label>
                <input
                  id="pj-mulai"
                  type="date"
                  value={form.berlakuMulai}
                  onChange={(e) => setForm({ ...form, berlakuMulai: e.target.value })}
                  className={K.masukan}
                />
              </div>
              <div>
                <label htmlFor="pj-sampai" className={K.label}>
                  Berlaku sampai (opsional)
                </label>
                <input
                  id="pj-sampai"
                  type="date"
                  min={form.berlakuMulai || undefined}
                  value={form.berlakuSampai}
                  onChange={(e) => setForm({ ...form, berlakuSampai: e.target.value })}
                  className={K.masukan}
                />
              </div>
            </div>
            {diakhiri.length > 0 && (
              <p className={`${K.peringatan} mt-4 mb-0`}>
                Penetapan {diakhiri.map(nama).join(', ')} yang masih berjalan akan diakhiri pada{' '}
                {tgl(sehariSebelum(form.berlakuMulai))}.
              </p>
            )}
            {galatForm && (
              <p role="alert" className={`${K.galat} mt-4 mb-0`}>
                {galatForm}
              </p>
            )}
            <div className={K.modalAksi}>
              <button
                type="button"
                onClick={() => setForm(null)}
                disabled={proses}
                className={K.tombolKedua}
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

      {akhiri && (
        <Modal
          onClose={proses ? () => {} : () => setAkhiri(null)}
          labelledBy="judul-akhiri-pejabat"
          widthClass="max-w-sm"
        >
          <form onSubmit={simpanAkhir} className={K.modalIsi}>
            {kepalaPopup('judul-akhiri-pejabat', 'Akhiri Masa Jabatan', () => setAkhiri(null))}
            <p className={K.modalSub}>
              {nama(akhiri.penetapan)} ·{' '}
              {JENIS_PEJABAT.find((j) => j.id === akhiri.penetapan.jenis)?.label}
            </p>
            <label htmlFor="pj-akhir" className={K.label}>
              Tanggal terakhir menjabat
            </label>
            <input
              id="pj-akhir"
              type="date"
              required
              min={akhiri.penetapan.berlakuMulai}
              value={akhiri.tanggal}
              onChange={(e) => setAkhiri({ ...akhiri, tanggal: e.target.value })}
              className={K.masukan}
            />
            <div className={K.modalAksi}>
              <button
                type="button"
                onClick={() => setAkhiri(null)}
                disabled={proses}
                className={K.tombolKedua}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={
                  proses || !akhiri.tanggal || akhiri.tanggal < akhiri.penetapan.berlakuMulai
                }
                className={K.tombolBahaya}
              >
                {proses ? 'Menyimpan…' : 'Akhiri'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
