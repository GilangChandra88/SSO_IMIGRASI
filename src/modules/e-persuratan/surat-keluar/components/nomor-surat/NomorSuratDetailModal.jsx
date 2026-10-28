import React, { useState } from 'react';
import { FaBan, FaCopy, FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';
import { usePegawaiRingkas } from '@/context/usePegawaiRingkas';
import { PANJANG } from '@/utils/batas';
import { keDate } from '@/utils/nilai';
import { pesanGalat } from '@/utils/pesanGalat';
import { showToast } from '@/utils/toastStore';
import { ADMIN, FONT, STATUS, T } from '@/utils/uiTokens';
import { batalkanNomorSurat } from '../../services/nomorSurat';
import { LABEL_SUMBER, formatTanggalNomor, kodeKop, kodeLanjutan } from './nomorSuratTampil';

const waktu = (v) => keDate(v)?.toLocaleString('id-ID') || '-';

/**
 * Jendela "Lihat" satu nomor surat (`surat_nomor`). Keuangan bisa membatalkan nomor yang masih
 * aktif (wajib alasan); nomor yang batal tidak dipakai ulang.
 */
export default function NomorSuratDetailModal({ row, onClose }) {
  const { currentUser, isKeuangan } = useAuth();
  const { semua: pegawai } = usePegawaiRingkas();
  const namaAkun = (uid) => (uid && pegawai.find((p) => p.authUid === uid)?.nama) || '-';
  const [batal, setBatal] = useState(false);
  const [alasan, setAlasan] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const dibatalkan = row.status === 'batal';

  const salin = async () => {
    try {
      await navigator.clipboard.writeText(row.nomor);
      showToast('Nomor surat disalin.');
    } catch {
      showToast('Gagal menyalin nomor surat.', 'error');
    }
  };

  const konfirmBatal = async () => {
    if (!alasan.trim()) {
      showToast('Alasan pembatalan wajib diisi.', 'error');
      return;
    }
    setSibuk(true);
    try {
      await batalkanNomorSurat(row.id, alasan.trim(), currentUser?.uid || '');
      showToast(`Nomor ${row.nomor} dibatalkan.`);
      onClose();
    } catch (err) {
      showToast(pesanGalat(err, 'Gagal membatalkan nomor.'), 'error');
      setSibuk(false);
    }
  };

  const baris = [
    ['Tanggal', formatTanggalNomor(row.tanggal)],
    ['Sumber', LABEL_SUMBER[row.sumber] || '-'],
    ...(row.jenisSurat ? [['Jenis Surat', row.jenisSurat]] : []),
    ['Seksi', row.seksi || '-'],
    ['KOP', kodeKop(row)],
    ['Kode Surat', kodeLanjutan(row)],
    ['Perihal', row.perihal || '-'],
    ['Tujuan', row.tujuan || '-'],
    ['Dibuat oleh', namaAkun(row.dibuatOleh)],
    ['Dibuat pada', waktu(row.dibuatPada)],
    ...(dibatalkan
      ? [
          ['Dibatalkan', `${waktu(row.dibatalkanPada)} oleh ${namaAkun(row.dibatalkanOleh)}`],
          ['Alasan batal', row.alasanBatal || '-'],
        ]
      : []),
  ];

  return (
    <Modal
      onClose={sibuk ? undefined : onClose}
      widthClass="max-w-[480px]"
      labelledBy="judul-detail-nomor"
      dariTombol
    >
      <div className={ADMIN.modalBody}>
        <div className="flex justify-between items-start gap-3 mb-0.5">
          <h3 id="judul-detail-nomor" className={ADMIN.modalTitle}>
            Detail Nomor Surat
          </h3>
          <button
            type="button"
            className={ADMIN.modalClose}
            aria-label="Tutup"
            onClick={onClose}
            disabled={sibuk}
          >
            <FaTimes size={15} />
          </button>
        </div>
        <p
          className={`${FONT.mono} text-[13px] font-semibold mt-1 mb-[18px] break-all ${
            dibatalkan ? `line-through ${T.inkMuted}` : T.ink2
          }`}
        >
          {row.nomor}
          {dibatalkan && (
            <span
              className={`ml-2 no-underline inline-block text-[10.5px] font-bold px-1.5 py-0.5 rounded ${STATUS.critBg} ${STATUS.critInk}`}
            >
              Batal
            </span>
          )}
        </p>
        <div>
          {baris.map(([label, nilai]) => (
            <div className={ADMIN.viewRow} key={label}>
              <span className={`shrink-0 ${T.inkMuted}`}>{label}</span>
              <span className="font-semibold text-right break-words min-w-0">{nilai}</span>
            </div>
          ))}
        </div>

        {isKeuangan && !dibatalkan && !batal && (
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 mt-3.5 text-[12.5px] font-bold hover:underline ${STATUS.critInk}`}
            onClick={() => setBatal(true)}
          >
            <FaBan size={11} />
            Batalkan Nomor
          </button>
        )}

        {batal && (
          <div className="mt-4">
            <label className={ADMIN.label} htmlFor="alasanBatalNomor">
              Alasan pembatalan
            </label>
            <textarea
              id="alasanBatalNomor"
              rows={3}
              maxLength={PANJANG.alasanBatal}
              value={alasan}
              disabled={sibuk}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="Mis. salah kode surat, surat tidak jadi dikirim"
              className={`${ADMIN.input} resize-y`}
            />
            <p className={ADMIN.hint}>
              Nomor yang dibatalkan tetap tercatat dan tidak dipakai lagi.
            </p>
          </div>
        )}

        <div className={ADMIN.modalActions}>
          {batal ? (
            <>
              <button
                type="button"
                className={ADMIN.btnGhost}
                onClick={() => setBatal(false)}
                disabled={sibuk}
              >
                Kembali
              </button>
              <button
                type="button"
                className={ADMIN.btnSolid}
                onClick={konfirmBatal}
                disabled={sibuk || !alasan.trim()}
              >
                {sibuk ? 'Membatalkan…' : 'Ya, Batalkan'}
              </button>
            </>
          ) : (
            <>
              <button type="button" className={ADMIN.btnGhost} onClick={onClose}>
                Tutup
              </button>
              <button type="button" className={ADMIN.btnSolid} onClick={salin}>
                <span className="inline-flex items-center gap-2">
                  <FaCopy size={12} />
                  Salin Nomor
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
