import React, { useRef } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { NAVY, T } from '@/utils/uiTokens';
import { gulirKe } from '../../../gulirPintar';

const BTN_PG = `min-w-[34px] h-[34px] px-2.5 rounded-[9px] border inline-grid place-items-center text-[12.5px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed`;
const OFF = `${T.surface} ${T.border} ${T.ink2} ${T.hoverSurface2}`;
const ON = `${NAVY.bg} ${NAVY.border} text-white`;

/**
 * Navigasi halaman tabel (1 … 4 5 6 … 12). Ganti halaman → gulir ke awal tabel (elemen tepat
 * sebelum Pager) bila tepi atasnya sudah tergulir keluar layar.
 */
export default function Pager({ total, page, pageSize, onPage, noun }) {
  const ref = useRef(null);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const ke = (n) => {
    onPage(n);
    gulirKe(ref.current?.previousElementSibling);
  };
  const info = `flex flex-wrap items-center justify-between gap-3 mt-3.5 text-[12.5px] ${T.inkMuted}`;
  if (total <= pageSize) {
    return (
      <div className={info}>
        <span>
          {total} {noun}
        </span>
      </div>
    );
  }
  const from = (page - 1) * pageSize;
  const nums = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  return (
    <div ref={ref} className={info}>
      <span>
        Menampilkan {from + 1}–{Math.min(from + pageSize, total)} dari {total} {noun}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className={`${BTN_PG} ${OFF}`}
          disabled={page <= 1}
          onClick={() => ke(page - 1)}
          aria-label="Halaman sebelumnya"
        >
          <FaChevronLeft size={11} />
        </button>
        {nums.map((n, i) =>
          n === '…' ? (
            <span key={'e' + i} className="px-1">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              aria-current={n === page ? 'page' : undefined}
              className={`${BTN_PG} ${n === page ? ON : OFF}`}
              onClick={() => ke(n)}
            >
              {n}
            </button>
          ),
        )}
        <button
          type="button"
          className={`${BTN_PG} ${OFF}`}
          disabled={page >= pages}
          onClick={() => ke(page + 1)}
          aria-label="Halaman berikutnya"
        >
          <FaChevronRight size={11} />
        </button>
      </div>
    </div>
  );
}
