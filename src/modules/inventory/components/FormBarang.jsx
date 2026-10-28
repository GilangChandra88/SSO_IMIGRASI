import { useEffect, useMemo, useRef, useState } from 'react';
import { FaBoxes, FaTags, FaTimes, FaTruck } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { ANIM } from '@/utils/animasi';
import { K } from '../ui/kelas';
import { SATUAN } from '../data/konstanta';
import { useEscape } from '../hooks/useEscape';
import { PilihCari } from './Pilihan';

const TAB_DATA = [
  { id: 'barang', label: 'Tambah Barang', Ikon: FaBoxes },
  { id: 'kategori', label: 'Tambah Kategori', Ikon: FaTags },
  { id: 'pemasok', label: 'Tambah Pemasok', Ikon: FaTruck },
];

function Pesan({ galat, ok }) {
  return (
    <>
      {galat && (
        <div className={K.galat} role="alert">
          {galat}
        </div>
      )}
      {ok && (
        <div className={`${K.sukses} ${ANIM.muncul}`} role="status">
          {ok}
        </div>
      )}
    </>
  );
}

// Tab Tambah Kategori: nama + kode kategori SAKTI (10 digit). Setelah disimpan isian dikosongkan.
function PanelKategori({ aktif, onSimpan, onTutup }) {
  const [f, setF] = useState({ nama: '', kode: '' });
  const [galat, setGalat] = useState(null);
  const [ok, setOk] = useState(null);
  const [sibuk, setSibuk] = useState(false);
  const namaRef = useRef(null);
  useEffect(() => {
    if (aktif) namaRef.current?.focus();
  }, [aktif]);
  const ubah = (k, v) => {
    setGalat(null);
    setOk(null);
    setF((x) => ({ ...x, [k]: v }));
  };

  async function kirim(e) {
    e.preventDefault();
    const nama = f.nama.trim();
    if (!nama) return setGalat('Nama kategori wajib diisi.');
    if (!/^\d{10}$/.test(f.kode))
      return setGalat('Kode kategori SAKTI harus 10 digit angka (contoh: 1010305001).');
    setSibuk(true);
    const g = await onSimpan({ kode: f.kode, nama });
    setSibuk(false);
    if (g) return setGalat(g);
    setF({ nama: '', kode: '' });
    setOk(`Kategori ${nama} ditambahkan. Kategori ini sudah bisa dipilih di tab Tambah Barang.`);
    namaRef.current?.focus();
    return undefined;
  }

  return (
    <form onSubmit={kirim} noValidate className="flex flex-col gap-4">
      <div>
        <label className={K.lbl} htmlFor="tk-nama">
          Nama Kategori <span className={K.wajib}>*</span>
        </label>
        <input
          ref={namaRef}
          className={K.ctl}
          id="tk-nama"
          placeholder="Contoh: Alat Tulis"
          value={f.nama}
          onChange={(e) => ubah('nama', e.target.value)}
        />
      </div>
      <div>
        <label className={K.lbl} htmlFor="tk-kode">
          Kode Kategori SAKTI <span className={K.wajib}>*</span>
        </label>
        <input
          className={K.ctl}
          id="tk-kode"
          inputMode="numeric"
          maxLength={10}
          placeholder="10 digit angka, contoh: 1010305001"
          value={f.kode}
          onChange={(e) => ubah('kode', e.target.value.replace(/\D/g, ''))}
        />
      </div>
      <Pesan galat={galat} ok={ok} />
      <div className="flex flex-wrap gap-3">
        <button className={K.btnUtama} type="submit" disabled={!f.nama.trim() || !f.kode || sibuk}>
          {sibuk ? 'Menyimpan…' : 'Simpan'}
        </button>
        <button className={K.btn} type="button" onClick={onTutup}>
          Tutup
        </button>
      </div>
    </form>
  );
}

