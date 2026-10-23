import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FaCircleNotch,
  FaCopy,
  FaFileImport,
  FaSearchMinus,
  FaSearchPlus,
  FaTimes,
} from 'react-icons/fa';
import { showToast } from '@/utils/toastStore';
import { ADMIN, BTN, FONT, FORM, STATUS, T } from '@/utils/uiTokens';
import { ANIM, kurangiGerakan } from '@/utils/animasi';
import { animasiHapusHalaman } from '../animasiScanner';
import { bacaTeksWeb, ocrSudahSiap } from '../services/ocrWeb';
import { potongArea } from '../utils/gambar';
import { BANNER_GALAT } from '../utils/kelas';
import { usePanggung } from '../hooks/usePanggung';
import HalamanKanvas from './HalamanKanvas';
import PanggungMasuk from './panggung/PanggungMasuk';
import TombolImpor from './TombolImpor';

// Lebar halaman relatif terhadap kanvas (kelas utuh agar terbaca Tailwind)
const ZOOM = [
  { label: '50%', kelas: 'w-1/2' },
  { label: '65%', kelas: 'w-[65%]' },
  { label: '80%', kelas: 'w-4/5' },
  { label: '100%', kelas: 'w-full' },
];
const KUNCI_ZOOM = 'scanner.zoom';

// ADMIN.card tanpa padding: kanvas mengisi kartu sampai tepi
const KARTU_TANPA_PADDING = `${T.surface} ${T.border} ${T.shadowSm} ${T.ink} border rounded-[20px]`;

function bacaZoom() {
  try {
    const simpan = localStorage.getItem(KUNCI_ZOOM);
    const i = simpan === null ? NaN : Number(simpan); // Number(null) = 0 → jangan jadi 50%
    return Number.isInteger(i) && i >= 0 && i < ZOOM.length ? i : 2;
  } catch {
    return 2;
  }
}

async function salin(teks, pesan = 'Teks disalin.') {
  try {
    await navigator.clipboard.writeText(teks);
    showToast(pesan);
  } catch {
    showToast('Gagal menyalin; pilih teksnya lalu tekan Ctrl+C.', 'error');
  }
}

/**
 * Panel tengah bergaya kanvas Canva: semua halaman bertumpuk dan bisa digulir. Halaman yang
 * paling terlihat menjadi "aktif" (disorot di panel Urutan); memilih halaman dari luar
 * (panel Urutan, ←/→, halaman baru masuk) menggulir kanvas ke halaman itu.
 * OCR: tarik kotak di halaman mana pun, atau tombol kaca pembesar di bilah halaman.
 */
