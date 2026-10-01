import React from 'react';
import { FaExternalLinkAlt, FaRegFilePdf, FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { BTN, FONT, T } from '@/utils/uiTokens';

/** Menampilkan berkas unggahan (foto/PDF) dari Firebase Storage. */
export default function LampiranViewer({ label, files, onClose }) {
  return (
    <Modal widthClass="max-w-[760px]" onClose={onClose} labelledBy="judul-lampiran">
      <div className={`flex items-center justify-between px-[22px] py-[18px] border-b ${T.border}`}>
        <h3 id="judul-lampiran" className={`${FONT.head} font-bold text-[15px] ${T.ink}`}>
          {label}
        </h3>
        <button type="button" onClick={onClose} aria-label="Tutup" className={T.inkMuted}>
          <FaTimes size={15} />
        </button>
      </div>
      <div className="p-[22px]">
        {files.length === 0 ? (
          <p className={`text-center text-[13px] py-8 ${T.inkMuted}`}>
            Belum ada berkas yang diunggah.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {files.map((f) => (
              <a
                key={f.path}
                href={f.url}
                target="_blank"
                rel="noreferrer"
                className={`group block rounded-[10px] border overflow-hidden ${T.border} ${T.surface2}`}
                title="Buka di tab baru"
              >
                {String(f.type || '').startsWith('image/') ? (
                  <img src={f.url} alt={f.name} className="w-full h-36 object-cover block" />
                ) : (
                  <div className={`h-36 flex items-center justify-center ${T.inkMuted}`}>
                    <FaRegFilePdf size={40} />
                  </div>
                )}
                <div className={`flex items-center gap-1.5 px-2 py-1.5 text-[11.5px] ${T.ink2}`}>
                  <span className="truncate flex-1">{f.name}</span>
                  <FaExternalLinkAlt
                    size={10}
                    className="shrink-0 opacity-60 group-hover:opacity-100"
                  />
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-end px-[22px] pb-[22px]">
        <button type="button" className={BTN.ghost} onClick={onClose}>
          Tutup
        </button>
      </div>
    </Modal>
  );
}
