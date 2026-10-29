/**
 * Tampilan "Berkas Verifikasi" Dashboard Keuangan (Dashboard2 purwarupa admin): sambutan + tombol
 * Mulai Verifikasi, kartu jumlah per tahap (menuju tab Berkas Verifikasi), Perlu Diproses,
 * Progres Pengarsipan, dan Aktivitas Terbaru.
 * - Angka per tahap & per jenis: Function hitungTahapLpj (`rekap`, dari Dashboard).
 * - Daftar Perlu Diproses & aktivitas: `lpj_ringkas` tahap Verifikasi → Arsip (listener, 50 per
 *   halaman). Setiap ada berkas yang pindah tahap, `onTahapBerubah` meminta angka dihitung ulang.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaClipboardCheck } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import { FONT, T } from '@/utils/uiTokens';
import { ANIM, jedaKe } from '@/utils/animasi';
import { useMunculBerurutan } from '@/components/animasi';
import { useDaftarBerkas } from '@/modules/e-persuratan/lpj';
import { aktivitasTerbaru } from '../utils/aktivitas';
import { TAHAP_PROSES } from '../utils/tahap';
import { JUDUL, KARTU, LATAR_SAMBUTAN_VERIF } from '../ui/kelas';
import DaftarAktivitas from './DaftarAktivitas';
import KartuTahap from './KartuTahap';
import PerluDiproses from './PerluDiproses';
import ProgresArsip from './ProgresArsip';
import TombolSambutan from './TombolSambutan';

const BASE = '/e-persuratan/verifikasi';

export default function PanelVerifikasi({
  tabs,
  rekap,
  galat,
  tahunAnggaran,
  tanggal,
  namaDepan,
  onTahapBerubah,
}) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const uid = currentUser?.uid || '';
  const daftar = useDaftarBerkas({ uid, semua: true, tahunAnggaran, tahap: TAHAP_PROSES });
  const { berkas, memuat } = daftar;

  // Berkas masuk/keluar/pindah tahap (listener) → angka per tahap dihitung ulang
  const sidik = memuat ? null : berkas.map((r) => `${r.id}:${r.tahap}`).join();
  const sidikLama = useRef(null);
  useEffect(() => {
    if (sidik == null) return;
    if (sidikLama.current != null && sidikLama.current !== sidik) onTahapBerubah();
    sidikLama.current = sidik;
  }, [sidik, onTahapBerubah]);

  const aktivitas = useMemo(() => aktivitasTerbaru(berkas, 6), [berkas]);
  const kpiRef = useMunculBerurutan('kpi');

  const keTab = (tahap) => navigate(`${BASE}?tab=${tahap}`);
  // Verifikasi → halaman verifikasi berkas; tahap lain → jendela aksinya di Berkas Verifikasi
  const buka = (r) =>
    r.tahap === 'verif'
      ? navigate(`${BASE}/${r.id}`)
      : navigate(`${BASE}?tab=${r.tahap}`, { state: { buka: r.id } });

  const menunggu = rekap?.tahap?.verif;
  let keteranganCta = 'Belum ada berkas menunggu';
  if (!rekap) keteranganCta = galat ? 'Buka daftar berkas' : 'Menghitung berkas…';
  else if (menunggu > 0) keteranganCta = `${menunggu} berkas menunggu diperiksa`;

  return (
    <div className={`min-h-full ${T.ground}`}>
      <div
        className={`${FONT.body} @container/d2 w-full max-w-[1400px] mx-auto flex flex-col gap-[22px] px-8 pt-7 pb-16 max-[760px]:gap-[18px] max-[760px]:px-3.5 max-[760px]:pt-4 max-[760px]:pb-[100px]`}
      >
        {/* Sambutan (kartu angka di bawahnya menumpang di tepi bawah) */}
        <section
          className={`relative overflow-hidden grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-[26px] rounded-[28px] border border-white/6 pt-[30px] px-[34px] pb-[86px] -mb-20 text-[#EAF0FA] ${LATAR_SAMBUTAN_VERIF} @min-[1240px]/d2:pb-[62px] @min-[1240px]/d2:-mb-[62px] max-[760px]:flex max-[760px]:flex-col max-[760px]:items-stretch max-[760px]:gap-5 max-[760px]:rounded-[24px] max-[760px]:pt-[22px] max-[760px]:px-[18px] max-[760px]:pb-[74px] max-[760px]:-mb-[66px] ${ANIM.muncul}`}
        >
          <div className="min-w-0">
            <p className="mb-2 text-xs font-bold tracking-[.08em] uppercase text-[#B7C7DE] dark:text-[#8FA6C4]">
              {tanggal}
            </p>
            <h1
              className={`${FONT.head} text-[clamp(26px,3.4vw,36px)] font-extrabold tracking-[-.025em] leading-[1.1] text-white`}
            >
              Selamat datang kembali, {namaDepan}
            </h1>
            <p className="mt-2.5 max-w-[54ch] text-[14.5px] leading-normal text-[#B7C7DE] dark:text-[#8FA6C4]">
              Periksa kelengkapan berkas pegawai dan pastikan setiap tahap berjalan tepat waktu.
            </p>
          </div>
          <TombolSambutan
            ikon={FaClipboardCheck}
            judul="Mulai Verifikasi"
            keterangan={keteranganCta}
            onClick={() => keTab('verif')}
            className="justify-self-end w-[296px] max-w-full max-[760px]:w-full"
          />
          <div className="col-span-2 justify-self-start max-[760px]:w-full">{tabs}</div>
        </section>

        {/* Jumlah berkas per tahap */}
        <div
          ref={kpiRef}
          role="group"
          aria-label="Jumlah berkas per tahap"
          className="relative z-[1] grid grid-cols-2 gap-3.5 px-[22px] max-[760px]:gap-2.5 max-[760px]:px-2 @min-[900px]/d2:grid-cols-6 @min-[1240px]/d2:grid-cols-5"
        >
          {[...TAHAP_PROSES, 'draft'].map((k) => (
            <KartuTahap
              key={k}
              tahap={k}
              jumlah={rekap?.tahap?.[k] ?? null}
              galat={galat && !rekap}
              onClick={() => keTab(k)}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-[18px] items-stretch max-[1180px]:grid-cols-2 max-[760px]:grid-cols-1">
          <PerluDiproses {...daftar} onBuka={buka} />
          <ProgresArsip rekap={rekap} galat={galat && !rekap} />
          <section
            aria-label="Aktivitas terbaru"
            className={`${KARTU} col-span-2 max-[1180px]:col-span-full ${ANIM.muncul} ${jedaKe(2)}`}
          >
            <h2 className={`${JUDUL} mb-3.5`}>Aktivitas Terbaru</h2>
            {memuat ? (
              <div className="animate-pulse grid grid-cols-2 gap-x-7 gap-y-5 max-[760px]:grid-cols-1">
                {[1, 2].map((i) => (
                  <div key={i} className={`h-10 rounded-xl ${T.surface2}`} />
                ))}
              </div>
            ) : (
              <DaftarAktivitas aktivitas={aktivitas} uid={uid} dua />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
