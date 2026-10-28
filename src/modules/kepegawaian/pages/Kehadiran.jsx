import { useCallback, useEffect, useState } from 'react';
import { FaChartBar, FaClipboardCheck, FaExclamationTriangle } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import ToastViewport from '@/components/ToastViewport';
import { ANIM } from '@/utils/animasi';
import { tanggalIso, tahunIni } from '@/utils/nilai';
import { showToast } from '@/utils/toastStore';
import { useDaftarPegawai } from '../hooks/useDaftarPegawai';
import { useKegiatanPeriode } from '../hooks/useKehadiran';
import { pesanGalat } from '../services/pegawaiDb';
import { batalkanKegiatan, buatKegiatan, ubahKegiatan } from '../services/kehadiranDb';
import { kegiatanKosong, semesterDari } from '../utils/kehadiran';
import DaftarKegiatan from '../components/kehadiran/DaftarKegiatan';
import IsiKehadiran from '../components/kehadiran/IsiKehadiran';
import ModalBatalKegiatan from '../components/kehadiran/ModalBatalKegiatan';
import ModalKegiatan from '../components/kehadiran/ModalKegiatan';
import ModalKonfirmasi from '../components/kehadiran/ModalKonfirmasi';
import RekapKehadiran from '../components/kehadiran/RekapKehadiran';
import RiwayatPegawai from '../components/kehadiran/RiwayatPegawai';
import { K } from '../ui/kelas';

const TAB = [
  ['absensi', FaClipboardCheck, 'Absensi Kegiatan'],
  ['rekap', FaChartBar, 'Rekap Kehadiran'],
];

/** Layar isi kehadiran satu kegiatan (kegiatan dibaca dari daftar periode yang sedang dipantau). */
function LayarKegiatan({ id, periode, onTidakAda, ...props }) {
  const { kegiatan, memuat } = useKegiatanPeriode(periode.tahun, periode.semester);
  const k = kegiatan.find((x) => x.id === id);
  const hilang = !memuat && (!k || k.aktif === false);
  // Kegiatan dibatalkan/tidak ada lagi (mis. oleh petugas lain): kembali ke daftar
  useEffect(() => {
    if (hilang) onTidakAda();
  }, [hilang, onTidakAda]);
  if (!k || k.aktif === false) return <p className={K.kosong}>Memuat kegiatan…</p>;
  return <IsiKehadiran kegiatan={k} {...props} />;
}

/**
 * Kegiatan & Kehadiran (purwarupa kehadiran-react): tab Absensi Kegiatan (buat kegiatan → isi
 * kehadiran → simpan; buka lagi untuk melihat/memperbarui) dan Rekap Kehadiran per semester
 * (% hadir & predikat, riwayat per pegawai, ekspor Excel/PDF). Hanya Kepegawaian (+ Super Admin).
 */
