/**
 * Halaman Verifikasi satu berkas (PgvVerifPage purwarupa admin): daftar pelaksana, Detail Berkas
 * (Detail Transaksi bisa diedit), Pemeriksaan Dokumen (Cetak / Centang / Ulang), kartu Lembar
 * Verifikasi, lalu "Selesai Verifikasi". Setelah verifikasi selesai halaman ini hanya bisa dilihat
 * (`kunci`): dokumen & Lembar Verifikasi tetap bisa dicetak.
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaCheck,
  FaChevronDown,
  FaExclamationTriangle,
  FaClipboardCheck,
  FaPen,
  FaPrint,
  FaRegEye,
  FaRegFileAlt,
  FaUndo,
} from 'react-icons/fa';
import { usePegawaiRingkas } from '@/context/usePegawaiRingkas';
import { usePejabat } from '@/context/usePejabat';
import { keDate } from '@/utils/nilai';
import { pesanGalat } from '@/utils/pesanGalat';
import { useDokumenLpj } from '../../hooks/useDokumenLpj';
import { useMakBerkas } from '../../hooks/useMakBerkas';
import { selesaikanVerifikasi, simpanKoreksi, ubahDokumen } from '../../services/keuanganDb';
import { resolveDokumen, tanggalPejabat } from '../../utils/dokumenLpj';
import { cetakGabungan } from '../../utils/cetakPdf';
import {
  faseAktifLabel,
  isPerjadin,
  jenisLabel,
  lpjIdLabel,
  pelaksanaOf,
  rupiah,
} from '../../utils/lpjLogic';
import { formatTanggalDate } from '../../utils/formatTanggal';
import {
  dokDicetak,
  dokLengkap,
  kelompokDokumen,
  labelTahap,
  nominalBerkas,
  pokUntukDibekukan,
  semuaDokumen,
  tahapDariKeuangan,
  verifOf,
} from '../../utils/verifikasiLogic';
import LinkBack from '../../ui/LinkBack';
import ProgressBar from '../../ui/ProgressBar';
import LampiranViewer from '../../components/LampiranViewer';
import { InfoBerkasVerif, TabelPelaksana } from '../../components/verifikasi/InfoBerkasVerif';
import { EditTransaksi, TabelTransaksi } from '../../components/verifikasi/DetailTransaksi';
import PemeriksaanDokumen from '../../components/verifikasi/PemeriksaanDokumen';
import ModalCetakSemua from '../../components/verifikasi/ModalCetakSemua';
import ModalSelesaiVerifikasi from '../../components/verifikasi/ModalSelesaiVerifikasi';
import { IB_PANDUAN, JENIS_DOT, TONE, XLBL } from '../../components/verifikasi/tahapTampil';
import { useToast } from '@/utils/toastStore';
import { BTN, FONT, LAYOUT, STATUS, T } from '@/utils/uiTokens';
import { ANIM, munculBerurutan } from '@/utils/animasi';
import { Lipat } from '@/components/animasi';
import { gulirDanSorot } from '../../../gulirPintar';

const BASE = '/e-persuratan/verifikasi';
const JUDUL_SEKSI = `${FONT.head} text-sm font-extrabold ${T.ink}`;
const MINI_DASAR = `inline-flex items-center gap-[5px] px-3 py-1.5 rounded-[7px] border text-[11.5px] font-semibold ${T.surface} ${T.hoverSurfaceHover} ${ANIM.tekan}`;
const MINI = `${MINI_DASAR} ${T.borderStrong} ${T.ink2}`;
const MINI_ULANG = `${MINI_DASAR} ${STATUS.warnInk} ${STATUS.warnBorder}`;
const BTN_SELESAI = `relative inline-flex items-center justify-center gap-2 px-7 py-[11px] rounded-[10px] text-[13.5px] font-bold cursor-pointer ${TONE.verif.solid} ${ANIM.tekan}`;

const PANDUAN = [
  ['cetak', FaPrint, 'Cetak', 'Dokumen belum dibawa pelaksana'],
  ['centang', FaCheck, 'Centang', 'Dokumen sudah diterima'],
  ['ulang', FaUndo, 'Ulang', 'Batalkan pilihan jika keliru'],
];

/**
 * @param {{ pack: object, keuangan: object|null, user: object }} props  keuangan = dokumen
 *   keuangan/status (null sebelum Keuangan memulai verifikasi)
 */
