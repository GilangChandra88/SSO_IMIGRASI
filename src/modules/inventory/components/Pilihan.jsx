import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FaCalendarAlt,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaSearch,
  FaTimes,
} from 'react-icons/fa';
import { FONT, T } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';
import { BIRU, K } from '../ui/kelas';
import { BULAN, buatIso, hariIni } from '../utils/stokLogic';
import { useTutupLuar } from '../hooks/useTutupLuar';

const KOTAK = `relative flex items-center w-full h-10 rounded-lg border overflow-hidden text-left ${T.borderStrong} ${T.surface} ${T.ink} focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#2A78D6] dark:focus-within:outline-[#5599e8]`;
const DAFTAR = `absolute z-40 left-0 right-0 m-0 p-1 list-none max-h-[232px] overflow-auto rounded-[10px] border ${T.surface} ${T.borderStrong} ${T.shadowMd} ${ANIM.popover}`;
const TOMBOL_X = `absolute right-2 top-2 w-6 h-6 inline-flex items-center justify-center rounded-md cursor-pointer ${T.inkMuted} ${T.hoverSurface2}`;

/** Daftar melayang dibuka ke atas bila ruang di bawah kotak sempit (tanpa mengatur style). */
function useKeAtas(akar, buka, tinggi = 250) {
  const [keAtas, setKeAtas] = useState(false);
  useLayoutEffect(() => {
    if (!buka || !akar.current) return;
    const r = akar.current.getBoundingClientRect();
    const bawah = window.innerHeight - r.bottom;
    setKeAtas(bawah < tinggi && r.top > bawah);
  }, [akar, buka, tinggi]);
  return keAtas ? 'bottom-full mb-1 origin-bottom' : 'top-full mt-1';
}

