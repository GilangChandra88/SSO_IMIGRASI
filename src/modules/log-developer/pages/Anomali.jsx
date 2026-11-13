import { useState } from 'react';
import Modal from '@/components/Modal';
import Halaman from '../components/Halaman';
import Pelaku from '../components/Pelaku';
import Saring from '../components/Saring';
import DaftarKosong from '../components/DaftarKosong';
import FormTinjau from '../components/FormTinjau';
import { TabelKV } from '../components/TabelRincian';
import { useTampilan } from '../hooks/useTampilan';
import { tinjauAnomali } from '../services/logDev';
import { KODE_ANOMALI, MODUL, STATUS_ANOMALI } from '../data/kode';
import { K, lencanaTingkat } from '../ui/kelas';
import { angka, perangkat, relatif, waktu } from '../ui/format';

const KOLOM = 'md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_120px]';
const PILIHAN = [{ id: '', label: 'Semua' }, ...STATUS_ANOMALI];
const KODE = [
  { id: '', label: 'Semua jenis' },
  ...Object.entries(KODE_ANOMALI).map(([id, label]) => ({ id, label: `${id} · ${label}` })),
];

/** Kejadian sah tetapi patut diperiksa; setiap tinjauan wajib catatan dan tercatat. */
export default function Anomali() {
  const [status, setStatus] = useState('baru');
  const [kode, setKode] = useState('');
  const [buka, setBuka] = useState(null);
  const { daftar, nama, memuat, habis, segarkan, muatLagi, data } = useTampilan(
    'anomali',
    kode ? { kode } : { status },
  );
  const kini = data?.server || Date.now();

  return (
    <Halaman
      judul="Anomali"
      sub="Kejadian yang lolos aturan tetapi patut dicek: pembatalan, selisih stok, akses ditolak, perubahan dari luar aplikasi."
      onSegarkan={segarkan}
      memuat={memuat}
    >
      <div className={K.bilah}>
        <select
          className={`${K.masukan} sm:max-w-xs`}
          value={kode}
          onChange={(e) => setKode(e.target.value)}
          aria-label="Jenis anomali"
        >
          {KODE.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
      </div>
      {!kode && (
        <Saring label="Status anomali" pilihan={PILIHAN} nilai={status} onUbah={setStatus} />
      )}

      <div className={K.kartuDaftar}>
        <div className={`${K.kepalaTabel} ${KOLOM}`}>
          <span>Anomali</span>
          <span>Pelaku</span>
          <span>Terakhir</span>
        </div>
        {daftar.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`${K.baris} ${KOLOM}`}
            onClick={() => setBuka(a)}
          >
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-1.5">
                <span className={lencanaTingkat(a.tingkat)}>{a.kode}</span>
                <span className={K.judulBaris}>{a.judul}</span>
              </span>
              <span className={K.redup}>
                {MODUL[a.modul] || a.modul} · {STATUS_ANOMALI.find((s) => s.id === a.status)?.label}
                {a.jumlah > 1 ? ` · ${angka(a.jumlah)}×` : ''}
              </span>
            </span>
            <Pelaku uid={a.pelaku?.uid} email={a.pelaku?.email} ip={a.pelaku?.ip} nama={nama} />
            <span className={K.redup}>{relatif(a.terakhirPada, kini)}</span>
          </button>
        ))}
        <DaftarKosong
          memuat={memuat}
          jumlah={daftar.length}
          habis={habis}
          onMuatLagi={muatLagi}
          pesan="Tidak ada anomali."
        />
      </div>

      {buka && (
        <Modal
          onClose={() => setBuka(null)}
          labelledBy="judul-anomali"
          widthClass="max-w-[620px]"
          lembar
        >
          <div className="p-5 max-h-[85dvh] overflow-y-auto">
            <span className={lencanaTingkat(buka.tingkat)}>
              {buka.kode} · {buka.tingkat}
            </span>
            <h2 id="judul-anomali" className={`${K.judulSeksi} mt-2 mb-1`}>
              {buka.judul}
            </h2>
            <p className={`${K.redup} mb-3`}>{KODE_ANOMALI[buka.kode] || buka.kode}</p>
            <dl className={`${K.kv} mb-3`}>
              <dt className={K.kvKunci}>Pelaku</dt>
              <dd className={K.kvNilai}>
                {nama[buka.pelaku?.uid] || buka.pelaku?.email || buka.pelaku?.uid || '-'}
              </dd>
              <dt className={K.kvKunci}>IP / perangkat</dt>
              <dd className={K.kvNilai}>
                {buka.pelaku?.ip || '-'} · {perangkat(buka.pelaku?.perangkat)}
              </dd>
              <dt className={K.kvKunci}>Data</dt>
              <dd className={`${K.kvNilai} break-all`}>{buka.target || '-'}</dd>
              <dt className={K.kvKunci}>Kejadian</dt>
              <dd className={K.kvNilai}>
                {angka(buka.jumlah)}× · {waktu(buka.pertamaPada)} s.d. {waktu(buka.terakhirPada)}
              </dd>
              {buka.catatan && (
                <>
                  <dt className={K.kvKunci}>Catatan pemeriksa</dt>
                  <dd className={K.kvNilai}>
                    {buka.catatan} ({nama[buka.diperiksaOleh] || buka.diperiksaOleh})
                  </dd>
                </>
              )}
            </dl>
            <p className={K.label}>Rincian</p>
            <TabelKV isi={buka.rincian} />
            <FormTinjau
              id={buka.id}
              statusKini={buka.status}
              pilihan={STATUS_ANOMALI}
              kirim={tinjauAnomali}
              onSelesai={() => {
                setBuka(null);
                segarkan();
              }}
            />
          </div>
        </Modal>
      )}
    </Halaman>
  );
}
