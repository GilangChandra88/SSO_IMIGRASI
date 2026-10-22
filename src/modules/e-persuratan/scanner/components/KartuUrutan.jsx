import React, { useLayoutEffect, useRef } from 'react';
import { FaCheck, FaChevronDown, FaChevronUp, FaTrashAlt } from 'react-icons/fa';
import { FONT, STATUS, T } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';
import { LABEL_SUMBER_HALAMAN } from '../data/label';
import { putarMini, selisihRotasi } from '../animasiScanner';
import { kelasRotasi } from '../utils/gambar';

const TOMBOL = `w-6 h-6 rounded-md grid place-items-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${T.inkMuted} enabled:hover:bg-[#E9ECF1] dark:enabled:hover:bg-[#1C2C45] enabled:hover:text-[#101A2C] dark:enabled:hover:text-[#EAF0F8]`;
const TOMBOL_HAPUS = `w-6 h-6 rounded-md grid place-items-center cursor-pointer ${T.inkMuted} hover:bg-[rgba(208,59,59,.13)] hover:text-[#A62D2D] dark:hover:text-[#F19191]`;

// Muncul saat kursor di atas baris / fokus keyboard; selalu tampil di perangkat sentuh
const MUNCUL_SAAT_SOROT =
  'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100';

const PETUNJUK = 'Klik: tampilkan · Ctrl+klik: pilih · Shift+klik: pilih rentang';

// Satu latar per keadaan, tanpa bingkai (kelas warna tidak digabung agar tidak bentrok)
function kelasKeadaan(aktif, terpilih) {
  if (terpilih) return STATUS.infoBg;
  if (aktif) return T.surface2;
  return T.hoverSurface2;
}

/**
 * Satu baris ringkas di panel Urutan: gambar mini (nomor di pojok) + nama + keterangan.
 * Klik = tampilkan di kanvas; Ctrl/⌘+klik = pilih; Shift+klik = pilih rentang; lingkaran di
 * pojok gambar = centang. Tombol ▲▼🗑 muncul saat disorot. Seret (bersama halaman terpilih
 * lain) untuk mengubah urutan; `sisipan` ('atas'|'bawah') = garis emas posisi jatuh.
 */
export default function KartuUrutan({
  halaman: h,
  nomor,
  total,
  aktif,
  terpilih,
  modePilih,
  ikutDiseret,
  sisipan,
  onKlik,
  onCentang,
  onGeser,
  onHapus,
  onSeretMulai,
  onSeretAtas,
  onLepas,
}) {
  // Gambar mini berputar halus saat rotasi halaman berubah (elemen tetap, tidak dipasang ulang)
  const gambarRef = useRef(null);
  const rotasiLalu = useRef(h.rotasi);
  useLayoutEffect(() => {
    putarMini(gambarRef.current, selisihRotasi(rotasiLalu.current, h.rotasi));
    rotasiLalu.current = h.rotasi;
  }, [h.rotasi]);

  return (
    <li
      draggable
      aria-selected={terpilih}
      data-urutan-id={h.id}
      onDragStart={onSeretMulai}
      onDragOver={onSeretAtas}
      onDrop={onLepas}
      className={`group relative flex items-center gap-2.5 pl-2.5 pr-2 py-1.5 rounded-[10px] cursor-grab active:cursor-grabbing select-none ${ANIM.muncul} motion-safe:transition-[background-color,opacity,scale] motion-safe:duration-200 ${kelasKeadaan(aktif, terpilih)} ${
        ikutDiseret ? 'opacity-40 motion-safe:scale-[.97]' : ''
      }`}
    >
      {/* Penanda halaman yang tampil di kanvas */}
      {aktif && (
        <span
          aria-hidden="true"
          className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#2A78D6] dark:bg-[#7DB6F3] ${ANIM.pudar}`}
        />
      )}
      {sisipan && (
        <span
          aria-hidden="true"
          className={`absolute inset-x-1 h-[3px] rounded-full bg-[#C9973B] shadow-[0_0_8px_rgba(201,151,59,.7)] pointer-events-none ${
            sisipan === 'atas' ? '-top-[3px]' : '-bottom-[3px]'
          } ${ANIM.pudar}`}
        />
      )}

      {/* Gambar mini + nomor + lingkaran centang */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={onKlik}
          tabIndex={-1}
          title={PETUNJUK}
          className="w-9 h-12 rounded-[5px] bg-white overflow-hidden grid place-items-center cursor-pointer shadow-[0_0_0_1px_rgba(16,26,44,.12)] dark:shadow-none"
        >
          <img
            ref={gambarRef}
            src={h.url}
            alt=""
            draggable={false}
            className={`w-full h-full object-contain ${kelasRotasi(h.rotasi, h.tinggi >= h.lebar)}`}
          />
        </button>
        <span
          className={`absolute -bottom-1 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full grid place-items-center text-[10px] font-bold text-white bg-[#0f2040] dark:bg-[#1e4080] ring-2 ring-white dark:ring-[#111D2E] pointer-events-none ${FONT.mono}`}
        >
          {nomor}
        </span>
        <button
          type="button"
          role="checkbox"
          aria-checked={terpilih}
          aria-label={`Pilih halaman ${nomor}`}
          title="Pilih (Shift = rentang)"
          onClick={onCentang}
          className={`absolute -top-1.5 -left-1.5 w-[18px] h-[18px] rounded-full grid place-items-center border-[1.5px] cursor-pointer motion-safe:transition-[opacity,background-color,border-color] motion-safe:duration-150 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-[#2A78D6] ${
            terpilih
              ? 'bg-[#2A78D6] border-[#2A78D6] text-white opacity-100'
              : `${T.surface} ${T.borderStrong} ${modePilih ? 'opacity-100' : MUNCUL_SAAT_SOROT}`
          }`}
        >
          {terpilih && <FaCheck size={8} className={ANIM.meletup} />}
        </button>
      </div>

      {/* Nama + keterangan */}
      <button
        type="button"
        onClick={onKlik}
        title={PETUNJUK}
        className="flex-1 min-w-0 text-left cursor-pointer"
      >
        <span className={`block text-[12.5px] font-semibold truncate ${T.ink}`}>{h.nama}</span>
        <span className={`block mt-0.5 text-[11px] truncate ${T.inkMuted}`}>
          {LABEL_SUMBER_HALAMAN[h.sumber]} · {h.lebar}×{h.tinggi}
        </span>
      </button>

      {/* Aksi baris: melayang di kanan saat disorot (tidak memakan ruang nama) */}
      <span
        className={`absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 p-0.5 rounded-lg border ${T.surface} ${T.border} ${T.shadowSm} motion-safe:transition-opacity motion-safe:duration-150 ${MUNCUL_SAAT_SOROT}`}
      >
        <button
          type="button"
          className={TOMBOL}
          onClick={() => onGeser(-1)}
          disabled={nomor === 1}
          title={terpilih ? 'Naikkan semua yang terpilih' : 'Naikkan'}
        >
          <FaChevronUp size={9} />
        </button>
        <button
          type="button"
          className={TOMBOL}
          onClick={() => onGeser(1)}
          disabled={nomor === total}
          title={terpilih ? 'Turunkan semua yang terpilih' : 'Turunkan'}
        >
          <FaChevronDown size={9} />
        </button>
        <button
          type="button"
          className={TOMBOL_HAPUS}
          onClick={(e) => onHapus(e.currentTarget.closest('li'))}
          title="Hapus halaman"
        >
          <FaTrashAlt size={10} />
        </button>
      </span>
    </li>
  );
}
