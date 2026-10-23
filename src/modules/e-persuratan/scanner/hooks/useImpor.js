import { useCallback, useEffect, useRef, useState } from 'react';
import { showToast } from '@/utils/toastStore';
import { pecahPdfWeb } from '../services/pdfWeb';
import { siapkanGambar } from '../utils/gambar';

// Resolusi pecahan PDF tetap (keputusan pengguna): cukup tajam untuk dokumen & OCR
const DPI_PDF = 200;

const adalahPdf = (f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);

/**
 * Impor berkas (tombol pilih maupun seret-lepas ke halaman): gambar dibaca langsung di browser;
 * PDF dipecah per halaman di browser dengan PDF.js (tanpa Agen Scanner). Berkas diproses
 * berurutan sehingga urutan halaman mengikuti urutan berkas.
 */
export function useImpor({ onHalaman }) {
  const ctrl = useRef(null);
  // { nama, n: total halaman sejauh ini dalam satu impor, jenis: 'pdf'|'gambar' } selama mengimpor
  const [proses, setProses] = useState(null);

  useEffect(() => () => ctrl.current?.abort(), []);

  const impor = useCallback(
    async (files) => {
      const daftar = [...files];
      if (!daftar.length) return;
      if (ctrl.current) {
        showToast('Tunggu impor sebelumnya selesai.', 'error');
        return;
      }
      const c = new AbortController();
      ctrl.current = c;
      let total = 0;
      try {
        for (const f of daftar) {
          if (c.signal.aborted) break;
          if (adalahPdf(f)) {
            setProses({ nama: f.name, n: total, jenis: 'pdf' });
            try {
              await pecahPdfWeb(f, {
                dpi: DPI_PDF,
                signal: c.signal,
                onHalaman: (hl) => {
                  total += 1;
                  setProses({ nama: f.name, n: total, jenis: 'pdf' });
                  onHalaman({
                    blob: hl.blob,
                    nama: `${f.name} · hal. ${hl.ke}`,
                    sumber: 'pdf',
                    lebar: hl.lebar,
                    tinggi: hl.tinggi,
                  });
                },
              });
            } catch (err) {
              // Satu PDF gagal tidak menghentikan berkas berikutnya; hanya "Hentikan" yang begitu
              if (err?.name === 'AbortError') throw err;
              showToast(`"${f.name}": ${err.message}`, 'error');
            }
          } else if (f.type.startsWith('image/')) {
            setProses({ nama: f.name, n: total, jenis: 'gambar' });
            try {
              const { blob, lebar, tinggi } = await siapkanGambar(f);
              onHalaman({ blob, nama: f.name, sumber: 'gambar', lebar, tinggi });
              total += 1;
              setProses({ nama: f.name, n: total, jenis: 'gambar' });
            } catch {
              showToast(`"${f.name}" tidak bisa dibaca sebagai gambar.`, 'error');
            }
          } else {
            showToast(`"${f.name}" dilewati: hanya gambar atau PDF.`, 'error');
          }
        }
        if (total) showToast(`${total} halaman ditambahkan.`);
      } catch (err) {
        if (err?.name === 'AbortError') showToast(`Impor dihentikan; ${total} halaman tersimpan.`);
        else showToast(err.message, 'error');
      } finally {
        // Ditunda satu langkah: jumlah terakhir sempat tampil di panggung sebelum "Selesai"
        // (tanpa ini React menggabungkannya dengan pembaruan terakhir)
        setTimeout(() => setProses(null), 0);
        ctrl.current = null;
      }
    },
    [onHalaman],
  );

  const hentikan = useCallback(() => ctrl.current?.abort(), []);

  return { impor, proses, hentikan };
}

/**
 * Terima berkas yang dilepas di mana saja pada halaman (bukan hanya di kotak unggah).
 * `aktif` = sedang ada berkas diseret di atas jendela (untuk lapisan petunjuk).
 * Seret internal (mengurutkan halaman) diabaikan karena tidak membawa "Files".
 */
export function useSeretBerkas(onBerkas) {
  const [aktif, setAktif] = useState(false);
  const hitung = useRef(0);
  const onBerkasRef = useRef(onBerkas);

  useEffect(() => {
    onBerkasRef.current = onBerkas;
  }, [onBerkas]);

  useEffect(() => {
    const adaBerkas = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
    const masuk = (e) => {
      if (!adaBerkas(e)) return;
      hitung.current += 1;
      setAktif(true);
    };
    const keluar = (e) => {
      if (!adaBerkas(e)) return;
      hitung.current = Math.max(0, hitung.current - 1);
      if (hitung.current === 0) setAktif(false);
    };
    const atas = (e) => {
      if (!adaBerkas(e)) return;
      e.preventDefault(); // tanpa ini browser membuka berkasnya di tab
      e.dataTransfer.dropEffect = 'copy';
    };
    const lepas = (e) => {
      if (!adaBerkas(e)) return;
      e.preventDefault();
      hitung.current = 0;
      setAktif(false);
      onBerkasRef.current(e.dataTransfer.files);
    };
    window.addEventListener('dragenter', masuk);
    window.addEventListener('dragleave', keluar);
    window.addEventListener('dragover', atas);
    window.addEventListener('drop', lepas);
    return () => {
      window.removeEventListener('dragenter', masuk);
      window.removeEventListener('dragleave', keluar);
      window.removeEventListener('dragover', atas);
      window.removeEventListener('drop', lepas);
    };
  }, []);

  return aktif;
}
