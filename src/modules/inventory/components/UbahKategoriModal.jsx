import { useEffect, useRef, useState } from 'react';
import Modal from '@/components/Modal';
import { T } from '@/utils/uiTokens';
import { K } from '../ui/kelas';
import { useEscape } from '../hooks/useEscape';
import KonfirmasiAksi from './KonfirmasiAksi';

/**
 * Ubah nama, kode SAKTI, dan kode akun (dipakai di ekspor SAKTI) kategori. Sebelum disimpan muncul
 * konfirmasi perubahan (lama → baru) dan dampaknya ke barang. onSimpan(d) mengembalikan Promise
 * (true bila berhasil); d = { nama, kode, akunKode }.
 */
export default function UbahKategoriModal({ kat, jumlahBarang, kategoriLain, onSimpan, onTutup }) {
  const [f, setF] = useState({ nama: kat.nama, kode: kat.kode, akunKode: kat.akunKode || '' });
  const [galat, setGalat] = useState(null);
  const [konf, setKonf] = useState(null); // { nama, kode } menunggu konfirmasi
  const [sibuk, setSibuk] = useState(false);
  const namaRef = useRef(null);
  useEscape(onTutup, !konf);
  const ubah = (k, v) => {
    setGalat(null);
    setF((x) => ({ ...x, [k]: v }));
  };

  useEffect(() => {
    if (!konf && namaRef.current) {
      namaRef.current.focus();
      namaRef.current.select();
    }
  }, [konf]);

  function kirim(e) {
    e.preventDefault();
    const nama = f.nama.trim();
    if (!nama) return setGalat('Nama kategori wajib diisi.');
    if (!/^\d{10}$/.test(f.kode))
      return setGalat('Kode kategori SAKTI harus 10 digit angka (contoh: 1010305001).');
    if (kategoriLain.some((k) => k.kode === f.kode))
      return setGalat(`Kode kategori ${f.kode} sudah dipakai kategori lain.`);
    if (f.akunKode && !/^\d{6}$/.test(f.akunKode))
      return setGalat('Kode akun harus 6 digit angka (contoh: 117111), atau dikosongkan.');
    if (nama === kat.nama && f.kode === kat.kode && f.akunKode === (kat.akunKode || ''))
      return setGalat('Belum ada yang diubah.');
    setKonf({ nama, kode: f.kode, akunKode: f.akunKode });
    return undefined;
  }

  if (konf) {
    const lama = (v) => <span className={`line-through ${T.inkMuted}`}>{v}</span>;
    const rincian = [];
    if (konf.kode !== kat.kode)
      rincian.push({
        label: 'Kode kategori SAKTI',
        mono: true,
        nilai: (
          <>
            {lama(kat.kode)} → <strong>{konf.kode}</strong>
          </>
        ),
      });
    if (konf.nama !== kat.nama)
      rincian.push({
        label: 'Nama kategori',
        nilai: (
          <>
            {lama(kat.nama)} → <strong>{konf.nama}</strong>
          </>
        ),
      });
    if (konf.akunKode !== (kat.akunKode || ''))
      rincian.push({
        label: 'Kode akun',
        mono: true,
        nilai: (
          <>
            {lama(kat.akunKode || '-')} → <strong>{konf.akunKode || '-'}</strong>
          </>
        ),
      });
    return (
      <KonfirmasiAksi
        nada="biasa"
        judul="Simpan perubahan kategori?"
        teks="Periksa dulu perubahan di bawah ini sebelum disimpan."
        rincian={rincian}
        peringatan={
          jumlahBarang > 0
            ? konf.kode !== kat.kode
              ? `Kode SAKTI lengkap ${jumlahBarang} barang di kategori ini ikut berubah (kode kategori + kode barang).`
              : `Nama kategori berubah pada ${jumlahBarang} barang di kategori ini.`
            : undefined
        }
        labelYa="Ya, Simpan"
        labelBatal="Kembali"
        sibuk={sibuk}
        onYa={async () => {
          setSibuk(true);
          const berhasil = await onSimpan(konf);
          if (!berhasil) setSibuk(false);
        }}
        onBatal={() => setKonf(null)}
      />
    );
  }

  return (
    <Modal onClose={onTutup} labelledBy="uk-judul" widthClass="max-w-[460px]" lembar>
      <form className={K.popupIsi} onSubmit={kirim} noValidate>
        <div>
          <h2 className={K.popupJudul} id="uk-judul">
            Ubah Kategori
          </h2>
          <span className={K.subKartu}>
            {jumlahBarang > 0
              ? `${jumlahBarang} barang ada di kategori ini`
              : 'Belum ada barang di kategori ini'}
          </span>
        </div>
        <div>
          <label className={K.lbl} htmlFor="uk-nama">
            Nama Kategori <span className={K.wajib}>*</span>
          </label>
          <input
            ref={namaRef}
            className={K.ctl}
            id="uk-nama"
            placeholder="Contoh: Alat Tulis"
            value={f.nama}
            onChange={(e) => ubah('nama', e.target.value)}
          />
        </div>
        <div>
          <label className={K.lbl} htmlFor="uk-kode">
            Kode Kategori SAKTI <span className={K.wajib}>*</span>
          </label>
          <input
            className={K.ctl}
            id="uk-kode"
            inputMode="numeric"
            maxLength={10}
            placeholder="10 digit angka, contoh: 1010305001"
            value={f.kode}
            onChange={(e) => ubah('kode', e.target.value.replace(/\D/g, ''))}
          />
        </div>
        <div>
          <label className={K.lbl} htmlFor="uk-akun">
            Kode Akun
          </label>
          <input
            className={K.ctl}
            id="uk-akun"
            inputMode="numeric"
            maxLength={6}
            placeholder="6 digit angka, contoh: 117111"
            value={f.akunKode}
            onChange={(e) => ubah('akunKode', e.target.value.replace(/\D/g, ''))}
          />
          <p className={K.bantu}>Ikut diekspor ke Excel Stok Barang untuk SAKTI.</p>
        </div>
        {galat && (
          <div className={K.galat} role="alert">
            {galat}
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <button className={K.btnUtama} type="submit" disabled={!f.nama.trim() || !f.kode}>
            Simpan Perubahan
          </button>
          <button className={K.btn} type="button" onClick={onTutup}>
            Batal
          </button>
        </div>
      </form>
    </Modal>
  );
}
