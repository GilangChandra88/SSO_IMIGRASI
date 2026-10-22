import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FaDownload, FaRedo, FaSearch, FaTrashAlt, FaUndo } from 'react-icons/fa';
import { FONT, T } from '@/utils/uiTokens';
import { kurangiGerakan } from '@/utils/animasi';
import {
  catatPosisi,
  putarHalus,
  selisihRotasi,
  terbangkanHalaman,
  tungguTerlihat,
  ungkapHalaman,
} from '../animasiScanner';
import { blobTerputar, unduhBlob } from '../utils/gambar';

// Tempo animasi masuk menurut panjang antrean tampil (lihat KanvasHalaman)
const TEMPO = {
  normal: { terbang: true, jeda: 520, durasi: 760, batas: 2600 },
  cepat: { terbang: true, jeda: 360, durasi: 520, batas: 1800 },
  kilat: { terbang: false, jeda: 0, durasi: 320, batas: 1200 },
};

const SKALA = 1000; // koordinat SVG lapisan pilihan (0–1000 di kedua sumbu)
const batasi = (v) => Math.min(1, Math.max(0, v));

const TOMBOL = `w-7 h-7 rounded-md grid place-items-center shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${T.inkMuted} enabled:hover:bg-[#E0E5EC] dark:enabled:hover:bg-[#233450] enabled:hover:text-[#101A2C] dark:enabled:hover:text-[#EAF0F8]`;
const TOMBOL_HAPUS = `w-7 h-7 rounded-md grid place-items-center shrink-0 cursor-pointer ${T.inkMuted} hover:bg-[rgba(208,59,59,.13)] hover:text-[#A62D2D] dark:hover:text-[#F19191]`;

/**
 * Satu halaman di kanvas (gaya Canva): bilah alat di atas + gambar dengan rotasi "dibakar"
 * (supaya koordinat pilihan = koordinat OCR). Tarik kotak di gambar → `onOcr(tampil, area)`;
 * klik kotak baris hasil OCR → `onSalinBaris(teks)`.
 */
