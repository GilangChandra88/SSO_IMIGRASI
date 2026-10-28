import { useMemo, useRef, useState } from 'react';
import { FaCheck, FaDownload, FaFileCsv, FaFileImport, FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { showToast } from '@/utils/toastStore';
import { formatNip, formatWa, labelPangkat, labelStatus } from '@/utils/dataPegawai';
import { labelSeksi } from '@/utils/unitKerja';
import { bacaBaris, nilaiImpor, templatCsv, uraiCsv } from '../utils/imporPegawai';
import { jalankanImpor } from '../services/imporDb';
import { pesanGalat } from '../services/pegawaiDb';
import { K } from '../ui/kelas';

const MAKS_BYTE = 2 * 1024 * 1024;
const LABEL_AKSI = {
  baru: ['Baru', K.lencanaInfo],
  perbarui: ['Diperbarui', K.lencanaOk],
  sama: ['Tidak berubah', K.lencanaNetral],
  tolak: ['Ditolak', K.lencanaBahaya],
};
const SARINGAN = [
  ['semua', 'Semua'],
  ['tulis', 'Akan disimpan'],
  ['cek', 'Perlu dicek'],
  ['tolak', 'Ditolak'],
];

/** Baca berkas sebagai UTF-8; bila ada karakter rusak (CSV ANSI dari Excel lama), pakai Windows-1252. */
async function bacaTeks(file) {
  const buf = await file.arrayBuffer();
  const utf8 = new TextDecoder('utf-8').decode(buf);
  return utf8.includes('�') ? new TextDecoder('windows-1252').decode(buf) : utf8;
}

function unduhTemplat() {
  const url = URL.createObjectURL(new Blob([templatCsv()], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'templat-data-pegawai.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Impor data pegawai dari CSV: pilih berkas → pratinjau (status per baris, pemetaan unit yang
 * tidak dikenali, jabatan baru) → impor bertahap. Baris yang ditolak dan yang tidak berubah
 * dilewati; nilai kosong di CSV tidak menimpa data yang sudah ada.
 */
export default function ModalImporPegawai({
  pegawai,
  kontak,
  pangkat,
  jabatan,
  unit,
  uid,
  superAdmin,
  onTutup,
}) {
  const inputRef = useRef(null);
  const [berkas, setBerkas] = useState('');
  const [dibaca, setDibaca] = useState(null);
  const [galat, setGalat] = useState('');
  const [petaUnit, setPetaUnit] = useState({});
  const [buatJabatan, setBuatJabatan] = useState(true);
  const [saring, setSaring] = useState('semua');
  const [kemajuan, setKemajuan] = useState(null); // { selesai, total } saat menulis
  const [hasilAkhir, setHasilAkhir] = useState(null);

  const hasil = useMemo(
    () =>
      dibaca && !dibaca.galat
        ? nilaiImpor(
            dibaca.baris,
            {
              pegawai,
              kontak,
              pangkat,
              jabatan,
              units: unit.semua,
              unitById: unit.byId,
              superAdmin,
            },
            { petaUnit, buatJabatan },
          )
        : null,
    [
      dibaca,
      pegawai,
      kontak,
      pangkat,
      jabatan,
      unit.semua,
      unit.byId,
      superAdmin,
      petaUnit,
      buatJabatan,
    ],
  );

  const ringkas = useMemo(() => {
    const r = { baru: 0, perbarui: 0, sama: 0, tolak: 0, cek: 0 };
    hasil?.baris.forEach((b) => {
      r[b.aksi] += 1;
      if (b.aksi !== 'tolak' && b.catatan.length) r.cek += 1;
    });
    return r;
  }, [hasil]);
  const jumlahTulis = ringkas.baru + ringkas.perbarui;
  const menulis = !!kemajuan && !hasilAkhir;

  async function pilihBerkas(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setGalat('');
    setHasilAkhir(null);
    if (file.size > MAKS_BYTE) return setGalat('Berkas lebih dari 2 MB.');
    try {
      const b = bacaBaris(uraiCsv(await bacaTeks(file)));
      if (b.galat) return setGalat(b.galat);
      if (!b.baris.length) return setGalat('Berkas tidak berisi baris data.');
      setBerkas(file.name);
      setDibaca(b);
      setPetaUnit({});
      setSaring('semua');
    } catch {
      setGalat('Berkas tidak bisa dibaca. Pastikan berformat CSV.');
    }
  }

  async function impor() {
    setGalat('');
    setKemajuan({ selesai: 0, total: jumlahTulis });
    try {
      const r = await jalankanImpor(
        { baris: hasil.baris, jabatanBaru: buatJabatan ? hasil.jabatanBaru : [] },
        uid,
        (selesai, total) => setKemajuan({ selesai, total }),
      );
      setHasilAkhir(r);
      showToast(`Impor selesai: ${r.dibuat} pegawai baru, ${r.diperbarui} diperbarui.`);
    } catch (err) {
      setKemajuan(null);
      setGalat(
        `${pesanGalat(err, 'Impor gagal.')} Bagian yang sudah tersimpan tetap ada; impor ulang aman (baris yang sudah sama dilewati).`,
      );
    }
  }

  const barisTampil = (hasil?.baris || []).filter((b) =>
    saring === 'tulis'
      ? b.aksi === 'baru' || b.aksi === 'perbarui'
      : saring === 'cek'
        ? b.aksi !== 'tolak' && b.catatan.length
        : saring === 'tolak'
          ? b.aksi === 'tolak'
          : true,
  );

  return (
    <Modal
      onClose={menulis ? () => {} : onTutup}
      labelledBy="judul-impor"
      widthClass="max-w-[1100px]"
      lembar
      tinggiTetap
    >
      <div className="flex flex-col max-h-[88vh]">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 flex items-start justify-between gap-3">
          <div>
            <h2 id="judul-impor" className="font-bold text-lg text-slate-800 dark:text-slate-100">
              Impor Data Pegawai dari CSV
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Dari Excel: File → Simpan Sebagai → <b>CSV UTF-8</b>. Kolom NIP sebaiknya berformat
              Teks agar tidak berubah menjadi angka ilmiah.
            </p>
          </div>
          <button
            type="button"
            onClick={onTutup}
            disabled={menulis}
            aria-label="Tutup"
            className={K.tombolIkon}
          >
            <FaTimes />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={menulis}
              className={K.tombolUtama}
            >
              <FaFileCsv /> {berkas ? 'Pilih berkas lain' : 'Pilih berkas CSV'}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={pilihBerkas}
              className="sr-only"
              tabIndex={-1}
            />
            <button type="button" onClick={unduhTemplat} className={K.tombolKedua}>
              <FaDownload /> Unduh templat
            </button>
            {berkas && (
              <span className="text-xs text-slate-500 dark:text-slate-400 break-all">
                {berkas} · {dibaca?.baris.length || 0} baris
              </span>
            )}
          </div>

          {!dibaca && !galat && (
            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <p>
                Kolom yang dikenali: NIP, Nama, Tgl Lahir, Alamat, Email Pribadi, No. WA, Status,
                Pangkat, Gol, Jabatan, Seksi / Bagian, Eselon. Urutan bebas; kolom lain diabaikan.
              </p>
              <p>
                Pegawai dicocokkan lewat NIP (atau nama bila NIP kosong): yang sudah ada diperbarui,
                yang belum ada ditambahkan. Sel kosong tidak menghapus data yang sudah ada.
              </p>
            </div>
          )}

          {galat && (
            <p role="alert" className={K.galat}>
              {galat}
            </p>
          )}

          {hasil && (
            <>
              {dibaca.diabaikan.length > 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Kolom diabaikan: {dibaca.diabaikan.join(', ')}.
                </p>
              )}
              {!pangkat.length && (
                <p className={K.peringatan}>
                  Master Pangkat masih kosong, jadi golongan belum terhubung ke pangkat. Tutup
                  jendela ini, pakai "Isi pangkat baku" di tab Master Pangkat, lalu impor lagi.
                </p>
              )}
              {!unit.semua.length && (
                <p className={K.peringatan}>
                  Struktur unit kerja masih kosong, jadi kolom Seksi / Bagian belum bisa dipetakan.
                  Isi dulu di tab Unit Kerja.
                </p>
              )}

              {hasil.unitTakDikenal.length > 0 && unit.semua.length > 0 && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 sm:p-4">
                  <h3 className={K.judulBagian}>Petakan unit yang belum dikenali</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {hasil.unitTakDikenal.map((u) => (
                      <label key={u.kunci} className="block text-sm">
                        <span className="text-slate-700 dark:text-slate-200 font-semibold">
                          "{u.nilai}"
                        </span>{' '}
                        <span className="text-xs text-slate-400">({u.jumlah} baris)</span>
                        <select
                          value={petaUnit[u.kunci] || ''}
                          onChange={(e) =>
                            setPetaUnit((p) => ({ ...p, [u.kunci]: e.target.value }))
                          }
                          className={`${K.masukan} mt-1`}
                        >
                          <option value="">(biarkan kosong)</option>
                          {unit.aktif.map((x) => (
                            <option key={x.id} value={x.id}>
                              {'\u2003'.repeat(x.kedalaman)}
                              {x.nama}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {hasil.jabatanBaru.length > 0 || !buatJabatan ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 sm:p-4">
                  <label className="flex items-start gap-2.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={buatJabatan}
                      onChange={(e) => setBuatJabatan(e.target.checked)}
                      className="mt-1 accent-indigo-600"
                    />
                    <span className="text-slate-700 dark:text-slate-200">
                      Tambahkan jabatan yang belum ada ke Master Jabatan
                      {buatJabatan && ` (${hasil.jabatanBaru.length} jabatan)`}. Jenis ditebak dari
                      nama & eselon; periksa lagi di tab Master Jabatan.
                    </span>
                  </label>
                  {buatJabatan && hasil.jabatanBaru.length > 0 && (
                    <details className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      <summary className="cursor-pointer font-semibold">Lihat daftar</summary>
                      <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                        {hasil.jabatanBaru.map((j) => (
                          <li key={j.kunci}>
                            {j.nama} · {j.jenis}
                            {j.eselon && ` · eselon ${j.eselon}`} · {j.jumlah} pegawai
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-1.5 text-xs">
                <span className={`${K.lencana} ${K.lencanaInfo}`}>{ringkas.baru} baru</span>
                <span className={`${K.lencana} ${K.lencanaOk}`}>{ringkas.perbarui} diperbarui</span>
                <span className={`${K.lencana} ${K.lencanaNetral}`}>
                  {ringkas.sama} tidak berubah
                </span>
                <span className={`${K.lencana} ${K.lencanaWaspada}`}>
                  {ringkas.cek} perlu dicek
                </span>
                <span className={`${K.lencana} ${K.lencanaBahaya}`}>{ringkas.tolak} ditolak</span>
              </div>

              <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
                {SARINGAN.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSaring(id)}
                    className={`px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap ${
                      saring === id
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                        : 'border-transparent text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-xs border-collapse min-w-[860px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/60">
                    <tr>
                      {[
                        'Baris',
                        'Nama / NIP',
                        'Status / Pangkat',
                        'Jabatan',
                        'Unit (seksi)',
                        'Kontak',
                        'Hasil',
                      ].map((j) => (
                        <th key={j} className={K.th}>
                          {j}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {barisTampil.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400">
                          Tidak ada baris.
                        </td>
                      </tr>
                    )}
                    {barisTampil.map((b) => {
                      const [labelAksi, warna] = LABEL_AKSI[b.aksi];
                      const u = unit.byId[b.data.unitId];
                      const kontakTampil = b.kontak || {};
                      return (
                        <tr key={b.no} className="border-t border-slate-100 dark:border-slate-800">
                          <td className={`${K.td} text-slate-400 font-mono`}>{b.no}</td>
                          <td className={K.td}>
                            <div className="font-semibold text-slate-800 dark:text-slate-100">
                              {b.nama || '—'}
                            </div>
                            <div className="font-mono text-slate-500">
                              {formatNip(b.data.nip) || '—'}
                            </div>
                          </td>
                          <td className={K.td}>
                            <div>{labelStatus(b.data.statusKepegawaian) || '—'}</div>
                            <div className="text-slate-500">
                              {labelPangkat(b.data.pangkatNama, b.data.golongan) || '—'}
                            </div>
                          </td>
                          <td className={`${K.td} max-w-[14rem]`}>{b.data.jabatanNama || '—'}</td>
                          <td className={`${K.td} max-w-[12rem]`}>
                            {u ? (
                              <>
                                <div>{u.nama}</div>
                                <div className="text-slate-500">
                                  seksi {labelSeksi(unit.byId, u.id)}
                                </div>
                              </>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className={`${K.td} max-w-[14rem] break-words`}>
                            {kontakTampil.noWa && (
                              <div className="font-mono">{formatWa(kontakTampil.noWa)}</div>
                            )}
                            {kontakTampil.emailPribadi && <div>{kontakTampil.emailPribadi}</div>}
                            {kontakTampil.alamat && (
                              <div className="text-slate-500 line-clamp-2">
                                {kontakTampil.alamat}
                              </div>
                            )}
                            {!b.kontak && <span className="text-slate-400">tidak berubah</span>}
                          </td>
                          <td className={`${K.td} min-w-[12rem]`}>
                            <span className={`${K.lencana} ${warna}`}>{labelAksi}</span>
                            {b.tolak && (
                              <p className="mt-1 text-rose-600 dark:text-rose-300">{b.tolak}</p>
                            )}
                            {!b.tolak &&
                              b.catatan.map((c) => (
                                <p key={c} className="mt-1 text-amber-700 dark:text-amber-300">
                                  {c}
                                </p>
                              ))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex-1 min-w-[12rem]">
            {hasilAkhir ? (
              <span className="text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1.5">
                <FaCheck /> Selesai: {hasilAkhir.dibuat} pegawai baru, {hasilAkhir.diperbarui}{' '}
                diperbarui
                {hasilAkhir.jabatan ? `, ${hasilAkhir.jabatan} jabatan baru` : ''}.
              </span>
            ) : kemajuan ? (
              <span className="flex items-center gap-2">
                <progress
                  value={kemajuan.selesai}
                  max={Math.max(1, kemajuan.total)}
                  className="w-40 h-2 accent-indigo-600"
                />
                Menyimpan {kemajuan.selesai}/{kemajuan.total}…
              </span>
            ) : hasil ? (
              `${jumlahTulis} baris akan disimpan; ${ringkas.sama + ringkas.tolak} dilewati.`
            ) : null}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onTutup} disabled={menulis} className={K.tombolBatal}>
              {hasilAkhir ? 'Tutup' : 'Batal'}
            </button>
            {!hasilAkhir && (
              <button
                type="button"
                onClick={impor}
                disabled={!jumlahTulis || menulis}
                className={K.tombolUtama}
              >
                <FaFileImport /> {menulis ? 'Mengimpor…' : `Impor ${jumlahTulis} baris`}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
