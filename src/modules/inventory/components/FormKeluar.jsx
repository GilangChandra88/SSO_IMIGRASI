import { useMemo, useState } from 'react';
import { STATUS, T } from '@/utils/uiTokens';
import { hapusBaris } from '@/utils/animasi';
import { SEKSI } from '@/data/seksi';
import { K } from '../ui/kelas';
import { useInventori } from '../hooks/useInventori';
import { pesanGalat } from '@/utils/pesanGalat';
import { catatKeluar, ubahTransaksi } from '../services/inventoryDb';
import { formatSisa, hariIni, opsiBarang, statusStok, tanggalLewat } from '../utils/stokLogic';
import { PilihCari, PilihTanggal } from './Pilihan';
import StatusBadge from './StatusBadge';
import TabelItem from './TabelItem';

let kunciBaris = 0;
const barisBaru = (barangId = '', jumlah = '') => ({ kunci: ++kunciBaris, barangId, jumlah });

/**
 * Tab Tambah Barang Keluar: pegawai pengambil (seksi ikut otomatis dari data Kepegawaian; bila
 * belum diisi, seksi dipilih manual), tanggal ambil, dan detail barang. Jumlah tidak boleh
 * melebihi sisa stok.
 */
export default function FormKeluar({ edit, onSelesai, onTutup }) {
  const { barang, pegawai: daftarPegawaiDb, sisa, izin } = useInventori();
  const [pegawaiId, setPegawaiId] = useState(() => (edit ? edit.pegawaiId || '' : ''));
  // Pengambil lama yang sudah nonaktif tetap bisa dipilih saat mengubah transaksinya
  const daftarPegawai = useMemo(() => {
    if (!edit?.pegawaiId || daftarPegawaiDb.some((p) => p.id === edit.pegawaiId))
      return daftarPegawaiDb;
    return [
      ...daftarPegawaiDb,
      { id: edit.pegawaiId, nama: edit.pegawai, seksi: edit.pengambil?.seksi || edit.seksi },
    ];
  }, [edit, daftarPegawaiDb]);
  const terpilih = daftarPegawai.find((p) => p.id === pegawaiId);
  const [seksiManual, setSeksiManual] = useState(edit ? edit.seksi : '');
  const seksi = terpilih?.seksi || seksiManual;
  const [tanggal, setTanggal] = useState(edit ? edit.tanggal : hariIni());
  const [items, setItems] = useState(() =>
    edit ? edit.items.map((i) => barisBaru(i.barangId, String(i.jumlah))) : [barisBaru()],
  );
  const [fokusKunci, setFokusKunci] = useState(null);
  const [galat, setGalat] = useState(null);
  const [menyimpan, setMenyimpan] = useState(false);

  // Saat mengubah, jumlah lama transaksi ini dikembalikan dulu ke stok yang tersedia
  const sisaEf = (id) =>
    (sisa[id] ?? 0) + (edit ? edit.items.find((i) => i.barangId === id)?.jumlah || 0 : 0);

  const ubahBaris = (kunci, bagian) => {
    setGalat(null);
    setItems((arr) => arr.map((r) => (r.kunci === kunci ? { ...r, ...bagian } : r)));
  };
  const tambahBaris = () => {
    setGalat(null);
    const baru = barisBaru();
    setFokusKunci(baru.kunci);
    setItems((arr) => [...arr, baru]);
  };
  const buangBaris = (kunci, el) =>
    hapusBaris(el, () => setItems((arr) => arr.filter((r) => r.kunci !== kunci)));

  const rincian = items.map((it) => {
    const b = barang.find((x) => x.id === it.barangId);
    const jml = Number(it.jumlah);
    const valid = Number.isInteger(jml) && jml > 0;
    const sisaBaru = b ? sisaEf(b.id) - (valid ? jml : 0) : 0;
    return { it, b, jml, valid, sisaBaru, lebih: !!b && valid && jml > sisaEf(b.id) };
  });
  const lengkap =
    !!terpilih &&
    !!seksi &&
    !!tanggal &&
    rincian.length > 0 &&
    rincian.every((r) => r.b && r.valid);

  async function simpan(e) {
    e.preventDefault();
    if (!izin.tulis || menyimpan) return;
    if (!terpilih) return setGalat('Pilih nama pegawai pengambil terlebih dahulu.');
    if (!seksi) return setGalat('Pilih seksi pengambil terlebih dahulu.');
    if (tanggalLewat(tanggal)) return setGalat('Tanggal ambil tidak boleh di masa depan.');
    for (let i = 0; i < rincian.length; i += 1) {
      const nomor = rincian.length > 1 ? ` pada baris ${i + 1}` : '';
      const r = rincian[i];
      if (!r.b) return setGalat(`Pilih barang terlebih dahulu${nomor}.`);
      if (!r.valid) return setGalat(`Jumlah harus bilangan bulat lebih dari 0${nomor}.`);
      if (r.lebih)
        return setGalat(
          `Jumlah ${r.jml} ${r.b.satuan}${nomor} melebihi sisa stok ${sisaEf(r.b.id)} ${r.b.satuan}.`,
        );
    }
    const data = {
      tanggal,
      seksi,
      pengambilId: pegawaiId,
      items: rincian.map((r) => ({ barangId: r.b.id, jumlah: r.jml })),
    };
    setMenyimpan(true);
    try {
      if (edit) {
        await ubahTransaksi({ jenis: 'keluar', id: edit.id, ...data });
        onSelesai('keluar', 'Barang keluar diperbarui. Stok sudah disesuaikan.');
      } else {
        const rekam = await catatKeluar(data);
        onSelesai('keluar', 'Barang keluar disimpan. Stok sudah berkurang.', {
          ...rekam,
          jenis: 'keluar',
          pegawai: rekam.pengambil?.nama || '',
          pegawaiId: rekam.pengambil?.pegawaiId || '',
        });
      }
    } catch (err) {
      setMenyimpan(false);
      setGalat(pesanGalat(err, 'Gagal menyimpan. Periksa koneksi lalu coba lagi.'));
    }
    return undefined;
  }

  const baris = rincian.map(({ it, b, valid, sisaBaru, lebih }) => {
    const dipakaiLain = new Set(items.filter((x) => x.kunci !== it.kunci).map((x) => x.barangId));
    let stok = <span className={T.inkMuted}>-</span>;
    if (b && lebih)
      stok = (
        <span className={`text-[13px] font-semibold ${STATUS.critInk}`}>
          Melebihi stok ({formatSisa(b, sisaEf(b.id))})
        </span>
      );
    else if (b && valid)
      stok = (
        <span className="inline-flex flex-wrap items-center gap-2">
          <strong className="tabular-nums">
            {sisaBaru} {b.satuan}
          </strong>
          <StatusBadge status={statusStok(sisaBaru, b.stokMin)} />
        </span>
      );
    else if (b) stok = <span className={T.inkMuted}>{formatSisa(b, sisaEf(b.id))}</span>;
    return {
      ...it,
      b,
      stok,
      opsi: opsiBarang(barang, sisaEf, { pakai: (id) => dipakaiLain.has(id), perluStok: true }),
    };
  });

  return (
    <form onSubmit={simpan} noValidate className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-4">
        <div className="flex-[1_1_200px] min-w-0">
          <label className={K.lbl} htmlFor="k-pegawai">
            Pengambil <span className={K.wajib}>*</span>
          </label>
          <PilihCari
            id="k-pegawai"
            autoFocus
            placeholder="Pilih nama pegawai..."
            nilai={pegawaiId}
            opsi={daftarPegawai.map((p) => ({ nilai: p.id, label: p.nama, info: p.seksi }))}
            onPilih={(v) => {
              setGalat(null);
              setPegawaiId(v);
            }}
          />
          {terpilih?.seksi && (
            <span className={`block mt-1.5 text-[12.5px] ${T.inkMuted}`}>
              Seksi: {terpilih.seksi}
            </span>
          )}
        </div>
        <div className="flex-[1_1_200px] min-w-0">
          <label className={K.lbl} htmlFor="k-tgl">
            Tanggal ambil <span className={K.wajib}>*</span>
          </label>
          <PilihTanggal
            id="k-tgl"
            nilai={tanggal}
            maks={hariIni()}
            onUbah={(v) => {
              setGalat(null);
              setTanggal(v);
            }}
          />
        </div>
        {terpilih && !terpilih.seksi && (
          <div className="basis-full">
            <label className={K.lbl} htmlFor="k-seksi">
              Seksi pengambil <span className={K.wajib}>*</span>
            </label>
            <PilihCari
              id="k-seksi"
              placeholder="Pilih seksi..."
              nilai={seksiManual}
              opsi={SEKSI.map((x) => ({ nilai: x, label: x }))}
              onPilih={(v) => {
                setGalat(null);
                setSeksiManual(v);
              }}
            />
            <p className={K.bantu}>
              Seksi pegawai ini belum diisi di Kepegawaian, jadi dipilih manual.
            </p>
          </div>
        )}
      </div>

      <div>
        <span className={K.lbl}>
          Detail Barang Keluar <span className={K.wajib}>*</span>
        </span>
        <TabelItem
          id="k"
          judulStok="Sisa Stok"
          baris={baris}
          fokusKunci={fokusKunci}
          bisaTambah
          onUbah={ubahBaris}
          onTambah={tambahBaris}
          onHapus={buangBaris}
        />
      </div>
      {galat && (
        <div className={K.galat} role="alert" data-galat>
          {galat}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <button className={K.btnUtama} type="submit" disabled={!lengkap || menyimpan}>
          {menyimpan ? 'Menyimpan…' : edit ? 'Simpan Perubahan' : 'Simpan dan Cetak Bukti'}
        </button>
        <button className={K.btn} type="button" onClick={onTutup}>
          Batal
        </button>
      </div>
    </form>
  );
}
