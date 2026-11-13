import { useState } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import Halaman from '../components/Halaman';
import Pelaku from '../components/Pelaku';
import Saring from '../components/Saring';
import DaftarKosong from '../components/DaftarKosong';
import { TabelKV, TabelSelisih } from '../components/TabelRincian';
import { useTampilan } from '../hooks/useTampilan';
import { JALUR, MODUL } from '../data/kode';
import { K } from '../ui/kelas';
import { waktu } from '../ui/format';

const KOLOM = 'md:grid-cols-[150px_110px_minmax(0,1.6fr)_minmax(0,1fr)]';
const PILIHAN = [
  { id: '', label: 'Semua' },
  ...Object.entries(MODUL)
    .filter(([id]) => id !== 'logdev')
    .map(([id, label]) => ({ id, label })),
];

function LencanaJalur({ jalur }) {
  if (jalur === 'luar') return <span className={K.lencanaBahaya}>{JALUR.luar}</span>;
  if (jalur === 'klien') return <span className={K.lencanaInfo}>{JALUR.klien}</span>;
  return <span className={K.lencana}>Function</span>;
}

/** Jejak perubahan data (permanen): dari Function, dari browser (selisih field), atau dari luar. */
export default function Perubahan() {
  const [modul, setModul] = useState('');
  const [cari, setCari] = useState('');
  const [target, setTarget] = useState('');
  const [buka, setBuka] = useState(null);
  const { daftar, nama, memuat, habis, segarkan, muatLagi } = useTampilan(
    'perubahan',
    target ? { target } : { modul },
  );

  return (
    <Halaman
      judul="Jejak Perubahan"
      sub="Setiap perubahan data: siapa, kapan, nilai sebelum → sesudah. Permanen, tersegel harian."
      onSegarkan={segarkan}
      memuat={memuat}
    >
      <form
        className={`${K.bilah}`}
        onSubmit={(e) => {
          e.preventDefault();
          setTarget(cari.trim());
        }}
      >
        <input
          className={`${K.masukan} flex-1 min-w-[220px]`}
          placeholder="Riwayat satu dokumen, mis. koperasi_kantin_barang/ID"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          aria-label="Path dokumen"
        />
        <button type="submit" className={K.tombolKedua} disabled={!cari.trim()}>
          <FaSearch size={12} /> Cari
        </button>
        {target && (
          <button
            type="button"
            className={K.tombolKecil}
            onClick={() => {
              setTarget('');
              setCari('');
            }}
          >
            <FaTimes size={10} /> Hapus pencarian
          </button>
        )}
      </form>
      {!target && <Saring label="Modul" pilihan={PILIHAN} nilai={modul} onUbah={setModul} />}

      <div className={K.kartuDaftar}>
        <div className={`${K.kepalaTabel} ${KOLOM}`}>
          <span>Waktu</span>
          <span>Modul</span>
          <span>Aksi & data</span>
          <span>Pelaku</span>
        </div>
        {daftar.map((l) => (
          <button
            key={l.id}
            type="button"
            className={`${K.baris} ${KOLOM}`}
            onClick={() => setBuka(l)}
          >
            <span className={K.redup}>{waktu(l.pada)}</span>
            <span className="flex flex-wrap gap-1">
              <span className={K.lencana}>{MODUL[l.modul] || l.modul}</span>
            </span>
            <span className="min-w-0">
              <span className={`${K.judulBaris} flex flex-wrap items-center gap-1.5`}>
                {l.aksi}
                <LencanaJalur jalur={l.jalur} />
                {l.jumlahSimpan > 1 && <span className={K.redup}>{l.jumlahSimpan}× simpan</span>}
              </span>
              <span className={`${K.mono} block`}>{l.target}</span>
            </span>
            <Pelaku uid={l.oleh} nama={nama} ringkas />
          </button>
        ))}
        <DaftarKosong memuat={memuat} jumlah={daftar.length} habis={habis} onMuatLagi={muatLagi} />
      </div>

      {buka && (
        <Modal
          onClose={() => setBuka(null)}
          labelledBy="judul-perubahan"
          widthClass="max-w-[640px]"
          lembar
        >
          <div className="p-5 max-h-[85dvh] overflow-y-auto">
            <h2 id="judul-perubahan" className={`${K.judulSeksi} mb-1`}>
              {buka.aksi}
            </h2>
            <p className={`${K.mono} mb-3`}>{buka.target}</p>
            <dl className={`${K.kv} mb-4`}>
              <dt className={K.kvKunci}>Waktu</dt>
              <dd className={K.kvNilai}>{waktu(buka.pada)}</dd>
              <dt className={K.kvKunci}>Pelaku</dt>
              <dd className={K.kvNilai}>
                {nama[buka.oleh] || buka.oleh || '-'}
                {buka.terverifikasi === false && ' (dari isian dokumen, belum terverifikasi)'}
              </dd>
              <dt className={K.kvKunci}>Jalur</dt>
              <dd className={K.kvNilai}>{JALUR[buka.jalur] || 'Function'}</dd>
              {buka.alasan && (
                <>
                  <dt className={K.kvKunci}>Alasan</dt>
                  <dd className={K.kvNilai}>{buka.alasan}</dd>
                </>
              )}
            </dl>
            {buka.perubahan ? (
              <TabelSelisih perubahan={buka.perubahan} lebih={buka.lebih} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className={`${K.label}`}>Sebelum</p>
                  <TabelKV
                    isi={
                      buka.nilaiLama && typeof buka.nilaiLama === 'object'
                        ? buka.nilaiLama
                        : { nilai: buka.nilaiLama }
                    }
                  />
                </div>
                <div>
                  <p className={`${K.label}`}>Sesudah</p>
                  <TabelKV
                    isi={
                      buka.nilaiBaru && typeof buka.nilaiBaru === 'object'
                        ? buka.nilaiBaru
                        : { nilai: buka.nilaiBaru }
                    }
                  />
                </div>
              </div>
            )}
            <button
              type="button"
              className={`${K.tombolKedua} w-full mt-4`}
              onClick={() => setBuka(null)}
            >
              Tutup
            </button>
          </div>
        </Modal>
      )}
    </Halaman>
  );
}
