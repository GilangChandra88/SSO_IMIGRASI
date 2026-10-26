import React, { useRef, useState } from 'react';
import { FaCheck, FaExclamationTriangle, FaUndo } from 'react-icons/fa';
import { rupiah } from '../../utils/lpjLogic';
import { pokItem } from '../../utils/verifikasiLogic';
import { BTN, FONT, STATUS, T } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';
import { gulirKeGalat } from '../../../gulirPintar';

// Kode Item | Keterangan | Total per Item | POK Terakhir | Sisa Anggaran (layar sempit: 2 kolom)
const KOLOM_LIHAT =
  'grid grid-cols-2 md:grid-cols-[104px_minmax(0,1.5fr)_repeat(3,minmax(0,1fr))] gap-x-3.5 gap-y-2.5 md:gap-y-0 items-center px-4 md:px-[18px] py-3.5 md:py-3';
const KOLOM_EDIT =
  'grid grid-cols-2 md:grid-cols-[minmax(240px,2.2fr)_repeat(3,minmax(140px,1fr))] gap-x-3.5 gap-y-2.5 md:gap-y-0 items-center px-4 md:px-[18px] py-3.5 md:py-3';
const KEPALA = `max-md:hidden text-[11.5px] font-bold ${T.surface2} ${T.inkMuted}`;
const LBL = `md:hidden block mb-1 text-[10px] font-bold uppercase tracking-[.05em] ${T.inkMuted}`;
const KAKI = `flex items-center justify-between gap-3 px-4 md:px-[18px] py-[13px] border-t text-xs font-extrabold uppercase tracking-[.03em] ${T.border} ${T.surface2} ${T.ink2}`;

const sisaCls = (v) => (v != null && v < 0 ? STATUS.critInk : STATUS.doneInk);

/** Detail Transaksi per Item (PgvTxView purwarupa). `nom` = nominalBerkas(). */
export function TabelTransaksi({ nom }) {
  return (
    <div
      className={`rounded-xl border overflow-hidden ${T.surface} ${T.border}`}
      role="table"
      aria-label="Detail transaksi"
    >
      <div className={`${KOLOM_LIHAT} ${KEPALA}`} role="row">
        <span>Kode Item</span>
        <span>Keterangan Item</span>
        <span className="text-right">Total per Item</span>
        <span className="text-right">POK Terakhir</span>
        <span className="text-right">Sisa Anggaran</span>
      </div>
      {nom.lines.length === 0 && (
        <div className={`px-[18px] py-3 border-t text-[13px] italic ${T.border} ${T.inkMuted}`}>
          Belum ada transaksi
        </div>
      )}
      {nom.lines.map((l) => (
        <div
          key={l.key}
          role="row"
          className={`${KOLOM_LIHAT} border-t text-[13.5px] max-md:[&:nth-child(2)]:border-t-0 ${T.border}`}
        >
          <div className="min-w-0 max-md:col-span-2">
            <span className={LBL}>Kode Item</span>
            <span className={`${FONT.mono} text-xs ${T.inkMuted}`}>{l.kode || '—'}</span>
          </div>
          <div
            className={`min-w-0 break-words max-md:order-first max-md:col-span-2 max-md:font-semibold ${T.ink}`}
          >
            {l.label || '—'}
          </div>
          <div className="min-w-0 md:text-right max-md:col-span-2">
            <span className={LBL}>Total per Item</span>
            <b className={`font-extrabold tabular-nums whitespace-nowrap ${T.ink}`}>
              {rupiah(l.nilai)}
            </b>
          </div>
          <div className="min-w-0 md:text-right">
            <span className={LBL}>POK Terakhir</span>
            <span className={`tabular-nums ${T.inkMuted}`}>
              {l.pok == null ? '—' : rupiah(l.pok)}
            </span>
          </div>
          <div className="min-w-0 md:text-right">
            <span className={LBL}>Sisa Anggaran</span>
            <span className={`font-bold tabular-nums ${sisaCls(l.sisa)}`}>
              {l.sisa == null ? '—' : rupiah(l.sisa)}
            </span>
          </div>
        </div>
      ))}
      <div className={KAKI}>
        <span>Total seluruh item</span>
        <b
          className={`text-[15px] normal-case tracking-normal tabular-nums whitespace-nowrap ${T.ink}`}
        >
          {rupiah(nom.total)}
        </b>
      </div>
    </div>
  );
}

