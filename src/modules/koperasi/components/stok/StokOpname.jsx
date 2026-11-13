import { useState } from 'react';
import { LIMIT_KUERI, PANJANG } from '@/utils/batas';
import { tanggalIso } from '@/utils/nilai';
import { pesanGalat } from '@/utils/pesanGalat';
import { showToast } from '@/utils/toastStore';
import { K } from '../../ui/kelas';
import { angka, rupiah, tanggalPendek } from '../../ui/format';
import { useDaftarBerhalaman } from '../../hooks/useDaftarBerhalaman';
import { ambilOpname, kueriOpname } from '../../services/bukuDb';
import { simpanStokOpname } from '../../services/fungsi';
import { adalahResep } from '../../utils/barang';
import { BATAS } from '../../data/aturan';

const bertanda = (n) => (n > 0 ? `+${angka(n)}` : angka(n));

function Riwayat() {
  const { daftar, memuat, memuatLagi, adaLagi, muatLagi } = useDaftarBerhalaman(
    'koperasi_kantin_opname',
    () => kueriOpname(),
    ambilOpname,
    LIMIT_KUERI.opnameKantin,
    'Riwayat opname gagal dimuat.',
  );
  if (memuat) return <p className={K.kosong}>Memuat…</p>;
  if (!daftar.length) return <p className={K.kosong}>Belum ada stok opname.</p>;
  return (
    <>
      <ul className="flex flex-col gap-2.5">
        {daftar.map((o) => (
          <li key={o.id} className={`${K.kartu} flex flex-col gap-2`}>
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className={`${K.judulBaris} block`}>{tanggalPendek(o.tanggal)}</span>
                <span className={`${K.redup} block`}>
                  {o.jumlahBarang} barang dihitung · {o.jumlahSelisih} berselisih
                  {o.keterangan ? ` · ${o.keterangan}` : ''}
                </span>
              </span>
              <span className={K.nominal}>{rupiah(o.totalNilai)}</span>
            </div>
            <ul className="flex flex-col gap-0.5">
              {o.items
                .filter((i) => i.selisih)
                .map((i) => (
                  <li key={i.barangId} className={`${K.teks} flex justify-between gap-3`}>
                    <span className="min-w-0 truncate">
                      {i.nama}: {angka(i.sistem)} → {angka(i.fisik)} {i.satuan}
                    </span>
                    <span className="whitespace-nowrap">{bertanda(i.selisih)}</span>
                  </li>
                ))}
            </ul>
          </li>
        ))}
      </ul>
      {adaLagi && (
        <button
          type="button"
          className={`${K.tombolKedua} mt-3`}
          disabled={memuatLagi}
          onClick={muatLagi}
        >
          {memuatLagi ? 'Memuat…' : 'Muat lagi'}
        </button>
      )}
    </>
  );
}

/**
 * Stok opname: isi stok fisik barang yang dihitung (kosong = tidak dihitung). Stok sistem disamakan
 * dan nilai selisihnya dijurnal otomatis.
 */
