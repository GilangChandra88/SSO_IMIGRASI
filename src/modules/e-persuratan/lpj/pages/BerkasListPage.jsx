/**
 * Daftar LPJ (BerkasListPage purwarupa) — semua berkas yang boleh dilihat pengguna. Klik baris
 * untuk membuka Detail LPJ (ringkasan transaksi & progres ada di sana).
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaChevronDown, FaFilter, FaPlus, FaRegTrashAlt, FaSearch } from 'react-icons/fa';
import { deleteLPJPack, useLPJPacks } from '../hooks/useLPJ';
import { useLpjUser } from '../hooks/useLpjUser';
import {
  isPerjadin,
  canDeletePack,
  jenisLabel,
  lpjIdLabel,
  lpjIdOf,
  lpjDashStatus,
  lpjDashType,
  lpjRowTotal,
  lpjTahapDisplay,
  pelaksanaOf,
  uraianOf,
} from '../utils/lpjLogic';
import CreatePackModal from '../components/CreatePackModal';
import HapusBerkasModal from '../components/HapusBerkasModal';
import { AngkaBerjalan, Lipat } from '@/components/animasi';
import { ANIM, animasiHapus, animasiMasuk, jedaKe } from '@/utils/animasi';
import { bukaBerkas } from '../../animasiHalaman';
import { useToast } from '@/utils/toastStore';
import { FONT, LAYOUT, STATUS, T } from '@/utils/uiTokens';

const FILTER_LABEL = { all: 'Filter', baru: 'Baru', draft: 'Draft', selesai: 'Selesai' };
const GRID = 'grid grid-cols-[130px_160px_minmax(0,1fr)_120px_140px_52px]';

// Kelas chip & tombol filter (.chip / .filter-btn purwarupa)
const CHIP = `px-[13px] py-[7px] rounded-full text-[12.5px] font-semibold whitespace-nowrap border border-transparent ${ANIM.pilih}`;
const CHIP_OFF = `${T.surface2} ${T.ink2} ${T.hoverSurfaceHover}`;
const CHIP_ON = 'bg-[#0E2340] text-[#EAF0FA] dark:bg-[#081524]';

export function TahapPill({ pack }) {
  const d = lpjTahapDisplay(pack);
  const cls = d.legacy
    ? `${T.surface2} ${T.inkMuted} ${T.border}`
    : d.done
      ? 'bg-[#dcfce7] text-[#15803d] border-[#86efac] dark:bg-[rgba(25,158,112,.2)] dark:text-[#4FD39B] dark:border-[rgba(79,211,155,.4)]'
      : 'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe] dark:bg-[rgba(57,135,229,.18)] dark:text-[#7DB6F3] dark:border-[rgba(125,182,243,.35)]';
  return (
    <span
      className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${cls}`}
    >
      {d.label}
    </span>
  );
}

export default function BerkasListPage() {
  const navigate = useNavigate();
  const showToast = useToast();
  const user = useLpjUser();
  const { uid, nama, isAdmin, pegawaiLogin } = user;
  const { packs, loading, error } = useLPJPacks({ isAdmin, userUid: uid });

  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [hapusPack, setHapusPack] = useState(null);
  // Baris yang sedang dianimasikan keluar (dihapus)
  const [keluarIds, setKeluarIds] = useState(() => new Set());
  const wadahRefs = useRef({}); // id berkas → elemen luar Lipat
  // Berkas baru: { id } menunggu animasi masuk, lalu dibuka ke Detail
  const [baru, setBaru] = useState(null);
  const cadanganTimer = useRef(null);
  const masukRef = useRef(null); // id berkas yang animasi masuknya sudah dimulai
  const aktifRef = useRef(true); // halaman masih terpasang (animasi async bisa selesai belakangan)
  useEffect(() => {
    // Disetel ulang di sini: StrictMode memasang–melepas–memasang ulang efek saat pengembangan
    aktifRef.current = true;
    return () => {
      aktifRef.current = false;
      clearTimeout(cadanganTimer.current);
    };
  }, []);

  // Query sudah terurut terbaru di atas (created_at desc)
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return packs.filter((p) => {
      if (type !== 'all' && lpjDashType(p) !== type) return false;
      if (status !== 'all' && lpjDashStatus(p) !== status) return false;
      if (!qq) return true;
      // Cari di uraian, nomor LPJ, dan nama pelaksana (format lama menyimpan pelaksana sebagai teks)
      const namaPelaksana = pelaksanaOf(p).map((x) => (typeof x === 'string' ? x : x?.nama || ''));
      return [uraianOf(p), lpjIdOf(p), ...namaPelaksana].some((s) =>
        String(s).toLowerCase().includes(qq),
      );
    });
  }, [packs, type, status, q]);

  // Berkas baru selalu di urutan teratas (created_at server belum terisi saat baru dibuat)
  const tampil = useMemo(() => {
    const i = baru ? filtered.findIndex((p) => p.id === baru.id) : -1;
    return i > 0 ? [filtered[i], ...filtered.slice(0, i), ...filtered.slice(i + 1)] : filtered;
  }, [filtered, baru]);

  // Begitu berkas baru muncul di daftar: ruang dibuka, baris terbentuk kiri → kanan (siber),
  // lalu map berkasnya terbang keluar & terbuka, dan halaman pindah ke Detail
  useEffect(() => {
    if (!baru || masukRef.current === baru.id) return;
    const pack = packs.find((p) => p.id === baru.id);
    const wadah = wadahRefs.current[baru.id];
    if (!pack || !wadah) return;
    masukRef.current = baru.id;
    const { id } = baru;
    animasiMasuk({
      wadah,
      onBuka: () =>
        setKeluarIds((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        }),
    })
      .then(() => {
        if (!aktifRef.current) return;
        showToast('Berkas baru dibuat.');
        return bukaBerkas({
          asal: wadah,
          packId: id,
          judul: uraianOf(pack),
          jenis: isPerjadin(pack) ? 'Perjalanan Dinas' : 'Non-Perjalanan Dinas',
        });
      })
      .then(() => {
        if (aktifRef.current) navigate(`/e-persuratan/lpj/${id}`);
      });
  }, [baru, packs, showToast, navigate]);

  const tampilkanBaris = (id) =>
    setKeluarIds((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });

  // Sebelum berkas ditulis: barisnya disiapkan tertutup agar tidak sempat tampil lalu menyusut
  function akanDibuat(id) {
    setKeluarIds((s) => new Set(s).add(id));
  }

  // Tanpa baris di tabel: map berkas terbuka di tengah layar, lalu pindah ke Detail
  function bukaLangsung(id) {
    tampilkanBaris(id);
    showToast('Berkas baru dibuat.');
    bukaBerkas({ packId: id, jenis: 'Berkas LPJ' }).then(() => {
      if (aktifRef.current) navigate(`/e-persuratan/lpj/${id}`);
    });
  }

  function berkasDibuat(id) {
    setShowCreate(false);
    if (error) {
      // Daftar tidak termuat: tidak ada tabel untuk dianimasikan
      bukaLangsung(id);
      return;
    }
    // Tampilkan semua agar berkas baru terlihat masuk tabel
    setQ('');
    setType('all');
    setStatus('all');
    setBaru({ id });
    // Cadangan: bila berkas tidak kunjung muncul di daftar, jangan biarkan barisnya tertahan
    clearTimeout(cadanganTimer.current);
    cadanganTimer.current = setTimeout(() => {
      if (!aktifRef.current || masukRef.current === id) return;
      masukRef.current = id;
      setBaru(null);
      bukaLangsung(id);
    }, 4000);
  }

  /** Konfirmasi → baris memudar & menyusut → baru data dihapus; bila gagal baris kembali. */
  async function hapusBerkas(pack) {
    setHapusPack(null);
    // Kebalikan animasi masuk: glitch merah → luruh kiri → kanan jadi debu merah → celah menutup
    const anim = animasiHapus({
      wadah: wadahRefs.current[pack.id],
      onTutup: () => setKeluarIds((s) => new Set(s).add(pack.id)),
    });
    await anim.tutup;
    try {
      await deleteLPJPack(pack, { superAdmin: user.isSuperAdmin });
      showToast(`Berkas ${lpjIdOf(pack) || `"${uraianOf(pack)}"`} dihapus.`);
    } catch (err) {
      console.error('deleteLPJPack error:', err);
      anim.pulihkan();
      setKeluarIds((s) => {
        const n = new Set(s);
        n.delete(pack.id);
        return n;
      });
      showToast(
        err?.message?.includes('bernomor') ? err.message : 'Gagal menghapus berkas.',
        'error',
      );
    }
  }

  return (
    <div className={`min-h-full ${T.ground}`}>
      <div className={LAYOUT.page}>
        <section className={LAYOUT.card}>
          <div className={LAYOUT.head}>
            <div>
              <h1 className={LAYOUT.h1}>Daftar LPJ</h1>
              <p className={LAYOUT.sub}>
                <AngkaBerjalan nilai={filtered.length} /> laporan tercatat
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className={`flex items-center gap-2 px-[18px] py-[11px] rounded-[11px] bg-[#0E2340] hover:bg-[#173D68] dark:bg-[#1F4C80] dark:hover:bg-[#173D68] text-[#EAF0FA] font-bold text-[13.5px] whitespace-nowrap ${T.shadowSm} group transition hover:-translate-y-px active:translate-y-0 motion-safe:active:scale-[.97]`}
            >
              <FaPlus
                size={13}
                className="motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:rotate-90"
              />{' '}
              Buat Laporan
            </button>
          </div>

          {/* Toolbar: cari + chip jenis + filter status */}
          <div className="flex flex-wrap items-center gap-2.5 mb-4">
            <div
              className={`flex items-center gap-2 flex-1 min-w-[200px] h-[38px] px-[11px] rounded-[9px] border border-transparent ${T.surface2} ${T.inkMuted} focus-within:border-[#2A78D6] focus-within:bg-white dark:focus-within:bg-[#111D2E]`}
            >
              <FaSearch size={13} className="shrink-0" />
              <input
                type="search"
                placeholder="Cari nama kegiatan, nomor LPJ, atau pelaksana…"
                aria-label="Cari LPJ"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className={`flex-1 min-w-0 bg-transparent border-0 outline-none text-sm ${T.ink} ${T.placeholder}`}
              />
            </div>
            <div className="flex flex-wrap gap-[7px] shrink-0">
              {[
                ['all', 'Semua'],
                ['perjadin', 'Perjadin'],
                ['non-perjadin', 'Non Perjadin'],
              ].map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setType(val)}
                  className={`${CHIP} ${type === val ? CHIP_ON : CHIP_OFF}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2.5">
              <div className="relative">
                <button
                  type="button"
                  aria-haspopup="true"
                  aria-expanded={filterOpen}
                  onClick={() => setFilterOpen((v) => !v)}
                  className={`${CHIP} flex items-center gap-1.5 ${status !== 'all' ? CHIP_ON : CHIP_OFF}`}
                >
                  <FaFilter size={11} />
                  <span>{FILTER_LABEL[status]}</span>
                  <FaChevronDown
                    size={11}
                    className={`motion-safe:transition-transform motion-safe:duration-200 ${filterOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {filterOpen && (
                  <>
                    <button
                      type="button"
                      aria-label="Tutup filter"
                      className="fixed inset-0 z-20 cursor-default"
                      onClick={() => setFilterOpen(false)}
                    />
                    <div
                      className={`absolute top-[calc(100%+8px)] right-0 z-30 min-w-[160px] p-1.5 flex flex-col gap-px rounded-xl border origin-top-right ${ANIM.popover} ${T.surface} ${T.border} ${T.shadowMd}`}
                    >
                      {['all', 'baru', 'draft', 'selesai'].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            setStatus(s);
                            setFilterOpen(false);
                          }}
                          className={`w-full text-left px-3 py-[9px] rounded-lg text-[13px] font-semibold ${
                            status === s
                              ? 'bg-[#F7EEDC] text-[#A97C24] dark:bg-[rgba(201,151,59,.16)] dark:text-[#C9973B]'
                              : `${T.ink2} ${T.hoverSurface2}`
                          }`}
                        >
                          {s === 'all' ? 'Semua Status' : FILTER_LABEL[s]}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {error && (
            <p
              className={`mb-3 px-3 py-2 rounded-lg text-[12.5px] ${STATUS.critBg} ${STATUS.critInk}`}
            >
              {error}
            </p>
          )}

          {/* Tabel (bisa digulir ke samping di layar sempit) */}
          {/* overflow-y-hidden: gerakan animasi baris (benturan) tidak memunculkan bilah gulir */}
          <div className={`overflow-x-auto overflow-y-hidden border rounded-xl ${T.border}`}>
            <div className="min-w-[840px]">
              <div className={`${GRID} px-4 border-b ${T.border} ${T.surface2}`}>
                {['ID', 'Pelaksana', 'Uraian', 'Nominal', 'Tahap', ''].map((h, i) => (
                  <div
                    key={i}
                    className={`px-2 py-[11px] text-[11.5px] font-semibold uppercase tracking-[.03em] ${T.ink2}`}
                  >
                    {h}
                  </div>
                ))}
              </div>

              {filtered.length === 0 && (
                <div className={`p-12 text-center text-sm ${T.inkMuted}`}>
                  {loading ? 'Memuat data LPJ…' : 'Tidak ada data yang sesuai filter.'}
                </div>
              )}

              {tampil.map((pack, i) => (
                <Lipat
                  key={pack.id}
                  buka={!keluarIds.has(pack.id)}
                  wadahRef={(el) => {
                    if (el) wadahRefs.current[pack.id] = el;
                    else delete wadahRefs.current[pack.id];
                  }}
                >
                  <BerkasRow
                    pack={pack}
                    urutan={i}
                    onDetail={() => navigate(`/e-persuratan/lpj/${pack.id}`)}
                    onHapus={canDeletePack(pack, user) ? () => setHapusPack(pack) : null}
                  />
                </Lipat>
              ))}
            </div>
          </div>
        </section>
      </div>

      {hapusPack && (
        <HapusBerkasModal
          pack={hapusPack}
          onClose={() => setHapusPack(null)}
          onYa={() => hapusBerkas(hapusPack)}
        />
      )}

      {showCreate && (
        <CreatePackModal
          uid={uid}
          nama={nama}
          pegawaiLogin={pegawaiLogin}
          onClose={() => setShowCreate(false)}
          onCreated={berkasDibuat}
          onAkanDibuat={akanDibuat}
          onGagal={tampilkanBaris}
        />
      )}
    </div>
  );
}

function BerkasRow({ pack, urutan = 0, onDetail, onHapus }) {
  const pelaksana = pelaksanaOf(pack);
  const total = lpjRowTotal(pack);
  const uraian = uraianOf(pack);

  return (
    // relative: animasi masuk/hapus memasang lapisan absolut di elemen ini
    <div className={`relative border-b ${T.border} ${ANIM.muncul} ${jedaKe(urutan)}`}>
      <div
        role="link"
        tabIndex={0}
        aria-label={`Buka detail ${lpjIdOf(pack) || uraian || 'berkas'}`}
        onClick={onDetail}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onDetail();
          }
        }}
        className={`${GRID} px-4 items-center cursor-pointer ${T.surface} ${T.hoverSurface2} focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#2A78D6]`}
      >
        <div className="px-2 py-3.5 min-w-0">
          <div
            className={`${FONT.mono} font-bold text-[13px] break-words ${lpjIdOf(pack) ? T.ink : T.inkMuted}`}
          >
            {lpjIdLabel(pack)}
          </div>
          <div className={`text-[11px] mt-0.5 ${T.inkMuted}`}>{jenisLabel(pack)}</div>
        </div>
        <div className="px-2 py-3.5 min-w-0">
          <div className={`text-[13px] font-medium ${T.ink}`}>
            {pelaksana[0]?.nama || '—'}
            {pelaksana.length > 1 && (
              <span
                className={`ml-1.5 text-[11px] font-medium rounded-[10px] px-[7px] py-px ${T.bgBorder} ${T.ink2}`}
              >
                +{pelaksana.length - 1}
              </span>
            )}
          </div>
        </div>
        <div className="px-2 py-3.5 min-w-0">
          <div className={`text-[12.5px] leading-[1.45] break-words ${T.ink}`}>{uraian || '—'}</div>
        </div>
        <div className="px-2 py-3.5">
          <div className={`text-[13px] font-bold whitespace-nowrap ${T.ink}`}>
            Rp {total.toLocaleString('id-ID')}
          </div>
        </div>
        <div className="px-2 py-3.5">
          <TahapPill pack={pack} />
        </div>
        <div className="px-2 py-3.5 flex justify-end items-center">
          {onHapus && (
            <button
              type="button"
              title="Hapus berkas"
              aria-label={`Hapus berkas ${lpjIdOf(pack) || uraian}`}
              onClick={(e) => {
                e.stopPropagation();
                onHapus();
              }}
              onKeyDown={(e) => e.stopPropagation()}
              className={`w-[30px] h-[30px] shrink-0 grid place-items-center rounded-[7px] border ${ANIM.pilih} ${STATUS.critBorder} ${STATUS.critBg} ${STATUS.critInk} hover:brightness-95`}
            >
              <FaRegTrashAlt size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
