import React from 'react';
import { FORM } from '@/utils/uiTokens';

/** Label + isian + petunjuk/pesan error (komponen `Field` purwarupa). */
export default function Field({ label, htmlFor, required, hint, err, children }) {
  return (
    <div className="mb-3.5">
      {label && (
        <label htmlFor={htmlFor} className={FORM.label}>
          {label} {required && <span className="text-[#ef4444]">*</span>}
        </label>
      )}
      {children}
      {hint && !err && <p className={FORM.hint}>{hint}</p>}
      {err && <p className={FORM.err}>{err}</p>}
    </div>
  );
}
