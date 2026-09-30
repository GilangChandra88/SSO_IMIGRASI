import React, { useMemo } from 'react';
import { PDFViewer, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { isiPlaceholder } from './isiPlaceholder';

// ─── UTILS ──────────────────────────────────────────────────────────────────
const fmtDate = (v) =>
  v
    ? new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
    : '...';

const fmtDateDash = (v) => {
  if (!v) return '...';
  const d = new Date(v);
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
};

// ─── STYLES (Menggunakan Yoga Flexbox ala React Native) ────────────────────
const styles = StyleSheet.create({
  page: {
    paddingTop: 56, // ~20mm
    paddingBottom: 56, // ~20mm
    paddingLeft: 70, // ~25mm
    paddingRight: 70, // ~25mm
    fontFamily: 'Times-Roman',
    fontSize: 11,
    lineHeight: 1.5,
  },
  // KOP SURAT
  kopContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  logoBox: { width: 85, alignItems: 'center', justifyContent: 'center' }, // Dikurangi sedikit agar ruang teks lebih luas
  logo: { width: 75, height: 75 },
  kopText: { flex: 1, alignItems: 'center', paddingRight: 0 }, // Hapus padding kanan agar teks bisa membentang penuh
  title1: { fontFamily: 'Helvetica', fontSize: 9.5, textTransform: 'uppercase', marginBottom: 1.5 }, // Kurangi sedikit ukurannya agar muat 1 baris
  title2: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12.5,
    textTransform: 'uppercase',
    marginTop: 2,
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  address: { fontFamily: 'Helvetica', fontSize: 8.5, marginBottom: 1 },
  line1: { borderBottomWidth: 3, borderBottomColor: '#000', marginBottom: 18 },

  // GLOBAL COMPONENTS
  header: { alignItems: 'center', marginBottom: 16 },
  headerTitle: {
    fontFamily: 'Helvetica-Bold',
    textDecoration: 'underline',
    fontSize: 11.5,
    marginBottom: 2,
  },
  headerNumber: { fontFamily: 'Helvetica-Bold', fontSize: 11.5 },
  row: { flexDirection: 'row', marginBottom: 4 },
  labelCol: { width: 75 },
  colonCol: { width: 10 },
  valueCol: { flex: 1, textAlign: 'justify' },

  // TANDA TANGAN
  ttdContainer: { alignItems: 'flex-end', marginTop: 30 },
  ttdBox: { width: 200 },
  ttdTitle: { fontFamily: 'Times-Bold', marginTop: 10, marginBottom: 50 },
  ttdName: { fontFamily: 'Times-Bold', textDecoration: 'underline' },

  // TABEL SPD
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#000',
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  tr: { flexDirection: 'row' },
  tdNum: {
    width: 30,
    borderWidth: 1,
    borderColor: '#000',
    borderTopWidth: 0,
    borderLeftWidth: 0,
    padding: 5,
    textAlign: 'center',
  },
  tdLabel: {
    width: '37%',
    borderWidth: 1,
    borderColor: '#000',
    borderTopWidth: 0,
    borderLeftWidth: 0,
    padding: 5,
  },
  tdVal: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#000',
    borderTopWidth: 0,
    borderLeftWidth: 0,
    padding: 5,
  },
});

// ─── SUB-COMPONENTS ────────────────────────────────────────────────────────
const KopSurat = () => (
  <View>
    <View style={styles.kopContainer}>
      <View style={styles.logoBox}>
        {/* Mengambil logo dari folder public/logo-imigrasi.png menggunakan absolute URL */}
        <Image src={window.location.origin + '/logo-imigrasi.png'} style={styles.logo} />
      </View>
      <View style={styles.kopText}>
        <Text style={styles.title1}>
          Kementerian Imigrasi dan Pemasyarakatan Republik Indonesia
        </Text>
        <Text style={styles.title1}>Direktorat Jenderal Imigrasi</Text>
        <Text style={styles.title1}>Kantor Wilayah Direktorat Jenderal Imigrasi Bali</Text>
        <Text style={styles.title2}>Kantor Imigrasi Kelas II TPI Singaraja</Text>
        <Text style={styles.address}>
          Jl. Raya Singaraja Seririt, Pemaron, Buleleng, Bali. Telepon ( 0362 ) 32174
        </Text>
        <Text style={styles.address}>
          Laman: www.singaraja.imigrasi.go.id Pos-el: kanim_singaraja@imigrasi.go.id
        </Text>
      </View>
    </View>
    <View style={styles.line1} />
  </View>
);

const SuratPerintah = ({ data }) => (
  <View>
    <View style={styles.header}>
      <Text style={styles.headerTitle}>SURAT PERINTAH</Text>
      <Text>NOMOR : {data['nomor_sp'] || 'WIM.20.IMI.3.UM.02.07-[ ...]'}</Text>
    </View>

    <View style={{ marginBottom: 10 }}>
      <View style={styles.row}>
        <Text style={styles.labelCol}>Menimbang</Text>
        <Text style={styles.colonCol}>:</Text>
        <Text style={styles.valueCol}>{data['menimbang']}</Text>
      </View>
      <View style={[styles.row, { marginBottom: 10 }]} wrap={false}>
        <Text style={styles.labelCol}>Dasar</Text>
        <Text style={styles.colonCol}>:</Text>
        <View style={styles.valueCol}>
          {Array.isArray(data['dasar']) ? (
            data['dasar'].map((poin, idx) => (
              <View key={idx} style={{ flexDirection: 'row', marginBottom: 2 }}>
                <Text style={{ width: 15 }}>{idx + 1}.</Text>
                <Text style={{ flex: 1, textAlign: 'justify' }}>{poin || '...'}</Text>
              </View>
            ))
          ) : (
            <Text style={{ textAlign: 'justify' }}>{data['dasar']}</Text>
          )}
        </View>
      </View>
    </View>

    <Text style={{ fontFamily: 'Times-Bold', textAlign: 'center', marginTop: 5, marginBottom: 10 }}>
      MENUGASKAN :
    </Text>

    <View style={styles.row}>
      <Text style={styles.labelCol}>Kepada</Text>
      <Text style={styles.colonCol}>:</Text>
      <View style={styles.valueCol}>
        {data['pegawai_list']?.length > 0 ? (
          data['pegawai_list'].map((p, i) => {
            const l = p.split('\n');
            return (
              <View key={i} style={{ flexDirection: 'row', marginBottom: 10 }} wrap={false}>
                <Text style={{ width: 15 }}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <View style={styles.row}>
                    <Text style={{ width: 50 }}>Nama</Text>
                    <Text style={styles.colonCol}>:</Text>
                    <Text style={{ fontFamily: 'Times-Bold' }}>{l[0]}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={{ width: 50 }}>NIP</Text>
                    <Text style={styles.colonCol}>:</Text>
                    <Text>{l[1]?.replace('NIP. ', '') || '-'}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={{ width: 50 }}>Pangkat</Text>
                    <Text style={styles.colonCol}>:</Text>
                    <Text>{l[2]?.replace('Pangkat: ', '') || '-'}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={{ width: 50 }}>Jabatan</Text>
                    <Text style={styles.colonCol}>:</Text>
                    <Text>{l[3]?.replace('Jabatan: ', '') || '-'}</Text>
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <Text style={{ fontStyle: 'italic', color: 'gray' }}>Belum ada pegawai dipilih...</Text>
        )}
      </View>
    </View>

    <View style={[styles.row, { marginTop: 5 }]} wrap={false}>
      <Text style={styles.labelCol}>Untuk</Text>
      <Text style={styles.colonCol}>:</Text>
      <View style={styles.valueCol}>
        <View style={{ flexDirection: 'row', marginBottom: 3 }}>
          <Text style={{ width: 15 }}>1.</Text>
          <Text style={styles.valueCol}>{data['kegiatan_poin_1'] || 'Melaksanakan tugas...'}</Text>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 3 }}>
          <Text style={{ width: 15 }}>2.</Text>
          <Text style={styles.valueCol}>Melaksanakan tugas ini dengan penuh tanggung jawab;</Text>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 3 }}>
          <Text style={{ width: 15 }}>3.</Text>
          <Text style={styles.valueCol}>
            Segera melaporkan hasil pelaksanaan tugas kepada Kepala Kantor Imigrasi Kelas II TPI
            Singaraja;
          </Text>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 3 }}>
          <Text style={{ width: 15 }}>4.</Text>
          <Text style={styles.valueCol}>Surat perintah ini berlaku sejak tanggal dikeluarkan.</Text>
        </View>
      </View>
    </View>

    <View style={styles.ttdContainer} wrap={false}>
      <View style={styles.ttdBox}>
        <View style={styles.row}>
          <Text style={styles.labelCol}>Dikeluarkan di</Text>
          <Text style={styles.colonCol}>:</Text>
          <Text style={styles.valueCol}>{data['tempat_terbit'] || 'Singaraja'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.labelCol}>Pada tanggal</Text>
          <Text style={styles.colonCol}>:</Text>
          <Text style={styles.valueCol}>{fmtDate(data['tanggal_sp'])}</Text>
        </View>

        <Text style={styles.ttdTitle}>Kepala Kantor Imigrasi{'\n'}Kelas II TPI Singaraja</Text>
        <Text style={styles.ttdName}>
          {data['pejabat_ttd']?.split('\n')[0] || '[Nama Pejabat]'}
        </Text>
        <Text>
          NIP. {data['pejabat_ttd']?.split('\n')[1]?.replace('NIP. ', '') || '000000000000000000'}
        </Text>
      </View>
    </View>
  </View>
);

