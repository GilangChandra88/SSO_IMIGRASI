import { useEffect, useState } from 'react';
import { showToast } from '@/utils/toastStore';
import { pesanGalat } from '@/utils/pesanGalat';
import Halaman from '../components/Halaman';
import { useTampilan } from '../hooks/useTampilan';
import { useLogDev } from '../konteks/konteks';
import { aturAmbang, aturTarif, perluKunciUlang } from '../services/logDev';
import { AMBANG, TARIF } from '../data/kode';
import { K } from '../ui/kelas';

const ANGKA = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 6 });
/** '0,06' / '16.500' → 0.06 / 16500 (koma = desimal, titik = ribuan). */
const urai = (s) => Number(String(s).replace(/\./g, '').replace(',', '.'));
const teksAngka = (n) => (n === undefined || n === null ? '' : ANGKA.format(n));

/**
 * Form angka bersama untuk ambang & tarif: setiap perubahan wajib alasan dan tercatat
 * (nilai lama → baru). `bilanganBulat` = ambang (tanpa desimal).
 */
function FormAngka({ judul, ket, daftar, nilai, bawaan, kirim, kunciData, bilanganBulat }) {
  const { kunci } = useLogDev();
  const [isi, setIsi] = useState(() =>
    Object.fromEntries(daftar.map((a) => [a.id, teksAngka(nilai[a.id])])),
  );
  const [alasan, setAlasan] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const angka = Object.fromEntries(daftar.map((a) => [a.id, urai(isi[a.id])]));
  const salah = daftar.find(
    (a) =>
      !Number.isFinite(angka[a.id]) ||
      angka[a.id] < (a.min ?? 0) ||
      (a.maks !== undefined && angka[a.id] > a.maks) ||
      (bilanganBulat && !Number.isInteger(angka[a.id])),
  );

  const simpan = async (e) => {
    e.preventDefault();
    setSibuk(true);
    try {
      await kirim({ [kunciData]: angka, alasan });
      showToast(`${judul} tersimpan.`);
      setAlasan('');
    } catch (err) {
      if (perluKunciUlang(err)) kunci('Ketik ulang kata sandi untuk melanjutkan.');
      else showToast(pesanGalat(err), 'error');
    } finally {
      setSibuk(false);
    }
  };

  return (
    <form onSubmit={simpan} className={`${K.kartu} flex flex-col gap-3.5`}>
      <div>
        <h2 className={K.judulSeksi}>{judul}</h2>
        <p className={K.redup}>{ket}</p>
      </div>
      {daftar.map((a) => (
        <label key={a.id} className="grid gap-1.5 sm:grid-cols-[1fr_150px] sm:items-center">
          <span>
            <span className={`${K.judulBaris} block`}>
              {a.label} <span className={K.redup}>({a.satuan})</span>
            </span>
            <span className={K.redup}>Bawaan {teksAngka(bawaan[a.id])}</span>
          </span>
          <input
            className={`${K.masukan} text-right`}
            inputMode={bilanganBulat ? 'numeric' : 'decimal'}
            value={isi[a.id]}
            aria-invalid={salah?.id === a.id ? 'true' : undefined}
            onChange={(e) =>
              setIsi((s) => ({ ...s, [a.id]: e.target.value.replace(/[^0-9.,]/g, '') }))
            }
          />
        </label>
      ))}
      {salah && <span className={K.pesanGalat}>Isian {salah.label} belum sah.</span>}
      <div>
        <label className={K.label} htmlFor={`alasan-${kunciData}`}>
          Alasan perubahan (wajib)
        </label>
        <input
          id={`alasan-${kunciData}`}
          className={K.masukan}
          maxLength={300}
          value={alasan}
          onChange={(e) => setAlasan(e.target.value)}
        />
      </div>
      <button type="submit" className={K.tombolUtama} disabled={sibuk || !!salah || !alasan.trim()}>
        {sibuk ? 'Menyimpan…' : `Simpan ${judul.toLowerCase()}`}
      </button>
    </form>
  );
}

/** Ambang anomali dan tarif perkiraan biaya Firebase. */
export default function Pengaturan() {
  const { data, memuat } = useTampilan('pengaturan');
  const [siap, setSiap] = useState(false);

  // Form baru dipasang setelah nilai tersimpan termuat (nilai awal form tidak berubah lagi)
  useEffect(() => {
    if (data?.ambang) setSiap(true);
  }, [data]);

  return (
    <Halaman
      judul="Pengaturan"
      sub="Batas anomali dan tarif untuk perkiraan biaya. Setiap perubahan tercatat di Akses & Segel."
    >
      {!siap ? (
        <p className={K.kosong}>{memuat ? 'Memuat…' : 'Gagal memuat.'}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 items-start">
          <FormAngka
            judul="Ambang anomali"
            ket="Kapan sebuah kejadian dianggap patut diperiksa."
            daftar={AMBANG}
            nilai={data.ambang}
            bawaan={data.bawaan}
            kirim={aturAmbang}
            kunciData="ambang"
            bilanganBulat
          />
          <FormAngka
            judul="Tarif & kuota gratis"
            ket="Untuk perkiraan biaya di halaman Firebase. Sesuaikan dengan Console › Billing (wilayah asia-southeast2). Desimal pakai koma."
            daftar={TARIF}
            nilai={data.tarif}
            bawaan={data.tarifBawaan}
            kirim={aturTarif}
            kunciData="tarif"
          />
        </div>
      )}
    </Halaman>
  );
}
