import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { formatNip } from '@/utils/dataPegawai';
import { JEDA_PULANG_MENIT } from '../../utils/absensi';

// A4 mendatar (841,89 pt) dikurangi margin kiri-kanan; kolom tanggal membagi sisa lebar
const MARGIN = 20;
const LEBAR = 841.89 - MARGIN * 2;
const W = { no: 16, nama: 134, hadir: 24, kurang: 30 };
const GARIS = '#CBD3DE';

// @react-pdf tidak mendukung Tailwind; gaya PDF memakai StyleSheet (pengecualian CLAUDE.md §5)
const s = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 32,
    paddingHorizontal: MARGIN,
    fontSize: 6.5,
    fontFamily: 'Helvetica',
    color: '#101A2C',
  },
  kantor: { fontSize: 10, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  subKantor: { fontSize: 8, textAlign: 'center', marginTop: 2, color: '#55627A' },
  garis: { borderBottomWidth: 1.5, borderBottomColor: '#0f2040', marginTop: 6, marginBottom: 10 },
  judul: { fontSize: 12, fontFamily: 'Helvetica-Bold' },
  sub: { fontSize: 8, color: '#55627A', marginTop: 2, marginBottom: 8 },
  // Garis kiri per baris (bukan pada wadah tabel) supaya tidak menjulur ke kaki halaman saat terpotong
  baris: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: GARIS,
    borderLeftWidth: 0.75,
    borderLeftColor: GARIS,
  },
  kepala: { backgroundColor: '#0f2040', color: '#FFFFFF', fontFamily: 'Helvetica-Bold' },
  kepalaLibur: { backgroundColor: '#1e4080' },
  sel: {
    borderRightWidth: 0.5,
    borderRightColor: GARIS,
    paddingVertical: 2,
    paddingHorizontal: 1.5,
    justifyContent: 'center',
  },
  libur: { backgroundColor: '#EEF1F5' },
  tengah: { textAlign: 'center' },
  namaHari: { textAlign: 'center', fontSize: 5 },
  nama: { fontSize: 6.8, fontFamily: 'Helvetica-Bold' },
  kecil: { fontSize: 5.6, color: '#55627A' },
  jam: { fontSize: 5.6, textAlign: 'center' },
  pulang: { fontSize: 5.6, textAlign: 'center', color: '#55627A' },
  kurang: { color: '#8A5B00' },
  koreksi: { color: '#1D5CA8', fontFamily: 'Helvetica-Oblique' },
  angka: { fontSize: 7, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  keterangan: { fontSize: 6.5, color: '#55627A', marginTop: 8, lineHeight: 1.4 },
  kaki: {
    position: 'absolute',
    bottom: 14,
    left: MARGIN,
    right: MARGIN,
    fontSize: 7,
    color: '#8895A9',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

/**
 * Rekap absensi satu bulan dalam format mendatar: baris = pegawai (nama + NIP), kolom = setiap
 * tanggal di bulan itu (jam masuk di atas, jam pulang di bawah), lalu jumlah hadir & hari yang
 * pindaiannya tidak lengkap. Judul kolom diulang di setiap halaman.
 */
export default function PdfAbsensiBulanan({ rekap, bulanan, dicetak }) {
  const lebarHari = (LEBAR - W.no - W.nama - W.hadir - W.kurang) / bulanan.hari.length;
  const kolom = (lebar) => [s.sel, { width: lebar }];
  const adaTakTerpetakan = bulanan.baris.some((r) => !r.pegawai);
  const adaKoreksi = bulanan.baris.some((r) => r.dikoreksi > 0);

  return (
    <Document title={`Rekap Absensi ${bulanan.label}`}>
      <Page size="A4" orientation="landscape" style={s.page}>
        <Text style={s.kantor}>KANTOR IMIGRASI KELAS II TPI BULELENG</Text>
        <Text style={s.subKantor}>Urusan Kepegawaian</Text>
        <View style={s.garis} />
        <Text style={s.judul}>Rekap Absensi Pegawai · {bulanan.label}</Text>
        <Text style={s.sub}>
          {rekap.nama} · {bulanan.baris.length} pegawai
        </Text>

        <View>
          <View style={[s.baris, s.kepala]} fixed>
            <View style={kolom(W.no)}>
              <Text style={s.tengah}>No</Text>
            </View>
            <View style={kolom(W.nama)}>
              <Text>Nama Pegawai / NIP</Text>
            </View>
            {bulanan.hari.map((h) => (
              <View key={h.tgl} style={[...kolom(lebarHari), h.libur ? s.kepalaLibur : {}]}>
                <Text style={s.tengah}>{h.tgl}</Text>
                <Text style={s.namaHari}>{h.label}</Text>
              </View>
            ))}
            <View style={kolom(W.hadir)}>
              <Text style={s.tengah}>Hadir</Text>
            </View>
            <View style={kolom(W.kurang)}>
              <Text style={s.tengah}>Tidak Lengkap</Text>
            </View>
          </View>

          {bulanan.baris.map((r, i) => (
            <View key={r.kunci} style={s.baris} wrap={false}>
              <View style={kolom(W.no)}>
                <Text style={s.tengah}>{i + 1}</Text>
              </View>
              <View style={kolom(W.nama)}>
                <Text style={s.nama}>
                  {r.nama}
                  {r.pegawai ? '' : ' *'}
                </Text>
                <Text style={s.kecil}>{r.nip ? formatNip(r.nip) : `No. ${r.nos.join(', ')}`}</Text>
              </View>
              {bulanan.hari.map((h) => {
                const x = r.sel[h.tgl];
                const ada = !!x && !!(x.masuk || x.pulang);
                const lengkap = ada && !!x.masuk && !!x.pulang;
                return (
                  <View key={h.tgl} style={[...kolom(lebarHari), h.libur ? s.libur : {}]}>
                    {ada && (
                      <>
                        <Text style={[s.jam, lengkap ? {} : s.kurang, x.koreksi ? s.koreksi : {}]}>
                          {x.masuk || '-'}
                        </Text>
                        <Text style={[s.pulang, x.koreksi ? s.koreksi : {}]}>
                          {x.pulang || '-'}
                        </Text>
                      </>
                    )}
                  </View>
                );
              })}
              <View style={kolom(W.hadir)}>
                <Text style={s.angka}>{r.hadir}</Text>
              </View>
              <View style={kolom(W.kurang)}>
                <Text style={r.tidakLengkap ? [s.angka, s.kurang] : s.angka}>{r.tidakLengkap}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={s.keterangan}>
          Keterangan: baris atas = jam masuk (pindaian pertama); baris bawah = jam pulang (pindaian
          terakhir, minimal {JEDA_PULANG_MENIT} menit setelah jam masuk); &quot;-&quot; = hanya satu
          jam (tidak lengkap); kolom abu-abu = Sabtu/Minggu.
          {adaKoreksi ? ' Jam miring biru = disesuaikan manual oleh Kepegawaian.' : ''}
          {adaTakTerpetakan
            ? ' * = No. mesin belum dipetakan ke Data Pegawai (nama dari mesin).'
            : ''}
        </Text>

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
