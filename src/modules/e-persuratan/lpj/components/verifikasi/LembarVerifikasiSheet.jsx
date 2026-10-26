import React from 'react';
import { FaCheck } from 'react-icons/fa';
import { FONT } from '@/utils/uiTokens';
import { itemSingkat, rpTitik } from '../../utils/verifikasiLogic';

/**
 * Pratinjau Lembar Verifikasi di layar (LembarSheet purwarupa) — isinya sama dengan
 * LembarVerifikasiPdf. Berupa "kertas", jadi tetap putih di mode gelap. `data` = dataLembar().
 */

const GARIS = 'border-[#1f2937]';
const SEL = `border ${GARIS} px-2 py-1.5 align-top`;

function DaftarItem({ lines, nilai }) {
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3.5 gap-y-[3px] text-[11.5px] tabular-nums">
      {lines.map((l) => (
        <li key={l.key} className="flex gap-2 min-w-0">
          <i className={`${FONT.mono} not-italic text-[11px] text-[#4b5563]`}>{l.kode}</i>
          <em className="not-italic flex-1 min-w-0 truncate">{itemSingkat(l.label)}</em>
          <b className="font-semibold whitespace-nowrap">
            {nilai(l) == null ? '—' : rpTitik(nilai(l))}
          </b>
        </li>
      ))}
    </ul>
  );
}

export default function LembarVerifikasiSheet({ data }) {
  const { nom } = data;
  return (
    <div className="overflow-x-auto overflow-y-hidden rounded-lg">
      <div
        className={`min-w-[560px] bg-white text-[#111827] border-[1.5px] ${GARIS} text-[12.5px] ${FONT.body}`}
      >
        <div className={`flex border-b-[1.5px] ${GARIS}`}>
          <div
            className={`${FONT.head} flex-1 px-4 py-3 text-[19px] font-extrabold leading-[1.15] tracking-[.04em]`}
          >
            LEMBAR
            <br />
            VERIFIKASI
          </div>
          <div
            className={`w-[190px] border-l-[1.5px] ${GARIS} flex flex-col items-center justify-center py-2`}
          >
            <b className={`${FONT.head} text-[17px] font-extrabold`}>PPK</b>
            <span className="text-[10.5px] font-bold tracking-[.04em]">{data.jenisTeks}</span>
          </div>
        </div>

        {data.meta.map((grup, gi) => (
          <dl key={gi} className={`px-3.5 py-2 border-b ${GARIS}`}>
            {grup.map(([label, nilai]) => (
              <div key={label} className="flex gap-1 py-[2px]">
                <dt className="w-[150px] shrink-0">{label}</dt>
                <span>:</span>
                <dd className="flex-1 min-w-0 break-words">
                  {label === 'Jumlah' && nom.multi ? (
                    <DaftarItem lines={nom.lines} nilai={(l) => l.nilai} />
                  ) : (
                    nilai || '—'
                  )}
                </dd>
              </div>
            ))}
          </dl>
        ))}

        <table className="w-full border-collapse [&_td:first-child]:border-l-0 [&_th:first-child]:border-l-0 [&_td:last-child]:border-r-0 [&_th:last-child]:border-r-0">
          <thead>
            <tr className="bg-[#f3f4f6]">
              <th className={`${SEL} w-10 text-center`}>No.</th>
              <th className={`${SEL} text-left`}>Kelengkapan Dokumen</th>
              <th className={`${SEL} w-[70px] text-center`}>Staf PPK</th>
              <th className={`${SEL} w-[56px] text-center`}>PPK</th>
              <th className={`${SEL} w-[120px] text-left`}>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r, i) => (
              <tr key={r.label}>
                <td className={`${SEL} text-center`}>{i + 1}</td>
                <td className={SEL}>{r.label}</td>
                <td className={`${SEL} text-center`}>
                  {r.staf && <FaCheck size={11} className="inline" aria-label="Ya" />}
                </td>
                <td className={`${SEL} text-center`}>
                  {r.ppk && <FaCheck size={11} className="inline" aria-label="Ya" />}
                </td>
                <td className={SEL}>{r.ket}</td>
              </tr>
            ))}
            <tr>
              <td className={`${SEL} text-center`}>{data.rows.length + 1}</td>
              <td className={SEL}>POK Terakhir</td>
              <td className={SEL} />
              <td className={SEL} />
              <td className={`${SEL} tabular-nums whitespace-nowrap`}>
                {nom.multi || nom.pok == null ? '' : rpTitik(nom.pok)}
              </td>
            </tr>
            <tr>
              <td colSpan={5} className={SEL}>
                <span>Catatan Staf PPK: </span>
                <em
                  className={`not-italic font-semibold ${data.catatan === 'Lengkap' ? '' : 'text-[#A62D2D]'}`}
                >
                  {data.catatan}
                </em>
              </td>
            </tr>
            {nom.multi && (
              <tr>
                <td colSpan={5} className={SEL}>
                  <span className="block mb-[3px]">POK terakhir :</span>
                  <DaftarItem lines={nom.lines} nilai={(l) => l.pok} />
                </td>
              </tr>
            )}
            <tr>
              <td colSpan={5} className={`${SEL} h-14`}>
                Catatan PPK:
              </td>
            </tr>
            <tr>
              <td colSpan={5} className={SEL}>
                {nom.multi ? (
                  <>
                    <span className="block mb-[3px]">Sisa Anggaran Setelah Tagihan ini :</span>
                    <DaftarItem lines={nom.lines} nilai={(l) => l.sisa} />
                  </>
                ) : (
                  <>
                    Sisa Anggaran Setelah Tagihan ini :{' '}
                    <b className="tabular-nums">{nom.sisa == null ? '—' : rpTitik(nom.sisa)}</b>
                  </>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        <div className={`grid grid-cols-2 border-t ${GARIS}`}>
          <div className={`h-20 px-2 py-1.5 border-r ${GARIS}`}>Paraf PPK</div>
          <div className="h-20 px-2 py-1.5">Paraf KPA</div>
        </div>
      </div>
    </div>
  );
}
