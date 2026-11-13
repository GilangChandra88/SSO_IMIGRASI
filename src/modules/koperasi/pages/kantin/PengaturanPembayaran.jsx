import { useState } from 'react';
import { FaArrowRight, FaPen, FaPlus } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import { PANJANG } from '@/utils/batas';
import { pesanGalat } from '@/utils/pesanGalat';
import { showToast } from '@/utils/toastStore';
import { K } from '../../ui/kelas';
import { useKasBank } from '../../hooks/useKasBank';
import { usePembayaran } from '../../hooks/usePembayaran';
import {
  buatPembayaranBawaan,
  tambahPembayaran,
  ubahPembayaran,
} from '../../services/pembayaranDb';
import Halaman from '../../components/Halaman';
import ModalForm from '../../components/ModalForm';
import PilihKas from '../../components/PilihKas';

function FormPembayaran({ data, kas, urutanBaru, semua, onTutup }) {
  const { currentUser } = useAuth();
  const uid = currentUser.uid;
  const [nama, setNama] = useState(data?.nama ?? '');
  const [kasId, setKasId] = useState(data?.kasId ?? '');
  const [sibuk, setSibuk] = useState(false);
  const bersih = nama.trim();
  const kembar = semua.some(
    (p) => p.id !== data?.id && p.nama.toLowerCase() === bersih.toLowerCase(),
  );

  const jalankan = async (aksi, pesan) => {
    setSibuk(true);
    try {
      await aksi();
      showToast(pesan);
      onTutup();
    } catch (err) {
      showToast(pesanGalat(err), 'error');
      setSibuk(false);
    }
  };

  const simpan = (e) => {
    e.preventDefault();
    jalankan(
      () =>
        data
          ? ubahPembayaran(data.id, { nama: bersih, kasId }, uid)
          : tambahPembayaran({ nama: bersih, kasId, urutan: urutanBaru }, uid),
      data ? 'Cara bayar diperbarui.' : 'Cara bayar ditambahkan.',
    );
  };

  return (
    <ModalForm
      id="form-pembayaran"
      judul={data ? 'Ubah Cara Bayar' : 'Tambah Cara Bayar'}
      onTutup={onTutup}
      onSimpan={simpan}
    >
      <label>
        <span className={K.label}>Nama cara bayar</span>
        <input
          className={K.masukan}
          maxLength={PANJANG.namaPembayaran}
          placeholder="Mis. Tunai, QRIS, Transfer BRI"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
        />
        {kembar && <span className={K.pesanGalat}>Nama ini sudah ada.</span>}
      </label>
      <PilihKas kas={kas} nilai={kasId} onUbah={setKasId} label="Uang masuk ke kas" />
      <p className={K.redup}>
        Setiap penjualan dengan cara bayar ini otomatis menambah saldo kas yang dipilih.
      </p>
      <button
        type="submit"
        className={K.tombolUtama}
        disabled={sibuk || !bersih || kembar || !kasId}
      >
        {sibuk ? 'Menyimpan…' : 'Simpan'}
      </button>
      {data && (
        <button
          type="button"
          className={K.tombolKedua}
          disabled={sibuk}
          onClick={() =>
            jalankan(
              () => ubahPembayaran(data.id, { aktif: !data.aktif }, uid),
              data.aktif ? 'Cara bayar dinonaktifkan.' : 'Cara bayar diaktifkan.',
            )
          }
        >
          {data.aktif ? 'Nonaktifkan' : 'Aktifkan'}
        </button>
      )}
    </ModalForm>
  );
}

/** Pengaturan cara bayar Kasir dan kas tujuan masing-masing. Bon selalu tersedia (khusus anggota). */
export default function PengaturanPembayaran() {
  const { currentUser } = useAuth();
  const { semua, memuat } = usePembayaran();
  const { kas, memuat: memuatKas } = useKasBank();
  // null = tertutup; {} = baru; dokumen = ubah
  const [form, setForm] = useState(null);
  const [sibuk, setSibuk] = useState(false);
  const namaKas = Object.fromEntries(kas.map((k) => [k.id, k.nama]));

  // Isian awal: Tunai → Kas, QRIS & Transfer → Bank 1 (bila kedua akun itu ada)
  const bawaan = [
    { nama: 'Tunai', kasId: 's-kas' },
    { nama: 'QRIS', kasId: 's-bank-1' },
    { nama: 'Transfer', kasId: 's-bank-1' },
  ].filter((p) => namaKas[p.kasId]);

  const isiBawaan = async () => {
    setSibuk(true);
    try {
      await buatPembayaranBawaan(bawaan, currentUser.uid);
      showToast('Cara bayar bawaan ditambahkan.');
    } catch (err) {
      showToast(pesanGalat(err), 'error');
    } finally {
      setSibuk(false);
    }
  };

  let isi;
  if (memuat || memuatKas) isi = <p className={K.kosong}>Memuat…</p>;
  else if (!semua.length) {
    isi = (
      <div className={`${K.kartu} flex flex-col gap-3`}>
        <p className={K.teks}>
          Belum ada cara bayar. Kasir baru bisa menerima pembayaran (selain bon) setelah ada minimal
          satu.
        </p>
        {bawaan.length > 0 && (
          <button type="button" className={K.tombolKedua} disabled={sibuk} onClick={isiBawaan}>
            {sibuk
              ? 'Menyimpan…'
              : `Pakai bawaan: ${bawaan.map((p) => `${p.nama} → ${namaKas[p.kasId]}`).join(', ')}`}
          </button>
        )}
      </div>
    );
  } else {
    isi = (
      <ul className={K.kartuDaftar}>
        {semua.map((p) => (
          <li key={p.id} className={K.barisDaftar}>
            <button
              type="button"
              className={`${K.tombolBaris} ${p.aktif ? '' : 'opacity-60'}`}
              onClick={() => setForm(p)}
            >
              <span className="flex-1 min-w-0">
                <span className={`${K.judulBaris} block`}>{p.nama}</span>
                <span className={`${K.redup} inline-flex items-center gap-1.5`}>
                  <FaArrowRight size={9} aria-hidden="true" />
                  {namaKas[p.kasId] ?? 'Kas tidak aktif / tidak ditemukan'}
                </span>
                {!p.aktif && <span className={`${K.lencana} ml-2`}>Nonaktif</span>}
              </span>
              <FaPen size={12} className={K.redup} aria-hidden="true" />
            </button>
          </li>
        ))}
        <li className={`${K.barisDaftar} px-4 py-2.5`}>
          <span className={`${K.judulBaris} block`}>Bon</span>
          <span className={K.redup}>Selalu tersedia untuk anggota; dicatat sebagai piutang.</span>
        </li>
      </ul>
    );
  }

  return (
    <Halaman
      judul="Pembayaran"
      sub="Cara bayar yang muncul di Kasir dan kas tujuan uangnya."
      aksi={
        <button type="button" className={K.tombolUtama} onClick={() => setForm({})}>
          <FaPlus size={12} /> Tambah
        </button>
      }
    >
      {isi}
      {form && (
        <FormPembayaran
          data={form.id ? form : null}
          kas={kas}
          semua={semua}
          urutanBaru={semua.reduce((n, p) => Math.max(n, p.urutan), 0) + 1}
          onTutup={() => setForm(null)}
        />
      )}
    </Halaman>
  );
}
