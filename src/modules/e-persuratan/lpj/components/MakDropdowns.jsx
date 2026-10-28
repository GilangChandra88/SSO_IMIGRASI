import React from 'react';
import {
  LABEL_TINGKAT,
  TINGKAT_PILIHAN,
  labelNode,
  makDariAkun,
  pilihanTingkat,
} from '../../makPohon';
import { ANIM } from '@/utils/animasi';
import { FONT, FORM, STATUS, T } from '@/utils/uiTokens';

/**
 * Dropdown MAK bertingkat (Tahun → … → Akun) dari pohon `mak_node` satu tahun anggaran. Tiap
 * tingkat terkunci sampai tingkat sebelumnya dipilih; dengan `bertahap`, tingkat yang belum bisa
 * dipilih disembunyikan (baru muncul setelah tingkat sebelumnya diisi). Node nonaktif tidak tampil.
 * Nilai (`Mak`, skema §3): { kode, akunNodeId, tahunNodeId, pilihan: { <tingkat>: nodeId } }.
 */
export default function MakDropdowns({ nodes, byId, loading, mak, onChange, bertahap = false }) {
  const pilihan = mak?.pilihan || {};

  if (loading) return <p className={`text-[13px] ${T.inkMuted}`}>Memuat data MAK…</p>;
  if (nodes.length === 0) {
    return (
      <p className={`text-[13px] ${STATUS.warnInk}`}>
        Data MAK tahun anggaran ini belum diisi. Minta Keuangan mengisinya di menu MAK Setup.
      </p>
    );
  }

  function handleChange(levelIndex, nodeId) {
    const node = byId[nodeId];
    if (node?.tingkat === 'akun') {
      onChange(makDariAkun(byId, nodeId));
      return;
    }
    const next = {};
    TINGKAT_PILIHAN.forEach((t, i) => {
      if (i < levelIndex && pilihan[t]) next[t] = pilihan[t];
    });
    if (nodeId) next[TINGKAT_PILIHAN[levelIndex]] = nodeId;
    onChange({ pilihan: next, akunNodeId: '', kode: '', tahunNodeId: '' });
  }

  return (
    <div>
      {TINGKAT_PILIHAN.map((tingkat, i) => {
        const indukId = i === 0 ? null : pilihan[TINGKAT_PILIHAN[i - 1]];
        // Tingkat setelah Akun tidak perlu dipilih lagi
        const sesudahAkun = TINGKAT_PILIHAN.slice(0, i).some(
          (t) => byId[pilihan[t]]?.tingkat === 'akun',
        );
        const disabled = sesudahAkun || (i > 0 && !indukId);
        if (bertahap && disabled) return null;
        const opts = disabled ? [] : pilihanTingkat(nodes, i, indukId);
        return (
          // bertahap: tingkat yang baru terbuka muncul halus di bawah tingkat sebelumnya
          <div key={tingkat} className={`mb-2.5 ${bertahap ? ANIM.muncul : ''}`}>
            <label
              htmlFor={`mak-${tingkat}`}
              className={
                disabled ? `block text-[12.5px] font-semibold mb-1.5 ${T.inkMuted}` : FORM.label
              }
            >
              {LABEL_TINGKAT[tingkat]}
            </label>
            <select
              id={`mak-${tingkat}`}
              disabled={disabled}
              value={pilihan[tingkat] || ''}
              onChange={(e) => handleChange(i, e.target.value)}
              className={`${FORM.select} ${FORM.borderOk}`}
            >
              <option value="">— Pilih —</option>
              {opts.map((o) => (
                <option key={o.id} value={o.id}>
                  {labelNode(o)}
                </option>
              ))}
            </select>
          </div>
        );
      })}
      {mak?.akunNodeId && (
        <div className={`mt-1 px-3.5 py-3 rounded-lg border ${STATUS.infoBg} ${STATUS.infoBorder}`}>
          <div className={`text-[11px] font-semibold mb-1 ${STATUS.infoInk}`}>Kode MAK</div>
          <div className={`${FONT.mono} text-sm font-bold tracking-[.03em] ${T.ink}`}>
            {mak.kode}
          </div>
        </div>
      )}
    </div>
  );
}
