import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaCircleNotch, FaPlay, FaStop, FaSyncAlt } from 'react-icons/fa';
import { showToast } from '@/utils/toastStore';
import { ADMIN, BTN, FORM, STATUS, T } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';
import { BANNER_PERINGATAN } from '../utils/kelas';
import { daftarPerangkat, kemampuanPerangkat, pindai } from '../services/agenScanner';
import { LABEL_DRIVER, LABEL_SUMBER, LABEL_WARNA, PENGATURAN_AWAL, UKURAN } from '../data/label';

// v2: driver disimpan per perangkat (v1 menyimpan satu driver untuk semua; diabaikan)
const KUNCI_SIMPAN = 'scanner.pilihan.v2';

function bacaSimpanan() {
  try {
    return JSON.parse(localStorage.getItem(KUNCI_SIMPAN)) || {};
  } catch {
    return {};
  }
}

/** Sesuaikan pengaturan dengan kemampuan perangkat (nilai yang tidak didukung diganti). */
function sesuaikan(atur, kem) {
  if (!kem) return atur;
  const baru = { ...atur };
  if (!kem.sumber.includes(baru.sumber)) {
    baru.sumber = kem.sumber.includes('pengumpan') ? 'pengumpan' : kem.sumber[0];
  }
  if (!kem.warna.includes(baru.warna)) baru.warna = kem.warna[0];
  if (!kem.dpi.includes(baru.dpi)) {
    baru.dpi = kem.dpi.reduce((a, b) => (Math.abs(b - 200) < Math.abs(a - 200) ? b : a));
  }
  return baru;
}

/**
 * Panel kiri "Pindai dari Scanner": pilih perangkat & pengaturan, lalu pindai lewat agen.
 * `onProgres({ jumlah, nama, hentikan } | null)` melaporkan pindaian yang berjalan ke halaman,
 * supaya animasi maskot scanner tampil di panel tengah (kanvas).
 */
