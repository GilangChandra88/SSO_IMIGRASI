import React, { useEffect, useRef, useState } from 'react';
import {
  FaAngleDoubleDown,
  FaAngleDoubleUp,
  FaChevronDown,
  FaChevronUp,
  FaCircleNotch,
  FaCopy,
  FaFilePdf,
  FaRedo,
  FaTimes,
  FaTrashAlt,
  FaUndo,
} from 'react-icons/fa';
import { showToast } from '@/utils/toastStore';
import { ADMIN, BTN, FONT, FORM, STATUS, T } from '@/utils/uiTokens';
import { ANIM, hapusBaris } from '@/utils/animasi';
import { buatPdf } from '../utils/eksporPdf';
import { unduhBlob } from '../utils/gambar';
import KartuUrutan from './KartuUrutan';

const namaPdf = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `pindaian-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.pdf`;
};

// Tombol ikon bilah aksi massal (7 kolom; muat di panel 240 px)
const AKSI = `h-8 w-full rounded-lg border grid place-items-center cursor-pointer ${T.surface} ${T.border} ${T.ink2} ${T.hoverSurface2} disabled:opacity-35 disabled:cursor-not-allowed motion-safe:transition-[background-color,scale] motion-safe:duration-150 motion-safe:enabled:active:scale-90`;

/**
 * Panel kanan: urutan halaman gabungan dari semua sumber (scan, gambar, PDF).
 * Pilih banyak: centang, Ctrl/⌘+klik, atau Shift+klik (rentang); Esc = batal pilih.
 * Aksi massal: putar, naik/turun satu langkah, ke awal/akhir, hapus. Menyeret halaman yang
 * terpilih membawa seluruh pilihan (urutan di antaranya tetap); garis emas = posisi jatuh.
 */
