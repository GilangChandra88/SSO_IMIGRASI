import React from 'react';
import {
  FaCheck,
  FaChevronLeft,
  FaDownload,
  FaInfoCircle,
  FaRegClock,
  FaRegEye,
} from 'react-icons/fa';
import { pesanGalat } from '@/utils/pesanGalat';
import { BTN, FORM, NAVY, STATUS, T } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';
import { tandaiDicetak } from '../../services/berkasDb';

const inisial = (nama) =>
  String(nama || '')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

/**
 * Fase 2 lanjutan — cetak/unduh SPD untuk tiap pelaksana. Penanda "sudah dicetak" disimpan di
 * `dicetak.spd.{pegawaiId}` berkas (boleh kapan saja, juga setelah SPD final).
 */
export default function StepCetakSPD({ ctx }) {
  const { pack, backToDetail, dok, user, showToast } = ctx;
  const kepada = pack.sp?.kepada || [];
  const dicetak = pack.dicetak?.spd || {};
  const printedCount = kepada.filter((p) => dicetak[p.pegawaiId]).length;
  const allPrinted = kepada.length > 0 && printedCount === kepada.length;

  const docSpd = (p) => ({
    key: `spd_${p.pegawaiId}`,
    docKey: 'spd',
    pegawai: p,
    label: `SPD — ${p.nama}`,
  });

  // Popup pratinjau PDF (sama dengan "Lihat"); unduh/cetak lewat tombol penampil PDF di popup
  async function cetak(p) {
    dok.lihat(docSpd(p));
    if (dicetak[p.pegawaiId]) return;
    try {
      await tandaiDicetak(pack.id, `spd.${p.pegawaiId}`, user.uid);
    } catch (err) {
      showToast(pesanGalat(err, 'Penanda "sudah dicetak" gagal disimpan.'), 'error');
    }
  }

  return (
    <>
      <div
        className={`rounded-xl border p-4 sm:p-[22px] mb-3.5 ${STATUS.infoBg} ${STATUS.infoBorder}`}
      >
        <div className={`flex items-start gap-2.5 text-[13px] ${STATUS.infoInk}`}>
          <FaInfoCircle size={15} className="shrink-0 mt-0.5" />
          <div>
            SPD <strong>{pack.spd?.nomorSpd}</strong> berhasil dibuat. Setiap pelaksana mendapat{' '}
            <strong>satu lembar SPD</strong> untuk dibawa saat perjalanan dinas.
          </div>
        </div>
      </div>

      <div className={FORM.card}>
        <h3 className={FORM.cardTitle}>Cetak / Download SPD per Pelaksana</h3>
        <p className={`mt-2 mb-[18px] text-xs ${T.ink2}`}>
          Dokumen ini harus <strong>dicetak</strong> dan dibawa saat perjalanan dinas.
        </p>
        <div className="flex flex-col gap-3">
          {kepada.map((p) => {
            const printed = !!dicetak[p.pegawaiId];
            return (
              <div
                key={p.pegawaiId}
                className={`rounded-[10px] border-[1.5px] overflow-hidden ${
                  printed ? `${STATUS.doneBorder} ${STATUS.doneBg}` : `${T.border} ${T.surface}`
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      key={printed ? 'sudah' : 'belum'}
                      className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-white text-xs font-bold ${ANIM.meletup} ${
                        printed ? STATUS.doneOn : NAVY.bg
                      }`}
                    >
                      {inisial(p.nama)}
                    </div>
                    <div className="min-w-0">
                      <div className={`text-[13.5px] font-semibold ${T.ink}`}>{p.nama}</div>
                      <div className={`text-[11.5px] ${T.ink2}`}>
                        {p.nip || '-'} · {p.jabatan || '-'}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {printed && (
                      <span
                        className={`text-[11.5px] font-semibold flex items-center gap-1 ${STATUS.doneInk} ${ANIM.meletup}`}
                      >
                        <FaCheck size={10} /> Sudah dicetak
                      </span>
                    )}
                    <button type="button" className={BTN.sm} onClick={() => dok.lihat(docSpd(p))}>
                      <FaRegEye size={12} /> Lihat
                    </button>
                    <button
                      type="button"
                      onClick={() => cetak(p)}
                      className={
                        printed
                          ? BTN.sm
                          : `inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg text-[12.5px] font-semibold text-white ${NAVY.bg} ${NAVY.hoverBg}`
                      }
                    >
                      <FaDownload size={12} /> {printed ? 'Download Ulang' : 'Download / Cetak'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {kepada.length > 0 && (
          <div
            className={`mt-4 flex items-center gap-2 px-3.5 py-2.5 rounded-lg border text-[12.5px] ${
              allPrinted
                ? `${STATUS.doneBg} ${STATUS.doneInk} ${STATUS.doneBorder}`
                : 'bg-[#fef9c3] text-[#92400e] border-[#8A5B00] dark:bg-[rgba(201,133,0,.22)] dark:text-[#F0B93E] dark:border-[#F0B93E]'
            }`}
          >
            {allPrinted ? <FaCheck size={12} /> : <FaRegClock size={12} />}
            {allPrinted
              ? `Semua ${kepada.length} SPD sudah dicetak.`
              : `${printedCount} dari ${kepada.length} SPD sudah dicetak — bisa dicetak belakangan juga.`}
          </div>
        )}
      </div>

      {/* Selesai cetak: kembali ke Detail LPJ; Fase 3 (SPBy & LPJ) dimulai dari sana */}
      <div className="flex justify-end items-center pb-6">
        <button
          type="button"
          onClick={backToDetail}
          className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white shadow-[0_2px_8px_rgba(15,32,64,.3)] ${NAVY.bg} ${NAVY.hoverBg}`}
        >
          <FaChevronLeft size={12} /> Kembali ke Detail LPJ
        </button>
      </div>
    </>
  );
}
