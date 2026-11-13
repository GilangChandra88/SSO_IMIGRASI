import { useState } from 'react';
import { pesanGalat } from '@/utils/pesanGalat';
import { showToast } from '@/utils/toastStore';
import { K } from '../../ui/kelas';
import { rupiah } from '../../ui/format';
import { useAnggota } from '../../hooks/useAnggota';
import { useBukuBesar } from '../../hooks/useBukuBesar';
import { simpanSaldoAwalSimpanan } from '../../services/fungsi';
import Halaman from '../../components/Halaman';
import MasukanRupiah from '../../components/MasukanRupiah';

const KEMBALI = { to: '/koperasi/anggota', label: 'Anggota & Simpanan' };

function Baris({ a }) {
  const [pokok, setPokok] = useState(a.awalPokok);
  const [wajib, setWajib] = useState(a.awalWajib);
  const [sibuk, setSibuk] = useState(false);
  const berubah = pokok !== a.awalPokok || wajib !== a.awalWajib;
  const simpan = async () => {
    setSibuk(true);
    try {
      await simpanSaldoAwalSimpanan({ anggotaId: a.id, pokok, wajib });
      showToast(`Saldo awal ${a.nama} tersimpan.`);
    } catch (err) {
      showToast(pesanGalat(err), 'error');
    } finally {
      setSibuk(false);
    }
  };
  return (
    <li
      className={`${K.barisDaftar} px-4 py-3 grid gap-2 sm:grid-cols-[1fr_160px_160px_auto] sm:items-center`}
    >
      <span className="min-w-0">
        <span className={`${K.judulBaris} block truncate`}>{a.nama}</span>
        <span className={K.redup}>{a.nomor}</span>
      </span>
      <MasukanRupiah
        nilai={pokok}
        onUbah={setPokok}
        aria-label={`Simpanan pokok awal ${a.nama}`}
        placeholder="Pokok"
      />
      <MasukanRupiah
        nilai={wajib}
        onUbah={setWajib}
        aria-label={`Simpanan wajib awal ${a.nama}`}
        placeholder="Wajib"
      />
      <button type="button" className={K.tombolKedua} disabled={sibuk || !berubah} onClick={simpan}>
        {sibuk ? '…' : 'Simpan'}
      </button>
    </li>
  );
}

/**
 * Saldo simpanan tiap anggota saat pembukuan di sistem dimulai. Totalnya harus sama dengan
 * saldo awal akun Simpanan Pokok & Simpanan Wajib.
 */
export default function SaldoAwalSimpanan() {
  const { semua, memuat } = useAnggota();
  const { saldoAwal } = useBukuBesar();
  const daftar = semua.filter((a) => a.status !== 'keluar');
  const totalPokok = daftar.reduce((n, a) => n + a.awalPokok, 0);
  const totalWajib = daftar.reduce((n, a) => n + a.awalWajib, 0);
  const akunPokok = saldoAwal?.saldo?.['s-simpanan-pokok'] ?? 0;
  const akunWajib = saldoAwal?.saldo?.['s-simpanan-wajib'] ?? 0;
  const cocok = totalPokok === akunPokok && totalWajib === akunWajib;

  return (
    <Halaman
      judul="Saldo Awal Simpanan"
      sub="Simpanan setiap anggota saat pembukuan di sistem dimulai. Anggota dengan simpanan pokok otomatis aktif."
      kembali={KEMBALI}
    >
      <div className={`${K.kartu} mb-4 grid gap-1`}>
        <span className={K.judulBaris}>
          {cocok ? 'Cocok dengan Saldo Awal akun' : 'Belum cocok dengan Saldo Awal akun'}
        </span>
        <span className={K.redup}>
          Pokok: anggota {rupiah(totalPokok)} · akun {rupiah(akunPokok)}
        </span>
        <span className={K.redup}>
          Wajib: anggota {rupiah(totalWajib)} · akun {rupiah(akunWajib)}
        </span>
      </div>
      {memuat ? (
        <p className={K.kosong}>Memuat…</p>
      ) : !daftar.length ? (
        <p className={K.kosong}>Tambahkan anggota lebih dulu di Daftar Anggota.</p>
      ) : (
        <ul className={K.kartuDaftar}>
          {daftar.map((a) => (
            <Baris key={`${a.id}-${a.awalPokok}-${a.awalWajib}`} a={a} />
          ))}
        </ul>
      )}
    </Halaman>
  );
}
