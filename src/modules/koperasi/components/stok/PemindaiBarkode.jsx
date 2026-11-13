import { useEffect, useRef, useState } from 'react';
import { ANIM } from '@/utils/animasi';
import { K } from '../../ui/kelas';

const FORMAT = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'itf'];
const JEDA_PINDAI_MS = 200;
const JEDA_ULANG_MS = 1500;
const TIDAK_DIDUKUNG =
  'Browser ini belum bisa membaca barkode. Gunakan Chrome di Android, atau ketik barkodenya di Tambah Barang.';

/** Buat pembaca barkode bawaan browser; null bila browser ini tidak mendukung. */
async function buatDetektor() {
  if (!('BarcodeDetector' in window)) return null;
  const tersedia = await window.BarcodeDetector.getSupportedFormats();
  const formats = FORMAT.filter((f) => tersedia.includes(f));
  return formats.length ? new window.BarcodeDetector({ formats }) : null;
}

/**
 * Pratinjau kamera belakang. `onHasil(kode)` dipanggil saat barkode terbaca: sekali lalu kamera
 * berhenti, atau terus-menerus bila `berulang` (untuk memindai banyak barang).
 */
export default function PemindaiBarkode({ onHasil, berulang = false }) {
  const videoRef = useRef(null);
  const hasilRef = useRef(onHasil);
  const [galat, setGalat] = useState('');

  useEffect(() => {
    hasilRef.current = onHasil;
  }, [onHasil]);

  useEffect(() => {
    let selesai = false;
    let timer;
    let aliran;
    let terakhir = { kode: '', waktu: 0 };
    const matikan = () => aliran?.getTracks().forEach((t) => t.stop());

    const mulai = async () => {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setGalat('Kamera hanya bisa dibuka lewat alamat https atau localhost.');
        return;
      }
      try {
        const detektor = await buatDetektor();
        if (!detektor) {
          setGalat(TIDAK_DIDUKUNG);
          return;
        }
        aliran = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (selesai || !videoRef.current) {
          matikan();
          return;
        }
        videoRef.current.srcObject = aliran;
        await videoRef.current.play();

        const pindai = async () => {
          if (selesai) return;
          try {
            const [hasil] = await detektor.detect(videoRef.current);
            if (hasil?.rawValue && !selesai) {
              if (!berulang) {
                selesai = true;
                matikan();
                hasilRef.current(hasil.rawValue);
                return;
              }
              // Barkode yang masih di depan kamera tidak dihitung dua kali
              const kini = Date.now();
              if (hasil.rawValue !== terakhir.kode || kini - terakhir.waktu > JEDA_ULANG_MS) {
                hasilRef.current(hasil.rawValue);
              }
              terakhir = { kode: hasil.rawValue, waktu: kini };
            }
          } catch {
            // Bingkai belum siap dibaca; dicoba lagi pada putaran berikutnya
          }
          timer = setTimeout(pindai, JEDA_PINDAI_MS);
        };
        pindai();
      } catch (err) {
        setGalat(
          err?.name === 'NotAllowedError'
            ? 'Izin kamera ditolak. Izinkan kamera di pengaturan browser.'
            : 'Kamera tidak bisa dibuka.',
        );
      }
    };

    mulai();
    return () => {
      selesai = true;
      clearTimeout(timer);
      matikan();
    };
  }, [berulang]);

  if (galat) {
    return (
      <div className={`${K.kartu} mb-3`}>
        <p className={K.teks}>{galat}</p>
      </div>
    );
  }

  return (
    <div className={`${ANIM.muncul} mb-3`}>
      <div className={K.bingkaiKamera}>
        <video
          ref={videoRef}
          className="block w-full aspect-[4/3] sm:aspect-video object-cover"
          muted
          playsInline
          aria-label="Pratinjau kamera untuk scan barkode"
        />
        <span className={K.garisPindai} aria-hidden="true" />
      </div>
      <p className={`${K.redup} mt-1.5 text-center`}>Arahkan kamera ke barkode.</p>
    </div>
  );
}
