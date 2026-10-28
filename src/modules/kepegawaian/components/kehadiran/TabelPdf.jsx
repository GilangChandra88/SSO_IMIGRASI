import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

// @react-pdf tidak mendukung Tailwind; gaya PDF memakai StyleSheet (pengecualian CLAUDE.md §5)
const s = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 40,
    paddingHorizontal: 36,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#101A2C',
  },
  kantor: { fontSize: 10, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  subKantor: { fontSize: 8.5, textAlign: 'center', marginTop: 2, color: '#55627A' },
  garis: { borderBottomWidth: 1.5, borderBottomColor: '#0f2040', marginTop: 8, marginBottom: 14 },
  judul: { fontSize: 13, fontFamily: 'Helvetica-Bold' },
  sub: { fontSize: 9, color: '#55627A', marginTop: 3, marginBottom: 12 },
  tabel: { borderWidth: 1, borderColor: '#CBD3DE' },
  baris: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E0E5EC' },
  barisSelang: { backgroundColor: '#F7F8FC' },
  kepala: { backgroundColor: '#0f2040', color: '#FFFFFF', fontFamily: 'Helvetica-Bold' },
  sel: { paddingVertical: 5, paddingHorizontal: 5 },
  c: { textAlign: 'center' },
  r: { textAlign: 'right' },
  l: { textAlign: 'left' },
  kaki: {
    position: 'absolute',
    bottom: 18,
    left: 36,
    right: 36,
    fontSize: 7.5,
    color: '#8895A9',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

/**
 * PDF tabel kehadiran (rekap semua pegawai atau riwayat satu pegawai), dari tabelRekap/tabelRiwayat
 * di utils/eksporKehadiran. Judul kolom diulang di setiap halaman.
 */
export default function TabelPdf({ tabel, dicetak }) {
  const total = tabel.lebarPdf.reduce((a, b) => a + b, 0);
  const lebar = tabel.lebarPdf.map((w) => ({ width: `${(w / total) * 100}%` }));
  const sel = (i) => [s.sel, s[tabel.rataPdf[i]] || s.l, lebar[i]];
  return (
    <Document title={tabel.judul}>
      <Page size="A4" orientation={tabel.mendatar ? 'landscape' : 'portrait'} style={s.page}>
        <Text style={s.kantor}>KANTOR IMIGRASI KELAS II TPI BULELENG</Text>
        <Text style={s.subKantor}>Urusan Kepegawaian</Text>
        <View style={s.garis} />
        <Text style={s.judul}>{tabel.judul}</Text>
        <Text style={s.sub}>{tabel.sub}</Text>
        <View style={s.tabel}>
          <View style={[s.baris, s.kepala]} fixed>
            {tabel.kolom.map((k, i) => (
              <Text key={k} style={sel(i)}>
                {k}
              </Text>
            ))}
          </View>
          {tabel.pdf.map((b, r) => (
            <View key={r} style={r % 2 ? [s.baris, s.barisSelang] : s.baris} wrap={false}>
              {b.map((v, i) => (
                <Text key={i} style={sel(i)}>
                  {v}
                </Text>
              ))}
            </View>
          ))}
        </View>
        <View style={s.kaki} fixed>
          <Text>Dicetak {dicetak}</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
