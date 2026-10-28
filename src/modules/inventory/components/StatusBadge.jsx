import { BADGE } from '../ui/kelas';
import { LABEL_STATUS } from '../utils/stokLogic';

/** Lencana status stok: Aman, Menipis, Habis. */
export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-block px-2.5 py-[3px] rounded-full text-xs font-semibold whitespace-nowrap ${BADGE[status]}`}
    >
      {LABEL_STATUS[status]}
    </span>
  );
}