/** Kotak pencarian teks dengan ikon kaca pembesar di kiri. */
export function KotakCari({ id, nilai, onUbah, placeholder, ariaLabel }) {
  return (
    <div className="relative w-full group">
      <span
        className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${T.inkMuted} group-focus-within:text-[#2A78D6]`}
        aria-hidden="true"
      >
        <FaSearch size={14} />
      </span>
      <input
        className={`${K.ctl} pl-10`}
        id={id}
        type="search"
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={nilai}
        onChange={(e) => onUbah(e.target.value)}
      />
    </div>
  );
}

/**
 * Kotak pilihan yang bisa dicari. opsi: [{ nilai, label, kode?, kelompok?: { kode, nama }, cari?, info?, nonaktif? }].
 * kelompok: judul di atas opsi berurutan; info: teks di kanan; nonaktif: tampil tetapi tidak bisa dipilih.
 * nilaiAwal: bila nilai terpilih sama dengan ini (mis. 'semua'), tulisannya abu-abu seperti petunjuk.
 * onHapus: setelah terisi, pilihan dikunci dan harus direset (×) dulu sebelum memilih lagi.
 */
export function PilihCari({
  id,
  opsi,
  nilai,
  onPilih,
  onHapus,
  placeholder = 'Cari...',
  autoFocus = false,
  ariaLabel,
  nilaiAwal,
}) {
  const [buka, setBuka] = useState(false);
  const [kueri, setKueri] = useState('');
  const [aktif, setAktif] = useState(0);
  const akar = useRef(null);
  const daftarRef = useRef(null);
  const inputRef = useRef(null);
  const idDaftar = `${id}-daftar`;
  const terpilih = opsi.find((o) => String(o.nilai) === String(nilai));
  const adaKode = opsi.some((o) => o.kode);
  const terkunci = Boolean(onHapus && terpilih);
  const arah = useKeAtas(akar, buka);

  const hasil = useMemo(() => {
    const q = kueri.trim().toLowerCase();
    if (!q) return opsi;
    return opsi.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.kode && o.kode.toLowerCase().includes(q)) ||
        (o.cari && o.cari.toLowerCase().includes(q)),
    );
  }, [opsi, kueri]);

  const tutup = useCallback(() => {
    setBuka(false);
    setKueri('');
  }, []);
  useTutupLuar(akar, buka, tutup);

  // Opsi yang disorot ikut tergulir ke dalam daftar
  useEffect(() => {
    if (!buka || !daftarRef.current) return;
    const el = daftarRef.current.querySelector(`[data-idx="${aktif}"]`);
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }, [aktif, buka]);

  function bukaDaftar() {
    if (buka || terkunci) return;
    setKueri('');
    setAktif(
      Math.max(
        0,
        opsi.findIndex((o) => String(o.nilai) === String(nilai)),
      ),
    );
    setBuka(true);
  }

  function pilih(o) {
    if (o.nonaktif) return;
    onPilih(String(o.nilai));
    tutup();
  }

  function tombol(e) {
    if (terkunci) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!buka) bukaDaftar();
      else setAktif((i) => Math.min(hasil.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (buka) setAktif((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && buka) {
      e.preventDefault();
      if (hasil[aktif]) pilih(hasil[aktif]);
    } else if (e.key === 'Tab' && buka) {
      tutup();
    }
  }

  const kodeKotak = `self-stretch flex items-center shrink-0 basis-[128px] max-[820px]:basis-[96px] px-3 border-r text-sm truncate ${FONT.mono} ${T.surface2} ${T.inkMuted} ${T.borderStrong}`;
  const tampakAwal = !buka && nilaiAwal !== undefined && String(nilai) === String(nilaiAwal);

  return (
    <div className="relative" ref={akar}>
      <div
        className={`${KOTAK} ${terkunci ? 'cursor-default' : 'cursor-text'}`}
        onMouseDown={(e) => {
          if (!terkunci && e.target.tagName !== 'INPUT') {
            e.preventDefault();
            inputRef.current?.focus();
            bukaDaftar();
          }
        }}
      >
        {adaKode && <span className={kodeKotak}>{terpilih ? terpilih.kode : ''}</span>}
        <input
          ref={inputRef}
          id={id}
          className={`flex-1 min-w-0 h-full border-0 outline-none bg-transparent px-3 text-base sm:text-sm ${
            tampakAwal ? `${T.inkMuted} font-normal` : 'font-medium'
          } ${T.placeholder} ${terkunci ? 'pr-8 cursor-default' : ''}`}
          aria-label={ariaLabel}
          role="combobox"
          aria-expanded={buka}
          aria-controls={idDaftar}
          aria-autocomplete="list"
          autoComplete="off"
          autoFocus={autoFocus}
          readOnly={terkunci}
          placeholder={placeholder}
          value={buka ? kueri : terpilih ? terpilih.label : ''}
          onClick={bukaDaftar}
          onKeyDown={tombol}
          onChange={(e) => {
            setKueri(e.target.value);
            setAktif(0);
            if (!buka) setBuka(true);
          }}
        />
        {!terkunci && (
          <span className={`pr-3 pointer-events-none ${T.inkMuted}`} aria-hidden="true">
            <FaChevronDown size={12} />
          </span>
        )}
      </div>
      {terkunci && (
        <button
          type="button"
          className={TOMBOL_X}
          aria-label="Hapus pilihan"
          title="Hapus pilihan"
          onClick={() => {
            onHapus();
            tutup();
          }}
        >
          <FaTimes size={12} />
        </button>
      )}
      {buka && (
        <ul className={`${DAFTAR} ${arah}`} id={idDaftar} role="listbox" ref={daftarRef}>
          {hasil.length === 0 && (
            <li className={`p-3 text-[13px] text-center ${T.inkMuted}`}>
              Tidak ada hasil untuk &ldquo;{kueri}&rdquo;
            </li>
          )}
          {hasil.map((o, i) => {
            const dipilih = String(o.nilai) === String(nilai);
            const awalKelompok =
              o.kelompok &&
              (i === 0 ||
                hasil[i - 1].kelompok.kode !== o.kelompok.kode ||
                hasil[i - 1].kelompok.nama !== o.kelompok.nama);
            return (
              <Fragment key={o.nilai}>
                {awalKelompok && (
                  <li
                    role="presentation"
                    className={`sticky -top-1 z-[1] flex items-center gap-3 px-3 py-[7px] mb-0.5 rounded-md text-[12.5px] font-bold ${T.surface2} ${T.ink}`}
                  >
                    <span className={`${FONT.mono} ${BIRU.text}`}>{o.kelompok.kode}</span>
                    <span>{o.kelompok.nama}</span>
                  </li>
                )}
                <li
                  data-idx={i}
                  role="option"
                  aria-selected={dipilih}
                  aria-disabled={o.nonaktif || undefined}
                  className={`flex items-stretch min-h-9 rounded-md overflow-hidden ${
                    o.nonaktif ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  } ${i === aktif && !o.nonaktif ? 'bg-[#E9ECF1] dark:bg-[#1C2C45]' : ''}`}
                  onMouseEnter={() => setAktif(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pilih(o);
                  }}
                >
                  {adaKode && (
                    <span
                      className={`flex items-center shrink-0 basis-[120px] max-[820px]:basis-[92px] px-3 border-r text-sm ${FONT.mono} ${T.inkMuted} ${T.borderStrong}`}
                    >
                      {o.kode}
                    </span>
                  )}
                  <span
                    className={`flex-1 min-w-0 flex items-center px-3 py-[7px] text-sm leading-[1.35] [overflow-wrap:anywhere] ${
                      dipilih ? 'font-bold text-[#0f2040] dark:text-[#7DB6F3]' : 'font-medium'
                    }`}
                  >
                    {o.label}
                  </span>
                  {o.info && (
                    <span
                      className={`shrink-0 self-center pl-2 pr-3 text-[12.5px] font-semibold tabular-nums ${T.inkMuted}`}
                    >
                      {o.info}
                    </span>
                  )}
                </li>
              </Fragment>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── Kalender ────────────────────────────────────────────────────────────────
const NAMA_HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const pecah = (iso) => iso.split('-').map(Number);
const KAL = `absolute z-40 p-3 rounded-[10px] border ${T.surface} ${T.borderStrong} ${T.shadowMd} ${ANIM.popover} max-[820px]:fixed max-[820px]:left-2 max-[820px]:right-2 max-[820px]:bottom-2 max-[820px]:top-auto max-[820px]:w-auto max-[820px]:max-w-[400px] max-[820px]:mx-auto`;
/** Kelas tombol tanggal kalender (satu warna latar/bingkai per keadaan, tanpa bentrok). */
function kelasTgl({ dipilih = false, tanda = false, dalam = false } = {}) {
  const dasar =
    'h-9 max-[820px]:h-10 border text-[13px] tabular-nums cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';
  if (dipilih) return `${dasar} rounded-lg border-transparent font-bold text-white ${BIRU.bg}`;
  const latar = dalam
    ? `rounded-none ${BIRU.soft}`
    : 'rounded-lg enabled:hover:bg-[#E9ECF1] dark:enabled:hover:bg-[#1C2C45]';
  return `${dasar} ${latar} ${T.ink} ${tanda ? BIRU.border : 'border-transparent'}`;
}

function selBulan(y, m) {
  const awal = (new Date(y, m - 1, 1).getDay() + 6) % 7; // Senin = 0
  const jumlahHari = new Date(y, m, 0).getDate();
  return [...Array(awal).fill(null), ...Array.from({ length: jumlahHari }, (_, i) => i + 1)];
}

function geserBulan([y, m], arah) {
  const baru = m + arah;
  if (baru < 1) return [y - 1, 12];
  if (baru > 12) return [y + 1, 1];
  return [y, baru];
}

/** Pemilih tanggal berupa kalender. nilai dan maks berbentuk 'YYYY-MM-DD'. */
export function PilihTanggal({ id, nilai, onUbah, maks }) {
  const [buka, setBuka] = useState(false);
  const [tampil, setTampil] = useState(() => pecah(nilai).slice(0, 2));
  const akar = useRef(null);
  const idKal = useId();
  const arah = useKeAtas(akar, buka, 360);
  const tutup = useCallback(() => setBuka(false), []);
  useTutupLuar(akar, buka, tutup);

  const [y, m] = tampil;
  const [yn, mn, dn] = pecah(nilai);
  const sel = selBulan(y, m);
  const bulanDepanLewat = maks && buatIso(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, 1) > maks;

  function pilih(iso) {
    onUbah(iso);
    setBuka(false);
  }

  return (
    <div className="relative" ref={akar}>
      <button
        type="button"
        id={id}
        className={`${KOTAK} justify-between px-3 cursor-pointer`}
        aria-haspopup="dialog"
        aria-expanded={buka}
        aria-controls={idKal}
        onClick={() => {
          if (buka) setBuka(false);
          else {
            setTampil(pecah(nilai).slice(0, 2));
            setBuka(true);
          }
        }}
      >
        <span className="font-medium text-sm">
          {dn} {BULAN[mn - 1]} {yn}
        </span>
        <span className={T.inkMuted}>
          <FaCalendarAlt size={14} />
        </span>
      </button>
      {buka && (
        <div
          className={`${KAL} ${arah} left-0 w-[296px]`}
          id={idKal}
          role="dialog"
          aria-label="Pilih tanggal"
        >
          <KepalaKalender
            judul={`${BULAN[m - 1]} ${y}`}
            onMundur={() => setTampil(geserBulan(tampil, -1))}
            onMaju={() => setTampil(geserBulan(tampil, 1))}
            majuMati={bulanDepanLewat}
          />
          <GridHari />
          <div className="grid grid-cols-7 gap-0.5">
            {sel.map((d, i) => {
              if (d === null) return <span key={`k${i}`} />;
              const iso = buatIso(y, m, d);
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={maks && iso > maks}
                  className={kelasTgl({ dipilih: iso === nilai, tanda: iso === maks })}
                  aria-pressed={iso === nilai}
                  aria-label={`${d} ${BULAN[m - 1]} ${y}`}
                  onClick={() => pilih(iso)}
                >
                  {d}
                </button>
              );
            })}
          </div>
          {maks && (
            <div className={`mt-2 pt-2 border-t text-right ${T.border}`}>
              <button type="button" className={K.tautan} onClick={() => pilih(maks)}>
                Hari ini
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KepalaKalender({ judul, onMundur, onMaju, majuMati, children }) {
  return (
    <div className={`flex items-center justify-between mb-2 text-sm ${T.ink}`}>
      <button type="button" className={K.ikonBtn} aria-label="Bulan sebelumnya" onClick={onMundur}>
        <FaChevronLeft size={13} />
      </button>
      {children || (
        <strong aria-live="polite" className="text-[#0f2040] dark:text-[#EAF0F8]">
          {judul}
        </strong>
      )}
      <button
        type="button"
        className={K.ikonBtn}
        aria-label="Bulan berikutnya"
        disabled={majuMati}
        onClick={onMaju}
      >
        <FaChevronRight size={13} />
      </button>
    </div>
  );
}

function GridHari() {
  return (
    <div className="grid grid-cols-7 gap-0.5" aria-hidden="true">
      {NAMA_HARI.map((h) => (
        <span key={h} className={`text-center text-[11px] font-semibold py-1 ${T.inkMuted}`}>
          {h}
        </span>
      ))}
    </div>
  );
}

// ─── Rentang tanggal ─────────────────────────────────────────────────────────
const garis = (iso) => iso.split('-').reverse().join('/'); // 2026-09-10 -> 10/09/2026
const HINT_TANGGAL = 'tt/bb/tttt';

function tambahHari(iso, n) {
  const [y, m, d] = pecah(iso);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return buatIso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

function pilihanCepat(kini) {
  const [y, m] = pecah(kini);
  const akhirBulan = (yy, mm) => buatIso(yy, mm, new Date(yy, mm, 0).getDate());
  const lalu = m === 1 ? [y - 1, 12] : [y, m - 1];
  return [
    { label: 'Hari ini', dari: kini, sampai: kini },
    { label: '7 hari terakhir', dari: tambahHari(kini, -6), sampai: kini },
    { label: 'Bulan ini', dari: buatIso(y, m, 1), sampai: akhirBulan(y, m) },
    {
      label: 'Bulan lalu',
      dari: buatIso(lalu[0], lalu[1], 1),
      sampai: akhirBulan(lalu[0], lalu[1]),
    },
    { label: 'Tahun ini', dari: buatIso(y, 1, 1), sampai: buatIso(y, 12, 31) },
  ];
}

const SD = <strong className="font-bold">s/d</strong>;

/**
 * Pemilih rentang waktu. nilai: { dari, sampai } berbentuk 'YYYY-MM-DD' atau ''.
 * Popup berisi pilihan cepat, kolom Dari/Sampai, kalender, dan tombol Terapkan.
 * kanan: popup rata kanan kotak (di toolbar kanan).
 */
export function PilihRentang({ id, nilai, onUbah, kanan = false }) {
  const kini = hariIni();
  const [buka, setBuka] = useState(false);
  const [draf, setDraf] = useState({ dari: '', sampai: '' });
  const [langkah, setLangkah] = useState('dari'); // kolom yang sedang diisi
  const [tampil, setTampil] = useState(() => pecah(kini).slice(0, 2));
  const akar = useRef(null);
  const idKal = useId();
  const arah = useKeAtas(akar, buka, 480);
  const tutup = useCallback(() => setBuka(false), []);
  useTutupLuar(akar, buka, tutup);

  const [y, m] = tampil;
  const sel = selBulan(y, m);
  const tahunDaftar = Array.from({ length: 11 }, (_, i) => pecah(kini)[0] - 6 + i);

  function bukaKal() {
    setDraf(nilai);
    setLangkah(nilai.dari && !nilai.sampai ? 'sampai' : 'dari');
    setTampil(pecah(nilai.dari || kini).slice(0, 2));
    setBuka(true);
  }

  function pilihTanggal(iso) {
    if (langkah === 'dari') {
      setDraf({ dari: iso, sampai: '' });
      setLangkah('sampai');
    } else {
      const dari = draf.dari || iso;
      setDraf(iso < dari ? { dari: iso, sampai: dari } : { dari, sampai: iso });
      setLangkah('dari');
    }
  }

  function terapkan(r) {
    onUbah(r);
    setBuka(false);
  }

  const ada = Boolean(nilai.dari);
  const teks = !ada ? null : nilai.sampai && nilai.sampai !== nilai.dari ? (
    <>
      {garis(nilai.dari)} {SD} {garis(nilai.sampai)}
    </>
  ) : (
    garis(nilai.dari)
  );
  const akhirDraf = draf.sampai || draf.dari;
  const kolom = (aktif) =>
    `flex-1 flex items-center h-10 px-3 rounded-lg border text-left text-[13px] cursor-pointer ${T.surface} ${
      aktif ? `${BIRU.border} ring-2 ring-[rgba(42,120,214,.14)]` : T.borderStrong
    }`;

  return (
    <div className="relative" ref={akar}>
      <button
        type="button"
        id={id}
        className={`${KOTAK} justify-between px-3 ${ada ? 'cursor-default pr-9' : 'cursor-pointer'}`}
        aria-haspopup="dialog"
        aria-expanded={buka}
        aria-controls={idKal}
        aria-label="Rentang tanggal"
        aria-disabled={ada}
        onClick={() => {
          if (ada) return;
          if (buka) setBuka(false);
          else bukaKal();
        }}
      >
        <span className={`truncate text-sm ${ada ? 'font-medium' : T.inkMuted}`}>
          {teks || (
            <>
              {HINT_TANGGAL} {SD} {HINT_TANGGAL}
            </>
          )}
        </span>
        {!ada && (
          <span className={T.inkMuted}>
            <FaCalendarAlt size={14} />
          </span>
        )}
      </button>
      {ada && (
        <button
          type="button"
          className={TOMBOL_X}
          aria-label="Hapus rentang tanggal"
          title="Hapus rentang tanggal"
          onClick={() => terapkan({ dari: '', sampai: '' })}
        >
          <FaTimes size={12} />
        </button>
      )}
      {buka && (
        <div
          className={`${KAL} ${arah} ${kanan ? 'right-0' : 'left-0'} w-[336px]`}
          id={idKal}
          role="dialog"
          aria-label="Pilih rentang tanggal"
        >
          <div className="flex flex-wrap gap-1.5 mb-3" role="group" aria-label="Pilihan cepat">
            {pilihanCepat(kini).map((c) => (
              <button
                key={c.label}
                type="button"
                className={`h-7 px-2.5 rounded-full border text-xs font-semibold cursor-pointer ${ANIM.pilih} ${T.surface} ${T.borderStrong} ${T.ink} ${T.hoverSurface2}`}
                onClick={() => terapkan({ dari: c.dari, sampai: c.sampai })}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              aria-label="Dari tanggal"
              className={kolom(langkah === 'dari')}
              onClick={() => setLangkah('dari')}
            >
              <strong className={draf.dari ? T.ink : `${T.inkMuted} font-normal`}>
                {draf.dari ? garis(draf.dari) : HINT_TANGGAL}
              </strong>
            </button>
            <span className={`text-xs font-bold ${T.inkMuted}`} aria-hidden="true">
              s/d
            </span>
            <button
              type="button"
              aria-label="Sampai tanggal"
              className={kolom(langkah === 'sampai')}
              onClick={() => setLangkah('sampai')}
            >
              <strong className={draf.sampai ? T.ink : `${T.inkMuted} font-normal`}>
                {draf.sampai ? garis(draf.sampai) : HINT_TANGGAL}
              </strong>
            </button>
          </div>

          <KepalaKalender
            onMundur={() => setTampil(geserBulan(tampil, -1))}
            onMaju={() => setTampil(geserBulan(tampil, 1))}
          >
            <div className="flex gap-1.5">
              <select
                aria-label="Bulan"
                value={m}
                onChange={(e) => setTampil([y, Number(e.target.value)])}
                className={`h-8 px-1.5 rounded-md border text-[13px] font-semibold ${T.surface} ${T.borderStrong} ${T.ink} dark:[color-scheme:dark]`}
              >
                {BULAN.map((b, i) => (
                  <option key={b} value={i + 1}>
                    {b}
                  </option>
                ))}
              </select>
              <select
                aria-label="Tahun"
                value={y}
                onChange={(e) => setTampil([Number(e.target.value), m])}
                className={`h-8 px-1.5 rounded-md border text-[13px] font-semibold ${T.surface} ${T.borderStrong} ${T.ink} dark:[color-scheme:dark]`}
              >
                {tahunDaftar.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </KepalaKalender>
          <GridHari />
          <div className="grid grid-cols-7 gap-0.5">
            {sel.map((d, i) => {
              if (d === null) return <span key={`k${i}`} />;
              const iso = buatIso(y, m, d);
              const dalam = draf.dari && iso > draf.dari && iso < akhirDraf;
              const ujung = draf.dari && (iso === draf.dari || iso === akhirDraf);
              return (
                <button
                  key={iso}
                  type="button"
                  className={kelasTgl({ dipilih: Boolean(ujung), dalam: Boolean(dalam) })}
                  aria-label={`${d} ${BULAN[m - 1]} ${y}`}
                  aria-pressed={Boolean(ujung)}
                  onClick={() => pilihTanggal(iso)}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <div className={`mt-2 pt-2 border-t flex items-center justify-between gap-3 ${T.border}`}>
            <button
              type="button"
              className={K.tautan}
              onClick={() => terapkan({ dari: '', sampai: '' })}
            >
              Tampilkan semua tanggal
            </button>
            <button
              type="button"
              className={K.btnKecilUtama}
              disabled={!draf.dari}
              onClick={() => terapkan({ dari: draf.dari, sampai: draf.sampai || draf.dari })}
            >
              Terapkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
