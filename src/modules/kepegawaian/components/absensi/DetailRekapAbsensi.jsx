import { useMemo, useState } from 'react';
import {
  FaArrowLeft,
  FaBan,
  FaExclamationTriangle,
  FaFileImport,
  FaListOl,
  FaPen,
} from 'react-icons/fa';
import { showToast } from '@/utils/toastStore';
import { useImporAbsensi, useKoreksiAbsensi, useNoAbsen } from '../../hooks/useAbsensi';
import { pesanGalat } from '../../services/pegawaiDb';
import { batalkanImporAbsensi } from '../../services/absensiDb';
import {
  formatRentang,
  formatWaktu,
  gabungImpor,
  rekapBulan,
  rentangImpor,
  ringkasGabungan,
} from '../../utils/absensi';
import { K } from '../../ui/kelas';
import ModalBatalAbsensi from './ModalBatalAbsensi';
import ModalImporAbsensi from './ModalImporAbsensi';
import ModalKoreksiJam from './ModalKoreksiJam';
import TabelBulanan from './TabelBulanan';

/**
 * Layar satu rekapan absensi: ringkasan data, rekap bulanan (pilih bulan → tabel tanggal, klik sel
 * untuk menyesuaikan jam, ekspor PDF mendatar/Excel), dan riwayat impor. Semua impor aktif
 * digabung; impor yang salah dibatalkan dengan alasan sehingga pindaiannya tidak dipakai lagi.
 */
