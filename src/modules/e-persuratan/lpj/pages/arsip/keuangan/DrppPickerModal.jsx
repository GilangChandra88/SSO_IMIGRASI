import React, { useState } from 'react';
import { FaArchive, FaCheck, FaPlus, FaSearch } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { drppLocked, drppMembers, drppStatus } from '../../../utils/drppLogic';
import { rupiah } from '../../../utils/lpjLogic';
import Kwitansi from '../../../components/arsip/Kwitansi';
import ModalKepala from './ModalKepala';
import { ADMIN, FONT, STATUS, T } from '@/utils/uiTokens';

/**
 * Pilih DRPP tujuan untuk LPJ terpilih (DrppPickerModal purwarupa).
 * `rows` = barisLpj berkas terpilih; DRPP yang terkunci tidak bisa dipilih.
 */
export default function DrppPickerModal({
  rows,
  drpps,
  packs,
  packsById,
  onClose,
  onConfirm,
  onCreateNew,
}) {
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState(null);
  const [busy, setBusy] = useState(false);
  const q = search.trim().toLowerCase();
  const list = drpps.filter((d) => !q || d.id.toLowerCase().includes(q));
  const total = rows.reduce((s, r) => s + r.total, 0);

  async function confirm() {
    setBusy(true);
    const ok = await onConfirm(picked);
    if (!ok) setBusy(false);
  }

  return (
    <Modal
      widthClass="max-w-[600px]"
      onClose={busy ? undefined : onClose}
      labelledBy="judul-pilih-drpp"
    >
      <div className={ADMIN.modalBody}>
        <ModalKepala
          id="judul-pilih-drpp"
          title="Masukkan ke DRPP"
          subtitle={`${rows.length} berkas LPJ dipilih · Total ${rupiah(total)}`}
          onClose={onClose}
          disabled={busy}
        />

        <div className={ADMIN.label}>Berkas LPJ yang akan dimasukkan</div>
        <div className={`max-h-[180px] overflow-y-auto mb-4 divide-y ${T.divide}`}>
          {rows.map((r) => (
            <div key={r.packId} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
              <span className="flex items-center gap-2">
                <span className={`${FONT.mono} font-bold text-[12.5px] ${T.ink}`}>{r.id}</span>
                <Kwitansi value={r.kwitansi} />
              </span>
              <span className={`text-[12.5px] flex-1 min-w-[160px] ${T.ink2}`}>{r.uraian}</span>
            </div>
          ))}
        </div>

        <div className={ADMIN.label}>Pilih DRPP Tujuan</div>
        <label className={`${ADMIN.search} mb-2.5 w-full`}>
          <FaSearch size={13} className="shrink-0" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Cari DRPP"
            placeholder="Cari ID DRPP…"
            className={ADMIN.searchInput}
          />
        </label>
        {list.length === 0 && (
          <div className={`text-center px-2.5 py-6 text-[13.5px] ${T.inkMuted}`}>
            <FaArchive size={26} className="block mx-auto mb-2.5 opacity-40" />
            {drpps.length === 0
              ? 'Belum ada DRPP. Buat DRPP baru dulu.'
              : 'Tidak ada DRPP yang cocok.'}
          </div>
        )}
        <div className="max-h-[240px] overflow-y-auto">
          {list.map((d) => {
            const locked = drppLocked(packsById, packs, d);
            const status = drppStatus(packsById, packs, d);
            const sel = picked === d.id;
            return (
              <label
                key={d.id}
                className={`flex items-center gap-3 px-3 py-2.5 mb-1.5 rounded-[10px] border ${
                  locked
                    ? `opacity-55 cursor-not-allowed ${T.border}`
                    : sel
                      ? `cursor-pointer ${STATUS.infoBorder} ${STATUS.infoBg}`
                      : `cursor-pointer ${T.border} ${T.hoverSurface2}`
                }`}
              >
                <input
                  type="radio"
                  name="drppPick"
                  value={d.id}
                  checked={sel}
                  disabled={locked}
                  onChange={() => setPicked(d.id)}
                  className="accent-[#0E2340]"
                />
                <div className="min-w-0">
                  <div className={`${FONT.head} font-bold text-[13.5px] ${T.ink}`}>{d.id}</div>
                  <div className={`text-xs mt-0.5 ${T.inkMuted}`}>
                    {drppMembers(packs, d).length} LPJ saat ini ·{' '}
                    {status === 'lengkap'
                      ? 'Lengkap, tidak bisa ditambah lagi'
                      : locked
                        ? 'Daftar LPJ sudah terpenuhi, tidak bisa ditambah lagi'
                        : 'Menunggu Kelengkapan'}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 mt-1.5 text-[12.5px] font-bold ${STATUS.infoInk} hover:underline`}
          onClick={onCreateNew}
          disabled={busy}
        >
          <FaPlus size={11} /> Buat DRPP Baru
        </button>

        <div className={ADMIN.modalActions}>
          <button type="button" className={ADMIN.btnGhost} onClick={onClose} disabled={busy}>
            Batal
          </button>
          <button
            type="button"
            className={ADMIN.btnSolid}
            disabled={!picked || busy}
            onClick={confirm}
          >
            <span className="inline-flex items-center gap-2">
              <FaCheck size={12} /> {busy ? 'Memasukkan…' : 'Masukkan ke DRPP Terpilih'}
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
