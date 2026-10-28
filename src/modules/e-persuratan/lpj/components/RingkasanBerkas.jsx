import React from 'react';
import {
  groupTransaksiByItem,
  isPerjadin,
  makOf,
  pelaksanaOf,
  tanggalRingkas,
  transaksiOf,
} from '../utils/lpjLogic';
import { formatTanggal } from '../utils/formatTanggal';
import { FONT, LAYOUT, NAVY, T } from '@/utils/uiTokens';
import { ANIM, jedaKe } from '@/utils/animasi';

const KARTU = `rounded-[12px] border ${T.surface2} ${T.border}`;
const JUDUL = `${FONT.head} text-[13.5px] font-bold ${T.ink}`;
const SEL = 'px-3 sm:px-4 py-2.5';
const LABEL_KOP = 'text-[10.5px] font-bold uppercase tracking-[.06em] text-white/55 mb-1';

/**
 * Informasi berkas di dalam kartu judul (kop navy) Detail LPJ: Kode MAK, seksi & tanggal, dan
 * pelaksana dalam satu deret ringkas (lebar mengikuti isi, turun baris di layar sempit).
 */
export function InfoBerkasKop({ pack }) {
  const pelaksana = pelaksanaOf(pack);
  const tgl = tanggalRingkas(pack);
  const tanggal = (v) => (v ? formatTanggal(v) : '—');
  const info = isPerjadin(pack)
    ? [
        ['Seksi', pack.spd?.seksi || '—'],
        ['Berangkat', tanggal(tgl.berangkat)],
        ['Kembali', tanggal(tgl.kembali)],
        ['Tanggal LPJ', tanggal(tgl.tanggalLPJ)],
      ]
    : [['Tanggal', tanggal(tgl.tanggalLPJ)]];

  return (
    <dl className="mt-4 pt-4 border-t border-white/15 flex flex-wrap items-start gap-x-9 gap-y-3.5">
      <div className="min-w-0 max-w-full">
        <dt className={LABEL_KOP}>Kode MAK</dt>
        <dd
          className={`${FONT.mono} inline-block max-w-full text-[12.5px] font-semibold px-2 py-0.5 rounded-md border break-all bg-white/10 border-white/20 text-white`}
        >
          {makOf(pack)?.kode || '—'}
        </dd>
      </div>
      {info.map(([label, val]) => (
        <div key={label} className="min-w-0">
          <dt className={LABEL_KOP}>{label}</dt>
          <dd className="text-[13px] font-semibold whitespace-nowrap text-white">{val}</dd>
        </div>
      ))}
      <div className="min-w-0 max-w-full">
        <dt className={LABEL_KOP}>
          Pelaksana{pelaksana.length > 0 ? ` (${pelaksana.length})` : ''}
        </dt>
        <dd className="flex flex-wrap gap-1.5">
          {pelaksana.length === 0 && <span className="text-[13px] text-white/70">—</span>}
          {pelaksana.map((p, i) => (
            <span
              key={p.pegawaiId || i}
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-white/15 border-white/20 text-white ${ANIM.meletup} ${jedaKe(i + 1)}`}
            >
              {p.nama}
            </span>
          ))}
        </dd>
      </div>
    </dl>
  );
}

/**
 * Detail Transaksi di Detail LPJ (dulu isi baris yang dibuka di Daftar LPJ): transaksi per item
 * MAK + total biaya. Daftar yang panjang digulir di dalam kartu dengan judul kolom tetap terlihat.
 */
export default function RingkasanBerkas({ pack, total }) {
  const grouped = groupTransaksiByItem(transaksiOf(pack));

  return (
    <div className="mb-6">
      <section data-bertahap className={`${KARTU} p-4 sm:p-5`}>
        <div className="flex items-baseline justify-between gap-3 mb-3.5">
          <h2 className={JUDUL}>Detail Transaksi</h2>
          <span className={`text-[11.5px] ${T.inkMuted}`}>{grouped.length} item</span>
        </div>
        <div className={`rounded-lg border overflow-hidden ${T.surface} ${T.border}`}>
          {/* Daftar panjang digulir di sini; judul kolom menempel di atas */}
          <div className="max-h-[320px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className={`sticky top-0 z-[1] ${T.surface2}`}>
                <tr className={`border-b ${T.border}`}>
                  <th className={`${SEL} ${LAYOUT.label} w-[110px]`}>Kode</th>
                  <th className={`${SEL} ${LAYOUT.label}`}>Item</th>
                  <th className={`${SEL} ${LAYOUT.label} text-right`}>Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {grouped.length === 0 && (
                  <tr>
                    <td colSpan={3} className={`${SEL} text-[12.5px] ${T.inkMuted}`}>
                      Belum ada transaksi.
                    </td>
                  </tr>
                )}
                {grouped.map((t, i) => (
                  <tr
                    key={t.itemKode + t.label + i}
                    className={i < grouped.length - 1 ? `border-b ${T.border}` : ''}
                  >
                    <td className={`${SEL} ${FONT.mono} text-[11.5px] font-semibold ${T.ink2}`}>
                      {t.itemKode || '—'}
                    </td>
                    <td className={`${SEL} text-[12.5px] break-words ${T.ink}`}>{t.label}</td>
                    <td
                      className={`${SEL} text-[13px] font-bold text-right whitespace-nowrap ${T.ink}`}
                    >
                      Rp {t.total.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div
            className={`flex items-center justify-between ${SEL} border-t-2 border-[#163057] ${NAVY.bg}`}
          >
            <div className="text-xs font-bold uppercase tracking-[.04em] text-white/70">
              Total Biaya
            </div>
            <div className={`${FONT.head} text-sm font-extrabold text-white`}>
              Rp {total.toLocaleString('id-ID')}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
