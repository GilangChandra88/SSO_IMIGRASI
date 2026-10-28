import { useState } from 'react';
import { FaTimes, FaUserShield } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { showToast } from '@/utils/toastStore';
import { KETERANGAN_PERAN, LABEL_PERAN, PERAN_KHUSUS, peranDariKlaim } from '@/utils/peran';
import { aturPeran, pesanGalat } from '../services/pegawaiDb';

/** Mengatur peran khusus lewat Cloud Function aturPeran (hanya Super Admin, bukan akun sendiri). */
export default function ModalAturPeran({ pegawai, onClose }) {
  const [pilihan, setPilihan] = useState(() => peranDariKlaim({ peran: pegawai.peran }));
  const [proses, setProses] = useState(false);

  const ubah = (r) =>
    setPilihan((d) =>
      d.includes(r)
        ? d.filter((x) => x !== r)
        : PERAN_KHUSUS.filter((x) => x === r || d.includes(x)),
    );

  async function simpan() {
    setProses(true);
    try {
      await aturPeran(pegawai.id, pilihan);
      showToast(`Peran ${pegawai.nama} diperbarui.`);
      onClose();
    } catch (err) {
      showToast(pesanGalat(err, 'Peran gagal diubah.'), 'error');
    } finally {
      setProses(false);
    }
  }

  return (
    <Modal
      onClose={proses ? () => {} : onClose}
      labelledBy="judul-atur-peran"
      widthClass="max-w-lg"
    >
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <h2 id="judul-atur-peran" className="font-bold text-lg text-slate-800 dark:text-slate-100">
          Atur Peran · {pegawai.nama}
        </h2>
        <button
          type="button"
          onClick={onClose}
          disabled={proses}
          aria-label="Tutup"
          className="text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg"
        >
          <FaTimes />
        </button>
      </div>
      <div className="p-6">
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
          Boleh lebih dari satu; tanpa centang = Pegawai biasa. Perubahan berlaku pada sesi pegawai
          dalam beberapa detik dan tercatat di log sistem.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PERAN_KHUSUS.map((r) => {
            const aktif = pilihan.includes(r);
            return (
              <label
                key={r}
                className={`flex items-start gap-2 p-3 rounded-lg border text-sm cursor-pointer ${
                  aktif
                    ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-500/10'
                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                }`}
              >
                <input
                  type="checkbox"
                  checked={aktif}
                  onChange={() => ubah(r)}
                  className="mt-0.5 accent-indigo-600"
                />
                <span>
                  <span className="block font-bold text-slate-800 dark:text-slate-100">
                    {LABEL_PERAN[r]}
                  </span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                    {KETERANGAN_PERAN[r]}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        <div className="pt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={proses}
            className="flex-1 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={simpan}
            disabled={proses}
            className="flex-1 bg-indigo-600 text-white font-bold py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <FaUserShield size={13} /> {proses ? 'Menyimpan…' : 'Simpan Peran'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
