import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaCheck, FaChevronDown, FaFilter } from 'react-icons/fa';
import { BTN, FONT, T } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';
import { Lipat, useMunculBerurutan } from '@/components/animasi';
import {
  AKSI_TAHAP,
  IKON_TAHAP,
  TONE,
  formatTanggal,
  labelTahap,
  lpjIdLabel,
  nominalRingkas,
  pelaksanaOf,
  rupiah,
  uraianOf,
} from '@/modules/e-persuratan/lpj';
import { TAHAP_PROSES } from '../utils/tahap';
import { JUDUL, KARTU } from '../ui/kelas';

const URUTAN = Object.fromEntries(TAHAP_PROSES.map((k, i) => [k, i]));
const BATAS = 6; // baris yang tampil sebelum "Lihat N berkas lainnya"
const PILIHAN = [['semua', 'Semua'], ...TAHAP_PROSES.map((k) => [k, labelTahap(k)])];

const CHIP = `h-8 px-3.5 rounded-full border text-[12.5px] font-bold whitespace-nowrap ${ANIM.pilih}`;
const CHIP_OFF = `${T.border} ${T.ink2} ${T.hoverSurface2}`;
const CHIP_ON =
  'bg-[#101A2C] border-[#101A2C] text-white dark:bg-[#EAF0F8] dark:border-[#EAF0F8] dark:text-[#111D2E]';

/**
 * Kartu "Perlu Diproses" Dashboard Keuangan: berkas di tahap Verifikasi → Arsip, yang paling lama
 * menunggu (tanggal SPBy) di atas. Chip menyaring per tahap; bila chip tidak muat satu baris,
 * berganti menjadi tombol filter dengan menu. Klik baris → aksi tahapnya di Berkas Verifikasi.
 */
export default function PerluDiproses({
  berkas,
  memuat,
  galat,
  bisaLagi,
  memuatLagi,
  muatLagi,
  onBuka,
}) {
  const [saring, setSaring] = useState('semua');
  const [semua, setSemua] = useState(false);

  const urut = useMemo(
    () =>
      [...berkas].sort(
        (a, b) =>
          (a.tanggalLpj || '').localeCompare(b.tanggalLpj || '') ||
          URUTAN[a.tahap] - URUTAN[b.tahap],
      ),
    [berkas],
  );
  const jumlah = useMemo(() => {
    const n = { semua: urut.length };
    TAHAP_PROSES.forEach((k) => (n[k] = urut.filter((r) => r.tahap === k).length));
    return n;
  }, [urut]);
  const daftar = saring === 'semua' ? urut : urut.filter((r) => r.tahap === saring);
  const awal = daftar.slice(0, BATAS);
  const sisa = daftar.slice(BATAS);

  const wadahRef = useMunculBerurutan(`${saring}|${memuat}|${daftar.length > 0}`);

  let isi;
  if (memuat) {
    isi = (
      <div className="animate-pulse flex flex-col gap-2.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`h-[68px] rounded-[18px] ${T.surface2}`} />
        ))}
      </div>
    );
  } else if (galat) {
    isi = (
      <p className={`py-[30px] px-2.5 text-center text-[13px] ${T.inkMuted}`}>
        Daftar berkas tidak dapat dimuat (tidak punya akses atau gagal memuat).
      </p>
    );
  } else {
    isi = (
      <div ref={wadahRef}>
        <ul className="flex flex-col gap-2.5">
          {awal.map((r) => (
            <BarisBerkas key={r.id} r={r} onBuka={onBuka} />
          ))}
          {daftar.length === 0 && (
            <li className={`py-[30px] px-2.5 text-center text-[13px] ${T.inkMuted}`}>
              Tidak ada berkas pada tahap ini
            </li>
          )}
        </ul>
        {sisa.length > 0 && (
          <Lipat buka={semua}>
            <ul className="flex flex-col gap-2.5 pt-2.5">
              {sisa.map((r) => (
                <BarisBerkas key={r.id} r={r} onBuka={onBuka} />
              ))}
            </ul>
          </Lipat>
        )}
      </div>
    );
  }

  return (
    <section aria-label="Perlu diproses" className={`${KARTU} col-span-full ${ANIM.muncul}`}>
      <div className="flex items-start justify-between gap-3 mb-3.5">
        <div>
          <h2 className={JUDUL}>Perlu Diproses</h2>
          <p className={`mt-[3px] text-[12.5px] ${T.inkMuted}`}>
            Berkas paling lama menunggu tampil lebih dulu
          </p>
        </div>
        <span
          className={`shrink-0 px-3 py-[5px] rounded-full text-xs font-bold tabular-nums ${T.surface2} ${T.ink2}`}
        >
          {memuat ? '…' : `${daftar.length}${bisaLagi ? '+' : ''} berkas`}
        </span>
      </div>

      <ChipTahap saring={saring} onSaring={setSaring} jumlah={jumlah} />

      {isi}

      {!memuat && sisa.length > 0 && (
        <button
          type="button"
          aria-expanded={semua}
          onClick={() => setSemua((v) => !v)}
          className={`self-start inline-flex items-center gap-1 mt-2 -ml-3 px-3 py-2 rounded-[10px] text-[13px] font-bold text-[#2563EB] dark:text-[#3B82F6] ${T.hoverSurface2}`}
        >
          {semua ? 'Tampilkan lebih sedikit' : `Lihat ${sisa.length} berkas lainnya`}
          <FaChevronDown
            size={11}
            className={`motion-safe:transition-transform motion-safe:duration-200 ${semua ? 'rotate-180' : ''}`}
          />
        </button>
      )}
      {!memuat && bisaLagi && (semua || sisa.length === 0) && (
        <button
          type="button"
          onClick={muatLagi}
          disabled={memuatLagi}
          className={`${BTN.sm} self-center mt-3`}
        >
          {memuatLagi ? 'Memuat…' : 'Muat lebih banyak'}
        </button>
      )}
    </section>
  );
}

