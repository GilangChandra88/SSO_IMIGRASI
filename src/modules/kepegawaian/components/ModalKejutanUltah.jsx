import { useEffect, useState } from 'react';
import { FaPlay, FaRedo } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { T, BTN, FONT, FORM } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';
import { showToast } from '@/utils/toastStore';
import {
  adalahUltahHariIni,
  ambilStatusUltah,
  formatTanggal,
  resetUltah,
  tahunIni,
} from '@/utils/ulangTahun';

/**
 * Status & pengujian kejutan ulang tahun seorang pegawai (Kepegawaian): captcha tahun ini sudah
 * dilihat atau belum, jumlah ucapan, pratinjau ("Uji Tampilan"), dan reset. Tanda "sudah dibalas"
 * hanya bisa diisi penerimanya (rules), jadi reset ucapan = menghapus ucapan tahun ini.
 */
export default function ModalKejutanUltah({ pegawai, uid, onUji, onClose }) {
  const [status, setStatus] = useState(null);
  const [galat, setGalat] = useState('');
  const [kejutan, setKejutan] = useState(true);
  const [hapusUcapan, setHapusUcapan] = useState(false);
  const [mereset, setMereset] = useState(false);
  const [versi, setVersi] = useState(0);

  useEffect(() => {
    let batal = false;
    setGalat('');
    ambilStatusUltah(pegawai.id)
      .then((s) => !batal && setStatus(s))
      .catch(() => !batal && setGalat('Tidak punya akses atau gagal memuat status.'));
    return () => {
      batal = true;
    };
  }, [pegawai.id, versi]);

  const reset = async () => {
    setMereset(true);
    try {
      await resetUltah(pegawai.id, { kejutan, hapusUcapan }, uid);
      showToast('Kejutan ulang tahun direset.');
      setVersi((v) => v + 1);
    } catch {
      showToast('Gagal mereset. Coba lagi.', 'error');
    } finally {
      setMereset(false);
    }
  };

  const jumlahFoto = pegawai.fotoPaths?.length || 0;
  const sudahDilihat = status?.kejutanTahun === tahunIni();
  const belumDibalas = status?.ucapan.filter((u) => !u.terimaKasih).length ?? 0;
  const baris = [
    ['Tanggal lahir', formatTanggal(pegawai.tanggalLahir) || 'Belum diisi'],
    ['Ulang tahun hari ini', adalahUltahHariIni(pegawai.tanggalLahir) ? 'Ya 🎂' : 'Tidak'],
    ['Foto captcha', jumlahFoto ? `${jumlahFoto} foto` : 'Belum ada (memakai inisial)'],
    [`Captcha ${tahunIni()}`, status ? (sudahDilihat ? 'Sudah dilihat' : 'Belum dilihat') : '…'],
    [
      `Ucapan ${tahunIni()}`,
      status ? `${status.ucapan.length} ucapan, ${belumDibalas} belum dibalas` : '…',
    ],
  ];

  return (
    <Modal onClose={onClose} widthClass="max-w-[480px]" labelledBy="judul-kejutan-ultah" dariTombol>
      <div className="p-6">
        <h2 id="judul-kejutan-ultah" className={`${FONT.head} text-lg font-bold`}>
          Kejutan Ulang Tahun
        </h2>
        <p className={`text-sm ${T.ink2} mt-0.5`}>{pegawai.nama}</p>

        <dl className={`mt-4 rounded-xl border ${T.border} divide-y ${T.divide}`}>
          {baris.map(([label, isi]) => (
            <div key={label} className="flex justify-between gap-3 px-4 py-2.5 text-[13px]">
              <dt className={T.ink2}>{label}</dt>
              <dd className="font-semibold text-right">{isi}</dd>
            </div>
          ))}
        </dl>
        {galat && <p className={FORM.err}>{galat}</p>}

        {!pegawai.tanggalLahir && (
          <p className={`${FORM.hint} mt-3`}>
            Tanggal lahir belum diisi, jadi kejutan tidak akan muncul otomatis saat login.
          </p>
        )}

        <h3 className={`${FORM.cardTitle} mt-5 mb-2`}>Reset untuk pengujian</h3>
        <label className="flex items-start gap-2.5 text-[13px] cursor-pointer">
          <input
            type="checkbox"
            checked={kejutan}
            onChange={(e) => setKejutan(e.target.checked)}
            className="mt-0.5 accent-[#0f2040]"
          />
          Tampilkan lagi captcha pada login berikutnya
        </label>
        <label className="flex items-start gap-2.5 text-[13px] cursor-pointer mt-2">
          <input
            type="checkbox"
            checked={hapusUcapan}
            onChange={(e) => setHapusUcapan(e.target.checked)}
            className="mt-0.5 accent-[#0f2040]"
          />
          Hapus semua ucapan tahun ini untuk pegawai ini
        </label>

        <p className={`${FORM.hint} mt-4`}>
          Uji penuh: isi tanggal lahir pegawai ini dengan tanggal hari ini, reset, lalu login dengan
          akunnya. "Uji Tampilan" hanya menampilkan captcha untuk Anda tanpa mencatat apa pun.
        </p>

        <div className="flex flex-wrap gap-2 justify-end mt-5">
          <button type="button" onClick={onClose} className={BTN.ghost}>
            Tutup
          </button>
          <button type="button" onClick={onUji} className={`${BTN.ghost} ${ANIM.tekan}`}>
            <FaPlay size={11} /> Uji Tampilan
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={mereset || (!kejutan && !hapusUcapan)}
            className={BTN.primaryDark}
          >
            <FaRedo size={11} /> {mereset ? 'Mereset…' : 'Reset'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
