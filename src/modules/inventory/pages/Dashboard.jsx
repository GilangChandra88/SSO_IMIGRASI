import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import { FONT, STATUS, T } from '@/utils/uiTokens';
import { ANIM, jedaKe } from '@/utils/animasi';
import { AngkaBerjalan } from '@/components/animasi';
import { SEKSI } from '@/data/seksi';
import { K } from '../ui/kelas';
import { useInventori } from '../hooks/useInventori';
import { useTransaksi, useTransaksiTerbaru } from '../hooks/useTransaksi';
import {
  BULAN_SINGKAT,
  formatSisa,
  formatTanggal,
  formatTanggalPanjang,
  hariIni,
  statusStok,
  totalBarang,
} from '../utils/stokLogic';
import KepalaHalaman from '../components/KepalaHalaman';
import StatusBadge from '../components/StatusBadge';
import MemuatInventori from '../components/MemuatInventori';

// Kartu kaca (glassmorphism) di atas latar gradasi lembut, terang & gelap
const LATAR =
  'min-h-full bg-[#f2f5fa] bg-[radial-gradient(58%_46%_at_8%_6%,rgba(59,130,246,.13),transparent_70%),radial-gradient(50%_42%_at_94%_18%,rgba(129,140,248,.11),transparent_70%),radial-gradient(54%_46%_at_80%_98%,rgba(56,189,248,.11),transparent_70%),linear-gradient(180deg,#f5f7fb_0%,#eff3f9_100%)] dark:bg-[#0A121D] dark:bg-[radial-gradient(58%_46%_at_8%_6%,rgba(57,135,229,.16),transparent_70%),radial-gradient(50%_42%_at_94%_18%,rgba(129,140,248,.1),transparent_70%),radial-gradient(54%_46%_at_80%_98%,rgba(56,189,248,.08),transparent_70%),linear-gradient(180deg,#0A121D_0%,#0d1726_100%)]';
const KACA = `${T.ink} rounded-[22px] border border-white/85 bg-[linear-gradient(150deg,rgba(255,255,255,.66)_0%,rgba(255,255,255,.38)_60%,rgba(255,255,255,.5)_100%)] backdrop-blur-[22px] backdrop-saturate-[1.7] shadow-[0_12px_36px_rgba(31,60,120,.13),inset_0_1px_0_rgba(255,255,255,.95)] dark:border-white/10 dark:bg-[linear-gradient(150deg,rgba(17,29,46,.82)_0%,rgba(17,29,46,.6)_100%)] dark:shadow-[0_12px_36px_rgba(0,0,0,.45),inset_0_1px_0_rgba(255,255,255,.06)]`;
const KACA_AMBER =
  'rounded-[22px] border border-[rgba(243,217,174,.95)] bg-[linear-gradient(150deg,rgba(255,246,226,.82)_0%,rgba(255,243,214,.5)_100%)] backdrop-blur-[22px] shadow-[0_12px_36px_rgba(31,60,120,.1)] dark:border-[rgba(240,185,62,.3)] dark:bg-[linear-gradient(150deg,rgba(201,133,0,.16)_0%,rgba(17,29,46,.7)_100%)]';
const BTN_KACA = `inline-flex items-center justify-center h-8 px-3 rounded-lg border text-[13px] font-semibold whitespace-nowrap cursor-pointer ${ANIM.tekan} text-[#0f2040] dark:text-[#7DB6F3] bg-white/70 border-white/95 shadow-[0_1px_2px_rgba(31,60,120,.12)] hover:bg-white/95 dark:bg-white/5 dark:border-white/15 dark:hover:bg-white/10`;
const BARIS = 'border-t border-[#E0E5EC] dark:border-white/10';
const BATAS_TANPA_SAKTI = 5;

