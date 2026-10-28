import { useEffect, useRef } from 'react';
import { FaExclamationTriangle, FaFileExcel, FaPen, FaTrashAlt } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { STATUS, T } from '@/utils/uiTokens';
import { BIRU, K } from '../ui/kelas';
import { useEscape } from '../hooks/useEscape';

const IKON = {
  hapus: FaTrashAlt,
  ubah: FaPen,
  ekspor: FaFileExcel,
  peringatan: FaExclamationTriangle,
};

/**
 * Konfirmasi sebelum hapus (nada 'bahaya') atau simpan/ekspor (nada 'biasa'), supaya aksi tidak
 * terjadi karena salah klik (KonfirmasiHapus purwarupa).
 * terblokir: aksi tidak boleh dilakukan; popup hanya menjelaskan alasannya (galat), tombol Ya disembunyikan.
 * rincian: [{ label, nilai, mono }] ringkasan data yang terkena aksi. peringatan: catatan kuning.
 * sibuk: aksi sedang berjalan (tombol dinonaktifkan). children: isian tambahan (mis. alasan batal).
 * yaNonaktif: tombol Ya dinonaktifkan (mis. alasan belum diisi).
 */
export default function KonfirmasiAksi({
  judul,
  teks,
  rincian = [],
  peringatan,
  galat,
  terblokir = false,
  nada = 'bahaya',
  ikon,
  labelYa = 'Ya, Hapus',
  labelBatal,
  sibuk = false,
  yaNonaktif = false,
  children,
  onYa,
  onBatal,
}) {
  const batalRef = useRef(null);
  const bahaya = terblokir || nada === 'bahaya';
  const Ikon = IKON[terblokir ? 'peringatan' : ikon || (nada === 'bahaya' ? 'hapus' : 'ubah')];
  useEscape(onBatal);
  useEffect(() => {
    batalRef.current?.focus(); // fokus awal di tombol aman agar Enter tidak langsung mengeksekusi
  }, []);

  return (
    <Modal onClose={onBatal} labelledBy="konf-judul" widthClass="max-w-[440px]" lembar>
      <div className={K.popupIsi} role="alertdialog" aria-describedby="konf-isi">
        <div className="flex gap-3.5 items-start">
          <span
            className={`shrink-0 w-11 h-11 rounded-full inline-flex items-center justify-center ${
              bahaya ? `${STATUS.critBg} ${STATUS.critInk}` : `${BIRU.soft} ${BIRU.text}`
            }`}
            aria-hidden="true"
          >
            <Ikon size={18} />
          </span>
          <div>
            <h2 className={K.popupJudul} id="konf-judul">
              {judul}
            </h2>
            <p className={`mt-1 text-sm leading-[1.45] ${T.inkMuted}`} id="konf-isi">
              {teks}
            </p>
          </div>
        </div>

        {rincian.length > 0 && (
          <dl
            className={`m-0 px-3.5 py-3 rounded-[10px] border flex flex-col gap-2 ${T.surface2} ${T.border}`}
          >
            {rincian.map((r) => (
              <div key={r.label} className="flex justify-between gap-4 text-sm">
                <dt className={`shrink-0 ${T.inkMuted}`}>{r.label}</dt>
                <dd
                  className={`m-0 text-right min-w-0 [overflow-wrap:anywhere] ${r.mono ? K.mono : ''}`}
                >
                  {r.nilai}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {children}

        {galat && (
          <div className={K.galat} role="alert">
            {galat}
          </div>
        )}
        {peringatan && (
          <div className={K.peringatan} role="note">
            {peringatan}
          </div>
        )}

        <div className="flex justify-end gap-3 max-[520px]:flex-col-reverse">
          <button
            ref={batalRef}
            className={`${K.btn} max-[520px]:w-full`}
            type="button"
            onClick={onBatal}
          >
            {labelBatal || (terblokir ? 'Tutup' : 'Batal')}
          </button>
          {!terblokir && (
            <button
              className={`${nada === 'bahaya' ? K.btnBahaya : K.btnUtama} max-[520px]:w-full`}
              type="button"
              disabled={sibuk || yaNonaktif}
              onClick={onYa}
            >
              {sibuk ? 'Memproses…' : labelYa}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