const SuratPerjalananDinas = ({ data }) => {
  const rows = [
    [
      1,
      'Pejabat Pembuat Komitmen',
      <Text>
        Kantor Imigrasi Kelas II Singaraja{'\n'}
        <Text style={{ fontFamily: 'Times-Bold' }}>
          {data['ppk']?.split('\n')[0]?.toUpperCase() || '[NAMA PPK]'}
        </Text>
      </Text>,
    ],
    [
      2,
      'Nama/ NIP pegawai yang melaksanakan tugas',
      <Text style={{ fontFamily: 'Times-Bold' }}>
        {data['pegawai']?.split('\n')[0]?.toUpperCase() || '[NAMA PEGAWAI]'}
        {'\n'}
        <Text style={{ fontFamily: 'Times-Roman' }}>
          {data['pegawai']?.split('\n')[1]?.replace('NIP. ', '') || '[NIP]'}
        </Text>
      </Text>,
    ],
    [
      3,
      <View>
        <Text>a. Pangkat dan Golongan</Text>
        <Text>b. Jabatan/Instansi</Text>
        <Text>c. Tingkat Biaya Perjalanan Dinas</Text>
      </View>,
      <View>
        <Text>a. {data['pegawai']?.split('\n')[2]?.replace('Pangkat: ', '') || '[Pangkat]'}</Text>
        <Text>
          b.{' '}
          {data['pegawai']?.split('\n')[3]?.replace('Jabatan: ', '')?.toUpperCase() || '[JABATAN]'}
        </Text>
        <Text>c. {data['tingkat_biaya'] || 'Tingkat C'}</Text>
      </View>,
    ],
    [4, 'Maksud Perjalanan Dinas', <Text>{data['maksud'] || '[Maksud perjalanan]'}</Text>],
    [
      5,
      'Alat Angkut Yang Digunakan',
      <Text>{data['alat_angkut'] ? data['alat_angkut'].toLowerCase() : 'kendaraan'}</Text>,
    ],
    [
      6,
      <View>
        <Text>a. Berangkat Dari</Text>
        <Text>b. Tempat Tujuan</Text>
      </View>,
      <View>
        <Text>a. {data['berangkat_dari'] || 'Singaraja'}</Text>
        <Text>b. {data['tempat_tujuan'] || '[Tujuan]'}</Text>
      </View>,
    ],
    [
      7,
      <View>
        <Text>a. Lama Perjalanan Dinas</Text>
        <Text>b. Tanggal Berangkat</Text>
        <Text>c. Tanggal Harus Kembali / Tiba Ditempat Baru</Text>
      </View>,
      <View>
        <Text>
          a.{' '}
          {(() => {
            if (data['tanggal_berangkat'] && data['tanggal_kembali']) {
              const start = new Date(data['tanggal_berangkat']);
              const end = new Date(data['tanggal_kembali']);
              const diffTime = end.getTime() - start.getTime();
              const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24))) + 1;
              return diffDays;
            }
            return '...';
          })()}
        </Text>
        <Text>b. {data['tanggal_berangkat'] ? fmtDateDash(data['tanggal_berangkat']) : '...'}</Text>
        <Text>c. {data['tanggal_kembali'] ? fmtDateDash(data['tanggal_kembali']) : '...'}</Text>
      </View>,
    ],
    [
      8,
      <View>
        <Text>Pengikut : Nama</Text>
        <Text>1.</Text>
        <Text>2.</Text>
        <Text>3.</Text>
      </View>,
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text>Tanggal lahir</Text>
        <Text>Keterangan</Text>
      </View>,
    ],
    [
      9,
      <View>
        <Text>Pembebanan Anggaran</Text>
        <Text>a. Instansi</Text>
        <Text>b. Akun</Text>
      </View>,
      <View>
        <Text>a. Kantor Imigrasi Kelas II TPI Singaraja</Text>
        <Text>b. {data['akun'] || '[Kode MAK]'}</Text>
      </View>,
    ],
    [10, 'Keterangan lain-lain', <Text></Text>],
  ];

  return (
    <View>
      <View
        style={{
          alignItems: 'flex-end',
          marginBottom: 20,
          fontSize: 10,
          fontFamily: 'Times-Roman',
        }}
      >
        <View style={{ width: 180 }}>
          <View style={{ flexDirection: 'row' }}>
            <Text style={{ width: 50 }}>Lembar ke I</Text>
            <Text>: </Text>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <Text style={{ width: 50 }}>Kode No.</Text>
            <Text>: </Text>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <Text style={{ width: 50 }}>Nomor</Text>
            <Text>: {data['nomor_spd'] || ''}</Text>
          </View>
        </View>
      </View>

      <View style={styles.header}>
        <Text
          style={{
            fontFamily: 'Helvetica-Bold',
            textDecoration: 'underline',
            fontSize: 12,
            marginBottom: 2,
          }}
        >
          SURAT PERJALANAN DINAS (SPD)
        </Text>
      </View>

      <View style={styles.table}>
        {rows.map(([no, label, val]) => (
          <View key={no} style={styles.tr} wrap={false}>
            <View style={styles.tdNum}>
              <Text>{no}</Text>
            </View>
            <View style={styles.tdLabel}>
              {typeof label === 'string' ? <Text>{label}</Text> : label}
            </View>
            <View style={styles.tdVal}>{typeof val === 'string' ? <Text>{val}</Text> : val}</View>
          </View>
        ))}
      </View>

      <View style={styles.ttdContainer} wrap={false}>
        <View style={styles.ttdBox}>
          <View style={styles.row}>
            <Text style={styles.labelCol}>Dikeluarkan di</Text>
            <Text style={styles.colonCol}>:</Text>
            <Text style={styles.valueCol}>{data['tempat_dikeluarkan'] || 'Singaraja'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.labelCol}>Tanggal</Text>
            <Text style={styles.colonCol}>:</Text>
            <Text style={styles.valueCol}>
              {data['tanggal_dikeluarkan'] ? fmtDateDash(data['tanggal_dikeluarkan']) : '...'}
            </Text>
          </View>

          <Text style={{ fontFamily: 'Times-Roman', marginTop: 2, marginBottom: 50 }}>
            Pejabat Pembuat Komitmen
          </Text>
          <Text style={{ fontFamily: 'Times-Roman' }}>
            {data['ppk']?.split('\n')[0]?.toUpperCase() || '[NAMA PPK]'}
          </Text>
          <Text>NIP. {data['ppk']?.split('\n')[1]?.replace('NIP. ', '') || '[NIP PPK]'}</Text>
        </View>
      </View>
    </View>
  );
};

// ─── DOKUMEN UTAMA ────────────────────────────────────────────────────────
const terbilang = (angka) => {
  const bilangan = [
    '',
    'satu',
    'dua',
    'tiga',
    'empat',
    'lima',
    'enam',
    'tujuh',
    'delapan',
    'sembilan',
    'sepuluh',
    'sebelas',
  ];
  let terbilangString = '';
  const num = Math.abs(angka);
  if (num < 12) {
    terbilangString = ' ' + bilangan[num];
  } else if (num < 20) {
    terbilangString = terbilang(num - 10) + ' belas';
  } else if (num < 100) {
    terbilangString = terbilang(Math.floor(num / 10)) + ' puluh' + terbilang(num % 10);
  } else if (num < 200) {
    terbilangString = ' seratus' + terbilang(num - 100);
  } else if (num < 1000) {
    terbilangString = terbilang(Math.floor(num / 100)) + ' ratus' + terbilang(num % 100);
  } else if (num < 2000) {
    terbilangString = ' seribu' + terbilang(num - 1000);
  } else if (num < 1000000) {
    terbilangString = terbilang(Math.floor(num / 1000)) + ' ribu' + terbilang(num % 1000);
  } else if (num < 1000000000) {
    terbilangString = terbilang(Math.floor(num / 1000000)) + ' juta' + terbilang(num % 1000000);
  } else if (num < 1000000000000) {
    terbilangString =
      terbilang(Math.floor(num / 1000000000)) + ' miliar' + terbilang(num % 1000000000);
  } else if (num < 1000000000000000) {
    terbilangString =
      terbilang(Math.floor(num / 1000000000000)) + ' triliun' + terbilang(num % 1000000000000);
  }
  return terbilangString;
};