/** Input rupiah: tampil "750.000", disimpan sebagai angka (null = kosong). */
export function RpInput({ id, value, onChange, invalid, label, placeholder = '0' }) {
  return (
    <div
      className={`flex items-center h-10 rounded-[9px] border overflow-hidden ${T.surface} ${
        invalid ? STATUS.critBorder : T.borderStrong
      } focus-within:border-[#2A78D6] dark:focus-within:border-[#5599e8]`}
    >
      <span className={`pl-3 pr-1.5 text-[12.5px] font-semibold ${T.inkMuted}`} aria-hidden="true">
        Rp
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label={label}
        aria-invalid={invalid ? 'true' : undefined}
        placeholder={placeholder}
        value={value == null ? '' : Math.round(value).toLocaleString('id-ID')}
        onChange={(e) => {
          const d = e.target.value.replace(/\D/g, '').slice(0, 13);
          onChange(d === '' ? null : parseInt(d, 10));
        }}
        className={`flex-1 min-w-0 h-full pr-3 bg-transparent outline-none text-[13.5px] tabular-nums max-sm:text-base ${T.ink} ${T.placeholder}`}
      />
    </div>
  );
}

/**
 * Edit Detail Transaksi di tempat (PgvTxEdit purwarupa): Item boleh diganti (Item lain di Akun
 * yang sama), nominal & POK Terakhir boleh diubah; Sisa Anggaran = POK − nominal (otomatis).
 * Yang disimpan hanya perubahan: onSave({ lines, codes, poks }).
 */
