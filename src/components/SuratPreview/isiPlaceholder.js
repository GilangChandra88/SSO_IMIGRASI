/**
 * Isi variabel surat yang masih kosong dengan placeholder supaya PDF tetap bisa dirender.
 * Dipakai pratinjau (SuratPreviewCanvas) dan cetak langsung (modul LPJ).
 */
export function isiPlaceholder(surat, data) {
  const d = { ...(data || {}) };
  surat?.variables?.forEach((v) => {
    if (d[v.key] !== undefined && d[v.key] !== '') return;
    if (v.type === 'text') d[v.key] = '[ ... ]';
    if (v.type === 'textarea') d[v.key] = '[ ... ]';
    if (v.type === 'date')
      d[v.key] = new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    if (v.type === 'pegawai') d[v.key] = 'Nama Pegawai\nNIP. -';
    if (v.type === 'number') d[v.key] = 'Rp 0,-';
  });
  return d;
}