const RincianSPBy = ({ data }) => {
  // Kelompokkan detail_transaksi berdasarkan pegawai
  const grouped = {};
  if (Array.isArray(data.detail_transaksi)) {
    data.detail_transaksi.forEach((row) => {
      const pName = row.pegawai || '[NAMA PEGAWAI]';
      if (data._filterPegawai && pName !== data._filterPegawai) return;

      if (!grouped[pName]) grouped[pName] = [];
      grouped[pName].push(row);
    });
  }

  const pages = Object.entries(grouped);
  if (pages.length === 0) {
    pages.push([data._filterPegawai || '[NAMA PEGAWAI]', []]);
  }

  const namaPpk = data.pejabat_ppk?.split('\n')[0] || '[NAMA PPK]';
  const nipPpk = data.pejabat_ppk?.split('\n')[1]?.replace('NIP. ', '') || '[NIP PPK]';
  const tglSpd = data.tanggal_mulai
    ? new Date(data.tanggal_mulai).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '[TANGGAL SPD]';
  const noSpd = data.nomor_sp || data.nomor_sp_ref || '[NOMOR SP]';
  const tglPembuatan = data.tanggal_spby ? fmtDateDash(data.tanggal_spby) : '[TANGGAL]';

  return (
    <>
      {pages.map(([pegawaiStr, rows], idx) => {
        // Parse pegawai string
        const pParts = pegawaiStr.split(' - ');
        let pNip = '';
        let pName = pegawaiStr;
        if (pParts.length > 1) {
          pNip = pParts[0];
          pName = pParts[1];
        }

        let pJabatan = '[JABATAN]';
        if (Array.isArray(data.pegawai_list)) {
          const match = data.pegawai_list.find((p) => p.includes(pName));
          if (match) {
            const mParts = match.split('\n');
            const jabLine = mParts.find((m) => m.startsWith('Jabatan:'));
            if (jabLine) pJabatan = jabLine.replace('Jabatan:', '').trim();
          }
        }

        let total = 0;
        rows.forEach((r) => {
          total += parseInt(r.jumlah?.toString().replace(/[^0-9]/g, ''), 10) || 0;
        });

        return (
          <Page
            key={idx}
            size="A4"
            style={{
              fontSize: 11,
              fontFamily: 'Times-Roman',
              paddingTop: 40,
              paddingLeft: 60,
              paddingRight: 40,
              paddingBottom: 40,
            }}
          >
            {/* Header */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontFamily: 'Times-Bold', fontSize: 11 }}>
                KEMENTERIAN IMIGRASI DAN PEMASYARAKATAN RI
              </Text>
              <Text style={{ fontFamily: 'Times-Bold', fontSize: 11 }}>
                KANTOR WILAYAH DIREKTORAT JENDERAL IMIGRASI BALI
              </Text>
              <Text style={{ fontFamily: 'Times-Bold', fontSize: 11 }}>
                KANTOR IMIGRASI KELAS II TPI SINGARAJA
              </Text>
              <Text style={{ fontFamily: 'Times-Bold', fontSize: 11 }}>
                Jl. Seririt - Singaraja, Pemaron
              </Text>
              <Text style={{ fontFamily: 'Times-Bold', fontSize: 11 }}>
                Telp. (0362) 32174 Fax. (0362) 31175
              </Text>
              <View style={{ borderBottom: '2px solid black', width: '100%', marginTop: 5 }} />
            </View>

            {/* Body */}
            <Text style={{ fontFamily: 'Times-Bold', fontSize: 11, marginBottom: 15 }}>
              Yang bertanda tangan di bawah ini:
            </Text>
            <View style={{ flexDirection: 'row', marginBottom: 5 }}>
              <View style={{ width: 100 }}>
                <Text>Nama</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text>: {pName}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', marginBottom: 5 }}>
              <View style={{ width: 100 }}>
                <Text>NIP</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text>: {pNip}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', marginBottom: 20 }}>
              <View style={{ width: 100 }}>
                <Text>Jabatan</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text>: {pJabatan}</Text>
              </View>
            </View>

            <Text style={{ marginBottom: 10, lineHeight: 1.5, textAlign: 'justify' }}>
              Berdasarkan Surat Perjalanan Dinas tanggal {tglSpd} nomor {noSpd}, dengan ini
              menyatakan dengan sesungguhnya bahwa:
            </Text>

            <View
              style={{ paddingLeft: 15, marginBottom: 20, lineHeight: 1.5, textAlign: 'justify' }}
            >
              <View style={{ flexDirection: 'row' }}>
                <Text style={{ width: 15 }}>1.</Text>
                <Text style={{ flex: 1 }}>
                  Biaya transportasi pegawai dan/atau biaya penginapan di bawah ini yang tidak dapat
                  diperoleh bukti-bukti pengeluaran meliputi:
                </Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <Text style={{ width: 15 }}>2.</Text>
                <Text style={{ flex: 1 }}>
                  Jumlah uang tersebut pada kolom di bawah benar-benar untuk pelaksanaan perjalanan
                  dinas dimaksud dan apabila dikemudian hari terdapat kelebihan atas pembayaran kami
                  bersedia menyetorkan kelebihan tersebut ke Kas Negara.
                </Text>
              </View>
            </View>

            <Text style={{ marginBottom: 10 }}>Perincian Biaya:</Text>

            {/* Tabel */}
            <View style={{ border: '1px solid black' }}>
              <View style={{ flexDirection: 'row', borderBottom: '1px solid black' }}>
                <View
                  style={{
                    width: '10%',
                    borderRight: '1px solid black',
                    padding: 5,
                    textAlign: 'center',
                  }}
                >
                  <Text style={{ fontFamily: 'Times-Bold' }}>No</Text>
                </View>
                <View
                  style={{
                    width: '60%',
                    borderRight: '1px solid black',
                    padding: 5,
                    textAlign: 'center',
                  }}
                >
                  <Text style={{ fontFamily: 'Times-Bold' }}>Keterangan</Text>
                </View>
                <View style={{ width: '30%', padding: 5, textAlign: 'center' }}>
                  <Text style={{ fontFamily: 'Times-Bold' }}>Jumlah (Rp)</Text>
                </View>
              </View>

              {rows.map((r, i) => (
                <View key={i} style={{ flexDirection: 'row', borderBottom: '1px solid black' }}>
                  <View
                    style={{
                      width: '10%',
                      borderRight: '1px solid black',
                      padding: 5,
                      textAlign: 'center',
                    }}
                  >
                    <Text>{i + 1}</Text>
                  </View>
                  <View style={{ width: '60%', borderRight: '1px solid black', padding: 5 }}>
                    <Text>{r.detail}</Text>
                  </View>
                  <View style={{ width: '30%', padding: 5, textAlign: 'right' }}>
                    <Text>
                      {new Intl.NumberFormat('id-ID').format(
                        parseInt(r.jumlah?.toString().replace(/[^0-9]/g, ''), 10) || 0,
                      )}
                    </Text>
                  </View>
                </View>
              ))}

              <View style={{ flexDirection: 'row' }}>
                <View
                  style={{
                    width: '70%',
                    borderRight: '1px solid black',
                    padding: 5,
                    textAlign: 'center',
                  }}
                >
                  <Text style={{ fontFamily: 'Times-Bold' }}>Jumlah</Text>
                </View>
                <View style={{ width: '30%', padding: 5, textAlign: 'right' }}>
                  <Text style={{ fontFamily: 'Times-Bold' }}>
                    {new Intl.NumberFormat('id-ID').format(total)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ height: 40 }}></View>

            {/* TTD */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <View style={{ width: 250, textAlign: 'center' }}>
                <Text style={{ marginBottom: 5 }}>Mengetahui / Menyetujui</Text>
                <Text style={{ marginBottom: 50 }}>Pejabat Pembuat Komitmen</Text>
                <Text style={{ fontFamily: 'Times-Bold' }}>{namaPpk.toUpperCase()}</Text>
                <Text>NIP. {nipPpk}</Text>
              </View>
              <View style={{ width: 250, textAlign: 'center' }}>
                <Text style={{ marginBottom: 5 }}>Singaraja, {tglPembuatan}</Text>
                <Text style={{ marginBottom: 50 }}>Yang Membuat Pernyataan</Text>
                <Text style={{ fontFamily: 'Times-Bold' }}>{pName.toUpperCase()}</Text>
                <Text>NIP. {pNip}</Text>
              </View>
            </View>
          </Page>
        );
      })}
    </>
  );
};

const Kwitansi = ({ data }) => {
  // Hitung total KESELURUHAN dari semua detail_transaksi
  let totalJumlah = 0;
  if (Array.isArray(data.detail_transaksi)) {
    totalJumlah = data.detail_transaksi.reduce((sum, row) => {
      const val = parseInt(row.jumlah?.toString().replace(/[^0-9]/g, ''), 10) || 0;
      return sum + val;
    }, 0);
  }

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 })
      .format(angka || 0)
      .replace(/,/g, '.');
  };

  // Penerima HANYA ORANG PERTAMA sebagai perwakilan
  const pegawaiPertama = data.detail_transaksi?.[0]?.pegawai || '[NAMA PENERIMA]';
  const parts = pegawaiPertama.split(' - ');
  const nipPenerima = parts[0] || '';
  const namaPenerima = parts[1] || pegawaiPertama;

  const namaPpk = data.pejabat_ppk?.split('\n')[0] || '[NAMA PPK]';
  const nipPpk = data.pejabat_ppk?.split('\n')[1]?.replace('NIP. ', '') || '[NIP PPK]';

  const namaBendahara = data.bendahara?.split('\n')[0] || '[NAMA BENDAHARA]';
  const nipBendahara = data.bendahara?.split('\n')[1]?.replace('NIP. ', '') || '[NIP BENDAHARA]';

  const mak = data.mak || '[Kode MAK]';
  const tanggal = data.tanggal_spby ? fmtDateDash(data.tanggal_spby) : '[Tanggal]';

  // Uraian untuk keseluruhan kwitansi diambil dari data.uraian induk
  const uraian = data.uraian || '[Uraian Pembayaran]';

  return (
    <Page
      size="A4"
      style={{
        ...styles.page,
        paddingTop: 40,
        paddingLeft: 40,
        paddingRight: 30,
        paddingBottom: 40,
      }}
    >
      <View style={{ fontSize: 11, fontFamily: 'Helvetica', lineHeight: 1.5, paddingTop: 20 }}>
        {/* HEADER */}
        <View style={{ alignItems: 'center', marginBottom: 30 }}>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 12 }}>
            KWITANSI / BUKTI PEMBAYARAN
          </Text>
        </View>

        <View style={{ flexDirection: 'row', marginBottom: 20 }}>
          <View style={{ width: 250 }}>
            <View style={{ flexDirection: 'row', marginBottom: 5 }}>
              <View style={{ width: 80 }}>
                <Text>Tahun</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text>: {tanggal.split('-')[2] || '2026'}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', marginBottom: 5 }}>
              <View style={{ width: 80 }}>
                <Text>MAK</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text>: {mak}</Text>
              </View>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', marginBottom: 5 }}>
              <View style={{ width: 80 }}>
                <Text>No Bukti</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text>: {data.nomor_surat || '[No Bukti]'}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 20 }}></View>

        <View style={{ flexDirection: 'row', marginBottom: 5 }}>
          <View style={{ width: 140 }}>
            <Text>Sudah diterima dari</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text>: Pejabat Pembuat Komitmen Satker Kantor Imigrasi Kelas II TPI Singaraja</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 5 }}>
          <View style={{ width: 140 }}>
            <Text>Jumlah Uang</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text>: Rp {formatRupiah(totalJumlah)}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 5 }}>
          <View style={{ width: 140 }}>
            <Text>Terbilang</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text>: {terbilang(totalJumlah).trim()} Rupiah</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 20 }}>
          <View style={{ width: 140 }}>
            <Text>Untuk Pembayaran</Text>
          </View>
          <View style={{ flex: 1, textAlign: 'justify' }}>
            <Text>: Biaya {uraian}</Text>
          </View>
        </View>

        <View style={{ height: 40 }}></View>

        {/* Penerima */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 40 }}>
          <View style={{ width: 250 }}>
            <Text style={{ marginBottom: 5 }}>Singaraja, {tanggal}</Text>
            <Text style={{ marginBottom: 50 }}>Yang Menerima</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{namaPenerima.toUpperCase()}</Text>
            <Text>NIP. {nipPenerima}</Text>
          </View>
        </View>

        {/* TTD PPK dan Bendahara */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
          <View style={{ width: 250 }}>
            <Text style={{ marginBottom: 5 }}>Setuju dibayar,</Text>
            <Text style={{ marginBottom: 50 }}>Pejabat Pembuat Komitmen</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{namaPpk.toUpperCase()}</Text>
            <Text>NIP. {nipPpk}</Text>
          </View>
          <View style={{ width: 250 }}>
            <Text style={{ marginBottom: 5 }}>Lunas dibayar,</Text>
            <Text style={{ marginBottom: 50 }}>Bendahara</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{namaBendahara.toUpperCase()}</Text>
            <Text>NIP. {nipBendahara}</Text>
          </View>
        </View>
      </View>
    </Page>
  );
};

