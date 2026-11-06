import { useEffect, useMemo, useState } from 'react';
import { FaMagic, FaPlus, FaSave, FaSearch, FaUndo } from 'react-icons/fa';
import { ANIM } from '@/utils/animasi';
import { showToast } from '@/utils/toastStore';
import { useNoAbsen } from '../../hooks/useAbsensi';
import { pesanGalat } from '../../services/pegawaiDb';
import { simpanNoAbsen } from '../../services/absensiDb';
import { saranPegawai } from '../../utils/absensi';
import { K } from '../../ui/kelas';
import ModalTambahNoAbsen from './ModalTambahNoAbsen';

const SARINGAN = [
  ['semua', 'Semua'],
  ['belum', 'Belum dipetakan'],
];

/**
 * Pengaturan No. absen: setiap No. mesin (kolom No. di CSV) dipetakan ke satu pegawai, berlaku
 * untuk semua rekapan. No. dari CSV tercatat otomatis saat impor; di sini pemetaannya bisa diubah
 * (ganti pegawai lalu Simpan), dicocokkan otomatis dari nama, atau ditambah manual.
 * Perubahan yang belum disimpan dilaporkan lewat onDirty.
 */
export default function TabNoAbsen({ pegawai, uid, onDirty }) {
  const { noAbsen, memuat, galat, siap } = useNoAbsen();
  const [draf, setDraf] = useState({}); // No. → pegawaiId yang belum disimpan
  const [cari, setCari] = useState('');
  const [saring, setSaring] = useState('semua');
  const [tambah, setTambah] = useState(false);
  const [proses, setProses] = useState(false);

  const pegawaiById = useMemo(() => new Map(pegawai.map((p) => [p.id, p])), [pegawai]);
  const opsiPegawai = useMemo(
    () =>
      pegawai.filter((p) => p.aktif !== false).sort((a, b) => a.nama.localeCompare(b.nama, 'id')),
    [pegawai],
  );

  const baris = useMemo(
    () =>
      Object.values(noAbsen)
        .sort((a, b) => Number(a.id) - Number(b.id))
        .map((x) => {
          const dipilih = x.id in draf ? draf[x.id] : x.pegawaiId;
          return { ...x, dipilih, berubah: dipilih !== x.pegawaiId };
        }),
    [noAbsen, draf],
  );
  const perubahan = baris.filter((r) => r.berubah);
  const dirty = perubahan.length > 0;

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

  const noPegawai = useMemo(() => {
    const peta = {};
    baris.forEach((r) => {
      if (r.dipilih) (peta[r.dipilih] ||= []).push(r.id);
    });
    return peta;
  }, [baris]);
  const tanpaNo = opsiPegawai.filter((p) => !noPegawai[p.id]);
  const jumlahBelum = baris.filter((r) => !pegawaiById.has(r.dipilih)).length;

  const q = cari.trim().toLowerCase();
  const tampil = baris.filter((r) => {
    if (saring === 'belum' && pegawaiById.has(r.dipilih)) return false;
    if (!q) return true;
    const nama = pegawaiById.get(r.dipilih)?.nama || '';
    return `${r.id} ${r.namaMesin} ${nama}`.toLowerCase().includes(q);
  });

  function cocokkan() {
    const isi = {};
    baris.forEach((r) => {
      if (pegawaiById.has(r.dipilih) || !r.namaMesin) return;
      const id = saranPegawai(r.namaMesin, pegawai);
      if (id) isi[r.id] = id;
    });
    const n = Object.keys(isi).length;
    if (!n) {
      showToast('Tidak ada nama mesin yang cocok dengan Data Pegawai.');
      return;
    }
    setDraf((d) => ({ ...d, ...isi }));
    showToast(`${n} No. dicocokkan dari nama. Periksa, lalu tekan Simpan.`);
  }

  async function simpan() {
    setProses(true);
    try {
      await simpanNoAbsen(
        perubahan.map((r) => ({
          no: r.id,
          pegawaiId: r.dipilih,
          namaMesin: r.namaMesin || '',
          baru: false,
        })),
        uid,
      );
      setDraf({});
      showToast(`${perubahan.length} pemetaan No. disimpan.`);
    } catch (err) {
      showToast(pesanGalat(err, 'Pemetaan No. gagal disimpan.'), 'error');
    } finally {
      setProses(false);
    }
  }

  async function simpanTambah(x) {
    try {
      await simpanNoAbsen([x], uid);
      showToast(`No. ${x.no} ditambahkan.`);
      setTambah(false);
    } catch (err) {
      showToast(pesanGalat(err, 'No. gagal ditambahkan.'), 'error');
      throw err;
    }
  }

  return (
    <>
      <p className={`text-[12.5px] leading-[1.6] mb-4 ${K.teks2}`}>
        No. = nomor pegawai di mesin absensi (kolom <b>No.</b> pada CSV). Atur sekali di sini;
        pemetaan berlaku untuk semua rekapan, dan No. baru dari CSV tercatat otomatis saat diimpor.
      </p>

      {galat && (
        <p role="alert" className={K.galat}>
          Pengaturan No. absen gagal dimuat, jadi daftar di bawah mungkin tidak lengkap. Muat ulang
          halaman (F5); bila masih gagal, pastikan rules Firestore terbaru sudah dipasang.
        </p>
      )}

      <div className={K.toolbar}>
        <label className={K.cari}>
          <FaSearch size={12} />
          <span className="sr-only">Cari No. atau nama</span>
          <input
            type="search"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari No. atau nama…"
            className={K.cariInput}
          />
        </label>
        <div className={K.seg} role="tablist" aria-label="Saring No.">
          {SARINGAN.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={saring === id}
              onClick={() => setSaring(id)}
              className={saring === id ? K.segAktif : K.segBtn}
            >
              {label}
              {id === 'belum' && jumlahBelum > 0 ? ` (${jumlahBelum})` : ''}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={cocokkan}
          disabled={!siap || !jumlahBelum || proses}
          className={K.tombolKecil}
        >
          <FaMagic className={K.aksen} /> Cocokkan dari nama
        </button>
        <button
          type="button"
          onClick={() => setTambah(true)}
          disabled={!siap}
          className={`${K.tombolTambah} sm:ml-auto disabled:opacity-45 disabled:cursor-not-allowed`}
        >
          <FaPlus size={11} className={K.aksen} /> Tambah No.
        </button>
      </div>

      {dirty && (
        <div className={`${K.peringatan} flex-wrap justify-between ${ANIM.muncul}`}>
          <span>{perubahan.length} perubahan belum disimpan.</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDraf({})}
              disabled={proses}
              className={K.tombolKecil}
            >
              <FaUndo size={11} /> Urungkan
            </button>
            <button type="button" onClick={simpan} disabled={proses} className={K.tombolUtama}>
              <FaSave size={12} /> {proses ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </div>
      )}

      <div className={K.tabelWadah}>
        <table className={`${K.tabel} min-w-[680px]`}>
          <thead>
            <tr>
              <th className={`${K.th} w-20`}>No.</th>
              <th className={K.th}>Nama di mesin</th>
              <th className={`${K.th} min-w-[260px]`}>Pegawai</th>
              <th className={K.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {!memuat && tampil.length === 0 && (
              <tr>
                <td colSpan={4} className={K.kosong}>
                  {baris.length
                    ? 'Tidak ada No. yang cocok.'
                    : 'Belum ada No. absen. Tekan Tambah No., atau impor CSV di sebuah rekapan.'}
                </td>
              </tr>
            )}
            {tampil.map((r) => {
              const p = pegawaiById.get(r.dipilih);
              const lain = (noPegawai[r.dipilih] || []).filter((n) => n !== r.id);
              return (
                <tr key={r.id} className={K.tr}>
                  <td className={K.td}>
                    <span className={K.mono}>{r.id}</span>
                  </td>
                  <td className={K.td}>{r.namaMesin || <span className={K.redup}>—</span>}</td>
                  <td className={K.td}>
                    <select
                      aria-label={`Pegawai untuk No. ${r.id}`}
                      value={p ? r.dipilih : ''}
                      disabled={proses}
                      onChange={(e) => setDraf((d) => ({ ...d, [r.id]: e.target.value }))}
                      className={`${K.kontrol} w-full`}
                    >
                      <option value="">(belum dipetakan)</option>
                      {p?.aktif === false && <option value={p.id}>{p.nama} (nonaktif)</option>}
                      {opsiPegawai.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.nama}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={K.td}>
                    <div className="flex flex-wrap gap-1">
                      {r.berubah ? (
                        <span className={`${K.lencana} ${K.lencanaInfo}`}>Belum disimpan</span>
                      ) : p ? (
                        <span className={`${K.lencana} ${K.lencanaOk}`}>Terpetakan</span>
                      ) : (
                        <span className={`${K.lencana} ${K.lencanaWaspada}`}>Belum dipetakan</span>
                      )}
                      {p?.aktif === false && (
                        <span className={`${K.lencana} ${K.lencanaNetral}`}>Nonaktif</span>
                      )}
                      {lain.length > 0 && (
                        <span className={`${K.lencana} ${K.lencanaWaspada}`}>
                          Juga No. {lain.join(', ')}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!memuat && tanpaNo.length > 0 && (
        <details className={`mt-3 text-[12.5px] ${K.redup}`}>
          <summary className="cursor-pointer font-semibold">
            {tanpaNo.length} pegawai aktif belum punya No. absen
          </summary>
          <p className="mt-2 leading-[1.7]">{tanpaNo.map((p) => p.nama).join(' · ')}</p>
        </details>
      )}

      {tambah && (
        <ModalTambahNoAbsen
          noAbsen={noAbsen}
          opsiPegawai={opsiPegawai}
          onSimpan={simpanTambah}
          onTutup={() => setTambah(false)}
        />
      )}
    </>
  );
}
