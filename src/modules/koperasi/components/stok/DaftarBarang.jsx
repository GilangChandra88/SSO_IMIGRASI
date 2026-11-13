import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBarcode, FaPen, FaPlus, FaTimes } from 'react-icons/fa';
import { showToast } from '@/utils/toastStore';
import { K } from '../../ui/kelas';
import { JALUR_STOK_KANTIN } from '../../data/unitUsaha';
import { adalahResep, bisaDibuat, cariBarkode, hppResep } from '../../utils/barang';
import { masalahBarkode } from '../../utils/barkode';
import PemindaiBarkode from './PemindaiBarkode';
import { rupiah, angka } from '../../ui/format';

export default function DaftarBarang({ barang, kategori, memuat }) {
  const navigate = useNavigate();
  const [cari, setCari] = useState('');
  const [saringKategori, setSaringKategori] = useState('');
  const [pindai, setPindai] = useState(false);
  const [hanyaMasalah, setHanyaMasalah] = useState(false);
  // Barkode data lama yang tidak standar atau kembar: diberi peringatan agar dibenahi
  const masalah = useMemo(() => masalahBarkode(barang), [barang]);

  const namaKategori = useMemo(() => new Map(kategori.map((k) => [k.id, k.nama])), [kategori]);
  const petaBarang = useMemo(() => new Map(barang.map((b) => [b.id, b])), [barang]);
  const kunci = cari.trim().toLowerCase();
  const tampil = barang.filter(
    (b) =>
      (!hanyaMasalah || masalah.has(b.id)) &&
      (!kunci ||
        b.nama.toLowerCase().includes(kunci) ||
        b.barkode?.includes(kunci) ||
        (b.kemasan || []).some((k) => k.barkode?.includes(kunci))) &&
      (!saringKategori || b.kategoriId === saringKategori),
  );
  const adaKategori = kategori.some((k) => k.aktif);

  const saatTerbaca = (kode) => {
    setPindai(false);
    const ada = cariBarkode(barang, kode)?.barang;
    if (ada) {
      showToast(`Barkode ini sudah terdaftar: ${ada.nama}`);
      navigate(`${JALUR_STOK_KANTIN}/${ada.id}/ubah`);
      return;
    }
    navigate(`${JALUR_STOK_KANTIN}/tambah`, { state: { barkode: kode } });
  };

  let isi;
  if (memuat) isi = <p className={K.kosong}>Memuat…</p>;
  else if (!adaKategori && !barang.length) {
    isi = <p className={K.kosong}>Tambahkan kategori lebih dulu di tab Kategori.</p>;
  } else if (!tampil.length) {
    isi = (
      <p className={K.kosong}>{barang.length ? 'Barang tidak ditemukan.' : 'Belum ada barang.'}</p>
    );
  } else {
    isi = (
      <ul className="flex flex-col gap-2.5">
        {tampil.map((b) => (
          <li key={b.id} className={`${K.kartu} flex items-center gap-3`}>
            <div className={`flex-1 min-w-0 ${b.aktif ? '' : 'opacity-60'}`}>
              <span className={`${K.judulBaris} block truncate`}>{b.nama}</span>
              <span className={`${K.redup} block truncate`}>
                {namaKategori.get(b.kategoriId) ?? '-'} · Jual {rupiah(b.hargaJual)}
                {adalahResep(b)
                  ? ` · HPP ±${rupiah(hppResep(b, petaBarang))}`
                  : b.hargaPokok
                    ? ` · Pokok ${rupiah(b.hargaPokok)}`
                    : ''}
              </span>
              {(b.kemasan || []).length > 0 && (
                <span className={`${K.redup} block truncate`}>
                  {b.kemasan.map((k) => `${k.nama} (${k.isi}) ${rupiah(k.hargaJual)}`).join(' · ')}
                </span>
              )}
              {adalahResep(b) && <span className={K.lencana}>Resep</span>}{' '}
              {!b.aktif && <span className={K.lencana}>Nonaktif</span>}
              {masalah.get(b.id)?.map((p) => (
                <span key={p} className={`${K.lencanaBahaya} mr-1`}>
                  {p}
                </span>
              ))}
            </div>
            <span className={`${K.nominal} text-right`}>
              {adalahResep(b) ? (
                <>
                  ±{angka(bisaDibuat(b, petaBarang))} {b.satuan}
                  <span className={`${K.redup} block font-normal`}>bisa dibuat</span>
                </>
              ) : (
                <>
                  {angka(b.stok)} {b.satuan}
                </>
              )}
            </span>
            <button
              type="button"
              className={K.tombolIkon}
              aria-label={`Ubah ${b.nama}`}
              onClick={() => navigate(`${JALUR_STOK_KANTIN}/${b.id}/ubah`)}
            >
              <FaPen size={13} />
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <>
      {masalah.size > 0 && (
        <div className={`${K.kartu} mb-3 flex flex-wrap items-center gap-3`} role="status">
          <span className="flex-1 min-w-0">
            <span className={`${K.judulBaris} block`}>
              {masalah.size} barang barkodenya perlu dibenahi
            </span>
            <span className={K.redup}>
              Barkode tidak standar atau kembar. Buka barangnya, lalu perbaiki atau kosongkan
              barkodenya.
            </span>
          </span>
          <button
            type="button"
            className={K.tombolKedua}
            aria-pressed={hanyaMasalah}
            onClick={() => setHanyaMasalah((v) => !v)}
          >
            {hanyaMasalah ? 'Tampilkan semua' : 'Lihat yang bermasalah'}
          </button>
        </div>
      )}
      {pindai && <PemindaiBarkode onHasil={saatTerbaca} />}
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          className={`${K.tombolUtama} flex-1 min-w-0 sm:flex-none`}
          disabled={memuat || !adaKategori}
          onClick={() => navigate(`${JALUR_STOK_KANTIN}/tambah`)}
        >
          <FaPlus size={12} /> Tambah Barang
        </button>
        <button
          type="button"
          className={K.tombolKotak}
          disabled={memuat || !adaKategori}
          aria-pressed={pindai}
          aria-label={pindai ? 'Tutup kamera' : 'Scan barkode'}
          title={pindai ? 'Tutup kamera' : 'Scan barkode'}
          onClick={() => setPindai((p) => !p)}
        >
          {pindai ? <FaTimes size={16} /> : <FaBarcode size={18} />}
        </button>
      </div>
      <div className="grid gap-2 mb-3 sm:grid-cols-2">
        <input
          type="search"
          className={K.masukan}
          placeholder="Cari nama atau barkode…"
          aria-label="Cari nama atau barkode"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
        />
        <select
          className={K.masukan}
          aria-label="Saring menurut kategori"
          value={saringKategori}
          onChange={(e) => setSaringKategori(e.target.value)}
        >
          <option value="">Semua kategori</option>
          {kategori.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nama}
            </option>
          ))}
        </select>
      </div>
      {isi}
    </>
  );
}
