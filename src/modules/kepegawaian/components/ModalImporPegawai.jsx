import { useMemo, useRef, useState } from 'react';
import { FaCheck, FaDownload, FaFileCsv, FaFileImport, FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { ANIM } from '@/utils/animasi';
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
        <div className={`p-4 sm:p-5 border-b ${K.garis} flex items-start justify-between gap-3`}>
          <div>
            <h2 id="judul-impor" className={K.modalJudul}>
              Impor Data Pegawai dari CSV
            </h2>
            <p className={`text-[12.5px] mt-0.5 leading-[1.5] ${K.redup}`}>
              Dari Excel: File → Simpan Sebagai → <b>CSV UTF-8</b>. Kolom NIP sebaiknya berformat
              Teks agar tidak berubah menjadi angka ilmiah.
            </p>
          </div>
          <button
            type="button"
            onClick={onTutup}
            disabled={menulis}
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
              disabled={menulis}
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
            <button type="button" onClick={unduhTemplat} className={K.tombolKecil}>
              <FaDownload size={11} /> Unduh templat
            </button>
            {berkas && (
              <span className={`text-[12px] break-all ${K.redup}`}>
                {berkas} · {dibaca?.baris.length || 0} baris
              </span>
            )}
          </div>

          {!dibaca && !galat && (
            <div className={`text-[12.5px] leading-[1.6] space-y-1 ${K.redup}`}>
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
            <div className={`space-y-4 ${ANIM.muncul}`}>
              {dibaca.diabaikan.length > 0 && (
                <p className={K.bantuan}>Kolom diabaikan: {dibaca.diabaikan.join(', ')}.</p>
              )}
              {!pangkat.length && (
                <p className={K.peringatan}>
                  Master pangkat masih kosong, jadi golongan belum terhubung ke pangkat. Tutup
                  jendela ini, pakai "Isi pangkat baku" di tab Pangkat, lalu impor lagi.
                </p>
              )}
              {!unit.semua.length && (
                <p className={K.peringatan}>
                  Struktur unit kerja masih kosong, jadi kolom Seksi / Bagian belum bisa dipetakan.
                  Isi dulu di tab Unit Kerja.
                </p>
              )}

              {hasil.unitTakDikenal.length > 0 && unit.semua.length > 0 && (
                <div className={K.kotak}>
                  <h3 className={K.judulBagian}>Petakan unit yang belum dikenali</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {hasil.unitTakDikenal.map((u) => (
                      <label key={u.kunci} className="block text-[13px]">
                        <span className={`font-semibold ${K.teks}`}>"{u.nilai}"</span>{' '}
                        <span className={`text-[11.5px] ${K.redup}`}>({u.jumlah} baris)</span>
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
                              {' '.repeat(x.kedalaman)}
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
                <div className={K.kotak}>
                  <label className="flex items-start gap-2.5 text-[13px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={buatJabatan}
                      onChange={(e) => setBuatJabatan(e.target.checked)}
                      className={K.centang}
                    />
                    <span className={K.teks2}>
                      Tambahkan jabatan yang belum ada ke master jabatan
                      {buatJabatan && ` (${hasil.jabatanBaru.length} jabatan)`}. Jenis ditebak dari
                      nama & eselon; periksa lagi di tab Jabatan.
                    </span>
                  </label>
                  {buatJabatan && hasil.jabatanBaru.length > 0 && (
                    <details className={`mt-2 text-[12px] ${K.redup}`}>
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

              <div className="flex flex-wrap gap-1.5">
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

              <div className={K.seg} role="tablist" aria-label="Saring baris">
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
                  </button>
                ))}
              </div>

              <div key={saring} className={`${K.tabelWadah} ${ANIM.muncul}`}>
                <table className={`${K.tabel} min-w-[860px]`}>
                  <thead>
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
                        <td colSpan={7} className={K.kosong}>
                          Tidak ada baris.
                        </td>
                      </tr>
                    )}
                    {barisTampil.map((b) => {
                      const [labelAksi, warna] = LABEL_AKSI[b.aksi];
                      const u = unit.byId[b.data.unitId];
                      const kontakTampil = b.kontak || {};
                      return (
                        <tr key={b.no} className={K.tr}>
                          <td className={K.td}>
                            <span className={`${K.mono} ${K.redup}`}>{b.no}</span>
                          </td>
                          <td className={K.td}>
                            <div className={`font-semibold ${K.teks}`}>{b.nama || '—'}</div>
                            <div className={K.mono}>{formatNip(b.data.nip) || '—'}</div>
                          </td>
                          <td className={K.td}>
                            <div>{labelStatus(b.data.statusKepegawaian) || '—'}</div>
                            <div className={`text-[12px] ${K.redup}`}>
                              {labelPangkat(b.data.pangkatNama, b.data.golongan) || '—'}
                            </div>
                          </td>
                          <td className={`${K.td} max-w-[14rem]`}>{b.data.jabatanNama || '—'}</td>
                          <td className={`${K.td} max-w-[12rem]`}>
                            {u ? (
                              <>
                                <div>{u.nama}</div>
                                <div className={`text-[12px] ${K.redup}`}>
                                  seksi {labelSeksi(unit.byId, u.id)}
                                </div>
                              </>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className={`${K.td} max-w-[14rem] break-words`}>
                            {kontakTampil.noWa && (
                              <div className={K.mono}>{formatWa(kontakTampil.noWa)}</div>
                            )}
                            {kontakTampil.emailPribadi && <div>{kontakTampil.emailPribadi}</div>}
                            {kontakTampil.alamat && (
                              <div className={`text-[12px] line-clamp-2 ${K.redup}`}>
                                {kontakTampil.alamat}
                              </div>
                            )}
                            {!b.kontak && <span className={K.redup}>tidak berubah</span>}
                          </td>
                          <td className={`${K.td} min-w-[12rem]`}>
                            <span className={`${K.lencana} ${warna}`}>{labelAksi}</span>
                            {b.tolak && (
                              <p className={`mt-1 text-[12px] ${K.teksBahaya}`}>{b.tolak}</p>
                            )}
                            {!b.tolak &&
                              b.catatan.map((c) => (
                                <p key={c} className={`mt-1 text-[12px] ${K.teksWaspada}`}>
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
            </div>
          )}
        </div>

        <div
          className={`p-4 sm:p-5 border-t ${K.garis} flex flex-wrap items-center justify-between gap-3`}
        >
          <div className={`text-[12px] flex-1 min-w-[12rem] ${K.redup}`}>
            {hasilAkhir ? (
              <span className={`font-semibold flex items-center gap-1.5 ${K.teksOk}`}>
                <FaCheck /> Selesai: {hasilAkhir.dibuat} pegawai baru, {hasilAkhir.diperbarui}{' '}
                diperbarui
                {hasilAkhir.jabatan ? `, ${hasilAkhir.jabatan} jabatan baru` : ''}.
              </span>
            ) : kemajuan ? (
              <span className="flex items-center gap-2">
                <progress
                  value={kemajuan.selesai}
                  max={Math.max(1, kemajuan.total)}
                  className={K.progres}
                />
                Menyimpan {kemajuan.selesai}/{kemajuan.total}…
              </span>
            ) : hasil ? (
              `${jumlahTulis} baris akan disimpan; ${ringkas.sama + ringkas.tolak} dilewati.`
            ) : null}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onTutup} disabled={menulis} className={K.tombolKedua}>
              {hasilAkhir ? 'Tutup' : 'Batal'}
            </button>
            {!hasilAkhir && (
              <button
                type="button"
                onClick={impor}
                disabled={!jumlahTulis || menulis}
                className={K.tombolUtama}
              >
                <FaFileImport size={12} />
                {menulis ? 'Mengimpor…' : `Impor ${jumlahTulis} baris`}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
