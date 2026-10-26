import React, { useState } from 'react';
import { FaChevronDown, FaRegCopy } from 'react-icons/fa';
import { isPerjadin, makOf, tanggalRingkas, uraianOf } from '../../utils/lpjLogic';
import { formatTanggal } from '../../utils/formatTanggal';
import { nipSpasi } from '../../utils/verifikasiLogic';
import { FONT, T } from '@/utils/uiTokens';
import { ANIM, jedaKe } from '@/utils/animasi';
import { XLBL } from './tahapTampil';

/**
 * Kartu Informasi LPJ (PgvInfoCard purwarupa): Kode MAK | Tanggal SPBy, lalu (Perjadin)
 * Tanggal Berangkat | Tanggal Kembali, lalu Uraian + tombol salin.
 */
export function InfoBerkasVerif({ pack, judul, onSalin }) {
  const tgl = tanggalRingkas(pack);
  const uraian = uraianOf(pack);
  const kolom = [
    [
      'Kode MAK',
      <span key="mak" className={`${FONT.mono} break-all`}>
        {makOf(pack)?.kode || '—'}
      </span>,
    ],
    ['Tanggal SPBy', formatTanggal(tgl.tanggalLPJ)],
  ];
  if (isPerjadin(pack)) {
    kolom.push(['Tanggal Berangkat', formatTanggal(tgl.berangkat)]);
    kolom.push(['Tanggal Kembali', formatTanggal(tgl.kembali)]);
  }
  return (
    <div
      className={`flex flex-col gap-3.5 px-3.5 py-3.5 sm:px-[18px] sm:py-4 rounded-xl border text-[13px] ${T.surface} ${T.border} ${T.ink}`}
    >
      {judul && <div className={`${XLBL} -mb-0.5`}>{judul}</div>}
      <div className="grid grid-cols-2 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-x-4 gap-y-3 sm:gap-x-6 sm:gap-y-3.5 [&>div:first-child]:col-span-2 sm:[&>div:first-child]:col-span-1">
        {kolom.map(([label, isi]) => (
          <div key={label} className="min-w-0">
            <div className={`${XLBL} mb-[3px]`}>{label}</div>
            <div className="leading-[1.4]">{isi}</div>
          </div>
        ))}
      </div>
      <div className={`pt-3 border-t ${T.border}`}>
        <div className="flex items-center gap-1.5 mb-[3px]">
          <span className={XLBL}>Uraian Kegiatan</span>
          {uraian && onSalin && (
            <button
              type="button"
              title="Salin uraian"
              aria-label="Salin uraian"
              onClick={onSalin}
              className={`p-1 rounded-md ${T.inkMuted} ${T.hoverSurface2} hover:text-[#101A2C] dark:hover:text-[#EAF0F8] ${ANIM.tekan}`}
            >
              <FaRegCopy size={11} />
            </button>
          )}
        </div>
        {uraian ? (
          <div className="leading-[1.5]">{uraian}</div>
        ) : (
          <div className={`italic ${T.inkMuted}`}>Belum diisi pelaksana</div>
        )}
      </div>
    </div>
  );
}

const TAMPIL_AWAL = 1;

/**
 * Daftar pelaksana berbentuk tabel (No, Nama, NIP). Bila lebih dari 3 orang: satu baris dulu,
 * sisanya lewat "Lihat N pelaksana lainnya" dalam kotak yang bisa digulir.
 */
export function TabelPelaksana({ pelaksana }) {
  const [semua, setSemua] = useState(false);
  const banyak = pelaksana.length > 3;
  const tampil = banyak && !semua ? pelaksana.slice(0, TAMPIL_AWAL) : pelaksana;
  const KOLOM =
    'grid grid-cols-[28px_minmax(0,1fr)] sm:grid-cols-[56px_minmax(0,1.3fr)_minmax(0,1fr)] gap-x-2.5 sm:gap-x-3.5 gap-y-0.5 items-center px-3.5 sm:px-[18px] py-[11px]';
  return (
    <section className="flex flex-col gap-2" aria-label="Daftar pelaksana">
      <div className={XLBL}>
        Daftar Pelaksana{pelaksana.length > 1 ? ` · ${pelaksana.length} orang` : ''}
      </div>
      <div className={`rounded-xl border overflow-hidden ${T.surface} ${T.border}`}>
        <div
          className={`${KOLOM} max-sm:hidden text-[11.5px] font-bold ${T.surface2} ${T.inkMuted}`}
        >
          <span>No.</span>
          <span>Nama</span>
          <span>NIP</span>
        </div>
        <div className={semua ? 'max-h-[300px] overflow-y-auto overscroll-contain' : ''}>
          {tampil.length === 0 && (
            <div className={`px-[18px] py-3 text-[13px] italic ${T.inkMuted}`}>
              Belum ada pelaksana
            </div>
          )}
          {tampil.map((p, i) => (
            <div
              key={p.id || i}
              className={`${KOLOM} border-t text-[13.5px] max-sm:first:border-t-0 ${T.border} ${
                i >= TAMPIL_AWAL ? `${ANIM.muncul} ${jedaKe(i - TAMPIL_AWAL)}` : ''
              }`}
            >
              <span className={`tabular-nums ${T.inkMuted}`}>{i + 1}</span>
              <b className={`font-bold min-w-0 break-words ${T.ink}`}>{p.nama}</b>
              <span
                className={`${FONT.mono} text-[12.5px] whitespace-nowrap max-sm:col-start-2 ${T.ink2}`}
              >
                {nipSpasi(p.nip)}
              </span>
            </div>
          ))}
        </div>
        {banyak && (
          <button
            type="button"
            aria-expanded={semua}
            onClick={() => setSemua(!semua)}
            className={`flex items-center justify-center gap-1.5 w-full min-h-[42px] px-4 border-t text-[12.5px] font-bold ${T.border} ${T.surface2} ${T.ink2} hover:text-[#101A2C] dark:hover:text-[#EAF0F8]`}
          >
            <span>
              {semua
                ? 'Ringkas daftar'
                : `Lihat ${pelaksana.length - TAMPIL_AWAL} pelaksana lainnya`}
            </span>
            <FaChevronDown
              size={11}
              className={`motion-safe:transition-transform motion-safe:duration-200 ${semua ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>
    </section>
  );
}