export default function Kehadiran() {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;
  const { pegawai } = useDaftarPegawai();
  const [tab, setTab] = useState('absensi');
  const [periode, setPeriode] = useState(() => ({
    tahun: tahunIni(),
    semester: semesterDari(tanggalIso()),
  }));
  const [kegiatanId, setKegiatanId] = useState(null); // layar isi kehadiran
  const [pegawaiId, setPegawaiId] = useState(null); // layar riwayat pegawai
  const [dirty, setDirty] = useState(false);
  const [keluar, setKeluar] = useState(null); // { tujuan } menunggu konfirmasi
  const [form, setForm] = useState(null); // isian awal ModalKegiatan
  const [batal, setBatal] = useState(null); // kegiatan yang akan dibatalkan

  /** Pindah layar; bila kehadiran sudah diubah tetapi belum disimpan, tanya dulu. */
  const mintaKeluar = (tujuan) => (dirty ? setKeluar({ tujuan }) : tujuan());
  const tutupKegiatan = useCallback(() => setKegiatanId(null), []);

  function pilihTab(t) {
    if (t === tab) {
      if (t === 'absensi' && kegiatanId) mintaKeluar(tutupKegiatan);
      if (t === 'rekap') setPegawaiId(null);
      return;
    }
    mintaKeluar(() => {
      setKegiatanId(null);
      setPegawaiId(null);
      setTab(t);
    });
  }

  async function simpanKegiatan(data) {
    try {
      if (data.id) {
        await ubahKegiatan(data.id, data, uid);
        showToast('Kegiatan diperbarui.');
      } else {
        const id = await buatKegiatan(data, uid);
        setKegiatanId(id);
        showToast('Kegiatan dibuat. Silakan isi kehadiran.');
      }
      // Daftar mengikuti periode kegiatan supaya kegiatan itu langsung terlihat
      setPeriode((p) => {
        const tahun = Number(data.tanggal.slice(0, 4));
        const semester = p.semester ? semesterDari(data.tanggal) : 0;
        return p.tahun === tahun && p.semester === semester ? p : { tahun, semester };
      });
      setForm(null);
    } catch (err) {
      showToast(pesanGalat(err, 'Kegiatan gagal disimpan.'), 'error');
      throw err;
    }
  }

  async function konfirmasiBatal(alasan) {
    try {
      await batalkanKegiatan(batal.id, alasan, uid);
      showToast('Kegiatan dibatalkan.');
      setBatal(null);
      setDirty(false);
      setKegiatanId(null);
    } catch (err) {
      showToast(pesanGalat(err, 'Kegiatan gagal dibatalkan.'), 'error');
      throw err;
    }
  }

  const layar =
    tab === 'absensi'
      ? kegiatanId
        ? `isi-${kegiatanId}`
        : 'daftar'
      : pegawaiId
        ? `riwayat-${pegawaiId}`
        : 'rekap';
  const pegawaiTerpilih = pegawai.find((p) => p.id === pegawaiId) || {
    id: pegawaiId,
    nama: '(pegawai tidak ditemukan)',
    nip: '',
  };

  return (
    <div className={K.latar}>
      <div className={K.halaman}>
        <section className={K.kartu}>
          <div className={K.kepala}>
            <div>
              <h1 className={K.h1}>Kegiatan &amp; Kehadiran</h1>
              <p className={K.sub}>
                Buat kegiatan, isi kehadiran pegawai, dan lihat rekap per semester.
              </p>
            </div>
          </div>

          <div className={`${K.seg} mb-[18px]`} role="tablist" aria-label="Bagian kehadiran">
            {TAB.map(([kunci, Ikon, label]) => (
              <button
                key={kunci}
                type="button"
                role="tab"
                aria-selected={tab === kunci}
                onClick={() => pilihTab(kunci)}
                className={tab === kunci ? K.segAktif : K.segBtn}
              >
                <Ikon size={12} /> {label}
              </button>
            ))}
          </div>

          <div key={layar} className={ANIM.muncul}>
            {layar === 'daftar' && (
              <DaftarKegiatan
                tahun={periode.tahun}
                semester={periode.semester}
                onPeriode={setPeriode}
                onBuka={setKegiatanId}
                onTambah={() => setForm(kegiatanKosong())}
              />
            )}
            {tab === 'absensi' && kegiatanId && (
              <LayarKegiatan
                id={kegiatanId}
                periode={periode}
                onTidakAda={tutupKegiatan}
                pegawai={pegawai}
                uid={uid}
                onKembali={() => mintaKeluar(tutupKegiatan)}
                onUbah={(k) => setForm(k)}
                onBatalkan={(k) => setBatal(k)}
                onDirty={setDirty}
                onTersimpan={tutupKegiatan}
              />
            )}
            {layar === 'rekap' && (
              <RekapKehadiran
                tahun={periode.tahun}
                semester={periode.semester}
                pegawai={pegawai}
                onPeriode={setPeriode}
                onBuka={setPegawaiId}
              />
            )}
            {tab === 'rekap' && pegawaiId && (
              <RiwayatPegawai
                pegawai={pegawaiTerpilih}
                tahun={periode.tahun}
                semester={periode.semester}
                onKembali={() => setPegawaiId(null)}
              />
            )}
          </div>
        </section>
      </div>

      {form && (
        <ModalKegiatan awal={form} onSimpan={simpanKegiatan} onTutup={() => setForm(null)} />
      )}
      {batal && (
        <ModalBatalKegiatan
          kegiatan={batal}
          onBatalkan={konfirmasiBatal}
          onTutup={() => setBatal(null)}
        />
      )}
      {keluar && (
        <ModalKonfirmasi
          nada="waspada"
          ikon={<FaExclamationTriangle size={20} />}
          judul="Keluar tanpa menyimpan?"
          labelBatal="Tetap di sini"
          labelOk="Ya, keluar"
          onBatal={() => setKeluar(null)}
          onOk={() => {
            setDirty(false);
            setKeluar(null);
            keluar.tujuan();
          }}
        >
          Perubahan kehadiran yang belum disimpan akan dibuang. Data yang sudah tersimpan sebelumnya
          tetap dipakai.
        </ModalKonfirmasi>
      )}
      <ToastViewport />
    </div>
  );
}
