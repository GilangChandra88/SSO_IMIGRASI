import { useMemo } from 'react';
import { itemDiAkun } from '../../makPohon';
import { useMakTahun } from '../../useMakTahun';
import { useRekapMak } from '../../useRekapMak';
import { makOf } from '../utils/lpjLogic';
import { realisasiPerItem } from '../utils/verifikasiLogic';

/**
 * Konteks MAK satu berkas untuk nominal & POK Lembar Verifikasi (lihat pokItem):
 * - sebelum verifikasi selesai: pohon MAK + `mak_rekap` tahun itu (POK dihitung dari total
 *   realisasi dikurangi realisasi berkas ini), dan `opsiItem` = Item lain pada Akun yang sama
 *   (pilihan ganti item);
 * - sesudahnya: POK yang dibekukan (`keuangan.pokBeku`) — pohon & rekap tidak diunduh lagi.
 * @param {object} berkas  dokumen lpj_berkas
 * @param {object|null} keuangan  dokumen keuangan/status
 */
export function useMakBerkas(berkas, keuangan) {
  const beku = keuangan?.verifikasi?.selesai === true;
  const tahun = beku ? null : berkas?.tahunAnggaran;
  const { nodes, byId, memuat } = useMakTahun(tahun);
  const { rekap, memuat: memuatRekap } = useRekapMak(tahun);
  const akunId = makOf(berkas)?.akunNodeId;
  const opsiItem = useMemo(
    () => itemDiAkun(nodes, akunId).map((n) => ({ id: n.id, kode: n.kode, nama: n.nama })),
    [nodes, akunId],
  );
  const milikSendiri = useMemo(() => realisasiPerItem(berkas), [berkas]);
  const mak = useMemo(
    () => (beku ? { pok: keuangan?.pokBeku || {} } : { byId, rekap, milikSendiri }),
    [beku, keuangan?.pokBeku, byId, rekap, milikSendiri],
  );
  return { mak, opsiItem: beku ? [] : opsiItem, loading: !beku && (memuat || memuatRekap) };
}
