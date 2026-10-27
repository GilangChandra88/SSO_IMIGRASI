import React, { useState } from 'react';
import { FaCheck, FaChevronDown, FaClock, FaPrint, FaRegFileAlt, FaUndo } from 'react-icons/fa';
import { Lipat } from '@/components/animasi';
import { dokDicetak, dokLengkap } from '../../utils/verifikasiLogic';
import ProgressBar from '../../ui/ProgressBar';
import { FONT, STAGE_CLS, STATUS, T } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';
import { IB_CLS } from './tahapTampil';

/**
 * Daftar Pemeriksaan Dokumen (PgvDocCheck purwarupa), bergaya kartu Detail LPJ: satu kartu per
 * dokumen (ikon status · kode · nama · tombol). Dokumen per pelaksana dan lampiran memuat daftar
 * pelaksana/berkasnya di bawah kepala kartu (bisa dibuka/ditutup); kepala kartu dokumen per
 * pelaksana tanpa tombol.
 * Tombol berupa simbol:
 *   Cetak   = cetak dokumen bila pelaksana belum membawanya (dicatat "sudah dicetak")
 *   Centang = dokumen sudah diterima (selesai)
 *   Ulang   = muncul setelah Cetak/Centang; membatalkan pilihan, dokumen kembali ke awal
 * Dokumen tanpa `cetak` (bukti fisik) hanya bisa dicentang.
 */

function TombolDok({ jenis, on, label, onClick, disabled }) {
  const Ikon = jenis === 'cetak' ? FaPrint : jenis === 'centang' ? FaCheck : FaUndo;
  const judul = { cetak: 'Cetak', centang: 'Centang', ulang: 'Ulang: batalkan pilihan' }[jenis];
  return (
    <button
      type="button"
      title={judul}
      aria-label={label}
      aria-pressed={jenis === 'centang' ? on : undefined}
      disabled={disabled}
      onClick={onClick}
      className={IB_CLS[jenis](on)}
    >
      <Ikon size={13} />
    </button>
  );
}

/** Tombol Cetak / Centang / Ulang satu dokumen. */
function AksiDok({ doc, verif, act }) {
  const ok = dokLengkap(verif, doc.key);
  const dicetak = dokDicetak(verif, doc.key);
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {(!ok || act.kunci) && doc.cetak && (
        <TombolDok
          jenis="cetak"
          on={dicetak}
          label={`Cetak ${doc.nama}`}
          onClick={() => act.cetak(doc)}
        />
      )}
      {!act.kunci && (
        <TombolDok
          jenis="centang"
          on={ok}
          label={`Centang ${doc.nama}`}
          onClick={() => (ok ? act.ulang([doc]) : act.centang([doc]))}
        />
      )}
      {(ok || dicetak) && !act.kunci && (
        <span key="ulang" className={`inline-flex ${ANIM.meletup}`}>
          <TombolDok jenis="ulang" label={`Ulang ${doc.nama}`} onClick={() => act.ulang([doc])} />
        </span>
      )}
    </div>
  );
}

/** Tombol Cetak / Centang / Ulang untuk semua dokumen satu kelompok. */
function AksiKelompok({ g, verif, act }) {
  const semua = g.docs.every((d) => dokLengkap(verif, d.key));
  const disentuh = g.docs.some((d) => dokLengkap(verif, d.key) || dokDicetak(verif, d.key));
  const bisaCetak = g.docs.some((d) => d.cetak);
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {(!semua || act.kunci) && bisaCetak && (
        <TombolDok
          jenis="cetak"
          on={g.docs.every((d) => dokDicetak(verif, d.key))}
          label={act.kunci ? `Cetak semua ${g.label}` : `Cetak ${g.label} yang belum dicentang`}
          onClick={() => act.cetakSemua(g.label, g.docs)}
        />
      )}
      {!act.kunci && (
        <TombolDok
          jenis="centang"
          on={semua}
          disabled={semua}
          label={`Centang semua ${g.label}`}
          onClick={() => act.centang(g.docs)}
        />
      )}
      {disentuh && !act.kunci && (
        <span key="ulang" className={`inline-flex ${ANIM.meletup}`}>
          <TombolDok
            jenis="ulang"
            label={`Ulang semua ${g.label}`}
            onClick={() => act.ulang(g.docs)}
          />
        </span>
      )}
    </div>
  );
}

