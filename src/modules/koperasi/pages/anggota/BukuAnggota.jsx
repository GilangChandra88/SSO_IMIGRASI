import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { tanggalIso } from '@/utils/nilai';
import { pesanGalat } from '@/utils/pesanGalat';
import { showToast } from '@/utils/toastStore';
import { usePantauBersama } from '@/utils/usePantauBersama';
import { K } from '../../ui/kelas';
import { rupiah, tanggalPendek } from '../../ui/format';
import { statusWajib, useAnggota, usePengaturan } from '../../hooks/useAnggota';
import { useKasBank } from '../../hooks/useKasBank';
import { kueriSimpananAnggota } from '../../services/bukuDb';
import { keluarkanAnggota } from '../../services/fungsi';
import Halaman from '../../components/Halaman';
import ModalForm from '../../components/ModalForm';
import PilihKas from '../../components/PilihKas';
import FormAnggota from '../../components/anggota/FormAnggota';
import FormSetor from '../../components/anggota/FormSetor';
import StatusAnggota from '../../components/anggota/StatusAnggota';

const KEMBALI = { to: '/koperasi/anggota/daftar', label: 'Daftar Anggota' };
const LABEL = {
  pokok: 'Simpanan pokok',
  wajib: 'Simpanan wajib',
  pengambilan: 'Pengambilan (keluar)',
};

function FormKeluar({ a, kas, onTutup }) {
  const [kasId, setKasId] = useState('');
  const [tanggal, setTanggal] = useState(tanggalIso());
  const [keterangan, setKeterangan] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const total = a.saldoPokok + a.saldoWajib;
  const kasDipilih = kas.find((k) => k.id === kasId);
  const simpan = async (e) => {
    e.preventDefault();
    setSibuk(true);
    try {
      await keluarkanAnggota({ anggotaId: a.id, kasId, tanggal, keterangan: keterangan.trim() });
      showToast('Anggota keluar; simpanan dikembalikan.');
      onTutup();
    } catch (err) {
      showToast(pesanGalat(err), 'error');
      setSibuk(false);
    }
  };
  return (
    <ModalForm id="form-keluar" judul="Anggota Keluar" onTutup={onTutup} onSimpan={simpan}>
      <p className={K.teks}>
        Seluruh simpanan {a.nama} dikembalikan: pokok {rupiah(a.saldoPokok)} + wajib{' '}
        {rupiah(a.saldoWajib)} = <strong>{rupiah(total)}</strong>. Anggota tidak mendapat SHU tahun
        berjalan.
      </p>
      {a.piutang > 0 && (
        <p className={K.pesanGalat}>Masih ada bon {rupiah(a.piutang)}. Lunasi dulu.</p>
      )}
      <PilihKas kas={kas} nilai={kasId} onUbah={setKasId} label="Dibayar dari kas" />
      <label>
        <span className={K.label}>Tanggal</span>
        <input
          type="date"
          className={K.masukan}
          max={tanggalIso()}
          value={tanggal}
          onChange={(e) => setTanggal(e.target.value)}
        />
      </label>
      <label>
        <span className={K.label}>Keterangan (boleh kosong)</span>
        <input
          className={K.masukan}
          maxLength={200}
          value={keterangan}
          onChange={(e) => setKeterangan(e.target.value)}
        />
      </label>
      <button
        type="submit"
        className={K.tombolUtama}
        disabled={
          sibuk || !kasId || a.piutang > 0 || total <= 0 || (kasDipilih && total > kasDipilih.saldo)
        }
      >
        {sibuk ? 'Memproses…' : 'Kembalikan simpanan & keluarkan'}
      </button>
    </ModalForm>
  );
}

