import React from 'react';
import { ADMIN, T } from '@/utils/uiTokens';
import { HIERARKI_KODE } from '../../data/nomorSuratConfig';

/**
 * Pilihan kode surat bertingkat (KOP → Kode surat 1 → 2 → 3) dari hierarki kode.
 * `value` = array id node per tingkat; memilih satu tingkat mengosongkan tingkat di bawahnya.
 */
export default function PilihKodeSurat({ indeks, value, onChange, error }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {HIERARKI_KODE.map((tingkat, i) => {
        const induk = i === 0 ? null : value[i - 1];
        const opsi = i === 0 || induk ? indeks.anakDari(induk) : [];
        const mati = (i > 0 && !induk) || opsi.length === 0;
        const kosong = error && !mati && !value[i];
        return (
          <div key={tingkat}>
            <label
              className={`block text-xs font-semibold mb-1 ${T.inkMuted}`}
              htmlFor={`kode-${i}`}
            >
              {tingkat}
            </label>
            <select
              id={`kode-${i}`}
              className={kosong ? ADMIN.inputErr : ADMIN.input}
              value={value[i] || ''}
              disabled={mati}
              onChange={(e) => onChange([...value.slice(0, i), e.target.value].filter(Boolean))}
            >
              <option value="">{mati ? '—' : `Pilih ${tingkat}`}</option>
              {opsi.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.kode ? `${n.kode} - ${n.name}` : n.name}
                </option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}
