import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaBirthdayCake,
  FaBriefcase,
  FaFileImport,
  FaKey,
  FaMedal,
  FaPen,
  FaSearch,
  FaSitemap,
  FaUserCheck,
  FaUserPlus,
  FaUserShield,
  FaUserSlash,
  FaUserTie,
  FaUsers,
} from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import { useUnitKerja } from '@/context/useUnitKerja';
import ToastViewport from '@/components/ToastViewport';
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
import { pantauKontak, pantauMaster, pantauPegawai } from '../services/pegawaiDb';
import AvatarPegawai from '../components/AvatarPegawai';
import FormPegawai from '../components/FormPegawai';
import ModalBuatAkun from '../components/ModalBuatAkun';
import ModalAturPeran from '../components/ModalAturPeran';
import ModalImporPegawai from '../components/ModalImporPegawai';
import ModalKejutanUltah from '../components/ModalKejutanUltah';
import ModalStatusPegawai from '../components/ModalStatusPegawai';
import TabMaster from '../components/TabMaster';
import TabPejabat from '../components/TabPejabat';
import TabUnitKerja from '../components/TabUnitKerja';
import { K } from '../ui/kelas';

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
 * Data pegawai, akun, peran, foto, unit kerja, dan pejabat penandatangan (skema §5.1).
 * Data pegawai & kontak ditulis langsung (rules memvalidasi); akun, peran, dan status aktif hanya
 * lewat Cloud Function. Data Super Admin hanya bisa diubah Super Admin; akun sendiri tidak bisa
 * diubah peran/statusnya. Data bisa diimpor dari CSV (Excel).
 */