export function EditTransaksi({ nom, mak, opsiItem, onSave, onBatal, menyimpan }) {
  const awal = (f) => Object.fromEntries(nom.lines.map((l) => [l.key, f(l)]));
  const [codes, setCodes] = useState(() => awal((l) => l.itemId));
  const [vals, setVals] = useState(() => awal((l) => l.nilai));
  const [poks, setPoks] = useState(() => awal((l) => l.pok));
  const [err, setErr] = useState(null); // 'kosong' | 'dobel'
  const akarRef = useRef(null);

  const total = nom.lines.reduce((a, l) => a + (vals[l.key] ?? 0), 0);
  const opsi = (l) => {
    const ada = opsiItem.some((o) => o.id === codes[l.key]);
    return ada ? opsiItem : [{ id: codes[l.key], kode: l.kode, name: l.label }, ...opsiItem];
  };

  function gantiItem(key, baru) {
    const defLama = pokItem(mak, codes[key]);
    // POK ikut Item baru kecuali sudah diubah manual
    setPoks((o) =>
      o[key] == null || o[key] === defLama ? { ...o, [key]: pokItem(mak, baru) } : o,
    );
    setCodes((o) => ({ ...o, [key]: baru }));
    setErr(null);
  }

  function simpan() {
    const kosong = nom.lines.findIndex((l) => vals[l.key] == null);
    if (kosong >= 0) {
      setErr('kosong');
      gulirKeGalat(akarRef.current); // ke nominal kosong pertama
      return;
    }
    const dipakai = nom.lines.map((l) => codes[l.key]);
    if (new Set(dipakai).size !== dipakai.length) {
      setErr('dobel');
      gulirKeGalat(akarRef.current);
      return;
    }
    const lines = {};
    const cds = {};
    const pks = {};
    nom.lines.forEach((l) => {
      if (vals[l.key] !== l.asli) lines[l.key] = vals[l.key];
      if (codes[l.key] !== l.codeAsli) cds[l.key] = codes[l.key];
      if (poks[l.key] != null && poks[l.key] !== pokItem(mak, codes[l.key]))
        pks[l.key] = poks[l.key];
    });
    onSave({ lines, codes: cds, poks: pks });
  }

  function kembalikan() {
    setCodes(awal((l) => l.codeAsli));
    setVals(awal((l) => l.asli));
    setPoks(awal((l) => pokItem(mak, l.codeAsli)));
    setErr(null);
  }

  return (
    <div ref={akarRef} className={`flex flex-col gap-3 ${ANIM.muncul}`}>
      <div
        className={`rounded-xl border overflow-hidden ${T.surface} ${T.border}`}
        role="table"
        aria-label="Detail transaksi (sedang diedit)"
      >
        <div className={`${KOLOM_EDIT} ${KEPALA}`} role="row">
          <span>Kode Item &amp; Keterangan</span>
          <span>Total per Item</span>
          <span>POK Terakhir</span>
          <span>Sisa Anggaran</span>
        </div>
        {nom.lines.map((l, i) => {
          const v = vals[l.key];
          const pk = poks[l.key];
          const sisa = pk != null && v != null ? pk - v : null;
          return (
            <div
              key={l.key}
              role="row"
              className={`${KOLOM_EDIT} border-t max-md:[&:nth-child(2)]:border-t-0 ${T.border}`}
            >
              <div className="min-w-0 col-span-2 md:col-span-1">
                <select
                  aria-label={`Kode item dan keterangan baris ${i + 1}`}
                  value={codes[l.key]}
                  onChange={(e) => gantiItem(l.key, e.target.value)}
                  className={`w-full h-10 px-3 rounded-[9px] border text-[13px] cursor-pointer outline-none truncate ${T.surface} ${T.ink} ${T.borderStrong} ${T.focus} dark:[color-scheme:dark] max-sm:text-base`}
                >
                  {opsi(l).map((o) => (
                    <option key={o.id} value={o.id}>
                      {[o.kode, o.name].filter(Boolean).join(' — ')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0 col-span-2 md:col-span-1">
                <span className={LBL}>Total per Item</span>
                <RpInput
                  id={`vtx-${i}`}
                  value={v}
                  label={`Total per item baris ${i + 1}`}
                  invalid={err === 'kosong' && v == null}
                  onChange={(x) => {
                    setVals((o) => ({ ...o, [l.key]: x }));
                    setErr(null);
                  }}
                />
              </div>
              <div className="min-w-0">
                <span className={LBL}>POK Terakhir</span>
                <RpInput
                  id={`vtx-pok-${i}`}
                  value={pk}
                  label={`POK terakhir baris ${i + 1}`}
                  placeholder="Belum diisi"
                  onChange={(x) => setPoks((o) => ({ ...o, [l.key]: x }))}
                />
              </div>
              <div className="min-w-0">
                <span className={LBL}>Sisa Anggaran</span>
                <span
                  className={`block md:text-right px-0.5 font-bold tabular-nums ${sisaCls(sisa)}`}
                  aria-label={`Sisa anggaran baris ${i + 1} (otomatis)`}
                >
                  {sisa == null ? '—' : rupiah(sisa)}
                </span>
              </div>
            </div>
          );
        })}
        <div className={KAKI}>
          <span>Total seluruh item</span>
          <b
            className={`text-[15px] normal-case tracking-normal tabular-nums whitespace-nowrap ${T.ink}`}
          >
            {rupiah(total)}
          </b>
        </div>
      </div>
      <p className={`text-xs ${T.inkMuted}`}>
        Sisa Anggaran dihitung otomatis: POK Terakhir dikurangi Total per Item, jadi tidak bisa
        diedit. Kode item bisa diganti dengan Item lain pada Akun yang sama.
      </p>
      {err && (
        <p
          role="alert"
          data-galat
          className={`flex items-center gap-1.5 text-[12.5px] font-semibold ${STATUS.critInk} ${ANIM.muncul}`}
        >
          <FaExclamationTriangle size={12} />
          {err === 'kosong'
            ? 'Ada nominal yang masih kosong. Isi dulu, baru bisa disimpan.'
            : 'Ada kode item yang dipilih dua kali. Pilih kode yang berbeda tiap baris.'}
        </p>
      )}
      <div
        className={`flex max-sm:flex-col-reverse sm:items-center justify-between gap-2.5 pt-3 border-t ${T.border}`}
      >
        <button
          type="button"
          onClick={kembalikan}
          disabled={menyimpan}
          className={`inline-flex items-center gap-1.5 self-start text-[12.5px] font-semibold ${STATUS.warnInk} hover:underline`}
        >
          <FaUndo size={11} /> Kembalikan semua ke awal
        </button>
        <div className="flex gap-2 justify-end">
          <button type="button" className={BTN.ghost} onClick={onBatal} disabled={menyimpan}>
            Batal
          </button>
          <button type="button" className={BTN.primaryDark} onClick={simpan} disabled={menyimpan}>
            <FaCheck size={12} /> {menyimpan ? 'Menyimpan…' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    </div>
  );
}
