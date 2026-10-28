import React, { useState } from 'react';
import {
  FaBan,
  FaCheck,
  FaLayerGroup,
  FaPrint,
  FaRegEye,
  FaRegFileAlt,
  FaSyncAlt,
  FaTimes,
} from 'react-icons/fa';
import Modal from '@/components/Modal';
import { useBerkas, useKeuanganBerkas } from '../../hooks/useBerkas';
import { useDokumenLpj } from '../../hooks/useDokumenLpj';
import { useLpjUser } from '../../hooks/useLpjUser';
import { ubahKwitansi } from '../../services/keuanganDb';
import { BERKAS_LABEL } from '../../utils/drppLogic';
import { lpjGroupSubDone, lpjSingleStatus, stagesWithStatus } from '../../utils/lpjLogic';
import { formatTanggal } from '../../utils/formatTanggal';
import Kwitansi from '../../components/arsip/Kwitansi';
import { PANJANG } from '@/utils/batas';
import { bukaBerkas, pesanGagalUnggah } from '@/utils/berkasStorage';
import { pesanGalat } from '@/utils/pesanGalat';
import { useToast } from '@/utils/toastStore';
import { BTN, FONT, FORM, LAYOUT, STATUS, T } from '@/utils/uiTokens';

/** Dokumen aplikasi yang sudah selesai pada berkas LPJ (urut per fase, seperti halaman Detail). */
function dokumenSelesai(pack) {
  const out = [];
  stagesWithStatus(pack).forEach(({ stage, locked }) => {
    if (locked) return;
    (stage.items || []).forEach((d) => {
      if (lpjSingleStatus(pack, stage, d) === 'selesai') out.push({ ...d, fase: stage.label });
    });
    (stage.groups || []).forEach((g) => {
      g.subItems.forEach((it) => {
        if (lpjGroupSubDone(pack, stage, g)) out.push({ ...it, fase: stage.label });
      });
    });
  });
  return out;
}

/**
 * "Lihat" satu LPJ di Arsip (LihatLpjModal purwarupa): berkas terpindai dari Keuangan + dokumen
 * yang dihasilkan aplikasi (PDF dari template yang sama dengan halaman Detail LPJ). Berkas lengkap
 * dan status Keuangannya baru dibaca saat jendela dibuka (`row` = baris ringkas `barisLpj`).
 * `kelola` (Keuangan): ubah no. kwitansi, ganti scan (`onGantiScan`), dan info DRPP; keduanya
 * dikunci (`terkunci`) bila DRPP berkas ini sudah Lengkap/terkunci atau pengguna bukan Super Admin
 * untuk berkas yang sudah diarsipkan. Pindaian arsip yang sudah selesai tidak bisa diganti
 * (storage.rules): Super Admin membatalkan arsip (`onHapusPindaian`, pindaian lama tetap
 * tercatat), lalu berkas dipindai ulang.
 */
