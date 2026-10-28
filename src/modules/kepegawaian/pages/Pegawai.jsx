import { useEffect, useMemo, useState } from 'react';
import {
  FaBriefcase,
  FaFileImport,
  FaKey,
  FaMedal,
  FaPen,
  FaPlus,
  FaSearch,
  FaSitemap,
  FaUnlockAlt,
  FaUserCheck,
  FaUserShield,
  FaUserSlash,
  FaUserTie,
  FaUsers,
} from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import { useUnitKerja } from '@/context/useUnitKerja';
import ToastViewport from '@/components/ToastViewport';
import { ANIM } from '@/utils/animasi';
import { labelPeran, peranDariKlaim } from '@/utils/peran';
import { adalahUltahHariIni } from '@/utils/ulangTahun';
import {
  STATUS_KEPEGAWAIAN,
  dataBelumLengkap,
  formatNip,
  formatWa,
  labelPangkat,
  labelStatus,
} from '@/utils/dataPegawai';
import { pantauKontak, pantauMaster } from '../services/pegawaiDb';
import { useDaftarPegawai } from '../hooks/useDaftarPegawai';
import AvatarPegawai from '../components/AvatarPegawai';
import ModalFormPegawai from '../components/ModalFormPegawai';
import ModalBuatAkun from '../components/ModalBuatAkun';
import ModalAturPeran from '../components/ModalAturPeran';
import ModalAturUlangSandi from '../components/ModalAturUlangSandi';
import ModalImporPegawai from '../components/ModalImporPegawai';
import ModalStatusPegawai from '../components/ModalStatusPegawai';
import TabMaster from '../components/TabMaster';
import TabPejabat from '../components/TabPejabat';
import TabUnitKerja from '../components/TabUnitKerja';
import { K } from '../ui/kelas';

const TAB = [
  ['pegawai', FaUsers, 'Pegawai'],
  ['unit', FaSitemap, 'Unit Kerja'],
  ['pejabat', FaUserTie, 'Pejabat'],
  ['pangkat', FaMedal, 'Pangkat'],
  ['jabatan', FaBriefcase, 'Jabatan'],
];

const formatTanggal = (iso) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return '';
  const [t, b, h] = iso.split('-').map(Number);
  return new Date(t, b - 1, h).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

/** true bila unit `unitId` adalah `indukId` atau berada di bawahnya. */
function dalamUnit(byId, unitId, indukId) {
  let u = byId[unitId];
  for (let i = 0; u && i < 4; i++) {
    if (u.id === indukId) return true;
    u = byId[u.indukId];
  }
  return false;
}

/**
 * Data pegawai, unit kerja, pejabat penandatangan, serta master pangkat & jabatan (skema §5.1).
 * Data pegawai & kontak ditulis langsung (rules memvalidasi); akun, peran, dan status aktif hanya
 * lewat Cloud Function. Data Super Admin hanya bisa diubah Super Admin; akun sendiri tidak bisa
 * diubah peran/statusnya. Data bisa diimpor dari CSV (Excel). Ulang tahun & kejutannya diatur di
 * halaman Ulang Tahun.
 */
