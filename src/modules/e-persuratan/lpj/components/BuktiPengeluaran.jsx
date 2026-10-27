import React, { useEffect, useState } from 'react';
import {
  FaCircleNotch,
  FaReceipt,
  FaRegFileAlt,
  FaRegFilePdf,
  FaRegTrashAlt,
  FaUpload,
} from 'react-icons/fa';
import { LAP_BUKTI_JENIS } from '../data/masterLpj';
import { hapusBuktiPengeluaran } from '../hooks/useLPJ';
import { deleteLpjFile } from '../services/lpjStorage';
import { halamanDariBerkas } from '../utils/halamanBerkas';
import { isSkemaBaru, pelaksanaOf } from '../utils/lpjLogic';
import LampiranViewer from './LampiranViewer';
import ModalUnggahBukti from './ModalUnggahBukti';
import { BTN, STATUS, T } from '@/utils/uiTokens';
import { ANIM, hapusBaris } from '@/utils/animasi';

const LABEL_JENIS = Object.fromEntries(LAP_BUKTI_JENIS);
const isGambar = (f) => String(f?.type || '').startsWith('image/');
const KODE = `text-[10px] font-extrabold tracking-[.02em] px-[7px] py-[3px] rounded-md border shrink-0 whitespace-nowrap ${T.surface2} ${T.ink2} ${T.border}`;

/**
 * Pembuat berkas, pelaksananya, atau admin boleh mengunggah/menghapus bukti — juga setelah berkas
 * selesai, karena bukti pengeluaran opsional dan sering menyusul.
 */
function bolehUbah(pack, { uid, isAdmin }) {
  if (!isSkemaBaru(pack)) return false;
  if (isAdmin || pack.created_by === uid) return true;
  return pelaksanaOf(pack).some((p) => p.uid && p.uid === uid);
}

/**
 * Bukti pengeluaran per pelaksana di Fase 4 Detail LPJ (opsional), di bawah Laporan Kegiatan.
 * Tombol "Unggah" membuka popup: pilih label (Taksi Asal / Taksi Tujuan / Tiket PP / Bill Hotel)
 * dan berkasnya (seret-lepas atau klik). Tiap pelaksana paling banyak satu berkas per label
 * (maks. 4). Hasil unggahan langsung tampil sebagai pratinjau berlabel; klik untuk melihat besar.
 * Data: `pack.bukti_pengeluaran = { [id pelaksana]: [{ path, url, name, type, …, jenis }] }`.
 */
