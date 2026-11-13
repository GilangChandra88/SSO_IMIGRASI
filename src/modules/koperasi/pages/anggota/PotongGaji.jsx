import { useState } from 'react';
import { tanggalIso } from '@/utils/nilai';
import { pesanGalat } from '@/utils/pesanGalat';
import { showToast } from '@/utils/toastStore';
import { K } from '../../ui/kelas';
import { namaPeriode, rupiah } from '../../ui/format';
import { useAnggota, usePengaturan } from '../../hooks/useAnggota';
import { useKasBank } from '../../hooks/useKasBank';
import { setorPotongGaji } from '../../services/fungsi';
import Halaman from '../../components/Halaman';
import PilihKas from '../../components/PilihKas';
import { BATAS } from '../../data/aturan';

const KEMBALI = { to: '/koperasi/anggota', label: 'Anggota & Simpanan' };

/** Simpanan wajib dari potongan gaji: semua anggota pegawai aktif sekaligus, satu jurnal. */
export default function PotongGaji() {
  const { aktif, memuat } = useAnggota();
  const { pengaturan } = usePengaturan();
  const { kas } = useKasBank();
  const [bulan, setBulan] = useState(tanggalIso().slice(0, 7));
  const [kasId, setKasId] = useState('');
  const [tanggal, setTanggal] = useState(tanggalIso());
  const [lewati, setLewati] = useState(() => new Set());
  const [sibuk, setSibuk] = useState(false);

  const calon = aktif.filter((a) => a.potongGajiTerakhir !== bulan);
  const sudah = aktif.filter((a) => a.potongGajiTerakhir === bulan);
  // Bawaan: anggota pegawai tercentang (anggota luar membayar langsung); `lewati` = yang dibalik
  const terpilih = (a) => (a.jenis === 'pegawai') !== lewati.has(a.id);
  const dipilih = calon.filter(terpilih);
  const total = dipilih.length * pengaturan.nominalWajib;

  const alih = (id) =>
    setLewati((s) => {
      const baru = new Set(s);
      if (baru.has(id)) baru.delete(id);
      else baru.add(id);
      return baru;
    });

  const simpan = async () => {
    setSibuk(true);
    try {
      for (let i = 0; i < dipilih.length; i += BATAS.potongGaji) {
        await setorPotongGaji({
          bulan,
          kasId,
          tanggal,
          anggotaIds: dipilih.slice(i, i + BATAS.potongGaji).map((a) => a.id),
        });
      }
      showToast(`Potongan gaji ${namaPeriode(bulan)} tercatat untuk ${dipilih.length} anggota.`);
      setLewati(new Set());
    } catch (err) {
      showToast(pesanGalat(err), 'error');
    } finally {
      setSibuk(false);
    }
  };

  return (
    <Halaman
      judul="Setor Potong Gaji"
      sub={`Simpanan wajib ${rupiah(pengaturan.nominalWajib)} per anggota, dicatat sekaligus untuk satu bulan.`}
      kembali={KEMBALI}
    >
      <div className={`${K.kartu} grid gap-3.5 sm:grid-cols-3 mb-4`}>
        <label>
          <span className={K.label}>Bulan potongan</span>
          <input
            type="month"
            className={K.masukan}
            value={bulan}
            onChange={(e) => setBulan(e.target.value)}
          />
        </label>
        <PilihKas kas={kas} nilai={kasId} onUbah={setKasId} label="Masuk ke kas" />
        <label>
          <span className={K.label}>Tanggal diterima</span>
          <input
            type="date"
            className={K.masukan}
            max={tanggalIso()}
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
          />
        </label>
      </div>

      {memuat ? (
        <p className={K.kosong}>Memuat…</p>
      ) : !calon.length ? (
        <p className={K.kosong}>
          Semua anggota aktif sudah tercatat potongan {namaPeriode(bulan)}.
        </p>
      ) : (
        <ul className={K.kartuDaftar}>
          {calon.map((a) => (
            <li key={a.id} className={K.barisDaftar}>
              <label className={`${K.tombolBaris}`}>
                <input type="checkbox" checked={terpilih(a)} onChange={() => alih(a.id)} />
                <span className="flex-1 min-w-0">
                  <span className={`${K.judulBaris} block truncate`}>{a.nama}</span>
                  <span className={K.redup}>
                    {a.nomor} · {a.jenis === 'pegawai' ? 'Pegawai' : 'Anggota luar'}
                  </span>
                </span>
                <span className={K.nominal}>{rupiah(pengaturan.nominalWajib)}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {sudah.length > 0 && (
        <p className={`${K.redup} mt-2`}>{sudah.length} anggota sudah tercatat untuk bulan ini.</p>
      )}

      <div className={`${K.bilahAksi} flex items-center gap-3`}>
        <span className="flex-1 min-w-0">
          <span className={`${K.judulBaris} block`}>{dipilih.length} anggota</span>
          <span className={K.redup}>{rupiah(total)}</span>
        </span>
        <button
          type="button"
          className={K.tombolUtamaPas}
          disabled={sibuk || !dipilih.length || !kasId || !bulan || !tanggal}
          onClick={simpan}
        >
          {sibuk ? 'Menyimpan…' : 'Simpan'}
        </button>
      </div>
      <div className={`${K.kartu} hidden md:flex items-center gap-3 mt-4`}>
        <span className="flex-1 min-w-0">
          <span className={`${K.judulBaris} block`}>{dipilih.length} anggota dipilih</span>
          <span className={K.redup}>Total {rupiah(total)}</span>
        </span>
        <button
          type="button"
          className={K.tombolUtamaPas}
          disabled={sibuk || !dipilih.length || !kasId || !bulan || !tanggal}
          onClick={simpan}
        >
          {sibuk ? 'Menyimpan…' : 'Simpan potongan'}
        </button>
      </div>
      <div className="h-16 md:hidden" aria-hidden="true" />
    </Halaman>
  );
}
