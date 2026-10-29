import { FONT, T } from '@/utils/uiTokens';

/** Kartu Dashboard Keuangan (.d2-card purwarupa). */
export const KARTU = `flex flex-col min-w-0 px-6 py-[22px] rounded-[24px] border ${T.surface} ${T.border} ${T.shadowSm} ${T.ink} max-sm:px-4 max-sm:py-[18px] max-sm:rounded-[22px]`;

/** Judul kartu Dashboard Keuangan (.d2-card-h h2). */
export const JUDUL = `${FONT.head} text-[17px] font-extrabold tracking-[-.01em]`;

// Latar kartu sambutan: pola titik halus (lapisan radial 20×20 px, .d2-hero purwarupa) di atas
// gradien navy. Kelas ditulis utuh karena Tailwind tidak membaca kelas yang dirangkai.
/** Kartu sambutan Berkas Verifikasi (.d2-hero). */
export const LATAR_SAMBUTAN_VERIF =
  'bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,.07)_1px,transparent_1.5px),linear-gradient(125deg,#0E2340_0%,#1F4C80_115%)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,.07)_1px,transparent_1.5px),linear-gradient(125deg,#081524_0%,#173A60_115%)] [background-size:20px_20px,auto]';
/** Kartu sambutan Berkas Saya (.hero-card) — gradien tetap, ditambah pola titik yang sama. */
export const LATAR_SAMBUTAN_SAYA =
  'bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,.07)_1px,transparent_1.5px),linear-gradient(to_bottom_right_in_oklab,#0E2340,#1F4C80)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,.07)_1px,transparent_1.5px),linear-gradient(to_bottom_right_in_oklab,#081524,#173A60)] [background-size:20px_20px,auto]';
