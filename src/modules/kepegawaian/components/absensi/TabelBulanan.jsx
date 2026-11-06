import { useState } from 'react';
import { FaFileExcel, FaFilePdf, FaSearch } from 'react-icons/fa';
import { pdf } from '@react-pdf/renderer';
import { formatNip } from '@/utils/dataPegawai';
import { showToast } from '@/utils/toastStore';
import { simpanBerkas } from '@/utils/xlsx';
import { JEDA_PULANG_MENIT, labelBulan } from '../../utils/absensi';
import { namaBerkasAbsensi, unduhExcelAbsensi } from '../../utils/eksporAbsensi';
import { K, KISI_ABSEN } from '../../ui/kelas';
import PdfAbsensiBulanan from './PdfAbsensiBulanan';

const waktuCetak = () =>
  new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Makassar',
  }).format(new Date());

/** Kelas sel tanggal: dikoreksi (biru) > hanya satu jam (kuning) > Sabtu/Minggu > biasa. */
function kelasSel(x, libur) {
  if (x?.koreksi) return KISI_ABSEN.tdKoreksi;
  if (x && (x.masuk || x.pulang) && !(x.masuk && x.pulang)) return KISI_ABSEN.tdKurang;
  return libur ? KISI_ABSEN.tdLibur : KISI_ABSEN.td;
}

/** Keterangan sel saat disorot: jam mesin, koreksi (bila ada), dan petunjuk klik. */
function judulSel(x, h, labelBulan) {
  const bagian = [`${h.label}, ${h.tgl} ${labelBulan}`];
  bagian.push(x?.semua.length ? `mesin: ${x.semua.join(', ')}` : 'tidak ada pindaian mesin');
  if (x?.koreksi) bagian.push(`dikoreksi: ${x.koreksi.alasan}`);
  bagian.push('klik untuk menyesuaikan jam');
  return bagian.join(' · ');
}

/**
 * Rekap absensi satu bulan di layar: baris pegawai × kolom tanggal (jam masuk di atas, jam pulang
 * di bawah), pilih bulan, cari pegawai, dan ekspor PDF mendatar / Excel. Ekspor selalu memuat
 * semua pegawai (pencarian hanya menyaring tampilan). Klik sel tanggal untuk menyesuaikan jamnya
 * (onPilihSel); sel yang dikoreksi berwarna biru.
 */