const SuratPerintahBayar = ({ data }) => {
  let totalJumlah = 0;
  if (Array.isArray(data.detail_transaksi)) {
    totalJumlah = data.detail_transaksi.reduce((sum, row) => {
      const val = parseInt(row.jumlah?.toString().replace(/[^0-9]/g, ''), 10) || 0;
      return sum + val;
    }, 0);
  }
  const formatRupiah = (angka) =>
    new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(angka);

  const namaPenerimaFull = data.detail_transaksi?.[0]?.pegawai || '[NAMA PENERIMA]';
  const partsPenerima = namaPenerimaFull.split(' - ');
  const nipPenerima = partsPenerima[0] || '[NIP]';
  const namaPenerima = partsPenerima[1] || namaPenerimaFull;

  const ppkFull = data.pejabat_ppk || '[NAMA PPK]\nNIP. [NIP]';
  const namaPpk = ppkFull.split('\n')[0];
  const nipPpk = ppkFull.split('\n')[1]?.replace('NIP. ', '') || '';

  const bendaharaFull = data.bendahara || '[NAMA BENDAHARA]\nNIP. [NIP]';
  const namaBendahara = bendaharaFull.split('\n')[0];
  const nipBendahara = bendaharaFull.split('\n')[1]?.replace('NIP. ', '') || '';

  const uraian = data.uraian || data.detail_transaksi?.[0]?.uraian || '[Uraian Pembayaran]';
  const makFull = data.mak || '[Kode MAK]';
  const makOutput = makFull.split(' ').pop() || makFull;

  const tanggal = data.tanggal_spby ? fmtDateDash(data.tanggal_spby) : '[Tanggal]';
  const idValue = data.nomor_bundle || '...';
  const nomorPb = `/PB/692951/${data.tanggal_spby ? data.tanggal_spby.split('-')[0] : '2026'}`;

  return (
    <View style={{ fontSize: 10, fontFamily: 'Helvetica', lineHeight: 1.5, paddingTop: 10 }}>
      {/* HEADER */}
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>
          KEMENTERIAN IMIGRASI DAN PEMASYARAKATAN
        </Text>
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>
          KANTOR IMIGRASI KELAS II TPI SINGARAJA (692951)
        </Text>
        <Text style={{ fontFamily: 'Helvetica-Bold', marginTop: 10 }}>SURAT PERINTAH BAYAR</Text>
      </View>

      <Text style={{ marginBottom: 4 }}>id : {idValue}</Text>

      {/* TABLE */}
      <View
        style={{
          borderTop: '1px solid black',
          borderLeft: '1px solid black',
          borderRight: '1px solid black',
        }}
      >
        {/* ROW 1 */}
        <View style={{ flexDirection: 'row', borderBottom: '1px solid black' }}>
          <View style={{ width: '50%', borderRight: '1px solid black', flexDirection: 'row' }}>
            <View style={{ width: '30%', padding: 4 }}>
              <Text>Tanggal</Text>
            </View>
            <View style={{ width: '70%', padding: 4, borderLeft: '1px solid black' }}>
              <Text>: {tanggal}</Text>
            </View>
          </View>
          <View style={{ width: '50%', flexDirection: 'row' }}>
            <View style={{ width: '30%', padding: 4 }}>
              <Text>Nomor :</Text>
            </View>
            <View style={{ width: '70%', padding: 4, borderLeft: '1px solid black' }}>
              <Text>{nomorPb}</Text>
            </View>
          </View>
        </View>

        {/* ROW 2 */}
        <View style={{ borderBottom: '1px solid black', padding: '8 4' }}>
          <Text>
            Saya yang bertanda tangan di bawah ini Pejabat Pembuat Komitmen memerintahkan Bendahara
            Pengeluaran agar melakukan pembayaran sejumlah uang :
          </Text>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 12, marginTop: 10 }}>
            Rp {formatRupiah(totalJumlah)}
          </Text>
        </View>

        {/* ROW 3 */}
        <View style={{ borderBottom: '1px solid black', padding: 4 }}>
          <Text>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Terbilang: </Text>
            {terbilang(totalJumlah).trim()} Rupiah
          </Text>
        </View>

        {/* ROW 4 */}
        <View style={{ flexDirection: 'row', borderBottom: '1px solid black' }}>
          <View style={{ width: '30%', padding: 4 }}>
            <Text>Kepada</Text>
          </View>
          <View style={{ width: '70%', padding: 4, borderLeft: '1px solid black' }}>
            <Text>: {namaPenerima.toUpperCase()}</Text>
          </View>
        </View>

        {/* ROW 5 */}
        <View style={{ flexDirection: 'row', borderBottom: '1px solid black' }}>
          <View style={{ width: '30%', padding: 4 }}>
            <Text>Untuk Pembayaran</Text>
          </View>
          <View
            style={{
              width: '70%',
              padding: 4,
              borderLeft: '1px solid black',
              textAlign: 'justify',
            }}
          >
            <Text>: {uraian}</Text>
          </View>
        </View>

        {/* ROW 6 */}
        <View style={{ borderBottom: '1px solid black', padding: 4 }}>
          <Text>Atas dasar :</Text>
        </View>

        {/* ROW 7 */}
        <View style={{ borderBottom: '1px solid black', padding: 4 }}>
          <Text>1. Kwitansi / Bukti pembelian :</Text>
        </View>

        {/* ROW 8 */}
        <View style={{ borderBottom: '1px solid black', padding: 4 }}>
          <Text>2. Nota / Bukti penermaan barang /jasa :</Text>
        </View>

        {/* ROW 9 */}
        <View style={{ flexDirection: 'row', borderBottom: '1px solid black' }}>
          <View style={{ width: '40%', padding: 4 }}>
            <Text>Dibebankan pada :</Text>
          </View>
          <View style={{ width: '60%', padding: 4, borderLeft: '1px solid black' }}>
            <Text></Text>
          </View>
        </View>

        {/* ROW 10 */}
        <View style={{ flexDirection: 'row', borderBottom: '1px solid black' }}>
          <View style={{ width: '40%', padding: 4 }}>
            <Text>Kegiatan output MAK</Text>
          </View>
          <View style={{ width: '60%', padding: 4, borderLeft: '1px solid black' }}>
            <Text>: {makOutput}</Text>
          </View>
        </View>

        {/* ROW 11 */}
        <View style={{ flexDirection: 'row', borderBottom: '1px solid black' }}>
          <View style={{ width: '40%', padding: 4 }}>
            <Text>Kode :</Text>
          </View>
          <View style={{ width: '60%', padding: 4, borderLeft: '1px solid black' }}>
            <Text>: {makFull}</Text>
          </View>
        </View>
      </View>

      {/* SIGNATURES */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 }}>
        {/* Left */}
        <View style={{ width: '30%' }}>
          <Text>Setuju dibayar,</Text>
          <Text>Bendahara Pengeluaran</Text>
          <View style={{ height: 50 }} />
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>{namaBendahara.toUpperCase()}</Text>
          <Text>NIP. {nipBendahara}</Text>
        </View>

        {/* Middle */}
        <View style={{ width: '30%' }}>
          <Text>Diterima,</Text>
          <Text>Penerima Uang</Text>
          <View style={{ height: 50 }} />
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>{namaPenerima.toUpperCase()}</Text>
          <Text>NIP. {nipPenerima}</Text>
        </View>

        {/* Right */}
        <View style={{ width: '30%' }}>
          <Text>Singaraja, {tanggal}</Text>
          <Text>Pejabat Pembuat Komitmen</Text>
          <View style={{ height: 50 }} />
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>{namaPpk.toUpperCase()}</Text>
          <Text>NIP. {nipPpk}</Text>
        </View>
      </View>
    </View>
  );
};