// Tab Tambah Pemasok: nama pemasok saja; langsung muncul di pilihan Tambah Barang Masuk.
function PanelPemasok({ aktif, onSimpan, onTutup }) {
  const [nama, setNama] = useState('');
  const [galat, setGalat] = useState(null);
  const [ok, setOk] = useState(null);
  const [sibuk, setSibuk] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => {
    if (aktif) inputRef.current?.focus();
  }, [aktif]);

  async function kirim(e) {
    e.preventDefault();
    const bersih = nama.trim().replace(/\s+/g, ' ');
    if (!bersih) return setGalat('Nama pemasok wajib diisi.');
    setSibuk(true);
    const g = await onSimpan(bersih);
    setSibuk(false);
    if (g) return setGalat(g);
    setNama('');
    setOk(`Pemasok ${bersih} ditambahkan. Pemasok ini sudah bisa dipilih di Tambah Barang Masuk.`);
    inputRef.current?.focus();
    return undefined;
  }

  return (
    <form onSubmit={kirim} noValidate className="flex flex-col gap-4">
      <div>
        <label className={K.lbl} htmlFor="tp-nama">
          Pemasok <span className={K.wajib}>*</span>
        </label>
        <input
          ref={inputRef}
          className={K.ctl}
          id="tp-nama"
          placeholder="Contoh: CV Contoh Kantor"
          value={nama}
          onChange={(e) => {
            setGalat(null);
            setOk(null);
            setNama(e.target.value);
          }}
        />
      </div>
      <Pesan galat={galat} ok={ok} />
      <div className="flex flex-wrap gap-3">
        <button className={K.btnUtama} type="submit" disabled={!nama.trim() || sibuk}>
          {sibuk ? 'Menyimpan…' : 'Simpan'}
        </button>
        <button className={K.btn} type="button" onClick={onTutup}>
          Tutup
        </button>
      </div>
    </form>
  );
}

/**
 * Popup Tambah Data (tab Tambah Barang, Tambah Kategori, Tambah Pemasok) dan Ubah Barang.
 * Nama, satuan, stok awal, dan stok minimum wajib; kategori dan Kode SAKTI boleh menyusul.
 * onSimpan* mengembalikan Promise teks galat (null bila berhasil).
 */
