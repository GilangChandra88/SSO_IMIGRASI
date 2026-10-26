import React from 'react';
import { Document, Page, Path, StyleSheet, Svg, Text, View } from '@react-pdf/renderer';
import { itemSingkat, rpTitik } from '../../utils/verifikasiLogic';

/**
 * Template PDF Lembar Verifikasi PPK (LembarSheet purwarupa admin). `data` = dataLembar().
 * Huruf standar PDF tidak punya tanda centang, jadi centang digambar dengan SVG.
 */

const GARIS = '#1f2937';

const s = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Helvetica', fontSize: 9.5, color: '#111827' },
  bingkai: { borderWidth: 1.2, borderColor: GARIS },
  kepala: { flexDirection: 'row', borderBottomWidth: 1.2, borderColor: GARIS },
  judul: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontFamily: 'Helvetica-Bold',
    fontSize: 17,
    lineHeight: 1.15,
    letterSpacing: 1,
  },
  ppk: {
    width: 170,
    borderLeftWidth: 1.2,
    borderColor: GARIS,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  ppkB: { fontFamily: 'Helvetica-Bold', fontSize: 15 },
  ppkS: { fontFamily: 'Helvetica-Bold', fontSize: 8.5, marginTop: 2, letterSpacing: 0.4 },
  grup: { paddingVertical: 6, paddingHorizontal: 12, borderBottomWidth: 0.8, borderColor: GARIS },
  baris: { flexDirection: 'row', marginVertical: 1.5 },
  dt: { width: 118 },
  dd: { flex: 1 },
  items: { width: '100%' },
  item: { flexDirection: 'row', marginBottom: 1 },
  itemKode: { width: 52, fontFamily: 'Courier', fontSize: 8.5 },
  itemNama: { flex: 1 },
  itemNilai: { width: 92, textAlign: 'right' },
  tabel: { borderBottomWidth: 0.8, borderColor: GARIS },
  tr: { flexDirection: 'row', borderTopWidth: 0.8, borderColor: GARIS },
  th: { fontFamily: 'Helvetica-Bold', backgroundColor: '#f3f4f6' },
  cNo: { width: 30, padding: 4, textAlign: 'center', borderRightWidth: 0.8, borderColor: GARIS },
  cDok: { flex: 1, padding: 4, borderRightWidth: 0.8, borderColor: GARIS },
  cCek: {
    width: 52,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.8,
    borderColor: GARIS,
  },
  cKet: { width: 110, padding: 4 },
  catatan: { padding: 5, paddingHorizontal: 8, borderTopWidth: 0.8, borderColor: GARIS },
  catatanPpk: { minHeight: 46 },
  tebal: { fontFamily: 'Helvetica-Bold' },
  merah: { color: '#A62D2D', fontFamily: 'Helvetica-Bold' },
  paraf: { flexDirection: 'row' },
  parafSel: { flex: 1, height: 74, padding: 6 },
  parafKiri: { borderRightWidth: 0.8, borderColor: GARIS },
  labelDaftar: { marginBottom: 3 },
  kaki: { marginTop: 6, fontSize: 7.5, color: '#6b7280' },
});

function Centang() {
  return (
    <Svg width={10} height={10} viewBox="0 0 24 24">
      <Path d="M4 12.5l5 5L20 6.5" stroke="#111827" strokeWidth={3} fill="none" />
    </Svg>
  );
}

function DaftarItem({ lines, nilai }) {
  return (
    <View style={s.items}>
      {lines.map((l) => (
        <View key={l.key} style={s.item}>
          <Text style={s.itemKode}>{l.kode}</Text>
          <Text style={s.itemNama}>{itemSingkat(l.label)}</Text>
          <Text style={s.itemNilai}>{nilai(l) == null ? '—' : rpTitik(nilai(l))}</Text>
        </View>
      ))}
    </View>
  );
}

