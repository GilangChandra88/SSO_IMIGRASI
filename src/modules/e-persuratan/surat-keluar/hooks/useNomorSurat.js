/**
 * Data Persuratan lewat listener bersama (`usePantauBersama`): hierarki kode surat, nomor urut
 * terakhir per tahun, dan register nomor per tahun & sumber (100 terbaru + halaman berikutnya).
 * Hook dipasang di komponen yang menampilkannya (mis. per tab).
 */

import { useMemo, useState } from 'react';
import { indeksHierarki } from '@/components/StrukturHierarki/hierarkiUtils';
import { LIMIT_KUERI } from '@/utils/batas';
import { showToast } from '@/utils/toastStore';
import { usePantauBersama } from '@/utils/usePantauBersama';
import { HIERARKI_KODE } from '../data/nomorSuratConfig';
import {
  ambilNomorBerikutnya,
  kueriKodeSurat,
  kueriNomorSurat,
  refPenghitungSurat,
} from '../services/nomorSurat';

/** Bentuk node untuk StrukturHierarki & pemilih kode ({ id, kode, name, type, parentId }). */
const keNodeTampil = (n) => ({
  id: n.id,
  kode: n.kode || '',
  name: n.aktif === false ? `${n.nama} · nonaktif` : n.nama,
  nameAsli: n.nama,
  type: HIERARKI_KODE[n.tingkat],
  parentId: n.indukId ?? null,
  aktif: n.aktif !== false,
});

/**
 * Hierarki kode surat (`surat_kode`, ≤2.000 node). `indeksAktif` hanya berisi node aktif (untuk
 * memilih kode); `nodes` (semua) untuk tab Hierarki Kode.
 * @param {{ aktif?: boolean }} [opsi]  aktif = false → tidak memasang listener
 */
export function useKodeSurat({ aktif = true } = {}) {
  const { data, memuat } = usePantauBersama(aktif ? 'surat_kode' : null, kueriKodeSurat, {
    tahanMs: 5 * 60_000,
    pesan: 'Gagal memuat hierarki kode surat.',
  });
  return useMemo(() => {
    const nodes = (data || []).map(keNodeTampil);
    return {
      nodes,
      indeksAktif: indeksHierarki(nodes.filter((n) => n.aktif)),
      memuat,
    };
  }, [data, memuat]);
}

/** Nomor urut terakhir yang terbit di satu tahun (0 bila belum ada). */
export function useNomorTerakhir(tahun) {
  const { data, memuat } = usePantauBersama(
    tahun ? `sistem_penghitung:surat_${tahun}` : null,
    () => refPenghitungSurat(tahun),
    { pesan: 'Gagal memuat nomor urut surat terakhir.' },
  );
  return { nilai: Number(data?.nilai) || 0, memuat };
}

const LANJUTAN_KOSONG = { kunci: null, baris: [], habis: false, memuat: false };

/**
 * Register nomor surat satu tahun & sumber, nomor terbaru dulu: 100 terbaru mengikuti listener,
 * halaman berikutnya lewat `muatLagi`.
 * @param {{ tahun: number, sumber: 'register'|'form'|'srikandi' }} opsi
 */
export function useDaftarNomor({ tahun, sumber }) {
  const kunci = tahun && sumber ? `surat_nomor:${sumber}:${tahun}` : null;
  const { data, memuat } = usePantauBersama(kunci, () => kueriNomorSurat({ tahun, sumber }), {
    tahanMs: 5 * 60_000,
    pesan: 'Gagal memuat register nomor surat.',
  });
  const [lanjutan, setLanjutan] = useState(LANJUTAN_KOSONG);
  const tambahan = lanjutan.kunci === kunci ? lanjutan : LANJUTAN_KOSONG;
  const pertama = data || [];
  const adaDiPertama = new Set(pertama.map((r) => r.id));
  const rows = [...pertama, ...tambahan.baris.filter((r) => !adaDiPertama.has(r.id))];

  const muatLagi = async () => {
    const terakhir = rows[rows.length - 1];
    if (!terakhir) return;
    setLanjutan({ ...tambahan, kunci, memuat: true });
    try {
      const baru = await ambilNomorBerikutnya({ tahun, sumber }, terakhir.nomorUrut);
      setLanjutan({
        kunci,
        baris: [...tambahan.baris, ...baru],
        habis: baru.length < LIMIT_KUERI.nomorSurat,
        memuat: false,
      });
    } catch {
      showToast('Tidak punya akses atau gagal memuat data berikutnya.', 'error');
      setLanjutan({ ...tambahan, kunci, memuat: false });
    }
  };

  return {
    rows,
    loading: memuat,
    bisaLagi: pertama.length === LIMIT_KUERI.nomorSurat && !tambahan.habis,
    memuatLagi: tambahan.memuat,
    muatLagi,
  };
}