export default function DetailRekapAbsensi({
  rekap,
  pegawai,
  uid,
  onKembali,
  onUbah,
  onBatalkan,
  onAturNo,
}) {
  const { impor, memuat } = useImporAbsensi(rekap.id);
  const { noAbsen, siap: noSiap } = useNoAbsen();
  const [bulan, setBulan] = useState('');
  const [modalImpor, setModalImpor] = useState(false);
  const [batalImpor, setBatalImpor] = useState(null);
  const [selDipilih, setSelDipilih] = useState(null); // { kunci, tgl } sel yang disesuaikan

  const pegawaiById = useMemo(() => new Map(pegawai.map((p) => [p.id, p])), [pegawai]);
  const namaPetugas = useMemo(
    () => new Map(pegawai.filter((p) => p.authUid).map((p) => [p.authUid, p.nama])),
    [pegawai],
  );
  const gabungan = useMemo(() => gabungImpor(impor), [impor]);
  const ringkas = useMemo(() => ringkasGabungan(gabungan), [gabungan]);
  const bulanAktif = ringkas.bulan.includes(bulan) ? bulan : ringkas.bulan[0] || '';
  const { koreksi } = useKoreksiAbsensi(rekap.id, bulanAktif);
  const bulanan = useMemo(
    () =>
      bulanAktif
        ? rekapBulan({ gabungan, bulan: bulanAktif, noAbsen, pegawaiById, koreksi })
        : null,
    [gabungan, bulanAktif, noAbsen, pegawaiById, koreksi],
  );
  const barisDipilih = selDipilih && bulanan?.baris.find((r) => r.kunci === selDipilih.kunci);
  const hariDipilih = selDipilih && bulanan?.hari.find((h) => h.tgl === selDipilih.tgl);
  const belumDipetakan = [...gabungan.keys()]
    .filter((no) => !pegawaiById.has(noAbsen[no]?.pegawaiId))
    .sort((a, b) => Number(a) - Number(b));
  const jumlahAktif = impor.filter((x) => x.aktif !== false).length;

  async function konfirmasiBatalImpor(alasan) {
    const sisa = impor.filter((x) => x.aktif !== false && x.id !== batalImpor.id);
    try {
      await batalkanImporAbsensi(
        {
          rekapId: rekap.id,
          imporId: batalImpor.id,
          alasan,
          ringkasan: { jumlahImpor: sisa.length, ...rentangImpor(sisa) },
        },
        uid,
      );
      showToast('Impor dibatalkan; pindaiannya tidak dipakai lagi di rekap.');
      setBatalImpor(null);
    } catch (err) {
      showToast(pesanGalat(err, 'Impor gagal dibatalkan.'), 'error');
      throw err;
    }
  }

  return (
    <>
      <button type="button" onClick={onKembali} className={`${K.tombolKedua} mb-4`}>
        <FaArrowLeft size={12} /> Kembali
      </button>

      <div className={K.kepala}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={K.judulLayar}>{rekap.nama}</h2>
            <button
              type="button"
              onClick={() => onUbah(rekap)}
              title="Ubah rekapan"
              aria-label="Ubah rekapan"
              className={K.tombolIkon}
            >
              <FaPen size={13} />
            </button>
            <button
              type="button"
              onClick={() => onBatalkan(rekap)}
              title="Batalkan rekapan"
              aria-label="Batalkan rekapan"
              className={K.tombolIkonBahaya}
            >
              <FaBan size={13} />
            </button>
          </div>
          {rekap.keterangan && (
            <p className={`text-[12.5px] mt-1 ${K.teks2}`}>{rekap.keterangan}</p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className={`${K.lencana} ${K.lencanaNetral}`}>{jumlahAktif} impor</span>
            <span className={`${K.lencana} ${K.lencanaNetral}`}>{ringkas.jumlah} pindaian</span>
            <span className={`${K.lencana} ${K.lencanaNetral}`}>{gabungan.size} No. mesin</span>
            {ringkas.dari && (
              <span className={`${K.lencana} ${K.lencanaAksen}`}>
                {formatRentang(ringkas.dari, ringkas.sampai)}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setModalImpor(true)}
          disabled={memuat}
          className={K.tombolTambah}
        >
          <FaFileImport size={12} className={K.aksen} /> Impor CSV
        </button>
      </div>

      {belumDipetakan.length > 0 && (
        <div className={`${K.peringatan} flex-wrap justify-between`}>
          <span className="flex gap-2.5 items-start">
            <FaExclamationTriangle className="mt-0.5 shrink-0" />
            <span>
              {belumDipetakan.length} No. mesin belum dipetakan ke pegawai (No.{' '}
              {belumDipetakan.slice(0, 10).join(', ')}
              {belumDipetakan.length > 10 ? ', …' : ''}). Rekap memakai nama dari mesin.
            </span>
          </span>
          <button type="button" onClick={onAturNo} className={K.tombolKecil}>
            <FaListOl className={K.aksen} /> Atur No. Absen
          </button>
        </div>
      )}

      <section className="mb-6">
        <h3 className={K.judulBagian}>Rekap Bulanan</h3>
        {memuat ? (
          <p className={K.kosong}>Memuat data absensi…</p>
        ) : bulanan ? (
          <TabelBulanan
            rekap={rekap}
            bulanan={bulanan}
            daftarBulan={ringkas.bulan}
            onBulan={setBulan}
            onPilihSel={(r, h) => setSelDipilih({ kunci: r.kunci, tgl: h.tgl })}
          />
        ) : (
          <div className={`${K.kotak} text-center`}>
            <p className={`text-[13px] mb-3 ${K.redup}`}>
              Belum ada data. Impor CSV dari mesin absensi untuk mulai merekap.
            </p>
            <button type="button" onClick={() => setModalImpor(true)} className={K.tombolUtama}>
              <FaFileImport size={12} /> Impor CSV
            </button>
          </div>
        )}
      </section>

      <section>
        <h3 className={K.judulBagian}>Riwayat Impor</h3>
        <div className={K.tabelWadah}>
          <table className={`${K.tabel} min-w-[760px]`}>
            <thead>
              <tr>
                <th className={`${K.th} w-12 text-center`}>No</th>
                <th className={K.th}>Berkas</th>
                <th className={K.th}>Rentang Data</th>
                <th className={`${K.th} text-center`}>Pindaian</th>
                <th className={K.th}>Diimpor</th>
                <th className={`${K.th} w-12`} aria-label="Aksi" />
              </tr>
            </thead>
            <tbody>
              {!memuat && impor.length === 0 && (
                <tr>
                  <td colSpan={6} className={K.kosong}>
                    Belum ada impor.
                  </td>
                </tr>
              )}
              {impor.map((x, i) => {
                const batal = x.aktif === false;
                return (
                  <tr key={x.id} className={`${K.tr} ${batal ? 'opacity-60' : ''}`}>
                    <td className={`${K.td} text-center`}>
                      <span className={K.monoRedup}>{i + 1}</span>
                    </td>
                    <td className={`${K.td} max-w-[18rem] break-all`}>
                      <div className={`font-semibold ${K.teks} ${batal ? 'line-through' : ''}`}>
                        {x.namaBerkas}
                      </div>
                      {batal && (
                        <div className={`text-[12px] ${K.redup}`}>Dibatalkan: {x.alasanBatal}</div>
                      )}
                    </td>
                    <td className={`${K.td} whitespace-nowrap`}>
                      {formatRentang(x.dari, x.sampai)}
                    </td>
                    <td className={`${K.td} text-center tabular-nums`}>
                      {x.jumlahPindaian}
                      <div className={`text-[11.5px] ${K.redup}`}>{x.jumlahBaris} baris</div>
                    </td>
                    <td className={K.td}>
                      <div className={K.monoRedup}>{formatWaktu(x.dibuatPada)}</div>
                      <div className={`text-[12px] ${K.redup}`}>
                        {namaPetugas.get(x.dibuatOleh) || 'Petugas'}
                      </div>
                    </td>
                    <td className={K.td}>
                      {!batal && (
                        <button
                          type="button"
                          onClick={() => setBatalImpor(x)}
                          title="Batalkan impor"
                          aria-label={`Batalkan impor ${x.namaBerkas}`}
                          className={K.tombolIkonBahaya}
                        >
                          <FaBan size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {modalImpor && (
        <ModalImporAbsensi
          rekap={rekap}
          daftarImpor={impor}
          gabungan={gabungan}
          noAbsen={noAbsen}
          noSiap={noSiap}
          pegawai={pegawai}
          uid={uid}
          onTutup={() => setModalImpor(false)}
          onSelesai={(b) => {
            setModalImpor(false);
            setBulan(b);
          }}
        />
      )}
      {barisDipilih && hariDipilih && (
        <ModalKoreksiJam
          rekap={rekap}
          baris={barisDipilih}
          hari={hariDipilih}
          bulanan={bulanan}
          namaPetugas={namaPetugas}
          uid={uid}
          onTutup={() => setSelDipilih(null)}
        />
      )}
      {batalImpor && (
        <ModalBatalAbsensi
          judul="Batalkan Impor"
          labelOk="Batalkan Impor"
          onBatalkan={konfirmasiBatalImpor}
          onTutup={() => setBatalImpor(null)}
        >
          <strong className={K.teks}>{batalImpor.namaBerkas}</strong> (
          {formatRentang(batalImpor.dari, batalImpor.sampai)}) tidak dihapus, tetapi ditandai batal
          dan pindaiannya tidak digabung lagi. Pindaian yang juga ada di impor lain tetap terhitung.
          Pembatalan tidak bisa diurungkan.
        </ModalBatalAbsensi>
      )}
    </>
  );
}
