import { useEffect, useMemo, useState } from 'react';
import {
  FaArrowLeft,
  FaBan,
  FaCalendarAlt,
  FaCheck,
  FaClock,
  FaMapMarkerAlt,
  FaPen,
  FaSearch,
} from 'react-icons/fa';
import { ANIM } from '@/utils/animasi';
import { JUMLAH, PANJANG } from '@/utils/batas';
import { formatNip } from '@/utils/dataPegawai';
import { showToast } from '@/utils/toastStore';
import { pesanGalat } from '../../services/pegawaiDb';
import { simpanKehadiran } from '../../services/kehadiranDb';
import { STATUS_HADIR, formatTanggal, labelJenis } from '../../utils/kehadiran';
import { K, NADA_LENCANA, SEG_STATUS } from '../../ui/kelas';
import ModalKonfirmasi from './ModalKonfirmasi';

const BAWAAN = Object.freeze({ status: 'hadir', keterangan: '' });

/** Pegawai di layar kehadiran: semua pegawai aktif + yang sudah tercatat (walau kini nonaktif). */
const pesertaKegiatan = (pegawai, tersimpan) =>
  pegawai.filter((p) => p.aktif !== false || tersimpan?.[p.id]);

/**
 * Layar isi / lihat / perbarui kehadiran satu kegiatan (purwarupa: status awal Hadir, ubah yang
 * tidak hadir, lalu Simpan). Perubahan disimpan sebagai satu peta di dokumen kegiatan; rekap
 * dihitung ulang Function. Perubahan yang belum disimpan dilaporkan lewat onDirty supaya halaman
 * meminta konfirmasi sebelum keluar.
 */
