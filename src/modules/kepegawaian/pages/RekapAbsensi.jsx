import { useCallback, useEffect, useState } from 'react';
import { FaExclamationTriangle, FaFingerprint, FaListOl } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import ToastViewport from '@/components/ToastViewport';
import { ANIM } from '@/utils/animasi';
import { showToast } from '@/utils/toastStore';
import { useDaftarPegawai } from '../hooks/useDaftarPegawai';
import { useDaftarRekapAbsensi } from '../hooks/useAbsensi';
import { pesanGalat } from '../services/pegawaiDb';
import { batalkanRekapAbsensi, buatRekapAbsensi, ubahRekapAbsensi } from '../services/absensiDb';
import DaftarRekapAbsensi from '../components/absensi/DaftarRekapAbsensi';
import DetailRekapAbsensi from '../components/absensi/DetailRekapAbsensi';
import ModalBatalAbsensi from '../components/absensi/ModalBatalAbsensi';
import ModalRekapAbsensi from '../components/absensi/ModalRekapAbsensi';
import TabNoAbsen from '../components/absensi/TabNoAbsen';
import ModalKonfirmasi from '../components/kehadiran/ModalKonfirmasi';
import { K } from '../ui/kelas';

const TAB = [
  ['rekap', FaFingerprint, 'Rekapan Absensi'],
  ['no', FaListOl, 'Pengaturan No. Absen'],
];

/** Layar satu rekapan (dibaca dari daftar rekapan yang sedang dipantau). */
function LayarRekap({ id, onTidakAda, ...props }) {
  const { rekapan, memuat } = useDaftarRekapAbsensi();
  const r = rekapan.find((x) => x.id === id);
  const hilang = !memuat && (!r || r.aktif === false);
  // Rekapan dibatalkan/tidak ada lagi (mis. oleh petugas lain): kembali ke daftar
  useEffect(() => {
    if (hilang) onTidakAda();
  }, [hilang, onTidakAda]);
  if (!r || r.aktif === false) return <p className={K.kosong}>Memuat rekapan…</p>;
  return <DetailRekapAbsensi rekap={r} {...props} />;
}

/**
 * Rekap Absensi: rekap jam masuk/pulang dari CSV mesin absensi (Nama;No.;Date/Time). Buat rekapan
 * → impor CSV (boleh berkali-kali, semuanya digabung) → pilih bulan → tabel tanggal & ekspor PDF
 * mendatar/Excel. No. mesin dipetakan ke pegawai di tab Pengaturan No. Absen (berlaku untuk semua
 * rekapan). Hanya Kepegawaian (+ Super Admin).
 */
export default function RekapAbsensi() {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;
  const { pegawai } = useDaftarPegawai();
  const [tab, setTab] = useState('rekap');
  const [rekapId, setRekapId] = useState(null);
  const [form, setForm] = useState(null); // isian awal ModalRekapAbsensi
  const [batal, setBatal] = useState(null); // rekapan yang akan dibatalkan
  const [dirty, setDirty] = useState(false); // pemetaan No. belum disimpan
  const [keluar, setKeluar] = useState(null); // { tujuan } menunggu konfirmasi

  const tutupRekap = useCallback(() => setRekapId(null), []);
  const mintaKeluar = (tujuan) => (dirty ? setKeluar({ tujuan }) : tujuan());

  function pilihTab(t) {
    if (t === tab) {
      if (t === 'rekap') setRekapId(null);
      return;
    }
    mintaKeluar(() => setTab(t));
  }

  async function simpanRekap(data) {
    try {
      if (data.id) {
        await ubahRekapAbsensi(data.id, data, uid);
        showToast('Rekapan diperbarui.');
      } else {
        const id = await buatRekapAbsensi(data, uid);
        setRekapId(id);
        showToast('Rekapan dibuat. Silakan impor CSV dari mesin absensi.');
      }
      setForm(null);
    } catch (err) {
      showToast(pesanGalat(err, 'Rekapan gagal disimpan.'), 'error');
      throw err;
    }
  }

  async function konfirmasiBatal(alasan) {
    try {
      await batalkanRekapAbsensi(batal.id, alasan, uid);
      showToast('Rekapan dibatalkan.');
      setBatal(null);
      setRekapId(null);
    } catch (err) {
      showToast(pesanGalat(err, 'Rekapan gagal dibatalkan.'), 'error');
      throw err;
    }
  }

  const layar = tab === 'no' ? 'no' : rekapId ? `rekap-${rekapId}` : 'daftar';

  return (
    <div className={K.latar}>
      <div className={K.halaman}>
        <section className={K.kartu}>
          <div className={K.kepala}>
            <div>
              <h1 className={K.h1}>Rekap Absensi</h1>
              <p className={K.sub}>
                Impor CSV mesin absensi, gabungkan beberapa impor, lalu rekap jam masuk & pulang per
                bulan.
              </p>
            </div>
          </div>

          <div className={`${K.seg} mb-[18px]`} role="tablist" aria-label="Bagian rekap absensi">
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
              <DaftarRekapAbsensi
                onBuka={setRekapId}
                onTambah={() => setForm({ nama: '', keterangan: '' })}
                onAturNo={() => setTab('no')}
              />
            )}
            {tab === 'rekap' && rekapId && (
              <LayarRekap
                id={rekapId}
                onTidakAda={tutupRekap}
                pegawai={pegawai}
                uid={uid}
                onKembali={tutupRekap}
                onUbah={(r) => setForm({ id: r.id, nama: r.nama, keterangan: r.keterangan })}
                onBatalkan={(r) => setBatal(r)}
                onAturNo={() => setTab('no')}
              />
            )}
            {layar === 'no' && <TabNoAbsen pegawai={pegawai} uid={uid} onDirty={setDirty} />}
          </div>
        </section>
      </div>

      {form && (
        <ModalRekapAbsensi awal={form} onSimpan={simpanRekap} onTutup={() => setForm(null)} />
      )}
      {batal && (
        <ModalBatalAbsensi
          judul="Batalkan Rekapan"
          labelOk="Batalkan Rekapan"
          onBatalkan={konfirmasiBatal}
          onTutup={() => setBatal(null)}
        >
          <strong className={K.teks}>{batal.nama}</strong> tidak dihapus, tetapi ditandai batal
          beserta semua impornya dan tidak tampil lagi di daftar. Pembatalan tidak bisa diurungkan.
        </ModalBatalAbsensi>
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
          Perubahan pemetaan No. absen yang belum disimpan akan dibuang.
        </ModalKonfirmasi>
      )}
      <ToastViewport />
    </div>
  );
}
