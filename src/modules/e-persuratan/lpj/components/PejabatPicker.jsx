import React, { useState } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';
import { PEJABAT_KATEGORI } from '../data/masterLpj';
import { toPegawaiRef } from '../utils/emptyModels';
import { FORM, NAVY, T } from '@/utils/uiTokens';

/**
 * Pilih kategori pejabat penandatangan (Kepala/PLT/PLH) lalu cari namanya di data pegawai.
 * Nilai: { kategori, id, uid, nama, nip, pangkat, jabatan } atau null.
 */
export default function PejabatPicker({ pegawai, value, onChange, err }) {
  const [kat, setKat] = useState(value?.kategori || '');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  const kata = q.toLowerCase();
  const filtered = pegawai.filter(
    (p) =>
      p.nama.toLowerCase().includes(kata) ||
      String(p.jabatan || '')
        .toLowerCase()
        .includes(kata),
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2.5">
        {PEJABAT_KATEGORI.map((k) => {
          const active = kat === k.id;
          return (
            <button
              key={k.id}
              type="button"
              onClick={() => {
                setKat(k.id);
                if (value && value.kategori !== k.id) onChange(null);
              }}
              className={`px-4 py-[7px] rounded-[20px] text-[12.5px] font-semibold border transition-colors ${
                active
                  ? `${NAVY.bg} ${NAVY.border} text-white`
                  : `${T.surface2} ${T.ink2} ${T.border} ${T.hoverSurfaceHover}`
              }`}
            >
              {k.label}
            </button>
          );
        })}
      </div>
      {value ? (
        <div
          className={`flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-lg ${NAVY.bg}`}
        >
          <div>
            <div className="text-[13px] font-semibold text-white">{value.nama}</div>
            <div className="text-[11px] mt-px text-white/65">
              {PEJABAT_KATEGORI.find((k) => k.id === value.kategori)?.label} ·{' '}
              {value.jabatan || '-'}
            </div>
          </div>
          <button
            type="button"
            aria-label="Hapus pejabat"
            onClick={() => onChange(null)}
            className="flex text-white/70 hover:text-white"
          >
            <FaTimes size={13} />
          </button>
        </div>
      ) : kat ? (
        <div className="relative">
          <div className="relative">
            <FaSearch
              size={13}
              className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${T.inkMuted}`}
            />
            <input
              value={q}
              placeholder="Cari nama..."
              autoComplete="off"
              onFocus={() => setOpen(true)}
              onChange={(e) => {
                setQ(e.target.value);
                setOpen(true);
              }}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              className={`${FORM.input} pl-9 ${err ? FORM.borderErr : FORM.borderOk}`}
            />
          </div>
          {open && filtered.length > 0 && (
            <div
              className={`relative z-[100] mt-1 max-h-[220px] overflow-y-auto rounded-[10px] border ${T.surface} ${T.border} shadow-[0_8px_24px_rgba(0,0,0,.1)]`}
            >
              {filtered.map((p) => (
                <div
                  key={p.id}
                  onMouseDown={() => {
                    onChange({ kategori: kat, ...toPegawaiRef(p) });
                    setQ('');
                  }}
                  className={`px-3.5 py-2.5 cursor-pointer border-b last:border-b-0 ${T.border} ${T.hoverSurface2}`}
                >
                  <div className={`text-[13px] font-medium ${T.ink}`}>{p.nama}</div>
                  <div className={`text-[11.5px] mt-0.5 ${T.ink2}`}>{p.jabatan || '-'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className={`mt-1 text-xs ${T.inkMuted}`}>Pilih kategori pejabat terlebih dahulu</p>
      )}
    </div>
  );
}