function GrafikBatang({ data }) {
  const tertinggi = Math.max(...data.flatMap((d) => [d.masuk, d.keluar]));
  const maks = Math.max(10, Math.ceil(tertinggi / 10) * 10);
  const y = (v) => 220 - (v / maks) * 200;
  const lebarGrup = 580 / data.length;
  return (
    <svg
      viewBox="0 0 640 260"
      className="block w-full h-auto"
      role="img"
      aria-label="Grafik batang jumlah transaksi barang masuk dan keluar per bulan"
    >
      {[0, maks / 2, maks].map((t) => (
        <g key={t}>
          <line
            x1="40"
            x2="620"
            y1={y(t)}
            y2={y(t)}
            className={
              t === 0
                ? 'stroke-[#c9d2e2] dark:stroke-[#304864]'
                : 'stroke-[#e3e8f1] dark:stroke-[#233450]'
            }
          />
          <text
            x="32"
            y={y(t) + 4}
            textAnchor="end"
            fontSize="11"
            className="fill-[#64748b] dark:fill-[#A7B6CB]"
          >
            {t}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const cx = 40 + lebarGrup * (i + 0.5);
        return (
          <g key={d.label}>
            <rect
              x={cx - 30}
              y={y(d.masuk)}
              width="28"
              height={220 - y(d.masuk)}
              rx="3"
              className={`fill-[#0f2040] dark:fill-[#7DB6F3] origin-bottom [transform-box:fill-box] motion-safe:transition-[scale] motion-safe:duration-700 motion-safe:ease-out motion-safe:starting:scale-y-0 ${jedaKe(i)}`}
            />
            <rect
              x={cx + 2}
              y={y(d.keluar)}
              width="28"
              height={220 - y(d.keluar)}
              rx="3"
              className={`fill-[#2A78D6] dark:fill-[#3987E5] origin-bottom [transform-box:fill-box] motion-safe:transition-[scale] motion-safe:duration-700 motion-safe:ease-out motion-safe:starting:scale-y-0 ${jedaKe(i)}`}
            />
            <text
              x={cx - 16}
              y={y(d.masuk) - 5}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              className="fill-[#101A2C] dark:fill-[#EAF0F8]"
            >
              {d.masuk}
            </text>
            <text
              x={cx + 16}
              y={y(d.keluar) - 5}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              className="fill-[#101A2C] dark:fill-[#EAF0F8]"
            >
              {d.keluar}
            </text>
            <text
              x={cx}
              y="244"
              textAnchor="middle"
              fontSize="12"
              className="fill-[#64748b] dark:fill-[#A7B6CB]"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { siap, barang, semuaBarang, sisa, bulanan, izin, setLengkapiId } = useInventori();
  const [semuaTanpaSakti, setSemuaTanpaSakti] = useState(false);
  const kini = hariIni();
  const bulanIni = kini.slice(0, 7);
  // Angka bulan & grafik dari ringkasan saldo (Function); barang keluar per seksi dari transaksi
  // bulan berjalan; aktivitas dari 5 transaksi terbaru tiap jenis
  const keluarBulanIni = useTransaksi('keluar', { dari: `${bulanIni}-01`, sampai: kini });
  const terbaruMasuk = useTransaksiTerbaru('masuk');
  const terbaruKeluar = useTransaksiTerbaru('keluar');

  const data = useMemo(() => {
    const status = barang.map((b) => ({
      b,
      sisa: sisa[b.id],
      status: statusStok(sisa[b.id], b.stokMin),
    }));
    const menipis = status.filter((s) => s.status === 'menipis');
    const habis = status.filter((s) => s.status === 'habis');
    const jumlahBulan = bulanan[bulanIni] || { masuk: 0, keluar: 0 };
    const keluarBulan = keluarBulanIni.rows.filter((k) => k.status !== 'batal');

    const daftarSeksi = [
      ...new Set([...SEKSI, ...keluarBulan.map((k) => k.seksi).filter(Boolean)]),
    ];
    const perSeksi = daftarSeksi
      .map((s) => ({
        seksi: s,
        jumlah: keluarBulan
          .filter((k) => k.seksi === s)
          .reduce((a, k) => a + totalBarang(k.items), 0),
      }))
      .sort((a, b) => b.jumlah - a.jumlah);
    const maksSeksi = Math.max(1, ...perSeksi.map((s) => s.jumlah));

    const namaBarang = (id) => semuaBarang.find((x) => x.id === id);
    const aktif = (t) => t.status !== 'batal';
    const aktivitas = [
      ...terbaruMasuk.rows.filter(aktif).map((m) => {
        const b = namaBarang(m.barangId);
        return {
          kunci: `m${m.id}`,
          tanggal: m.tanggal,
          dibuat: m.dibuat || 0,
          teks: `Barang masuk: ${b ? b.nama : '(barang dihapus)'}, ${m.jumlah} ${b ? b.satuan : ''}`,
        };
      }),
      ...terbaruKeluar.rows.filter(aktif).map((k) => ({
        kunci: `k${k.id}`,
        tanggal: k.tanggal,
        dibuat: k.dibuat || 0,
        teks: `Barang keluar: Seksi ${k.seksi} mengambil ${k.items.length} jenis barang`,
      })),
    ]
      .sort((a, b) =>
        a.tanggal === b.tanggal ? b.dibuat - a.dibuat : a.tanggal < b.tanggal ? 1 : -1,
      )
      .slice(0, 5);

    // Kode SAKTI lengkap = kode kategori (10 digit) + kode barang (6 digit)
    const tanpaSakti = barang
      .filter((b) => !b.kode || !b.kategoriId)
      .map((b) => ({
        b,
        sisa: sisa[b.id],
        kurang: [!b.kategoriId && 'Kategori', !b.kode && 'Kode barang'].filter(Boolean),
      }))
      .sort((x, y) => y.kurang.length - x.kurang.length || x.b.nama.localeCompare(y.b.nama));

    // Grafik 6 bulan terakhir (termasuk bulan berjalan), jumlah transaksi
    const [yy, mm] = kini.split('-').map(Number);
    const grafik = Array.from({ length: 6 }, (_, i) => {
      const t = new Date(yy, mm - 1 - (5 - i), 1);
      const kunci = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`;
      return {
        label: BULAN_SINGKAT[t.getMonth()],
        masuk: bulanan[kunci]?.masuk || 0,
        keluar: bulanan[kunci]?.keluar || 0,
      };
    });

    return {
      menipis,
      habis,
      jumlahBulan,
      perluIsiUlang: [...habis, ...menipis].slice(0, 5),
      perSeksi,
      maksSeksi,
      aktivitas,
      grafik,
      tanpaSakti,
    };
  }, [
    barang,
    semuaBarang,
    sisa,
    bulanan,
    bulanIni,
    kini,
    keluarBulanIni.rows,
    terbaruMasuk.rows,
    terbaruKeluar.rows,
  ]);

  if (!siap) return <MemuatInventori judul="Dashboard" />;

  const lengkapi = (id) => {
    setLengkapiId(id);
    navigate('/inventory/stok');
  };
  const stat = [
    { label: 'Jenis Barang', nilai: barang.length, catatan: 'Terdaftar di data master' },
    {
      label: 'Stok Menipis',
      nilai: data.menipis.length,
      catatan: 'Sisa di bawah stok minimum',
      warna: STATUS.warnInk,
    },
    {
      label: 'Stok Habis',
      nilai: data.habis.length,
      catatan: 'Tidak bisa diambil seksi',
      warna: STATUS.critInk,
    },
    {
      label: 'Transaksi Bulan Ini',
      nilai: data.jumlahBulan.masuk + data.jumlahBulan.keluar,
      catatan: `${data.jumlahBulan.masuk} masuk, ${data.jumlahBulan.keluar} keluar`,
    },
  ];

  return (
    <div className={LATAR}>
      <div className={K.halaman}>
        <KepalaHalaman judul="Dashboard" sub={formatTanggalPanjang(kini)} />

        {data.tanpaSakti.length > 0 ? (
          <section
            className={`${KACA_AMBER} px-4 sm:px-6 pt-4 sm:pt-[18px] pb-2.5 sm:pb-3.5 flex flex-col gap-2.5 ${ANIM.muncul}`}
            aria-labelledby="sakti-judul"
          >
            <div className="flex items-start gap-3.5">
              <span
                className={`shrink-0 w-10 h-10 rounded-[10px] inline-flex items-center justify-center ${STATUS.warnBg} ${STATUS.warnInk}`}
                aria-hidden="true"
              >
                <FaExclamationTriangle size={17} />
              </span>
              <div className="min-w-0">
                <h2
                  className={`${K.judulKartu} flex flex-wrap items-center gap-2.5`}
                  id="sakti-judul"
                >
                  Barang belum punya Kode SAKTI
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold text-white ${STATUS.warnSolid}`}
                  >
                    {data.tanpaSakti.length} barang
                  </span>
                </h2>
                <span className={K.subKartu}>
                  Lengkapi kategori dan kode barang agar stok bisa dicocokkan dengan SAKTI.
                </span>
              </div>
            </div>
            <ul className="m-0 p-0 list-none">
              {(semuaTanpaSakti
                ? data.tanpaSakti
                : data.tanpaSakti.slice(0, BATAS_TANPA_SAKTI)
              ).map(({ b, sisa: s, kurang }) => (
                <li
                  key={b.id}
                  className="flex items-center max-[820px]:items-start justify-between gap-4 py-3 border-t border-[rgba(243,217,174,.95)] dark:border-[rgba(240,185,62,.25)]"
                >
                  <div className="min-w-0 flex flex-col gap-0.5">
                    <span className="text-sm font-semibold">{b.nama}</span>
                    <span className={`text-xs tabular-nums ${T.inkMuted}`}>
                      Sisa {formatSisa(b, s)}
                      {b.kategoriId ? ` · ${b.kategori}` : ''}
                    </span>
                    <span className="flex flex-wrap gap-1.5 mt-1">
                      {kurang.map((k) => (
                        <span
                          key={k}
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold border border-[rgba(237,161,0,.35)] ${STATUS.warnBg} ${STATUS.warnInk}`}
                        >
                          {k} belum diisi
                        </span>
                      ))}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`${BTN_KACA} shrink-0`}
                    onClick={() => lengkapi(b.id)}
                  >
                    {izin.tulis ? 'Lengkapi' : 'Lihat'}
                  </button>
                </li>
              ))}
            </ul>
            {data.tanpaSakti.length > BATAS_TANPA_SAKTI && (
              <button
                type="button"
                className={`${K.tautan} self-start pt-1 pb-0.5`}
                onClick={() => setSemuaTanpaSakti((v) => !v)}
                aria-expanded={semuaTanpaSakti}
              >
                {semuaTanpaSakti
                  ? 'Tampilkan lebih sedikit'
                  : `Tampilkan semua (${data.tanpaSakti.length})`}
              </button>
            )}
          </section>
        ) : (
          <section
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-[13.5px] font-semibold border border-[rgba(27,175,122,.3)] backdrop-blur-[18px] ${STATUS.goodBg} ${STATUS.goodInk}`}
            role="status"
          >
            <FaCheck size={14} />
            <span>
              {barang.length
                ? 'Semua barang sudah punya Kode SAKTI.'
                : 'Belum ada barang terdaftar.'}
            </span>
          </section>
        )}

        <section className="flex flex-wrap gap-4" aria-label="Ringkasan">
          {stat.map((s, i) => (
            <div
              key={s.label}
              className={`${KACA} flex-[1_1_200px] px-6 py-5 flex flex-col gap-2 ${ANIM.muncul} ${jedaKe(i)}`}
            >
              <span className={`text-xs font-semibold tracking-[.07em] uppercase ${T.inkMuted}`}>
                {s.label}
              </span>
              <AngkaBerjalan
                nilai={s.nilai}
                className={`${FONT.head} text-[32px] font-bold leading-[1.1] tabular-nums ${s.warna || 'text-[#0f2040] dark:text-[#EAF0F8]'}`}
              />
              <span className={`text-xs ${T.inkMuted}`}>{s.catatan}</span>
            </div>
          ))}
        </section>

        <div className="flex flex-wrap gap-4 items-stretch">
          <section
            className={`${KACA} flex-[2_1_480px] min-w-0 px-5 sm:px-[26px] py-[22px] flex flex-col gap-4`}
          >
            <div className="flex flex-wrap justify-between items-start gap-3">
              <div>
                <h2 className={K.judulKartu}>Barang Masuk dan Keluar</h2>
                <span className={K.subKartu}>Jumlah transaksi per bulan</span>
              </div>
              <div className="flex gap-4 text-[13px]">
                <span className="flex items-center gap-1.5">
                  <i className="w-3 h-3 rounded-[3px] inline-block bg-[#0f2040] dark:bg-[#7DB6F3]" />
                  Masuk
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="w-3 h-3 rounded-[3px] inline-block bg-[#2A78D6] dark:bg-[#3987E5]" />
                  Keluar
                </span>
              </div>
            </div>
            <GrafikBatang data={data.grafik} />
          </section>

          <section
            className={`${KACA} flex-[1_1_320px] min-w-0 px-5 sm:px-[26px] py-[22px] flex flex-col gap-1`}
          >
            <div className="flex flex-wrap justify-between items-baseline gap-3">
              <h2 className={K.judulKartu}>Perlu Diisi Ulang</h2>
              <button
                type="button"
                className={K.tautan}
                onClick={() => navigate('/inventory/stok')}
              >
                Lihat stok
              </button>
            </div>
            {data.perluIsiUlang.length === 0 && (
              <p className={`text-sm ${T.inkMuted}`}>Semua stok aman.</p>
            )}
            {data.perluIsiUlang.map(({ b, sisa: s, status }) => (
              <div key={b.id} className={`flex items-center justify-between gap-3 py-2.5 ${BARIS}`}>
                <div className="min-w-0">
                  <span className="block text-sm font-semibold">{b.nama}</span>
                  <span className={`block text-xs tabular-nums ${T.inkMuted}`}>
                    Sisa {formatSisa(b, s)}, minimum {b.stokMin}
                  </span>
                </div>
                <StatusBadge status={status} />
              </div>
            ))}
          </section>
        </div>

        <div className="flex flex-wrap gap-4 items-stretch">
          <section
            className={`${KACA} flex-[1_1_380px] min-w-0 px-5 sm:px-[26px] py-[22px] flex flex-col gap-4`}
          >
            <div>
              <h2 className={K.judulKartu}>Barang Keluar per Seksi</h2>
              <span className={K.subKartu}>Bulan ini, dalam satuan barang</span>
            </div>
            {data.perSeksi.map((s) => (
              <div key={s.seksi} className="flex items-center gap-3 text-[13px]">
                <span className="basis-24 shrink-0">{s.seksi}</span>
                <svg
                  viewBox="0 0 100 10"
                  preserveAspectRatio="none"
                  className="flex-1 h-2.5 rounded-[5px] bg-[rgba(15,27,45,.08)] dark:bg-white/10"
                  aria-hidden="true"
                >
                  <rect
                    x="0"
                    y="0"
                    height="10"
                    rx="0"
                    width={(s.jumlah / data.maksSeksi) * 100}
                    className={`fill-[#2A78D6] dark:fill-[#7DB6F3] [transform-box:fill-box] ${ANIM.tumbuhX}`}
                  />
                </svg>
                <span className="basis-[52px] shrink-0 text-right font-semibold tabular-nums">
                  {s.jumlah}
                </span>
              </div>
            ))}
          </section>

          <section
            className={`${KACA} flex-[1_1_380px] min-w-0 px-5 sm:px-[26px] py-[22px] flex flex-col gap-1`}
          >
            <h2 className={`${K.judulKartu} mb-2`}>Aktivitas Terbaru</h2>
            {data.aktivitas.length === 0 && (
              <p className={`text-sm ${T.inkMuted}`}>Belum ada transaksi.</p>
            )}
            {data.aktivitas.map((a) => (
              <div key={a.kunci} className={`flex gap-4 py-2.5 items-baseline ${BARIS}`}>
                <span className={`basis-24 shrink-0 text-xs tabular-nums ${T.inkMuted}`}>
                  {formatTanggal(a.tanggal)}
                </span>
                <span className="text-sm min-w-0">{a.teks}</span>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
