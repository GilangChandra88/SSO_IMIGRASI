import { useEffect, useState } from 'react';
import { FaBirthdayCake, FaCheck, FaGift } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import { ANIM } from '@/utils/animasi';
import { pantauUcapanDari, pantauUltahHariIni } from '@/utils/ulangTahun';
import FotoWajah from './FotoWajah';
import ModalUcapan from './ModalUcapan';

/**
 * Banner Portal: siapa yang berulang tahun hari ini + tombol "Kirim Ucapan". Pegawai yang
 * berulang tahun hanya melihat sapaan untuk dirinya (bukan banner kirim ucapan untuk dirinya).
 */
export default function BannerUltah() {
  const { currentUser, userData } = useAuth();
  const [yangUltah, setYangUltah] = useState([]);
  const [terkirim, setTerkirim] = useState({});
  const [tujuan, setTujuan] = useState(null);
  const uid = currentUser?.uid;

  useEffect(() => pantauUltahHariIni(setYangUltah), []);

  useEffect(() => {
    if (!uid) return undefined;
    return pantauUcapanDari(uid, (daftar) =>
      setTerkirim(Object.fromEntries(daftar.map((u) => [u.untukId, u]))),
    );
  }, [uid]);

  const diriSendiri = (p) => p.id === userData?.id || (!!p.email && p.email === currentUser?.email);
  const sendiri = yangUltah.find(diriSendiri);
  const lain = yangUltah.filter((p) => !diriSendiri(p));
  if (!sendiri && !lain.length) return null;

  const namaPengirim = userData?.nama || currentUser?.email?.split('@')[0] || 'Rekan kerja';

  return (
    <div className="space-y-3">
      {sendiri && (
        <div
          className={`flex items-center gap-4 rounded-2xl p-5 bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm ${ANIM.muncul}`}
        >
          <span className="text-4xl" aria-hidden="true">
            🎉
          </span>
          <div className="min-w-0">
            <p className="font-bold text-lg">
              Selamat ulang tahun, {(sendiri.nama || '').split(/\s+/)[0]}!
            </p>
            <p className="text-sm text-white/85">
              Hari ini spesial untuk Anda. Ucapan dari rekan kerja akan muncul sebagai popup.
            </p>
          </div>
        </div>
      )}

      {lain.map((p) => {
        const kirim = terkirim[p.id];
        return (
          <div
            key={p.id}
            className={`flex flex-wrap items-center gap-4 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-sm ${ANIM.muncul}`}
          >
            <FotoWajah
              pegawai={p}
              className="w-12 h-12 rounded-full shrink-0 text-base ring-2 ring-amber-300 dark:ring-amber-500/50"
            />
            <div className="flex-1 min-w-[10rem]">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                <FaBirthdayCake /> Ulang tahun hari ini
              </p>
              <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{p.nama}</p>
              {p.jabatan && (
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{p.jabatan}</p>
              )}
            </div>
            {kirim ? (
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 ${ANIM.meletup}`}
              >
                <FaCheck size={11} />
                {kirim.terimaKasih ? 'Dibalas terima kasih 💛' : 'Ucapan terkirim'}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setTujuan(p)}
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors active:scale-95"
              >
                <FaGift /> Kirim Ucapan
              </button>
            )}
          </div>
        );
      })}

      {tujuan && uid && (
        <ModalUcapan
          pegawai={tujuan}
          dari={{ uid, nama: namaPengirim }}
          onClose={() => setTujuan(null)}
        />
      )}
    </div>
  );
}
