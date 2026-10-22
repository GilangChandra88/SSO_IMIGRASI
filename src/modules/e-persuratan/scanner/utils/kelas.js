import { STATUS } from '@/utils/uiTokens';

// Seperti ADMIN.warnBanner/errorBanner tetapi tanpa margin, agar jaraknya bisa diatur di tempat
// pemakaian tanpa kelas margin yang bentrok.
const BANNER = 'flex gap-2.5 items-start rounded-[10px] px-3.5 py-3 text-[12.5px] leading-[1.5]';
export const BANNER_PERINGATAN = `${BANNER} ${STATUS.warnBg} ${STATUS.warnInk}`;
export const BANNER_GALAT = `${BANNER} ${STATUS.critBg} ${STATUS.critInk}`;
