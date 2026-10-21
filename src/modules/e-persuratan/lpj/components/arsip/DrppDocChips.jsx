import React from 'react';
import { FaCheck, FaClock } from 'react-icons/fa';
import { DRPP_DOCS } from '../../utils/drppLogic';
import { STATUS, T } from '@/utils/uiTokens';

/** Chip status unggah dokumen DRPP · SPM · SP2D. */
export default function DrppDocChips({ docs, className = 'mt-2' }) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {DRPP_DOCS.map(({ key, code }) => {
        const ada = !!docs?.[key];
        return (
          <span
            key={key}
            className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-[9px] py-[3px] rounded-full border ${
              ada
                ? `${STATUS.goodBg} ${STATUS.goodInk} border-transparent`
                : `${T.surface2} ${T.inkMuted} ${T.border}`
            }`}
          >
            {ada ? <FaCheck size={9} /> : <FaClock size={9} />} {code}
          </span>
        );
      })}
    </div>
  );
}