export default function KanvasHalaman({ kerja, aktifId, onAktif, imporBerkas, pindaian }) {
  const { halaman, putar, hapus } = kerja;
  const [zoom, setZoom] = useState(bacaZoom);
  const [ocr, setOcr] = useState(null); // { id, nomor, status, cakupan, teks, baris, pesan }
  const penggulir = useRef(null);
  const teksRef = useRef(null);
  const ctrlOcr = useRef(null);
  const aktifRef = useRef(aktifId);
  const dariKanvas = useRef(false); // aktif berganti karena gulir/klik di kanvas → jangan menggulir
  const sedangLompat = useRef(false);
  const timerLompat = useRef(null);

  useEffect(() => {
    aktifRef.current = aktifId;
  }, [aktifId]);

  // ─── Antrean tampil ───────────────────────────────────────────────────────
  // Data halaman langsung masuk (panel Urutan langsung lengkap), tetapi kanvas menampilkan
  // halaman baru SATU PER SATU: kepala antrean dirender → kanvas bergulir ke sana → terbang &
  // "tercetak" → `selesaiMasuk` → berikutnya. Halaman yang belum dikenal (baru masuk di render
  // ini) langsung dianggap antre, agar tidak sempat terpasang sekilas.
  const [dikenal] = useState(() => new Set(halaman.map((h) => h.id)));
  const [antre, setAntre] = useState([]);
  const belumDikenal = halaman.filter((h) => !dikenal.has(h.id)).map((h) => h.id);
  const antreEfektif = [...antre, ...belumDikenal.filter((id) => !antre.includes(id))];
  const kepala = antreEfektif[0] ?? null;
  const menunggu = new Set(antreEfektif.slice(1));
  // PDF tebal tidak perlu menunggu lama: tempo dipercepat bila antrean panjang
  const tempo = antreEfektif.length > 6 ? 'kilat' : antreEfektif.length > 2 ? 'cepat' : 'normal';

  useEffect(() => {
    const ada = new Set(halaman.map((h) => h.id));
    const baru = halaman.filter((h) => !dikenal.has(h.id)).map((h) => h.id);
    baru.forEach((id) => dikenal.add(id));
    [...dikenal].forEach((id) => !ada.has(id) && dikenal.delete(id));
    setAntre((a) => {
      const sisa = a.filter((id) => ada.has(id)); // halaman antre yang dihapus ikut keluar
      if (!baru.length && sisa.length === a.length) return a;
      return [...sisa, ...baru];
    });
  }, [halaman, dikenal]);

  const selesaiMasuk = useCallback((id) => setAntre((a) => a.filter((x) => x !== id)), []);

  // Giliran halaman berikutnya → jadikan aktif (kanvas menggulir ke sana)
  useEffect(() => {
    if (kepala) onAktif(kepala);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hanya saat kepala antrean berganti
  }, [kepala]);

  useEffect(() => {
    try {
      localStorage.setItem(KUNCI_ZOOM, String(zoom));
    } catch {
      /* penyimpanan browser tidak tersedia */
    }
  }, [zoom]);

  useEffect(
    () => () => {
      ctrlOcr.current?.abort();
      clearTimeout(timerLompat.current);
    },
    [],
  );

  const pilihDariKanvas = useCallback(
    (id) => {
      if (id === aktifRef.current) return;
      dariKanvas.current = true;
      onAktif(id);
    },
    [onAktif],
  );

  // Gulir → halaman dengan porsi terlihat terbesar menjadi aktif
  // Hanya halaman yang sedang dirender (bukan yang masih antre) yang diamati
  const kunciDaftar = halaman
    .filter((h) => !menunggu.has(h.id))
    .map((h) => h.id)
    .join('|');
  useEffect(() => {
    const akar = penggulir.current;
    if (!akar || !kunciDaftar) return undefined;
    const rasio = new Map();
    const obs = new IntersectionObserver(
      (entri) => {
        entri.forEach((e) => rasio.set(e.target.dataset.id, e.intersectionRatio));
        if (sedangLompat.current) return;
        let terbaik = null;
        let nilai = 0;
        rasio.forEach((v, k) => {
          if (v > nilai) {
            nilai = v;
            terbaik = k;
          }
        });
        if (terbaik) pilihDariKanvas(terbaik);
      },
      { root: akar, threshold: [0, 0.15, 0.3, 0.5, 0.7, 0.9, 1] },
    );
    akar.querySelectorAll('[data-halaman]').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [kunciDaftar, pilihDariKanvas]);

  // Aktif dipilih dari luar → gulir kanvas ke halaman itu
  useEffect(() => {
    if (dariKanvas.current) {
      dariKanvas.current = false;
      return;
    }
    const akar = penggulir.current;
    const el = aktifId && akar?.querySelector(`[data-id="${aktifId}"]`);
    if (!el) return;
    sedangLompat.current = true;
    akar.scrollTo({ top: el.offsetTop - 16, behavior: kurangiGerakan() ? 'auto' : 'smooth' });
    clearTimeout(timerLompat.current);
    timerLompat.current = setTimeout(() => {
      sedangLompat.current = false;
    }, 700);
  }, [aktifId]);

  // ←/→ = halaman sebelumnya/berikutnya (kecuali sedang mengetik); kanvas ikut menggulir
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('textarea, input, select')) return;
      const i = halaman.findIndex((h) => h.id === aktifRef.current);
      if (e.key === 'ArrowLeft' && i > 0) onAktif(halaman[i - 1].id);
      else if (e.key === 'ArrowRight' && i >= 0 && i < halaman.length - 1)
        onAktif(halaman[i + 1].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [halaman, onAktif]);

  // Halaman yang punya hasil OCR dihapus → tutup laci OCR
  useEffect(() => {
    if (ocr && !halaman.some((h) => h.id === ocr.id)) setOcr(null);
  }, [halaman, ocr]);

  async function jalankanOcr(h, nomor, tampil, area) {
    ctrlOcr.current?.abort();
    const c = new AbortController();
    ctrlOcr.current = c;
    const cakupan = area ? 'area' : 'halaman';
    // OCR pertama: mesin & data bahasa (±10 MB) diunduh dulu, berikutnya langsung dari cache
    setOcr({ id: h.id, nomor, status: 'memuat', cakupan, pertama: !ocrSudahSiap() });
    try {
      const blob = area ? await potongArea(tampil.blob, area) : tampil.blob;
      const hasil = await bacaTeksWeb(blob, { mode: area ? 'blok' : 'halaman', signal: c.signal });
      const baris = area
        ? null
        : hasil.baris
            .filter((b) => b.teks.trim())
            .map((b) => ({
              teks: b.teks,
              x: b.x / tampil.lebar,
              y: b.y / tampil.tinggi,
              w: b.w / tampil.lebar,
              h: b.h / tampil.tinggi,
            }));
      setOcr({ id: h.id, nomor, status: 'selesai', cakupan, teks: hasil.teks, baris });
      if (!hasil.teks.trim()) showToast('Tidak ada teks yang terbaca di sini.', 'error');
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setOcr({ id: h.id, nomor, status: 'galat', cakupan, pesan: err.message });
    }
  }

  const tutupOcr = () => {
    ctrlOcr.current?.abort();
    setOcr(null);
  };

  // Panggung animasi halaman masuk (scan / PDF / gambar) — objek sumber distabilkan (useMemo)
  const { proses, hentikan: hentikanImpor } = imporBerkas;
  const sumberImpor = useMemo(
    () =>
      proses
        ? { mode: proses.jenis, nama: proses.nama, jumlah: proses.n, hentikan: hentikanImpor }
        : null,
    [proses, hentikanImpor],
  );
  const sumberScan = useMemo(() => (pindaian ? { mode: 'scan', ...pindaian } : null), [pindaian]);
  // Panggung tetap tampil ("menata") selama antrean tampil belum habis
  const masihAntre = antreEfektif.length > 0;
  const panggungScan = usePanggung(sumberScan, masihAntre);
  const panggungImpor = usePanggung(sumberImpor, masihAntre);
  const panggung = [panggungScan, panggungImpor]
    .filter(Boolean)
    .map((p) => ({ ...p, sisa: antreEfektif.length }));

  if (!halaman.length) {
    return (
      <section className={`${ADMIN.card} min-w-0 @min-[1000px]/halaman:h-full flex flex-col`}>
        <div
          className={`flex-1 flex flex-col items-center justify-center gap-3 min-h-[260px] sm:min-h-[420px] @min-[1000px]/halaman:min-h-0 rounded-[14px] border-[1.5px] border-dashed px-6 text-center ${T.borderStrong} ${T.surface2}`}
        >
          {panggung.length > 0 ? (
            panggung.map((p) => <PanggungMasuk key={p.mode} besar {...p} />)
          ) : (
            <>
              <span
                className={`w-14 h-14 rounded-2xl grid place-items-center ${T.surface} ${T.inkMuted}`}
              >
                <FaFileImport size={22} />
              </span>
              <p className={`${FONT.head} text-[15px] font-bold ${T.ink}`}>Belum ada halaman</p>
              <p className={`text-[12.5px] max-w-[380px] leading-[1.6] ${T.inkMuted}`}>
                Tekan <b>Mulai Pindai</b> di panel kiri, pilih berkas di bawah, atau tarik
                gambar/PDF ke mana saja di halaman ini. Hasil scan, gambar, dan PDF bisa digabung
                dalam satu urutan.
              </p>
              <div className="mt-2">
                <TombolImpor
                  varian="besar"
                  impor={imporBerkas.impor}
                  sibuk={!!imporBerkas.proses}
                />
              </div>
            </>
          )}
        </div>
      </section>
    );
  }

  const nomorAktif = halaman.findIndex((h) => h.id === aktifId) + 1;

  return (
    <section
      className={`${KARTU_TANPA_PADDING} min-w-0 flex flex-col overflow-hidden @min-[1000px]/halaman:h-full`}
    >
      {/* Kanvas bergulir + panggung animasi melayang di bawahnya */}
      <div className="relative flex flex-col min-h-0 @min-[1000px]/halaman:flex-1">
        <div
          ref={penggulir}
          data-kanvas
          className={`relative overflow-y-auto overflow-x-hidden h-[70vh] min-h-[360px] @min-[1000px]/halaman:h-auto @min-[1000px]/halaman:flex-1 @min-[1000px]/halaman:min-h-0 overscroll-contain [overflow-anchor:none] px-4 @min-[560px]/halaman:px-6 pt-5 space-y-6 ${panggung.length ? 'pb-32' : 'pb-5'} ${T.surface2}`}
        >
          {halaman.map((h, i) =>
            menunggu.has(h.id) ? null : (
              <HalamanKanvas
                key={h.id}
                tempo={h.id === kepala ? tempo : 'normal'}
                onSelesaiMasuk={() => selesaiMasuk(h.id)}
                halaman={h}
                nomor={i + 1}
                aktif={h.id === aktifId}
                kelasLebar={ZOOM[zoom].kelas}
                baris={ocr?.id === h.id ? ocr.baris : null}
                adaOcr={ocr?.id === h.id}
                ocrSiap
                memuatOcr={ocr?.id === h.id && ocr.status === 'memuat'}
                onAktif={() => pilihDariKanvas(h.id)}
                onPutar={(delta) => putar([h.id], delta)}
                onHapus={() => animasiHapusHalaman([h.id], () => hapus([h.id]))}
                onOcr={(tampil, area) => {
                  pilihDariKanvas(h.id);
                  jalankanOcr(h, i + 1, tampil, area);
                }}
                onSalinBaris={(teks) => salin(teks, `Disalin: ${teks}`)}
              />
            ),
          )}

          {/* Tambah halaman (seperti tombol "+ Tambah halaman" Canva) */}
          <div className={`mx-auto min-w-[min(100%,320px)] ${ZOOM[zoom].kelas}`}>
            <TombolImpor impor={imporBerkas.impor} sibuk={!!imporBerkas.proses} />
          </div>
        </div>

        {panggung.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex flex-col items-center gap-2 px-3">
            {panggung.map((p) => (
              <div key={p.mode} className="pointer-events-auto max-w-full">
                <PanggungMasuk {...p} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Laci hasil OCR */}
      {ocr && (
        <div className={`border-t px-4 py-3 ${T.border} ${ANIM.muncul}`}>
          <div className="flex items-center gap-2 mb-2">
            <p className={`flex-1 min-w-0 text-[12.5px] font-semibold truncate ${T.ink2}`}>
              OCR · Halaman {ocr.nomor} ·{' '}
              {ocr.cakupan === 'area' ? 'area terpilih' : 'seluruh halaman'}
              {ocr.baris?.length > 0 && (
                <span className={`font-normal ${T.inkMuted}`}>
                  {' '}
                  — {ocr.baris.length} baris, klik kotak biru untuk menyalin satu baris
                </span>
              )}
            </p>
            {ocr.status === 'selesai' && (
              <button
                type="button"
                className={BTN.xs}
                onClick={() => salin(teksRef.current?.value || '')}
              >
                <FaCopy size={10} /> Salin
              </button>
            )}
            <button
              type="button"
              className={ADMIN.modalClose}
              onClick={tutupOcr}
              aria-label="Tutup OCR"
            >
              <FaTimes size={13} />
            </button>
          </div>
          {ocr.status === 'memuat' && (
            <p className={`flex items-center gap-2 text-[12.5px] ${STATUS.infoInk}`}>
              <FaCircleNotch size={11} className="animate-spin" />{' '}
              {ocr.pertama ? 'Menyiapkan mesin OCR (sekali saja, ±10 MB)…' : 'Membaca teks…'}
            </p>
          )}
          {ocr.status === 'galat' && <p className={BANNER_GALAT}>{ocr.pesan}</p>}
          {ocr.status === 'selesai' && (
            <textarea
              key={ocr.teks}
              ref={teksRef}
              defaultValue={ocr.teks}
              rows={ocr.cakupan === 'area' ? 2 : 5}
              aria-label="Hasil OCR"
              className={`${FORM.textarea} ${FORM.borderOk} ${FONT.mono}`}
            />
          )}
        </div>
      )}

      {/* Bilah bawah: posisi + zoom */}
      <div
        className={`flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t px-3 @min-[560px]/halaman:px-4 py-2 shrink-0 ${T.border}`}
      >
        <p className={`flex-1 min-w-[90px] text-[12px] truncate ${T.inkMuted}`}>
          <span className={`${FONT.mono} font-semibold ${T.ink2}`}>
            {nomorAktif || 1} / {halaman.length}
          </span>{' '}
          halaman
          <span className="hidden @min-[1240px]/halaman:inline">
            {' '}
            · tarik kotak di halaman untuk OCR
          </span>
        </p>
        <button
          type="button"
          className={BTN.xs}
          onClick={() => setZoom((z) => Math.max(0, z - 1))}
          disabled={zoom === 0}
          title="Perkecil"
        >
          <FaSearchMinus size={10} />
        </button>
        <span className="flex gap-0.5">
          {ZOOM.map((z, i) => (
            <button
              key={z.label}
              type="button"
              onClick={() => setZoom(i)}
              className={`px-2 py-1 rounded-md text-[11.5px] font-semibold cursor-pointer ${FONT.mono} ${
                i === zoom
                  ? `${STATUS.infoBg} ${STATUS.infoInk}`
                  : `${T.inkMuted} ${T.hoverSurface2}`
              }`}
            >
              {z.label}
            </button>
          ))}
        </span>
        <button
          type="button"
          className={BTN.xs}
          onClick={() => setZoom((z) => Math.min(ZOOM.length - 1, z + 1))}
          disabled={zoom === ZOOM.length - 1}
          title="Perbesar"
        >
          <FaSearchPlus size={10} />
        </button>
      </div>
    </section>
  );
}