const RincianPerjalananTugas = ({ data }) => {
  // Group by employee
  const transaksiByPegawai = {};
  if (Array.isArray(data.detail_transaksi)) {
    data.detail_transaksi.forEach((row) => {
      const peg = row.pegawai || '[NAMA PEGAWAI]';
      // Filter jika _filterPegawai diberikan
      if (data._filterPegawai && peg !== data._filterPegawai) return;

      if (!transaksiByPegawai[peg]) transaksiByPegawai[peg] = [];
      transaksiByPegawai[peg].push(row);
    });
  }

  if (Object.keys(transaksiByPegawai).length === 0) {
    transaksiByPegawai[data._filterPegawai || '[NAMA PEGAWAI]'] = [
      { uraian: 'Uang Harian', jumlah: 0 },
    ];
  }

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 })
      .format(angka || 0)
      .replace(/,/g, '.');
  };

  const tanggalSp = data.tanggal_sp ? fmtDateDash(data.tanggal_sp) : '[Tanggal SP]';
  const nomorSp = data.nomor_sp || '[Nomor SP]';
  const tanggalSpby = data.tanggal_spby ? fmtDateDash(data.tanggal_spby) : '[Tanggal]';

  const bendaharaFull = data.bendahara || '[NAMA BENDAHARA]\nNIP. [NIP]';
  const namaBendahara = bendaharaFull.split('\n')[0];
  const nipBendahara = bendaharaFull.split('\n')[1]?.replace('NIP. ', '') || '';

  const ppkFull = data.pejabat_ppk || '[NAMA PPK]\nNIP. [NIP]';
  const namaPpk = ppkFull.split('\n')[0];
  const nipPpk = ppkFull.split('\n')[1]?.replace('NIP. ', '') || '';

  return (
    <>
      {Object.entries(transaksiByPegawai).map(([pegawaiStr, rows], index) => {
        // Parse nama dan NIP pegawai
        const partsPenerima = pegawaiStr.split(' - ');
        let nipPenerima = partsPenerima[0] || '[NIP]';
        let namaPenerima = partsPenerima[1] || pegawaiStr;
        // fallback if dash isn't used
        if (partsPenerima.length === 1) {
          nipPenerima = '';
          namaPenerima = pegawaiStr;
        }

        let totalJumlah = rows.reduce((sum, r) => {
          const val = parseInt(r.jumlah?.toString().replace(/[^0-9]/g, ''), 10) || 0;
          return sum + val;
        }, 0);

        return (
          <Page
            key={index}
            size="A4"
            style={{
              ...styles.page,
              paddingTop: 40,
              paddingLeft: 40,
              paddingRight: 40,
              paddingBottom: 40,
            }}
          >
            {/* KOP SURAT (simplified text only per user image) */}
            <View style={{ alignItems: 'center', marginBottom: 15 }}>
              <Text style={{ fontFamily: 'Times-Bold', fontSize: 11 }}>
                KEMENTERIAN IMIGRASI DAN PEMASYARAKATAN RI
              </Text>
              <Text style={{ fontFamily: 'Times-Bold', fontSize: 11 }}>
                KANTOR WILAYAH DIREKTORAT JENDERAL IMIGRASI BALI
              </Text>
              <Text style={{ fontFamily: 'Times-Bold', fontSize: 11 }}>
                KANTOR IMIGRASI KELAS II TPI SINGARAJA
              </Text>
              <Text style={{ fontSize: 10, fontFamily: 'Times-Roman' }}>
                Jl. Seririt - Singaraja, Pemaron
              </Text>
              <Text style={{ fontSize: 10, fontFamily: 'Times-Roman' }}>
                Telp. (0362) 32174 Fax. (0362) 31175
              </Text>
            </View>
            <View style={{ borderBottom: '2px solid black', marginBottom: 15 }} />

            {/* TITLE */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontFamily: 'Times-Bold', fontSize: 11 }}>
                RINCIAN BIAYA PERJALANAN DINAS
              </Text>
            </View>

            {/* INFO */}
            <View
              style={{ fontSize: 10, fontFamily: 'Times-Roman', marginBottom: 15, lineHeight: 1.5 }}
            >
              <View style={{ flexDirection: 'row' }}>
                <Text style={{ width: 180 }}>Lampiran Surat Perintah Nomor</Text>
                <Text>: {nomorSp},</Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <Text style={{ width: 180 }}>Tanggal</Text>
                <Text>: {tanggalSp}</Text>
              </View>
            </View>

            {/* TABLE */}
            <View
              style={{
                borderTop: '1px solid black',
                borderLeft: '1px solid black',
                fontSize: 10,
                fontFamily: 'Times-Roman',
                marginBottom: 20,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  borderBottom: '1px solid black',
                  fontFamily: 'Times-Bold',
                  textAlign: 'center',
                  alignItems: 'center',
                }}
              >
                <View style={{ width: '8%', borderRight: '1px solid black', padding: 4 }}>
                  <Text>No</Text>
                </View>
                <View style={{ width: '52%', borderRight: '1px solid black', padding: 4 }}>
                  <Text>Perincian Biaya</Text>
                </View>
                <View style={{ width: '20%', borderRight: '1px solid black', padding: 4 }}>
                  <Text>Jumlah (Rp)</Text>
                </View>
                <View style={{ width: '20%', borderRight: '1px solid black', padding: 4 }}>
                  <Text>Keterangan</Text>
                </View>
              </View>

              {rows.map((r, i) => {
                const kodeNama = [r.itemKode, r.itemName].filter(Boolean).join('. ');
                const textUraian = [kodeNama, r.uraian].filter(Boolean).join('\n');
                return (
                  <View key={i} style={{ flexDirection: 'row', borderBottom: '1px solid black' }}>
                    <View
                      style={{
                        width: '8%',
                        borderRight: '1px solid black',
                        padding: 4,
                        textAlign: 'center',
                      }}
                    >
                      <Text>{i + 1}</Text>
                    </View>
                    <View style={{ width: '52%', borderRight: '1px solid black', padding: 4 }}>
                      <Text>{textUraian || '[Perincian Biaya]'}</Text>
                    </View>
                    <View
                      style={{
                        width: '20%',
                        borderRight: '1px solid black',
                        padding: 4,
                        textAlign: 'right',
                      }}
                    >
                      <Text>{formatRupiah(r.jumlah)}</Text>
                    </View>
                    <View style={{ width: '20%', borderRight: '1px solid black', padding: 4 }}>
                      <Text></Text>
                    </View>
                  </View>
                );
              })}

              <View
                style={{
                  flexDirection: 'row',
                  borderBottom: '1px solid black',
                  fontFamily: 'Times-Bold',
                }}
              >
                <View
                  style={{
                    width: '60%',
                    borderRight: '1px solid black',
                    padding: 4,
                    textAlign: 'center',
                  }}
                >
                  <Text>Jumlah</Text>
                </View>
                <View
                  style={{
                    width: '20%',
                    borderRight: '1px solid black',
                    padding: 4,
                    textAlign: 'right',
                  }}
                >
                  <Text>{formatRupiah(totalJumlah)}</Text>
                </View>
                <View style={{ width: '20%', borderRight: '1px solid black', padding: 4 }}>
                  <Text></Text>
                </View>
              </View>
            </View>

            {/* SIGNATURES 1 */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                fontSize: 10,
                fontFamily: 'Times-Roman',
                textAlign: 'center',
                marginBottom: 40,
              }}
            >
              <View style={{ width: '45%' }}>
                <Text>Telah dibayarkan sejumlah :</Text>
                <Text>Rp. {formatRupiah(totalJumlah)}</Text>
                <Text>Bendahara Pengeluaran</Text>
                <View style={{ height: 50 }} />
                <Text style={{ fontFamily: 'Times-Bold' }}>{namaBendahara.toUpperCase()}</Text>
                <Text>NIP. {nipBendahara}</Text>
              </View>

              <View style={{ width: '45%' }}>
                <Text>Singaraja, {tanggalSpby}</Text>
                <Text>Telah menerima jumlah uang sebesar :</Text>
                <Text>Rp. {formatRupiah(totalJumlah)}</Text>
                <Text>Yang Membuat Pernyataan</Text>
                <View style={{ height: 50 }} />
                <Text style={{ fontFamily: 'Times-Bold' }}>{namaPenerima.toUpperCase()}</Text>
                {nipPenerima && <Text>NIP. {nipPenerima}</Text>}
              </View>
            </View>

            {/* SIGNATURES 2 */}
            <View style={{ fontSize: 10, fontFamily: 'Times-Roman', marginTop: 10 }}>
              <Text style={{ fontFamily: 'Times-Bold', textAlign: 'center', marginBottom: 15 }}>
                PEHITUNGAN SPD RAMPUNG
              </Text>

              <View style={{ flexDirection: 'row', marginBottom: 2 }}>
                <Text style={{ width: 180 }}>Ditetapkan sejumlah</Text>
                <Text>Rp. {formatRupiah(totalJumlah)}</Text>
              </View>
              <View style={{ flexDirection: 'row', marginBottom: 2 }}>
                <Text style={{ width: 180 }}>Yang harus dibayarkan sejumlah</Text>
                <Text>Rp. {formatRupiah(totalJumlah)}</Text>
              </View>
              <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                <Text style={{ width: 180 }}>Sisa yang harus dibayarkan</Text>
                <Text>Rp. -</Text>
              </View>

              <View style={{ alignItems: 'center', marginTop: 10 }}>
                <Text>Pejabat Pembuat Komitmen</Text>
                <View style={{ height: 50 }} />
                <Text style={{ fontFamily: 'Times-Bold' }}>{namaPpk.toUpperCase()}</Text>
                <Text>NIP. {nipPpk}</Text>
              </View>
            </View>
          </Page>
        );
      })}
    </>
  );
};

