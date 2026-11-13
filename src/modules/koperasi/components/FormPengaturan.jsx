import { useState } from 'react';
import { pesanGalat } from '@/utils/pesanGalat';
import { showToast } from '@/utils/toastStore';
import { K } from '../ui/kelas';
import { simpanPengaturan } from '../services/fungsi';
import { BAGIAN_SHU } from '../data/shu';
import MasukanRupiah from './MasukanRupiah';

/**
 * Pengaturan koperasi: `bagian` = 'simpanan' (nominal) atau 'shu' (persentase alokasi).
 * Keduanya disimpan bersama lewat Function, jadi bagian lain ikut terkirim apa adanya.
 */
export default function FormPengaturan({ pengaturan, bagian }) {
  const [pokok, setPokok] = useState(pengaturan.nominalPokok);
  const [wajib, setWajib] = useState(pengaturan.nominalWajib);
  const [alokasi, setAlokasi] = useState(pengaturan.alokasiShu);
  const [sibuk, setSibuk] = useState(false);
  const total = Object.values(alokasi).reduce((n, v) => n + (Number(v) || 0), 0);

  const simpan = async (e) => {
    e.preventDefault();
    setSibuk(true);
    try {
      await simpanPengaturan({ nominalPokok: pokok, nominalWajib: wajib, alokasiShu: alokasi });
      showToast('Pengaturan tersimpan.');
    } catch (err) {
      showToast(pesanGalat(err), 'error');
    } finally {
      setSibuk(false);
    }
  };

  return (
    <form className={`${K.kartu} flex flex-col gap-3.5 max-w-xl`} onSubmit={simpan}>
      {bagian === 'simpanan' ? (
        <>
          <label>
            <span className={K.label}>Simpanan pokok (sekali bayar)</span>
            <MasukanRupiah nilai={pokok} onUbah={setPokok} />
          </label>
          <label>
            <span className={K.label}>Simpanan wajib per bulan</span>
            <MasukanRupiah nilai={wajib} onUbah={setWajib} />
          </label>
          <p className={K.redup}>Nominal sama untuk anggota pegawai dan anggota luar.</p>
        </>
      ) : (
        <>
          {BAGIAN_SHU.map((b) => (
            <label key={b.id} className="flex items-center gap-3">
              <span className={`${K.teks} flex-1 min-w-0`}>{b.label}</span>
              <span className="w-20 shrink-0">
                <input
                  className={`${K.masukan} text-right`}
                  inputMode="numeric"
                  aria-label={`Persentase ${b.label}`}
                  value={alokasi[b.id] ?? 0}
                  onChange={(e) =>
                    setAlokasi((s) => ({
                      ...s,
                      [b.id]: Math.min(100, Number(e.target.value.replace(/[^0-9]/g, '')) || 0),
                    }))
                  }
                />
              </span>
              <span className={K.teks}>%</span>
            </label>
          ))}
          <div className={K.barisTotal}>
            <span className={K.judulBaris}>Total</span>
            <span className={total === 100 ? K.nominal : K.pesanGalat}>{total}%</span>
          </div>
          {total !== 100 && <span className={K.pesanGalat}>Total persentase harus 100%.</span>}
        </>
      )}
      <button
        type="submit"
        className={K.tombolUtama}
        disabled={sibuk || total !== 100 || !pokok || !wajib}
      >
        {sibuk ? 'Menyimpan…' : 'Simpan'}
      </button>
    </form>
  );
}