/** Chip saring tahap; menjadi chip terpilih + tombol filter bila tidak muat satu baris. */
function ChipTahap({ saring, onSaring, jumlah }) {
  const wadahRef = useRef(null);
  const ukurRef = useRef(null);
  const [ringkas, setRingkas] = useState(false);
  const [buka, setBuka] = useState(false);

  useEffect(() => {
    const w = wadahRef.current;
    const m = ukurRef.current;
    if (!w || !m) return undefined;
    const cek = () => setRingkas(m.scrollWidth > w.clientWidth + 1);
    cek();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(cek) : null;
    ro?.observe(w);
    document.fonts?.ready?.then(cek);
    return () => ro?.disconnect();
  }, []);

  useEffect(() => {
    if (!buka) return undefined;
    const tekan = (e) => {
      if (wadahRef.current && !wadahRef.current.contains(e.target)) setBuka(false);
    };
    const tombol = (e) => e.key === 'Escape' && setBuka(false);
    document.addEventListener('mousedown', tekan);
    document.addEventListener('keydown', tombol);
    return () => {
      document.removeEventListener('mousedown', tekan);
      document.removeEventListener('keydown', tombol);
    };
  }, [buka]);

  const labelTerpilih = PILIHAN.find(([k]) => k === saring)[1];

  return (
    <div ref={wadahRef} className="relative mb-3.5">
      {/* Salinan tak terlihat untuk mengukur lebar chip dalam satu baris */}
      <div
        ref={ukurRef}
        aria-hidden="true"
        className="invisible absolute left-0 top-0 h-0 w-max overflow-hidden flex flex-nowrap gap-2 pointer-events-none"
      >
        {PILIHAN.map(([k, label]) => (
          <span key={k} className={`${CHIP} inline-flex items-center`}>
            {label}
          </span>
        ))}
      </div>
      {!ringkas ? (
        <div role="group" aria-label="Saring menurut tahap" className="flex flex-wrap gap-2">
          {PILIHAN.map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={saring === k}
              onClick={() => onSaring(k)}
              className={`${CHIP} ${saring === k ? CHIP_ON : CHIP_OFF}`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className={`${CHIP} inline-flex items-center ${CHIP_ON}`}>{labelTerpilih}</span>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={buka}
            aria-label="Saring menurut tahap"
            onClick={() => setBuka((v) => !v)}
            className={`grid place-items-center w-8 h-8 rounded-full border ${T.border} ${T.ink2} ${T.hoverSurface2} ${ANIM.pilih} ${buka ? T.surface2 : ''}`}
          >
            <FaFilter size={11} />
          </button>
          {buka && (
            <div
              role="menu"
              className={`absolute z-30 top-[calc(100%+6px)] left-0 min-w-[230px] max-w-[calc(100vw-48px)] flex flex-col gap-0.5 p-1.5 rounded-2xl border ${T.surface} ${T.border} shadow-[0_20px_40px_-18px_rgba(14,35,64,.5)] ${ANIM.popover}`}
            >
              {PILIHAN.map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  role="menuitemradio"
                  aria-checked={saring === k}
                  onClick={() => {
                    onSaring(k);
                    setBuka(false);
                  }}
                  className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-[10px] text-left text-[13.5px] ${T.ink} ${T.hoverSurface2} ${
                    saring === k ? `${T.surface2} font-extrabold` : 'font-semibold'
                  }`}
                >
                  <span className="flex-1">{label}</span>
                  <em className={`not-italic text-xs font-bold tabular-nums ${T.inkMuted}`}>
                    {jumlah[k]}
                  </em>
                  {saring === k ? <FaCheck size={12} /> : <span className="w-3" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Satu berkas: pelaksana + uraian, nominal + tanggal SPBy, tombol aksi berwarna tahapnya. */
function BarisBerkas({ r, onBuka }) {
  const nama = pelaksanaOf(r).map((p) => p.nama);
  const Ikon = IKON_TAHAP[r.tahap];
  return (
    <li data-bertahap>
      <button
        type="button"
        onClick={() => onBuka(r)}
        aria-label={`Buka ${lpjIdLabel(r)} ${nama[0] || ''}, tahap ${labelTahap(r.tahap)}`}
        className={`group grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 w-full px-[18px] py-3.5 rounded-[18px] border text-left ${T.surface} ${T.border} ${T.ink} shadow-[0_10px_22px_-18px_rgba(14,35,64,.5)] hover:shadow-[0_14px_26px_-16px_rgba(14,35,64,.45)] dark:shadow-none hover:border-[#CBD3DE] dark:hover:border-[#304864] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#2563EB] motion-safe:transition-[translate,box-shadow,border-color] motion-safe:duration-150 motion-safe:hover:-translate-y-px max-sm:grid-cols-[minmax(0,1fr)] max-sm:gap-2 max-sm:items-start max-sm:px-4 max-sm:pt-3.5 max-sm:pb-4`}
      >
        <span className="flex flex-col gap-0.5 min-w-0">
          <span className="flex items-center gap-1.5 min-w-0 text-sm">
            <b className="truncate font-extrabold">{nama[0] || '—'}</b>
            {nama.length > 1 && (
              <em
                className={`not-italic shrink-0 px-[7px] py-px rounded-full text-[11px] font-bold ${T.surface2} ${T.ink2}`}
              >
                +{nama.length - 1}
              </em>
            )}
          </span>
          <span className={`truncate text-[12.5px] ${T.inkMuted}`}>
            {uraianOf(r) || 'Belum diisi'}
          </span>
        </span>
        <span className="flex flex-col items-end gap-0.5 min-w-[96px] max-sm:flex-row max-sm:items-baseline max-sm:justify-between max-sm:gap-2.5 max-sm:min-w-0">
          <b className={`${FONT.mono} text-[13.5px] whitespace-nowrap`}>
            {rupiah(nominalRingkas(r))}
          </b>
          <small className={`text-[11.5px] whitespace-nowrap ${T.inkMuted}`}>
            SPBy {formatTanggal(r.tanggalLpj)}
          </small>
        </span>
        <span
          className={`inline-flex items-center justify-center gap-2 h-10 min-w-[140px] px-3.5 rounded-xl text-[13px] font-bold whitespace-nowrap shadow-[0_8px_16px_-10px_rgba(14,35,64,.6)] motion-safe:transition-transform motion-safe:duration-150 motion-safe:group-hover:-translate-y-px max-sm:w-full max-sm:min-w-0 max-sm:h-11 max-sm:mt-1 ${TONE[r.tahap].solid}`}
        >
          <Ikon size={13} />
          {AKSI_TAHAP[r.tahap]}
        </span>
      </button>
    </li>
  );
}