export default function IsiKehadiran({
  kegiatan,
  pegawai,
  uid,
  onKembali,
  onUbah,
  onBatalkan,
  onDirty,
  onTersimpan,
}) {
  const tersimpan = kegiatan.kehadiran;
  const peserta = useMemo(() => pesertaKegiatan(pegawai, tersimpan), [pegawai, tersimpan]);
  const awal = useMemo(
    () =>
      Object.fromEntries(
        peserta.map((p) => {
          const x = tersimpan?.[p.id];
          return [p.id, x ? { status: x.status, keterangan: x.keterangan || '' } : BAWAAN];
        }),
      ),
    [peserta, tersimpan],
  );
  const [draf, setDraf] = useState(null); // null = belum ada perubahan
  const [cari, setCari] = useState('');
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [proses, setProses] = useState(false);

  const baris = draf || awal;
  const dirty = draf !== null && JSON.stringify(draf) !== JSON.stringify(awal);

  useEffect(() => {
    onDirty(dirty);
  }, [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  useEffect(() => {
    if (!dirty) return undefined;
    const tahan = (e) => e.preventDefault();
    window.addEventListener('beforeunload', tahan);
    return () => window.removeEventListener('beforeunload', tahan);
  }, [dirty]);

  const ubah = (pid, isi) =>
    setDraf((d) => {
      const dasar = d || awal;
      return { ...dasar, [pid]: { ...(dasar[pid] || BAWAAN), ...isi } };
    });
  const semua = (status) =>
    setDraf((d) =>
      Object.fromEntries(Object.entries(d || awal).map(([pid, x]) => [pid, { ...x, status }])),
    );

  const hitung = useMemo(() => {
    const c = Object.fromEntries(STATUS_HADIR.map((s) => [s.id, 0]));
    Object.values(baris).forEach((x) => {
      if (x.status in c) c[x.status] += 1;
    });
    return c;
  }, [baris]);

  const q = cari.trim().toLowerCase();
  const tampil = peserta
    .map((p, i) => ({ p, no: i + 1 }))
    .filter(({ p }) => !q || `${p.nama} ${p.nip}`.toLowerCase().includes(q));

  async function simpan() {
    // Isi lama yang tidak tampil (mis. pegawai di luar daftar) tetap dipertahankan
    const peta = { ...(tersimpan || {}) };
    Object.entries(baris).forEach(([pid, x]) => {
      peta[pid] = {
        status: x.status,
        keterangan: x.keterangan.trim().slice(0, PANJANG.keteranganHadir),
      };
    });
    if (Object.keys(peta).length > JUMLAH.pesertaKegiatan) {
      setKonfirmasi(false);
      showToast(`Maksimal ${JUMLAH.pesertaKegiatan} pegawai per kegiatan.`, 'error');
      return;
    }
    setProses(true);
    try {
      await simpanKehadiran(kegiatan.id, peta, uid);
      showToast(tersimpan ? 'Kehadiran diperbarui.' : 'Kehadiran tersimpan.');
      setDraf(null);
      setKonfirmasi(false);
      onTersimpan();
    } catch (err) {
      showToast(pesanGalat(err, 'Kehadiran gagal disimpan.'), 'error');
    } finally {
      setProses(false);
    }
  }

  const [nadaPil, labelPil] = tersimpan
    ? dirty
      ? ['info', 'Ada perubahan']
      : ['ok', 'Tersimpan']
    : dirty
      ? ['info', 'Belum disimpan']
      : ['waspada', 'Belum diisi'];
  const petunjuk = tersimpan
    ? dirty
      ? 'Ada perubahan yang belum disimpan. Tekan Perbarui agar tersimpan.'
      : 'Tersimpan. Ubah status bila perlu, lalu tekan Perbarui.'
    : dirty
      ? 'Belum disimpan. Tekan Simpan agar tersimpan dan dihitung di rekap.'
      : 'Belum diisi. Status awal Hadir, ubah yang tidak hadir.';

  return (
    <>
      <button type="button" onClick={onKembali} className={`${K.tombolKedua} mb-4`}>
        <FaArrowLeft size={12} /> Kembali
      </button>

      <div className={K.kepala}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={K.judulLayar}>{kegiatan.nama}</h2>
            <button
              type="button"
              onClick={() => onUbah(kegiatan)}
              title="Ubah kegiatan"
              aria-label="Ubah kegiatan"
              className={K.tombolIkon}
            >
              <FaPen size={13} />
            </button>
            <button
              type="button"
              onClick={() => onBatalkan(kegiatan)}
              title="Batalkan kegiatan"
              aria-label="Batalkan kegiatan"
              className={K.tombolIkonBahaya}
            >
              <FaBan size={13} />
            </button>
          </div>
          <div className={`flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[12.5px] ${K.redup}`}>
            <span className={K.labelAksen}>{labelJenis(kegiatan.jenis)}</span>
            <span className="inline-flex items-center gap-1.5">
              <FaCalendarAlt size={11} /> {formatTanggal(kegiatan.tanggal)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FaClock size={11} /> {kegiatan.jam} WITA
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FaMapMarkerAlt size={11} /> {kegiatan.tempat}
            </span>
          </div>
          {kegiatan.keterangan && (
            <p className={`text-[12.5px] mt-1 ${K.teks2}`}>{kegiatan.keterangan}</p>
          )}
        </div>
        <span className={`${K.lencana} ${NADA_LENCANA[nadaPil]}`}>{labelPil}</span>
      </div>

      <div className={K.toolbar}>
        <label className={K.cari}>
          <FaSearch size={12} />
          <span className="sr-only">Cari pegawai</span>
          <input
            type="search"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari nama atau NIP…"
            className={K.cariInput}
          />
        </label>
        <button type="button" onClick={() => semua('hadir')} className={K.tombolKecil}>
          Semua Hadir
        </button>
        <button type="button" onClick={() => semua('alpa')} className={K.tombolKecil}>
          Semua Alpa
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {STATUS_HADIR.map((s) => (
          <span key={s.id} className={`${K.lencana} ${NADA_LENCANA[s.nada]}`}>
            {s.label} {hitung[s.id]}
          </span>
        ))}
        <span className={`${K.lencana} ${K.lencanaNetral}`}>{peserta.length} pegawai</span>
      </div>

      <ul className={`${K.wadah} divide-y ${K.pembatas}`}>
        {tampil.length === 0 && (
          <li className={K.kosong}>
            {peserta.length ? 'Tidak ada pegawai yang cocok.' : 'Belum ada pegawai aktif.'}
          </li>
        )}
        {tampil.map(({ p, no }) => {
          const x = baris[p.id] || BAWAAN;
          return (
            <li
              key={p.id}
              className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,15rem)] items-center gap-2.5 lg:gap-4 px-4 py-3"
            >
              <div className="flex items-start gap-3 min-w-0">
                <span className={`${K.monoRedup} w-6 shrink-0 text-right`}>{no}</span>
                <div className="min-w-0">
                  <div className={`font-bold text-[13.5px] ${K.teks}`}>{p.nama}</div>
                  <div className={`text-[11.5px] ${K.redup}`}>
                    {p.nip ? formatNip(p.nip) : 'Tanpa NIP'}
                    {p.jabatanNama ? ` · ${p.jabatanNama}` : ''}
                  </div>
                  {(p.aktif === false || (tersimpan && !tersimpan[p.id])) && (
                    <span
                      className={`${K.lencana} ${p.aktif === false ? K.lencanaNetral : K.lencanaInfo} mt-1`}
                    >
                      {p.aktif === false ? 'Nonaktif' : 'Belum tercatat'}
                    </span>
                  )}
                </div>
              </div>
              <div className={SEG_STATUS.wadah} role="group" aria-label={`Status ${p.nama}`}>
                {STATUS_HADIR.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={x.status === s.id}
                    onClick={() => ubah(p.id, { status: s.id })}
                    className={`${SEG_STATUS.tombol} ${x.status === s.id ? NADA_LENCANA[s.nada] : SEG_STATUS.mati}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <input
                aria-label={`Keterangan ${p.nama}`}
                maxLength={PANJANG.keteranganHadir}
                placeholder={x.status === 'hadir' ? 'Keterangan (opsional)' : 'Isi alasan'}
                value={x.keterangan}
                onChange={(e) => ubah(p.id, { keterangan: e.target.value })}
                className={K.masukan}
              />
            </li>
          );
        })}
      </ul>

      <div
        className={`sticky bottom-0 z-10 mt-4 -mx-4 sm:-mx-5 px-4 sm:px-5 py-3 border-t ${K.garis} ${K.permukaan} flex flex-wrap items-center justify-between gap-3`}
      >
        <p key={labelPil} className={`text-[12.5px] ${K.redup} ${ANIM.pudar}`}>
          {petunjuk}
        </p>
        <button
          type="button"
          onClick={() => setKonfirmasi(true)}
          disabled={(tersimpan && !dirty) || !peserta.length}
          className={`${K.tombolUtama} ml-auto`}
        >
          <FaCheck size={12} /> {tersimpan ? 'Perbarui' : 'Simpan'}
        </button>
      </div>

      {konfirmasi && (
        <ModalKonfirmasi
          ikon={<FaCheck size={20} />}
          judul={tersimpan ? 'Perbarui kehadiran?' : 'Simpan kehadiran?'}
          labelOk={tersimpan ? 'Ya, perbarui' : 'Ya, simpan'}
          proses={proses}
          onOk={simpan}
          onBatal={() => setKonfirmasi(false)}
        >
          Kehadiran <strong className={K.teks}>{kegiatan.nama}</strong> akan{' '}
          {tersimpan ? 'diperbarui' : 'disimpan'} dan dihitung di Rekap Kehadiran.
        </ModalKonfirmasi>
      )}
    </>
  );
}
