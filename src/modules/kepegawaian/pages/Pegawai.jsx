import { useState, useEffect } from 'react';
import { db, secondaryAuth } from '@/config/firebase';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  FaUserPlus,
  FaTrash,
  FaPen,
  FaUsers,
  FaMedal,
  FaBriefcase,
  FaSave,
  FaTimes,
  FaPlus,
  FaKey,
  FaStar,
} from 'react-icons/fa';

export default function Pegawai() {
  const [activeTab, setActiveTab] = useState('Pegawai');
  const [PegawaiList, setPegawaiList] = useState([]);
  const [pangkatList, setPangkatList] = useState([]);
  const [jabatanList, setJabatanList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isAddingPegawai, setIsAddingPegawai] = useState(false);
  const [editingPegawaiId, setEditingPegawaiId] = useState(null);
  const [formPegawai, setFormPegawai] = useState({
    nama: '',
    nip: '',
    pangkat: '',
    jabatan: '',
    role: 'Pegawai',
    status_khusus: '',
  });

  const [isAddingMaster, setIsAddingMaster] = useState(false);
  const [editingMasterId, setEditingMasterId] = useState(null);
  const [formMasterName, setFormMasterName] = useState('');

  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountTarget, setAccountTarget] = useState(null);
  const [accountPrefix, setAccountPrefix] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState('');

  const PegawaiCol = collection(db, 'pegawai');
  const pangkatCol = collection(db, 'master_pangkat');
  const jabatanCol = collection(db, 'master_jabatan');

  useEffect(() => {
    const unsubPegawai = onSnapshot(query(PegawaiCol), (snapshot) => {
      setPegawaiList(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    const unsubPangkat = onSnapshot(query(pangkatCol), (snapshot) => {
      setPangkatList(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    const unsubJabatan = onSnapshot(query(jabatanCol), (snapshot) => {
      setJabatanList(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => {
      unsubPegawai();
      unsubPangkat();
      unsubJabatan();
    };
  }, []);

  const handleSavePegawai = async (e) => {
    e.preventDefault();
    if (!formPegawai.nama || !formPegawai.nip) return;

    try {
      // Check if status_khusus is already held by someone else
      let oldHolder = null;
      if (['Bendahara', 'PPK', 'KPA'].includes(formPegawai.status_khusus)) {
        oldHolder = PegawaiList.find(
          (p) => p.status_khusus === formPegawai.status_khusus && p.id !== editingPegawaiId,
        );
        if (oldHolder) {
          if (
            !window.confirm(
              `Status ${formPegawai.status_khusus} saat ini dipegang oleh ${oldHolder.nama}.\nApakah Anda ingin memindahkan status ini ke ${formPegawai.nama}?`,
            )
          ) {
            return;
          }
        }
      }

      // If user agreed to reassign, clear it from the old holder
      if (oldHolder) {
        await updateDoc(doc(db, 'pegawai', oldHolder.id), { status_khusus: '' });
      }

      if (editingPegawaiId) {
        await updateDoc(doc(db, 'pegawai', editingPegawaiId), formPegawai);
      } else {
        await addDoc(PegawaiCol, { ...formPegawai, createdAt: new Date().toISOString() });
      }
      setIsAddingPegawai(false);
      setEditingPegawaiId(null);
      setFormPegawai({
        nama: '',
        nip: '',
        pangkat: '',
        jabatan: '',
        role: 'Pegawai',
        status_khusus: '',
      });
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const handleDeletePegawai = async (id) => {
    if (!window.confirm('Yakin ingin menghapus Pegawai ini?')) return;
    try {
      await deleteDoc(doc(db, 'pegawai', id));
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const startEditPegawai = (k) => {
    setFormPegawai({
      nama: k.nama,
      nip: k.nip,
      pangkat: k.pangkat || '',
      jabatan: k.jabatan || '',
      role: k.role || 'Pegawai',
      status_khusus: k.status_khusus || '',
    });
    setEditingPegawaiId(k.id);
    setIsAddingPegawai(true);
  };

  const handleSaveMaster = async (e, colRef, collectionName) => {
    e.preventDefault();
    if (!formMasterName.trim()) return;
    try {
      if (editingMasterId) {
        await updateDoc(doc(db, collectionName, editingMasterId), { name: formMasterName });
      } else {
        await addDoc(colRef, { name: formMasterName, createdAt: new Date().toISOString() });
      }
      setIsAddingMaster(false);
      setEditingMasterId(null);
      setFormMasterName('');
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDeleteMaster = async (id, collectionName) => {
    if (!window.confirm('Hapus data master ini?')) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const openAccountModal = (k) => {
    setAccountTarget(k);
    setAccountPrefix(k.nama.split(' ')[0].toLowerCase() || '');
    setAccountPassword('');
    setAccountError('');
    setAccountModalOpen(true);
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!accountPrefix || !accountPassword) return;
    setAccountLoading(true);
    setAccountError('');
    try {
      const email = accountPrefix.trim().toLowerCase() + '@imigrasi.com';
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        accountPassword,
      );
      await updateDoc(doc(db, 'pegawai', accountTarget.id), {
        email: email,
        authUid: userCredential.user.uid,
      });
      await signOut(secondaryAuth);
      setAccountModalOpen(false);
    } catch (err) {
      setAccountError(err.message);
    } finally {
      setAccountLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50 dark:bg-slate-900">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              Data Pegawai
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">
              Kelola database pegawai, pangkat, jabatan, dan akun sistem.
            </p>
          </div>
        </div>

        <div className="flex gap-4 mb-6 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
          <button
            onClick={() => setActiveTab('Pegawai')}
            className={`py-3 px-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'Pegawai' ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 dark:text-slate-200'}`}
          >
            <FaUsers /> Pegawai
          </button>
          <button
            onClick={() => setActiveTab('pangkat')}
            className={`py-3 px-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'pangkat' ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 dark:text-slate-200'}`}
          >
            <FaMedal /> Master Pangkat
          </button>
          <button
            onClick={() => setActiveTab('jabatan')}
            className={`py-3 px-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'jabatan' ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 dark:text-slate-200'}`}
          >
            <FaBriefcase /> Master Jabatan
          </button>
        </div>

        {activeTab === 'Pegawai' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
              <h2 className="font-bold text-slate-700 dark:text-slate-200">Daftar Pegawai</h2>
              {!isAddingPegawai && (
                <button
                  onClick={() => {
                    setIsAddingPegawai(true);
                    setEditingPegawaiId(null);
                    setFormPegawai({
                      nama: '',
                      nip: '',
                      pangkat: '',
                      jabatan: '',
                      role: 'Pegawai',
                      status_khusus: '',
                    });
                  }}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition-all"
                >
                  <FaUserPlus /> Tambah Pegawai
                </button>
              )}
            </div>

            {isAddingPegawai && (
              <form
                onSubmit={handleSavePegawai}
                className="p-4 border-b border-indigo-100 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-900/10 grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    NAMA
                  </label>
                  <input
                    required
                    type="text"
                    value={formPegawai.nama}
                    onChange={(e) => setFormPegawai({ ...formPegawai, nama: e.target.value })}
                    className="w-full text-sm py-2 px-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    NIP
                  </label>
                  <input
                    required
                    type="text"
                    value={formPegawai.nip}
                    onChange={(e) => setFormPegawai({ ...formPegawai, nip: e.target.value })}
                    className="w-full text-sm py-2 px-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    PANGKAT/GOL
                  </label>
                  <select
                    value={formPegawai.pangkat}
                    onChange={(e) => setFormPegawai({ ...formPegawai, pangkat: e.target.value })}
                    className="w-full text-sm py-2 px-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  >
                    <option value="">-- Pilih --</option>
                    {pangkatList.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    JABATAN
                  </label>
                  <select
                    value={formPegawai.jabatan}
                    onChange={(e) => setFormPegawai({ ...formPegawai, jabatan: e.target.value })}
                    className="w-full text-sm py-2 px-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  >
                    <option value="">-- Pilih --</option>
                    {jabatanList.map((j) => (
                      <option key={j.id} value={j.name}>
                        {j.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    HAK AKSES
                  </label>
                  <select
                    value={formPegawai.role}
                    onChange={(e) => setFormPegawai({ ...formPegawai, role: e.target.value })}
                    className="w-full text-sm py-2 px-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 font-bold text-indigo-700 dark:text-indigo-400"
                  >
                    <option value="Pegawai">Pegawai</option>
                    <option value="Admin">Admin</option>
                    <option value="Super Admin">Super Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                    <FaStar className="text-amber-500" /> STATUS KHUSUS
                  </label>
                  <select
                    value={formPegawai.status_khusus}
                    onChange={(e) =>
                      setFormPegawai({ ...formPegawai, status_khusus: e.target.value })
                    }
                    className="w-full text-sm py-2 px-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 font-bold text-slate-700 dark:text-slate-200"
                  >
                    <option value="">-- Tidak Ada --</option>
                    <option value="Bendahara">Bendahara</option>
                    <option value="PPK">Pejabat Pembuat Komitmen (PPK)</option>
                    <option value="KPA">Kuasa Pengguna Anggaran (KPA)</option>
                  </select>
                </div>
                <div className="md:col-span-3 flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingPegawai(false)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                  >
                    <FaTimes /> Batal
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2 shadow-sm"
                  >
                    <FaSave /> Simpan
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                      NAMA / HAK AKSES
                    </th>
                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                      NIP
                    </th>
                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                      JABATAN & PANGKAT
                    </th>
                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                      STATUS KHUSUS
                    </th>
                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                      AKUN SISTEM
                    </th>
                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 text-right">
                      AKSI
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {PegawaiList.map((k) => (
                    <tr
                      key={k.id}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                    >
                      <td className="p-4">
                        <div className="font-bold text-slate-800 dark:text-slate-100">{k.nama}</div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 mt-1">
                          {k.role || 'Pegawai'}
                        </div>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300 font-mono text-sm">
                        {k.nip}
                      </td>
                      <td className="p-4">
                        <div className="text-slate-700 dark:text-slate-200 text-sm font-semibold">
                          {k.jabatan || '-'}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                          {k.pangkat || '-'}
                        </div>
                      </td>
                      <td className="p-4">
                        {k.status_khusus && (
                          <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-md text-xs font-bold">
                            <FaStar size={10} className="text-amber-500" />
                            {k.status_khusus === 'PPK' ? 'PPK' : k.status_khusus}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        {k.email ? (
                          <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-xs font-bold border border-emerald-200">
                            {k.email}
                          </span>
                        ) : (
                          <button
                            onClick={() => openAccountModal(k)}
                            className="text-xs font-bold bg-indigo-50 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-100 flex items-center gap-1.5"
                          >
                            <FaKey /> Buat Akun
                          </button>
                        )}
                      </td>
                      <td className="p-4 text-right flex items-center justify-end gap-2">
                        <button
                          onClick={() => startEditPegawai(k)}
                          className="p-2 text-slate-400 hover:text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 rounded-lg"
                        >
                          <FaPen size={14} />
                        </button>
                        <button
                          onClick={() => handleDeletePegawai(k.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <FaTrash size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Master Data omitted for brevity, adding simple ones */}
        {(activeTab === 'pangkat' || activeTab === 'jabatan') && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden max-w-2xl mx-auto">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
              <h2 className="font-bold text-slate-700 dark:text-slate-200">
                Data Master {activeTab}
              </h2>
              {!isAddingMaster && (
                <button
                  onClick={() => {
                    setIsAddingMaster(true);
                    setEditingMasterId(null);
                    setFormMasterName('');
                  }}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2"
                >
                  <FaPlus /> Tambah Data
                </button>
              )}
            </div>
            {isAddingMaster && (
              <form
                onSubmit={(e) =>
                  handleSaveMaster(
                    e,
                    activeTab === 'pangkat' ? pangkatCol : jabatanCol,
                    activeTab === 'pangkat' ? 'master_pangkat' : 'master_jabatan',
                  )
                }
                className="p-4 border-b border-indigo-100 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-900/10 flex gap-4 items-end"
              >
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    NAMA {activeTab.toUpperCase()}
                  </label>
                  <input
                    required
                    type="text"
                    value={formMasterName}
                    onChange={(e) => setFormMasterName(e.target.value)}
                    className="w-full text-sm py-2 px-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700"
                  >
                    Simpan
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingMaster(false)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Batal
                  </button>
                </div>
              </form>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <tbody>
                  {(activeTab === 'pangkat' ? pangkatList : jabatanList).map((m) => (
                    <tr
                      key={m.id}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <td className="p-4 font-semibold text-slate-800 dark:text-slate-100">
                        {m.name}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() =>
                            handleDeleteMaster(
                              m.id,
                              activeTab === 'pangkat' ? 'master_pangkat' : 'master_jabatan',
                            )
                          }
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <FaTrash size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {accountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100">
                Buat Akun Pegawai
              </h2>
              <button
                onClick={() => setAccountModalOpen(false)}
                className="text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg"
              >
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleCreateAccount} className="p-6 space-y-4">
              {accountError && (
                <div className="bg-rose-50 text-rose-600 p-3 rounded-lg text-sm border border-rose-100">
                  {accountError}
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  Email Pegawai
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    required
                    value={accountPrefix}
                    onChange={(e) => setAccountPrefix(e.target.value.replace(/\s+/g, ''))}
                    className="flex-1 px-4 py-2.5 border border-r-0 border-slate-300 dark:border-slate-700 rounded-l-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800 dark:text-slate-100"
                    placeholder="awalan.akun"
                  />
                  <div className="bg-slate-100 px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-r-xl text-slate-500 dark:text-slate-400 font-semibold">
                    @imigrasi.com
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  Password Awal
                </label>
                <input
                  type="password"
                  required
                  minLength="6"
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800 dark:text-slate-100"
                  placeholder="Minimal 6 karakter"
                />
                <p className="text-xs text-slate-400 mt-2">
                  Password ini akan digunakan pegawai untuk login pertama kali.
                </p>
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setAccountModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={accountLoading}
                  className="flex-1 bg-indigo-600 text-white font-bold py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  {accountLoading ? 'Membuat...' : 'Buat Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
