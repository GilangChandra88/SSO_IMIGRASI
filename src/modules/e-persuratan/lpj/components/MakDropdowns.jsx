import React from 'react';
import {
  MAK_LEVELS,
  isAkun,
  makKodeFromAkun,
  makNodeLabel,
  makOptions,
  makTahunOf,
} from '../utils/makTree';
import { FONT, FORM, STATUS, T } from '../ui/tokens';

/**
 * Dropdown MAK bertingkat (Tahun → … → Akun). Tiap tingkat terkunci sampai tingkat
 * sebelumnya dipilih. Nilai: { kode, akunNodeId, tahunNodeId, pilihan: { <tingkat>: nodeId } }.
 */
export default function MakDropdowns({ nodes, byId, loading, mak, onChange }) {
  const pilihan = mak?.pilihan || {};

  if (loading) return <p className={`text-[13px] ${T.inkMuted}`}>Memuat data MAK…</p>;
  if (nodes.length === 0) {
    return (
      <p className={`text-[13px] ${STATUS.warnInk}`}>
        Data MAK belum diisi. Minta Super Admin mengisinya di menu MAK Setup.
      </p>
    );
  }

  function handleChange(levelIndex, nodeId) {
    const next = {};
    MAK_LEVELS.forEach((lv, i) => {
      if (i < levelIndex && pilihan[lv]) next[lv] = pilihan[lv];
    });
    if (nodeId) next[MAK_LEVELS[levelIndex]] = nodeId;

    const node = byId[nodeId];
    if (node && isAkun(node)) {
      onChange({
        pilihan: next,
        akunNodeId: nodeId,
        kode: makKodeFromAkun(byId, nodeId),
        tahunNodeId: makTahunOf(byId, nodeId)?.id || '',
      });
    } else {
      onChange({ pilihan: next, akunNodeId: '', kode: '', tahunNodeId: '' });
    }
  }

  return (
    <div>
      {MAK_LEVELS.map((level, i) => {
        const parentId = i === 0 ? null : pilihan[MAK_LEVELS[i - 1]];
        // Tingkat setelah Akun tidak perlu dipilih lagi
        const sesudahAkun = MAK_LEVELS.slice(0, i).some((lv) => isAkun(byId[pilihan[lv]]));
        const disabled = sesudahAkun || (i > 0 && !parentId);
        const opts = disabled ? [] : makOptions(nodes, i, parentId);
        return (
          <div key={level} className="mb-2.5">
            <label
              htmlFor={`mak-${level}`}
              className={
                disabled ? `block text-[12.5px] font-semibold mb-1.5 ${T.inkMuted}` : FORM.label
              }
            >
              {level}
            </label>
            <select
              id={`mak-${level}`}
              disabled={disabled}
              value={pilihan[level] || ''}
              onChange={(e) => handleChange(i, e.target.value)}
              className={`${FORM.select} ${FORM.borderOk}`}
            >
              <option value="">— Pilih —</option>
              {opts.map((o) => (
                <option key={o.id} value={o.id}>
                  {makNodeLabel(o)}
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
