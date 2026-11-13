import { useState } from 'react';
import { pesanGalat } from '@/utils/pesanGalat';
import { showToast } from '@/utils/toastStore';
import { K } from '../../ui/kelas';
import { SISI_NERACA, adalahKontra } from '../../data/baganAkun';
import { simpanSaldoAwal } from '../../services/fungsi';
import MasukanRupiah from '../MasukanRupiah';
import { rupiah } from '../../ui/format';

/** Hanya angka bukan nol, supaya {a: 0} dianggap sama dengan {}. */
const bersihkan = (peta) => Object.fromEntries(Object.entries(peta).filter(([, v]) => v > 0));
const sama = (a, b) =>
  JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

/** Isian saldo awal akun neraca. awal = dokumen tersimpan (atau null). */
export default function FormSaldoAwal({ awal, perKelompok }) {
  const [tanggal, setTanggal] = useState(awal?.tanggalMulai ?? '');
  const [saldo, setSaldo] = useState(awal?.saldo ?? {});
  const [sibuk, setSibuk] = useState(false);

  const kelompok = perKelompok
    .filter((k) => SISI_NERACA[k.id])
    .map((k) => ({ ...k, akun: k.akun.filter((a) => a.aktif || saldo[a.id] > 0) }));

  let totalAset = 0;
  let totalPasiva = 0;
  kelompok.forEach((k) =>
    k.akun.forEach((a) => {
      const n = saldo[a.id] ?? 0;
      if (SISI_NERACA[k.id] === 'pasiva') totalPasiva += n;
      else totalAset += adalahKontra(a.id) ? -n : n;
    }),
  );
  const selisih = totalAset - totalPasiva;
  const berubah =
    tanggal !== (awal?.tanggalMulai ?? '') || !sama(bersihkan(saldo), bersihkan(awal?.saldo ?? {}));

  const simpan = async () => {
    setSibuk(true);
    try {
      await simpanSaldoAwal({ tanggalMulai: tanggal, saldo: bersihkan(saldo) });
      showToast(
        selisih === 0 ? 'Saldo awal tersimpan.' : 'Saldo awal tersimpan, tetapi belum seimbang.',
      );
    } catch (err) {
      showToast(pesanGalat(err), 'error');
    } finally {
      setSibuk(false);
    }
  };

  const ringkasan = (
    <div className="flex-1 min-w-0">
      <span className={`${K.judulBaris} block`}>
        {selisih === 0 ? 'Seimbang' : `Selisih ${rupiah(Math.abs(selisih))}`}
      </span>
      <span className={`${K.redup} block truncate`}>
        Aset {rupiah(totalAset)} · Kewajiban + Ekuitas {rupiah(totalPasiva)}
      </span>
    </div>
  );
  const tombol = (
    <button
      type="button"
      className={K.tombolUtamaPas}
      disabled={sibuk || !tanggal || !berubah}
      onClick={simpan}
    >
      {sibuk ? 'Menyimpan…' : 'Simpan'}
    </button>
  );

  return (
    <div className="pb-20 md:pb-0">
      <label className={`${K.kartu} block mb-5`}>
        <span className={K.label}>Tanggal mulai pembukuan di sistem</span>
        <input
          type="date"
          className={K.masukan}
          value={tanggal}
          onChange={(e) => setTanggal(e.target.value)}
        />
        <span className={`${K.redup} block mt-1.5`}>
          Isi saldo setiap akun per awal tanggal ini. Kosongkan akun yang bersaldo nol.
        </span>
      </label>

      <div className="flex flex-col gap-5">
        {kelompok.map((k) => (
          <section key={k.id} aria-labelledby={`saldo-${k.id}`}>
            <h2 id={`saldo-${k.id}`} className={`${K.judulSeksi} mb-2`}>
              {k.label}
            </h2>
            <ul className={K.kartuDaftar}>
              {k.akun.map((a) => (
                <li key={a.id} className={`${K.barisDaftar} px-4 py-2.5`}>
                  <label className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                    <span className="flex-1 min-w-0 flex items-baseline gap-3">
                      <span className={`${K.nominal} w-11 shrink-0`}>{a.kode}</span>
                      <span className={K.judulBaris}>
                        {a.nama}
                        {adalahKontra(a.id) && (
                          <span className={`${K.redup} block`}>Mengurangi nilai aset</span>
                        )}
                      </span>
                    </span>
                    <span className="sm:w-48">
                      <MasukanRupiah
                        nilai={saldo[a.id] ?? 0}
                        onUbah={(v) => setSaldo((s) => ({ ...s, [a.id]: v }))}
                        aria-label={`Saldo awal ${a.nama}`}
                      />
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* Ringkasan & simpan: bilah tetap di ponsel, kartu di akhir halaman di layar lebar */}
      <div className={`${K.bilahAksi} flex items-center gap-3`}>
        {ringkasan}
        {tombol}
      </div>
      <div className={`${K.kartu} hidden md:flex items-center gap-3 mt-5`}>
        {ringkasan}
        {tombol}
      </div>
    </div>
  );
}
