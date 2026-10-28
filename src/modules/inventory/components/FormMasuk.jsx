import { useState } from 'react';
import { T } from '@/utils/uiTokens';
import { hapusBaris } from '@/utils/animasi';
import { K } from '../ui/kelas';
import { useInventori } from '../hooks/useInventori';
import { pesanGalat } from '@/utils/pesanGalat';
import { catatMasuk, ubahTransaksi } from '../services/inventoryDb';
import { hariIni, opsiBarang, statusStok, tanggalLewat } from '../utils/stokLogic';
import { PilihCari, PilihTanggal } from './Pilihan';
import StatusBadge from './StatusBadge';
import TabelItem from './TabelItem';

let kunciBaris = 0;
const barisBaru = (barangId = '', jumlah = '') => ({ kunci: ++kunciBaris, barangId, jumlah });

/** Tab Tambah Barang Masuk (juga Ubah Barang Masuk bila `edit` terisi; satu barang per catatan). */
export default function FormMasuk({ edit, onSelesai, onTutup }) {
  const { barang, pemasokList, sisa, izin } = useInventori();
  const [form, setForm] = useState(() =>
    edit
      ? {
          pemasok: edit.pemasok,
          tanggal: edit.tanggal,
          items: [barisBaru(edit.barangId, String(edit.jumlah))],
        }
      : { pemasok: '', tanggal: hariIni(), items: [barisBaru()] },
  );
  const [fokusKunci, setFokusKunci] = useState(null);
  const [galat, setGalat] = useState(null);
  const [menyimpan, setMenyimpan] = useState(false);

  const ubahForm = (k, v) => {
    setGalat(null);
    setForm((f) => ({ ...f, [k]: v }));
  };
  const ubahBaris = (kunci, perubahan) => {
    setGalat(null);
    setForm((f) => ({
      ...f,
      items: f.items.map((it) => (it.kunci === kunci ? { ...it, ...perubahan } : it)),
    }));
  };
  const tambahBaris = () => {
    setGalat(null);
    const baru = barisBaru();
    setFokusKunci(baru.kunci);
    setForm((f) => ({ ...f, items: [...f.items, baru] }));
  };
  const buangBaris = (kunci, el) =>
    hapusBaris(el, () =>
      setForm((f) => ({ ...f, items: f.items.filter((it) => it.kunci !== kunci) })),
    );

  // Pemasok lama yang sudah tidak ada di daftar tetap bisa dipilih saat mengubah
  const daftarPemasok =
    edit && edit.pemasok && !pemasokList.includes(edit.pemasok)
      ? [...pemasokList, edit.pemasok]
      : pemasokList;

  const rincian = form.items.map((it) => {
    const b = barang.find((x) => x.id === it.barangId);
    const jml = Number(it.jumlah);
    const valid = Number.isInteger(jml) && jml > 0;
    const kurangiLama = edit && b && edit.barangId === b.id ? edit.jumlah : 0;
    const sisaBaru = b ? sisa[b.id] - kurangiLama + (valid ? jml : 0) : 0;
    return { it, b, jml, valid, sisaBaru };
  });
  const lengkap =
    !!form.pemasok && !!form.tanggal && rincian.length > 0 && rincian.every((r) => r.b && r.valid);

  async function simpan(e) {
    e.preventDefault();
    if (!izin.tulis || menyimpan) return;
    if (!form.pemasok) return setGalat('Pilih pemasok terlebih dahulu.');
    if (tanggalLewat(form.tanggal)) return setGalat('Tanggal masuk tidak boleh di masa depan.');
    for (let i = 0; i < rincian.length; i += 1) {
      const nomor = rincian.length > 1 ? ` pada baris ${i + 1}` : '';
      if (!rincian[i].b) return setGalat(`Pilih barang terlebih dahulu${nomor}.`);
      if (!rincian[i].valid) return setGalat(`Jumlah harus bilangan bulat lebih dari 0${nomor}.`);
    }
    if (edit) {
      // Barang lama kehilangan jumlah lamanya (dan mendapat jumlah baru bila barangnya sama)
      const { b, jml } = rincian[0];
      const sisaLama =
        (sisa[edit.barangId] ?? 0) - edit.jumlah + (b.id === edit.barangId ? jml : 0);
      if (sisaLama < 0)
        return setGalat(
          'Perubahan ini membuat stok menjadi minus karena sebagian barang sudah diambil seksi.',
        );
    }
    setMenyimpan(true);
    try {
      if (edit) {
        const { b, jml } = rincian[0];
        await ubahTransaksi({
          jenis: 'masuk',
          id: edit.id,
          tanggal: form.tanggal,
          pemasokNama: form.pemasok,
          barangId: b.id,
          jumlah: jml,
        });
      } else {
        await catatMasuk({
          tanggal: form.tanggal,
          pemasokNama: form.pemasok,
          items: rincian.map(({ b, jml }) => ({ barangId: b.id, jumlah: jml })),
        });
      }
    } catch (err) {
      setMenyimpan(false);
      return setGalat(pesanGalat(err, 'Gagal menyimpan. Periksa koneksi lalu coba lagi.'));
    }
    let teks;
    if (edit) teks = 'Barang masuk diperbarui.';
    else if (rincian.length === 1)
      teks = `Barang masuk disimpan. Stok ${rincian[0].b.nama} sekarang ${rincian[0].sisaBaru} ${rincian[0].b.satuan}.`;
    else teks = `${rincian.length} barang masuk disimpan.`;
    onSelesai('masuk', teks);
    return undefined;
  }

  const baris = rincian.map(({ it, b, valid, sisaBaru }) => {
    const dipakaiLain = new Set(
      form.items.filter((x) => x.kunci !== it.kunci).map((x) => x.barangId),
    );
    return {
      ...it,
      b,
      opsi: opsiBarang(barang, (id) => sisa[id], { pakai: (id) => dipakaiLain.has(id) }),
      stok:
        b && valid ? (
          <span className="inline-flex flex-wrap items-center gap-2">
            <strong className="tabular-nums">
              {sisaBaru} {b.satuan}
            </strong>
            <StatusBadge status={statusStok(sisaBaru, b.stokMin)} />
          </span>
        ) : (
          <span className={T.inkMuted}>-</span>
        ),
    };
  });

  return (
    <form onSubmit={simpan} noValidate className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-4">
        <div className="flex-[1_1_200px] min-w-0">
          <label className={K.lbl} htmlFor="m-pemasok">
            Pemasok <span className={K.wajib}>*</span>
          </label>
          <PilihCari
            id="m-pemasok"
            autoFocus
            placeholder="Cari pemasok..."
            nilai={form.pemasok}
            opsi={daftarPemasok.map((p) => ({ nilai: p, label: p }))}
            onPilih={(v) => ubahForm('pemasok', v)}
          />
          {daftarPemasok.length === 0 && (
            <p className={K.bantu}>
              Belum ada pemasok. Tambahkan lewat Stok Barang › Tambah Barang › Tambah Pemasok.
            </p>
          )}
        </div>
        <div className="flex-[1_1_200px] min-w-0">
          <label className={K.lbl} htmlFor="m-tgl">
            Tanggal masuk <span className={K.wajib}>*</span>
          </label>
          <PilihTanggal
            id="m-tgl"
            nilai={form.tanggal}
            maks={hariIni()}
            onUbah={(v) => ubahForm('tanggal', v)}
          />
        </div>
      </div>

      <div>
        <span className={K.lbl}>
          Detail Barang <span className={K.wajib}>*</span>
        </span>
        <TabelItem
          id="m"
          judulStok="Stok Setelah"
          baris={baris}
          fokusKunci={fokusKunci}
          bisaTambah={!edit}
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
          {menyimpan
            ? 'Menyimpan…'
            : edit
              ? 'Simpan Perubahan'
              : form.items.length > 1
                ? `Simpan ${form.items.length} Barang Masuk`
                : 'Simpan Barang Masuk'}
        </button>
        <button className={K.btn} type="button" onClick={onTutup}>
          Batal
        </button>
      </div>
    </form>
  );
}