export default function BukuAnggota() {
  const { id } = useParams();
  const { semua, byId, memuat } = useAnggota();
  const { pengaturan } = usePengaturan();
  const { kas } = useKasBank();
  const riwayat = usePantauBersama(`koperasi_simpanan:${id}`, () => kueriSimpananAnggota(id), {
    pesan: 'Riwayat simpanan gagal dimuat.',
  });
  const [modal, setModal] = useState(null);
  const a = byId[id];

  if (memuat)
    return (
      <Halaman judul="Buku Anggota" kembali={KEMBALI}>
        <p className={K.kosong}>Memuat…</p>
      </Halaman>
    );
  if (!a)
    return (
      <Halaman judul="Buku Anggota" kembali={KEMBALI}>
        <p className={K.kosong}>Anggota tidak ditemukan.</p>
      </Halaman>
    );

  const s = statusWajib(a, pengaturan.nominalWajib);
  const daftar = [...(riwayat.data || [])].sort(
    (x, y) =>
      y.tanggal.localeCompare(x.tanggal) ||
      (y.dibuatPada?.seconds ?? 0) - (x.dibuatPada?.seconds ?? 0),
  );
  const info = [
    ['Nomor', a.nomor],
    ['Jenis', a.jenis === 'pegawai' ? 'Pegawai' : 'Anggota luar'],
    ['Tanggal masuk', a.tanggalMasuk ? tanggalPendek(a.tanggalMasuk) : '-'],
    ...(a.tanggalKeluar ? [['Tanggal keluar', tanggalPendek(a.tanggalKeluar)]] : []),
    ['Simpanan pokok', rupiah(a.saldoPokok)],
    ['Simpanan wajib', rupiah(a.saldoWajib)],
    ['Total simpanan', rupiah(a.saldoPokok + a.saldoWajib)],
    ...(s ? [['Wajib dibayar', `${s.dibayar} dari ${s.seharusnya} bulan`]] : []),
    ['Bon kantin', rupiah(a.piutang)],
    ...(a.catatan ? [['Catatan', a.catatan]] : []),
  ];

  return (
    <Halaman judul={a.nama} kembali={KEMBALI}>
      <StatusAnggota a={a} nominalWajib={pengaturan.nominalWajib} />
      <dl className={`${K.kartu} grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 mt-3`}>
        {info.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className={K.redup}>{k}</dt>
            <dd className={`${K.teks} text-right sm:text-left`}>{v}</dd>
          </div>
        ))}
      </dl>
      {a.status !== 'keluar' && (
        <div className="grid grid-cols-2 gap-2 mt-3 sm:flex">
          <button type="button" className={K.tombolUtama} onClick={() => setModal('setor')}>
            Setor simpanan
          </button>
          <button type="button" className={K.tombolKedua} onClick={() => setModal('ubah')}>
            Ubah data
          </button>
          {a.status === 'aktif' && (
            <button
              type="button"
              className={`${K.tombolKedua} col-span-2`}
              onClick={() => setModal('keluar')}
            >
              Anggota keluar
            </button>
          )}
        </div>
      )}

      <h2 className={`${K.judulSeksi} mt-6 mb-2`}>Riwayat simpanan</h2>
      {a.awalPokok + a.awalWajib > 0 && (
        <p className={`${K.redup} mb-2`}>
          Saldo awal saat pembukuan dimulai: pokok {rupiah(a.awalPokok)}, wajib{' '}
          {rupiah(a.awalWajib)}.
        </p>
      )}
      {riwayat.memuat ? (
        <p className={K.kosong}>Memuat…</p>
      ) : !daftar.length ? (
        <p className={K.kosong}>Belum ada transaksi simpanan.</p>
      ) : (
        <ul className={K.kartuDaftar}>
          {daftar.map((t) => (
            <li key={t.id} className={`${K.barisDaftar} px-4 py-2.5 flex justify-between gap-3`}>
              <span className="min-w-0">
                <span className={`${K.judulBaris} block`}>{LABEL[t.jenis] ?? t.jenis}</span>
                <span className={`${K.redup} block`}>
                  {tanggalPendek(t.tanggal)}
                  {t.keterangan ? ` · ${t.keterangan}` : ''}
                </span>
              </span>
              <span className={K.nominal}>
                {t.jenis === 'pengambilan' ? '−' : '+'}
                {rupiah(t.jumlah)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {modal === 'setor' && (
        <ModalForm id="form-setor-anggota" judul="Setor Simpanan" onTutup={() => setModal(null)}>
          <FormSetor
            tetap={a}
            anggota={semua}
            kas={kas}
            pengaturan={pengaturan}
            onSelesai={() => setModal(null)}
          />
        </ModalForm>
      )}
      {modal === 'ubah' && <FormAnggota data={a} semua={semua} onTutup={() => setModal(null)} />}
      {modal === 'keluar' && <FormKeluar a={a} kas={kas} onTutup={() => setModal(null)} />}
    </Halaman>
  );
}
