import { useState } from 'react';
import Modal from '@/components/Modal';
import Halaman from '../components/Halaman';
import Saring from '../components/Saring';
import DaftarKosong from '../components/DaftarKosong';
import FormTinjau from '../components/FormTinjau';
import { useTampilan } from '../hooks/useTampilan';
import { tinjauGalat } from '../services/logDev';
import { STATUS_GALAT } from '../data/kode';
import { jelaskanGalat } from '../data/penjelasanGalat';
import { K } from '../ui/kelas';
import { angka, relatif, waktu } from '../ui/format';

const KOLOM = 'md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_90px_120px]';
const PILIHAN = [{ id: '', label: 'Semua' }, ...STATUS_GALAT];

const lencanaStatus = (s) =>
  s === 'baru' ? K.lencanaBahaya : s === 'ditangani' ? K.lencanaBaik : K.lencana;

/** Galat dikelompokkan per jenis (browser & Function). Disimpan 180 hari sejak terakhir muncul. */
export default function Galat() {
  const [status, setStatus] = useState('baru');
  const [buka, setBuka] = useState(null);
  const { daftar, nama, memuat, habis, segarkan, muatLagi, data } = useTampilan('galat', {
    status,
  });
  const kini = data?.server || Date.now();

  return (
    <Halaman
      judul="Galat"
      sub="Kesalahan di browser pengguna dan di server. Galat yang sama digabung dan dihitung."
      onSegarkan={segarkan}
      memuat={memuat}
    >
      <Saring label="Status galat" pilihan={PILIHAN} nilai={status} onUbah={setStatus} />
      <div className={K.kartuDaftar}>
        <div className={`${K.kepalaTabel} ${KOLOM}`}>
          <span>Pesan</span>
          <span>Sumber & lokasi</span>
          <span>Jumlah</span>
          <span>Terakhir</span>
        </div>
        {daftar.map((g) => (
          <button
            key={g.id}
            type="button"
            className={`${K.baris} ${KOLOM}`}
            onClick={() => setBuka(g)}
          >
            <span className="min-w-0">
              <span className={`${K.judulBaris} block`}>{jelaskanGalat(g).judul}</span>
              <span className={`${K.mono} block`}>{g.pesan}</span>
              <span className="flex flex-wrap gap-1 mt-0.5">
                <span className={lencanaStatus(g.status)}>
                  {STATUS_GALAT.find((s) => s.id === g.status)?.label || g.status}
                </span>
                {g.kambuh && <span className={K.lencanaPeringatan}>Kambuh</span>}
                <span className={K.redup}>kode {g.id.slice(0, 8)}</span>
              </span>
            </span>
            <span className="min-w-0">
              <span className={`${K.mono} block`}>{g.sumber}</span>
              <span className={`${K.mono} block`}>{g.lokasi}</span>
            </span>
            <span className={K.teks}>
              {angka(g.jumlah)}× · {g.penggunaTerdampak?.length || 0} org
            </span>
            <span className={K.redup}>{relatif(g.terakhirPada, kini)}</span>
          </button>
        ))}
        <DaftarKosong
          memuat={memuat}
          jumlah={daftar.length}
          habis={habis}
          onMuatLagi={muatLagi}
          pesan="Tidak ada galat."
        />
      </div>

      {buka && (
        <Modal
          onClose={() => setBuka(null)}
          labelledBy="judul-galat"
          widthClass="max-w-[680px]"
          lembar
        >
          <div className="p-5 max-h-[85dvh] overflow-y-auto">
            <h2 id="judul-galat" className={`${K.judulSeksi} mb-1 break-words`}>
              {jelaskanGalat(buka).judul}
            </h2>
            <p className={`${K.mono} mb-1`}>
              {buka.nama}: {buka.pesan}
            </p>
            <p className={`${K.redup} mb-3`}>
              Kode {buka.id.slice(0, 8)} · terjadi di {jelaskanGalat(buka).tempat}
            </p>
            <div className={`${K.kotakInfo} mb-3`}>
              <p className={K.judulBaris}>Apa artinya</p>
              <p className={`${K.teks} mb-2`}>{jelaskanGalat(buka).penjelasan}</p>
              <p className={K.judulBaris}>Yang perlu dilakukan</p>
              <p className={K.teks}>{jelaskanGalat(buka).saran}</p>
            </div>
            <dl className={`${K.kv} mb-3`}>
              <dt className={K.kvKunci}>Sumber</dt>
              <dd className={K.kvNilai}>{buka.sumber}</dd>
              <dt className={K.kvKunci}>Lokasi</dt>
              <dd className={K.kvNilai}>{buka.lokasi || '-'}</dd>
              <dt className={K.kvKunci}>Jumlah</dt>
              <dd className={K.kvNilai}>{angka(buka.jumlah)} kali</dd>
              <dt className={K.kvKunci}>Pertama / terakhir</dt>
              <dd className={K.kvNilai}>
                {waktu(buka.pertamaPada)} / {waktu(buka.terakhirPada)}
              </dd>
              <dt className={K.kvKunci}>Versi aplikasi</dt>
              <dd className={K.kvNilai}>{buka.contoh?.versi || '-'}</dd>
              <dt className={K.kvKunci}>Pengguna terdampak</dt>
              <dd className={K.kvNilai}>
                {(buka.penggunaTerdampak || []).map((u) => nama[u] || u).join(', ') || '-'}
              </dd>
              {buka.catatan && (
                <>
                  <dt className={K.kvKunci}>Catatan</dt>
                  <dd className={K.kvNilai}>{buka.catatan}</dd>
                </>
              )}
            </dl>
            {buka.contoh?.stack && <pre className={K.pre}>{buka.contoh.stack}</pre>}
            <FormTinjau
              id={buka.id}
              statusKini={buka.status}
              pilihan={STATUS_GALAT}
              kirim={tinjauGalat}
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
