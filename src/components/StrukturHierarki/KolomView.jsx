import React from 'react';
import { FaChevronRight, FaPen, FaTrashAlt } from 'react-icons/fa';
import { ADMIN, FONT, STATUS, T } from '@/utils/uiTokens';
import KonfirmasiHapus from './KonfirmasiHapus';

const kolomKelas = (lebar = 'w-[230px]') =>
  `${lebar} shrink-0 border-r last:border-r-0 overflow-y-auto max-h-[520px] ${T.border}`;

/**
 * Tampilan Kolom (.mak-columns): satu kolom per tingkat; node tingkat terakhir membuka panel
 * detail. `detailKolom(node)` mengembalikan baris [label, nilai] tambahan (mis. Pagu/Realisasi).
 */
export default function KolomView(props) {
  const { indeks, tipeAkhir, pilihan, setPilihan, detailKolom, pendingHapus, aksi, sibuk } = props;
  const kolom = [];
  let parentId = null;

  for (let depth = 0; depth < 20; depth++) {
    const list = indeks.anakDari(parentId);
    if (list.length === 0) {
      kolom.push(
        <div className={kolomKelas()} key={`kosong${depth}`}>
          <div className={`px-3.5 py-5 text-xs ${T.inkMuted}`}>Tidak ada data.</div>
        </div>,
      );
      break;
    }
    kolom.push(
      <div className={kolomKelas()} key={`kolom${depth}`}>
        {list.map((n) => {
          const dipilih = pilihan[depth] === n.id;
          return (
            <button
              type="button"
              key={n.id}
              className={`flex items-center gap-2 w-full text-left px-3 py-[9px] text-[12.5px] border-b cursor-pointer ${T.border} ${
                dipilih
                  ? `${STATUS.infoBg} ${STATUS.infoInk} font-bold`
                  : `${T.ink2} ${T.hoverSurface2}`
              }`}
              onClick={() => setPilihan([...pilihan.slice(0, depth), n.id])}
            >
              <span className={`${FONT.mono} text-[10.5px] opacity-70 shrink-0`}>
                {n.kode || '-'}
              </span>
              <span className="flex-1 min-w-0 truncate">{n.name}</span>
              {n.type !== tipeAkhir && <FaChevronRight size={10} className="shrink-0 opacity-50" />}
            </button>
          );
        })}
      </div>,
    );

    const sel = pilihan[depth] ? indeks.byId.get(pilihan[depth]) : null;
    if (!sel) break;
    if (sel.type !== tipeAkhir) {
      parentId = sel.id;
      continue;
    }

    const menungguHapus = pendingHapus === sel.id;
    kolom.push(
      <div className={kolomKelas('w-[260px]')} key={`detail${depth}`}>
        <div className="p-4 text-[13px]">
          <div className={`${FONT.mono} text-[11px] mb-1 ${T.inkMuted}`}>{sel.kode || '-'}</div>
          <div className={`font-bold mb-3 ${T.ink}`}>{sel.name}</div>
          {(detailKolom ? detailKolom(sel) : []).map(([label, nilai]) => (
            <div className={ADMIN.viewRow} key={label}>
              <span className={T.inkMuted}>{label}</span>
              <span className="font-semibold text-right">{nilai}</span>
            </div>
          ))}
          <div className="flex gap-1.5 mt-3.5">
            {menungguHapus ? (
              <KonfirmasiHapus
                teks="Hapus data ini?"
                onYa={() => aksi.hapus(sel.id)}
                onBatal={aksi.batalHapus}
                busy={sibuk}
              />
            ) : (
              <>
                <button
                  type="button"
                  className={ADMIN.rowBtn}
                  title="Edit"
                  aria-label="Edit"
                  onClick={() => aksi.ubah(sel.id)}
                >
                  <FaPen size={11} />
                </button>
                <button
                  type="button"
                  className={ADMIN.rowBtn}
                  title="Hapus"
                  aria-label="Hapus"
                  onClick={() => aksi.mintaHapus(sel.id)}
                >
                  <FaTrashAlt size={11} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>,
    );
    break;
  }

  return (
    <div className={`flex border rounded-[14px] overflow-x-auto max-h-[520px] ${T.border}`}>
      {kolom}
    </div>
  );
}
