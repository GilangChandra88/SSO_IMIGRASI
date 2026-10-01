/**
 * Penomoran Surat Kanim Buleleng (NomorSuratPage purwarupa admin) + tab Riwayat Surat,
 * Hierarki Kode, dan Pengaturan nomor urut.
 */
import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FaCog, FaFileAlt, FaListOl, FaPlus, FaSitemap } from 'react-icons/fa';
import StrukturHierarki from '@/components/StrukturHierarki/StrukturHierarki';
import { indeksHierarki } from '@/components/StrukturHierarki/hierarkiUtils';
import ToastViewport from '@/components/ToastViewport';
import { ADMIN, GOLD, T } from '@/utils/uiTokens';
import PengaturanNomor from '../components/nomor-surat/PengaturanNomor';
import RegisterNomorSurat from '../components/nomor-surat/RegisterNomorSurat';
import RiwayatSurat from '../components/nomor-surat/RiwayatSurat';
import TambahNomorSurat from '../components/nomor-surat/TambahNomorSurat';
import { HIERARKI_KODE } from '../data/nomorSuratConfig';
import {
  useKodeSurat,
  useNomorTerakhir,
  useRegisterNomor,
  useRiwayatSurat,
} from '../hooks/useNomorSurat';
import { hapusKodeSurat, simpanKodeSurat } from '../services/nomorSurat';

const TABS = [
  { key: 'daftar', label: 'Daftar Nomor', icon: FaListOl },
  { key: 'riwayat', label: 'Riwayat Surat', icon: FaFileAlt },
  { key: 'hierarki', label: 'Hierarki Kode', icon: FaSitemap },
  { key: 'pengaturan', label: 'Pengaturan', icon: FaCog },
];

export default function NomorSuratKanim() {
  const location = useLocation();
  const tabAwal = TABS.some((t) => t.key === location.state?.tab) ? location.state.tab : 'daftar';
  const [tab, setTab] = useState(tabAwal);
  const [formTambah, setFormTambah] = useState(false);

  const { nodes, loading: memuatKode } = useKodeSurat();
  const { lastNumber } = useNomorTerakhir();
  const register = useRegisterNomor();
  const riwayat = useRiwayatSurat();
  const indeksKode = useMemo(() => indeksHierarki(nodes), [nodes]);

  return (
    <div className={`min-h-full ${T.ground}`}>
      <div className={ADMIN.page}>
        <section className={ADMIN.card}>
          {formTambah ? (
            <TambahNomorSurat
              indeks={indeksKode}
              lastNumber={lastNumber}
              onKembali={() => setFormTambah(false)}
            />
          ) : (
            <>
              <div className="flex flex-wrap gap-2.5 items-center justify-between mb-[18px]">
                <h1 className={ADMIN.h1}>Penomoran Surat Kanim Buleleng</h1>
                {tab === 'daftar' && (
                  <button
                    type="button"
                    className={ADMIN.btnAdd}
                    onClick={() => setFormTambah(true)}
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
                {TABS.map(({ key, label, icon: Icon }) => (
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

              {tab === 'daftar' && (
                <RegisterNomorSurat rows={register.rows} loading={register.loading} />
              )}
              {tab === 'riwayat' && <RiwayatSurat rows={riwayat.rows} loading={riwayat.loading} />}
              {tab === 'hierarki' && (
                <>
                  <p className={`text-[12.5px] leading-[1.6] mb-3.5 ${T.inkMuted}`}>
                    {HIERARKI_KODE.join(' → ')}
                  </p>
                  {memuatKode ? (
                    <p className={ADMIN.empty}>Memuat hierarki kode...</p>
                  ) : (
                    <StrukturHierarki
                      nodes={nodes}
                      hierarchy={HIERARKI_KODE}
                      onSimpan={simpanKodeSurat}
                      onHapus={hapusKodeSurat}
                      pesanPohonKosong="Belum ada kode surat. Tambahkan KOP lewat tampilan Explorer."
                    />
                  )}
                </>
              )}
              {tab === 'pengaturan' && <PengaturanNomor lastNumber={lastNumber} />}
            </>
          )}
        </section>
      </div>
      <ToastViewport />
    </div>
  );
}
