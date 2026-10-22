import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaFileImport } from 'react-icons/fa';
import ToastViewport from '@/components/ToastViewport';
import { ADMIN, FONT, FORM, T } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';
import { useStatusAgen } from '../hooks/useStatusAgen';
import { useHalaman } from '../hooks/useHalaman';
import { useImpor, useSeretBerkas } from '../hooks/useImpor';
import StatusAgen from '../components/StatusAgen';
import PanelPindai from '../components/PanelPindai';
import KanvasHalaman from '../components/KanvasHalaman';
import UrutanHalaman from '../components/UrutanHalaman';

/**
 * Halaman Scanner (uji coba, belum tersambung ke LPJ/Arsip). Tiga panel:
 *  kiri = status agen & pengaturan scanner; tengah juga menampung impor berkas; tengah = kanvas bergulir (gaya Canva) + OCR;
 *  kanan = urutan halaman. Hasil scan, gambar, dan PDF (dipecah per halaman) bergabung dalam
 *  satu urutan; berkas boleh dilepas di mana saja di halaman. Semua hanya di memori browser.
 */
export default function ScannerPage() {
  const agen = useStatusAgen();
  const kerja = useHalaman();
  const { halaman, tambah: tambahHalaman } = kerja;
  const agenSiap = agen.status === 'terhubung';
  const [aktifId, setAktifId] = useState(null);
  const [pindaian, setPindaian] = useState(null); // { jumlah, nama, hentikan } selama memindai
  const indeksAktif = useRef(0);

  // Halaman baru masuk ke data; kanvas yang mengatur kapan ia tampil & menjadi aktif (antrean)
  const tambah = useCallback((hl) => tambahHalaman(hl), [tambahHalaman]);

  const imporBerkas = useImpor({ agenSiap, onHalaman: tambah });
  const seretBerkas = useSeretBerkas(imporBerkas.impor);

  // Halaman aktif dihapus → pindah ke halaman di posisi yang sama (atau terakhir)
  useEffect(() => {
    const i = halaman.findIndex((h) => h.id === aktifId);
    if (i >= 0) {
      indeksAktif.current = i;
      return;
    }
    if (!halaman.length) {
      if (aktifId !== null) setAktifId(null);
      return;
    }
    setAktifId(halaman[Math.min(indeksAktif.current, halaman.length - 1)].id);
  }, [halaman, aktifId]);

  // Halaman belum diunduh akan hilang: ingatkan sebelum tab/jendela ditutup
  const adaHalaman = halaman.length > 0;
  useEffect(() => {
    if (!adaHalaman) return undefined;
    const tahan = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', tahan);
    return () => window.removeEventListener('beforeunload', tahan);
  }, [adaHalaman]);

  return (
    // Tata letak mengikuti lebar RUANG halaman (container query "halaman"), bukan lebar layar,
    // karena sidebar aplikasi memakan 80–256 px:
    //  ≥1000 px  → 3 panel pas satu layar (laptop), tiap panel menggulir isinya sendiri
    //  720–999   → 2 kolom (pengaturan | kanvas), urutan di bawah
    //  <720      → bertumpuk (ponsel)
    <div className={`@container/halaman min-h-full ${T.ground}`}>
      <div
        className={`${FONT.body} w-full max-w-[1800px] mx-auto flex flex-col px-4 pt-4 pb-10 @min-[1000px]/halaman:h-dvh @min-[1000px]/halaman:min-h-[560px] @min-[1000px]/halaman:px-5 @min-[1000px]/halaman:pt-3.5 @min-[1000px]/halaman:pb-3.5`}
      >
        <div className="mb-3 shrink-0 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className={ADMIN.h1}>Scanner</h1>
          <p className={`text-[12.5px] leading-[1.5] ${T.inkMuted}`}>
            Pindai, tarik gambar, atau lepas PDF ke halaman ini — semuanya bergabung dalam satu
            urutan. Halaman hanya tersimpan sementara; unduh sebagai PDF sebelum menutup.
          </p>
        </div>

        <div className="grid gap-3 items-start flex-1 min-h-0 @min-[720px]/halaman:grid-cols-[clamp(250px,34%,290px)_minmax(0,1fr)] @min-[1000px]/halaman:items-stretch @min-[1000px]/halaman:grid-rows-[minmax(0,1fr)] @min-[1000px]/halaman:grid-cols-[clamp(250px,24%,300px)_minmax(0,1fr)_clamp(244px,22%,300px)]">
          {/* Kiri: pengaturan (menggulir sendiri di mode laptop) */}
          <aside className="space-y-3 min-w-0 @min-[1000px]/halaman:h-full @min-[1000px]/halaman:overflow-y-auto @min-[1000px]/halaman:overscroll-contain @min-[1000px]/halaman:pr-1 @min-[1000px]/halaman:-mr-1 @min-[1000px]/halaman:pb-1">
            <StatusAgen {...agen} onPeriksa={agen.periksa} />
            <section className={ADMIN.card}>
              <h2 className={`${FORM.cardTitle} mb-3`}>Pindai dari Scanner</h2>
              <PanelPindai agenSiap={agenSiap} onHalaman={tambah} onProgres={setPindaian} />
            </section>
          </aside>

          {/* Tengah: kanvas bergulir + OCR */}
          <KanvasHalaman
            kerja={kerja}
            aktifId={aktifId}
            onAktif={setAktifId}
            agenSiap={agenSiap}
            imporBerkas={imporBerkas}
            pindaian={pindaian}
          />

          {/* Kanan: urutan halaman */}
          <div className="min-w-0 @min-[720px]/halaman:col-span-2 @min-[1000px]/halaman:col-span-1 @min-[1000px]/halaman:h-full @min-[1000px]/halaman:min-h-0">
            <UrutanHalaman kerja={kerja} aktifId={aktifId} onAktif={setAktifId} />
          </div>
        </div>
      </div>

      {seretBerkas &&
        createPortal(
          <div
            className={`fixed inset-0 z-[900] pointer-events-none grid place-items-center p-6 bg-[rgba(10,18,32,.45)] ${ANIM.latar}`}
          >
            <div
              className={`${FONT.body} flex flex-col items-center gap-2 px-10 py-8 rounded-[20px] border-2 border-dashed border-[#7DB6F3] bg-[#0f2040] text-white text-center ${ANIM.popup}`}
            >
              <FaFileImport size={26} className="text-[#C9973B]" />
              <p className={`${FONT.head} text-[17px] font-bold`}>Lepaskan untuk menambahkan</p>
              <p className="text-[12.5px] text-[#A7B6CB]">
                Gambar langsung masuk; PDF dipecah per halaman
                {agenSiap ? '' : ' (butuh Agen Scanner)'}.
              </p>
            </div>
          </div>,
          document.body,
        )}
      <ToastViewport />
    </div>
  );
}