export default function BuktiPengeluaran({ pack, user, showToast }) {
  const pelaksana = pelaksanaOf(pack);
  const bukti = pack.bukti_pengeluaran || {};
  const total = pelaksana.reduce((n, p) => n + (bukti[p.id] || []).length, 0);
  const ubah = bolehUbah(pack, user);
  const [unggahUntuk, setUnggahUntuk] = useState(null); // pelaksana yang popup unggahnya terbuka
  const [lihat, setLihat] = useState(null); // { label, files }

  async function hapus(p, file) {
    try {
      await hapusBuktiPengeluaran(pack, p.id, file);
      deleteLpjFile(file.path).catch(() => {});
    } catch (err) {
      console.error('hapus bukti pengeluaran error:', err);
      showToast?.('Gagal menghapus bukti.', 'error');
    }
  }

  return (
    <div>
      {/* Baris kepala (gaya baris dokumen Detail LPJ) */}
      <div
        data-bertahap
        className={`flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-[13px] border-t ${T.border}`}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div
            key={total ? 'ada' : 'kosong'}
            className={`w-8 h-8 shrink-0 rounded-lg border flex items-center justify-center ${ANIM.meletup} ${
              total ? STATUS.doneOn : `border-transparent ${T.surface2} ${T.inkMuted}`
            }`}
          >
            <FaReceipt size={13} />
          </div>
          <span className={KODE}>BKT</span>
          <div className="flex-1 min-w-0">
            <div className={`text-[13px] font-semibold ${T.ink}`}>Bukti Pengeluaran</div>
            <div className={`text-[11px] mt-px ${T.inkMuted}`}>
              Opsional · {LAP_BUKTI_JENIS.map(([, l]) => l).join(', ')}
            </div>
          </div>
        </div>
        <span className={`text-[11.5px] shrink-0 ${T.inkMuted}`}>
          {total ? `${total} bukti` : 'Belum ada bukti'}
        </span>
      </div>

      {pelaksana.length === 0 && (
        <div
          className={`py-[9px] pl-6 sm:pl-[52px] pr-4 sm:pr-5 border-t text-[12px] ${T.border} ${T.inkMuted}`}
        >
          Belum ada pelaksana. Isi Surat Perintah terlebih dahulu.
        </div>
      )}

      {pelaksana.map((p) => {
        // Urut sesuai label (Taksi Asal, Taksi Tujuan, Tiket PP, Bill Hotel)
        const daftar = [...(bukti[p.id] || [])].sort(
          (a, b) =>
            LAP_BUKTI_JENIS.findIndex(([k]) => k === a.jenis) -
            LAP_BUKTI_JENIS.findIndex(([k]) => k === b.jenis),
        );
        const penuh = LAP_BUKTI_JENIS.every(([k]) => daftar.some((f) => f.jenis === k));
        return (
          <div
            key={p.id}
            data-bertahap
            className={`py-2.5 pl-6 sm:pl-[52px] pr-4 sm:pr-5 border-t ${T.border}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <FaRegFileAlt
                  size={13}
                  aria-hidden="true"
                  className={`shrink-0 ${daftar.length ? STATUS.doneInk : T.inkMuted}`}
                />
                <span className={`text-[12.5px] break-words ${T.ink2}`}>
                  {p.nama}
                  <span className={T.inkMuted}>
                    {' '}
                    · {daftar.length}/{LAP_BUKTI_JENIS.length} bukti
                  </span>
                </span>
              </div>
              {ubah &&
                (penuh ? (
                  <span className={`text-[11.5px] font-semibold ${STATUS.doneInk}`}>
                    Semua label sudah diunggah
                  </span>
                ) : (
                  <button
                    type="button"
                    className={`${BTN.sm} shrink-0`}
                    onClick={() => setUnggahUntuk(p)}
                  >
                    <FaUpload size={11} /> Unggah
                  </button>
                ))}
            </div>

            {daftar.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 mt-2.5">
                {daftar.map((f) => (
                  <div
                    key={f.path}
                    className={`relative rounded-[10px] border overflow-hidden ${ANIM.meletup} ${T.border} ${T.surface}`}
                  >
                    <button
                      type="button"
                      title="Lihat bukti"
                      onClick={() =>
                        setLihat({
                          label: `${LABEL_JENIS[f.jenis] || 'Bukti'} — ${p.nama}`,
                          files: [f],
                        })
                      }
                      className="block w-full text-left"
                    >
                      <PratinjauKecil file={f} />
                      <div className="px-1.5 pt-1.5 pb-[5px]">
                        <span
                          className={`inline-block max-w-full truncate text-[10.5px] font-bold px-1.5 py-px rounded ${STATUS.infoBg} ${STATUS.infoInk}`}
                        >
                          {LABEL_JENIS[f.jenis] || 'Bukti'}
                        </span>
                        <div className={`mt-0.5 text-[10.5px] truncate ${T.ink2}`} title={f.name}>
                          {f.name}
                        </div>
                      </div>
                    </button>
                    {ubah && (
                      <button
                        type="button"
                        title="Hapus bukti"
                        aria-label={`Hapus bukti ${f.name}`}
                        onClick={(e) =>
                          hapusBaris(e.currentTarget.parentElement, () => hapus(p, f), {
                            geser: false,
                          })
                        }
                        className="absolute top-[5px] right-[5px] w-[26px] h-[26px] rounded-full bg-[rgba(15,20,30,.65)] text-white flex items-center justify-center"
                      >
                        <FaRegTrashAlt size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {unggahUntuk && (
        <ModalUnggahBukti
          pack={pack}
          pelaksana={unggahUntuk}
          terpakai={(bukti[unggahUntuk.id] || []).map((f) => f.jenis)}
          user={user}
          showToast={showToast}
          onClose={() => setUnggahUntuk(null)}
        />
      )}
      {lihat && (
        <LampiranViewer label={lihat.label} files={lihat.files} onClose={() => setLihat(null)} />
      )}
    </div>
  );
}

/** Gambar kecil bukti: foto langsung, PDF → halaman pertama (dirender sekali, disimpan). */
function PratinjauKecil({ file }) {
  const [src, setSrc] = useState(null);
  const [gagal, setGagal] = useState(false);
  const gambar = isGambar(file);

  useEffect(() => {
    if (gambar) return undefined;
    let aktif = true;
    halamanDariBerkas(file).then(
      (h) => aktif && setSrc(h[0] || null),
      () => aktif && setGagal(true),
    );
    return () => {
      aktif = false;
    };
  }, [file, gambar]);

  const kelas = 'block w-full h-24 object-cover bg-white';
  if (gambar) return <img src={file.url} alt={file.name} loading="lazy" className={kelas} />;
  if (src) return <img src={src} alt={file.name} className={kelas} />;
  return (
    <div className={`h-24 flex items-center justify-center ${T.inkMuted}`}>
      {gagal ? <FaRegFilePdf size={28} /> : <FaCircleNotch size={16} className="animate-spin" />}
    </div>
  );
}