export default function TabelBulanan({ rekap, bulanan, daftarBulan, onBulan, onPilihSel }) {
  const [cari, setCari] = useState('');
  const [proses, setProses] = useState('');
  const q = cari.trim().toLowerCase();
  const tampil = bulanan.baris.filter(
    (r) => !q || `${r.nama} ${r.nip} ${r.nos.join(' ')}`.toLowerCase().includes(q),
  );
  const jumlahKoreksi = bulanan.baris.reduce((n, r) => n + r.dikoreksi, 0);

  async function ekspor(jenis) {
    setProses(jenis);
    try {
      if (jenis === 'xlsx') unduhExcelAbsensi(rekap, bulanan);
      else {
        const blob = await pdf(
          <PdfAbsensiBulanan rekap={rekap} bulanan={bulanan} dicetak={`${waktuCetak()} WITA`} />,
        ).toBlob();
        simpanBerkas(blob, `${namaBerkasAbsensi(rekap, bulanan)}.pdf`);
      }
      showToast(`Berkas ${jenis === 'xlsx' ? 'Excel' : 'PDF'} siap.`);
    } catch {
      showToast('Ekspor gagal. Coba lagi.', 'error');
    } finally {
      setProses('');
    }
  }

  return (
    <>
      <div className={K.toolbar}>
        <label className={K.cari}>
          <FaSearch size={12} />
          <span className="sr-only">Cari pegawai</span>
          <input
            type="search"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari nama, NIP, atau No.…"
            className={K.cariInput}
          />
        </label>
        <select
          aria-label="Bulan"
          value={bulanan.bulan}
          onChange={(e) => onBulan(e.target.value)}
          className={K.kontrol}
        >
          {daftarBulan.map((b) => (
            <option key={b} value={b}>
              {labelBulan(b)}
            </option>
          ))}
        </select>
        <div className="flex gap-2 sm:ml-auto">
          <button
            type="button"
            onClick={() => ekspor('xlsx')}
            disabled={!!proses || !bulanan.baris.length}
            className={K.tombolKecil}
          >
            <FaFileExcel className={K.teksOk} /> {proses === 'xlsx' ? 'Menyiapkan…' : 'Excel'}
          </button>
          <button
            type="button"
            onClick={() => ekspor('pdf')}
            disabled={!!proses || !bulanan.baris.length}
            className={K.tombolKecil}
          >
            <FaFilePdf className={K.teksBahaya} />{' '}
            {proses === 'pdf' ? 'Menyiapkan…' : 'PDF (mendatar)'}
          </button>
        </div>
      </div>

      <p className={`text-[12.5px] mb-3 ${K.redup}`}>
        {bulanan.label} · {bulanan.baris.length} pegawai
        {jumlahKoreksi > 0 ? ` · ${jumlahKoreksi} sel dikoreksi` : ''} · klik sel tanggal untuk
        menyesuaikan jam; geser tabel ke samping untuk melihat semua tanggal.
      </p>

      <div className={`${K.tabelWadah} overflow-y-hidden`}>
        <table className={KISI_ABSEN.tabel}>
          <thead>
            <tr>
              <th className={KISI_ABSEN.thPegawai}>Pegawai</th>
              {bulanan.hari.map((h) => (
                <th key={h.tgl} className={h.libur ? KISI_ABSEN.thLibur : KISI_ABSEN.th}>
                  {h.tgl}
                  <span className="block font-semibold opacity-80">{h.label}</span>
                </th>
              ))}
              <th className={KISI_ABSEN.th}>Hadir</th>
              <th className={KISI_ABSEN.th}>
                Tidak
                <span className="block">Lengkap</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {tampil.length === 0 && (
              <tr>
                <td colSpan={bulanan.hari.length + 3} className={K.kosong}>
                  {q ? 'Tidak ada pegawai yang cocok.' : 'Belum ada data pada bulan ini.'}
                </td>
              </tr>
            )}
            {tampil.map((r, i) => (
              <tr key={r.kunci}>
                <td className={KISI_ABSEN.tdPegawai}>
                  <div className="flex items-start gap-2.5">
                    <span className={`${K.monoRedup} w-5 shrink-0 text-right`}>{i + 1}</span>
                    <div className="min-w-0">
                      <div className={`font-bold text-[13px] leading-[1.35] ${K.teks}`}>
                        {r.nama}
                      </div>
                      <div className={`text-[11.5px] ${K.redup}`}>
                        No. {r.nos.join(', ')}
                        {r.nip ? ` · ${formatNip(r.nip)}` : ''}
                      </div>
                      {!r.pegawai && (
                        <span className={`${K.lencana} ${K.lencanaWaspada} mt-1`}>
                          Belum dipetakan
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                {bulanan.hari.map((h) => {
                  const x = r.sel[h.tgl];
                  const ada = !!x && !!(x.masuk || x.pulang);
                  const kelasMasuk = x?.koreksi
                    ? KISI_ABSEN.jamKoreksi
                    : x?.pulang
                      ? KISI_ABSEN.jam
                      : KISI_ABSEN.jamKurang;
                  return (
                    <td key={h.tgl} className={kelasSel(x, h.libur)}>
                      <button
                        type="button"
                        onClick={() => onPilihSel(r, h)}
                        title={judulSel(x, h, bulanan.label)}
                        aria-label={`Sesuaikan jam ${r.nama} tanggal ${h.tgl} ${bulanan.label}`}
                        className={KISI_ABSEN.tombolSel}
                      >
                        {ada && (
                          <>
                            <span className={kelasMasuk}>{x.masuk || '–'}</span>
                            <span
                              className={x.koreksi ? KISI_ABSEN.jamKoreksi : KISI_ABSEN.jamPulang}
                            >
                              {x.pulang || '–'}
                            </span>
                          </>
                        )}
                        {!ada && x?.koreksi && <span className={KISI_ABSEN.jamKoreksi}>–</span>}
                      </button>
                    </td>
                  );
                })}
                <td className={KISI_ABSEN.tdAngka}>{r.hadir}</td>
                <td className={r.tidakLengkap ? KISI_ABSEN.tdAngkaKurang : KISI_ABSEN.tdAngka}>
                  {r.tidakLengkap}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className={`${K.bantuan} leading-[1.6]`}>
        Atas = jam masuk (pindaian pertama), bawah = jam pulang (pindaian terakhir, minimal{' '}
        {JEDA_PULANG_MENIT} menit setelah jam masuk). Sel kuning = hanya satu jam. Sel biru = jam
        disesuaikan manual. Kolom abu-abu = Sabtu/Minggu. Arahkan kursor ke sel untuk melihat semua
        jam pindaian mesin.
      </p>
    </>
  );
}