export default function ArsipLpjModal({
  row,
  onClose,
  kelola = false,
  terkunci = false,
  onGantiScan,
  onHapusPindaian,
}) {
  const showToast = useToast();
  const { uid } = useLpjUser();
  const { berkas, memuat } = useBerkas(row.packId);
  const { keuangan } = useKeuanganBerkas(row.packId);
  const dok = useDokumenLpj({
    pack: berkas,
    showToast,
    mak: { pok: keuangan?.pokBeku || {} },
    pejabat: keuangan?.pejabatBeku || {},
    verifikasi: keuangan?.verifikasi || {},
  });
  const scan = keuangan?.arsip?.berkas || null;
  const tanggalArsip = keuangan?.arsip?.tanggalArsip || row.tanggalArsip;
  const kwitansi = keuangan?.sakti?.nomorKwitansi ?? row.kwitansi;
  const docs = berkas ? dokumenSelesai(berkas) : [];
  const [kw, setKw] = useState(row.kwitansi);
  const [simpanKw, setSimpanKw] = useState(false);
  const [konfirmHapus, setKonfirmHapus] = useState(false);
  const [menghapus, setMenghapus] = useState(false);

  // Pratinjau PDF (z-50) berada di bawah Modal (z-[1000]); sembunyikan Modal selama pratinjau terbuka.
  if (dok.modal) return dok.modal;

  const gagalBuka = (err) => showToast(pesanGagalUnggah(err, 'Berkas gagal dibuka.'), 'error');
  const lihatScan = () => bukaBerkas(scan).catch(gagalBuka);
  const cetakScan = () =>
    bukaBerkas(scan).then(
      (dibuka) => dibuka && showToast('Berkas dibuka di tab baru — cetak dari penampil (Ctrl+P).'),
      gagalBuka,
    );

  async function hapus() {
    setMenghapus(true);
    const ok = await onHapusPindaian(row);
    if (!ok) {
      setMenghapus(false);
      setKonfirmHapus(false);
    }
  }

  async function simpanKwitansi() {
    if (!kw.trim()) {
      showToast('No. kwitansi SAKTI wajib diisi.', 'error');
      return;
    }
    setSimpanKw(true);
    try {
      await ubahKwitansi(row.packId, kw, uid);
      showToast('No. kwitansi diperbarui.');
    } catch (err) {
      showToast(pesanGalat(err, 'Gagal menyimpan no. kwitansi.'), 'error');
    } finally {
      setSimpanKw(false);
    }
  }

  return (
    <Modal widthClass="max-w-[580px]" onClose={onClose} labelledBy="judul-arsip-lpj" dariTombol>
      <div className="px-6 pt-5 pb-[22px]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3
              id="judul-arsip-lpj"
              className={`${FONT.mono} text-[17px] font-bold break-all ${T.ink}`}
            >
              {row.id}
            </h3>
            <p className={`mt-1 text-[12.5px] ${T.ink2}`}>
              {row.uraian}
              {row.drppId && !kelola ? ` · ${row.drppId}` : ''}
            </p>
            <div className="mt-2">
              <Kwitansi value={kwitansi} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className={`p-1 rounded-lg shrink-0 ${T.inkMuted} ${T.hoverSurface2}`}
          >
            <FaTimes size={15} />
          </button>
        </div>

        <div className={`${LAYOUT.label} mt-[18px] mb-2.5`}>Dokumen Terpindai</div>
        <BarisBerkas
          selesai={!!scan}
          nama={BERKAS_LABEL(row.pack)}
          sub={
            scan
              ? `Terarsip ${formatTanggal(tanggalArsip)} · ${scan.nama}`
              : row.diarsip && !keuangan
                ? 'Memuat…'
                : 'Belum dipindai Keuangan'
          }
        >
          {scan && (
            <>
              <button type="button" className={BTN.xs} onClick={lihatScan}>
                <FaRegEye size={11} /> Lihat
              </button>
              <button type="button" className={BTN.xs} onClick={cetakScan}>
                <FaPrint size={11} /> Cetak
              </button>
            </>
          )}
          {kelola && onGantiScan && !terkunci && (
            <button type="button" className={BTN.xs} onClick={() => onGantiScan(row)}>
              <FaSyncAlt size={10} /> Ganti
            </button>
          )}
        </BarisBerkas>

        {kelola && scan && !terkunci && (
          <div className="mt-3">
            <label className={FORM.label} htmlFor="kw-lihat">
              No. Kwitansi SAKTI
            </label>
            <div className="flex gap-2">
              <input
                id="kw-lihat"
                value={kw}
                maxLength={PANJANG.nomorKwitansi}
                onChange={(e) => setKw(e.target.value)}
                placeholder="00000/KW/000000/2026"
                className={`${FORM.input} ${FORM.borderOk} ${FONT.mono}`}
              />
              <button
                type="button"
                className={BTN.sm}
                disabled={simpanKw || kw.trim() === kwitansi}
                onClick={simpanKwitansi}
              >
                Simpan
              </button>
            </div>
          </div>
        )}

        {kelola && row.drppId && (
          <div
            className={`flex items-center gap-3 mt-3 px-3.5 py-3 rounded-[11px] border border-dashed ${T.border}`}
          >
            <div
              className={`w-[34px] h-[34px] shrink-0 rounded-[9px] grid place-items-center ${T.surface2} ${T.inkMuted}`}
            >
              <FaLayerGroup size={14} />
            </div>
            <div>
              <div className={`text-[13px] font-semibold ${T.ink}`}>
                Termasuk dalam {row.drppId}
              </div>
              <div className={`text-[11px] mt-px ${T.inkMuted}`}>
                Lihat detail lengkap di tab Daftar DRPP
              </div>
            </div>
          </div>
        )}

        <div className={`${LAYOUT.label} mt-[18px] mb-2.5`}>Dokumen dari Aplikasi</div>
        {!berkas ? (
          <p className={`text-[12.5px] ${T.inkMuted} ${memuat ? 'animate-pulse' : ''}`}>
            {memuat ? 'Memuat dokumen…' : 'Berkas LPJ tidak dapat dibuka.'}
          </p>
        ) : docs.length === 0 ? (
          <p className={`text-[12.5px] ${T.inkMuted}`}>Belum ada dokumen yang selesai.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {docs.map((d) => (
              <BarisBerkas key={d.key} selesai nama={d.label} sub={d.fase}>
                <button type="button" className={BTN.xs} onClick={() => dok.lihat(d)}>
                  <FaRegEye size={11} /> Lihat
                </button>
                <button type="button" className={BTN.xs} onClick={() => dok.cetak(d)}>
                  <FaPrint size={11} /> Print
                </button>
              </BarisBerkas>
            ))}
          </div>
        )}

        {kelola && onHapusPindaian && scan && (
          <div
            className={`flex flex-wrap items-center justify-between gap-2 mt-[18px] px-3.5 py-3 rounded-[11px] border border-dashed ${T.border}`}
          >
            <span className={`text-xs ${konfirmHapus ? STATUS.critInk : T.inkMuted}`}>
              {konfirmHapus
                ? 'Batalkan arsip? Berkas kembali "Belum Discan" dan keluar dari DRPP; bila tercantum di daftar DRPP, otomatis masuk lagi setelah dipindai ulang. Pindaian lama tetap tersimpan.'
                : 'Super Admin: batalkan arsip berkas ini.'}
            </span>
            {konfirmHapus ? (
              <span className="flex gap-1.5">
                <button
                  type="button"
                  className={BTN.xs}
                  onClick={() => setKonfirmHapus(false)}
                  disabled={menghapus}
                >
                  Batal
                </button>
                <button type="button" className={BTN.danger} onClick={hapus} disabled={menghapus}>
                  <FaBan size={11} /> {menghapus ? 'Membatalkan…' : 'Ya, Batalkan'}
                </button>
              </span>
            ) : (
              <button
                type="button"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11.5px] ${T.surface} ${T.border} ${STATUS.critInk} ${T.hoverSurface2}`}
                onClick={() => setKonfirmHapus(true)}
              >
                <FaBan size={11} /> Batalkan Arsip
              </button>
            )}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 mt-[18px]">
          <button type="button" className={BTN.sm} onClick={onClose}>
            Tutup
          </button>
          {!kelola && (
            <button
              type="button"
              className={BTN.action}
              disabled={!scan}
              title={scan ? undefined : 'Berkas belum dipindai Keuangan'}
              onClick={cetakScan}
            >
              <FaPrint size={12} /> Cetak Berkas
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function BarisBerkas({ selesai, nama, sub, children }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-3.5 py-3 rounded-[11px] border ${T.border} ${T.surface}`}
    >
      <div
        className={`w-[34px] h-[34px] shrink-0 rounded-[9px] grid place-items-center ${
          selesai ? `${STATUS.doneBg} ${STATUS.doneInk}` : `${T.surface2} ${T.inkMuted}`
        }`}
      >
        {selesai ? <FaCheck size={14} /> : <FaRegFileAlt size={14} />}
      </div>
      <div className="flex-1 min-w-[160px]">
        <div className={`text-[13px] font-semibold ${T.ink}`}>{nama}</div>
        <div className={`text-[11px] mt-px break-all ${T.inkMuted}`}>{sub}</div>
      </div>
      {children && <div className="flex gap-1.5 shrink-0">{children}</div>}
    </div>
  );
}