export default function PanelPindai({ agenSiap, onHalaman, onProgres }) {
  const simpanan = useMemo(bacaSimpanan, []);
  const [perangkat, setPerangkat] = useState([]);
  const [memuat, setMemuat] = useState(false);
  const [kunci, setKunci] = useState(simpanan.kunci || '');
  const [driverPer, setDriverPer] = useState(simpanan.driverPer || {}); // { [kunci]: driver }
  const [kemampuan, setKemampuan] = useState(null);
  const [memuatKem, setMemuatKem] = useState(false);
  const [atur, setAtur] = useState({ ...PENGATURAN_AWAL, ...simpanan.pengaturan });
  const [diterima, setDiterima] = useState(null); // jumlah halaman selama memindai; null = diam
  const ctrl = useRef(null);
  const namaPindai = useRef('');
  const hentikan = useCallback(() => ctrl.current?.abort(), []);

  const aktif = perangkat.find((p) => p.kunci === kunci) || null;
  // Bawaan = cara pertama dari agen (WIA bila ada: tanpa jendela driver, halaman langsung masuk)
  const pilihan =
    aktif?.pilihan.find((x) => x.driver === driverPer[kunci]) || aktif?.pilihan[0] || null;
  const wiaTersedia = !!aktif?.pilihan.some((x) => x.driver === 'wia');
  const memindai = diterima !== null;

  const muatPerangkat = useCallback(async (segarkan) => {
    setMemuat(true);
    try {
      const daftar = await daftarPerangkat({ segarkan });
      setPerangkat(daftar);
      setKunci((k) => (daftar.some((p) => p.kunci === k) ? k : daftar[0]?.kunci || ''));
      if (segarkan) showToast(`${daftar.length} scanner ditemukan.`);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    if (agenSiap) muatPerangkat(false);
  }, [agenSiap, muatPerangkat]);

  // Baca kemampuan setiap kali perangkat/driver berganti
  const kunciPilihan = pilihan ? `${pilihan.driver}|${pilihan.id}` : '';
  useEffect(() => {
    if (!pilihan || !agenSiap) {
      setKemampuan(null);
      setMemuatKem(false);
      return undefined;
    }
    let batal = false;
    setMemuatKem(true);
    kemampuanPerangkat(pilihan)
      .then((kem) => {
        if (batal) return;
        setKemampuan(kem);
        setAtur((a) => sesuaikan(a, kem));
      })
      .catch((err) => !batal && showToast(err.message, 'error'))
      .finally(() => !batal && setMemuatKem(false));
    return () => {
      batal = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cukup bila perangkat/driver berganti
  }, [kunciPilihan, agenSiap]);

  useEffect(() => {
    try {
      localStorage.setItem(KUNCI_SIMPAN, JSON.stringify({ kunci, driverPer, pengaturan: atur }));
    } catch {
      /* penyimpanan browser tidak tersedia */
    }
  }, [kunci, driverPer, atur]);

  useEffect(() => () => ctrl.current?.abort(), []);

  useEffect(() => {
    onProgres?.(
      diterima === null ? null : { jumlah: diterima, nama: namaPindai.current, hentikan },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dilaporkan setiap jumlah berubah
  }, [diterima]);

  async function mulai() {
    if (!pilihan) return;
    const c = new AbortController();
    ctrl.current = c;
    const jam = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    let n = 0;
    namaPindai.current = aktif?.nama || 'scanner';
    setDiterima(0);
    try {
      await pindai(
        { perangkat: pilihan, ...atur },
        {
          signal: c.signal,
          onHalaman: (hl) => {
            n += 1;
            setDiterima(n);
            onHalaman({
              blob: hl.blob,
              nama: `Pindaian ${jam} · ${hl.ke}`,
              sumber: 'scan',
              lebar: hl.lebar,
              tinggi: hl.tinggi,
            });
          },
        },
      );
      showToast(`${n} halaman dipindai.`);
    } catch (err) {
      if (err?.name === 'AbortError') {
        showToast(n ? `Pemindaian dihentikan; ${n} halaman tersimpan.` : 'Pemindaian dibatalkan.');
      } else {
        showToast(err.message, 'error');
      }
    } finally {
      setDiterima(null);
      ctrl.current = null;
    }
  }

  const ubah = (kunciAtur) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setAtur((a) => ({ ...a, [kunciAtur]: kunciAtur === 'dpi' ? Number(v) : v }));
  };

  const pilihanSumber = kemampuan?.sumber || Object.keys(LABEL_SUMBER);
  const pilihanWarna = kemampuan?.warna || Object.keys(LABEL_WARNA);
  const pilihanDpi = kemampuan?.dpi || [100, 150, 200, 300, 600];
  const kontrol = `${FORM.select} ${FORM.borderOk}`;
  const kunciKontrol = memindai || memuatKem;

  if (!agenSiap) {
    return (
      <p className={`text-[12.5px] leading-[1.6] ${T.inkMuted}`}>
        Pemindaian butuh <b>Agen Scanner</b> yang berjalan di PC ini. Impor gambar tetap bisa
        dipakai tanpa agen.
      </p>
    );
  }

  return (
    <div className="@container/pindai space-y-3.5">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label
            className={`block text-[12.5px] font-semibold ${T.ink2}`}
            htmlFor="scanner-perangkat"
          >
            Scanner
          </label>
          <button
            type="button"
            className={BTN.xs}
            onClick={() => muatPerangkat(true)}
            disabled={memuat || memindai}
            title="Cari ulang scanner (USB, Wi-Fi, jaringan)"
          >
            <FaSyncAlt size={10} className={memuat ? 'animate-spin' : ''} />
            {memuat ? 'Mencari…' : 'Segarkan'}
          </button>
        </div>
        <select
          id="scanner-perangkat"
          className={kontrol}
          value={kunci}
          onChange={(e) => setKunci(e.target.value)}
          disabled={memindai || memuat || perangkat.length === 0}
        >
          {perangkat.length === 0 && (
            <option value="">{memuat ? 'Mencari scanner…' : 'Tidak ada scanner terdeteksi'}</option>
          )}
          {perangkat.map((p) => (
            <option key={p.kunci} value={p.kunci}>
              {p.nama}
            </option>
          ))}
        </select>
        {!memuat && perangkat.length === 0 && (
          <p className={FORM.hint}>
            Nyalakan scanner, pastikan driver-nya terpasang atau satu jaringan Wi-Fi, lalu tekan
            Segarkan.
          </p>
        )}
      </div>

      {aktif && aktif.pilihan.length > 1 && (
        <div className={ANIM.muncul}>
          <label className={FORM.label} htmlFor="scanner-driver">
            Driver
          </label>
          <select
            id="scanner-driver"
            className={kontrol}
            value={pilihan?.driver || ''}
            onChange={(e) => setDriverPer((d) => ({ ...d, [kunci]: e.target.value }))}
            disabled={memindai}
          >
            {aktif.pilihan.map((x) => (
              <option key={x.driver} value={x.driver}>
                {LABEL_DRIVER[x.driver] || x.driver}
              </option>
            ))}
          </select>
          {pilihan?.driver === 'twain' && wiaTersedia ? (
            <p className={`${BANNER_PERINGATAN} mt-2 ${ANIM.muncul}`}>
              Driver TWAIN (mis. Epson Scan 2) bisa membuka jendelanya sendiri dan menahan semua
              halaman sampai tombol Finish/Selesai diklik. Pakai WIA agar halaman langsung masuk
              tanpa jendela.
            </p>
          ) : (
            <p className={FORM.hint}>Ganti driver bila pemindaian gagal atau scanner menolak.</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 @min-[236px]/pindai:grid-cols-2">
        <div className="@min-[236px]/pindai:col-span-2">
          <label className={FORM.label} htmlFor="scanner-sumber">
            Sumber kertas
          </label>
          <select
            id="scanner-sumber"
            className={kontrol}
            value={atur.sumber}
            onChange={ubah('sumber')}
            disabled={kunciKontrol || !pilihan}
          >
            {pilihanSumber.map((s) => (
              <option key={s} value={s}>
                {LABEL_SUMBER[s] || s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={FORM.label} htmlFor="scanner-warna">
            Warna
          </label>
          <select
            id="scanner-warna"
            className={kontrol}
            value={atur.warna}
            onChange={ubah('warna')}
            disabled={kunciKontrol || !pilihan}
          >
            {pilihanWarna.map((w) => (
              <option key={w} value={w}>
                {LABEL_WARNA[w] || w}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={FORM.label} htmlFor="scanner-dpi">
            Resolusi
          </label>
          <select
            id="scanner-dpi"
            className={kontrol}
            value={atur.dpi}
            onChange={ubah('dpi')}
            disabled={kunciKontrol || !pilihan}
          >
            {pilihanDpi.map((d) => (
              <option key={d} value={d}>
                {d} dpi
              </option>
            ))}
          </select>
        </div>
        <div className="@min-[236px]/pindai:col-span-2">
          <label className={FORM.label} htmlFor="scanner-ukuran">
            Ukuran kertas
          </label>
          <select
            id="scanner-ukuran"
            className={kontrol}
            value={atur.ukuran}
            onChange={ubah('ukuran')}
            disabled={kunciKontrol || !pilihan}
          >
            {UKURAN.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className={`flex items-center gap-2 text-[12.5px] cursor-pointer ${T.ink2}`}>
        <input
          type="checkbox"
          checked={atur.lewatiKosong}
          onChange={ubah('lewatiKosong')}
          disabled={kunciKontrol}
          className="accent-[#0f2040] dark:accent-[#7DB6F3]"
        />
        Lewati halaman kosong (sisi belakang yang tidak tercetak)
      </label>

      {memuatKem && (
        <p className={`flex items-center gap-2 text-xs ${T.inkMuted}`}>
          <FaCircleNotch size={11} className="animate-spin" /> Membaca kemampuan scanner…
        </p>
      )}
      {kemampuan && !kemampuan.diketahui && !memuatKem && (
        <p className={`${BANNER_PERINGATAN} ${ANIM.muncul}`}>
          Scanner ini tidak merespons lewat driver {LABEL_DRIVER[pilihan?.driver] || 'ini'}: mungkin
          mati, kabel USB lepas, atau beda jaringan. Pemindaian kemungkinan gagal; nyalakan scanner
          lalu tekan Segarkan, atau pilih perangkat/driver lain.
        </p>
      )}

      {memindai ? (
        <div
          className={`flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 ${STATUS.infoBg} ${ANIM.muncul}`}
        >
          <FaCircleNotch size={12} className={`animate-spin shrink-0 ${STATUS.infoInk}`} />
          <span className={`flex-1 min-w-0 text-[12.5px] font-semibold ${STATUS.infoInk}`}>
            Memindai… {diterima} halaman
          </span>
          <button type="button" className={`${BTN.danger} shrink-0`} onClick={hentikan}>
            <FaStop size={9} /> Hentikan
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            className={`${ADMIN.btnSubmit} w-full`}
            onClick={mulai}
            data-asal-cadangan="scan"
            disabled={!pilihan || memuatKem}
          >
            <FaPlay size={11} /> Mulai Pindai
          </button>
          {atur.sumber === 'kaca' && pilihan && (
            <p className={FORM.hint}>
              Kaca memindai satu halaman per tekan. Ganti kertas lalu tekan Mulai Pindai lagi untuk
              halaman berikutnya.
            </p>
          )}
        </>
      )}
    </div>
  );
}