export default function Pegawai() {
  const navigate = useNavigate();
  const { currentUser, userData, isSuperAdmin, isKepegawaian } = useAuth();
  const uid = currentUser?.uid;
  const unit = useUnitKerja();
  const [tab, setTab] = useState('pegawai');
  const [daftar, setDaftar] = useState([]);
  const [kontak, setKontak] = useState({});
  const [pangkat, setPangkat] = useState([]);
  const [jabatan, setJabatan] = useState([]);
  const [memuat, setMemuat] = useState(true);

  const [form, setForm] = useState(null); // null = tertutup; { pegawai: object|null }
  const [modal, setModal] = useState(null); // { jenis: 'akun'|'peran'|'status'|'ultah'|'impor', pegawai? }
  const [cari, setCari] = useState('');
  const [saringUnit, setSaringUnit] = useState('');
  const [saringStatus, setSaringStatus] = useState('');
  const [hanyaKurang, setHanyaKurang] = useState(false);

  useEffect(() => {
    const berhenti = [
      pantauPegawai(
        (d) => {
          setDaftar(d);
          setMemuat(false);
        },
        () => setMemuat(false),
      ),
      pantauKontak(setKontak),
      pantauMaster('pangkat', setPangkat),
      pantauMaster('jabatan', setJabatan),
    ];
    return () => berhenti.forEach((f) => f());
  }, []);

  const dataSuperAdmin = (k) => (k.peran || []).includes('superadmin');
  const bolehUbah = (k) => isKepegawaian && (isSuperAdmin || !dataSuperAdmin(k));
  const akunSendiri = (k) => userData?.id === k.id;

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

  if (memuat)
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50 dark:bg-slate-900">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  const tombolTab = (kunci, ikon, label) => (
    <button
      type="button"
      onClick={() => setTab(kunci)}
      className={`py-3 px-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
        tab === kunci
          ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
          : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
      }`}
    >
      {ikon} {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            Data Pegawai
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">
            Kelola data pegawai, unit kerja, pangkat, jabatan, akun sistem, peran, dan pejabat
            penandatangan.
          </p>
        </div>

        <div className="flex gap-4 mb-6 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
          {tombolTab('pegawai', <FaUsers />, 'Pegawai')}
          {tombolTab('unit', <FaSitemap />, 'Unit Kerja')}
          {tombolTab('pejabat', <FaUserTie />, 'Pejabat')}
          {tombolTab('pangkat', <FaMedal />, 'Master Pangkat')}
          {tombolTab('jabatan', <FaBriefcase />, 'Master Jabatan')}
        </div>

        {tab === 'pegawai' && (
          <div className={K.kartu}>
            <div className={K.kepalaKartu}>
              <h2 className={K.judulKartu}>
                Daftar Pegawai ({tampil.length}
                {tampil.length !== daftar.length && ` dari ${daftar.length}`})
              </h2>
              {!form && isKepegawaian && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setModal({ jenis: 'impor' })}
                    className={K.tombolKedua}
                  >
                    <FaFileImport /> Impor CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ pegawai: null })}
                    className={K.tombolUtama}
                  >
                    <FaUserPlus /> Tambah Pegawai
                  </button>
                </div>
              )}
            </div>

            {form && (
              <FormPegawai
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

            <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_14rem_10rem_auto] gap-2 items-center">
              <label className="relative block">
                <span className="sr-only">Cari nama atau NIP</span>
                <FaSearch
                  size={12}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="search"
                  value={cari}
                  onChange={(e) => setCari(e.target.value)}
                  placeholder="Cari nama atau NIP…"
                  className={`${K.masukan} pl-8`}
                />
              </label>
              <select
                aria-label="Saring unit kerja"
                value={saringUnit}
                onChange={(e) => setSaringUnit(e.target.value)}
                className={K.masukan}
              >
                <option value="">Semua unit kerja</option>
                {unit.pohon.map((u) => (
                  <option key={u.id} value={u.id}>
                    {'\u2003'.repeat(u.kedalaman)}
                    {u.nama}
                  </option>
                ))}
              </select>
              <select
                aria-label="Saring status kepegawaian"
                value={saringStatus}
                onChange={(e) => setSaringStatus(e.target.value)}
                className={K.masukan}
              >
                <option value="">Semua status</option>
                {STATUS_KEPEGAWAIAN.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={hanyaKurang}
                  onChange={(e) => setHanyaKurang(e.target.checked)}
                  className="accent-indigo-600"
                />
                Belum lengkap ({jumlahKurang})
              </label>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[860px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                    <th className={K.th}>NAMA / PERAN</th>
                    <th className={K.th}>NIP & KONTAK</th>
                    <th className={K.th}>PANGKAT, JABATAN & UNIT</th>
                    <th className={K.th}>AKUN SISTEM</th>
                    <th className={`${K.th} text-right`}>AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  {tampil.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-sm text-slate-400">
                        {daftar.length
                          ? 'Tidak ada pegawai yang cocok dengan saringan.'
                          : 'Belum ada data pegawai. Tambah satu per satu atau pakai Impor CSV.'}
                      </td>
                    </tr>
                  )}
                  {tampil.map((k) => {
                    const nonaktif = k.aktif === false;
                    const sendiri = akunSendiri(k);
                    const ko = kontak[k.id];
                    const u = unit.byId[k.unitId];
                    const eselon = eselonById[k.jabatanId];
                    return (
                      <tr
                        key={k.id}
                        className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${nonaktif ? 'opacity-60' : ''}`}
                      >
                        <td className={K.td}>
                          <div className="flex items-start gap-3">
                            <AvatarPegawai pegawai={k} />
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 dark:text-slate-100">
                                {k.nama}{' '}
                                {sendiri && (
                                  <span className="text-[10px] font-semibold text-slate-400">
                                    (Anda)
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
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
                                  <span className={`${K.lencana} ${K.lencanaWaspada}`}>
                                    🎂 Ulang tahun hari ini
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className={`${K.td} text-sm`}>
                          <div className="font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {formatNip(k.nip) || '-'}
                          </div>
                          {k.tanggalLahir && (
                            <div className="text-xs text-slate-400 mt-0.5">
                              Lahir {formatTanggal(k.tanggalLahir)}
                            </div>
                          )}
                          {ko?.noWa && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                              WA {formatWa(ko.noWa)}
                            </div>
                          )}
                          {ko?.emailPribadi && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 break-all">
                              {ko.emailPribadi}
                            </div>
                          )}
                        </td>
                        <td className={`${K.td} max-w-xs`}>
                          <div className="text-slate-700 dark:text-slate-200 text-sm font-semibold">
                            {k.jabatanNama || '-'}
                            {eselon && (
                              <span className={`${K.lencana} ${K.lencanaInfo} ml-1.5`}>
                                Eselon {eselon}
                              </span>
                            )}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                            {labelPangkat(k.pangkatNama, k.golongan) || '-'}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                            {u ? u.nama : k.seksi || '-'}
                          </div>
                        </td>
                        <td className={K.td}>
                          {k.authUid ? (
                            <span className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded text-xs font-bold border border-emerald-200 dark:border-emerald-900/50 break-all">
                              {k.email}
                            </span>
                          ) : (
                            !nonaktif &&
                            bolehUbah(k) && (
                              <button
                                type="button"
                                onClick={() => setModal({ jenis: 'akun', pegawai: k })}
                                className="text-xs font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-900/50 hover:bg-indigo-100 flex items-center gap-1.5 whitespace-nowrap"
                              >
                                <FaKey /> Buat Akun
                              </button>
                            )
                          )}
                        </td>
                        <td className={K.td}>
                          <div className="flex items-center justify-end gap-1">
                            {isKepegawaian && !nonaktif && (
                              <button
                                type="button"
                                onClick={() => setModal({ jenis: 'ultah', pegawai: k })}
                                title="Kejutan ulang tahun"
                                aria-label={`Kejutan ulang tahun ${k.nama}`}
                                className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg"
                              >
                                <FaBirthdayCake size={14} />
                              </button>
                            )}
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
                                <FaPen size={14} />
                              </button>
                            )}
                            {bolehUbah(k) && !sendiri && (
                              <button
                                type="button"
                                onClick={() => setModal({ jenis: 'status', pegawai: k })}
                                title={nonaktif ? 'Aktifkan kembali' : 'Nonaktifkan'}
                                aria-label={`${nonaktif ? 'Aktifkan kembali' : 'Nonaktifkan'} ${k.nama}`}
                                className={`p-2 rounded-lg ${nonaktif ? 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10'}`}
                              >
                                {nonaktif ? <FaUserCheck size={14} /> : <FaUserSlash size={14} />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
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
        {tab === 'pejabat' && <TabPejabat pegawai={daftar} uid={uid} bolehUbah={isKepegawaian} />}
        {tab === 'pangkat' && <TabMaster jenis="pangkat" daftar={pangkat} uid={uid} />}
        {tab === 'jabatan' && <TabMaster jenis="jabatan" daftar={jabatan} uid={uid} />}
      </div>

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
      {modal?.jenis === 'ultah' && (
        <ModalKejutanUltah
          pegawai={modal.pegawai}
          uid={uid}
          onUji={() => navigate(`/?uji-ultah=${modal.pegawai.id}`)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.jenis === 'akun' && (
        <ModalBuatAkun pegawai={modal.pegawai} onClose={() => setModal(null)} />
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