const Nominatif = ({ data }) => {
  const expenseColumnsMap = new Map();
  const pegawaiMap = {};

  if (Array.isArray(data.detail_transaksi)) {
    data.detail_transaksi.forEach((row) => {
      const peg = row.pegawai || '[NAMA PEGAWAI]';
      const parts = peg.split(' - ');
      const namaPendek = parts[1] || parts[0];

      if (!pegawaiMap[namaPendek]) {
        pegawaiMap[namaPendek] = {
          nama: namaPendek,
          expenses: {},
          total: 0,
        };
      }

      const kodeNama =
        [row.itemKode, row.itemName].filter(Boolean).join('. ') || row.uraian || 'Biaya Lainnya';
      if (!expenseColumnsMap.has(kodeNama)) {
        expenseColumnsMap.set(kodeNama, kodeNama);
      }

      const val = parseInt(row.jumlah?.toString().replace(/[^0-9]/g, ''), 10) || 0;
      pegawaiMap[namaPendek].expenses[kodeNama] =
        (pegawaiMap[namaPendek].expenses[kodeNama] || 0) + val;
      pegawaiMap[namaPendek].total += val;
    });
  }

  const expenseColumns = Array.from(expenseColumnsMap.keys());
  const rows = Object.values(pegawaiMap);

  const formatRupiah = (angka) =>
    new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 })
      .format(angka || 0)
      .replace(/,/g, '.');

  const namaPpk = data.pejabat_ppk?.split('\n')[0] || '[NAMA PPK]';
  const nipPpk = data.pejabat_ppk?.split('\n')[1]?.replace('NIP. ', '') || '[NIP PPK]';
  const namaBendahara = data.bendahara?.split('\n')[0] || '[NAMA BENDAHARA]';
  const nipBendahara = data.bendahara?.split('\n')[1]?.replace('NIP. ', '') || '[NIP BENDAHARA]';
  const tanggal = data.tanggal_spby ? fmtDateDash(data.tanggal_spby) : '[Tanggal]';

  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);

  const getPegawaiInfo = (namaPendek) => {
    let pNama = namaPendek;
    let pNip = '';
    let pJabatan = '';

    if (Array.isArray(data.pegawai_list)) {
      const found = data.pegawai_list.find((p) =>
        p.toUpperCase().includes(namaPendek.toUpperCase()),
      );
      if (found) {
        const lines = found.split('\n');
        pNama = lines[0];
        pNip = lines.find((l) => l.startsWith('NIP')) || '';
        pJabatan =
          lines
            .find((l) => l.startsWith('Jabatan'))
            ?.replace('Jabatan: ', '')
            ?.replace('Jabatan : ', '') || '';
      }
    }
    return { pNama, pNip, pJabatan };
  };

  // Calculate lama
  let lama = data.lama_perjalanan;
  if (!lama && data.tanggal_berangkat && data.tanggal_kembali) {
    const start = new Date(data.tanggal_berangkat);
    const end = new Date(data.tanggal_kembali);
    const diffTime = Math.abs(end - start);
    lama = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
  if (!lama) lama = '-';

  const fixedTotal = 4 + 18 + 10 + 10 + 5 + 10 + 10 + 8; // 75
  const dynWidth = expenseColumns.length > 0 ? 25 / expenseColumns.length : 10;

  return (
    <Page
      size="A4"
      orientation="landscape"
      style={{
        ...styles.page,
        paddingTop: 30,
        paddingLeft: 30,
        paddingRight: 30,
        paddingBottom: 30,
      }}
    >
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 11 }}>
          DAFTAR NOMINATIF PEMBAYARAN PERJALANAN DINAS
        </Text>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 11 }}>
          KANTOR IMIGRASI KELAS II TPI SINGARAJA
        </Text>
      </View>

      <View
        style={{
          borderTop: '1px solid black',
          borderLeft: '1px solid black',
          fontSize: 9,
          fontFamily: 'Helvetica',
        }}
      >
        {/* HEADER */}
        <View
          style={{
            flexDirection: 'row',
            borderBottom: '1px solid black',
            fontFamily: 'Helvetica-Bold',
            textAlign: 'center',
            alignItems: 'stretch',
          }}
        >
          <View
            style={{
              width: '4%',
              borderRight: '1px solid black',
              padding: 4,
              justifyContent: 'center',
            }}
          >
            <Text>No</Text>
          </View>
          <View
            style={{
              width: '18%',
              borderRight: '1px solid black',
              padding: 4,
              justifyContent: 'center',
            }}
          >
            <Text>URAIAN</Text>
          </View>
          <View
            style={{
              width: '10%',
              borderRight: '1px solid black',
              padding: 4,
              justifyContent: 'center',
            }}
          >
            <Text>Tujuan</Text>
          </View>
          <View
            style={{
              width: '10%',
              borderRight: '1px solid black',
              padding: 4,
              justifyContent: 'center',
            }}
          >
            <Text>Tgl Berangkat</Text>
          </View>
          <View
            style={{
              width: '5%',
              borderRight: '1px solid black',
              padding: 4,
              justifyContent: 'center',
            }}
          >
            <Text>Lama</Text>
          </View>
          {expenseColumns.map((col, idx) => (
            <View
              key={idx}
              style={{
                width: `${dynWidth}%`,
                borderRight: '1px solid black',
                padding: 4,
                justifyContent: 'center',
              }}
            >
              <Text>{col}</Text>
            </View>
          ))}
          <View
            style={{
              width: '10%',
              borderRight: '1px solid black',
              padding: 4,
              justifyContent: 'center',
            }}
          >
            <Text>Total</Text>
          </View>
          <View
            style={{
              width: '10%',
              borderRight: '1px solid black',
              padding: 4,
              justifyContent: 'center',
            }}
          >
            <Text>No Rek</Text>
          </View>
          <View
            style={{
              width: '8%',
              borderRight: '1px solid black',
              padding: 4,
              justifyContent: 'center',
            }}
          >
            <Text>TTD</Text>
          </View>
        </View>

        {/* ROWS */}
        {rows.map((r, idx) => {
          const info = getPegawaiInfo(r.nama);
          return (
            <View key={idx} style={{ flexDirection: 'row', borderBottom: '1px solid black' }}>
              <View
                style={{
                  width: '4%',
                  borderRight: '1px solid black',
                  padding: 4,
                  textAlign: 'center',
                }}
              >
                <Text>{idx + 1}</Text>
              </View>
              <View style={{ width: '18%', borderRight: '1px solid black', padding: 4 }}>
                <Text>{info.pNama.toUpperCase()}</Text>
                {info.pNip && <Text>{info.pNip}</Text>}
                {info.pJabatan && <Text>{info.pJabatan.toUpperCase()}</Text>}
              </View>
              <View
                style={{
                  width: '10%',
                  borderRight: '1px solid black',
                  padding: 4,
                  textAlign: 'center',
                }}
              >
                <Text>{data.tempat_tujuan || 'Denpasar'}</Text>
              </View>
              <View
                style={{
                  width: '10%',
                  borderRight: '1px solid black',
                  padding: 4,
                  textAlign: 'center',
                }}
              >
                <Text>{data.tanggal_berangkat ? fmtDateDash(data.tanggal_berangkat) : ''}</Text>
              </View>
              <View
                style={{
                  width: '5%',
                  borderRight: '1px solid black',
                  padding: 4,
                  textAlign: 'center',
                }}
              >
                <Text>{lama}</Text>
              </View>

              {expenseColumns.map((col, cIdx) => (
                <View
                  key={cIdx}
                  style={{
                    width: `${dynWidth}%`,
                    borderRight: '1px solid black',
                    padding: 4,
                    textAlign: 'right',
                  }}
                >
                  <Text>{formatRupiah(r.expenses[col])}</Text>
                </View>
              ))}

              <View
                style={{
                  width: '10%',
                  borderRight: '1px solid black',
                  padding: 4,
                  textAlign: 'right',
                  fontFamily: 'Helvetica-Bold',
                }}
              >
                <Text>{formatRupiah(r.total)}</Text>
              </View>
              <View style={{ width: '10%', borderRight: '1px solid black', padding: 4 }}></View>
              <View style={{ width: '8%', borderRight: '1px solid black', padding: 4 }}></View>
            </View>
          );
        })}

        {/* FOOTER JUMLAH: total per item + total keseluruhan */}
        <View
          style={{
            flexDirection: 'row',
            borderBottom: '1px solid black',
            fontFamily: 'Helvetica-Bold',
          }}
        >
          <View
            style={{
              width: `${4 + 18 + 10 + 10 + 5}%`,
              borderRight: '1px solid black',
              padding: 4,
              textAlign: 'center',
            }}
          >
            <Text>Jumlah</Text>
          </View>
          {expenseColumns.map((col, cIdx) => (
            <View
              key={cIdx}
              style={{
                width: `${dynWidth}%`,
                borderRight: '1px solid black',
                padding: 4,
                textAlign: 'right',
              }}
            >
              <Text>{formatRupiah(rows.reduce((sum, r) => sum + (r.expenses[col] || 0), 0))}</Text>
            </View>
          ))}
          <View
            style={{ width: '10%', borderRight: '1px solid black', padding: 4, textAlign: 'right' }}
          >
            <Text>{formatRupiah(grandTotal)}</Text>
          </View>
          <View style={{ width: '18%', borderRight: '1px solid black', padding: 4 }}></View>
        </View>
      </View>

      <Text style={{ fontSize: 9, marginTop: 4 }}>id : {data.nomor_bundle || '...'}</Text>

      {/* SIGNATURES */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 30,
          fontSize: 10,
          textAlign: 'center',
        }}
      >
        <View style={{ width: '40%' }}>
          <Text>Mengetahui,</Text>
          <Text>Pejabat Pembuat Komitmen</Text>
          <View style={{ height: 60 }} />
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>{namaPpk.toUpperCase()}</Text>
          <Text>NIP. {nipPpk}</Text>
        </View>
        <View style={{ width: '40%' }}>
          <Text>Singaraja, {tanggal}</Text>
          <Text>Bendahara Pengeluaran</Text>
          <View style={{ height: 60 }} />
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>{namaBendahara.toUpperCase()}</Text>
          <Text>NIP. {nipBendahara}</Text>
        </View>
      </View>
    </Page>
  );
};

const SPTJMPelaksana = ({ data, packItem }) => {
  let pegawaiName = packItem?.assigned_name || '[NAMA PEGAWAI]';
  let nip = '[NIP]';
  let jabatan = '[JABATAN]';

  // SPTJM tanpa penugasan (paket lama, satu SPTJM per paket): pakai pegawai pertama
  if (
    !packItem?.assigned_name &&
    Array.isArray(data.pegawai_list) &&
    data.pegawai_list.length > 0
  ) {
    const lines = data.pegawai_list[0].split('\n');
    pegawaiName = lines[0] || '[NAMA PEGAWAI]';
    nip = lines[1]?.replace('NIP. ', '') || '[NIP]';
    jabatan = lines[3]?.replace('Jabatan: ', '') || '[JABATAN]';
  } else if (packItem && Array.isArray(data.pegawai_list)) {
    const match = data.pegawai_list.find((p) => p.includes(pegawaiName));
    if (match) {
      const lines = match.split('\n');
      nip = lines[1]?.replace('NIP. ', '') || nip;
      jabatan = lines[3]?.replace('Jabatan: ', '') || jabatan;
    }
  } else if (packItem && !data.pegawai_list) {
    const parts = packItem._filterPegawai
      ? packItem._filterPegawai.split(' - ')
      : pegawaiName.split(' - ');
    if (parts.length > 1) {
      nip = parts[0];
      pegawaiName = parts[1];
    }
  }

  const nomorSp = data.nomor_sp || data.nomor_sp_ref || '[Nomor SP]';
  const tglSp = data.tanggal_sp
    ? fmtDateDash(data.tanggal_sp)
    : data.tanggal_mulai
      ? fmtDateDash(data.tanggal_mulai)
      : '[Tanggal SP]';
  const tglTtd = data.tanggal_spby
    ? fmtDateDash(data.tanggal_spby)
    : data.tanggal_ttd
      ? fmtDateDash(data.tanggal_ttd)
      : '[Tanggal]';
  const tempat = data.tempat_dikeluarkan || data.tempat_terbit || 'Singaraja';

  return (
    <View style={{ fontSize: 11, fontFamily: 'Times-Roman', lineHeight: 1.5 }}>
      <View style={{ alignItems: 'center', marginBottom: 20, marginTop: 10 }}>
        <Text style={{ fontFamily: 'Times-Bold', fontSize: 12 }}>
          SURAT PERNYATAAN TANGGUNG JAWAB MUTLAK
        </Text>
      </View>

      <View style={{ flexDirection: 'row', marginBottom: 5 }}>
        <View style={{ width: 80 }}>
          <Text>Nama</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text>: {pegawaiName}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', marginBottom: 5 }}>
        <View style={{ width: 80 }}>
          <Text>NIP</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text>: {nip}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', marginBottom: 20 }}>
        <View style={{ width: 80 }}>
          <Text>Jabatan</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text>: {jabatan}</Text>
        </View>
      </View>

      <Text style={{ fontFamily: 'Times-Bold', marginBottom: 15 }}>
        Menyatakan dengan sesungguhnya bahwa:
      </Text>

      <View style={{ flexDirection: 'row', marginBottom: 10, textAlign: 'justify' }}>
        <Text style={{ width: 20 }}>1.</Text>
        <Text style={{ flex: 1 }}>
          Sehubungan dengan Surat Perintah Kepala Kantor Imigrasi Kelas II TPI Singaraja Nomor{' '}
          {nomorSp} tanggal {tglSp} , maka saya telah melaksanakan perjalanan dinas dimaksud dan
          perhitungan sebagaimana daftar pengeluaran riil dan rincian biaya perjalanan dinas telah
          dihitung dengan benar;
        </Text>
      </View>

      <View style={{ flexDirection: 'row', marginBottom: 20, textAlign: 'justify' }}>
        <Text style={{ width: 20 }}>2.</Text>
        <Text style={{ flex: 1 }}>
          Apabila dikemudian hari terdapat kesalahan dan/atau kelebihan atas pembayaran Surat
          Perintah Perjalanan Dinas (SPPD) kegiatan tersebut, sebagian atau seluruhnya, kami
          bertanggung jawab sepenuhnya dan bersedia menyetorkan atas kesalahan dan/atau kelebihan
          pembayaran tersebut ke Kas Negara.
        </Text>
      </View>

      <Text style={{ marginBottom: 40 }}>
        Demikian pernyataan ini kami buat dengan sebenar-benarnya.
      </Text>

      {/* FOOTER / TTD */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 }}>
        <View style={{ width: 250, textAlign: 'center' }}>
          <Text style={{ marginBottom: 5 }}>
            {tempat}, {tglTtd}
          </Text>
          <Text style={{ marginBottom: 50 }}>Yang Membuat Pernyataan,</Text>
          <Text style={{ fontFamily: 'Times-Bold' }}>{pegawaiName.toUpperCase()}</Text>
          <Text>NIP. {nip}</Text>
        </View>
      </View>
    </View>
  );
};

