import { useState } from 'react';
import { FaPaperPlane } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { T, BTN, FONT, FORM } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';
import { showToast } from '@/utils/toastStore';
import { MAKS_UCAPAN, kirimUcapan } from '@/utils/ulangTahun';

const SARAN = [
  'Selamat ulang tahun! 🎂',
  'Panjang umur dan sehat selalu 🙏',
  'Semoga makin sukses dan bahagia ✨',
  'Traktirannya ditunggu ya 😄',
];

/** Jendela menulis ucapan untuk rekan kerja yang berulang tahun. */
export default function ModalUcapan({ pegawai, dari, onClose }) {
  const [pesan, setPesan] = useState('');
  const [mengirim, setMengirim] = useState(false);

  const tambahSaran = (s) =>
    setPesan((p) => (p.trim() ? `${p.trim()} ${s}` : s).slice(0, MAKS_UCAPAN));

  const kirim = async (e) => {
    e.preventDefault();
    if (!pesan.trim()) return;
    setMengirim(true);
    try {
      await kirimUcapan({ untuk: pegawai, dariUid: dari.uid, dariNama: dari.nama, pesan });
      showToast(`Ucapan untuk ${pegawai.nama} terkirim 🎉`);
      onClose();
    } catch {
      showToast('Gagal mengirim ucapan. Coba lagi.', 'error');
      setMengirim(false);
    }
  };

  return (
    <Modal onClose={onClose} labelledBy="judul-kirim-ucapan" dariTombol>
      <form onSubmit={kirim} className="p-6">
        <h2 id="judul-kirim-ucapan" className={`${FONT.head} text-lg font-bold`}>
          Ucapan untuk {pegawai.nama} 🎂
        </h2>
        <p className={`text-sm ${T.ink2} mt-1 mb-4`}>
          Ucapan langsung muncul sebagai popup di akunnya.
        </p>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {SARAN.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => tambahSaran(s)}
              className={`${BTN.xs} ${ANIM.pilih}`}
            >
              {s}
            </button>
          ))}
        </div>

        <label htmlFor="isi-ucapan" className={FORM.label}>
          Pesan
        </label>
        <textarea
          id="isi-ucapan"
          autoFocus
          required
          rows={4}
          maxLength={MAKS_UCAPAN}
          value={pesan}
          onChange={(e) => setPesan(e.target.value)}
          placeholder="Tulis ucapan singkat…"
          className={FORM.textarea}
        />
        <p className={`${FORM.hint} text-right`}>
          {pesan.length}/{MAKS_UCAPAN}
        </p>

        <div className="flex gap-2 justify-end mt-4">
          <button type="button" onClick={onClose} className={BTN.ghost}>
            Batal
          </button>
          <button type="submit" disabled={mengirim || !pesan.trim()} className={BTN.primaryDark}>
            <FaPaperPlane size={12} /> {mengirim ? 'Mengirim…' : 'Kirim Ucapan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
