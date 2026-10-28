import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';
import { ANIM } from '@/utils/animasi';
import { formatNip } from '@/utils/dataPegawai';
import { K } from '../ui/kelas';

const MAKS_SARAN = 50;
const kecil = (s) => (s || '').toLocaleLowerCase('id-ID');

/**
 * Saring & urutkan pegawai menurut kata yang diketik: semua kata harus ada di nama (urutan bebas),
 * atau angka yang diketik (≥3 digit) ada di NIP. Nama yang diawali kata pertama tampil lebih dulu,
 * lalu yang salah satu katanya diawali kata itu.
 */
function saring(pegawai, kueri) {
  const kata = kecil(kueri).split(/\s+/).filter(Boolean);
  if (!kata.length) return { kata, hasil: pegawai };
  const angka = kueri.replace(/\D/g, '');
  const hasil = [];
  pegawai.forEach((p) => {
    const nama = kecil(p.nama);
    const cocokNama = kata.every((k) => nama.includes(k));
    const cocokNip = angka.length >= 3 && String(p.nip || '').includes(angka);
    if (!cocokNama && !cocokNip) return;
    const skor = !cocokNama
      ? 2
      : nama.startsWith(kata[0])
        ? 0
        : nama.split(/[\s.,]+/).some((w) => w.startsWith(kata[0]))
          ? 1
          : 2;
    hasil.push({ p, skor });
  });
  return { kata, hasil: hasil.sort((a, b) => a.skor - b.skor).map((x) => x.p) };
}

/** Potong teks menjadi bagian biasa/tersorot sesuai kata yang dicari. */
function potong(teks, kata) {
  const t = kecil(teks);
  const tanda = new Array(teks.length).fill(false);
  kata.forEach((k) => {
    const i = t.indexOf(k);
    if (i >= 0) tanda.fill(true, i, i + k.length);
  });
  const hasil = [];
  tanda.forEach((sorot, i) => {
    const akhir = hasil[hasil.length - 1];
    if (akhir && akhir.sorot === sorot) akhir.teks += teks[i];
    else hasil.push({ teks: teks[i], sorot });
  });
  return hasil;
}

/**
 * Kotak isian pegawai dengan saran nama: ketik sebagian nama (atau NIP), lalu pilih dari daftar
 * dengan klik atau panah ↑/↓ + Enter. Daftar saran tampil di bawah kotak (ikut alur halaman) supaya
 * tidak terpotong di dalam popup. Mengetik ulang setelah memilih mengosongkan pilihan.
 * @param {{ id: string, pegawai: object[], nilai: string, onPilih: (id: string) => void,
 *   galat?: boolean }} props
 */