export default function Pegawai() {
  const { currentUser, userData, isSuperAdmin, isKepegawaian, punyaPeran } = useAuth();
  const uid = currentUser?.uid;
  const unit = useUnitKerja();
  const { pegawai: daftar, memuat } = useDaftarPegawai();
  const [tab, setTab] = useState('pegawai');
  const [kontak, setKontak] = useState({});
  const [pangkat, setPangkat] = useState([]);
  const [jabatan, setJabatan] = useState([]);

  const [form, setForm] = useState(null); // null = tertutup; { pegawai: object|null }
  const [modal, setModal] = useState(null); // { jenis: 'akun'|'sandi'|'peran'|'status'|'impor', pegawai? }
  const [cari, setCari] = useState('');
  const [saringUnit, setSaringUnit] = useState('');
  const [saringStatus, setSaringStatus] = useState('');
  const [hanyaKurang, setHanyaKurang] = useState(false);

  useEffect(() => {
    const berhenti = [
      pantauKontak(setKontak),
      pantauMaster('pangkat', setPangkat),
      pantauMaster('jabatan', setJabatan),
    ];
    return () => berhenti.forEach((f) => f());
  }, []);

  const dataSuperAdmin = (k) => (k.peran || []).includes('superadmin');
  const bolehUbah = (k) => isKepegawaian && (isSuperAdmin || !dataSuperAdmin(k));
  const akunSendiri = (k) => userData?.id === k.id;
  // Sama dengan Function aturUlangSandi: akun yang punya peran yang tidak dimiliki pemanggil
  // (mis. Keuangan) hanya bisa diatur ulang Super Admin
  const bolehAturUlangSandi = (k) =>
    isKepegawaian &&
    !!k.authUid &&
    k.aktif !== false &&
    !akunSendiri(k) &&
    (k.peran || []).every((r) => punyaPeran(r));

  const eselonById = useMemo(
    () => Object.fromEntries(jabatan.map((j) => [j.id, j.eselon || ''])),
    [jabatan],
  );

  const tampil = useMemo(() => {
    const kata = cari.trim().toLowerCase();
    const angka = kata.replace(/\s/g, '');
    return daftar
      .map((k) => ({ ...k, kurang: dataBelumLengkap(k, kontak[k.id]) }))
      .filter((k) => {
        if (
          kata &&
          !k.nama.toLowerCase().includes(kata) &&
          !(angka && (k.nip || '').includes(angka))
        )
          return false;
        if (saringUnit && !dalamUnit(unit.byId, k.unitId, saringUnit)) return false;
        if (saringStatus && k.statusKepegawaian !== saringStatus) return false;
        if (hanyaKurang && (!k.kurang.length || k.aktif === false)) return false;
        return true;
      });
  }, [daftar, kontak, cari, saringUnit, saringStatus, hanyaKurang, unit.byId]);

  const jumlahKurang = useMemo(
    () =>
      daftar.filter((k) => k.aktif !== false && dataBelumLengkap(k, kontak[k.id]).length).length,
    [daftar, kontak],
  );

  return (
    <div className={K.latar}>
      <div className={K.halaman}>
        <section className={K.kartu}>
          <div className={K.kepala}>
            <div>
              <h1 className={K.h1}>Data Pegawai</h1>
              <p className={K.sub}>
                Kelola data pegawai, unit kerja, pejabat penandatangan, pangkat, jabatan, akun
                sistem, dan peran.
              </p>
            </div>
          </div>

          <div className={`${K.seg} mb-[18px]`} role="tablist" aria-label="Bagian data pegawai">
            {TAB.map(([kunci, Ikon, label]) => (
              <button
                key={kunci}
                type="button"
                role="tab"
                aria-selected={tab === kunci}
                onClick={() => setTab(kunci)}
                className={tab === kunci ? K.segAktif : K.segBtn}
              >
                <Ikon size={12} /> {label}
              </button>
            ))}
          </div>

          <div key={tab} className={ANIM.muncul}>
            {tab === 'pegawai' && (
              <>
                <div className={K.toolbar}>
                  <label className={K.cari}>
                    <FaSearch size={12} />
                    <span className="sr-only">Cari nama atau NIP</span>
                    <input
                      type="search"
                      value={cari}
                      onChange={(e) => setCari(e.target.value)}
                      placeholder="Cari nama atau NIP…"
                      className={K.cariInput}
                    />
                  </label>
                  <select
                    aria-label="Saring unit kerja"
                    value={saringUnit}
                    onChange={(e) => setSaringUnit(e.target.value)}
                    className={`${K.kontrol} max-w-full sm:max-w-[16rem]`}
                  >
                    <option value="">Semua unit kerja</option>
                    {unit.pohon.map((u) => (
                      <option key={u.id} value={u.id}>
                        {' '.repeat(u.kedalaman)}
                        {u.nama}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Saring status kepegawaian"
                    value={saringStatus}
                    onChange={(e) => setSaringStatus(e.target.value)}
                    className={K.kontrol}
                  >
                    <option value="">Semua status</option>
                    {STATUS_KEPEGAWAIAN.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <label
                    className={`flex items-center gap-2 text-[12.5px] font-semibold cursor-pointer whitespace-nowrap ${K.teks2}`}
                  >
                    <input
                      type="checkbox"
                      checked={hanyaKurang}
                      onChange={(e) => setHanyaKurang(e.target.checked)}
                      className={K.centang}
                    />
                    Belum lengkap ({jumlahKurang})
                  </label>
                  {isKepegawaian && (
                    <div className="flex flex-wrap gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={() => setModal({ jenis: 'impor' })}
                        className={K.tombolKecil}
                      >
                        <FaFileImport className={K.aksen} /> Impor CSV
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ pegawai: null })}
                        className={K.tombolTambah}
                      >
                        <FaPlus size={11} className={K.aksen} /> Tambah Pegawai
                      </button>
                    </div>
                  )}
                </div>

                <p className={`text-[12px] mb-2.5 ${K.redup}`}>
                  {tampil.length}
                  {tampil.length !== daftar.length && ` dari ${daftar.length}`} pegawai
                </p>

                <div className={K.tabelWadah}>
                  <table className={`${K.tabel} min-w-[860px]`}>
                    <thead>
                      <tr>
                        <th className={K.th}>Nama / Peran</th>
                        <th className={K.th}>NIP & Kontak</th>
                        <th className={K.th}>Pangkat, Jabatan & Unit</th>
                        <th className={K.th}>Akun Sistem</th>
                        <th className={`${K.th} text-right`}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {memuat ? (
                        <tr>
                          <td colSpan={5} className={K.kosong}>
                            Memuat data pegawai…
                          </td>
                        </tr>
                      ) : tampil.length === 0 ? (
                        <tr>
                          <td colSpan={5} className={K.kosong}>
                            {daftar.length
                              ? 'Tidak ada pegawai yang cocok dengan saringan.'
                              : 'Belum ada data pegawai. Tambah satu per satu atau pakai Impor CSV.'}
                          </td>
                        </tr>
                      ) : (
                        tampil.map((k) => {
                          const nonaktif = k.aktif === false;
                          const sendiri = akunSendiri(k);
                          const ko = kontak[k.id];
                          const u = unit.byId[k.unitId];
                          const eselon = eselonById[k.jabatanId];
                          return (
                            <tr key={k.id} className={`${K.tr} ${nonaktif ? 'opacity-60' : ''}`}>
                              <td className={K.td}>
                                <div className="flex items-start gap-3">
                                  <AvatarPegawai pegawai={k} />
                                  <div className="min-w-0">
                                    <div className={`font-bold ${K.teks}`}>
                                      {k.nama}{' '}
                                      {sendiri && (
                                        <span className={`text-[10.5px] font-semibold ${K.redup}`}>
                                          (Anda)
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1 mt-1">
                                      <span className={`${K.lencana} ${K.lencanaInfo}`}>
                                        {labelPeran(peranDariKlaim({ peran: k.peran }))}
                                      </span>
                                      {k.statusKepegawaian && (
                                        <span className={`${K.lencana} ${K.lencanaNetral}`}>
                                          {labelStatus(k.statusKepegawaian)}
                                        </span>
                                      )}
                                      {nonaktif && (
                                        <span className={`${K.lencana} ${K.lencanaBahaya}`}>
                                          Nonaktif
                                        </span>
                                      )}
                                      {!nonaktif && k.kurang.length > 0 && (
                                        <span
                                          title={`Belum diisi: ${k.kurang.join(', ')}`}
                                          className={`${K.lencana} ${K.lencanaWaspada} cursor-help`}
                                        >
                                          {k.kurang.length} data kosong
                                        </span>
                                      )}
                                      {!nonaktif && adalahUltahHariIni(k.tanggalLahir) && (
                                        <span className={`${K.lencana} ${K.lencanaAksen}`}>
                                          🎂 Ulang tahun hari ini
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className={K.td}>
                                <div className={K.mono}>{formatNip(k.nip) || '-'}</div>
                                {k.tanggalLahir && (
                                  <div className={`text-[12px] mt-0.5 ${K.redup}`}>
                                    Lahir {formatTanggal(k.tanggalLahir)}
                                  </div>
                                )}
                                {ko?.noWa && (
                                  <div className={`${K.mono} text-[12px] mt-0.5`}>
                                    WA {formatWa(ko.noWa)}
                                  </div>
                                )}
                                {ko?.emailPribadi && (
                                  <div className={`text-[12px] break-all ${K.redup}`}>
                                    {ko.emailPribadi}
                                  </div>
                                )}
                              </td>
                              <td className={`${K.td} max-w-xs`}>
                                <div className={`text-[13px] font-semibold ${K.teks}`}>
                                  {k.jabatanNama || '-'}
                                  {eselon && (
                                    <span className={`${K.lencana} ${K.lencanaInfo} ml-1.5`}>
                                      Eselon {eselon}
                                    </span>
                                  )}
                                </div>
                                <div className={`text-[12px] mt-0.5 ${K.teks2}`}>
                                  {labelPangkat(k.pangkatNama, k.golongan) || '-'}
                                </div>
                                <div className={`text-[12px] mt-0.5 ${K.redup}`}>
                                  {u ? u.nama : k.seksi || '-'}
                                </div>
                              </td>
                              <td className={K.td}>
                                {k.authUid ? (
                                  <div className="flex flex-col items-start gap-1.5">
                                    <span className={`${K.lencana} ${K.lencanaOk} break-all`}>
                                      {k.email}
                                    </span>
                                    {bolehAturUlangSandi(k) && (
                                      <button
                                        type="button"
                                        onClick={() => setModal({ jenis: 'sandi', pegawai: k })}
                                        className={K.tombolKecil}
                                      >
                                        <FaUnlockAlt className={K.aksen} /> Atur ulang sandi
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  !nonaktif &&
                                  bolehUbah(k) && (
                                    <button
                                      type="button"
                                      onClick={() => setModal({ jenis: 'akun', pegawai: k })}
                                      className={K.tombolKecil}
                                    >
                                      <FaKey className={K.aksen} /> Buat Akun
                                    </button>
                                  )
                                )}
                              </td>
                              <td className={K.td}>
                                <div className="flex items-center justify-end gap-1">
                                  {isSuperAdmin && k.authUid && !nonaktif && !sendiri && (
                                    <button
                                      type="button"
                                      onClick={() => setModal({ jenis: 'peran', pegawai: k })}
                                      title="Atur peran"
                                      aria-label={`Atur peran ${k.nama}`}
                                      className={K.tombolIkon}
                                    >
                                      <FaUserShield size={14} />
                                    </button>
                                  )}
                                  {bolehUbah(k) && (
                                    <button
                                      type="button"
                                      onClick={() => setForm({ pegawai: k })}
                                      title="Ubah data"
                                      aria-label={`Ubah data ${k.nama}`}
                                      className={K.tombolIkon}
                                    >
                                      <FaPen size={13} />
                                    </button>
                                  )}
                                  {bolehUbah(k) && !sendiri && (
                                    <button
                                      type="button"
                                      onClick={() => setModal({ jenis: 'status', pegawai: k })}
                                      title={nonaktif ? 'Aktifkan kembali' : 'Nonaktifkan'}
                                      aria-label={`${nonaktif ? 'Aktifkan kembali' : 'Nonaktifkan'} ${k.nama}`}
                                      className={K.tombolIkon}
                                    >
                                      {nonaktif ? (
                                        <FaUserCheck size={14} className={K.teksOk} />
                                      ) : (
                                        <FaUserSlash size={14} className={K.teksBahaya} />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {tab === 'unit' && (
              <TabUnitKerja
                unit={unit}
                pegawai={daftar}
                uid={uid}
                bolehUbah={isKepegawaian}
                superAdmin={isSuperAdmin}
              />
            )}
            {tab === 'pejabat' && (
              <TabPejabat pegawai={daftar} uid={uid} bolehUbah={isKepegawaian} />
            )}
            {tab === 'pangkat' && <TabMaster jenis="pangkat" daftar={pangkat} uid={uid} />}
            {tab === 'jabatan' && <TabMaster jenis="jabatan" daftar={jabatan} uid={uid} />}
          </div>
        </section>
      </div>

      {form && (
        <ModalFormPegawai
          key={form.pegawai?.id || 'baru'}
          pegawai={form.pegawai}
          kontak={form.pegawai ? kontak[form.pegawai.id] : undefined}
          pangkat={pangkat}
          jabatan={jabatan}
          unit={unit}
          uid={uid}
          onTutup={() => setForm(null)}
        />
      )}
      {modal?.jenis === 'impor' && (
        <ModalImporPegawai
          pegawai={daftar}
          kontak={kontak}
          pangkat={pangkat}
          jabatan={jabatan}
          unit={unit}
          uid={uid}
          superAdmin={isSuperAdmin}
          onTutup={() => setModal(null)}
        />
      )}
      {modal?.jenis === 'akun' && (
        <ModalBuatAkun pegawai={modal.pegawai} onClose={() => setModal(null)} />
      )}
      {modal?.jenis === 'sandi' && (
        <ModalAturUlangSandi pegawai={modal.pegawai} onClose={() => setModal(null)} />
      )}
      {modal?.jenis === 'peran' && (
        <ModalAturPeran pegawai={modal.pegawai} onClose={() => setModal(null)} />
      )}
      {modal?.jenis === 'status' && (
        <ModalStatusPegawai pegawai={modal.pegawai} onClose={() => setModal(null)} />
      )}
      <ToastViewport />
    </div>
  );
}