export default function HalamanVerifikasi({ pack, keuangan, user }) {
  const navigate = useNavigate();
  const showToast = useToast();
  const { semua: pegawai } = usePegawaiRingkas();
  const { pejabatPada } = usePejabat();
  const { mak, opsiItem } = useMakBerkas(pack, keuangan);
  const verif = verifOf(keuangan);
  const dok = useDokumenLpj({
    pack,
    showToast,
    mak,
    pejabat: keuangan?.pejabatBeku,
    verifikasi: verif,
  });

  const [detailBuka, setDetailBuka] = useState(true);
  const [edit, setEdit] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [cetakSemua, setCetakSemua] = useState(null); // { label, docs }
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [lampiran, setLampiran] = useState(null); // { label, files }

  const isiRef = useRef(null);
  useLayoutEffect(() => munculBerurutan(isiRef.current), []);

  const tahap = tahapDariKeuangan(keuangan);
  const kunci = tahap !== 'verif';
  const kelompok = kelompokDokumen(pack);
  const docs = semuaDokumen(kelompok);
  const nLengkap = docs.filter((d) => dokLengkap(verif, d.key)).length;
  const nDicetak = docs.filter((d) => dokDicetak(verif, d.key) && !dokLengkap(verif, d.key)).length;
  const semuaOk = nLengkap === docs.length;
  const disentuh = docs.some((d) => dokLengkap(verif, d.key) || dokDicetak(verif, d.key));
  const nom = nominalBerkas(pack, verif, mak);
  const id = lpjIdLabel(pack);

  // Gulir pintar: begitu semua dokumen tercentang, arahkan ke langkah berikutnya (Selesai Verifikasi)
  const selesaiRef = useRef(null);
  const okLalu = useRef(semuaOk);
  useEffect(() => {
    if (!okLalu.current && semuaOk && !kunci) {
      gulirDanSorot(() => selesaiRef.current, { posisi: 'tengah' });
    }
    okLalu.current = semuaOk;
  }, [semuaOk, kunci]);

  const kembali = () => navigate(`${BASE}?tab=${tahap || 'verif'}`);

  async function jalankan(janji, pesanGagal) {
    try {
      await janji;
      return true;
    } catch (err) {
      showToast(pesanGalat(err, pesanGagal), 'error');
      return false;
    }
  }

  const ubah = (keys, ke) => ubahDokumen(pack.id, keys, ke, user.uid);

  const act = {
    kunci,
    cetak: async (d) => {
      if (d.cetak.jenis === 'files') setLampiran({ label: d.nama, files: d.cetak.files });
      else await dok.cetak(d.cetak.item);
      if (!kunci) jalankan(ubah([d.key], { dicetak: true }), 'Gagal mencatat dokumen dicetak.');
    },
    // Selama belum terkunci, yang dicetak hanya dokumen yang belum dicentang.
    cetakSemua: (label, list) =>
      setCetakSemua({
        label,
        docs: kunci ? list : list.filter((d) => !dokLengkap(verif, d.key)),
      }),
    centang: (list) =>
      jalankan(
        ubah(
          list.map((d) => d.key),
          { lengkap: true },
        ),
        'Gagal menyimpan centang.',
      ),
    ulang: (list) =>
      jalankan(
        ubah(
          list.map((d) => d.key),
          { lengkap: false, dicetak: false },
        ),
        'Gagal membatalkan pilihan.',
      ),
  };

  async function cetakDaftar(list) {
    const siap = list
      .map((d) => resolveDokumen(pack, d.cetak.item, dok.konteks))
      .filter((r) => r.kind === 'pdf');
    try {
      await cetakGabungan(siap);
    } catch {
      showToast('Gagal menyiapkan dokumen untuk dicetak.', 'error');
      return;
    }
    if (!kunci) {
      await jalankan(
        ubah(
          list.map((d) => d.key),
          { dicetak: true },
        ),
        'Gagal mencatat dokumen dicetak.',
      );
    }
    setCetakSemua(null);
  }

  async function simpanEdit(koreksi) {
    setMenyimpan(true);
    const ok = await jalankan(
      simpanKoreksi(pack.id, koreksi, user.uid),
      'Gagal menyimpan detail transaksi.',
    );
    setMenyimpan(false);
    if (ok) {
      setEdit(false);
      showToast('Detail transaksi disimpan.');
    }
  }

  /** PPK & Bendahara yang sudah dibekukan, atau yang berlaku pada tanggal dokumen berkas. */
  function pejabatSaatSelesai() {
    const beku = keuangan?.pejabatBeku || {};
    const tanggal = tanggalPejabat(pack);
    return {
      ppk: beku.ppk || pejabatPada('ppk', tanggal),
      bendahara: beku.bendahara || pejabatPada('bendahara', tanggal),
    };
  }

  async function selesai() {
    const belum = docs.filter((d) => !dokLengkap(verif, d.key)).map((d) => d.key);
    // POK & pejabat dibekukan: Lembar Verifikasi tidak berubah walau pagu/pejabat berganti
    const pejabatBeku = Object.fromEntries(
      Object.entries(pejabatSaatSelesai()).filter(([, orang]) => orang),
    );
    const ok = await jalankan(
      selesaikanVerifikasi(
        pack.id,
        {
          semuaKeys: belum,
          pokBeku: pokUntukDibekukan(pack, verif, mak),
          pejabatBeku,
        },
        user.uid,
      ),
      'Gagal menyelesaikan verifikasi.',
    );
    if (!ok) return false;
    const ke = 'sakti';
    navigate(`${BASE}?tab=${ke}`, {
      state: {
        pemberitahuan: {
          key: Date.now(),
          judul: 'Verifikasi selesai',
          id,
          dari: 'Verifikasi',
          ke: labelTahap(ke),
          tab: ke,
        },
      },
    });
    return true;
  }

  const pct = docs.length ? Math.round((nLengkap / docs.length) * 100) : 0;
  const oleh = verif.selesaiOleh ? pegawai.find((p) => p.authUid === verif.selesaiOleh)?.nama : '';

  return (
    <div className={`min-h-full ${T.ground}`}>
      <div className={LAYOUT.page}>
        <LinkBack onClick={kembali}>Kembali ke Berkas Verifikasi</LinkBack>
        <div ref={isiRef} className={`${LAYOUT.card} flex flex-col gap-[22px]`}>
          {/* Kepala */}
          <div data-bertahap className="flex items-center gap-3 flex-wrap">
            <span
              className={`inline-flex items-center gap-[7px] pl-2.5 pr-3 py-[5px] rounded-full text-xs font-extrabold tracking-[.02em] ${kunci ? `${STATUS.doneBg} ${STATUS.doneInk}` : TONE.verif.solid}`}
            >
              <FaClipboardCheck size={12} /> {kunci ? 'Sudah Diverifikasi' : 'Verifikasi'}
            </span>
            <h1
              className={`${FONT.mono} text-[17px] sm:text-xl font-bold tracking-[.01em] ${T.ink}`}
            >
              {id}
            </h1>
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${T.inkMuted}`}>
              <i
                className={`w-[7px] h-[7px] rounded-full ${isPerjadin(pack) ? JENIS_DOT.perjadin : JENIS_DOT.non}`}
              />
              {jenisLabel(pack) === 'Perjadin' ? 'Perjadin' : 'Non-Perjadin'}
            </span>
          </div>

          {pack.status !== 'selesai' && (
            <div
              data-bertahap
              className={`flex gap-2.5 items-start rounded-[10px] px-3.5 py-3 text-[13px] ${STATUS.warnBg} ${STATUS.warnInk}`}
            >
              <FaExclamationTriangle size={13} className="mt-0.5 shrink-0" />
              <span>
                Pelaksana belum menyelesaikan semua fase (sedang di <b>{faseAktifLabel(pack)}</b>).
                Dokumen yang belum dibuat, mis. Laporan Kegiatan, belum bisa diperiksa lengkap.
              </span>
            </div>
          )}

          {kunci && (
            <div
              data-bertahap
              className={`flex gap-2.5 items-start rounded-[10px] px-3.5 py-3 text-[13px] ${STATUS.doneBg} ${STATUS.doneInk}`}
            >
              <FaCheck size={13} className="mt-0.5 shrink-0" />
              <span>
                Verifikasi selesai{oleh ? ` oleh ${oleh}` : ''}
                {verif.selesaiPada ? ` pada ${formatTanggalDate(keDate(verif.selesaiPada))}` : ''}.
                Berkas kini di tahap <b>{tahap ? labelTahap(tahap) : 'Arsip'}</b>; dokumen dan
                Lembar Verifikasi masih bisa dicetak.
              </span>
            </div>
          )}

          <div data-bertahap>
            <TabelPelaksana pelaksana={pelaksanaOf(pack)} />
          </div>

          {/* Detail Berkas */}
          <section data-bertahap aria-label="Detail berkas">
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <h2 className={JUDUL_SEKSI}>Detail Berkas</h2>
              <button
                type="button"
                aria-expanded={detailBuka}
                aria-controls="detail-berkas"
                onClick={() => setDetailBuka(!detailBuka)}
                className={`inline-flex items-center gap-1.5 min-h-[34px] pl-3.5 pr-3 rounded-full border text-[12.5px] font-bold ${T.surface} ${T.borderStrong} ${T.ink2} ${T.hoverSurface2} ${ANIM.tekan}`}
              >
                <span>{detailBuka ? 'Sembunyikan' : 'Tampilkan'}</span>
                <FaChevronDown
                  size={11}
                  className={`motion-safe:transition-transform motion-safe:duration-200 ${detailBuka ? 'rotate-180' : ''}`}
                />
              </button>
            </div>
            <Lipat buka={!detailBuka}>
              <div
                className={`flex items-center justify-between gap-3 px-4 py-3 rounded-[14px] border border-l-[3px] border-l-[#2563EB] dark:border-l-[#3B82F6] text-[13px] ${T.surface2} ${T.border} ${T.ink2}`}
              >
                <span>{nom.lines.length} item transaksi</span>
                <b className={`font-extrabold whitespace-nowrap ${T.ink}`}>{rupiah(nom.total)}</b>
              </div>
            </Lipat>
            <Lipat buka={detailBuka}>
              <div
                id="detail-berkas"
                className={`flex flex-col gap-3 sm:gap-4 p-2.5 sm:px-5 sm:pt-[18px] sm:pb-5 rounded-[14px] border border-l-[3px] border-l-[#2563EB] dark:border-l-[#3B82F6] ${T.surface2} ${T.border}`}
              >
                <InfoBerkasVerif pack={pack} onSalin={() => salin(pack, showToast)} />
                <div className="flex items-center justify-between gap-2.5 -mb-1.5">
                  <div className={`${XLBL} flex items-center gap-2`}>
                    Detail Transaksi
                    {nom.edited && (
                      <span
                        key="ubah"
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold normal-case tracking-[.02em] ${STATUS.infoBg} ${STATUS.infoInk} ${ANIM.meletup}`}
                      >
                        Nominal diubah
                      </span>
                    )}
                  </div>
                  {!edit && !kunci && (
                    <button type="button" className={BTN.sm} onClick={() => setEdit(true)}>
                      <FaPen size={11} /> Edit
                    </button>
                  )}
                </div>
                {edit ? (
                  <EditTransaksi
                    nom={nom}
                    mak={mak}
                    opsiItem={opsiItem}
                    menyimpan={menyimpan}
                    onBatal={() => setEdit(false)}
                    onSave={simpanEdit}
                  />
                ) : (
                  <TabelTransaksi nom={nom} />
                )}
              </div>
            </Lipat>
          </section>

          {/* Pemeriksaan Dokumen */}
          <section
            data-bertahap
            className={`border-t pt-[22px] ${T.border}`}
            aria-label="Pemeriksaan Dokumen"
          >
            <div className="flex justify-between items-center gap-2.5 flex-wrap mb-3.5">
              <h3 className={`${FONT.head} text-[15px] font-extrabold ${T.ink}`}>
                Pemeriksaan Dokumen
              </h3>
              <span className={`text-[11.5px] ${T.inkMuted}`}>
                {docs.length} dokumen ·{' '}
                {jenisLabel(pack) === 'Perjadin' ? 'Perjadin' : 'Non-Perjadin'}
              </span>
            </div>
            {!kunci && (
              <ul
                aria-label="Arti tombol"
                className={`grid grid-cols-1 sm:grid-cols-3 mb-3 rounded-xl border overflow-hidden ${T.surface} ${T.border}`}
              >
                {PANDUAN.map(([jenis, Ikon, judul, ket], i) => (
                  <li
                    key={jenis}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 min-w-0 ${i ? `max-sm:border-t sm:border-l ${T.border}` : ''}`}
                  >
                    <i className={IB_PANDUAN(jenis, jenis === 'centang')}>
                      <Ikon size={12} />
                    </i>
                    <div className="flex flex-col gap-px min-w-0">
                      <b className={`text-[12.5px] font-extrabold ${T.ink}`}>{judul}</b>
                      <span className={`text-[11.5px] leading-[1.35] ${T.inkMuted}`}>{ket}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className={`flex items-center gap-3 flex-wrap mb-3 text-xs ${T.ink2}`}>
              <ProgressBar
                value={pct}
                className={`flex-1 min-w-[120px] h-1.5 rounded-full ${T.surface2} [&::-webkit-progress-bar]:bg-[#F3F5F8] dark:[&::-webkit-progress-bar]:bg-[#16243A] [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:rounded-full ${
                  semuaOk
                    ? '[&::-webkit-progress-value]:bg-[#0f2040] [&::-moz-progress-bar]:bg-[#0f2040] dark:[&::-webkit-progress-value]:bg-[#7DB6F3] dark:[&::-moz-progress-bar]:bg-[#7DB6F3]'
                    : '[&::-webkit-progress-value]:bg-[#2563EB] [&::-moz-progress-bar]:bg-[#2563EB]'
                }`}
              />
              <span>
                {nLengkap}/{docs.length} dicentang{nDicetak ? ` · ${nDicetak} dicetak` : ''}
              </span>
              {!kunci && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {!semuaOk && (
                    <button
                      type="button"
                      className={MINI}
                      onClick={() => act.cetakSemua('dokumen yang belum dicentang', docs)}
                    >
                      <FaPrint size={10} /> Cetak yang belum dicentang
                    </button>
                  )}
                  {!semuaOk && (
                    <button type="button" className={MINI} onClick={() => act.centang(docs)}>
                      <FaCheck size={10} /> Centang semua
                    </button>
                  )}
                  {disentuh && (
                    <button type="button" className={MINI_ULANG} onClick={() => act.ulang(docs)}>
                      <FaUndo size={10} /> Ulang semua
                    </button>
                  )}
                </div>
              )}
            </div>
            {semuaOk && !kunci && (
              <div
                className={`flex items-start gap-2 px-3.5 py-[11px] mb-3.5 rounded-[10px] text-[13px] ${STATUS.doneBg} ${STATUS.doneInk} ${ANIM.muncul}`}
              >
                <FaCheck size={12} className="mt-0.5" /> Semua dokumen sudah dicentang.
              </div>
            )}
            <PemeriksaanDokumen kelompok={kelompok} verif={verif} act={act} />
          </section>

          {/* Lembar Verifikasi */}
          <section
            data-bertahap
            aria-label="Lembar Verifikasi"
            className={`flex max-sm:flex-col sm:items-center gap-3.5 sm:gap-4 p-4 sm:px-5 sm:py-[18px] rounded-2xl border ${T.surface} ${T.border} ${T.shadowSm}`}
          >
            <span
              className={`grid place-items-center w-11 h-11 shrink-0 rounded-xl ${STATUS.infoBg} ${STATUS.infoInk} max-sm:hidden`}
              aria-hidden="true"
            >
              <FaRegFileAlt size={18} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className={`${FONT.head} text-[15px] font-extrabold ${T.ink}`}>
                  Lembar Verifikasi
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${STATUS.infoBg} ${STATUS.infoInk}`}
                >
                  Sudah dibuat
                </span>
                {nom.edited && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${STATUS.infoBg} ${STATUS.infoInk}`}
                  >
                    Nominal diubah
                  </span>
                )}
              </div>
              <p className={`text-[12.5px] mt-0.5 ${T.inkMuted}`}>
                Klik Lihat untuk membuka, mencetak, atau mengunduh lembar ini.
              </p>
              <dl className="flex flex-wrap gap-x-6 gap-y-2 mt-2.5">
                <div>
                  <dt className={XLBL}>Jumlah</dt>
                  <dd className={`text-sm font-extrabold whitespace-nowrap ${T.ink}`}>
                    {rupiah(nom.jumlah)}
                  </dd>
                </div>
                {!nom.multi && (
                  <div>
                    <dt className={XLBL}>Sisa Anggaran</dt>
                    <dd
                      className={`text-sm font-extrabold whitespace-nowrap ${nom.sisa != null && nom.sisa < 0 ? STATUS.critInk : T.ink}`}
                    >
                      {nom.sisa == null ? '—' : rupiah(nom.sisa)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
            <button
              type="button"
              className={`${BTN.primaryDark} shrink-0`}
              onClick={() => dok.lihat({ key: 'lembar_verifikasi', label: 'Lembar Verifikasi' })}
            >
              <FaRegEye size={13} /> Lihat
            </button>
          </section>

          {!kunci && (
            <div
              data-bertahap
              className={`flex max-sm:flex-col-reverse sm:items-center justify-end gap-3.5 pt-[18px] border-t ${T.border}`}
            >
              <span className={`flex-1 text-[12.5px] leading-[1.4] ${T.inkMuted}`}>
                {semuaOk
                  ? 'Semua dokumen sudah dicentang. Selesaikan untuk memindahkan berkas ke tab Upload SAKTI.'
                  : `Masih ada ${docs.length - nLengkap} dokumen yang belum dicentang. Verifikasi tetap bisa diselesaikan, nanti ada konfirmasi dulu.`}
              </span>
              <button
                ref={selesaiRef}
                type="button"
                className={BTN_SELESAI}
                onClick={() => setKonfirmasi(true)}
              >
                <FaCheck size={12} /> Selesai Verifikasi
              </button>
            </div>
          )}
        </div>
      </div>

      {konfirmasi && (
        <ModalSelesaiVerifikasi
          pack={pack}
          belum={docs.length - nLengkap}
          total={docs.length}
          tanpaPejabat={Object.entries(pejabatSaatSelesai())
            .filter(([, orang]) => !orang)
            .map(([jenis]) => (jenis === 'ppk' ? 'PPK' : 'Bendahara'))}
          onClose={() => setKonfirmasi(false)}
          onConfirm={selesai}
        />
      )}
      {cetakSemua && (
        <ModalCetakSemua
          pack={pack}
          label={cetakSemua.label}
          docs={cetakSemua.docs}
          verif={verif}
          onClose={() => setCetakSemua(null)}
          onCetak={cetakDaftar}
        />
      )}
      {lampiran && (
        <LampiranViewer
          label={lampiran.label}
          files={lampiran.files}
          onClose={() => setLampiran(null)}
        />
      )}
      {dok.modal}
    </div>
  );
}

function salin(pack, showToast) {
  if (!navigator.clipboard?.writeText) {
    showToast('Browser tidak mendukung salin otomatis.', 'error');
    return;
  }
  navigator.clipboard.writeText(pack.uraian || '').then(
    () => showToast('Uraian kegiatan disalin.'),
    () => showToast('Gagal menyalin, coba salin manual.', 'error'),
  );
}
