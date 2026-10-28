/**
 * Penomoran Surat Kanim Buleleng (NomorSuratPage purwarupa admin): tab Daftar Nomor (register),
 * Riwayat Surat (nomor dari form surat & SP Srikandi), Hierarki Kode, dan Pengaturan nomor urut.
 * Semua pegawai bisa meminta nomor (Function terbitkanNomorSurat); Hierarki Kode dan Pengaturan
 * hanya untuk Keuangan/Super Admin (ditegakkan rules & Function).
 */
import React, { useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FaCog, FaFileAlt, FaListOl, FaPlus, FaSitemap } from 'react-icons/fa';
import StrukturHierarki from '@/components/StrukturHierarki/StrukturHierarki';
import ToastViewport from '@/components/ToastViewport';
import { useAuth } from '@/context/AuthContext';
import { PANJANG } from '@/utils/batas';
import { pesanGalat } from '@/utils/pesanGalat';
import { ADMIN, GOLD, T } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';
import { gulirDanSorot, gulirKeAtas } from '../../gulirPintar';
import PengaturanNomor from '../components/nomor-surat/PengaturanNomor';
import RegisterNomorSurat from '../components/nomor-surat/RegisterNomorSurat';
import RiwayatSurat from '../components/nomor-surat/RiwayatSurat';
import TambahNomorSurat from '../components/nomor-surat/TambahNomorSurat';
import { HIERARKI_KODE } from '../data/nomorSuratConfig';
import { useKodeSurat } from '../hooks/useNomorSurat';
import { nonaktifkanKodeSurat, tambahKodeSurat, ubahKodeSurat } from '../services/nomorSurat';

const TABS = [
  { key: 'daftar', label: 'Daftar Nomor', icon: FaListOl },
  { key: 'riwayat', label: 'Riwayat Surat', icon: FaFileAlt },
  { key: 'hierarki', label: 'Hierarki Kode', icon: FaSitemap, keuangan: true },
  { key: 'pengaturan', label: 'Pengaturan', icon: FaCog, keuangan: true },
];

const KODE_SAH = /^[A-Za-z0-9./-]+$/;
const galatPengguna = (pesan) => Object.assign(new Error(pesan), { pesan });

export default function NomorSuratKanim() {
  const location = useLocation();
  const { currentUser, isKeuangan } = useAuth();
  const uid = currentUser?.uid || '';
  const tabs = TABS.filter((t) => !t.keuangan || isKeuangan);
  const tabAwal = tabs.some((t) => t.key === location.state?.tab) ? location.state.tab : 'daftar';
  const [tab, setTab] = useState(tabAwal);
  const [formTambah, setFormTambah] = useState(false);

  const kode = useKodeSurat();
  const kartuRef = useRef(null);

  // Kembali dari form Tambah: bila nomor baru terbit, gulir ke barisnya di Daftar Nomor lalu sorot
  function tutupForm(nomor) {
    setFormTambah(false);
    if (!nomor) return gulirKeAtas(kartuRef.current);
    setTab('daftar');
    const pilih = `[data-nomor="${CSS.escape(nomor)}"]`;
    gulirDanSorot(() => kartuRef.current?.querySelector(pilih), { posisi: 'tengah' });
  }

  // ─── Hierarki kode (Keuangan) ─────────────────────────────────────────────
  const simpanKode = async ({ mode, id, parentId, type, kode: kodeBaru, name, aktif }) => {
    const k = String(kodeBaru || '').trim();
    const nama = String(name || '').trim();
    if (!k || k.length > PANJANG.kodeSurat || !KODE_SAH.test(k)) {
      throw galatPengguna(
        `Kode wajib diisi (maks. ${PANJANG.kodeSurat} karakter: huruf, angka, titik, garis miring, atau tanda hubung).`,
      );
    }
    if (!nama || nama.length > PANJANG.namaKodeSurat) {
      throw galatPengguna(`Nama wajib diisi (maks. ${PANJANG.namaKodeSurat} karakter).`);
    }
    try {
      if (mode === 'edit') await ubahKodeSurat(id, { kode: k, nama, aktif: aktif !== false }, uid);
      else {
        await tambahKodeSurat(
          { kode: k, nama, tingkat: HIERARKI_KODE.indexOf(type), indukId: parentId ?? null },
          uid,
        );
      }
    } catch (err) {
      throw galatPengguna(pesanGalat(err, 'Gagal menyimpan kode surat.'));
    }
  };

  // Kode surat tidak dihapus (nomor lama tetap memakainya): kode & turunannya dinonaktifkan
  const nonaktifkanKode = async (ids) => {
    const aktif = ids.filter((id) => kode.nodes.find((n) => n.id === id)?.aktif);
    if (!aktif.length) return 'Kode ini sudah nonaktif.';
    try {
      await nonaktifkanKodeSurat(aktif, uid);
    } catch (err) {
      throw galatPengguna(pesanGalat(err, 'Gagal menonaktifkan kode surat.'));
    }
    return `${aktif.length} kode dinonaktifkan (tidak bisa dipilih lagi; nomor lama tetap tercatat).`;
  };

  return (
    <div className={`min-h-full ${T.ground}`}>
      <div className={ADMIN.page}>
        <section ref={kartuRef} className={ADMIN.card}>
          {formTambah ? (
            <TambahNomorSurat indeks={kode.indeksAktif} onKembali={tutupForm} />
          ) : (
            <>
              <div className="flex flex-wrap gap-2.5 items-center justify-between mb-[18px]">
                <h1 className={ADMIN.h1}>Penomoran Surat Kanim Buleleng</h1>
                {tab === 'daftar' && (
                  <button
                    type="button"
                    className={ADMIN.btnAdd}
                    data-mekar
                    onClick={(e) => {
                      gulirKeAtas(e.currentTarget); // form dibuka dari atas
                      setFormTambah(true);
                    }}
                  >
                    <FaPlus size={11} className={GOLD.text} />
                    Tambah Nomor Surat
                  </button>
                )}
              </div>

              <div
                className={`${ADMIN.seg} w-fit mb-[18px]`}
                role="tablist"
                aria-label="Menu nomor surat"
              >
                {tabs.map(({ key, label, icon: Icon }) => (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === key}
                    key={key}
                    className={tab === key ? ADMIN.segActive : ADMIN.segBtn}
                    onClick={() => setTab(key)}
                  >
                    <Icon size={12} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Isi tab dipasang ulang (key) agar memudar naik setiap ganti tab */}
              <div key={tab} className={ANIM.muncul}>
                {tab === 'daftar' && <RegisterNomorSurat />}
                {tab === 'riwayat' && <RiwayatSurat />}
                {tab === 'hierarki' && (
                  <>
                    <p className={`text-[12.5px] leading-[1.6] mb-3.5 ${T.inkMuted}`}>
                      {HIERARKI_KODE.join(' → ')}. Kode yang sudah dipakai tidak dihapus, hanya
                      dinonaktifkan.
                    </p>
                    {kode.memuat ? (
                      <p className={ADMIN.empty}>Memuat hierarki kode...</p>
                    ) : (
                      <StrukturHierarki
                        nodes={kode.nodes}
                        hierarchy={HIERARKI_KODE}
                        denganStatus
                        onSimpan={simpanKode}
                        onHapus={nonaktifkanKode}
                        pesanPohonKosong="Belum ada kode surat. Tambahkan KOP lewat tampilan Explorer."
                      />
                    )}
                  </>
                )}
                {tab === 'pengaturan' && <PengaturanNomor />}
              </div>
            </>
          )}
        </section>
      </div>
      <ToastViewport />
    </div>
  );
}
