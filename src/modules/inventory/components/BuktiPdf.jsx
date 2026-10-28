import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { formatTanggalPanjang, idTransaksi, totalBarang } from '../utils/stokLogic';

// @react-pdf tidak mendukung Tailwind; gaya PDF memakai StyleSheet (pengecualian CLAUDE.md §5)
const s = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 56,
    fontSize: 10.5,
    fontFamily: 'Helvetica',
    color: '#101A2C',
  },
  kantor: { fontSize: 11, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  subKantor: { fontSize: 9.5, textAlign: 'center', marginTop: 2, color: '#55627A' },
  garis: { borderBottomWidth: 1.5, borderBottomColor: '#0f2040', marginTop: 10, marginBottom: 18 },
  judul: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  nomor: { fontSize: 10, textAlign: 'center', marginTop: 3, marginBottom: 18 },
  meta: { flexDirection: 'row', marginBottom: 4 },
  metaLabel: { width: 120, color: '#55627A' },
  metaIsi: { flex: 1, fontFamily: 'Helvetica-Bold' },
  tabel: { marginTop: 14, borderWidth: 1, borderColor: '#CBD3DE' },
  baris: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E0E5EC' },
  kepala: { backgroundColor: '#F3F5F8', fontFamily: 'Helvetica-Bold', fontSize: 9.5 },
  no: { width: 28, padding: 6, textAlign: 'center' },
  kode: { width: 120, padding: 6 },
  nama: { flex: 1, padding: 6 },
  jumlah: { width: 90, padding: 6, textAlign: 'right' },
  total: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    fontFamily: 'Helvetica-Bold',
  },
  tempat: { marginTop: 28, textAlign: 'right' },
  ttd: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  ttdKolom: { width: '42%', textAlign: 'center' },
  ttdNama: {
    marginTop: 56,
    borderTopWidth: 1,
    borderTopColor: '#101A2C',
    paddingTop: 4,
    fontFamily: 'Helvetica-Bold',
  },
});

/** Dokumen PDF Bukti Serah Terima Barang (barang keluar) untuk dicetak/diunduh. */
export default function BuktiPdf({ transaksi, barang }) {
  return (
    <Document title={`Bukti Serah Terima ${idTransaksi('keluar', transaksi.nomor)}`}>
      <Page size="A4" style={s.page}>
        <Text style={s.kantor}>KANTOR IMIGRASI KELAS II TPI BULELENG</Text>
        <Text style={s.subKantor}>Subbagian Umum · Pengelola Persediaan</Text>
        <View style={s.garis} />
        <Text style={s.judul}>Bukti Serah Terima Barang</Text>
        <Text style={s.nomor}>Nomor transaksi {idTransaksi('keluar', transaksi.nomor)}</Text>

        <View style={s.meta}>
          <Text style={s.metaLabel}>Seksi pengambil</Text>
          <Text style={s.metaIsi}>{transaksi.seksi || '-'}</Text>
        </View>
        <View style={s.meta}>
          <Text style={s.metaLabel}>Pegawai pengambil</Text>
          <Text style={s.metaIsi}>{transaksi.pegawai || '-'}</Text>
        </View>
        <View style={s.meta}>
          <Text style={s.metaLabel}>Tanggal ambil</Text>
          <Text style={s.metaIsi}>{formatTanggalPanjang(transaksi.tanggal)}</Text>
        </View>

        <View style={s.tabel}>
          <View style={[s.baris, s.kepala]}>
            <Text style={s.no}>No</Text>
            <Text style={s.kode}>Kode SAKTI</Text>
            <Text style={s.nama}>Nama Barang</Text>
            <Text style={s.jumlah}>Jumlah</Text>
          </View>
          {transaksi.items.map((i, n) => {
            const b = barang.find((x) => x.id === i.barangId);
            return (
              <View style={s.baris} key={i.barangId} wrap={false}>
                <Text style={s.no}>{n + 1}</Text>
                <Text style={s.kode}>{b?.idSakti || '-'}</Text>
                <Text style={s.nama}>{b?.nama || '(barang sudah dihapus)'}</Text>
                <Text style={s.jumlah}>
                  {i.jumlah} {b?.satuan || ''}
                </Text>
              </View>
            );
          })}
        </View>
        <View style={s.total}>
          <Text>Total barang: {totalBarang(transaksi.items)}</Text>
        </View>

        <Text style={s.tempat}>
          Singaraja, {formatTanggalPanjang(transaksi.tanggal).split(', ')[1]}
        </Text>
        <View style={s.ttd} wrap={false}>
          <View style={s.ttdKolom}>
            <Text>Pengambil</Text>
            <Text style={s.ttdNama}>{transaksi.pegawai || transaksi.seksi || ' '}</Text>
          </View>
          <View style={s.ttdKolom}>
            <Text>Pengelola Persediaan</Text>
            <Text style={s.ttdNama}> </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
