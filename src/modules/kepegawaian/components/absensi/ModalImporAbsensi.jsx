import { useMemo, useRef, useState } from 'react';
import { FaExclamationTriangle, FaFileCsv, FaFileImport, FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { ANIM } from '@/utils/animasi';
import { JUMLAH, PANJANG } from '@/utils/batas';
import { showToast } from '@/utils/toastStore';
import { pesanGalat } from '../../services/pegawaiDb';
import { simpanImporAbsensi } from '../../services/absensiDb';
import {
  FORMAT_TANGGAL,
  MAKS_BYTE_CSV,
  MAKS_BYTE_IMPOR,
  formatRentang,
  hitungPindaianBaru,
  pindaianSimpan,
  rentangImpor,
  saranPegawai,
  ukuranPindaian,
  uraiAbsensi,
} from '../../utils/absensi';
import { K } from '../../ui/kelas';

const STATUS_NO = {
  tetap: ['Tersimpan', K.lencanaOk],
  saran: ['Saran dari nama', K.lencanaInfo],
  ubah: ['Diubah', K.lencanaInfo],
  kosong: ['Belum dipetakan', K.lencanaWaspada],
};

/** Baca berkas sebagai UTF-8; bila ada karakter rusak (CSV ANSI dari Excel lama), pakai Windows-1252. */
async function bacaTeks(file) {
  const buf = await file.arrayBuffer();
  const utf8 = new TextDecoder('utf-8').decode(buf);
  return utf8.includes('�') ? new TextDecoder('windows-1252').decode(buf) : utf8;
}

/**
 * Impor CSV mesin absensi ke satu rekapan: pilih berkas → pratinjau (baris terbaca/dilewati,
 * rentang tanggal, pindaian baru) → petakan setiap No. ke pegawai → simpan. Pindaian yang sudah
 * ada di rekapan dilewati saat digabung, jadi berkas yang sama aman diimpor ulang. Pilihan
 * pegawai per No. ikut disimpan ke Pengaturan No. Absen (berlaku untuk semua rekapan).
 */
export default function ModalImporAbsensi({
  rekap,
  daftarImpor,
  gabungan,
  noAbsen,
  noSiap,
  pegawai,
  uid,
  onTutup,
  onSelesai,
}) {
  const inputRef = useRef(null);
  const [berkas, setBerkas] = useState(null); // { nama, teks }
  const [format, setFormat] = useState('otomatis');
  const [pilihan, setPilihan] = useState({}); // No. → pegawaiId yang dipilih pengguna
  const [galat, setGalat] = useState('');
  const [proses, setProses] = useState(false);

  const hasil = useMemo(() => (berkas ? uraiAbsensi(berkas.teks, format) : null), [berkas, format]);
  const sah = !!hasil && !hasil.galat;

  const pegawaiById = useMemo(() => new Map(pegawai.map((p) => [p.id, p])), [pegawai]);
  const opsiPegawai = useMemo(
    () =>
      pegawai.filter((p) => p.aktif !== false).sort((a, b) => a.nama.localeCompare(b.nama, 'id')),
    [pegawai],
  );

  const daftarNo = useMemo(() => {
    if (!sah) return [];
    return Object.entries(hasil.pindaian).map(([no, x]) => {
      const tersimpan = noAbsen[no] || null;
      const simpanId = pegawaiById.has(tersimpan?.pegawaiId) ? tersimpan.pegawaiId : '';
      const saran = simpanId ? '' : saranPegawai(x.nama, pegawai);
      const dipilih = no in pilihan ? pilihan[no] : simpanId || saran;
      const status = !dipilih
        ? 'kosong'
        : no in pilihan && pilihan[no] !== simpanId
          ? 'ubah'
          : simpanId
            ? 'tetap'
            : 'saran';
      return { no, nama: x.nama, jumlah: x.waktu.length, tersimpan, dipilih, status };
    });
  }, [sah, hasil, noAbsen, pegawai, pegawaiById, pilihan]);

  // Pegawai yang dipetakan ke lebih dari satu No. (di berkas ini atau di pengaturan) ditandai
  const noPegawai = useMemo(() => {
    const peta = {};
    const diBerkas = new Set(daftarNo.map((r) => r.no));
    Object.values(noAbsen).forEach((x) => {
      if (x.pegawaiId && !diBerkas.has(x.id)) (peta[x.pegawaiId] ||= []).push(x.id);
    });
    daftarNo.forEach((r) => {
      if (r.dipilih) (peta[r.dipilih] ||= []).push(r.no);
    });
    return peta;
  }, [daftarNo, noAbsen]);

  const perubahanNo = daftarNo
    .filter(
      (r) =>
        !r.tersimpan ||
        r.tersimpan.pegawaiId !== r.dipilih ||
        (r.nama && r.tersimpan.namaMesin !== r.nama),
    )
    .map((r) => ({
      no: r.no,
      pegawaiId: r.dipilih,
      namaMesin: r.nama || r.tersimpan?.namaMesin || '',
      baru: !r.tersimpan,
    }));
  const jumlahBaru = sah ? hitungPindaianBaru(hasil.pindaian, gabungan) : 0;
  const belumDipetakan = daftarNo.filter((r) => !r.dipilih).length;

  async function pilihBerkas(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setGalat('');
    if (file.size > MAKS_BYTE_CSV) return setGalat('Berkas lebih dari 5 MB. Ekspor per bulan.');
    try {
      setBerkas({ nama: file.name, teks: await bacaTeks(file) });
      setFormat('otomatis');
      setPilihan({});
    } catch {
      setGalat('Berkas tidak bisa dibaca. Pastikan berformat CSV.');
    }
  }

  async function jalankan() {
    setGalat('');
    const pindaian = pindaianSimpan(hasil.pindaian);
    if (ukuranPindaian(pindaian) > MAKS_BYTE_IMPOR) {
      setGalat(
        'Isi berkas terlalu besar untuk satu kali impor. Ekspor ulang dari mesin per bulan, lalu impor satu per satu ke rekapan ini.',
      );
      return;
    }
    if (daftarImpor.length >= JUMLAH.imporAbsensi) {
      setGalat(`Rekapan ini sudah berisi ${JUMLAH.imporAbsensi} impor. Buat rekapan baru.`);
      return;
    }
    const aktif = daftarImpor.filter((x) => x.aktif !== false);
    setProses(true);
    try {
      await simpanImporAbsensi(
        {
          rekapId: rekap.id,
          impor: {
            namaBerkas: berkas.nama.slice(0, PANJANG.namaBerkas),
            jumlahBaris: hasil.jumlahBaris,
            jumlahPindaian: hasil.jumlahPindaian,
            dari: hasil.dari,
            sampai: hasil.sampai,
            pindaian,
          },
          ringkasan: { jumlahImpor: aktif.length + 1, ...rentangImpor([...aktif, hasil]) },
          noAbsen: perubahanNo,
        },
        uid,
      );
      showToast(`Impor selesai: ${jumlahBaru} pindaian baru digabung ke rekapan.`);
      onSelesai(hasil.sampai.slice(0, 7));
    } catch (err) {
      setProses(false);
      setGalat(
        err?.code === 'permission-denied'
          ? 'Impor ditolak server. Muat ulang halaman (F5) lalu impor lagi; bila masih ditolak, pastikan rules Firestore terbaru sudah dipasang.'
          : pesanGalat(err, 'Impor gagal disimpan.'),
      );
    }
  }

  return (
    <Modal
      onClose={proses ? () => {} : onTutup}
      labelledBy="judul-impor-absensi"
      widthClass="max-w-[960px]"
      lembar
      tinggiTetap
    >
      <div className="flex flex-col max-h-[88vh]">
        <div className={`p-4 sm:p-5 border-b ${K.garis} flex items-start justify-between gap-3`}>
          <div>
            <h2 id="judul-impor-absensi" className={K.modalJudul}>
              Impor CSV Mesin Absensi
            </h2>
            <p className={`text-[12.5px] mt-0.5 leading-[1.5] ${K.redup}`}>
              Ke rekapan <b className={K.teks2}>{rekap.nama}</b>. Kolom: Nama;No.;Date/Time (satu
              baris per pindaian).
            </p>
          </div>
          <button
            type="button"
            onClick={onTutup}
            disabled={proses}
            aria-label="Tutup"
            className={K.modalTutup}
          >
            <FaTimes />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={proses}
              className={K.tombolTambah}
            >
              <FaFileCsv className={K.aksen} /> {berkas ? 'Pilih berkas lain' : 'Pilih berkas CSV'}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={pilihBerkas}
              className="sr-only"
              tabIndex={-1}
            />
            {berkas && <span className={`text-[12px] break-all ${K.redup}`}>{berkas.nama}</span>}
          </div>

          {!berkas && !galat && (
            <div className={`text-[12.5px] leading-[1.6] space-y-1 ${K.redup}`}>
              <p>
                Contoh isi: <span className={K.mono}>Budi Contoh;2;01/10/2026 07:37:26</span>. Boleh
                mengimpor beberapa berkas ke rekapan yang sama (mis. per minggu atau dari beberapa
                mesin); semuanya digabung dan pindaian yang sudah ada dilewati.
              </p>
              <p>
                No. = nomor pegawai di mesin. Setiap No. dipetakan ke pegawai di langkah berikutnya;
                pemetaan disimpan dan dipakai lagi untuk impor berikutnya.
              </p>
            </div>
          )}

          {sah && !noSiap && (
            <p role="alert" className={K.peringatan}>
              <FaExclamationTriangle className="mt-0.5 shrink-0" />
              <span>
                Pengaturan No. absen belum termuat, jadi impor ditahan supaya No. yang sudah
                tercatat tidak dianggap baru. Tunggu sebentar; bila pesan ini tidak hilang, muat
                ulang halaman (F5).
              </span>
            </p>
          )}

          {(galat || hasil?.galat) && (
            <p role="alert" className={K.galat}>
              <FaExclamationTriangle className="mt-0.5 shrink-0" />
              <span>{galat || hasil.galat}</span>
            </p>
          )}

          {sah && (
            <div className={`space-y-4 ${ANIM.muncul}`}>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label htmlFor="ab-format" className={K.label}>
                    Format tanggal di berkas
                  </label>
                  <select
                    id="ab-format"
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className={K.kontrol}
                  >
                    {FORMAT_TANGGAL.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.id === 'otomatis'
                          ? `Otomatis (${hasil.format === 'dmy' ? 'DD/MM/YYYY' : 'MM/DD/YYYY'})`
                          : f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <p className={`text-[12.5px] pb-1.5 ${K.teks2}`}>
                  Rentang data: <b>{formatRentang(hasil.dari, hasil.sampai)}</b>
                </p>
              </div>

              {!hasil.formatPasti && (
                <p className={K.peringatan}>
                  <FaExclamationTriangle className="mt-0.5 shrink-0" />
                  <span>
                    Urutan hari/bulan tidak bisa dipastikan dari isi berkas, jadi dianggap
                    DD/MM/YYYY. Periksa rentang data di atas; ganti format bila keliru.
                  </span>
                </p>
              )}

              <div className="flex flex-wrap gap-1.5">
                <span className={`${K.lencana} ${K.lencanaNetral}`}>
                  {hasil.jumlahBaris} baris terbaca
                </span>
                <span className={`${K.lencana} ${K.lencanaNetral}`}>
                  {daftarNo.length} No. mesin
                </span>
                <span className={`${K.lencana} ${K.lencanaOk}`}>{jumlahBaru} pindaian baru</span>
                {hasil.jumlahPindaian - jumlahBaru > 0 && (
                  <span className={`${K.lencana} ${K.lencanaInfo}`}>
                    {hasil.jumlahPindaian - jumlahBaru} sudah ada di rekapan
                  </span>
                )}
                {hasil.salah.length > 0 && (
                  <span className={`${K.lencana} ${K.lencanaBahaya}`}>
                    {hasil.salah.length} baris dilewati
                  </span>
                )}
              </div>

              {hasil.salah.length > 0 && (
                <details className={`text-[12px] ${K.redup}`}>
                  <summary className="cursor-pointer font-semibold">
                    Lihat baris yang dilewati
                  </summary>
                  <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                    {hasil.salah.slice(0, 100).map((s) => (
                      <li key={s.baris}>
                        Baris {s.baris}: {s.alasan}
                      </li>
                    ))}
                    {hasil.salah.length > 100 && <li>… dan {hasil.salah.length - 100} lagi</li>}
                  </ul>
                </details>
              )}

              {jumlahBaru === 0 && (
                <p className={K.peringatan}>
                  <FaExclamationTriangle className="mt-0.5 shrink-0" />
                  <span>
                    Semua pindaian di berkas ini sudah ada di rekapan, jadi tidak ada yang perlu
                    diimpor. Pemetaan No. bisa diubah di tab Pengaturan No. Absen.
                  </span>
                </p>
              )}

              <div>
                <h3 className={K.judulBagian}>Pemetaan No. ke pegawai</h3>
                <p className={`text-xs mb-3 ${K.redup}`}>
                  Pilihan disimpan ke Pengaturan No. Absen dan berlaku untuk semua rekapan. No. yang
                  belum dipetakan tetap direkap dengan nama dari mesin.
                </p>
                <div className={K.tabelWadah}>
                  <table className={`${K.tabel} min-w-[700px]`}>
                    <thead>
                      <tr>
                        <th className={`${K.th} w-16`}>No.</th>
                        <th className={K.th}>Nama di mesin</th>
                        <th className={`${K.th} text-center`}>Pindaian</th>
                        <th className={`${K.th} min-w-[240px]`}>Pegawai</th>
                        <th className={K.th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daftarNo.map((r) => {
                        const [label, warna] = STATUS_NO[r.status];
                        const p = pegawaiById.get(r.dipilih);
                        const lain = (noPegawai[r.dipilih] || []).filter((n) => n !== r.no);
                        return (
                          <tr key={r.no} className={K.tr}>
                            <td className={K.td}>
                              <span className={K.mono}>{r.no}</span>
                            </td>
                            <td className={K.td}>{r.nama || <span className={K.redup}>—</span>}</td>
                            <td className={`${K.td} text-center tabular-nums`}>{r.jumlah}</td>
                            <td className={K.td}>
                              <select
                                aria-label={`Pegawai untuk No. ${r.no}`}
                                value={r.dipilih}
                                disabled={proses}
                                onChange={(e) =>
                                  setPilihan((x) => ({ ...x, [r.no]: e.target.value }))
                                }
                                className={`${K.kontrol} w-full`}
                              >
                                <option value="">(belum dipetakan)</option>
                                {p?.aktif === false && (
                                  <option value={p.id}>{p.nama} (nonaktif)</option>
                                )}
                                {opsiPegawai.map((o) => (
                                  <option key={o.id} value={o.id}>
                                    {o.nama}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className={K.td}>
                              <span className={`${K.lencana} ${warna}`}>{label}</span>
                              {lain.length > 0 && (
                                <span className={`${K.lencana} ${K.lencanaWaspada} ml-1`}>
                                  Juga No. {lain.join(', ')}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div
          className={`p-4 sm:p-5 border-t ${K.garis} flex flex-wrap items-center justify-between gap-3`}
        >
          <div className={`text-[12px] flex-1 min-w-[12rem] ${K.redup}`}>
            {sah &&
              `${jumlahBaru} pindaian baru akan digabung${
                belumDipetakan ? `; ${belumDipetakan} No. belum dipetakan` : ''
              }.`}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onTutup} disabled={proses} className={K.tombolKedua}>
              Batal
            </button>
            <button
              type="button"
              onClick={jalankan}
              disabled={!sah || !noSiap || !jumlahBaru || proses}
              className={K.tombolUtama}
            >
              <FaFileImport size={12} />
              {proses ? 'Mengimpor…' : 'Impor'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
