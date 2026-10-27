/**
 * Detail Dokumen (LpjDetailPage purwarupa) — pusat kendali satu berkas LPJ: kartu ringkasan
 * di atas, lalu satu kartu per Fase berisi dokumen/kelompok dokumen beserta status & aksinya.
 * Tombol untuk melanjutkan progres (teks mengikuti dokumen & progres, lihat TEKS_AKSI) hanya
 * ada di kepala blok fase dan membuka form (?isi=...); baris dokumen berisi satu tombol
 * "Lihat / Print" yang membuka popup pratinjau dokumen (PDF asli bila templatenya ada; cetak dari
 * popup).
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaCheck,
  FaCircleNotch,
  FaChevronDown,
  FaClock,
  FaLock,
  FaPrint,
  FaArrowRight,
  FaPlus,
  FaRegEye,
  FaRegCopy,
  FaRegFileAlt,
  FaUpload,
} from 'react-icons/fa';
import { useLPJPack } from '../hooks/useLPJ';
import { useLpjUser } from '../hooks/useLpjUser';
import { usePegawaiList } from '../hooks/usePegawaiList';
import { useDokumenLpj } from '../hooks/useDokumenLpj';
import {
  STAGE_STATUS_LABEL,
  canEditPack,
  isPerjadin,
  isSkemaBaru,
  jenisLabel,
  lpjGroupStatus,
  lpjIdLabel,
  lpjIdOf,
  lpjGroupSubDone,
  lpjRowTotal,
  lpjSingleStatus,
  lpjTahapDisplay,
  overallProgress,
  stagesWithStatus,
  uraianOf,
} from '../utils/lpjLogic';
import LinkBack from '../ui/LinkBack';
import TombolBuat from '../components/TombolBuat';
import KilauFase from '../components/KilauFase';
import RingkasanBerkas, { InfoBerkasKop } from '../components/RingkasanBerkas';
import BuktiPengeluaran from '../components/BuktiPengeluaran';
import FaseProgresBerkas from '../components/FaseProgresBerkas';
import ProgressBar from '../ui/ProgressBar';
import { punyaTemplatePdf } from '../utils/dokumenLpj';
import { siapkanBerkas } from '../utils/halamanBerkas';
import { useToast } from '@/utils/toastStore';
import { BTN, FONT, LAYOUT, NAVY, STAGE_CLS, STATUS, T } from '@/utils/uiTokens';
import { ANIM, munculBerurutan } from '@/utils/animasi';
import { AngkaBerjalan, Lipat } from '@/components/animasi';
import { lanjutBukaBerkas } from '../../animasiHalaman';
import { gulirDanSorot, gulirKeAtas } from '../../gulirPintar';

const persen = (n) => `${Math.round(n)}%`;

export default function PackDetail({ packId }) {
  const navigate = useNavigate();
  const showToast = useToast();
  const user = useLpjUser();
  const { pack, loading, error } = useLPJPack(packId);
  const { pegawai } = usePegawaiList();
  const dok = useDokumenLpj({ pack, pegawai, showToast });
  // Scan SP ber-TTE disiapkan (unduh + render) di latar belakang setelah halaman tampil, agar
  // "Lihat" dan "Cetak Semua" Fase 2 tidak perlu menunggu lama
  const scanSp = pack?.sp?.scan;
  useEffect(() => {
    if (!scanSp?.url) return;
    const t = setTimeout(() => siapkanBerkas(scanSp), 1200);
    return () => clearTimeout(t);
  }, [scanSp]);
  // Nomor fase yang dokumennya sedang disiapkan untuk "Cetak Semua" (null = tidak ada)
  const [mencetakFase, setMencetakFase] = useState(null);
  async function cetakFase(num, docs, label) {
    setMencetakFase(num);
    await dok.cetakSemua(docs, label);
    setMencetakFase(null);
  }
  // Saat berkas pertama tampil, isi halaman muncul bertahap dari atas ke bawah (data-bertahap);
  // bila baru dibuat dari Daftar LPJ, lembar berkas yang dibuka berubah menjadi kartu judul
  const isiRef = useRef(null);
  const sudahMuncul = useRef(false);
  // Gulir pintar: kembali dari form → ke kartu fase yang baru dikerjakan (hasil berkasnya);
  // dibuka dari Dashboard/Daftar LPJ (`aktif`) → ke fase yang sedang berjalan. Tujuan gulir bisa
  // datang sesudah Detail terpasang: saat fase terakhir selesai, berkas jadi final dan form
  // langsung dialihkan ke Detail, lalu `keDetail()` menyusul membawa `state.sorot`.
  const { state, key: kunciLokasi } = useLocation();
  const sorotAwal = useRef(!!state?.sorot);
  const sorotDitangani = useRef(null); // `location.key` yang tujuan gulirnya sudah dijalankan
  useLayoutEffect(() => {
    if (!pack || sudahMuncul.current || !isiRef.current) return;
    sudahMuncul.current = true;
    // Tanpa tujuan gulir, Detail selalu dibuka dari atas (form sebelumnya bisa tergulir jauh)
    if (!sorotAwal.current) gulirKeAtas(isiRef.current);
    if (!lanjutBukaBerkas(packId, isiRef.current)) munculBerurutan(isiRef.current);
  }, [pack, packId]);
  useEffect(() => {
    const kunci = state?.sorot;
    if (!pack || !kunci || !isSkemaBaru(pack) || sorotDitangani.current === kunciLokasi) return;
    sorotDitangani.current = kunciLokasi;
    const num = faseTujuan(stagesWithStatus(pack), kunci);
    if (num) gulirDanSorot(() => isiRef.current?.querySelector(`[data-fase="${num}"]`));
  }, [pack, state, kunciLokasi]);

  const backToList = () => navigate('/e-persuratan/lpj');

  if (loading) return <LoadingSkeleton />;
  if (error || !pack) {
    return (
      <Shell>
        <LinkBack onClick={backToList}>Kembali ke Daftar LPJ</LinkBack>
        <p className={`text-center py-9 text-[13.5px] ${T.inkMuted}`}>
          {error || 'Berkas tidak ditemukan.'}
        </p>
      </Shell>
    );
  }
  if (!isSkemaBaru(pack)) {
    return (
      <Shell>
        <LinkBack onClick={backToList}>Kembali ke Daftar LPJ</LinkBack>
        <div className={`rounded-xl border p-6 text-center ${T.border} ${T.surface2}`}>
          <p className={`font-bold text-sm mb-1 ${T.ink}`}>{uraianOf(pack) || pack.id}</p>
          <p className={`text-[13px] ${T.ink2}`}>
            Berkas ini dibuat dengan format lama dan tidak didukung lagi oleh alur LPJ yang baru.
            Silakan buat berkas baru.
          </p>
        </div>
      </Shell>
    );
  }

  const canEdit = canEditPack(pack, user);
  const nomor = lpjIdOf(pack);

  const tahap = lpjTahapDisplay(pack);
  const total = lpjRowTotal(pack);
  const stages = stagesWithStatus(pack);
  const overall = overallProgress(pack);

  function salinUraian() {
    if (!navigator.clipboard?.writeText) {
      showToast('Browser tidak mendukung salin otomatis.', 'error');
      return;
    }
    navigator.clipboard.writeText(pack.uraian || '').then(
      () => showToast('Uraian disalin.'),
      () => showToast('Gagal menyalin uraian.', 'error'),
    );
  }

  const goForm = (isi) => {
    if (!canEdit) return; // berkas final / tanpa hak edit tidak lagi bisa diubah
    navigate(`/e-persuratan/lpj/${pack.id}?isi=${isi}`);
  };

  return (
    <Shell wadahRef={isiRef}>
      <LinkBack onClick={backToList}>Kembali ke Daftar LPJ</LinkBack>

      {/* Kartu judul */}
      <div data-bertahap className={`${NAVY.gradient} rounded-[14px] px-5 sm:px-6 py-5 mb-5`}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span
                className={`text-[11.5px] font-bold px-2.5 py-[3px] rounded-[20px] bg-white/15 border border-white/20 ${nomor ? 'text-white' : 'text-white/70 italic'}`}
                title={nomor ? undefined : 'Nomor LPJ terbit setelah SPBy selesai'}
              >
                {lpjIdLabel(pack)}
              </span>
              <span className="text-[11.5px] font-bold px-2.5 py-[3px] rounded-[20px] bg-white/15 text-white border border-white/20">
                {jenisLabel(pack)}
              </span>
              <span
                key={tahap.label}
                className={`text-[11.5px] font-semibold px-2.5 py-[3px] rounded-[20px] bg-white border border-white/40 ${ANIM.meletup} ${
                  tahap.done ? 'text-[#0f2040]' : 'text-[#1d4ed8]'
                }`}
              >
                {tahap.label}
              </span>
            </div>
            {/* Pelaksana & total biaya ada di Ringkasan di bawah, tidak diulang di sini */}
            <div className="flex items-start gap-2.5">
              <h1
                className={`${FONT.head} min-w-0 text-lg sm:text-[21px] leading-[1.32] font-bold text-white break-words`}
              >
                {pack.uraian}
              </h1>
              <button
                type="button"
                onClick={salinUraian}
                title="Salin uraian kegiatan"
                className={`mt-1 inline-flex items-center gap-1 px-2 py-[3px] text-[10.5px] font-semibold rounded-md border shrink-0 bg-white/10 border-white/20 text-white/80 hover:bg-white/20 hover:text-white ${ANIM.pilih}`}
              >
                <FaRegCopy size={10} /> Salin
              </button>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className={`${FONT.head} text-[26px] font-extrabold text-white leading-none`}>
              <AngkaBerjalan nilai={overall.pct} format={persen} />
            </div>
            <div className="text-[11.5px] text-white/65 font-semibold mt-1 whitespace-nowrap">
              {overall.done}/{overall.total} dokumen selesai
            </div>
          </div>
        </div>
        <InfoBerkasKop pack={pack} />
        <ProgressBar
          value={overall.pct}
          className={`mt-4 h-1.5 rounded-[3px] bg-white/15 [&::-webkit-progress-bar]:bg-white/15 [&::-webkit-progress-value]:rounded-[3px] [&::-moz-progress-bar]:rounded-[3px] ${
            overall.pct === 100
              ? '[&::-webkit-progress-value]:bg-[#C9973B] [&::-moz-progress-bar]:bg-[#C9973B]'
              : '[&::-webkit-progress-value]:bg-[#7dd3fc] [&::-moz-progress-bar]:bg-[#7dd3fc]'
          }`}
        />
      </div>

      {/* Detail transaksi (informasi berkas ada di kartu judul) */}
      <RingkasanBerkas pack={pack} total={total} />

      {/* Kartu per fase */}
      <div>
        {stages.map(({ stage, display, locked, tally, pct }, si) => {
          const aksi = !locked && canEdit ? aksiFase(pack, stage) : null;
          // Dokumen fase yang sudah jadi & ber-template PDF → tombol "Cetak Semua"
          const siap = locked ? [] : dokumenSiapCetak(pack, stage);
          // Fase yang sedang berjalan disapu kilau, serempak dengan tombol fase
          const aktif = !locked && display !== 'selesai';
          return (
            <div
              key={stage.num}
              data-bertahap
              data-fase={stage.num}
              className={`relative ${T.surface} border rounded-[14px] mb-4 overflow-hidden ${
                locked ? `${T.border} opacity-80` : STAGE_CLS[display].border
              }`}
            >
              {/* Kilau hanya di kepala blok fase (judul + tombol), bukan seluruh kartu */}
              <div className="relative overflow-hidden flex flex-wrap items-center gap-3 px-4 sm:px-5 py-4">
                {aktif && <KilauFase />}
                <div
                  key={`ikon-${display}`}
                  className={`w-9 h-9 shrink-0 rounded-[10px] flex items-center justify-center ${ANIM.meletup} ${
                    display === 'selesai' || display === 'proses'
                      ? `${NAVY.bg} text-white`
                      : `${T.surface2} ${T.inkMuted}`
                  }`}
                >
                  {display === 'selesai' ? (
                    <FaCheck size={15} />
                  ) : locked ? (
                    <FaLock size={14} />
                  ) : (
                    <span className="text-sm font-extrabold">{stage.num}</span>
                  )}
                </div>
                <div className="flex-1 min-w-[180px]">
                  <h2 className={`${FONT.head} font-bold text-[14.5px] ${T.ink}`}>
                    Fase {stage.num} — {stage.label}
                  </h2>
                  <p className={`text-xs mt-0.5 ${T.inkMuted}`}>
                    {tally.done}/{tally.total} selesai · {stage.sub}
                    {locked ? ' · menunggu tahap sebelumnya' : ''}
                  </p>
                </div>
                {/* Label hanya Terkunci/Selesai; fase yang belum dimulai cukup "Buat Sekarang" */}
                {(display === 'terkunci' || display === 'selesai') && (
                  <span
                    key={`label-${display}`}
                    className={`text-[11px] font-bold px-2.5 py-[3px] rounded-[20px] border whitespace-nowrap shrink-0 ${ANIM.meletup} ${STAGE_CLS[display].badge}`}
                  >
                    {STAGE_STATUS_LABEL[display]}
                  </span>
                )}
                {siap.length > 0 && (
                  <button
                    type="button"
                    title={`Cetak sekaligus ${siap.length} dokumen Fase ${stage.num} (satu PDF)`}
                    disabled={mencetakFase !== null}
                    onClick={() => cetakFase(stage.num, siap, `Fase ${stage.num} — ${stage.label}`)}
                    className={`${BTN.sm} shrink-0 disabled:opacity-60`}
                  >
                    {mencetakFase === stage.num ? (
                      <FaCircleNotch size={12} className="animate-spin" />
                    ) : (
                      <FaPrint size={12} />
                    )}
                    {mencetakFase === stage.num ? 'Menyiapkan…' : `Cetak Semua (${siap.length})`}
                  </button>
                )}
                {aksi && (
                  <TombolBuat
                    key={aksi.isi + aksi.label}
                    label={aksi.label}
                    ikon={aksi.ikon}
                    onClick={() => goForm(aksi.isi)}
                  />
                )}
              </div>
              <ProgressBar
                value={pct}
                className={`h-1 ${T.surface2} [&::-webkit-progress-bar]:bg-[#F3F5F8] dark:[&::-webkit-progress-bar]:bg-[#16243A] ${
                  locked
                    ? '[&::-webkit-progress-value]:bg-[#E0E5EC] [&::-moz-progress-bar]:bg-[#E0E5EC] dark:[&::-webkit-progress-value]:bg-[#233450] dark:[&::-moz-progress-bar]:bg-[#233450]'
                    : '[&::-webkit-progress-value]:bg-[#0f2040] [&::-moz-progress-bar]:bg-[#0f2040] dark:[&::-webkit-progress-value]:bg-[#7DB6F3] dark:[&::-moz-progress-bar]:bg-[#7DB6F3]'
                }`}
              />

              {locked ? (
                <div
                  data-bertahap
                  className={`flex items-center gap-2 px-4 sm:px-5 py-4 text-[12.5px] border-t ${T.border} ${T.inkMuted}`}
                >
                  <FaLock size={13} className="shrink-0" />
                  <span>
                    Selesaikan fase "{stages[si - 1].stage.label}" terlebih dahulu untuk membuka
                    fase ini.
                  </span>
                </div>
              ) : (
                <>
                  {(stage.items || []).map((doc) => (
                    <SingleCard
                      key={doc.key}
                      doc={doc}
                      status={lpjSingleStatus(pack, stage, doc)}
                      onLihat={dok.lihat}
                    />
                  ))}
                  {(stage.groups || []).map((group) => (
                    <GroupCard
                      key={group.key}
                      pack={pack}
                      stage={stage}
                      group={group}
                      status={lpjGroupStatus(pack, stage, group)}
                      onLihat={dok.lihat}
                    />
                  ))}
                  {/* Fase 4 Perjadin: bukti pengeluaran per pelaksana (opsional) */}
                  {isPerjadin(pack) && stage.num === 4 && (
                    <BuktiPengeluaran pack={pack} user={user} showToast={showToast} />
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Fase terakhir: progres pengolahan berkas oleh Admin/Keuangan (hanya-baca) */}
      <FaseProgresBerkas
        pack={pack}
        num={stages.length + 1}
        pegawai={pegawai}
        showToast={showToast}
      />

      {dok.modal}
    </Shell>
  );
}

/**
 * Nomor fase tujuan gulir: `aktif` = fase terbuka pertama yang belum selesai (null bila berkas
 * sudah tuntas); selain itu langkah form (`?isi=`) yang baru ditinggalkan.
 */
function faseTujuan(stages, kunci) {
  if (kunci === 'aktif') {
    return stages.find((s) => !s.locked && s.display !== 'selesai')?.stage.num || null;
  }
  const isi = kunci === 'cetak-spd' ? 'spd' : kunci;
  const punya = ({ stage }) =>
    [...(stage.items || []), ...(stage.groups || [])].some((d) => d.isi === isi);
  return stages.find(punya)?.stage.num || null;
}

// ─── Sub-komponen ─────────────────────────────────────────────────────────────

function Shell({ wadahRef, children }) {
  return (
    <div className={`min-h-full ${T.ground}`}>
      <div className={LAYOUT.page}>
        <section ref={wadahRef} className={LAYOUT.card}>
          {children}
        </section>
      </div>
    </div>
  );
}

function DocIcon({ status }) {
  const cls =
    {
      selesai: `${STATUS.doneSolid} text-white dark:text-[#0A121D]`,
      proses: 'bg-[#2A78D6] text-white dark:bg-[#3987e5]',
      menunggu: `${STATUS.warnSolid} text-white`,
    }[status] || `${T.surface2} ${T.inkMuted}`;
  const Icon =
    { selesai: FaCheck, proses: FaClock, menunggu: FaLock, terkunci: FaLock }[status] ||
    FaRegFileAlt;
  return (
    <div
      className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${ANIM.meletup} ${cls}`}
    >
      <Icon size={13} />
    </div>
  );
}

function CodeBadge({ code }) {
  return (
    <span
      className={`text-[10px] font-extrabold tracking-[.02em] px-[7px] py-[3px] rounded-md border shrink-0 whitespace-nowrap ${T.surface2} ${T.ink2} ${T.border}`}
    >
      {code || ''}
    </span>
  );
}

/**
 * Dokumen satu fase yang bisa dicetak sekaligus, urut sesuai tampilan: dokumen yang sudah jadi
 * (sama dengan yang punya tombol Lihat / Print) dan punya template PDF, ditambah scan SP ber-TTE
 * yang diunggah (Fase 2, dicetak paling depan). Foto lampiran & dokumen tanpa template dilewati.
 * Fase 1 Perjadin (Surat Perintah saja) tidak memakai cetak sekaligus.
 */
function dokumenSiapCetak(pack, stage) {
  if (isPerjadin(pack) && stage.num === 1) return [];
  const tunggal = (stage.items || []).filter(
    (d) =>
      lpjSingleStatus(pack, stage, d) === 'selesai' &&
      (d.berkas ? !!pack.sp?.scan : punyaTemplatePdf(d)),
  );
  const sub = (stage.groups || []).flatMap((g) =>
    g.subItems.filter((it) => lpjGroupSubDone(pack, stage, g, it) && punyaTemplatePdf(it)),
  );
  return [...tunggal, ...sub];
}

/**
 * Satu-satunya tombol untuk melanjutkan progres ada di kepala blok fase: dokumen pertama fase ini
 * yang belum selesai menentukan aksinya (mulai / lanjutkan / cetak SPD). Baris dokumen hanya
 * berisi Lihat/Print.
 * @returns {{ isi: string, label: string, ikon: Function }|null}
 */
function aksiFase(pack, stage) {
  const docs = [
    ...(stage.items || []).map((d) => ({ d, status: lpjSingleStatus(pack, stage, d) })),
    ...(stage.groups || []).map((d) => ({ d, status: lpjGroupStatus(pack, stage, d) })),
  ];
  const aktif = docs.find(({ status }) => ['belum', 'proses', 'menunggu'].includes(status));
  if (!aktif) return null;
  const { d, status } = aktif;
  if (status === 'menunggu') return { isi: 'cetak-spd', label: 'Cetak SPD', ikon: FaPrint };
  const teks = TEKS_AKSI[d.key] || { mulai: 'Mulai Isi', lanjut: 'Lanjutkan', ikon: FaPlus };
  return status === 'proses'
    ? { isi: d.isi, label: teks.lanjut, ikon: FaArrowRight }
    : { isi: d.isi, label: teks.mulai, ikon: teks.ikon };
}

// Teks tombol fase per dokumen: mulai (belum diisi) / lanjut (sudah mulai diisi)
const TEKS_AKSI = {
  sp: { mulai: 'Buat Surat Perintah', lanjut: 'Lanjutkan Surat Perintah', ikon: FaPlus },
  tte: { mulai: 'Upload SP ber-TTE', lanjut: 'Lanjutkan Upload SP', ikon: FaUpload },
  spd: { mulai: 'Isi SPD', lanjut: 'Lanjutkan SPD', ikon: FaPlus },
  lpjpack: { mulai: 'Buat SPBy & LPJ', lanjut: 'Lanjutkan SPBy & LPJ', ikon: FaPlus },
  laporan: { mulai: 'Buat Laporan Kegiatan', lanjut: 'Lanjutkan Laporan', ikon: FaPlus },
  nprincian: { mulai: 'Buat SPBy & Rincian', lanjut: 'Lanjutkan SPBy & Rincian', ikon: FaPlus },
  nplampiran: { mulai: 'Upload Lampiran', lanjut: 'Lanjutkan Lampiran', ikon: FaUpload },
};

/** Tombol "Lihat" / "Lihat / Print" dengan ukuran & lebar sama di semua baris dokumen. */
function TombolLihat({ onClick, children }) {
  return (
    <button
      type="button"
      className={`${BTN.sm} w-[122px] shrink-0 justify-center`}
      onClick={onClick}
    >
      <FaRegEye size={12} /> {children}
    </button>
  );
}

function BelumDibuat({ teks = 'Belum dibuat' }) {
  return <span className={`text-[11.5px] shrink-0 ${T.inkMuted}`}>{teks}</span>;
}

function SingleCard({ doc, status, onLihat }) {
  let actions = null;
  if (status === 'selesai' || status === 'proses') {
    // Satu tombol: popup pratinjau, yang juga bisa langsung mencetak (berkas unggahan seperti
    // scan SP lewat tombol Cetak di popup). Draf yang belum selesai cukup berlabel "Lihat".
    const bisaPrint = status === 'selesai';
    actions = (
      <TombolLihat onClick={() => onLihat(doc)}>
        {bisaPrint ? 'Lihat / Print' : 'Lihat'}
      </TombolLihat>
    );
  } else {
    actions = <BelumDibuat />; // tombol untuk melanjutkan ada di blok fase
  }

  return (
    <div
      data-bertahap
      className={`flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-[13px] border-t ${T.border}`}
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <DocIcon key={status} status={status} />
        <CodeBadge code={doc.code} />
        <div className="flex-1 min-w-0">
          <div className={`text-[13px] font-semibold ${T.ink}`}>{doc.label}</div>
          {status === 'selesai' && doc.noEdit && (
            <div className={`text-[11px] mt-px ${T.inkMuted}`}>
              Sudah final — tidak dapat diubah
            </div>
          )}
        </div>
      </div>
      {actions}
    </div>
  );
}

function GroupCard({ pack, stage, group, status, onLihat }) {
  // Pack LPJ & SPBy (Fase 3): tanpa baris kepala pack, tiap dokumen tampil langsung
  if (group.key === 'lpjpack') {
    return (
      <PackDokumen pack={pack} stage={stage} group={group} status={status} onLihat={onLihat} />
    );
  }
  // Tombol untuk melanjutkan (mulai/lanjutkan/cetak SPD) ada di blok fase, bukan di sini
  let headerAction = null;
  if (status === 'proses') headerAction = <BelumDibuat teks="Sedang diisi" />;
  else if (status === 'terkunci') headerAction = <BelumDibuat teks="Upload SP terlebih dahulu" />;
  else if (status === 'belum') headerAction = <BelumDibuat />;

  return (
    <div>
      <div
        data-bertahap
        className={`flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-[13px] border-t ${T.border}`}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <DocIcon key={status} status={status} />
          <CodeBadge code={group.code} />
          <div className="flex-1 min-w-0">
            <div className={`text-[13px] font-semibold ${T.ink}`}>{group.label}</div>
            {status === 'selesai' && group.noEdit && (
              <div className={`text-[11px] mt-px ${T.inkMuted}`}>
                Sudah final — tidak dapat diubah
              </div>
            )}
            {status === 'menunggu' && (
              <div className={`text-[11px] mt-px ${STATUS.warnInk}`}>
                Sudah ditandai selesai — tinggal dicetak satu per satu
              </div>
            )}
          </div>
        </div>
        {headerAction}
      </div>

      {group.subItems.length === 0 && (
        <div
          className={`py-[9px] pl-6 sm:pl-[52px] pr-4 sm:pr-5 border-t text-[12px] ${T.border} ${T.inkMuted}`}
        >
          Belum ada pelaksana. Isi Surat Perintah terlebih dahulu.
        </div>
      )}
      {bagianSub(group.subItems).map((b) => {
        const selesai = (item) => lpjGroupSubDone(pack, stage, group, item);
        return b.kelompok ? (
          <KelompokPelaksana key={b.docKey} bagian={b} selesai={selesai} onLihat={onLihat} />
        ) : (
          b.items.map((item) => (
            <BarisSub key={item.key} item={item} done={selesai(item)} onLihat={onLihat} />
          ))
        );
      })}
    </div>
  );
}

/** Baris dokumen tingkat atas (gaya SingleCard / kepala GroupCard): ikon status · kode · nama · aksi. */
function BarisDokumen({ status, code, label, aksi }) {
  return (
    <div
      data-bertahap
      className={`flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-[13px] border-t ${T.border}`}
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <DocIcon key={status} status={status} />
        <CodeBadge code={code} />
        <div className={`flex-1 min-w-0 text-[13px] font-semibold ${T.ink}`}>{label}</div>
      </div>
      {aksi}
    </div>
  );
}

/**
 * Dokumen pack LPJ & SPBy ditampilkan satu per satu (urutan sama dengan Berkas Verifikasi):
 * dokumen tunggal = satu baris berisi Lihat/Print; dokumen per pelaksana = baris kepala seperti
 * "SPD (Surat Perjalanan Dinas)" lalu satu baris per pelaksana di bawahnya.
 */
function PackDokumen({ pack, stage, group, status, onLihat }) {
  const selesai = (item) => lpjGroupSubDone(pack, stage, group, item);
  const belum = <BelumDibuat teks={status === 'proses' ? 'Sedang diisi' : 'Belum dibuat'} />;
  const ikon = (done) => (done ? 'selesai' : status === 'proses' ? 'proses' : 'belum');

  const bagian = [];
  group.subItems.forEach((item) => {
    const akhir = bagian[bagian.length - 1];
    if (item.pegawai && akhir?.docKey === item.docKey) akhir.items.push(item);
    else bagian.push({ docKey: item.docKey, perOrang: !!item.pegawai, items: [item] });
  });

  return bagian.map(({ docKey, perOrang, items }) => {
    if (!perOrang) {
      const item = items[0];
      const done = selesai(item);
      return (
        <BarisDokumen
          key={docKey}
          status={ikon(done)}
          code={item.code}
          label={item.label}
          aksi={
            done ? <TombolLihat onClick={() => onLihat(item)}>Lihat / Print</TombolLihat> : belum
          }
        />
      );
    }
    const semua = items.every(selesai);
    return (
      <div key={docKey}>
        <BarisDokumen
          status={ikon(semua)}
          code={items[0].code}
          label={items[0].docLabel}
          aksi={semua ? null : belum}
        />
        {items.map((item) => (
          <BarisSub key={item.key} item={item} done={selesai(item)} onLihat={onLihat} />
        ))}
      </div>
    );
  });
}

/**
 * Urutkan sub-dokumen menjadi bagian: dokumen per pelaksana yang sejenis (SPTJM, Rincian SPBy, …)
 * digabung menjadi satu kelompok bila pelaksananya lebih dari satu — kecuali seluruh kelompok
 * dokumen memang satu jenis (mis. SPD), karena kepala kelompoknya sudah menjadi judul.
 */
function bagianSub(items) {
  const hasil = [];
  items.forEach((item) => {
    const akhir = hasil[hasil.length - 1];
    if (item.pegawai && akhir?.docKey === item.docKey) akhir.items.push(item);
    else hasil.push({ docKey: item.docKey, label: item.docLabel, code: item.code, items: [item] });
  });
  if (hasil.length > 1) hasil.forEach((b) => (b.kelompok = b.items.length > 1));
  return hasil;
}

function KotakCentang({ done, kecil }) {
  return (
    <span
      key={done ? 'ya' : 'belum'}
      className={`${kecil ? 'w-4 h-4 rounded-[5px]' : 'w-[18px] h-[18px] rounded-md'} shrink-0 flex items-center justify-center ${ANIM.meletup} ${
        done ? `${STATUS.doneSolid} text-white dark:text-[#0A121D]` : `${T.bgBorder} ${T.inkMuted}`
      }`}
    >
      {done && <FaCheck size={kecil ? 8 : 9} />}
    </span>
  );
}

/** Satu baris sub-dokumen; `nama` mengganti label (di dalam kelompok cukup nama pelaksana). */
function BarisSub({ item, done, onLihat, nama, dalam }) {
  return (
    <div
      data-bertahap
      className={`flex items-center justify-between gap-2.5 border-t ${T.border} ${
        dalam ? 'py-2 pl-10 sm:pl-[78px] pr-4 sm:pr-5' : 'py-[9px] pl-6 sm:pl-[52px] pr-4 sm:pr-5'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {/* Ikon dokumen (status cukup dari tombol Lihat / "Belum tersedia"); biru tua bila sudah jadi */}
        <FaRegFileAlt
          key={done ? 'ya' : 'belum'}
          size={dalam ? 12 : 13}
          aria-hidden="true"
          className={`shrink-0 ${ANIM.meletup} ${done ? STATUS.doneInk : T.inkMuted}`}
        />
        {!dalam && <CodeBadge code={item.code} />}
        <span className={`text-[12.5px] ${T.ink2} break-words`}>{nama || item.label}</span>
      </div>
      {done ? (
        // Popup pratinjau PDF; mencetak langsung dari popup
        <TombolLihat onClick={() => onLihat(item)}>Lihat / Print</TombolLihat>
      ) : (
        <span className={`text-[11px] shrink-0 ${T.inkMuted}`}>Belum tersedia</span>
      )}
    </div>
  );
}

/**
 * Kelompok satu jenis dokumen per pelaksana (mis. "SPTJM (2/3)"), bisa dibuka/ditutup seperti
 * Pemeriksaan Dokumen di Berkas Verifikasi; terbuka bawaan bila pelaksananya ≤ 4.
 */
function KelompokPelaksana({ bagian, selesai, onLihat }) {
  const [buka, setBuka] = useState(bagian.items.length <= 4);
  const nDone = bagian.items.filter(selesai).length;
  const semua = nDone === bagian.items.length;
  return (
    <div>
      <button
        type="button"
        data-bertahap
        aria-expanded={buka}
        onClick={() => setBuka(!buka)}
        className={`w-full flex items-center gap-2 py-[9px] pl-6 sm:pl-[52px] pr-4 sm:pr-5 border-t text-left ${T.border} ${T.hoverSurface2}`}
      >
        <KotakCentang done={semua} />
        <CodeBadge code={bagian.code} />
        <span className={`min-w-0 text-[12.5px] font-semibold break-words ${T.ink}`}>
          {bagian.label}
        </span>
        <span className={`text-[11.5px] font-semibold shrink-0 ${T.inkMuted}`}>
          ({nDone}/{bagian.items.length})
        </span>
        <span className={`ml-auto flex items-center gap-1.5 text-[11px] shrink-0 ${T.inkMuted}`}>
          {bagian.items.length} pelaksana
          <FaChevronDown
            size={11}
            className={`motion-safe:transition-transform motion-safe:duration-200 ${buka ? 'rotate-180' : ''}`}
          />
        </span>
      </button>
      <Lipat buka={buka}>
        {bagian.items.map((item) => (
          <BarisSub
            key={item.key}
            item={item}
            done={selesai(item)}
            onLihat={onLihat}
            nama={item.pegawai?.nama}
            dalam
          />
        ))}
      </Lipat>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <Shell>
      <div className="animate-pulse space-y-4">
        <div className={`h-4 w-40 rounded ${T.surface2}`} />
        <div className={`h-32 rounded-[14px] ${T.surface2}`} />
        {[1, 2, 3].map((i) => (
          <div key={i} className={`h-24 rounded-[14px] ${T.surface2}`} />
        ))}
      </div>
    </Shell>
  );
}
