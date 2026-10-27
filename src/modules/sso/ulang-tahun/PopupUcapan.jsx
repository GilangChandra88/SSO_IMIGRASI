import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Modal from '@/components/Modal';
import { T, BTN, FONT, NAVY } from '@/utils/uiTokens';
import { ANIM, jedaKe } from '@/utils/animasi';
import { JEDA_POPUP_MS, balasTerimaKasih, pantauUcapanUntuk } from '@/utils/ulangTahun';
import { useKejutanAktif } from './kejutanAktif';

/**
 * Popup ucapan ulang tahun untuk pegawai yang menerimanya (dipasang global di App, tampil di
 * halaman mana pun). Muncul begitu ada ucapan yang belum dibalas; bila ditutup tanpa
 * "Terima kasih", muncul lagi setelah JEDA_POPUP_MS, atau segera bila ada ucapan baru masuk.
 * Menunggu bila captcha ulang tahun sedang tampil.
 */
export default function PopupUcapan() {
  const { userData } = useAuth();
  const kejutanAktif = useKejutanAktif();
  const pegawaiId = userData?.id;
  const [ucapan, setUcapan] = useState([]);
  const [tunda, setTunda] = useState(null); // { sampai, ids: Set } saat "Nanti saja"
  const [mengirim, setMengirim] = useState(false);
  const [galat, setGalat] = useState('');

  useEffect(() => {
    setTunda(null);
    if (!pegawaiId) {
      setUcapan([]);
      return undefined;
    }
    return pantauUcapanUntuk(pegawaiId, (daftar) =>
      setUcapan(daftar.filter((u) => !u.terimaKasih)),
    );
  }, [pegawaiId]);

  useEffect(() => {
    if (!tunda) return undefined;
    const t = setTimeout(() => setTunda(null), Math.max(tunda.sampai - Date.now(), 0));
    return () => clearTimeout(t);
  }, [tunda]);

  const adaBaru = !tunda || ucapan.some((u) => !tunda.ids.has(u.id));
  if (kejutanAktif || !ucapan.length || !adaBaru) return null;

  const nanti = () => {
    setGalat('');
    setTunda({ sampai: Date.now() + JEDA_POPUP_MS, ids: new Set(ucapan.map((u) => u.id)) });
  };

  const terimaKasih = async () => {
    setMengirim(true);
    setGalat('');
    try {
      await balasTerimaKasih(ucapan.map((u) => u.id));
    } catch {
      setGalat('Gagal menyimpan. Periksa koneksi lalu coba lagi.');
    } finally {
      setMengirim(false);
    }
  };

  return (
    <Modal onClose={nanti} widthClass="max-w-[460px]" labelledBy="judul-popup-ucapan">
      <div className={`${NAVY.gradient} text-white px-6 py-5`}>
        <p className="text-3xl" aria-hidden="true">
          💌
        </p>
        <h2 id="judul-popup-ucapan" className={`${FONT.head} text-lg font-bold mt-1`}>
          Ada ucapan ulang tahun untuk Anda!
        </h2>
        <p className="text-sm text-white/75">{ucapan.length} rekan kerja mengirim ucapan.</p>
      </div>

      <div className="px-6 py-4 space-y-2.5 max-h-[45vh] overflow-y-auto">
        {ucapan.map((u, i) => (
          <div
            key={u.id}
            className={`${T.surface2} rounded-xl px-4 py-3 ${ANIM.muncul} ${jedaKe(i)}`}
          >
            <p className={`text-[13.5px] whitespace-pre-line break-words ${T.ink}`}>{u.pesan}</p>
            <p className={`text-[11.5px] font-semibold mt-1.5 ${T.ink2}`}>— {u.dariNama}</p>
          </div>
        ))}
      </div>

      <div className={`px-6 pb-5 pt-1`}>
        {galat && <p className="text-[12px] font-semibold text-[#d93025] mb-2">{galat}</p>}
        <p className={`text-[11.5px] ${T.inkMuted} mb-3`}>
          Popup ini muncul lagi sampai Anda mengucapkan terima kasih. 😄
        </p>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={nanti} className={BTN.ghost}>
            Nanti saja
          </button>
          <button
            type="button"
            onClick={terimaKasih}
            disabled={mengirim}
            className={BTN.primaryDark}
          >
            {mengirim ? 'Menyimpan…' : 'Terima kasih 🙏'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
