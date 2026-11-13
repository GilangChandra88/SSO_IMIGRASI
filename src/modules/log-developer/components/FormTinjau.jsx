import { useState } from 'react';
import { showToast } from '@/utils/toastStore';
import { pesanGalat } from '@/utils/pesanGalat';
import { perluKunciUlang } from '../services/logDev';
import { useLogDev } from '../konteks/konteks';
import { K } from '../ui/kelas';

/**
 * Tinjau anomali/galat: pilih status + catatan wajib. `kirim({ id, status, catatan })` = Function.
 * Tinjauan tercatat di log (siapa, kapan, status lama → baru, catatan).
 */
export default function FormTinjau({ id, statusKini, pilihan, kirim, onSelesai }) {
  const { kunci } = useLogDev();
  const [status, setStatus] = useState(statusKini === 'baru' ? pilihan[1].id : statusKini);
  const [catatan, setCatatan] = useState('');
  const [sibuk, setSibuk] = useState(false);

  const simpan = async (e) => {
    e.preventDefault();
    setSibuk(true);
    try {
      await kirim({ id, status, catatan });
      showToast('Tinjauan tersimpan.');
      onSelesai();
    } catch (err) {
      if (perluKunciUlang(err)) kunci('Ketik ulang kata sandi untuk melanjutkan.');
      else showToast(pesanGalat(err), 'error');
    } finally {
      setSibuk(false);
    }
  };

  return (
    <form onSubmit={simpan} className="flex flex-col gap-3 mt-4">
      <div>
        <label className={K.label} htmlFor={`status-${id}`}>
          Status
        </label>
        <select
          id={`status-${id}`}
          className={K.masukan}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {pilihan.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={K.label} htmlFor={`catatan-${id}`}>
          Catatan pemeriksaan (wajib)
        </label>
        <textarea
          id={`catatan-${id}`}
          className={`${K.masukan} py-2 min-h-20`}
          maxLength={500}
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          placeholder="Hasil pengecekan, tindakan, atau alasan dianggap wajar"
        />
      </div>
      <button type="submit" className={K.tombolUtama} disabled={sibuk || !catatan.trim()}>
        {sibuk ? 'Menyimpan…' : 'Simpan tinjauan'}
      </button>
    </form>
  );
}