// ─── SURAT PERNYATAAN PENGELUARAN BIAYA PERJALANAN DINAS ────────────────────
// Dokumen tersendiri (bukan Rincian SPBy). Format: "Rincian Biaya Perjalanan Dinas" +
// "Perhitungan SPD Rampung", satu halaman per pelaksana (detail_transaksi dikelompokkan per
// `pegawai` "NIP - Nama"; `_filterPegawai` membatasi ke satu pelaksana).
const sppStyles = StyleSheet.create({
  page: {
    fontSize: 11,
    fontFamily: 'Times-Roman',
    paddingTop: 40,
    paddingLeft: 60,
    paddingRight: 60,
    paddingBottom: 40,
    lineHeight: 1.3,
  },
  kop: { alignItems: 'center', marginBottom: 18 },
  kopText: { fontFamily: 'Times-Bold', fontSize: 11 },
  kopLine: { borderBottomWidth: 1.5, borderBottomColor: '#000', width: '100%', marginTop: 6 },
  title: { fontFamily: 'Times-Bold', textAlign: 'center', marginBottom: 20 },
  meta: { marginBottom: 8 },
  table: { borderTopWidth: 1, borderLeftWidth: 1, borderColor: '#000', marginTop: 8 },
  tr: { flexDirection: 'row' },
  cell: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#000',
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  colNo: { width: '7%', textAlign: 'center' },
  colUraian: { width: '55%' },
  colJumlah: { width: '20%', textAlign: 'right' },
  colKet: { width: '18%' },
  colNoUraian: { width: '62%', textAlign: 'center' },
  center: { textAlign: 'center' },
  bold: { fontFamily: 'Times-Bold' },
  ttdRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  ttdCol: { width: '48%', alignItems: 'center' },
  ttdSpace: { height: 62 },
  subTitle: { fontFamily: 'Times-Bold', textAlign: 'center', marginTop: 26, marginBottom: 18 },
  hitungRow: { flexDirection: 'row', paddingLeft: 6 },
  hitungLabel: { width: 260 },
  ppk: { alignItems: 'center', marginTop: 26 },
});

const SuratPernyataanPengeluaran = ({ data }) => {
  const rupiah = (n) => new Intl.NumberFormat('id-ID').format(n || 0);
  const angka = (v) => parseInt(v?.toString().replace(/[^0-9]/g, ''), 10) || 0;
  const barisPegawai = (str, placeholderNama, placeholderNip) => {
    const lines = (str || '').split('\n');
    return {
      nama: lines[0] || placeholderNama,
      nip: lines[1]?.replace('NIP. ', '') || placeholderNip,
    };
  };

  // Kelompokkan transaksi per pelaksana ("NIP - Nama")
  const grouped = {};
  if (Array.isArray(data.detail_transaksi)) {
    data.detail_transaksi.forEach((row) => {
      const key = row.pegawai || '[NIP] - [NAMA PELAKSANA]';
      if (data._filterPegawai && key !== data._filterPegawai) return;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    });
  }
  const pages = Object.entries(grouped);
  if (pages.length === 0) pages.push([data._filterPegawai || '[NIP] - [NAMA PELAKSANA]', []]);

  const nomorSp = data.nomor_sp || data.nomor_sp_ref || '[NOMOR SURAT PERINTAH]';
  const tanggalSp = data.tanggal_sp ? fmtDateDash(data.tanggal_sp) : '[TANGGAL]';
  const tanggalTtd = data.tanggal_spby ? fmtDateDash(data.tanggal_spby) : '[TANGGAL]';
  const bendahara = barisPegawai(data.bendahara, '[NAMA BENDAHARA]', '[NIP BENDAHARA]');
  const ppk = barisPegawai(data.pejabat_ppk, '[NAMA PPK]', '[NIP PPK]');

  return (
    <>
      {pages.map(([pegawaiStr, rows], idx) => {
        const parts = pegawaiStr.split(' - ');
        const pelaksana =
          parts.length > 1
            ? { nip: parts[0], nama: parts.slice(1).join(' - ') }
            : { nip: '[NIP]', nama: pegawaiStr };
        const total = rows.reduce((sum, r) => sum + angka(r.jumlah), 0);
        const dibayarkan = total;
        const sisa = total - dibayarkan;

        return (
          <Page key={idx} size="A4" style={sppStyles.page}>
            <View style={sppStyles.kop}>
              <Text style={sppStyles.kopText}>KEMENTERIAN IMIGRASI DAN PEMASYARAKATAN RI</Text>
              <Text style={sppStyles.kopText}>
                KANTOR WILAYAH DIREKTORAT JENDERAL IMIGRASI BALI
              </Text>
              <Text style={sppStyles.kopText}>KANTOR IMIGRASI KELAS II TPI SINGARAJA</Text>
              <Text style={sppStyles.kopText}>Jl. Seririt - Singaraja, Pemaron</Text>
              <Text style={sppStyles.kopText}>Telp. (0362) 32174 Fax. (0362) 31175</Text>
              <View style={sppStyles.kopLine} />
            </View>

            <Text style={sppStyles.title}>RINCIAN BIAYA PERJALANAN DINAS</Text>

            <Text style={sppStyles.meta}>Lampiran Surat Perintah Nomor : {nomorSp},</Text>
            <Text style={sppStyles.meta}>Tanggal : {tanggalSp}</Text>

            {/* Tabel perincian biaya */}
            <View style={sppStyles.table}>
              <View style={sppStyles.tr}>
                <Text style={[sppStyles.cell, sppStyles.colNo, sppStyles.bold]}>No</Text>
                <Text
                  style={[sppStyles.cell, sppStyles.colUraian, sppStyles.center, sppStyles.bold]}
                >
                  Perincian Biaya
                </Text>
                <Text
                  style={[sppStyles.cell, sppStyles.colJumlah, sppStyles.center, sppStyles.bold]}
                >
                  Jumlah (Rp)
                </Text>
                <Text style={[sppStyles.cell, sppStyles.colKet, sppStyles.center, sppStyles.bold]}>
                  Keterangan
                </Text>
              </View>
              {rows.map((r, i) => (
                <View key={i} style={sppStyles.tr} wrap={false}>
                  <Text style={[sppStyles.cell, sppStyles.colNo]}>{i + 1}</Text>
                  <Text style={[sppStyles.cell, sppStyles.colUraian]}>
                    {[r.itemKode, r.itemName].filter(Boolean).join('. ') ||
                      r.detail ||
                      r.uraian ||
                      '-'}
                  </Text>
                  <Text style={[sppStyles.cell, sppStyles.colJumlah]}>
                    {rupiah(angka(r.jumlah))}
                  </Text>
                  <Text style={[sppStyles.cell, sppStyles.colKet]}> </Text>
                </View>
              ))}
              <View style={sppStyles.tr} wrap={false}>
                <Text style={[sppStyles.cell, sppStyles.colNoUraian, sppStyles.bold]}>Jumlah</Text>
                <Text style={[sppStyles.cell, sppStyles.colJumlah, sppStyles.bold]}>
                  {rupiah(total)}
                </Text>
                <Text style={[sppStyles.cell, sppStyles.colKet]}> </Text>
              </View>
            </View>

            {/* Tanda terima: Bendahara (kiri) & pelaksana yang membuat pernyataan (kanan) */}
            <View style={sppStyles.ttdRow} wrap={false}>
              <View style={sppStyles.ttdCol}>
                <Text> </Text>
                <Text>Telah dibayarkan sejumlah :</Text>
                <Text>Rp. {rupiah(dibayarkan)}</Text>
                <Text>Bendahara Pengeluaran</Text>
                <View style={sppStyles.ttdSpace} />
                <Text style={sppStyles.bold}>{bendahara.nama.toUpperCase()}</Text>
                <Text>NIP. {bendahara.nip}</Text>
              </View>
              <View style={sppStyles.ttdCol}>
                <Text>Singaraja, {tanggalTtd}</Text>
                <Text>Telah menerima jumlah uang sebesar :</Text>
                <Text>Rp. {rupiah(total)}</Text>
                <Text>Yang Membuat Pernyataan</Text>
                <View style={sppStyles.ttdSpace} />
                <Text style={sppStyles.bold}>{pelaksana.nama.toUpperCase()}</Text>
                <Text>NIP. {pelaksana.nip}</Text>
              </View>
            </View>

            {/* Perhitungan SPD rampung */}
            <View wrap={false}>
              <Text style={sppStyles.subTitle}>PERHITUNGAN SPD RAMPUNG</Text>
              <View style={sppStyles.hitungRow}>
                <Text style={sppStyles.hitungLabel}>Ditetapkan sejumlah</Text>
                <Text>Rp. {rupiah(total)}</Text>
              </View>
              <View style={sppStyles.hitungRow}>
                <Text style={sppStyles.hitungLabel}>Yang harus dibayarkan sejumlah</Text>
                <Text>Rp. {rupiah(dibayarkan)}</Text>
              </View>
              <View style={sppStyles.hitungRow}>
                <Text style={sppStyles.hitungLabel}>Sisa yang harus dibayarkan</Text>
                <Text>Rp. {sisa ? rupiah(sisa) : '-'}</Text>
              </View>

              <View style={sppStyles.ppk}>
                <Text>Pejabat Pembuat Komitmen</Text>
                <View style={sppStyles.ttdSpace} />
                <Text style={sppStyles.bold}>{ppk.nama.toUpperCase()}</Text>
                <Text>NIP. {ppk.nip}</Text>
              </View>
            </View>
          </Page>
        );
      })}
    </>
  );
};

