import React from 'react';
import { FORM } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';

/**
 * Label + isian + petunjuk/pesan error (komponen `Field` purwarupa). Saat ada error, pembungkus
 * bertanda `data-galat` sehingga form bisa menggulir ke isian ini (`gulirKeGalat`).
 */
export default function Field({ label, htmlFor, required, hint, err, children }) {
  return (
    <div className="mb-3.5" data-galat={err ? '' : undefined}>
      {label && (
        <label htmlFor={htmlFor} className={FORM.label}>
          {label} {required && <span className="text-[#ef4444]">*</span>}
        </label>
      )}
      {children}
      {hint && !err && <p className={FORM.hint}>{hint}</p>}
      {err && <p className={`${FORM.err} ${ANIM.muncul}`}>{err}</p>}
    </div>
  );
}