/** Ikon status di kepala kartu: dicentang · sudah dicetak · sebagian · belum. */
function IkonStatus({ status }) {
  const cls =
    {
      ok: `${STATUS.doneSolid} text-white dark:text-[#0A121D]`,
      dicetak: 'bg-[#2A78D6] text-white dark:bg-[#3987e5]',
      sebagian: 'bg-[#2A78D6] text-white dark:bg-[#3987e5]',
    }[status] || `${T.surface2} ${T.inkMuted}`;
  const Ikon = { ok: FaCheck, dicetak: FaPrint, sebagian: FaClock }[status] || FaRegFileAlt;
  return (
    <span
      key={status}
      className={`w-9 h-9 shrink-0 rounded-[10px] flex items-center justify-center ${ANIM.meletup} ${cls}`}
    >
      <Ikon size={14} />
    </span>
  );
}

function KodeDok({ code }) {
  if (!code) return null;
  return (
    <span
      className={`text-[10px] font-extrabold tracking-[.02em] px-[7px] py-[3px] rounded-md border shrink-0 whitespace-nowrap ${T.surface2} ${T.ink2} ${T.border}`}
    >
      {code}
    </span>
  );
}

const sudahDicetak = (verif, doc) => dokDicetak(verif, doc.key) && !dokLengkap(verif, doc.key);

/** Bingkai kartu dokumen; biru lembut bila semua isinya sudah dicentang. */
function Kartu({ selesai, children }) {
  return (
    <div
      className={`${T.surface} border rounded-[14px] overflow-hidden motion-safe:transition-colors motion-safe:duration-200 ${
        selesai ? STAGE_CLS.selesai.border : T.border
      }`}
    >
      {children}
    </div>
  );
}

/** Kepala kartu: ikon status · kode · nama (+ keterangan) · tombol. */
function KepalaKartu({ status, code, nama, ket, children, aksi }) {
  return (
    <div className="flex items-center gap-3 px-4 sm:px-5 py-3">
      <IkonStatus status={status} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <KodeDok code={code} />
          <h3 className={`${FONT.head} font-bold text-[14px] break-words min-w-0 ${T.ink}`}>
            {nama}
          </h3>
          {children}
        </div>
        {ket && <p className={`text-xs mt-0.5 ${T.inkMuted}`}>{ket}</p>}
      </div>
      {aksi}
    </div>
  );
}

/** Dokumen tunggal (satu berkas untuk seluruh kegiatan, atau satu pelaksana saja). */
function KartuDok({ doc, verif, act }) {
  const ok = dokLengkap(verif, doc.key);
  const dicetak = sudahDicetak(verif, doc);
  return (
    <Kartu selesai={ok}>
      <KepalaKartu
        status={ok ? 'ok' : dicetak ? 'dicetak' : 'belum'}
        code={doc.code}
        nama={doc.nama}
        ket={dicetak ? 'Sudah dicetak, menunggu dicentang' : doc.sub}
        aksi={<AksiDok doc={doc} verif={verif} act={act} />}
      />
    </Kartu>
  );
}