// Diekspor supaya modul LPJ bisa mencetak langsung (pdf().toBlob()) tanpa membuka pratinjau
export const MyPdfDocument = ({ surat, data, packItem }) => (
  <Document>
    {surat.id === 'nota-dinas' ? (
      <Page
        size="A4"
        style={{
          ...styles.page,
          paddingTop: 40,
          paddingLeft: 40,
          paddingRight: 30,
          paddingBottom: 40,
        }}
      >
        <NotaDinas data={data} />
      </Page>
    ) : surat.id === 'rincian-perjalanan-tugas' ? (
      <RincianPerjalananTugas data={data} />
    ) : surat.id === 'surat-perintah-bayar' ? (
      <Page
        size="A4"
        style={{
          ...styles.page,
          paddingTop: 40,
          paddingLeft: 40,
          paddingRight: 30,
          paddingBottom: 40,
        }}
      >
        <SuratPerintahBayar data={data} />
      </Page>
    ) : surat.id === 'kwitansi' ? (
      <Kwitansi data={data} />
    ) : surat.id === 'rincian-spby' ? (
      <RincianSPBy data={data} />
    ) : surat.id === 'nominatif' ? (
      <Nominatif data={data} />
    ) : surat.id === 'surat-pernyataan-pengeluaran' ? (
      <SuratPernyataanPengeluaran data={data} />
    ) : (
      <Page size="A4" style={styles.page}>
        <KopSurat />
        {surat.id === 'surat-perintah' ? (
          <SuratPerintah data={data} />
        ) : surat.id === 'surat-perjalanan-dinas' ? (
          <SuratPerjalananDinas data={data} />
        ) : surat.id === 'sptjm-pelaksana' ? (
          <SPTJMPelaksana data={data} packItem={packItem} />
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: 'gray' }}>Template belum dikonfigurasi.</Text>
          </View>
        )}
      </Page>
    )}
  </Document>
);

// ─── KOMPONEN PREVIEWER ───────────────────────────────────────────────────
export default function SuratPreviewCanvas({ surat, formData, packItem }) {
  // Gunakan teknik Debounce (tunda render) selama 600ms.
  // Ini akan mencegah PDF iframe berkedip (blinking) saat user sedang asyik mengetik.
  const [debouncedFormData, setDebouncedFormData] = React.useState(formData);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFormData(formData);
    }, 600);
    return () => clearTimeout(handler);
  }, [formData]);

  const displayData = useMemo(
    () => isiPlaceholder(surat, debouncedFormData),
    [surat, debouncedFormData],
  );

  // Gunakan useMemo untuk merender PDFViewer HANYA ketika displayData benar-benar berubah.
  // Ini mencegah PDFViewer me-render ulang saat props formData masuk dengan cepat.
  const pdfElement = useMemo(
    () => (
      <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }} showToolbar={true}>
        <MyPdfDocument surat={surat} data={displayData} packItem={packItem} />
      </PDFViewer>
    ),
    [surat, displayData, packItem],
  );

  if (!surat) return null;

  return <div className="w-full h-full bg-slate-200">{pdfElement}</div>;
}

const NotaDinas = ({ data }) => {
  // Hitung total dari detail_transaksi
  let totalJumlah = 0;
  if (Array.isArray(data.detail_transaksi)) {
    totalJumlah = data.detail_transaksi.reduce((sum, row) => {
      const val = parseInt(row.jumlah?.toString().replace(/[^0-9]/g, ''), 10) || 0;
      return sum + val;
    }, 0);
  }

  // Format mata uang
  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(angka);
  };

  // Ambil nama pertama dari list pegawai
  const namaPenerima =
    data.detail_transaksi?.[0]?.pegawai?.split(' - ')?.[1] ||
    data.detail_transaksi?.[0]?.pegawai ||
    '[NAMA PENERIMA]';

  // Ambil nama PPK
  const namaPpk = data.pejabat_ppk?.split('\n')[0] || '[NAMA PPK]';
  const nipPpk = data.pejabat_ppk?.split('\n')[1]?.replace('NIP. ', '') || '[NIP PPK]';

  return (
    <View style={{ fontSize: 11, fontFamily: 'Helvetica', lineHeight: 1.5, paddingRight: 20 }}>
      {/* HEADER */}
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Text style={{ fontFamily: 'Helvetica-Bold', textDecoration: 'underline', fontSize: 12 }}>
          NOTA DINAS
        </Text>
      </View>

      <View style={{ flexDirection: 'row', marginBottom: 5 }}>
        <View style={{ width: 80 }}>
          <Text>Yth.</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text>: Kepala Kantor Imigrasi Kelas II TPI Singaraja</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', marginBottom: 5 }}>
        <View style={{ width: 80 }}>
          <Text>Dari</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text>: {namaPpk.toUpperCase()}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', marginBottom: 20 }}>
        <View style={{ width: 80 }}>
          <Text>Tanggal</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text>: {data.tanggal_spby ? fmtDateDash(data.tanggal_spby) : '[Tanggal]'}</Text>
        </View>
      </View>

      {/* BODY */}
      <View style={{ marginBottom: 15, textAlign: 'justify' }}>
        <Text>
          Sehubungan dengan pelaksanaan kegiatan pada DIPA Kantor Imigrasi Kelas II TPI Singaraja
          Nomor SP DIPA-137.03.2.92951/202 tanggal 01 Desember 2025 bersama ini kami sampaikan
          usulan rencana kegiatan seperti tersebut dibawah ini :
        </Text>
      </View>

      {/* TABLE */}
      <View
        style={{ borderTop: '1px solid black', borderLeft: '1px solid black', marginBottom: 20 }}
      >
        {/* Table Header */}
        <View
          style={{
            flexDirection: 'row',
            borderBottom: '1px solid black',
            fontFamily: 'Helvetica-Bold',
            textAlign: 'center',
            alignItems: 'center',
          }}
        >
          <View style={{ width: '5%', borderRight: '1px solid black', padding: 4 }}>
            <Text>No</Text>
          </View>
          <View style={{ width: '22%', borderRight: '1px solid black', padding: 4 }}>
            <Text>No SPBY</Text>
          </View>
          <View style={{ width: '38%', borderRight: '1px solid black', padding: 4 }}>
            <Text>Uraian</Text>
          </View>
          <View style={{ width: '20%', borderRight: '1px solid black', padding: 4 }}>
            <Text>Penerima</Text>
          </View>
          <View style={{ width: '15%', borderRight: '1px solid black', padding: 4 }}>
            <Text>Jumlah (Rp)</Text>
          </View>
        </View>

        {/* Table Row */}
        <View style={{ flexDirection: 'row', borderBottom: '1px solid black' }}>
          <View
            style={{ width: '5%', borderRight: '1px solid black', padding: 4, textAlign: 'center' }}
          >
            <Text>1</Text>
          </View>
          <View
            style={{
              width: '22%',
              borderRight: '1px solid black',
              padding: 4,
              textAlign: 'center',
            }}
          >
            <Text>{data.nomor_bundle || '[No SPBY]'}</Text>
          </View>
          <View
            style={{
              width: '38%',
              borderRight: '1px solid black',
              padding: 4,
              textAlign: 'justify',
            }}
          >
            <Text>{data.uraian || data.detail_transaksi?.[0]?.uraian || '[Uraian Kegiatan]'}</Text>
          </View>
          <View style={{ width: '20%', borderRight: '1px solid black', padding: 4 }}>
            <Text>{namaPenerima}</Text>
          </View>
          <View
            style={{ width: '15%', borderRight: '1px solid black', padding: 4, textAlign: 'right' }}
          >
            <Text>{formatRupiah(totalJumlah)}</Text>
          </View>
        </View>

        {/* Table Footer */}
        <View
          style={{
            flexDirection: 'row',
            borderBottom: '1px solid black',
            fontFamily: 'Helvetica-Bold',
          }}
        >
          <View
            style={{ width: '85%', borderRight: '1px solid black', padding: 4, textAlign: 'right' }}
          >
            <Text>Jumlah</Text>
          </View>
          <View
            style={{ width: '15%', borderRight: '1px solid black', padding: 4, textAlign: 'right' }}
          >
            <Text>{formatRupiah(totalJumlah)}</Text>
          </View>
        </View>
      </View>

      {/* FOOTER / TTD */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 }}>
        <View style={{ width: 250, textAlign: 'center' }}>
          <Text style={{ marginBottom: 15 }}>
            Singaraja, {data.tanggal_spby ? fmtDateDash(data.tanggal_spby) : '[Tanggal]'}
          </Text>
          <Text style={{ marginBottom: 60 }}>Pelaksana,</Text>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>{namaPpk.toUpperCase()}</Text>
          <Text>NIP. {nipPpk}</Text>
        </View>
      </View>
    </View>
  );
};
