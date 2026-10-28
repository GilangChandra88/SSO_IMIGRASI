import React, { useEffect, useState } from 'react';
import {
  FaCircleNotch,
  FaReceipt,
  FaRegFileAlt,
  FaRegFilePdf,
  FaRegTrashAlt,
  FaUpload,
} from 'react-icons/fa';
import { useUrlBerkas } from '@/utils/useUrlBerkas';
import { LAP_BUKTI_JENIS } from '../data/masterLpj';
import { useBuktiBerkas, useKeuanganBerkas } from '../hooks/useBerkas';
import { hapusBukti, pesanUnggah } from '../services/unggahan';
import { halamanDariBerkas } from '../utils/halamanBerkas';
import { pelaksanaOf } from '../utils/lpjLogic';
import LampiranViewer from './LampiranViewer';
import ModalUnggahBukti from './ModalUnggahBukti';
import { BTN, STATUS, T } from '@/utils/uiTokens';
import { ANIM, hapusBaris } from '@/utils/animasi';

const LABEL_JENIS = Object.fromEntries(LAP_BUKTI_JENIS);
const urutJenis = (k) => LAP_BUKTI_JENIS.findIndex(([j]) => j === k);
const isGambar = (f) => String(f?.tipe || '').startsWith('image/');
const KODE = `text-[10px] font-extrabold tracking-[.02em] px-[7px] py-[3px] rounded-md border shrink-0 whitespace-nowrap ${T.surface2} ${T.ink2} ${T.border}`;

/**
 * Bukti pengeluaran per pelaksana di Fase 4 Detail LPJ (opsional), di bawah Laporan Kegiatan.
 * Disimpan per dokumen di subkoleksi `lpj_berkas/{id}/bukti` (`pelaksanaId`, `label` = kode jenis,
 * `berkas` = Meta). Anggota berkas boleh mengunggah — juga setelah berkas selesai — selama
 * verifikasi Keuangan belum selesai; bukti dihapus pengunggahnya atau Keuangan. Tiap pelaksana
 * paling banyak satu berkas per label (Taksi Asal / Taksi Tujuan / Tiket PP / Bill Hotel).
 */
export default function BuktiPengeluaran({ pack, user, showToast }) {
  const pelaksana = pelaksanaOf(pack);
  const { bukti } = useBuktiBerkas(pack.id);
  const { keuangan } = useKeuanganBerkas(pack.id);
  const terbuka = !keuangan?.verifikasi?.selesai;
  const bolehUnggah = terbuka && (pack.anggotaUids || []).includes(user.uid);
  const bolehHapus = (b) => user.isAdmin || (terbuka && b.dibuatOleh === user.uid);
  const [unggahUntuk, setUnggahUntuk] = useState(null); // pelaksana yang popup unggahnya terbuka
  const [lihat, setLihat] = useState(null); // { label, files }

  async function hapus(b) {
    try {
      await hapusBukti(pack.id, b);
    } catch (err) {
      showToast?.(pesanUnggah(err), 'error');
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
            key={bukti.length ? 'ada' : 'kosong'}
            className={`w-8 h-8 shrink-0 rounded-lg border flex items-center justify-center ${ANIM.meletup} ${
              bukti.length ? STATUS.doneOn : `border-transparent ${T.surface2} ${T.inkMuted}`
            }`}
          >
            <FaReceipt size={13} />
          </div>
          <span className={KODE}>BKT</span>
          <div className="flex-1 min-w-0">
            <div className={`text-[13px] font-semibold ${T.ink}`}>Bukti Pengeluaran</div>
            <div className={`text-[11px] mt-px ${T.inkMuted}`}>
              Opsional · {LAP_BUKTI_JENIS.map(([, l]) => l).join(', ')}
              {!terbuka && ' · verifikasi selesai, bukti tidak bisa diubah'}
            </div>
          </div>
        </div>
        <span className={`text-[11.5px] shrink-0 ${T.inkMuted}`}>
          {bukti.length ? `${bukti.length} bukti` : 'Belum ada bukti'}
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
        const daftar = bukti
          .filter((b) => b.pelaksanaId === p.pegawaiId)
          .sort((a, b) => urutJenis(a.label) - urutJenis(b.label));
        const penuh = LAP_BUKTI_JENIS.every(([k]) => daftar.some((b) => b.label === k));
        return (
          <div
            key={p.pegawaiId}
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
              {bolehUnggah &&
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
                {daftar.map((b) => (
                  <div
                    key={b.id}
                    className={`relative rounded-[10px] border overflow-hidden ${ANIM.meletup} ${T.border} ${T.surface}`}
                  >
                    <button
                      type="button"
                      title="Lihat bukti"
                      onClick={() =>
                        setLihat({
                          label: `${LABEL_JENIS[b.label] || 'Bukti'} — ${p.nama}`,
                          files: [b.berkas],
                        })
                      }
                      className="block w-full text-left"
                    >
                      <PratinjauKecil file={b.berkas} />
                      <div className="px-1.5 pt-1.5 pb-[5px]">
                        <span
                          className={`inline-block max-w-full truncate text-[10.5px] font-bold px-1.5 py-px rounded ${STATUS.infoBg} ${STATUS.infoInk}`}
                        >
                          {LABEL_JENIS[b.label] || 'Bukti'}
                        </span>
                        <div
                          className={`mt-0.5 text-[10.5px] truncate ${T.ink2}`}
                          title={b.berkas?.nama}
                        >
                          {b.berkas?.nama}
                        </div>
                      </div>
                    </button>
                    {bolehHapus(b) && (
                      <button
                        type="button"
                        title="Hapus bukti"
                        aria-label={`Hapus bukti ${b.berkas?.nama || ''}`}
                        onClick={(e) =>
                          hapusBaris(e.currentTarget.parentElement, () => hapus(b), {
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
          terpakai={bukti
            .filter((b) => b.pelaksanaId === unggahUntuk.pegawaiId)
            .map((b) => b.label)}
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

/** Gambar kecil bukti: foto lewat URL lokal, PDF → halaman pertama (dirender sekali, disimpan). */
function PratinjauKecil({ file }) {
  const gambar = isGambar(file);
  const { url } = useUrlBerkas(gambar ? file?.path : null);
  const [src, setSrc] = useState(null);
  const [gagal, setGagal] = useState(false);

  useEffect(() => {
    if (gambar || !file?.path) return undefined;
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
  const tampil = gambar ? url : src;
  if (tampil) return <img src={tampil} alt={file?.nama || 'Bukti'} className={kelas} />;
  return (
    <div className={`h-24 flex items-center justify-center ${T.inkMuted}`}>
      {gagal ? <FaRegFilePdf size={28} /> : <FaCircleNotch size={16} className="animate-spin" />}
    </div>
  );
}
