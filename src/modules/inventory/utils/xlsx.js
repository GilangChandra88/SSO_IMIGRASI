// Penulis berkas .xlsx sederhana tanpa pustaka luar: ZIP tanpa kompresi + XML lembar kerja.
// lembar: [{ nama, lebar: [angka], baris: [[sel...]] }]; sel: teks | angka | { tgl: 'YYYY-MM-DD' }. Baris pertama = judul kolom.

const TABEL_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function hitungCrc(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) c = TABEL_CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function buatZip(berkas) {
  const enc = new TextEncoder();
  const bagian = [];
  const pusat = [];
  let posisi = 0;
  berkas.forEach(({ nama, isi }) => {
    const n = enc.encode(nama);
    const d = typeof isi === 'string' ? enc.encode(isi) : isi;
    const crc = hitungCrc(d);
    const lokal = new DataView(new ArrayBuffer(30));
    lokal.setUint32(0, 0x04034b50, true);
    lokal.setUint16(4, 20, true);
    lokal.setUint16(6, 0x0800, true);
    lokal.setUint16(8, 0, true);
    lokal.setUint16(10, 0, true);
    lokal.setUint16(12, 0x21, true);
    lokal.setUint32(14, crc, true);
    lokal.setUint32(18, d.length, true);
    lokal.setUint32(22, d.length, true);
    lokal.setUint16(26, n.length, true);
    lokal.setUint16(28, 0, true);
    bagian.push(new Uint8Array(lokal.buffer), n, d);
    const p = new DataView(new ArrayBuffer(46));
    p.setUint32(0, 0x02014b50, true);
    p.setUint16(4, 20, true);
    p.setUint16(6, 20, true);
    p.setUint16(8, 0x0800, true);
    p.setUint16(10, 0, true);
    p.setUint16(12, 0, true);
    p.setUint16(14, 0x21, true);
    p.setUint32(16, crc, true);
    p.setUint32(20, d.length, true);
    p.setUint32(24, d.length, true);
    p.setUint16(28, n.length, true);
    p.setUint32(42, posisi, true);
    pusat.push(new Uint8Array(p.buffer), n);
    posisi += 30 + n.length + d.length;
  });
  const ukPusat = pusat.reduce((a, b) => a + b.length, 0);
  const akhir = new DataView(new ArrayBuffer(22));
  akhir.setUint32(0, 0x06054b50, true);
  akhir.setUint16(8, berkas.length, true);
  akhir.setUint16(10, berkas.length, true);
  akhir.setUint32(12, ukPusat, true);
  akhir.setUint32(16, posisi, true);
  const semua = [...bagian, ...pusat, new Uint8Array(akhir.buffer)];
  const hasil = new Uint8Array(semua.reduce((a, b) => a + b.length, 0));
  let o = 0;
  semua.forEach((b) => {
    hasil.set(b, o);
    o += b.length;
  });
  return hasil;
}

const escXml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Buang karakter kendali yang tidak sah di XML (selain tab, baris baru, CR)
    .replace(/[^\t\n\r -￿]/g, '');

function hurufKolom(i) {
  let s = '';
  let n = i + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function serialTanggal(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000;
}

function xmlLembar({ lebar = [], baris }) {
  const kolom = lebar.length
    ? `<cols>${lebar.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    : '';
  const data = baris
    .map(
      (b, r) =>
        `<row r="${r + 1}">${b
          .map((v, c) => {
            const ref = `${hurufKolom(c)}${r + 1}`;
            if (v === null || v === undefined || v === '') return '';
            if (r === 0)
              return `<c r="${ref}" s="1" t="inlineStr"><is><t>${escXml(v)}</t></is></c>`;
            if (typeof v === 'number') return `<c r="${ref}" s="3"><v>${v}</v></c>`;
            if (typeof v === 'object' && v.tgl)
              return `<c r="${ref}" s="2"><v>${serialTanggal(v.tgl)}</v></c>`;
            return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escXml(v)}</t></is></c>`;
          })
          .join('')}</row>`,
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${kolom}<sheetData>${data}</sheetData></worksheet>`;
}

export function buatXlsx(lembar) {
  const namaUnik = [];
  lembar.forEach((l) => {
    let n = l.nama.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31) || 'Lembar';
    let k = 2;
    while (namaUnik.includes(n)) n = `${n.slice(0, 28)} ${k++}`;
    namaUnik.push(n);
  });
  const berkas = [
    {
      nama: '[Content_Types].xml',
      isi: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${lembar.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
    },
    {
      nama: '_rels/.rels',
      isi: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    },
    {
      nama: 'xl/workbook.xml',
      isi: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${namaUnik.map((n, i) => `<sheet name="${escXml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    },
    {
      nama: 'xl/_rels/workbook.xml.rels',
      isi: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${lembar.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${lembar.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    {
      nama: 'xl/styles.xml',
      isi: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0F2040"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="left"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="right"/></xf></cellXfs></styleSheet>',
    },
    ...lembar.map((l, i) => ({ nama: `xl/worksheets/sheet${i + 1}.xml`, isi: xmlLembar(l) })),
  ];
  return buatZip(berkas);
}

/** Unduh Blob sebagai berkas lewat tautan unduhan biasa. */
export function simpanBerkas(blob, nama) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nama;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export const TIPE_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