export default function LembarVerifikasiPdf({ data }) {
  const { nom } = data;
  return (
    <Document title={`Lembar Verifikasi ${data.id || ''}`.trim()}>
      <Page size="A4" style={s.page}>
        <View style={s.bingkai}>
          <View style={s.kepala}>
            <Text style={s.judul}>{'LEMBAR\nVERIFIKASI'}</Text>
            <View style={s.ppk}>
              <Text style={s.ppkB}>PPK</Text>
              <Text style={s.ppkS}>{data.jenisTeks}</Text>
            </View>
          </View>

          {data.meta.map((grup, gi) => (
            <View key={gi} style={s.grup}>
              {grup.map(([label, nilai]) => (
                <View key={label} style={s.baris}>
                  <Text style={s.dt}>{label}</Text>
                  <Text>: </Text>
                  {label === 'Jumlah' && nom.multi ? (
                    <View style={s.dd}>
                      <DaftarItem lines={nom.lines} nilai={(l) => l.nilai} />
                    </View>
                  ) : (
                    <Text style={s.dd}>{nilai || '—'}</Text>
                  )}
                </View>
              ))}
            </View>
          ))}

          <View style={s.tabel}>
            <View style={[s.tr, s.th]}>
              <Text style={s.cNo}>No.</Text>
              <Text style={s.cDok}>Kelengkapan Dokumen</Text>
              <Text style={s.cCek}>Staf PPK</Text>
              <Text style={s.cCek}>PPK</Text>
              <Text style={s.cKet}>Keterangan</Text>
            </View>
            {data.rows.map((r, i) => (
              <View key={r.label} style={s.tr} wrap={false}>
                <Text style={s.cNo}>{i + 1}</Text>
                <Text style={s.cDok}>{r.label}</Text>
                <View style={s.cCek}>{r.staf && <Centang />}</View>
                <View style={s.cCek}>{r.ppk && <Centang />}</View>
                <Text style={s.cKet}>{r.ket}</Text>
              </View>
            ))}
            <View style={s.tr} wrap={false}>
              <Text style={s.cNo}>{data.rows.length + 1}</Text>
              <Text style={s.cDok}>POK Terakhir</Text>
              <View style={s.cCek} />
              <View style={s.cCek} />
              <Text style={s.cKet}>{nom.multi || nom.pok == null ? '' : rpTitik(nom.pok)}</Text>
            </View>

            <View style={s.catatan} wrap={false}>
              <Text>
                Catatan Staf PPK:{' '}
                <Text style={data.catatan === 'Lengkap' ? s.tebal : s.merah}>{data.catatan}</Text>
              </Text>
            </View>
            {nom.multi && (
              <View style={s.catatan} wrap={false}>
                <Text style={s.labelDaftar}>POK terakhir :</Text>
                <DaftarItem lines={nom.lines} nilai={(l) => l.pok} />
              </View>
            )}
            <View style={[s.catatan, s.catatanPpk]} wrap={false}>
              <Text>Catatan PPK:</Text>
            </View>
            <View style={s.catatan} wrap={false}>
              {nom.multi ? (
                <>
                  <Text style={s.labelDaftar}>Sisa Anggaran Setelah Tagihan ini :</Text>
                  <DaftarItem lines={nom.lines} nilai={(l) => l.sisa} />
                </>
              ) : (
                <Text>
                  Sisa Anggaran Setelah Tagihan ini :{' '}
                  <Text style={s.tebal}>{nom.sisa == null ? '—' : rpTitik(nom.sisa)}</Text>
                </Text>
              )}
            </View>
          </View>

          <View style={s.paraf} wrap={false}>
            <View style={[s.parafSel, s.parafKiri]}>
              <Text>Paraf PPK</Text>
            </View>
            <View style={s.parafSel}>
              <Text>Paraf KPA</Text>
            </View>
          </View>
        </View>
        {data.id ? <Text style={s.kaki}>{data.id}</Text> : null}
      </Page>
    </Document>
  );
}