/** Dokumen per pelaksana / lampiran: kepala kartu + daftar dokumennya di bawah. */
function KartuKelompok({ g, verif, act }) {
  const [buka, setBuka] = useState(true);
  const nOk = g.docs.filter((d) => dokLengkap(verif, d.key)).length;
  const semua = nOk === g.docs.length;
  const disentuh = g.docs.some((d) => dokLengkap(verif, d.key) || dokDicetak(verif, d.key));
  return (
    <Kartu selesai={semua}>
      <KepalaKartu
        status={semua ? 'ok' : disentuh ? 'sebagian' : 'belum'}
        code={g.code}
        nama={g.label}
        ket={`${nOk}/${g.docs.length} dicentang · ${g.docs.length} ${g.satuan || 'dokumen'}`}
        // Dokumen per pelaksana dicetak/dicentang lewat baris tiap pelaksana saja
        aksi={g.satuan === 'pelaksana' ? null : <AksiKelompok g={g} verif={verif} act={act} />}
      >
        <button
          type="button"
          aria-expanded={buka}
          aria-label={buka ? `Tutup daftar ${g.label}` : `Buka daftar ${g.label}`}
          onClick={() => setBuka(!buka)}
          className={`grid place-items-center w-6 h-6 shrink-0 rounded-md ${T.inkMuted} ${T.hoverSurface2}`}
        >
          <FaChevronDown
            size={11}
            className={`motion-safe:transition-transform motion-safe:duration-200 ${buka ? 'rotate-180' : ''}`}
          />
        </button>
      </KepalaKartu>
      <ProgressBar
        value={(nOk / g.docs.length) * 100}
        className={`h-1 ${T.surface2} [&::-webkit-progress-bar]:bg-[#F3F5F8] dark:[&::-webkit-progress-bar]:bg-[#16243A] [&::-webkit-progress-value]:bg-[#0f2040] [&::-moz-progress-bar]:bg-[#0f2040] dark:[&::-webkit-progress-value]:bg-[#7DB6F3] dark:[&::-moz-progress-bar]:bg-[#7DB6F3]`}
      />
      <Lipat buka={buka}>
        {g.docs.map((d) => (
          <BarisSub key={d.key} doc={d} verif={verif} act={act} />
        ))}
      </Lipat>
    </Kartu>
  );
}

/** Satu baris pelaksana / berkas di dalam kartu (BarisSub Detail LPJ). */
function BarisSub({ doc, verif, act }) {
  const ok = dokLengkap(verif, doc.key);
  const dicetak = sudahDicetak(verif, doc);
  return (
    <div
      className={`flex items-center justify-between gap-2.5 py-2 pl-6 sm:pl-[64px] pr-4 sm:pr-5 border-t ${T.border}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          key={ok ? 'ya' : 'belum'}
          className={`w-[18px] h-[18px] shrink-0 rounded-full flex items-center justify-center ${ANIM.meletup} ${
            ok
              ? `${STATUS.doneSolid} text-white dark:text-[#0A121D]`
              : `border-[1.5px] ${T.borderStrong}`
          }`}
        >
          {ok && <FaCheck size={8} />}
        </span>
        <div className="min-w-0">
          <div className={`text-[12.5px] break-words ${ok ? T.ink : T.ink2}`}>{doc.singkat}</div>
          {dicetak && (
            <div className={`text-[11px] ${T.inkMuted}`}>Sudah dicetak, menunggu dicentang</div>
          )}
        </div>
      </div>
      <AksiDok doc={doc} verif={verif} act={act} />
    </div>
  );
}

/**
 * `act` = { cetak(doc), cetakSemua(label, docs), centang(docs), ulang(docs), kunci }
 * `kunci` = verifikasi sudah selesai: hanya tombol Cetak yang tersisa.
 */
export default function PemeriksaanDokumen({ kelompok, verif, act }) {
  return (
    <div className="flex flex-col gap-2.5">
      {kelompok.map((g, gi) =>
        g.kelompok ? (
          <KartuKelompok key={gi} g={g} verif={verif} act={act} />
        ) : (
          g.docs.map((d) => <KartuDok key={d.key} doc={d} verif={verif} act={act} />)
        ),
      )}
    </div>
  );
}
