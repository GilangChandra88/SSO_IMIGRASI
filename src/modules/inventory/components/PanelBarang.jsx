import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaArrowDown, FaArrowUp, FaBan, FaPen, FaTimes } from 'react-icons/fa';
import { STATUS, T } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';
import { K, PANAH } from '../ui/kelas';
import { useEscape } from '../hooks/useEscape';
import { useTransaksiBarang } from '../hooks/useTransaksi';
import {
  bandingRiwayat,
  formatSisa,
  formatTanggal,
  idTransaksi,
  statusStok,
} from '../utils/stokLogic';
import { PilihRentang } from './Pilihan';
import StatusBadge from './StatusBadge';

const aktif = (x) => x.status !== 'batal';

/**
 * Rincian barang di Stok Barang: identitas + riwayat masuk/keluar yang bisa disaring tanggal
 * (transaksi barang ini dimuat saat panel dibuka; transaksi batal tidak ditampilkan).
 * Layar lebar: panel di kanan daftar. `lembar` (≤ 1100 px): lembar geser dari kanan; di HP
 * (≤ 820 px) lembar dari bawah setinggi 78% layar.
 */
export default function PanelBarang({ b, sisa, izin, onUbah, onHapus, onTutup, lembar = false }) {
  const [rentang, setRentang] = useState({ dari: '', sampai: '' });
  useEscape(onTutup, lembar);
  const { masuk, keluar } = useTransaksiBarang(b.id);

  const riwayat = useMemo(() => {
    const m = masuk
      .filter((x) => x.barangId === b.id && aktif(x))
      .map((x) => ({
        kunci: `m${x.id}`,
        jenis: 'masuk',
        tanggal: x.tanggal,
        jumlah: x.jumlah,
        pihak: x.pemasok,
        nomor: x.nomor,
        dibuat: x.dibuat,
      }));
    const k = keluar.filter(aktif).flatMap((x) =>
      x.items
        .filter((i) => i.barangId === b.id)
        .map((i) => ({
          kunci: `k${x.id}`,
          jenis: 'keluar',
          tanggal: x.tanggal,
          jumlah: i.jumlah,
          pihak: x.seksi,
          nomor: x.nomor,
          dibuat: x.dibuat,
        })),
    );
    return [...m, ...k]
      .filter(
        (r) =>
          !rentang.dari ||
          (r.tanggal >= rentang.dari && r.tanggal <= (rentang.sampai || rentang.dari)),
      )
      .sort(bandingRiwayat);
  }, [b.id, masuk, keluar, rentang]);

  const totalMasuk = riwayat.filter((r) => r.jenis === 'masuk').reduce((a, r) => a + r.jumlah, 0);
  const totalKeluar = riwayat.filter((r) => r.jenis === 'keluar').reduce((a, r) => a + r.jumlah, 0);

  const panel = (
    <aside
      aria-label={`Rincian ${b.nama}`}
      className={
        lembar
          ? `fixed z-[900] ${T.surface} ${T.ink} overflow-y-auto overscroll-contain inset-y-0 right-0 w-[min(480px,100%)] shadow-[-10px_0_32px_rgba(10,22,40,.25)] max-[820px]:inset-x-0 max-[820px]:top-auto max-[820px]:w-full max-[820px]:h-[78dvh] max-[820px]:rounded-t-[20px] max-[820px]:shadow-[0_-10px_40px_rgba(10,22,40,.3)] motion-safe:transition-[opacity,translate] motion-safe:duration-300 motion-safe:ease-out motion-safe:starting:opacity-0 min-[821px]:motion-safe:starting:translate-x-1/3 max-[820px]:motion-safe:starting:translate-y-1/3`
          : `${K.kartu} h-full overflow-y-auto`
      }
    >
      <div className={`${lembar ? `sticky top-0 z-[5] ${T.surface}` : ''}`}>
        {lembar && (
          <div className="hidden max-[820px]:flex justify-center pt-2.5 pb-0.5" aria-hidden="true">
            <span className="w-10 h-1 rounded-full bg-[#CBD3DE] dark:bg-[#304864]" />
          </div>
        )}
        <div className={K.kepala}>
          <h2 className={K.judulKartu}>Rincian Barang</h2>
          <div className="flex items-center gap-1">
            {izin.tulis && (
              <>
                <button
                  className={K.ikonBtn}
                  type="button"
                  aria-label={`Ubah ${b.nama}`}
                  title="Ubah barang"
                  onClick={onUbah}
                >
                  <FaPen size={14} />
                </button>
                <button
                  className={`${K.ikonBtn} ${K.ikonHapus}`}
                  type="button"
                  aria-label={`Nonaktifkan ${b.nama}`}
                  disabled={!izin.hapus}
                  title="Nonaktifkan barang"
                  onClick={onHapus}
                >
                  <FaBan size={14} />
                </button>
              </>
            )}
            <button className={K.ikonBtn} type="button" aria-label="Tutup panel" onClick={onTutup}>
              <FaTimes size={15} />
            </button>
          </div>
        </div>
      </div>
      <div
        key={b.id}
        className={`px-4 sm:px-6 pt-4 pb-8 sm:pb-6 flex flex-col gap-5 ${ANIM.muncul}`}
      >
        <div>
          <div className="text-[17px] font-bold leading-[1.3] text-[#0f2040] dark:text-[#EAF0F8]">
            {b.nama}
          </div>
          <div className={`flex items-center gap-2.5 mt-1.5 text-sm ${T.inkMuted}`}>
            <span>Sisa {formatSisa(b, sisa)}</span>
            <StatusBadge status={statusStok(sisa, b.stokMin)} />
          </div>
        </div>
        <dl className="m-0 flex flex-col gap-3">
          {[
            ['Kode SAKTI Barang', b.kode || '-', true],
            ['Kode SAKTI Kategori', b.kategoriKode || '-', true],
            ['Uraian Kategori', b.kategoriId ? b.kategori : 'Belum ada kategori SAKTI'],
            [
              'Stok Awal / Minimum',
              `${formatSisa(b, b.stokAwal || 0)} / ${formatSisa(b, b.stokMin || 0)}`,
            ],
          ].map(([label, isi, mono]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <dt className={`text-xs font-semibold ${T.inkMuted}`}>{label}</dt>
              <dd className={`m-0 text-sm ${mono ? K.mono : ''}`}>{isi}</dd>
            </div>
          ))}
        </dl>

        <div className={`flex flex-col gap-3 border-t pt-4 ${T.border}`}>
          <h3 className="m-0 text-sm font-bold text-[#0f2040] dark:text-[#EAF0F8]">
            Riwayat Masuk dan Keluar
          </h3>
          <div>
            <label className={K.lbl} htmlFor="pb-rentang">
              Pilih tanggal
            </label>
            <PilihRentang id="pb-rentang" nilai={rentang} onUbah={setRentang} />
          </div>
          <div className="flex gap-4 text-[13px] font-semibold">
            <span className={`inline-flex items-center gap-1 ${STATUS.goodInk}`}>
              <FaArrowDown size={11} /> Masuk {formatSisa(b, totalMasuk)}
            </span>
            <span className={`inline-flex items-center gap-1 ${STATUS.critInk}`}>
              <FaArrowUp size={11} /> Keluar {formatSisa(b, totalKeluar)}
            </span>
          </div>
          {riwayat.length === 0 ? (
            <p className={`m-0 text-[13.5px] ${T.inkMuted}`}>Tidak ada riwayat pada tanggal ini.</p>
          ) : (
            <ul className={`m-0 p-0 list-none flex flex-col divide-y ${T.divide}`}>
              {riwayat.map((r) => (
                <li key={r.kunci} className="flex gap-3 items-start py-2.5">
                  <span
                    className={PANAH[r.jenis]}
                    title={r.jenis === 'keluar' ? 'Barang keluar' : 'Barang masuk'}
                  >
                    {r.jenis === 'keluar' ? <FaArrowUp size={11} /> : <FaArrowDown size={11} />}
                  </span>
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <div className="flex justify-between gap-2 text-[13.5px]">
                      <strong>
                        {r.jenis === 'keluar' ? '-' : '+'}
                        {formatSisa(b, r.jumlah)}
                      </strong>
                      <span className={T.inkMuted}>{formatTanggal(r.tanggal)}</span>
                    </div>
                    <div className={`flex justify-between gap-2 text-[12.5px] ${T.inkMuted}`}>
                      <span className="truncate">{r.pihak}</span>
                      <span className={K.mono}>{idTransaksi(r.jenis, r.nomor)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );

  if (!lembar) return panel;
  return createPortal(
    <>
      <div
        className={`fixed inset-0 z-[890] bg-[rgba(10,22,40,.45)] ${ANIM.latar}`}
        onClick={onTutup}
        aria-hidden="true"
      />
      {panel}
    </>,
    document.body,
  );
}