export default function CariPegawai({ id, pegawai, nilai, onPilih, galat }) {
  const terpilih = pegawai.find((p) => p.id === nilai) || null;
  const [kueri, setKueri] = useState(terpilih?.nama || '');
  const [buka, setBuka] = useState(false);
  const [aktif, setAktif] = useState(0);
  const inputRef = useRef(null);
  const daftarRef = useRef(null);
  const idDaftar = useId();

  // Saat nama terpilih masih utuh di kotak, daftar menampilkan semua pegawai
  const { kata, hasil } = useMemo(
    () => saring(pegawai, terpilih && kueri === terpilih.nama ? '' : kueri),
    [pegawai, terpilih, kueri],
  );
  const tampil = hasil.slice(0, MAKS_SARAN);

  useEffect(() => {
    if (!buka) return;
    daftarRef.current
      ?.querySelector(`[data-idx="${aktif}"]`)
      ?.scrollIntoView?.({ block: 'nearest' });
  }, [aktif, buka]);

  function bukaDaftar() {
    const i = tampil.findIndex((p) => p.id === nilai);
    setAktif(Math.max(0, i));
    setBuka(true);
  }

  function pilih(p) {
    onPilih(p.id);
    setKueri(p.nama);
    setBuka(false);
  }

  function ketik(v) {
    setKueri(v);
    setAktif(0);
    setBuka(true);
    if (nilai) onPilih('');
  }

  function kosongkan() {
    ketik('');
    inputRef.current?.focus();
  }

  function tombol(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!buka) bukaDaftar();
      else setAktif((i) => Math.min(tampil.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAktif((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && buka) {
      e.preventDefault(); // jangan mengirim form
      if (tampil[aktif]) pilih(tampil[aktif]);
    } else if (e.key === 'Escape' && buka) {
      e.preventDefault();
      setBuka(false);
    }
  }

  const belumDipilih = !buka && kueri.trim() && !nilai;

  return (
    <div>
      <div className="relative">
        <FaSearch size={12} className={K.ikonMasukan} aria-hidden="true" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={buka}
          aria-controls={idDaftar}
          aria-autocomplete="list"
          aria-activedescendant={buka && tampil[aktif] ? `${idDaftar}-${aktif}` : undefined}
          aria-invalid={galat || belumDipilih ? true : undefined}
          autoComplete="off"
          placeholder="Ketik nama atau NIP…"
          value={kueri}
          onChange={(e) => ketik(e.target.value)}
          onFocus={(e) => {
            if (terpilih) e.target.select();
            bukaDaftar();
          }}
          onClick={() => !buka && bukaDaftar()}
          onBlur={() => setBuka(false)}
          onKeyDown={tombol}
          className={`${galat || belumDipilih ? K.masukanGalat : K.masukan} pl-9 pr-9`}
        />
        {kueri && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={kosongkan}
            aria-label="Kosongkan pegawai"
            title="Kosongkan"
            className={K.hapusMasukan}
          >
            <FaTimes size={11} />
          </button>
        )}
      </div>

      {buka && (
        <ul
          ref={daftarRef}
          id={idDaftar}
          role="listbox"
          aria-label="Saran pegawai"
          className={`${K.saranDaftar} ${ANIM.popover}`}
        >
          {tampil.length === 0 && (
            <li className={`px-3 py-3 text-[12.5px] text-center ${K.redup}`}>
              Tidak ada pegawai aktif bernama &ldquo;{kueri.trim()}&rdquo;.
            </li>
          )}
          {tampil.map((p, i) => {
            const dipilih = p.id === nilai;
            return (
              <li
                key={p.id}
                id={`${idDaftar}-${i}`}
                data-idx={i}
                role="option"
                aria-selected={dipilih}
                onMouseEnter={() => setAktif(i)}
                onMouseDown={(e) => {
                  e.preventDefault(); // kotak tetap fokus
                  pilih(p);
                }}
                className={`${K.saranOpsi} ${i === aktif ? K.permukaan2 : ''}`}
              >
                <span className={`text-[13px] ${dipilih ? 'font-bold' : 'font-medium'} ${K.teks}`}>
                  {potong(p.nama, kata).map((b, j) =>
                    b.sorot ? (
                      <mark key={j} className={K.sorotCocok}>
                        {b.teks}
                      </mark>
                    ) : (
                      <span key={j}>{b.teks}</span>
                    ),
                  )}
                </span>
                <span className={`text-[11.5px] mt-0.5 ${K.redup}`}>
                  {p.nip ? formatNip(p.nip) : 'Tanpa NIP'}
                  {p.jabatanNama ? ` · ${p.jabatanNama}` : ''}
                </span>
              </li>
            );
          })}
          {hasil.length > MAKS_SARAN && (
            <li className={`px-3 py-2 text-[11.5px] text-center ${K.redup}`}>
              {hasil.length - MAKS_SARAN} pegawai lain; ketik lebih banyak huruf untuk mempersempit.
            </li>
          )}
        </ul>
      )}
      {belumDipilih && <p className={K.pesanGalat}>Pilih salah satu nama dari daftar saran.</p>}
    </div>
  );
}
