import React from 'react';
import { FaChevronRight } from 'react-icons/fa';
import { ROW } from '@/components/StrukturHierarki/hierarkiKelas';
import { formatRupiah, indentKelas } from '@/components/StrukturHierarki/hierarkiUtils';
import { ADMIN, FONT, STATUS, T } from '@/utils/uiTokens';

const NUM = `${FONT.mono} text-xs text-right min-w-[92px]`;
const PCT = `text-[11px] font-bold min-w-[38px] text-right shrink-0 ${T.inkMuted}`;

function RekapBaris({ node, depth, ctx }) {
  const { indeks, agregat, tertutup, onToggle } = ctx;
  const anak = indeks.anakDari(node.id);
  const punyaAnak = anak.length > 0;
  const tutup = tertutup.has(node.id);
  const agg = agregat(node.id);
  const sisa = agg.pagu - agg.realisasi;
  const pct = agg.pagu > 0 ? Math.round((agg.realisasi / agg.pagu) * 100) : 0;

  return (
    <>
      <div className={`${ROW.row} ${indentKelas(depth)}`}>
        <button
          type="button"
          aria-label={tutup ? 'Buka cabang' : 'Tutup cabang'}
          className={`${ROW.toggle} ${punyaAnak ? 'cursor-pointer' : 'invisible'} ${punyaAnak && !tutup ? 'rotate-90' : ''}`}
          onClick={() => punyaAnak && onToggle(node.id)}
        >
          <FaChevronRight size={10} />
        </button>
        <span className={ROW.kode}>{node.kode || '-'}</span>
        <span className={node.type === 'Item' ? ROW.nameItem : ROW.name}>{node.name}</span>
        <span className={ROW.type}>{node.type}</span>
        <span className="flex gap-4 shrink-0">
          <span className={`${NUM} ${T.ink}`}>{formatRupiah(agg.pagu)}</span>
          <span className={`${NUM} ${STATUS.warnInk}`}>{formatRupiah(agg.realisasi)}</span>
          <span className={`${NUM} ${STATUS.goodInk}`}>{formatRupiah(sisa)}</span>
        </span>
        <span className={PCT}>{pct}%</span>
        <span className="w-14 shrink-0" />
      </div>
      {punyaAnak &&
        !tutup &&
        anak.map((c) => <RekapBaris key={c.id} node={c} depth={depth + 1} ctx={ctx} />)}
    </>
  );
}

/**
 * Tampilan Rekap MAK Setup (MakRekapRow purwarupa): Pagu, Realisasi pada bulan terpilih,
 * Sisa, dan persentase per node.
 */
export default function MakRekap({ indeks, agregat, tertutup, onToggle }) {
  const akar = indeks.anakDari(null);
  const ctx = { indeks, agregat, tertutup, onToggle };
  return (
    <div className={ROW.wrap}>
      <div className="min-w-[760px]">
        <div
          className={`flex items-center gap-2 px-2 py-[9px] text-[10.5px] font-bold uppercase tracking-[.04em] border-b ${T.inkMuted} ${T.border} ${T.surface2}`}
        >
          <span className="w-5 shrink-0" />
          <span className="min-w-16 shrink-0">Kode</span>
          <span className="flex-1 min-w-[120px]">Uraian</span>
          <span className="w-[52px] shrink-0" />
          <span className="flex gap-4 shrink-0">
            <span className="min-w-[92px] text-right">Pagu</span>
            <span className="min-w-[92px] text-right">Realisasi</span>
            <span className="min-w-[92px] text-right">Sisa</span>
          </span>
          <span className="min-w-[38px] shrink-0 text-right">%</span>
          <span className="w-14 shrink-0" />
        </div>
        <div className="max-h-[560px] overflow-y-auto">
          {akar.length === 0 ? (
            <p className={ADMIN.empty}>Belum ada data tahun anggaran.</p>
          ) : (
            akar.map((n) => <RekapBaris key={n.id} node={n} depth={0} ctx={ctx} />)
          )}
        </div>
      </div>
    </div>
  );
}
