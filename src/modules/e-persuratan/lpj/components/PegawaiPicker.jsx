import React, { useState } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';
import { toPegawaiRef } from '../utils/emptyModels';
import { FORM, NAVY, T } from '@/utils/uiTokens';

/**
 * Cari & pilih beberapa pegawai (dipakai untuk "Kepada" Surat Perintah).
 * @param {{ pegawai: object[], selected: object[], onChange: (refs) => void, err?: boolean, loading?: boolean }} props
 */
export default function PegawaiPicker({ pegawai, selected, onChange, err, loading }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  const kata = q.toLowerCase();
  const filtered = pegawai.filter(
    (p) =>
      !selected.find((s) => s.id === p.id) &&
      (p.nama.toLowerCase().includes(kata) || String(p.nip || '').includes(q)),
  );

  return (
    <div className="relative">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((p) => (
            <div
              key={p.id}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[20px] text-xs text-white ${NAVY.bg}`}
            >
              {p.nip || '-'} — {p.nama}
              <button
                type="button"
                aria-label={`Hapus ${p.nama}`}
                onClick={() => onChange(selected.filter((s) => s.id !== p.id))}
                className="flex text-white/70 hover:text-white"
              >
                <FaTimes size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="relative">
        <FaSearch
          size={13}
          className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${T.inkMuted}`}
        />
        <input
          value={q}
          placeholder={loading ? 'Memuat daftar pegawai…' : 'Cari NIP atau nama pegawai...'}
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
          className={`absolute top-[calc(100%+4px)] left-0 right-0 z-[100] max-h-[220px] overflow-y-auto rounded-[10px] border ${T.surface} ${T.border} shadow-[0_8px_24px_rgba(0,0,0,.1)]`}
        >
          {filtered.map((p) => (
            <div
              key={p.id}
              onMouseDown={() => {
                onChange([...selected, toPegawaiRef(p)]);
                setQ('');
              }}
              className={`px-3.5 py-2.5 cursor-pointer border-b last:border-b-0 ${T.border} ${T.hoverSurface2}`}
            >
              <div className={`text-[13px] font-medium ${T.ink}`}>{p.nama}</div>
              <div className={`text-[11.5px] mt-0.5 ${T.ink2}`}>
                {p.nip || '-'} · {p.pangkat || '-'} · {p.jabatan || '-'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