export default function HalamanKanvas({
  halaman: h,
  nomor,
  aktif,
  kelasLebar,
  baris,
  adaOcr,
  ocrSiap,
  memuatOcr,
  onAktif,
  onPutar,
  onHapus,
  onOcr,
  onSalinBaris,
  tempo = 'normal',
  onSelesaiMasuk,
}) {
  const [tampil, setTampil] = useState({
    url: h.url,
    blob: h.blob,
    lebar: h.lebar,
    tinggi: h.tinggi,
    rotasi: h.rotasi,
  });
  const [area, setArea] = useState(null);
  const [baru, setBaru] = useState(() => !kurangiGerakan()); // tirai & garis pemindai tampil
  const mulai = useRef(null);
  const badanRef = useRef(null);
  const tiraiRef = useRef(null);
  const garisRef = useRef(null);
  const rotasiTampil = useRef(h.rotasi); // rotasi gambar yang sedang terlihat
  const putaran = useRef(null); // { kotakLama, delta } menunggu dianimasikan

  // Rotasi diterapkan ke piksel; selama diproses, gambar lama tetap tampil. Gambar baru
  // didekode DULU (agar ukurannya langsung berlaku saat ditukar, tanpa tata letak yang berubah
  // belakangan), lalu tepat sebelum ditukar posisi lama dicatat untuk animasi putar (FLIP).
  useEffect(() => {
    setArea(null);
    let batal = false;
    let url = null;
    const pasang = async (isi) => {
      try {
        const pra = new Image();
        pra.src = isi.url;
        await pra.decode();
      } catch {
        /* tetap ditukar; paling buruk tanpa animasi yang presisi */
      }
      if (batal) return;
      const delta = selisihRotasi(rotasiTampil.current, h.rotasi);
      if (delta && badanRef.current) {
        putaran.current = {
          kotakLama: badanRef.current.getBoundingClientRect(),
          posisiLama: catatPosisi(badanRef.current),
          delta,
        };
      }
      rotasiTampil.current = h.rotasi;
      setTampil({ ...isi, rotasi: h.rotasi });
    };
    if (!h.rotasi) {
      pasang({ url: h.url, blob: h.blob, lebar: h.lebar, tinggi: h.tinggi });
    } else {
      blobTerputar(h.blob, h.rotasi).then((blob) => {
        if (batal) return;
        url = URL.createObjectURL(blob);
        const miring = h.rotasi % 180 !== 0;
        pasang({
          url,
          blob,
          lebar: miring ? h.tinggi : h.lebar,
          tinggi: miring ? h.lebar : h.tinggi,
        });
      });
    }
    return () => {
      batal = true;
      // Tunda pelepasan: gambar lama masih tampil sampai gambar pengganti terpasang
      if (url) setTimeout(() => URL.revokeObjectURL(url), 2000);
    };
  }, [h.id, h.rotasi, h.url, h.blob, h.lebar, h.tinggi]);

  // Gambar baru sudah di DOM (sebelum dilukis) → putar halus dari orientasi lama
  useLayoutEffect(() => {
    if (!putaran.current) return;
    putarHalus({ el: badanRef.current, ...putaran.current });
    putaran.current = null;
  }, [tampil]);

  // Laci OCR ditutup / pindah halaman lain → kotak kuning ikut hilang
  useEffect(() => {
    if (!adaOcr) setArea(null);
  }, [adaOcr]);

  // Halaman baru masuk: tunggu kanvas selesai bergulir ke halaman ini, lalu salinannya terbang
  // dari panel kiri (maskot scanner / kotak impor bertanda data-asal-halaman) dan setelah
  // mendarat halaman "tercetak" (tirai + garis pemindai). Di luar layar → langsung terbuka.
  useEffect(() => {
    const ctrl = new AbortController();
    const t = TEMPO[tempo] || TEMPO.normal;
    (async () => {
      const terlihat = await tungguTerlihat(badanRef.current, {
        signal: ctrl.signal,
        batas: t.batas,
      });
      if (ctrl.signal.aborted) return;
      // Asal utama = maskot/kotak progres yang sedang tampil; cadangan = tombol sumbernya
      // (mis. pindaian sudah selesai saat halaman terakhir baru terlihat)
      const asal =
        terlihat &&
        (document.querySelector('[data-asal-halaman]') ||
          document.querySelector(
            `[data-asal-cadangan="${h.sumber === 'scan' ? 'scan' : 'impor'}"]`,
          ));
      const terbang = t.terbang && asal;
      if (terbang) terbangkanHalaman({ url: h.url, asal, tujuan: badanRef.current });
      await ungkapHalaman({
        kartu: badanRef.current,
        tirai: tiraiRef.current,
        garis: garisRef.current,
        jeda: terbang ? t.jeda : 0,
        durasi: t.durasi,
      });
      if (ctrl.signal.aborted) return;
      setBaru(false);
      onSelesaiMasuk?.(); // giliran halaman berikutnya di antrean tampil
    })();
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hanya sekali saat halaman dipasang
  }, []);

  const titik = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: batasi((e.clientX - r.left) / r.width), y: batasi((e.clientY - r.top) / r.height) };
  };
  const kotakDari = (a, b) => ({
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y),
  });

  const lapisan = {
    onPointerDown: (e) => {
      if (e.button !== 0) return;
      onAktif();
      if (!ocrSiap) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      mulai.current = titik(e);
      setArea(null);
    },
    onPointerMove: (e) => {
      if (mulai.current) setArea(kotakDari(mulai.current, titik(e)));
    },
    onPointerUp: (e) => {
      if (!mulai.current) return;
      const p = titik(e);
      const a = kotakDari(mulai.current, p);
      mulai.current = null;
      if (a.w > 0.01 && a.h > 0.008) {
        setArea(a);
        onOcr(tampil, a);
        return;
      }
      setArea(null);
      const kena = (baris || []).find(
        (b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h,
      );
      if (kena) onSalinBaris(kena.teks);
    },
  };

  const unduh = async () => {
    const blob = await blobTerputar(h.blob, h.rotasi);
    unduhBlob(blob, `halaman-${nomor}.${blob.type === 'image/png' ? 'png' : 'jpg'}`);
  };

  return (
    <div data-halaman data-id={h.id} className={`mx-auto min-w-[min(100%,320px)] ${kelasLebar}`}>
      <div className="flex items-center gap-1 mb-1.5 px-0.5">
        <button
          type="button"
          onClick={onAktif}
          className={`flex-1 min-w-0 text-left text-[12px] truncate cursor-pointer ${aktif ? T.ink : T.inkMuted}`}
          title={h.nama}
        >
          <span className={`${FONT.mono} font-bold`}>Halaman {nomor}</span>
          <span className="hidden sm:inline"> — {h.nama}</span>
        </button>
        <button type="button" className={TOMBOL} onClick={() => onPutar(-90)} title="Putar kiri">
          <FaUndo size={10} />
        </button>
        <button type="button" className={TOMBOL} onClick={() => onPutar(90)} title="Putar kanan">
          <FaRedo size={10} />
        </button>
        <button
          type="button"
          className={TOMBOL}
          onClick={() => onOcr(tampil, null)}
          disabled={!ocrSiap || memuatOcr}
          title={ocrSiap ? 'Baca seluruh halaman (OCR)' : 'OCR butuh Agen Scanner'}
        >
          <FaSearch size={10} />
        </button>
        <button type="button" className={TOMBOL} onClick={unduh} title="Unduh gambar halaman ini">
          <FaDownload size={10} />
        </button>
        <button
          type="button"
          className={TOMBOL_HAPUS}
          onClick={(e) => onHapus(e.currentTarget.closest('[data-halaman]'))}
          title="Hapus halaman"
        >
          <FaTrashAlt size={10} />
        </button>
      </div>

      <div
        ref={badanRef}
        className={`relative overflow-hidden bg-white motion-safe:transition-shadow motion-safe:duration-200 ${
          aktif
            ? 'shadow-[0_0_0_2px_#2A78D6,0_6px_20px_rgba(16,26,44,.18)] dark:shadow-[0_0_0_2px_#7DB6F3,0_6px_20px_rgba(0,0,0,.5)]'
            : 'shadow-[0_2px_10px_rgba(16,26,44,.12)] dark:shadow-[0_2px_10px_rgba(0,0,0,.45)]'
        }`}
      >
        <img
          src={tampil.url}
          width={tampil.lebar}
          height={tampil.tinggi}
          alt={`Halaman ${nomor}`}
          loading="lazy"
          draggable={false}
          className="block w-full h-auto select-none"
        />
        <svg
          viewBox={`0 0 ${SKALA} ${SKALA}`}
          preserveAspectRatio="none"
          className={`absolute inset-0 w-full h-full touch-pan-y ${ocrSiap ? 'cursor-crosshair' : 'cursor-pointer'}`}
          {...lapisan}
        >
          {(baris || []).map((b, i) => (
            <rect
              key={i}
              x={b.x * SKALA}
              y={b.y * SKALA}
              width={b.w * SKALA}
              height={b.h * SKALA}
              vectorEffect="non-scaling-stroke"
              strokeWidth={1}
              className="fill-[rgba(42,120,214,.10)] stroke-[#2A78D6] hover:fill-[rgba(42,120,214,.28)] cursor-copy"
            >
              <title>{`Klik untuk menyalin: ${b.teks}`}</title>
            </rect>
          ))}
          {area && (
            <rect
              x={area.x * SKALA}
              y={area.y * SKALA}
              width={area.w * SKALA}
              height={area.h * SKALA}
              vectorEffect="non-scaling-stroke"
              strokeWidth={2}
              strokeDasharray="6 4"
              className="fill-[rgba(201,151,59,.16)] stroke-[#C9973B]"
            />
          )}
        </svg>
        {baru && (
          <>
            {/* Tirai warna kanvas menyusut ke bawah mengikuti garis pemindai: halaman "tercetak" */}
            <div
              ref={tiraiRef}
              aria-hidden="true"
              className={`absolute inset-0 origin-bottom pointer-events-none ${T.surface2}`}
            />
            <div
              ref={garisRef}
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-[3px] pointer-events-none bg-[#C9973B] shadow-[0_0_14px_4px_rgba(201,151,59,.55)]"
            />
          </>
        )}
      </div>
    </div>
  );
}
