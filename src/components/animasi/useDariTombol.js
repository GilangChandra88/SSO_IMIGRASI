import { useLayoutEffect, useRef } from 'react';
import { ambilTombolAsal, animasiBukaDariTombol, animasiTutupKeTombol } from '@/utils/animasi';

/**
 * Popup "Lihat" yang tumbuh dari tombol yang membukanya, isinya muncul bertahap dari atas ke
 * bawah, lalu saat ditutup mengecil kembali ke tombol itu. Pasang `dialogRef` pada kartu popup
 * dan `latarRef` pada latar gelapnya (keduanya `position: fixed` lewat portal).
 * Kartu popup jangan memakai ANIM.popup bersamaan (transform-nya akan bertumpuk).
 */
export function useDariTombol(aktif = true) {
  const dialogRef = useRef(null);
  const latarRef = useRef(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!aktif || !dialog) return undefined;
    const asal = ambilTombolAsal();
    animasiBukaDariTombol(dialog, asal);
    const latar = latarRef.current;
    return () => {
      // Ukur selagi masih terpasang (offset* tidak terpengaruh transform animasi buka)
      const kotak = {
        left: dialog.offsetLeft,
        top: dialog.offsetTop,
        width: dialog.offsetWidth,
        height: dialog.offsetHeight,
      };
      const scrollTop = dialog.scrollTop;
      // Salinan langsung dipasang (tanpa kedipan); dibatalkan bila popup ternyata tetap terpasang
      // (StrictMode memasang ulang efek di mode pengembangan)
      const batal = animasiTutupKeTombol({ dialog, kotak, scrollTop, asal, latar });
      requestAnimationFrame(() => {
        if (dialog.isConnected) batal();
      });
    };
  }, [aktif]);

  return { dialogRef, latarRef };
}
