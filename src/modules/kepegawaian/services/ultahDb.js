/**
 * Status kejutan ulang tahun per pegawai (`ultah_status/{pegawaiId}`, docs/skema-database.md §5.1)
 * untuk halaman Ulang Tahun. Ucapan dibaca lewat `pantauUcapanUntuk` (@/utils/ulangTahun); reset &
 * uji lewat ModalKejutanUltah.
 */
import { doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { KOLEKSI } from '@/config/koleksi';
import { pantau } from '@/utils/pantau';

/** @param {(status: object|null) => void} onData  null = belum pernah ada status */
export const pantauStatusUltah = (pegawaiId, onData) =>
  pantau(
    doc(db, KOLEKSI.ultahStatus, pegawaiId),
    (snap) => onData(snap.exists() ? snap.data() : null),
    { onGalat: () => onData(null), diam: true },
  );