export default function UrutanHalaman({ kerja, aktifId, onAktif }) {
  const {
    halaman,
    terpilih,
    hapus,
    kosongkan,
    putar,
    pindah,
    geserBanyak,
    pindahBanyak,
    pilih,
    pilihRentang,
    pilihSemua,
  } = kerja;
  const [seret, setSeret] = useState(null); // { ids } halaman yang sedang diseret
  const [sisip, setSisip] = useState(null); // { id, sisi: 'atas'|'bawah' }
  const [konfirmasi, setKonfirmasi] = useState(null); // 'semua' | 'pilihan'
  const [membuatPdf, setMembuatPdf] = useState(false);
  const jangkar = useRef(null); // titik awal Shift+klik
  const hantu = useRef(null); // gambar seret "N halaman"

  const idPilih = halaman.filter((h) => terpilih.has(h.id)).map((h) => h.id); // urut tampilan
  const jumlahPilih = idPilih.length;
  const semuaTerpilih = halaman.length > 0 && jumlahPilih === halaman.length;
  const pilihanDiAwal = jumlahPilih > 0 && idPilih.every((id, i) => halaman[i]?.id === id);
  const pilihanDiAkhir =
    jumlahPilih > 0 &&
    idPilih.every((id, i) => halaman[halaman.length - jumlahPilih + i]?.id === id);

  // Esc = batal pilih (kecuali sedang mengetik)
  useEffect(() => {
    if (!jumlahPilih) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.target.closest?.('textarea, input, select')) return;
      pilihSemua(false);
      setKonfirmasi(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [jumlahPilih, pilihSemua]);

  useEffect(() => {
    if (!jumlahPilih && konfirmasi === 'pilihan') setKonfirmasi(null);
  }, [jumlahPilih, konfirmasi]);

  async function unduhPdf() {
    const isi = jumlahPilih ? halaman.filter((h) => terpilih.has(h.id)) : halaman;
    setMembuatPdf(true);
    try {
      unduhBlob(await buatPdf(isi), namaPdf());
      showToast(`PDF ${isi.length} halaman diunduh.`);
    } catch (err) {
      showToast(`Gagal membuat PDF: ${err.message}`, 'error');
    } finally {
      setMembuatPdf(false);
    }
  }

  function klik(e, h) {
    if (e.shiftKey && jangkar.current) {
      pilihRentang(jangkar.current, h.id, e.ctrlKey || e.metaKey);
      return;
    }
    jangkar.current = h.id;
    if (e.ctrlKey || e.metaKey) pilih(h.id);
    else onAktif(h.id);
  }

  function centang(e, h) {
    if (e.nativeEvent?.shiftKey && jangkar.current) pilihRentang(jangkar.current, h.id, true);
    else pilih(h.id);
    jangkar.current = h.id;
  }

  const selesaiSeret = () => {
    setSeret(null);
    setSisip(null);
  };

  function lepas() {
    if (!seret || !sisip || seret.ids.includes(sisip.id)) return selesaiSeret();
    let sebelum = sisip.id;
    if (sisip.sisi === 'bawah') {
      const i = halaman.findIndex((x) => x.id === sisip.id);
      sebelum = halaman.slice(i + 1).find((x) => !seret.ids.includes(x.id))?.id ?? null;
    }
    pindahBanyak(seret.ids, sebelum);
    if (seret.ids.length > 1) showToast(`${seret.ids.length} halaman dipindahkan.`);
    selesaiSeret();
  }

  function hapusPilihan() {
    hapus(idPilih);
    showToast(`${idPilih.length} halaman dihapus.`);
    setKonfirmasi(null);
  }

  return (
    <section
      className={`${ADMIN.card} flex flex-col min-w-0 @min-[1000px]/halaman:h-full @min-[1000px]/halaman:min-h-0`}
    >
      <div className="flex items-start justify-between gap-2 mb-3 shrink-0">
        <div className="min-w-0">
          <h2 className={FORM.cardTitle}>Urutan Halaman</h2>
          <p className={FORM.cardSub}>
            {halaman.length ? `${halaman.length} halaman · seret untuk menggeser` : 'Masih kosong'}
          </p>
        </div>
        {halaman.length > 0 &&
          (konfirmasi === 'semua' ? (
            <span className={`flex items-center gap-1.5 shrink-0 ${ANIM.muncul}`}>
              <button
                type="button"
                className={ADMIN.miniYes}
                onClick={() => {
                  kosongkan();
                  setKonfirmasi(null);
                }}
              >
                Hapus semua
              </button>
              <button type="button" className={ADMIN.miniNo} onClick={() => setKonfirmasi(null)}>
                Batal
              </button>
            </span>
          ) : (
            <button
              type="button"
              className={`${BTN.xs} shrink-0`}
              onClick={() => setKonfirmasi('semua')}
            >
              Kosongkan
            </button>
          ))}
      </div>

      <button
        type="button"
        className={`${ADMIN.btnSubmit} w-full shrink-0`}
        onClick={unduhPdf}
        disabled={!halaman.length || membuatPdf}
      >
        {membuatPdf ? (
          <FaCircleNotch size={12} className="animate-spin" />
        ) : (
          <FaFilePdf size={12} />
        )}
        {membuatPdf ? 'Membuat PDF…' : jumlahPilih ? `Unduh PDF (${jumlahPilih})` : 'Unduh PDF'}
      </button>

      {halaman.length > 0 && (
        <div className={`mt-3 pb-3 border-b shrink-0 ${T.border}`}>
          <div className="flex items-center gap-2">
            <label className={`flex items-center gap-2 text-[12px] cursor-pointer ${T.ink2}`}>
              <input
                type="checkbox"
                checked={semuaTerpilih}
                ref={(el) => {
                  if (el) el.indeterminate = jumlahPilih > 0 && !semuaTerpilih;
                }}
                onChange={(e) => pilihSemua(e.target.checked)}
                className="w-4 h-4 accent-[#2A78D6]"
              />
              {jumlahPilih ? (
                <span className={`font-semibold ${STATUS.infoInk}`}>{jumlahPilih} dipilih</span>
              ) : (
                'Pilih semua'
              )}
            </label>
            {jumlahPilih > 0 && (
              <button
                type="button"
                className={`ml-auto ${ADMIN.rowBtn}`}
                onClick={() => pilihSemua(false)}
                title="Batal pilih (Esc)"
              >
                <FaTimes size={11} />
              </button>
            )}
          </div>

          {jumlahPilih > 0 ? (
            <div className={`mt-2.5 ${ANIM.muncul}`}>
              {konfirmasi === 'pilihan' ? (
                <div className={`flex items-center gap-2 ${ANIM.muncul}`}>
                  <span className={ADMIN.confirmText}>Hapus {jumlahPilih} halaman?</span>
                  <button type="button" className={ADMIN.miniYes} onClick={hapusPilihan}>
                    Ya
                  </button>
                  <button
                    type="button"
                    className={ADMIN.miniNo}
                    onClick={() => setKonfirmasi(null)}
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  <button
                    type="button"
                    className={AKSI}
                    onClick={() => putar(idPilih, -90)}
                    title="Putar kiri"
                  >
                    <FaUndo size={12} />
                  </button>
                  <button
                    type="button"
                    className={AKSI}
                    onClick={() => putar(idPilih, 90)}
                    title="Putar kanan"
                  >
                    <FaRedo size={12} />
                  </button>
                  <button
                    type="button"
                    className={AKSI}
                    onClick={() => geserBanyak(idPilih, -1)}
                    disabled={pilihanDiAwal}
                    title="Naikkan satu langkah"
                  >
                    <FaChevronUp size={12} />
                  </button>
                  <button
                    type="button"
                    className={AKSI}
                    onClick={() => geserBanyak(idPilih, 1)}
                    disabled={pilihanDiAkhir}
                    title="Turunkan satu langkah"
                  >
                    <FaChevronDown size={12} />
                  </button>
                  <button
                    type="button"
                    className={AKSI}
                    onClick={() => pindahBanyak(idPilih, 'awal')}
                    disabled={pilihanDiAwal}
                    title="Pindahkan ke awal"
                  >
                    <FaAngleDoubleUp size={14} />
                  </button>
                  <button
                    type="button"
                    className={AKSI}
                    onClick={() => pindahBanyak(idPilih, null)}
                    disabled={pilihanDiAkhir}
                    title="Pindahkan ke akhir"
                  >
                    <FaAngleDoubleDown size={14} />
                  </button>
                  <button
                    type="button"
                    className={`${AKSI} hover:text-[#A62D2D] dark:hover:text-[#F19191]`}
                    onClick={() => setKonfirmasi('pilihan')}
                    title="Hapus yang terpilih"
                  >
                    <FaTrashAlt size={12} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className={`mt-1.5 text-[11px] leading-[1.5] ${T.inkMuted}`}>
              Ctrl/Shift+klik atau lingkaran di gambar untuk memilih beberapa.
            </p>
          )}
        </div>
      )}

      {halaman.length === 0 ? (
        <p className={`mt-4 text-[12.5px] leading-[1.6] text-center px-2 py-8 ${T.inkMuted}`}>
          Halaman yang dipindai atau diimpor akan berbaris di sini sesuai urutan masuknya.
        </p>
      ) : (
        <ul
          className="mt-3 -mx-1 px-1 py-1.5 space-y-1 overflow-y-auto overflow-x-hidden overscroll-contain min-h-0 flex-1 max-h-[60vh] @min-[1000px]/halaman:max-h-none"
          onDragEnd={selesaiSeret}
        >
          {halaman.map((h, i) => (
            <KartuUrutan
              key={h.id}
              halaman={h}
              nomor={i + 1}
              total={halaman.length}
              aktif={h.id === aktifId}
              terpilih={terpilih.has(h.id)}
              modePilih={jumlahPilih > 0}
              ikutDiseret={!!seret?.ids.includes(h.id)}
              sisipan={sisip?.id === h.id ? sisip.sisi : null}
              onKlik={(e) => klik(e, h)}
              onCentang={(e) => centang(e, h)}
              onGeser={(arah) =>
                terpilih.has(h.id) && jumlahPilih > 1
                  ? geserBanyak(idPilih, arah)
                  : pindah(h.id, i + arah)
              }
              onHapus={(el) => hapusBaris(el, () => hapus([h.id]))}
              onSeretMulai={(e) => {
                const ids = terpilih.has(h.id) ? idPilih : [h.id];
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/x-halaman', ids.join(','));
                if (ids.length > 1 && hantu.current) {
                  e.dataTransfer.setDragImage(hantu.current, 18, 18);
                }
                setSeret({ ids });
              }}
              onSeretAtas={(e) => {
                if (!seret) return;
                e.preventDefault();
                if (seret.ids.includes(h.id)) {
                  if (sisip) setSisip(null);
                  return;
                }
                const r = e.currentTarget.getBoundingClientRect();
                const sisi = e.clientY < r.top + r.height / 2 ? 'atas' : 'bawah';
                if (sisip?.id !== h.id || sisip.sisi !== sisi) setSisip({ id: h.id, sisi });
              }}
              onLepas={(e) => {
                if (!seret) return;
                e.preventDefault();
                lepas();
              }}
            />
          ))}
        </ul>
      )}

      {/* Gambar seret untuk banyak halaman (di luar layar; hanya dipotret browser saat menyeret) */}
      <div
        ref={hantu}
        aria-hidden="true"
        className={`fixed -left-[9999px] top-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold text-white bg-[#0f2040] ${FONT.mono}`}
      >
        <FaCopy size={11} /> {jumlahPilih} halaman
      </div>
    </section>
  );
}
