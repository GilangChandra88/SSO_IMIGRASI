/**
 * Penjelasan singkat galat dalam bahasa awam, dari pola pesan yang umum. Urutan penting: pola yang
 * lebih khusus di atas. Bila tidak ada yang cocok, galat ditandai "belum dikenal".
 * [pola, judul, penjelasan, saran]
 */
const POLA = [
  [
    /requires an index|The query requires|indeks database/i,
    'Indeks database belum dipasang',
    'Halaman memakai kueri yang butuh indeks gabungan, tetapi indeksnya belum dibuat di Firestore. Datanya aman, hanya tidak bisa ditampilkan.',
    'Pemilik proyek men-deploy indeks: firebase deploy --only firestore:indexes. Pembuatan indeks butuh beberapa menit.',
  ],
  [
    /permission-denied|Missing or insufficient permissions|insufficient permissions|tidak punya (hak|akses)/i,
    'Akses ditolak',
    'Pengguna mencoba membaca atau mengubah data yang tidak diizinkan untuk perannya (dijaga rules/Function). Data tidak berubah.',
    'Periksa peran akun itu. Bila seharusnya boleh, aturan atau kueri di halaman tersebut perlu diperbaiki; bila tidak, ini bisa tanda percobaan akses.',
  ],
  [
    /dynamically imported module|Loading chunk|ChunkLoadError|Importing a module script failed|Unable to preload CSS/i,
    'Versi aplikasi berganti',
    'Pengguna masih membuka versi lama saat versi baru dipasang, sehingga berkas lama sudah tidak tersedia.',
    'Biasanya selesai setelah pengguna memuat ulang halaman. Aman diabaikan bila muncul tepat setelah deploy.',
  ],
  [
    /QuotaExceededError|exceeded the quota.*storage|DOM Exception 22/i,
    'Penyimpanan peramban penuh',
    'Peramban pengguna menolak menyimpan data sementara karena ruangnya penuh atau mode penyamaran.',
    'Pengguna membersihkan data situs atau keluar dari mode penyamaran.',
  ],
  [
    /resource-exhausted|quota exceeded|Quota exceeded|too-many-requests|rate limit/i,
    'Batas pemakaian terlampaui',
    'Permintaan ditolak karena melewati batas jumlah (kuota Firebase atau batas percobaan).',
    'Cek halaman Firebase untuk kuota. Bila dari percobaan masuk, tunggu beberapa menit.',
  ],
  [
    /deadline-exceeded|timed? ?out|timeout/i,
    'Waktu tunggu habis',
    'Server atau jaringan terlalu lama menjawab sehingga permintaan dihentikan.',
    'Bila berulang di Function yang sama, periksa durasinya di halaman Function & Sistem.',
  ],
  [
    /unavailable|Failed to fetch|NetworkError|network-request-failed|Load failed|ERR_INTERNET|offline|net::/i,
    'Gangguan jaringan',
    'Koneksi internet pengguna terputus atau tidak stabil saat menghubungi server.',
    'Biasanya hilang sendiri. Bila banyak pengguna terdampak sekaligus, cek jaringan kantor atau status Firebase.',
  ],
  [
    /auth\/|unauthenticated|id-token|token.*expired|Silakan masuk/i,
    'Sesi login bermasalah',
    'Token login kedaluwarsa atau tidak sah, sehingga server tidak mengenali penggunanya.',
    'Pengguna keluar lalu masuk lagi. Bila berulang, periksa status akun di Kepegawaian.',
  ],
  [
    /storage\/|object-not-found|storage\.googleapis/i,
    'Gagal membuka/mengunggah berkas',
    'Berkas di Storage tidak ditemukan, ditolak aturan, atau melebihi batas ukuran/tipe.',
    'Periksa jalur berkas di pesan; pastikan berkas belum dibatalkan/dihapus dan ukurannya sesuai batas.',
  ],
  [
    /not-found|No document to update|tidak ditemukan/i,
    'Data tidak ditemukan',
    'Data yang dituju sudah tidak ada (misalnya dibatalkan di tab lain) atau ID-nya keliru.',
    'Muat ulang halaman. Bila berulang, periksa tautan/ID yang dipakai halaman itu.',
  ],
  [
    /already-exists/i,
    'Data kembar',
    'Mencoba membuat data dengan ID yang sudah ada (misalnya tombol simpan ditekan dua kali).',
    'Umumnya aman: data pertama sudah tersimpan. Periksa bila terjadi terus-menerus.',
  ],
  [
    /Jurnal tidak seimbang|Arus kas jurnal|Nilai jurnal/i,
    'Jurnal Koperasi ditolak',
    'Function menolak menulis jurnal karena perhitungan debit/kredit tidak cocok. Tidak ada data yang tersimpan.',
    'Bug perhitungan di Function Koperasi; serahkan kode galat dan transaksi yang dicoba ke pengembang.',
  ],
  [
    /Cannot read propert(y|ies) of (undefined|null)|undefined is not an object|null is not an object|is undefined|is null/i,
    'Data kosong tak terduga',
    'Kode mencoba membaca isian dari data yang belum ada atau kosong, misalnya dokumen lama tanpa field tertentu.',
    'Perlu perbaikan kode agar data kosong ditangani. Buka halaman di "Lokasi" dengan data yang sama untuk mengulanginya.',
  ],
  [
    /is not a function|is not iterable|is not defined/i,
    'Kesalahan kode',
    'Kode memanggil sesuatu yang tidak ada atau bukan fungsi; biasanya bug setelah perubahan kode.',
    'Serahkan pesan, stack, dan versi aplikasi ke pengembang.',
  ],
  [
    /Maximum call stack|too much recursion/i,
    'Perulangan tanpa akhir',
    'Kode memanggil dirinya terus-menerus sampai peramban menghentikannya.',
    'Bug kode; serahkan ke pengembang beserta halaman tempat terjadinya.',
  ],
  [
    /Minified React error|Rendered (more|fewer) hooks|Too many re-renders|Objects are not valid as a React child/i,
    'Galat tampilan',
    'Komponen tampilan gagal digambar sehingga halaman menampilkan layar "Terjadi kesalahan".',
    'Bug kode tampilan; serahkan pesan dan lokasi ke pengembang.',
  ],
  [
    /ResizeObserver loop/i,
    'Peringatan tata letak (aman)',
    'Peramban melaporkan ukuran elemen berubah berulang kali dalam satu kedipan layar. Tidak merusak data.',
    'Boleh diabaikan.',
  ],
  [
    /^Script error\.?$/i,
    'Galat dari skrip luar',
    'Peramban menyembunyikan rincian galat yang berasal dari skrip luar, misalnya ekstensi peramban pengguna.',
    'Abaikan bila tidak berulang atau hanya dari satu pengguna.',
  ],
  [
    /internal|INTERNAL/,
    'Galat di server',
    'Function mengalami kesalahan tak terduga. Pengguna melihat pesan umum beserta kode galat ini.',
    'Lihat stack di bawah; perlu perbaikan kode Function.',
  ],
];

/** { judul, penjelasan, saran, tempat } untuk satu dokumen galat. */
export function jelaskanGalat(g) {
  const teks = `${g.nama || ''}: ${g.pesan || ''} ${g.contoh?.kode || ''}`;
  const fn = g.sumber?.startsWith('fn:');
  const tempat = fn
    ? `server · Function ${g.sumber.slice(3)}`
    : `peramban pengguna · ${g.lokasi || '-'}`;
  const cocok = POLA.find(([re]) => re.test(teks));
  if (!cocok) {
    return {
      judul: 'Galat belum dikenal',
      penjelasan: `Kesalahan di ${fn ? 'server' : 'peramban pengguna'} yang belum punya penjelasan otomatis.`,
      saran: 'Baca pesan dan stack di bawah. Bila berulang, serahkan kode galat ke pengembang.',
      tempat,
    };
  }
  return { judul: cocok[1], penjelasan: cocok[2], saran: cocok[3], tempat };
}
