import React, { useState } from 'react';
import { FaCheck, FaChevronDown, FaPrint, FaRegFileAlt, FaUndo } from 'react-icons/fa';
import { Lipat } from '@/components/animasi';
import { dokDicetak, dokLengkap } from '../../utils/verifikasiLogic';
import { STATUS, T } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';
import { IB_CLS } from './tahapTampil';

/**
 * Daftar Pemeriksaan Dokumen (PgvDocCheck purwarupa). Tombol berupa simbol:
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

function BarisDok({ no, doc, sub, verif, act, anak }) {
  const ok = dokLengkap(verif, doc.key);
  const dicetak = dokDicetak(verif, doc.key);
  const disentuh = ok || dicetak;
  const nama = anak ? doc.singkat : doc.nama;
  let ket = doc.sub;
  if (dicetak && !ok) ket = 'Sudah dicetak, menunggu dicentang';
  return (
    <div
      className={`flex items-center gap-2.5 sm:gap-3 border ${anak ? 'rounded-[10px] px-2.5 py-[7px]' : 'rounded-xl px-3 py-2.5'} ${
        ok
          ? `${STATUS.doneBg} border-[rgba(42,120,214,.35)] dark:border-[rgba(125,182,243,.35)]`
          : `${T.surface} ${T.border}`
      } motion-safe:transition-colors motion-safe:duration-200`}
    >
      <span
        className={`grid place-items-center shrink-0 font-extrabold text-xs ${
          anak ? 'w-[22px] h-[22px] rounded-full border-[1.5px]' : 'w-7 h-7 rounded-lg'
        } ${
          ok
            ? STATUS.doneOn
            : anak
              ? `${T.borderStrong} ${T.inkMuted}`
              : `${T.surface2} ${T.inkMuted}`
        }`}
      >
        {ok ? <FaCheck key="ok" size={anak ? 10 : 12} className={ANIM.meletup} /> : anak ? '' : no}
      </span>
      <div className="flex-1 min-w-0">
        <b
          className={`block break-words ${anak ? `text-[13px] font-semibold ${ok ? T.ink : T.ink2}` : `text-[13.5px] font-bold ${T.ink}`}`}
        >
          {nama}
        </b>
        {(sub || ket) && (
          <small className={`block mt-0.5 text-[11.5px] ${T.inkMuted}`}>{ket || sub}</small>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {(!ok || act.kunci) && doc.cetak && (
          <TombolDok
            jenis="cetak"
            on={dicetak}
            label={`Cetak ${nama}`}
            onClick={() => act.cetak(doc)}
          />
        )}
        {!act.kunci && (
          <TombolDok
            jenis="centang"
            on={ok}
            label={`Centang ${nama}`}
            onClick={() => (ok ? act.ulang([doc]) : act.centang([doc]))}
          />
        )}
        {disentuh && !act.kunci && (
          <span key="ulang" className={`inline-flex ${ANIM.meletup}`}>
            <TombolDok jenis="ulang" label={`Ulang ${nama}`} onClick={() => act.ulang([doc])} />
          </span>
        )}
      </div>
    </div>
  );
}

function KelompokDok({ g, verif, act }) {
  const [buka, setBuka] = useState(g.docs.length <= 4);
  const nOk = g.docs.filter((d) => dokLengkap(verif, d.key)).length;
  const semua = nOk === g.docs.length;
  const disentuh = g.docs.some((d) => dokLengkap(verif, d.key) || dokDicetak(verif, d.key));
  const bisaCetak = g.docs.some((d) => d.cetak);
  const semuaDicetak = g.docs.every((d) => dokDicetak(verif, d.key));
  return (
    <div
      className={`rounded-xl border ${semua ? `${STATUS.doneBg} border-[rgba(42,120,214,.35)] dark:border-[rgba(125,182,243,.35)]` : `${T.surface} ${T.border}`} motion-safe:transition-colors motion-safe:duration-200`}
    >
      <div className="flex items-center gap-2 sm:gap-2.5 px-3 py-2.5">
        <button
          type="button"
          aria-expanded={buka}
          onClick={() => setBuka(!buka)}
          className={`flex-1 min-w-0 flex items-center gap-2.5 text-left rounded-md ${T.ink}`}
        >
          <span
            className={`grid place-items-center w-7 h-7 shrink-0 rounded-lg ${semua ? STATUS.doneOn : `${T.surface2} ${T.inkMuted}`}`}
          >
            <FaRegFileAlt size={12} />
          </span>
          <b className="text-[13.5px] font-bold truncate">{g.label}</b>
          <span className={`text-[12.5px] font-semibold shrink-0 ${T.inkMuted}`}>
            ({nOk}/{g.docs.length})
          </span>
          <FaChevronDown
            size={12}
            className={`ml-auto shrink-0 ${T.inkMuted} motion-safe:transition-transform motion-safe:duration-200 ${buka ? 'rotate-180' : ''}`}
          />
        </button>
        <div className="flex items-center gap-1.5 shrink-0">
          {(!semua || act.kunci) && bisaCetak && (
            <TombolDok
              jenis="cetak"
              on={semuaDicetak}
              label={`Cetak semua ${g.label}`}
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
      </div>
      <Lipat buka={buka}>
        <div
          className={`flex flex-col gap-1.5 mx-2.5 sm:ml-[25px] sm:mr-3 mb-3 pl-2 sm:pl-3.5 border-l-2 ${T.border}`}
        >
          {g.docs.map((d) => (
            <BarisDok key={d.key} doc={d} verif={verif} act={act} anak />
          ))}
        </div>
      </Lipat>
    </div>
  );
}

/**
 * `act` = { cetak(doc), cetakSemua(label, docs), centang(docs), ulang(docs), kunci }
 * `kunci` = verifikasi sudah selesai: hanya tombol Cetak yang tersisa.
 */
export default function PemeriksaanDokumen({ kelompok, verif, act }) {
  // Nomor urut: satu per dokumen tunggal dan satu per kelompok
  const nomor = kelompok.reduce(
    (acc, g) => {
      if (g.kelompok) acc.n += 1;
      else g.docs.forEach((d) => (acc.map[d.key] = ++acc.n));
      return acc;
    },
    { n: 0, map: {} },
  ).map;
  return (
    <div className="flex flex-col gap-2">
      {kelompok.map((g, gi) => {
        if (g.kelompok) return <KelompokDok key={gi} g={g} verif={verif} act={act} />;
        return (
          <React.Fragment key={gi}>
            {g.label && (
              <div
                className={`text-[10.5px] font-bold uppercase tracking-[.05em] mt-3.5 first:mt-0 mb-0.5 ${T.inkMuted}`}
              >
                {g.label}
              </div>
            )}
            {g.docs.map((d) => (
              <BarisDok key={d.key} no={nomor[d.key]} doc={d} sub={d.sub} verif={verif} act={act} />
            ))}
          </React.Fragment>
        );
      })}
    </div>
  );
}
