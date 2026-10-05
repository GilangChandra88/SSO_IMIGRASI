/**
 * Kelas Tailwind baris pohon purwarupa admin (.mak-row, .mak-row-*), dipakai Pohon dan
 * Rekap MAK.
 */
import { FONT, T } from '@/utils/uiTokens';

export const ROW = {
  // .mak-tree-wrap / .mak-rekap-wrap (digulir ke samping di layar sempit)
  wrap: `border ${T.border} rounded-[14px] overflow-x-auto`,
  inner: 'min-w-[640px]',
  row: `group flex items-center gap-2 py-[9px] pr-2 border-b ${T.border} last:border-b-0 text-[13px] ${T.hoverSurface2} transition-colors duration-300`,
  toggle: `w-5 h-5 rounded-md grid place-items-center shrink-0 transition-transform ${T.inkMuted}`,
  kode: `${FONT.mono} text-[11.5px] ${T.inkMuted} whitespace-nowrap shrink-0 min-w-16`,
  name: `flex-1 min-w-[120px] font-semibold ${T.ink}`,
  nameItem: `flex-1 min-w-[120px] font-medium ${T.ink2}`,
  type: `text-[9.5px] font-bold uppercase tracking-[.03em] px-[7px] py-0.5 rounded-md shrink-0 ${T.inkMuted} ${T.surface2}`,
  // Tombol aksi muncul saat baris disorot (selalu tampil di layar sentuh)
  actions:
    'flex gap-[3px] shrink-0 transition-opacity [@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus-within:opacity-100',
  actionsShow: 'flex gap-[3px] shrink-0',
};
