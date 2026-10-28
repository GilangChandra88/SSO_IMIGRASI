/**
 * Isian form LPJ (Perjadin & Non-Perjadin): salinan lokal bagian berkas + simpan otomatis.
 *
 * - Simpanan hanya mengirim field yang berubah (dot-path, versi + 1) pada bagian yang boleh ditulis
 *   saat ini (bagian sebelumnya terkunci, dirinya belum) — sama dengan firestore.rules.
 * - Pembandingnya isi yang benar-benar tersimpan, sehingga nilai awal model kosong (mis. "Maksud"
 *   SPD = uraian kegiatan) ikut tersimpan pada simpan pertama.
 * - Status kunci dibaca dari berkas live (`pack`), karena LPJ/SPBy dikunci Function.
 * - Berkas unggahan (scan TTE, foto laporan, lampiran) ditulis unggahan.js, bukan dari sini; untuk
 *   tampilan & cetak nilainya selalu diambil dari berkas live.
 */
import { useRef, useState } from 'react';
import { keDate } from '@/utils/nilai';
import { pesanGalat } from '@/utils/pesanGalat';
import { BAGIAN } from '../data/masterLpj';
import { perubahanBagian, selesaikanSpby, simpanBerkas } from '../services/berkasDb';
import { bagianDari } from '../utils/modelKosong';
import { useSimpanOtomatis } from './useSimpanOtomatis';

const salin = (o) => JSON.parse(JSON.stringify(o ?? null));

/** Field berkas unggahan per bagian (dikelola services/unggahan.js). */
const FIELD_BERKAS = { tte: ['scan'], laporan: ['foto'], lampiran: ['foto', 'nota'] };

function tanpaFieldBerkas(bagian, isi) {
  const field = FIELD_BERKAS[bagian];
  if (!field || !isi) return isi || {};
  const hasil = { ...isi };
  field.forEach((f) => delete hasil[f]);
  return hasil;
}

/** Bagian boleh ditulis sekarang: bagian sebelumnya terkunci dan dirinya belum (rules `urut`/`tetap`). */
export function bolehTulis(pack, bagian) {
  const urutan = BAGIAN[pack.jenis] || [];
  const i = urutan.indexOf(bagian);
  if (i < 0 || pack[bagian]?.terkunci === true) return false;
  return i === 0 || pack[urutan[i - 1]]?.terkunci === true;
}

/** Isi untuk tampilan & cetak: isian lokal + status kunci dan berkas unggahan dari berkas live. */
export function gabungTampilan(pack, pf) {
  const hasil = { ...pack, uraian: pf.uraian ?? pack.uraian };
  (BAGIAN[pack.jenis] || []).forEach((b) => {
    const live = pack[b] || {};
    const unggahan = Object.fromEntries(
      (FIELD_BERKAS[b] || []).filter((f) => f in live).map((f) => [f, live[f]]),
    );
    hasil[b] = { ...pf[b], ...unggahan, terkunci: live.terkunci === true };
  });
  return hasil;
}

/**
 * @param {object} pack  berkas live (useBerkas)
 * @param {{ uid: string }} user
 * @param {{ showToast: Function, isiAwal?: (pack, pf) => object }} opsi  isiAwal = nilai awal
 *   tambahan untuk isian lokal (mis. keterangan SPBy = uraian kegiatan)
 */
export function useFormBerkas(pack, user, { showToast, isiAwal }) {
  const urutan = BAGIAN[pack.jenis] || [];
  const [pf, setPfState] = useState(() => {
    const isi = Object.fromEntries(urutan.map((b) => [b, bagianDari(pack, b)]));
    isi.uraian = pack.uraian || '';
    return isiAwal ? isiAwal(pack, isi) : isi;
  });
  const pfRef = useRef(pf);
  // Isi yang sudah tersimpan di Firestore per bagian (dasar perbandingan simpan berikutnya)
  const tersimpan = useRef({
    ...Object.fromEntries(urutan.map((b) => [b, salin(pack[b]) || {}])),
    uraian: pack.uraian || '',
  });
  const [lastSaved, setLastSaved] = useState(() => keDate(pack.diubahPada));

  const setPf = (fn) =>
    setPfState((prev) => {
      const next = typeof fn === 'function' ? fn(prev) : fn;
      pfRef.current = next;
      return next;
    });

  /**
   * Simpan isian (objek pf baru atau fungsi pf lama → baru).
   * @param {{ quiet?, auto?, kunci?: string, selesaikanSpby?: boolean }} opts
   *   kunci = bagian yang ditetapkan final bersama simpanan ini (bukan lpj/spby);
   *   selesaikanSpby = setelah tersimpan, kunci LPJ/SPBy + terbitkan nomor lewat Function
   * @returns {Promise<false | { nomorLpj?: string }>} false bila gagal
   */
  async function persist(nextOrFn, opts = {}) {
    const next = typeof nextOrFn === 'function' ? nextOrFn(pfRef.current) : nextOrFn;
    setPf(next);
    if (!opts.auto) otomatis.bersih(); // simpanan ini sudah memuat isian terbaru
    const terbuka = urutan.filter((b) => bolehTulis(pack, b));
    const perubahan = {};
    terbuka.forEach((b) =>
      Object.assign(
        perubahan,
        perubahanBagian(b, tanpaFieldBerkas(b, tersimpan.current[b]), tanpaFieldBerkas(b, next[b])),
      ),
    );
    // Uraian kegiatan (judul berkas) boleh diubah sampai nomor LPJ terbit, tidak boleh kosong
    const uraian = String(next.uraian ?? '').trim();
    const ubahUraian = !pack.nomorLpj && uraian && uraian !== tersimpan.current.uraian;
    if (ubahUraian) perubahan.uraian = uraian;
    if (opts.kunci) perubahan[`${opts.kunci}.terkunci`] = true;
    try {
      if (Object.keys(perubahan).length) {
        await simpanBerkas(pack.id, perubahan, user.uid);
        terbuka.forEach((b) => (tersimpan.current[b] = salin(next[b])));
        if (ubahUraian) tersimpan.current.uraian = uraian;
        setLastSaved(new Date());
      }
      const hasil = opts.selesaikanSpby ? await selesaikanSpby(pack.id) : {};
      if (!opts.quiet) showToast('Draft tersimpan.');
      return hasil || {};
    } catch (err) {
      // Simpan otomatis yang gagal cukup ditandai lewat peringatan di atas form
      if (!opts.auto) {
        showToast(pesanGalat(err, 'Gagal menyimpan. Periksa koneksi lalu coba lagi.'), 'error');
      }
      return false;
    }
  }

  // Setiap perubahan isian (lewat ubahPf) disimpan otomatis 2,5 detik setelah berhenti mengetik
  const otomatis = useSimpanOtomatis(() => persist(pfRef.current, { quiet: true, auto: true }), {
    jeda: 2500,
  });
  const ubahPf = (fn) => {
    setPf(fn);
    otomatis.tandai();
  };

  return {
    pf,
    pfRef,
    setPf,
    ubahPf,
    persist,
    otomatis,
    lastSaved,
    packView: gabungTampilan(pack, pf),
  };
}