export default function StokOpname({ barang, kategori, memuat }) {
  const [saringKategori, setSaringKategori] = useState('');
  const [cari, setCari] = useState('');
  const [fisik, setFisik] = useState({});
  const [tanggal, setTanggal] = useState(tanggalIso());
  const [keterangan, setKeterangan] = useState('');
  const [sibuk, setSibuk] = useState(false);

  const daftar = barang.filter((b) => !adalahResep(b) && (b.aktif || b.stok !== 0));
  const petaBarang = new Map(daftar.map((b) => [b.id, b]));
  const kunci = cari.trim().toLowerCase();
  const tampil = daftar.filter(
    (b) =>
      (!saringKategori || b.kategoriId === saringKategori) &&
      (!kunci || b.nama.toLowerCase().includes(kunci)),
  );
  const dihitung = Object.entries(fisik)
    .filter(([id, v]) => v !== '' && petaBarang.has(id))
    .map(([id, v]) => {
      const b = petaBarang.get(id);
      const selisih = Number(v) - b.stok;
      return { b, fisik: Number(v), selisih, nilai: selisih * (b.hargaPokok || 0) };
    });
  const totalNilai = dihitung.reduce((n, x) => n + x.nilai, 0);
  const berselisih = dihitung.filter((x) => x.selisih).length;

  const simpan = async () => {
    setSibuk(true);
    try {
      const hasil = await simpanStokOpname({
        tanggal,
        keterangan: keterangan.trim(),
        items: dihitung.map((x) => ({ barangId: x.b.id, fisik: x.fisik })),
      });
      showToast(
        hasil.totalNilai
          ? `Opname tersimpan. Selisih ${rupiah(hasil.totalNilai)} dijurnal.`
          : 'Opname tersimpan.',
      );
      setFisik({});
      setKeterangan('');
    } catch (err) {
      showToast(pesanGalat(err), 'error');
    } finally {
      setSibuk(false);
    }
  };

  const ringkasan = (
    <span className="flex-1 min-w-0">
      <span className={`${K.judulBaris} block`}>
        {dihitung.length} dihitung · {berselisih} berselisih
      </span>
      <span className={K.redup}>Nilai selisih {rupiah(totalNilai)}</span>
    </span>
  );
  const tombol = (
    <button
      type="button"
      className={K.tombolUtamaPas}
      disabled={sibuk || !dihitung.length || dihitung.length > BATAS.opname || !tanggal}
      onClick={simpan}
    >
      {sibuk ? 'Menyimpan…' : 'Simpan opname'}
    </button>
  );

  return (
    <div className="pb-20 md:pb-0">
      <p className={`${K.redup} mb-3`}>
        Hitung barang di rak, lalu isi jumlahnya dalam satuan dasar. Barang yang dikosongkan tidak
        ikut. Sebaiknya dilakukan saat kasir tidak sedang dipakai.
      </p>
      <div className="grid gap-2 mb-3 sm:grid-cols-2">
        <input
          type="search"
          className={K.masukan}
          placeholder="Cari barang…"
          aria-label="Cari barang"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
        />
        <select
          className={K.masukan}
          aria-label="Saring menurut kategori"
          value={saringKategori}
          onChange={(e) => setSaringKategori(e.target.value)}
        >
          <option value="">Semua kategori</option>
          {kategori.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nama}
            </option>
          ))}
        </select>
      </div>

      {memuat ? (
        <p className={K.kosong}>Memuat…</p>
      ) : !tampil.length ? (
        <p className={K.kosong}>Tidak ada barang.</p>
      ) : (
        <ul className={K.kartuDaftar}>
          {tampil.map((b) => {
            const v = fisik[b.id] ?? '';
            const selisih = v === '' ? null : Number(v) - b.stok;
            return (
              <li key={b.id} className={`${K.barisDaftar} px-4 py-2.5 flex items-center gap-3`}>
                <span className="flex-1 min-w-0">
                  <span className={`${K.judulBaris} block truncate`}>{b.nama}</span>
                  <span className={K.redup}>
                    Sistem {angka(b.stok)} {b.satuan}
                    {selisih ? ` · selisih ${bertanda(selisih)}` : ''}
                  </span>
                </span>
                <span className="w-24 shrink-0">
                  <input
                    className={`${K.masukan} text-right`}
                    inputMode="numeric"
                    aria-label={`Stok fisik ${b.nama}`}
                    placeholder="Fisik"
                    value={v}
                    onChange={(e) =>
                      setFisik((s) => ({ ...s, [b.id]: e.target.value.replace(/[^0-9]/g, '') }))
                    }
                  />
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className={`${K.kartu} grid gap-3 mt-4 sm:grid-cols-2`}>
        <label>
          <span className={K.label}>Tanggal opname</span>
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
            maxLength={PANJANG.keteranganKoperasi}
            placeholder="Mis. Opname akhir bulan"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
          />
        </label>
        {dihitung.length > BATAS.opname && (
          <span className={`${K.pesanGalat} sm:col-span-2`}>
            Paling banyak {BATAS.opname} barang sekali simpan; simpan per kategori.
          </span>
        )}
        <div className="hidden md:flex items-center gap-3 sm:col-span-2">
          {ringkasan}
          {tombol}
        </div>
      </div>
      <div className={`${K.bilahAksi} flex items-center gap-3`}>
        {ringkasan}
        {tombol}
      </div>

      <h2 className={`${K.judulSeksi} mt-6 mb-2`}>Riwayat opname</h2>
      <Riwayat />
    </div>
  );
}
