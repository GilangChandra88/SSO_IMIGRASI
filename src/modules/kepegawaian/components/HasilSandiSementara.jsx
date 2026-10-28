import { useState } from 'react';
import { FaCheck, FaCheckCircle, FaCopy, FaExclamationTriangle } from 'react-icons/fa';
import { ANIM } from '@/utils/animasi';
import { K } from '../ui/kelas';

/** Pesan siap kirim ke pegawai: alamat login, e-mail, kata sandi sementara, dan kewajiban ganti. */
const pesanAkun = (email, sandi) =>
  [
    'Akun Portal Kantor Imigrasi Kelas II TPI Buleleng',
    `Alamat login: ${window.location.origin}/login`,
    `E-mail: ${email}`,
    `Kata sandi sementara: ${sandi}`,
    '',
    'Setelah login, Anda wajib mengganti kata sandi ini. Jangan bagikan pesan ini ke orang lain.',
  ].join('\n');

/**
 * Hasil pembuatan/pengaturan ulang akun: e-mail login dan kata sandi sementara yang hanya tampil
 * SEKALI, tombol salin sandi saja atau salin akun + sandi (pesan siap kirim ke pegawai), dan
 * pengingat cara menyerahkannya. Dipakai Buat Akun dan Atur Ulang Sandi.
 * @param {{ pesan: import('react').ReactNode, email: string, sandi: string,
 *   onSelesai: () => void }} props
 */
export default function HasilSandiSementara({ pesan, email, sandi, onSelesai }) {
  const [tersalin, setTersalin] = useState(''); // '' | 'sandi' | 'akun'

  async function salin(jenis) {
    try {
      await navigator.clipboard.writeText(jenis === 'akun' ? pesanAkun(email, sandi) : sandi);
      setTersalin(jenis);
    } catch {
      setTersalin('');
    }
  }

  return (
    <div className={`mt-4 ${ANIM.muncul}`}>
      <p className={K.berhasil}>
        <FaCheckCircle className="mt-0.5 shrink-0" />
        <span>{pesan}</span>
      </p>
      <p className={K.label}>E-mail login</p>
      <p
        className={`px-[13px] py-2.5 rounded-[10px] ${K.permukaan2} ${K.teks} text-sm break-all mb-3`}
      >
        {email}
      </p>
      <p className={K.label}>Kata sandi sementara</p>
      <div className="flex items-center gap-2">
        <code
          className={`flex-1 px-[13px] py-2.5 rounded-[10px] ${K.permukaan2} ${K.mono} text-sm select-all break-all`}
        >
          {sandi}
        </code>
        <button
          type="button"
          onClick={() => salin('sandi')}
          className={K.tombolKecil}
          aria-label="Salin kata sandi saja"
          title="Salin kata sandi saja"
        >
          {tersalin === 'sandi' ? <FaCheck size={11} /> : <FaCopy size={12} />}
          {tersalin === 'sandi' ? 'Tersalin' : 'Salin'}
        </button>
      </div>
      <button
        type="button"
        onClick={() => salin('akun')}
        className={`${K.tombolKecil} w-full justify-center mt-3`}
      >
        {tersalin === 'akun' ? (
          <FaCheck size={11} className={K.teksOk} />
        ) : (
          <FaCopy size={12} className={K.aksen} />
        )}
        {tersalin === 'akun' ? 'Akun & sandi tersalin' : 'Salin Akun & Sandi (siap kirim)'}
      </button>
      <p className={`${K.peringatan} mt-4`}>
        <FaExclamationTriangle className="mt-0.5 shrink-0" />
        <span>
          Kata sandi ini hanya tampil sekali. Kirim lewat pesan pribadi ke pegawai yang bersangkutan
          (jangan di grup chat); pegawai wajib menggantinya saat login berikutnya.
        </span>
      </p>
      <div className={K.modalAksi}>
        <button type="button" onClick={onSelesai} className={K.tombolUtama}>
          Selesai
        </button>
      </div>
    </div>
  );
}