export default function FormBarang({
  edit,
  kategori,
  satuanAda = [],
  onSimpan,
  onSimpanKategori,
  onSimpanPemasok,
  onTutup,
}) {
  const [tab, setTab] = useState('barang');
  const [f, setF] = useState({
    nama: edit ? edit.nama : '',
    satuan: edit ? edit.satuan : '',
    stokAwal: edit ? String(edit.stokAwal || 0) : '',
    stokMin: edit ? String(edit.stokMin || 0) : '',
    kategoriId: edit && edit.kategoriId ? edit.kategoriId : '',
    kode: edit ? edit.kode || '' : '',
  });
  const [galat, setGalat] = useState(null);
  const [sibuk, setSibuk] = useState(false);
  useEscape(onTutup);
  const ubah = (k, v) => {
    setGalat(null);
    setF((x) => ({ ...x, [k]: v }));
  };
  // Satuan standar + satuan yang sudah dipakai (tanpa kembar, huruf besar/kecil dianggap sama)
  const daftarSatuan = useMemo(() => {
    const lihat = new Set();
    return [...SATUAN, ...satuanAda]
      .filter((s) => {
        const k = (s || '').toLowerCase();
        if (!s || lihat.has(k)) return false;
        lihat.add(k);
        return true;
      })
      .sort((x, y) => x.localeCompare(y));
  }, [satuanAda]);
  const stok = Number(f.stokAwal);
  const min = Number(f.stokMin);
  const lengkap =
    f.nama.trim() !== '' &&
    f.satuan.trim() !== '' &&
    f.stokAwal !== '' &&
    f.stokMin !== '' &&
    Number.isInteger(stok) &&
    stok >= 0 &&
    Number.isInteger(min) &&
    min >= 0;

  async function kirim(e) {
    e.preventDefault();
    if (!lengkap || sibuk) return;
    if (f.kode && !/^\d{1,6}$/.test(f.kode))
      return setGalat('Kode barang SAKTI harus berupa angka, maksimal 6 digit (contoh: 000001).');
    setSibuk(true);
    const g = await onSimpan({
      nama: f.nama.trim(),
      satuan: f.satuan.trim(),
      stokAwal: stok,
      stokMin: min,
      kategoriId: f.kategoriId || null,
      kode: f.kode ? f.kode.padStart(6, '0') : '',
    });
    setSibuk(false);
    if (g) setGalat(g);
    return undefined;
  }

  return (
    <Modal
      onClose={onTutup}
      labelledBy="brg-judul"
      widthClass={edit ? 'max-w-[520px]' : 'max-w-[580px]'}
      lembar
      tinggiTetap
    >
      <div className={K.popupIsi}>
        <div className="flex items-center justify-between gap-3">
          <h2 className={K.popupJudul} id="brg-judul">
            {edit ? 'Ubah Barang' : 'Tambah Data'}
          </h2>
          <button className={K.ikonBtn} type="button" aria-label="Tutup" onClick={onTutup}>
            <FaTimes size={15} />
          </button>
        </div>

        {!edit && (
          <div
            className={`${K.tabPil} w-full`}
            role="tablist"
            aria-label="Jenis data yang ditambahkan"
          >
            {TAB_DATA.map(({ id, label, Ikon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={`${K.tabPilBtn} ${tab === id ? K.tabPilAktif : K.tabPilPasif} flex-auto min-w-0 px-3 max-[520px]:px-1 max-[520px]:text-[12.5px]`}
                onClick={() => setTab(id)}
              >
                <Ikon size={14} className="max-[520px]:hidden" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        )}

        <div hidden={tab !== 'barang'}>
          <form onSubmit={kirim} noValidate className="flex flex-col gap-4">
            <div>
              <label className={K.lbl} htmlFor="brg-kat">
                Kategori
              </label>
              <PilihCari
                id="brg-kat"
                placeholder="Pilih kategori"
                nilai={f.kategoriId}
                opsi={kategori.map((k) => ({ nilai: k.id, label: k.nama, kode: k.kode }))}
                onPilih={(v) => ubah('kategoriId', v)}
                onHapus={() => ubah('kategoriId', '')}
              />
              {!edit && (
                <button
                  type="button"
                  className={`${K.tautan} mt-1.5`}
                  onClick={() => setTab('kategori')}
                >
                  Belum ada kategorinya? Tambah kategori
                </button>
              )}
            </div>
            <div>
              <label className={K.lbl} htmlFor="brg-nama">
                Nama Barang <span className={K.wajib}>*</span>
              </label>
              <input
                className={K.ctl}
                id="brg-nama"
                autoFocus
                placeholder="Contoh: Pensil 2 B"
                value={f.nama}
                onChange={(e) => ubah('nama', e.target.value)}
              />
            </div>
            <div>
              <label className={K.lbl} htmlFor="brg-kode">
                Kode Barang SAKTI
              </label>
              <input
                className={K.ctl}
                id="brg-kode"
                inputMode="numeric"
                maxLength={6}
                placeholder="6 digit angka, contoh: 000001"
                value={f.kode}
                onChange={(e) => ubah('kode', e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div>
              <label className={K.lbl} htmlFor="brg-satuan">
                Satuan <span className={K.wajib}>*</span>
              </label>
              <PilihCari
                id="brg-satuan"
                placeholder="Pilih satuan"
                nilai={f.satuan}
                opsi={daftarSatuan.map((s) => ({ nilai: s, label: s }))}
                onPilih={(v) => ubah('satuan', v)}
                onHapus={() => ubah('satuan', '')}
              />
            </div>
            <div>
              <label className={K.lbl} htmlFor="brg-stok">
                Stok Awal <span className={K.wajib}>*</span>
              </label>
              <input
                className={K.ctl}
                id="brg-stok"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={f.stokAwal}
                disabled={!!edit?.adaTransaksi}
                onChange={(e) => ubah('stokAwal', e.target.value)}
              />
              {edit?.adaTransaksi && (
                <p className={K.bantu}>Terkunci karena barang ini sudah punya transaksi.</p>
              )}
            </div>
            <div>
              <label className={K.lbl} htmlFor="brg-min">
                Stok Minimum <span className={K.wajib}>*</span>
              </label>
              <input
                className={K.ctl}
                id="brg-min"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={f.stokMin}
                onChange={(e) => ubah('stokMin', e.target.value)}
              />
              <p className={K.bantu}>
                Status stok jadi Menipis bila sisa sama dengan atau di bawah angka ini, dan Habis
                bila 0.
              </p>
            </div>
            {galat && (
              <div className={K.galat} role="alert">
                {galat}
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <button className={K.btnUtama} type="submit" disabled={!lengkap || sibuk}>
                {sibuk ? 'Menyimpan…' : 'Simpan'}
              </button>
              <button className={K.btn} type="button" onClick={onTutup}>
                Batal
              </button>
            </div>
          </form>
        </div>

        {!edit && (
          <>
            <div hidden={tab !== 'kategori'}>
              <PanelKategori
                aktif={tab === 'kategori'}
                onSimpan={onSimpanKategori}
                onTutup={onTutup}
              />
            </div>
            <div hidden={tab !== 'pemasok'}>
              <PanelPemasok
                aktif={tab === 'pemasok'}
                onSimpan={onSimpanPemasok}
                onTutup={onTutup}
              />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
