import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  FaChevronLeft,
  FaSave,
  FaPrint,
  FaCheckCircle,
  FaSpinner,
  FaSearch,
  FaTimes,
  FaEye,
  FaEyeSlash,
  FaTrashAlt,
  FaLock,
  FaList,
  FaRegFileAlt,
} from 'react-icons/fa';
import { SURAT_REGISTRY } from '@/data/surat';
import { db } from '@/config/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  runTransaction,
  query,
  where,
  deleteDoc,
} from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { syncSPDItems, syncOtherSPDsData } from '@/modules/e-persuratan/lpj';
import SuratPreviewModal from '@/components/SuratPreview/SuratPreviewModal';
import SuratPreviewCanvas from '@/components/SuratPreview/SuratPreviewCanvas';

export default function SuratForm() {
  const { suratId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  const queryParams = new URLSearchParams(location.search);
  const packId = queryParams.get('packId');
  const itemId = queryParams.get('itemId');

  const found = SURAT_REGISTRY.find((s) => s.id === suratId);

  const isSpbyHub = suratId === 'spby';
  const isPhase2Child = [
    'nota-dinas',
    'surat-perintah-bayar',
    'rincian-spby',
    'rincian-perjalanan-tugas',
    'sptjm-pelaksana',
    'nominatif',
    'kwitansi',
  ].includes(suratId);

  const [surat, setSurat] = useState(found || null);
  const [formData, setFormData] = useState({});
  const [pegawaiDB, setPegawaiDB] = useState([]);
  const [makDB, setMakDB] = useState([]);
  const [nomorSuratDB, setNomorSuratDB] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(!isSpbyHub);
  const [savedInstance, setSavedInstance] = useState(null);
  const [missingFieldInfo, setMissingFieldInfo] = useState(null);

  // Init Surat & Load DB
  useEffect(() => {
    const found = SURAT_REGISTRY.find((s) => s.id === suratId);
    if (!found) {
      alert('Surat tidak ditemukan!');
      navigate('/e-persuratan/persuratan');
      return;
    }
    setSurat(found);

    async function loadData() {
      const initial = {};
      found.variables?.forEach((v) => {
        if (v.source !== 'auto') {
          if (v.type === 'pegawai_multi' || v.type === 'detail_transaksi') {
            initial[v.key] = [];
          } else if (v.type === 'dynamic_list') {
            initial[v.key] = ['']; // Array string kosong pertama
          } else if (v.key === 'tempat_terbit') {
            initial[v.key] = 'Singaraja';
          } else if (v.type === 'date') {
            initial[v.key] = new Date().toISOString().split('T')[0];
          } else {
            initial[v.key] = v.default !== undefined ? v.default : '';
          }
        }
      });
      // Load formData from server
      let savedData = null;
      let assignedName = null;

      if (packId && itemId) {
        try {
          const itemRef = doc(db, 'lpj_packs', packId, 'surat_items', itemId);
          const docSnap = await getDoc(itemRef);
          if (docSnap.exists()) {
            savedData = docSnap.data().data || {};
            assignedName = docSnap.data().assigned_name;
          }

          // Bulletproof sync: If this is an SPD, always inherit the latest nomor_sp from SP
          if (found.id === 'surat-perjalanan-dinas') {
            const itemsRef = collection(db, 'lpj_packs', packId, 'surat_items');
            const spQuery = query(itemsRef, where('kode', '==', 'SP'));
            const spSnap = await getDocs(spQuery);
            if (!spSnap.empty) {
              const spData = spSnap.docs[0].data();
              if (spData.data && spData.data.nomor_sp) {
                if (!savedData) savedData = {};
                savedData.nomor_spd = spData.data.nomor_sp;
              }
            }
          }

          // SPBY sync: Inherit MAK from SPD, and pegawai_list from SP
          if (found.id === 'spby') {
            const itemsRef = collection(db, 'lpj_packs', packId, 'surat_items');

            // 1. Dapatkan daftar pegawai dari SP
            const spQuery = query(itemsRef, where('kode', '==', 'SP'));
            const spSnap = await getDocs(spQuery);
            if (!spSnap.empty) {
              const spData = spSnap.docs[0].data();
              if (spData.data) {
                if (!savedData) savedData = {};
                savedData.pegawai_list = spData.data.pegawai_list || [];
              }
            }

            // 2. Dapatkan Pembebanan Anggaran (MAK/Akun) dari SPD
            const spdQuery = query(itemsRef, where('kode', '==', 'SPD'));
            const spdSnap = await getDocs(spdQuery);
            if (!spdSnap.empty) {
              const spdData = spdSnap.docs[0].data();
              if (spdData.data && spdData.data.akun) {
                if (!savedData) savedData = {};
                if (!savedData.mak) savedData.mak = spdData.data.akun;
              }
            }
          }

          // Phase 2 Child sync: Inherit all fields from SPBY dynamically
          if (
            [
              'nota-dinas',
              'surat-perintah-bayar',
              'rincian-spby',
              'rincian-perjalanan-tugas',
              'sptjm-pelaksana',
              'nominatif',
              'kwitansi',
            ].includes(found.id)
          ) {
            const itemsRef = collection(db, 'lpj_packs', packId, 'surat_items');
            const spbyQuery = query(itemsRef, where('kode', '==', 'SPBY'));
            const spbySnap = await getDocs(spbyQuery);
            if (!spbySnap.empty) {
              const spbyData = spbySnap.docs[0].data();
              if (spbyData.data) {
                if (!savedData) savedData = {};
                Object.assign(savedData, spbyData.data);
              }
            }
          }
        } catch (err) {
          console.error('Gagal memuat data sebelumnya:', err);
        }
      }

      // Merge savedData over initial
      let finalData = { ...initial, ...(savedData || {}) };

      // --- Enforce DIPA in 'dasar' untuk LPJ ---
      if (packId && found.variables?.some((v) => v.key === 'dasar')) {
        const DIPA_STRING =
          'DIPA Kantor Imigrasi Kelas II TPI Buleleng, nomor: SP DIPA-137.03.2.692951/2026 tanggal 29 Desember 2025.';
        let arr = Array.isArray(finalData.dasar) ? finalData.dasar : [];
        if (!arr.includes(DIPA_STRING)) {
          if (arr.length === 1 && arr[0] === '') {
            arr = [DIPA_STRING];
          } else {
            arr.push(DIPA_STRING);
          }
        }
        finalData.dasar = arr;
      }

      // Load Pegawai DB if needed
      const hasPegawaiVar = found.variables?.some(
        (v) => v.type === 'pegawai' || v.type === 'pegawai_multi',
      );
      if (hasPegawaiVar) {
        try {
          const snap = await getDocs(collection(db, 'pegawai'));
          const pDB = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
          setPegawaiDB(pDB);

          const formatPegawai = (p) =>
            `${p.nama}\nNIP. ${p.nip || '-'}\nPangkat: ${p.pangkat || '-'}\nJabatan: ${p.jabatan || '-'}`;

          // Autofill PPK (Pejabat Pembuat Komitmen) if key exists and is empty
          if ('ppk' in finalData && !finalData.ppk) {
            const ppk = pDB.find((p) => p.status_khusus === 'PPK');
            if (ppk) finalData.ppk = formatPegawai(ppk);
          }
          if ('pejabat_ppk' in finalData && !finalData.pejabat_ppk) {
            const ppk = pDB.find((p) => p.status_khusus === 'PPK');
            if (ppk) finalData.pejabat_ppk = formatPegawai(ppk);
          }

          // Autofill Bendahara
          if ('bendahara' in finalData && !finalData.bendahara) {
            const bendahara = pDB.find(
              (p) =>
                p.status_khusus === 'Bendahara Pengeluaran' ||
                (p.status_khusus || '').toLowerCase().includes('bendahara'),
            );
            if (bendahara) finalData.bendahara = formatPegawai(bendahara);
          }

          // Autofill assigned employee for this SPD if key exists and is empty
          if ('pegawai' in finalData && !finalData.pegawai && assignedName) {
            const assignedPegawai = pDB.find((p) => p.nama === assignedName);
            if (assignedPegawai) finalData.pegawai = formatPegawai(assignedPegawai);
          }
        } catch (err) {
          console.error('Gagal load pegawai', err);
        }
      }

      // Load MAK DB if needed
      const hasMakVar = found.variables?.some((v) => v.type === 'mak');
      if (hasMakVar) {
        try {
          const makSnap = await getDocs(collection(db, 'MAK'));
          const mDB = makSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setMakDB(mDB);
        } catch (err) {
          console.error('Gagal load MAK', err);
        }
      }

      // Load Nomor Surat DB if needed
      const hasNomorVar = found.variables?.some((v) => v.type === 'nomor_surat');
      if (hasNomorVar) {
        try {
          const nomSnap = await getDocs(collection(db, 'nomor surat kanim'));
          const nDB = nomSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setNomorSuratDB(nDB);
        } catch (err) {
          console.error('Gagal load Nomor Surat', err);
        }
      }

      setFormData(finalData);
    }

    loadData();
  }, [suratId, navigate, packId, itemId]);

  // Auto-Save Effect (Debounced 1.5 detik)
  useEffect(() => {
    if (!packId || !itemId || !surat) return;
    if (Object.keys(formData).length === 0) return;

    setIsSaving(true);
    const timer = setTimeout(() => {
      const isComplete = !surat.variables
        ?.filter((v) => v.required && v.source !== 'auto')
        .some(
          (v) =>
            !formData[v.key] || (Array.isArray(formData[v.key]) && formData[v.key].length === 0),
        );

      const itemRef = doc(db, 'lpj_packs', packId, 'surat_items', itemId);
      updateDoc(itemRef, {
        data: formData,
        is_data_complete: isComplete,
        updated_at: serverTimestamp(),
      })
        .then(async () => {
          setIsSaving(false);
          // Sync SPD dinamik jika ini form SP (surat-perintah)
          if (surat.id === 'surat-perintah' && formData.pegawai_list) {
            syncSPDItems(packId, formData).catch((err) => console.error('Gagal sync SPD:', err));
          } else if (surat.id === 'surat-perjalanan-dinas') {
            syncOtherSPDsData(packId, itemId, formData, isComplete).catch((err) =>
              console.error('Gagal sync data SPD lain:', err),
            );
          }

          // Record MAK_History when SPBY is saved
          if (surat.id === 'spby' && Array.isArray(formData.detail_transaksi)) {
            try {
              const historyCollection = collection(db, 'MAK_History');

              // Clear previous history entries for this surat item
              const prevQuery = query(
                historyCollection,
                where('suratRef.packId', '==', packId),
                where('suratRef.suratItemId', '==', itemId),
              );
              const prevSnap = await getDocs(prevQuery);
              for (const prevDoc of prevSnap.docs) {
                await deleteDoc(prevDoc.ref);
              }

              // Record each detail_transaksi row that has an itemNodeId
              for (const row of formData.detail_transaksi) {
                if (row.itemNodeId && row.jumlah) {
                  const jumlah = Number(String(row.jumlah).replace(/[^0-9]/g, '')) || 0;
                  if (jumlah <= 0) continue;

                  const tanggal = formData.tanggal_spby || new Date().toISOString().split('T')[0];
                  const dateObj = new Date(tanggal);

                  await addDoc(historyCollection, {
                    makNodeId: row.itemNodeId,
                    akunNodeId: row.akunNodeId || '',
                    tahunNodeId: row.tahunNodeId || '',
                    makString: formData.mak || '',
                    itemKode: row.itemKode || '',
                    itemName: row.itemName || row.detail || '',
                    jumlah: jumlah,
                    tanggal: tanggal,
                    bulan: dateObj.getMonth() + 1,
                    tahun: dateObj.getFullYear(),
                    suratRef: {
                      packId: packId,
                      suratItemId: itemId,
                      kode: 'SPBY',
                      pegawai: row.pegawai || '',
                    },
                    uraian: row.uraian || '',
                    createdAt: new Date().toISOString(),
                    createdBy: currentUser?.uid || '',
                    status: 'active',
                  });
                }
              }
            } catch (err) {
              console.error('Gagal record MAK_History:', err);
            }
          }
        })
        .catch((err) => {
          console.error('Autosave gagal', err);
          setIsSaving(false);
        });
    }, 1500);

    return () => clearTimeout(timer);
  }, [formData, packId, itemId, surat]);

  if (!surat) return <div className="p-8">Loading...</div>;

  const handleSave = async (force = false) => {
    if (!force) {
      const missing = surat.variables
        ?.filter((v) => v.required && v.source !== 'auto')
        .find(
          (v) =>
            !formData[v.key] || (Array.isArray(formData[v.key]) && formData[v.key].length === 0),
        );

      if (missing) {
        setMissingFieldInfo(missing);
        return;
      }
    }

    setMissingFieldInfo(null);
    setIsSubmitting(true);
    try {
      let instanceId;
      const instanceData = {
        surat_id: surat.id,
        surat_kode: surat.kode,
        surat_nama: surat.nama,
        data: formData,
        status: 'draft',
        created_by: currentUser?.uid,
        created_by_nama: currentUser?.displayName || currentUser?.email || 'User',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'surat_instances'), instanceData);
      instanceId = docRef.id;

      if (packId && itemId) {
        const isComplete = !surat.variables
          ?.filter((v) => v.required && v.source !== 'auto')
          .some(
            (v) =>
              !formData[v.key] || (Array.isArray(formData[v.key]) && formData[v.key].length === 0),
          );

        const itemRef = doc(db, 'lpj_packs', packId, 'surat_items', itemId);
        await updateDoc(itemRef, {
          data: formData,
          instance_id: instanceId,
          is_data_complete: isComplete,
          updated_at: serverTimestamp(),
        });

        if (surat.id === 'surat-perintah' && formData.pegawai_list) {
          await syncSPDItems(packId, formData);
        } else if (surat.id === 'surat-perjalanan-dinas') {
          await syncOtherSPDsData(packId, itemId, formData, isComplete);
        }
      }

      setIsSubmitting(false);

      if (force && packId) {
        navigate(`/e-persuratan/lpj/${packId}`);
      } else if (force) {
        navigate('/e-persuratan/persuratan');
      } else {
        setSavedInstance({ id: instanceId, ...formData });
      }
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan surat!');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Custom Warning Modal */}
      {missingFieldInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 overflow-hidden transform transition-all">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center shrink-0 shadow-inner">
                <svg
                  className="w-7 h-7 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
                  Isian Belum Lengkap
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Terdapat form yang masih kosong.
                </p>
              </div>
            </div>

            <div className="mb-6 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Bagian{' '}
                <strong className="text-indigo-600 font-bold">"{missingFieldInfo.label}"</strong>{' '}
                belum Anda isi.
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-2">
                Pilih{' '}
                <strong className="text-slate-800 dark:text-slate-100">Lanjutkan Isi Form</strong>{' '}
                untuk melengkapinya, atau{' '}
                <strong className="text-slate-800 dark:text-slate-100">Simpan & Kembali</strong>{' '}
                untuk menyimpan apa adanya dan kembali ke halaman LPJ.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setMissingFieldInfo(null)}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 rounded-xl transition-colors"
              >
                Lanjutkan Isi Form
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={isSubmitting}
                className="px-6 py-2.5 flex items-center gap-2 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {isSubmitting ? <FaSpinner className="animate-spin" /> : null}
                Simpan & Kembali
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Baru (Mockup) */}
      <div className="bg-white dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-800 px-8 py-6 z-20 shrink-0 print:hidden flex flex-col items-center">
        <div className="w-full max-w-6xl">
          <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                  {packId
                    ? surat.id === 'spby'
                      ? 'Buat LPJ & SPBy'
                      : 'Buat LPJ Perjadin'
                    : surat.nama}
                </h1>
                <span className="bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-full text-[10px] tracking-wider uppercase">
                  Draft
                </span>
              </div>
              {packId && (
                <p className="text-sm text-slate-400 mt-1">
                  Laporan Pertanggungjawaban Perjalanan Dinas
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              {isSaving && (
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-500 mr-2 animate-pulse">
                  <FaSpinner className="animate-spin" /> Menyimpan...
                </span>
              )}

              {!savedInstance ? (
                <button
                  onClick={() => handleSave(false)}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-indigo-900/20 disabled:opacity-50"
                >
                  {isSubmitting ? <FaSpinner className="animate-spin" /> : <FaSave />}
                  Simpan Draft
                </button>
              ) : (
                <button
                  onClick={() =>
                    packId
                      ? navigate(`/e-persuratan/lpj/${packId}`)
                      : navigate('/e-persuratan/persuratan')
                  }
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-500 hover:text-emerald-700 dark:hover:text-white border border-emerald-200 dark:border-emerald-500/20 text-sm font-bold rounded-xl transition-all"
                >
                  <FaCheckCircle /> {packId ? 'Kembali ke LPJ' : 'Selesai'}
                </button>
              )}
              <button
                onClick={() =>
                  packId
                    ? navigate(`/e-persuratan/lpj/${packId}`)
                    : navigate('/e-persuratan/persuratan')
                }
                className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-500 hover:text-rose-700 dark:hover:text-white text-sm font-bold rounded-xl transition-colors"
              >
                <FaTimes /> Batal
              </button>
            </div>
          </div>

          {/* Stepper (Only in LPJ mode) */}
          {packId && (
            <div className="flex items-center gap-2 mt-6">
              <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-4 py-2 rounded-xl">
                <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-[11px] font-bold text-white">
                  1
                </div>
                <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400">
                  Isi Form
                </span>
              </div>
              <div className="w-8 h-px bg-slate-300 dark:bg-slate-700"></div>
              <div className="flex items-center gap-3 px-4 py-2">
                <div className="w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-[11px] font-bold text-slate-500 border border-slate-300 dark:border-slate-700">
                  2
                </div>
                <span className="text-sm font-bold text-slate-500">Pratinjau PDF</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden bg-slate-50 dark:bg-[#0f172a] relative">
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
          <div className="max-w-4xl mx-auto">
            {packId ? (
              <div className="space-y-8">
                {(() => {
                  // 1. Group variables
                  const groups = [];
                  let currentGroup = { title: 'Surat Perintah', fields: [] };

                  surat.variables.forEach((v) => {
                    if (v.source === 'auto') return;
                    if (packId && v.label.includes('Nomor Surat Perintah')) return;

                    if (v.label.includes('Kepada') || v.label.includes('Pegawai yang Ditugaskan')) {
                      if (currentGroup.fields.length > 0) groups.push(currentGroup);
                      currentGroup = { title: 'Pegawai yang Ditugaskan', fields: [] };
                    } else if (
                      v.label.includes('Pejabat') ||
                      v.label.includes('Tanggal') ||
                      v.label.includes('Tempat')
                    ) {
                      if (currentGroup.title !== 'Penandatangan Dokumen') {
                        if (currentGroup.fields.length > 0) groups.push(currentGroup);
                        currentGroup = { title: 'Penandatangan Dokumen', fields: [] };
                      }
                    }
                    currentGroup.fields.push(v);
                  });
                  if (currentGroup.fields.length > 0) groups.push(currentGroup);

                  // 2. renderField helper
                  const renderField = (v) => {
                    return (
                      <div
                        key={v.key}
                        className="mb-6 last:mb-0 p-5 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-700/50 rounded-2xl"
                      >
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5 uppercase tracking-wide">
                          {packId
                            ? v.label === 'Pejabat Penandatangan'
                              ? 'Pejabat Penandatangan (KPA/PLt/PLh)'
                              : v.label.split(' (')[0]
                            : v.label}{' '}
                          {v.required && <span className="text-rose-500">*</span>}
                        </label>

                        {packId && v.label.includes('Penandatangan') && (
                          <div className="flex items-center gap-3 mb-4">
                            {['Kepala', 'Kepala PLT', 'Kepala PLH'].map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, _kpaToggle: t });
                                }}
                                className={`px-5 py-2 rounded-xl text-xs font-bold transition-colors border ${
                                  formData._kpaToggle === t
                                    ? 'bg-indigo-50 dark:bg-[#172554]/80 text-indigo-700 dark:text-blue-100 border-indigo-200 dark:border-blue-900 shadow-sm dark:shadow-inner'
                                    : 'bg-white dark:bg-transparent text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm dark:shadow-none'
                                }`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        )}

                        {v.type === 'text' && (
                          <input
                            type="text"
                            value={formData[v.key] || ''}
                            onChange={(e) => setFormData({ ...formData, [v.key]: e.target.value })}
                            className={`w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-colors ${packId ? 'bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 focus:border-indigo-500/50 dark:focus:border-indigo-500/50 hover:border-slate-300 dark:hover:border-slate-600/80 shadow-sm dark:shadow-inner focus:ring-2 focus:ring-indigo-500/10 dark:focus:ring-0' : 'bg-slate-50 border border-slate-200 text-slate-800 focus:ring-2 focus:ring-slate-800'}`}
                            placeholder={`Masukkan ${v.label.toLowerCase()}...`}
                          />
                        )}

                        {v.type === 'select' && (
                          <select
                            value={formData[v.key] || ''}
                            onChange={(e) => setFormData({ ...formData, [v.key]: e.target.value })}
                            className={`w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-colors ${packId ? 'bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 focus:border-indigo-500/50 dark:focus:border-indigo-500/50 hover:border-slate-300 dark:hover:border-slate-600/80 shadow-sm dark:shadow-inner focus:ring-2 focus:ring-indigo-500/10 dark:focus:ring-0' : 'bg-slate-50 border border-slate-200 text-slate-800 focus:ring-2 focus:ring-slate-800'}`}
                          >
                            <option value="">-- Pilih {v.label} --</option>
                            {v.options?.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        )}

                        {v.type === 'textarea' && (
                          <div>
                            {packId && (v.label.includes('Untuk') || v.label.includes('Maksud')) ? (
                              <div className="space-y-3 mt-2">
                                {/* Poin 1 (Editable) */}
                                <div className="flex gap-3 items-start">
                                  <div className="w-8 h-8 mt-1 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50 shadow-sm dark:shadow-inner">
                                    1
                                  </div>
                                  <textarea
                                    rows={2}
                                    value={formData[v.key] || ''}
                                    onChange={(e) =>
                                      setFormData({ ...formData, [v.key]: e.target.value })
                                    }
                                    className="flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-colors resize-y overflow-hidden leading-relaxed min-h-[44px] bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 focus:border-indigo-500/50 dark:focus:border-indigo-500/50 hover:border-slate-300 dark:hover:border-slate-600/80 shadow-sm dark:shadow-inner focus:ring-2 focus:ring-indigo-500/10 dark:focus:ring-0"
                                    placeholder="Masukkan detail kegiatan poin 1..."
                                    onInput={(e) => {
                                      e.target.style.height = 'auto';
                                      e.target.style.height = e.target.scrollHeight + 'px';
                                    }}
                                  />
                                </div>

                                {/* Poin 2-4 (Visual/Mock only) */}
                                {[
                                  'Selama Melaksanakan kegiatan tersebut, yang bersangkutan dibebaskan dari tugas dinas sehari-hari;',
                                  'Surat tugas ini berlaku sampai dengan selesainya kegiatan; dan',
                                  'Melaporkan hasil kegiatan tesebut kepada Kepala Kantor Imigrasi Kelas II TPI Buleleng.',
                                ].map((txt, i) => (
                                  <div key={i} className="flex gap-3 items-start">
                                    <div className="w-8 h-8 mt-1 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50 shadow-sm dark:shadow-inner">
                                      {i + 2}
                                    </div>
                                    <div className="flex-1 px-4 py-3 rounded-xl text-sm leading-relaxed bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 text-slate-500 cursor-not-allowed select-none">
                                      {txt}
                                    </div>
                                  </div>
                                ))}

                                <p className="text-[11px] text-slate-500 mt-4 ml-1 font-medium">
                                  Poin 2—4 sudah baku, cukup isi poin 1
                                </p>
                              </div>
                            ) : (
                              <textarea
                                rows={3}
                                value={formData[v.key] || ''}
                                onChange={(e) =>
                                  setFormData({ ...formData, [v.key]: e.target.value })
                                }
                                className={`w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-colors resize-y ${packId ? 'bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 focus:border-indigo-500/50 dark:focus:border-indigo-500/50 hover:border-slate-300 dark:hover:border-slate-600/80 shadow-sm dark:shadow-inner focus:ring-2 focus:ring-indigo-500/10 dark:focus:ring-0' : 'bg-slate-50 border border-slate-200 text-slate-800 focus:ring-2 focus:ring-slate-800'}`}
                                placeholder={`Masukkan ${v.label.toLowerCase()}...`}
                              />
                            )}
                          </div>
                        )}

                        {v.type === 'dynamic_list' && (
                          <div className="space-y-3">
                            {(Array.isArray(formData[v.key])
                              ? formData[v.key]
                              : [formData[v.key] || '']
                            ).map((item, index, arr) => {
                              const isLockedDasar =
                                packId &&
                                v.key === 'dasar' &&
                                (item.includes('DIPA') ||
                                  (index === arr.length - 1 &&
                                    arr.length > 0 &&
                                    arr[arr.length - 1].includes('DIPA')));
                              return (
                                <div key={index} className="flex gap-3 items-start">
                                  <div
                                    className={`w-8 h-8 mt-1 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors ${packId ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50 shadow-sm dark:shadow-inner' : 'bg-slate-200 text-slate-500'}`}
                                  >
                                    {index + 1}
                                  </div>
                                  <textarea
                                    value={item}
                                    disabled={isLockedDasar}
                                    onChange={(e) => {
                                      const newArr = Array.isArray(formData[v.key])
                                        ? [...formData[v.key]]
                                        : [formData[v.key] || ''];
                                      newArr[index] = e.target.value;
                                      setFormData({ ...formData, [v.key]: newArr });
                                    }}
                                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-colors resize-y overflow-hidden leading-relaxed min-h-[44px] ${
                                      packId
                                        ? isLockedDasar
                                          ? 'bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 text-slate-500 cursor-not-allowed'
                                          : 'bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 focus:border-indigo-500/50 dark:focus:border-indigo-500/50 hover:border-slate-300 dark:hover:border-slate-600/80 shadow-sm dark:shadow-inner focus:ring-2 focus:ring-indigo-500/10 dark:focus:ring-0'
                                        : 'bg-slate-50 border border-slate-200 text-slate-800 focus:ring-2 focus:ring-slate-800'
                                    }`}
                                    placeholder={`Poin ${index + 1}...`}
                                    onInput={(e) => {
                                      e.target.style.height = 'auto';
                                      e.target.style.height = e.target.scrollHeight + 'px';
                                    }}
                                  />
                                  {isLockedDasar ? (
                                    <div
                                      className={`p-2.5 mt-1 shrink-0 rounded-xl border flex items-center justify-center w-11 h-11 ${packId ? 'border-slate-200 dark:border-slate-800/80 text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-slate-900/30' : 'border-slate-200 text-slate-400'}`}
                                    >
                                      <FaLock className="text-sm" />
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        const newArr = Array.isArray(formData[v.key])
                                          ? [...formData[v.key]]
                                          : [formData[v.key] || ''];
                                        newArr.splice(index, 1);
                                        setFormData({ ...formData, [v.key]: newArr });
                                      }}
                                      className={`p-2.5 mt-1 shrink-0 rounded-xl transition-all border flex items-center justify-center w-11 h-11 ${
                                        packId
                                          ? 'border-rose-200 dark:border-rose-900/30 text-rose-500 dark:text-rose-500/70 hover:bg-rose-50 dark:hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-500/40'
                                          : 'border-rose-200 text-rose-500 hover:bg-rose-50'
                                      }`}
                                      title="Hapus Poin"
                                    >
                                      <FaTrashAlt className="text-sm" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                            <div>
                              <button
                                onClick={() => {
                                  const newArr = Array.isArray(formData[v.key])
                                    ? [...formData[v.key]]
                                    : [formData[v.key] || ''];

                                  if (
                                    packId &&
                                    v.key === 'dasar' &&
                                    newArr.length > 0 &&
                                    newArr[newArr.length - 1].includes('DIPA')
                                  ) {
                                    newArr.splice(newArr.length - 1, 0, ''); // Sisipkan SEBELUM DIPA
                                  } else {
                                    newArr.push('');
                                  }

                                  setFormData({ ...formData, [v.key]: newArr });
                                }}
                                className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 border w-max mt-2 ${
                                  packId
                                    ? 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:text-slate-800 dark:hover:text-slate-200 shadow-sm dark:shadow-none'
                                    : 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
                                }`}
                              >
                                + Tambah Baris
                              </button>
                              {packId && v.key === 'dasar' && (
                                <p className="text-[11px] text-slate-500 mt-3 font-medium">
                                  Tambah baris sesuai kebutuhan — DIPA otomatis menjadi dasar
                                  terakhir
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {v.type === 'date' && (
                          <input
                            type="date"
                            value={formData[v.key] || ''}
                            onChange={(e) => setFormData({ ...formData, [v.key]: e.target.value })}
                            className={`w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-colors ${packId ? 'bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 focus:border-indigo-500/50 dark:focus:border-indigo-500/50 hover:border-slate-300 dark:hover:border-slate-600/80 shadow-sm dark:shadow-inner focus:ring-2 focus:ring-indigo-500/10 dark:focus:ring-0' : 'bg-slate-50 border border-slate-200 text-slate-800 focus:ring-2 focus:ring-slate-800'}`}
                          />
                        )}

                        {v.type === 'number' && (
                          <input
                            type="number"
                            value={formData[v.key] || ''}
                            onChange={(e) => setFormData({ ...formData, [v.key]: e.target.value })}
                            className={`w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-colors ${packId ? 'bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 focus:border-indigo-500/50 dark:focus:border-indigo-500/50 hover:border-slate-300 dark:hover:border-slate-600/80 shadow-sm dark:shadow-inner focus:ring-2 focus:ring-indigo-500/10 dark:focus:ring-0' : 'bg-slate-50 border border-slate-200 text-slate-800 focus:ring-2 focus:ring-slate-800'}`}
                            placeholder="0"
                          />
                        )}

                        {v.type === 'pegawai' && (
                          <PegawaiSearch
                            pegawaiDB={pegawaiDB}
                            multi={false}
                            value={formData[v.key]}
                            onChange={(val) => setFormData({ ...formData, [v.key]: val })}
                            placeholder={`Cari nama ${v.label.toLowerCase()}...`}
                            disabled={v.readonly}
                          />
                        )}

                        {v.type === 'pegawai_multi' && (
                          <PegawaiSearch
                            pegawaiDB={pegawaiDB}
                            multi={true}
                            value={formData[v.key] || []}
                            onChange={(val) => setFormData({ ...formData, [v.key]: val })}
                            placeholder={`Cari dan tambah ${v.label.toLowerCase()}...`}
                            disabled={v.readonly}
                          />
                        )}

                        {v.type === 'mak' && (
                          <MakSearch
                            makDB={makDB}
                            value={formData[v.key]}
                            onChange={(val, meta) =>
                              setFormData({ ...formData, [v.key]: val, ...(meta || {}) })
                            }
                            placeholder={`Cari ${v.label.toLowerCase()}...`}
                            disabled={v.readonly}
                          />
                        )}

                        {v.type === 'detail_transaksi' && (
                          <DetailTransaksi
                            value={formData[v.key]}
                            onChange={(val) => setFormData({ ...formData, [v.key]: val })}
                            pegawaiList={formData.pegawai_list || []}
                            disabled={v.readonly}
                            isSaved={!!savedInstance}
                            makDB={makDB}
                            akunNodeId={formData._akunNodeId || ''}
                            tahunNodeId={formData._tahunNodeId || ''}
                            makString={formData.mak || ''}
                          />
                        )}

                        {v.type === 'nomor_surat' && (
                          <NomorSuratSearch
                            nomorSuratDB={nomorSuratDB}
                            value={formData[v.key]}
                            onChange={(val) => setFormData({ ...formData, [v.key]: val })}
                            disabled={v.readonly}
                            formData={formData}
                          />
                        )}
                      </div>
                    );
                  };

                  return groups.map((g, i) => (
                    <div
                      key={i}
                      className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-600/70 shadow-sm dark:shadow-lg rounded-3xl p-8 backdrop-blur-xl mb-8 last:mb-0"
                    >
                      <h2 className="text-lg font-black text-slate-800 dark:text-white mb-6 uppercase tracking-wider flex items-center gap-3">
                        <span className="w-2 h-6 bg-indigo-500 rounded-full"></span>
                        {g.title}
                      </h2>
                      <div>{g.fields.map((v) => renderField(v))}</div>
                    </div>
                  ));
                })()}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-8 border-b border-slate-100 dark:border-slate-700/50 pb-6">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center font-bold">
                    {surat.kode}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      {surat.nama}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Lengkapi form di bawah untuk membuat draf surat
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  {surat.variables?.map((v) => {
                    if (v.source === 'auto') return null;

                    return (
                      <div key={v.key}>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5 uppercase tracking-wide">
                          {v.label} {v.required && <span className="text-rose-500">*</span>}
                        </label>

                        {v.type === 'text' && (
                          <input
                            type="text"
                            value={formData[v.key] || ''}
                            onChange={(e) => setFormData({ ...formData, [v.key]: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                            placeholder={`Masukkan ${v.label.toLowerCase()}...`}
                          />
                        )}

                        {v.type === 'select' && (
                          <select
                            value={formData[v.key] || ''}
                            onChange={(e) => setFormData({ ...formData, [v.key]: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                          >
                            <option value="">-- Pilih {v.label} --</option>
                            {v.options?.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        )}

                        {v.type === 'textarea' && (
                          <textarea
                            rows={3}
                            value={formData[v.key] || ''}
                            onChange={(e) => setFormData({ ...formData, [v.key]: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-colors resize-y"
                            placeholder={`Masukkan ${v.label.toLowerCase()}...`}
                          />
                        )}

                        {v.type === 'dynamic_list' && (
                          <div className="space-y-2">
                            {(Array.isArray(formData[v.key])
                              ? formData[v.key]
                              : [formData[v.key] || '']
                            ).map((item, index) => (
                              <div key={index} className="flex gap-2">
                                <input
                                  type="text"
                                  value={item}
                                  onChange={(e) => {
                                    const newArr = Array.isArray(formData[v.key])
                                      ? [...formData[v.key]]
                                      : [formData[v.key] || ''];
                                    newArr[index] = e.target.value;
                                    setFormData({ ...formData, [v.key]: newArr });
                                  }}
                                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                                  placeholder={`Item ${index + 1}`}
                                />
                                <button
                                  onClick={() => {
                                    const newArr = Array.isArray(formData[v.key])
                                      ? [...formData[v.key]]
                                      : [formData[v.key] || ''];
                                    newArr.splice(index, 1);
                                    setFormData({ ...formData, [v.key]: newArr });
                                  }}
                                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                                >
                                  <FaTimes />
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => {
                                const newArr = Array.isArray(formData[v.key])
                                  ? [...formData[v.key]]
                                  : [formData[v.key] || ''];
                                newArr.push('');
                                setFormData({ ...formData, [v.key]: newArr });
                              }}
                              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1"
                            >
                              + Tambah Item
                            </button>
                          </div>
                        )}

                        {v.type === 'date' && (
                          <input
                            type="date"
                            value={formData[v.key] || ''}
                            onChange={(e) => setFormData({ ...formData, [v.key]: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                          />
                        )}

                        {v.type === 'number' && (
                          <input
                            type="number"
                            value={formData[v.key] || ''}
                            onChange={(e) => setFormData({ ...formData, [v.key]: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                            placeholder="0"
                          />
                        )}

                        {v.type === 'pegawai' && (
                          <PegawaiSearch
                            pegawaiDB={pegawaiDB}
                            multi={false}
                            value={formData[v.key]}
                            onChange={(val) => setFormData({ ...formData, [v.key]: val })}
                            placeholder={`Cari ${v.label.toLowerCase()}...`}
                            disabled={v.readonly}
                          />
                        )}

                        {v.type === 'pegawai_multi' && (
                          <PegawaiSearch
                            pegawaiDB={pegawaiDB}
                            multi={true}
                            value={formData[v.key] || []}
                            onChange={(val) => setFormData({ ...formData, [v.key]: val })}
                            placeholder={`Cari ${v.label.toLowerCase()}...`}
                            disabled={v.readonly}
                          />
                        )}

                        {v.type === 'mak' && (
                          <MakSearch
                            makDB={makDB}
                            value={formData[v.key]}
                            onChange={(val, meta) =>
                              setFormData({ ...formData, [v.key]: val, ...(meta || {}) })
                            }
                            placeholder={`Cari ${v.label.toLowerCase()}...`}
                            disabled={v.readonly}
                          />
                        )}

                        {v.type === 'detail_transaksi' && (
                          <DetailTransaksi
                            value={formData[v.key]}
                            onChange={(val) => setFormData({ ...formData, [v.key]: val })}
                            pegawaiList={formData.pegawai_list || []}
                            disabled={v.readonly}
                            isSaved={!!savedInstance}
                            makDB={makDB}
                            akunNodeId={formData._akunNodeId || ''}
                            tahunNodeId={formData._tahunNodeId || ''}
                            makString={formData.mak || ''}
                          />
                        )}

                        {v.type === 'nomor_surat' && (
                          <NomorSuratSearch
                            nomorSuratDB={nomorSuratDB}
                            value={formData[v.key]}
                            onChange={(val) => setFormData({ ...formData, [v.key]: val })}
                            disabled={v.readonly}
                            formData={formData}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub Komponen: Search Pegawai ──────────────────────────────────────────

function PegawaiSearch({ pegawaiDB, multi, value, onChange, placeholder, disabled }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Format baku penyimpanan string pegawai:
  const formatPegawai = (p) =>
    `${p.nama}\nNIP. ${p.nip || '-'}\nPangkat: ${p.pangkat || '-'}\nJabatan: ${p.jabatan || '-'}`;

  // Mem-parsing kembali nama untuk ditampilkan di badge
  const extractNama = (str) => str.split('\n')[0];

  const filtered = pegawaiDB.filter(
    (p) => p.nama?.toLowerCase().includes(query.toLowerCase()) || p.nip?.includes(query),
  );

  const handleSelect = (p) => {
    if (disabled) return;
    const val = formatPegawai(p);
    if (multi) {
      if (!value.includes(val)) {
        onChange([...value, val]);
      }
    } else {
      onChange(val);
    }
    setQuery('');
    setIsOpen(false);
  };

  const handleRemove = (valToRemove) => {
    if (disabled) return;
    if (multi) {
      onChange(value.filter((v) => v !== valToRemove));
    } else {
      onChange('');
    }
  };

  return (
    <div className="relative w-full">
      {/* Jika Single dan sudah ada value, tampilkan state terpilih, bukan input text */}
      {!multi && value ? (
        <div
          className={`flex items-center justify-between w-full px-4 py-3 border rounded-xl text-sm ${disabled ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400' : 'bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 shadow-inner'}`}
        >
          <div className="font-semibold">{extractNama(value)}</div>
          {!disabled && (
            <button
              onClick={() => handleRemove()}
              className="text-slate-400 hover:text-rose-500 p-1"
            >
              <FaTimes size={14} />
            </button>
          )}
        </div>
      ) : (
        /* Input Search */
        <div className="relative">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
          <input
            type="text"
            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm focus:outline-none text-slate-800 dark:text-slate-100 focus:border-indigo-500/50 hover:border-slate-600/80 shadow-inner transition-colors disabled:opacity-50 disabled:bg-slate-100 dark:bg-slate-800/50 disabled:cursor-not-allowed"
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 200)}
            disabled={disabled}
          />
        </div>
      )}

      {/* Helper text for multi */}
      {multi && !disabled && (
        <p className="text-[11px] text-slate-500 mt-2 ml-1">Bisa memilih lebih dari satu pegawai</p>
      )}

      {/* Area Tampilan yang sudah dipilih (Table-like Cards) */}
      {multi && value.length > 0 && (
        <div className="flex flex-col gap-2 mt-4">
          {value.map((v, i) => {
            const parts = v.split('\n');
            const parsedNama = parts[0];
            const parsedNip = parts[1]?.replace('NIP. ', '') || '-';
            const parsedPangkat = parts[2]?.replace('Pangkat: ', '') || '-';
            const parsedJabatan = parts[3]?.replace('Jabatan: ', '') || '-';

            return (
              <div
                key={i}
                className="group relative flex flex-col md:flex-row md:items-center justify-between p-4 bg-white dark:bg-[#111827]/40 border border-slate-200 dark:border-slate-700/80 rounded-xl hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full pr-8">
                  <div>
                    <div className="text-[10px] text-slate-500 mb-0.5">Nama</div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {parsedNama}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 mb-0.5">NIP</div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {parsedNip}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 mb-0.5">Pangkat/Gol</div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {parsedPangkat}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 mb-0.5">Jabatan</div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                      {parsedJabatan}
                    </div>
                  </div>
                </div>
                {!disabled && (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleRemove(v);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 shrink-0 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors opacity-100 md:opacity-0 group-hover:opacity-100"
                    title="Hapus Pegawai"
                  >
                    <FaTrashAlt className="text-sm" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dropdown Hasil Pencarian */}
      {isOpen && query && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.map((p) => (
              <button
                key={p.uid}
                type="button"
                onMouseDown={() => handleSelect(p)}
                className="w-full text-left px-4 py-3 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors last:border-0"
              >
                <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">{p.nama}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {p.nip || '-'} • {p.jabatan || '-'}
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-center">
              Pegawai tidak ditemukan.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MakSearch({ makDB, value, onChange, placeholder, disabled }) {
  const hierarchy = [
    'Tahun',
    'Program',
    'Kegiatan',
    'KRO',
    'Output',
    'Komponen',
    'Sub Komponen',
    'Akun',
  ];
  const [selections, setSelections] = useState({});

  const handleClear = () => {
    if (disabled) return;
    onChange('');
    setSelections({});
  };

  const handleSelectChange = (levelIndex, nodeId) => {
    const newSelections = { ...selections };
    newSelections[levelIndex] = nodeId;
    // Clear all subsequent levels
    for (let i = levelIndex + 1; i < hierarchy.length; i++) {
      delete newSelections[i];
    }
    setSelections(newSelections);

    // If this is the final level (Akun) and a valid node is selected
    if (levelIndex === hierarchy.length - 1 && nodeId) {
      const akunNode = makDB.find((n) => n.id === nodeId);
      if (akunNode) {
        // Build full string
        const parts = [];
        let curr = akunNode;
        while (curr) {
          if (curr.kode) parts.unshift(curr.kode);
          curr = makDB.find((n) => n.id === curr.parentId);
        }
        // Find tahun node (root)
        const tahunNodeId = newSelections[0] || null;
        onChange(parts.join(' '), { _akunNodeId: nodeId, _tahunNodeId: tahunNodeId });
      }
    }
  };

  if (value) {
    return (
      <div
        className={`flex items-center justify-between w-full px-4 py-3 border rounded-xl text-sm shadow-sm ${disabled ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400' : 'bg-indigo-50 border-indigo-200 text-indigo-800'}`}
      >
        <div className="font-semibold leading-relaxed">{value}</div>
        {!disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="text-slate-400 hover:text-rose-600 p-1 shrink-0 ml-2 bg-white dark:bg-slate-800 rounded-full shadow-sm"
          >
            <FaTimes size={12} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
        Silakan pilih secara berurutan sesuai struktur MAK:
      </div>
      {hierarchy.map((type, idx) => {
        // Only show this level if the previous level is selected (or if it's the first level)
        if (idx > 0 && !selections[idx - 1]) return null;

        const parentId = idx === 0 ? null : selections[idx - 1];
        // Filter nodes for this level. For idx > 0, just get children of parentId.
        const options = makDB.filter((n) => {
          if (idx === 0)
            return (
              n.parentId === null &&
              (n.type === type || n.type?.toUpperCase() === type.toUpperCase())
            );
          return n.parentId === parentId;
        });

        if (options.length === 0 && parentId) {
          return (
            <div key={type} className="text-xs text-rose-500 italic">
              Data {type} tidak tersedia untuk hirarki ini.
            </div>
          );
        }

        return (
          <div key={type} className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 ml-1">
              {idx + 1}. {type}
            </label>
            <select
              value={selections[idx] || ''}
              onChange={(e) => handleSelectChange(idx, e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 transition-colors shadow-sm disabled:opacity-50"
            >
              <option value="">-- Pilih {type} --</option>
              {options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.kode ? `${opt.kode} - ` : ''}
                  {opt.name}
                </option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}

// --- Sub Komponen: Search Nomor Surat ----------------------------------

function NomorSuratSearch({ nomorSuratDB, value, onChange, disabled, formData }) {
  const hierarchy = ['KOP', 'Kode surat 1', 'Kode surat 2', 'Kode surat 3'];
  const [selections, setSelections] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateSuccess, setGenerateSuccess] = useState(false);
  const [customValue, setCustomValue] = useState(value || '');

  // Keep customValue in sync with value if it changes externally
  useEffect(() => {
    setCustomValue(value || '');
  }, [value]);

  const handleClear = () => {
    if (disabled) return;
    onChange('');
    setCustomValue('');
    setSelections({});
  };

  const handleSelectChange = (levelIndex, nodeId) => {
    const newSelections = { ...selections };
    newSelections[levelIndex] = nodeId;
    for (let i = levelIndex + 1; i < hierarchy.length; i++) {
      delete newSelections[i];
    }
    setSelections(newSelections);
  };

  const handleGenerate = async () => {
    if (disabled || isGenerating) return;

    // Ensure all levels are selected
    if (Object.keys(selections).length !== hierarchy.length) {
      alert('Harap pilih semua tingkatan kode surat terlebih dahulu.');
      return;
    }

    setIsGenerating(true);
    try {
      // 1. Build prefix
      const parts = [];
      for (let i = 0; i < hierarchy.length; i++) {
        const nodeId = selections[i];
        const node = nomorSuratDB.find((n) => n.id === nodeId);
        if (node && node.kode) parts.push(node.kode);
      }
      const prefix = parts.join('.');

      // 2. Transaction to get and increment lastNumber
      const settingsRef = doc(db, 'settings', 'nomor_surat');
      let newNumber = 1;

      await runTransaction(db, async (transaction) => {
        const settingsDoc = await transaction.get(settingsRef);
        if (!settingsDoc.exists()) {
          transaction.set(settingsRef, { lastNumber: 1 });
        } else {
          newNumber = (settingsDoc.data().lastNumber || 0) + 1;
          transaction.update(settingsRef, { lastNumber: newNumber });
        }
      });

      // 3. Format final string
      const formattedNumber = `${prefix}-${String(newNumber).padStart(4, '0')}`;

      // 4. Save to history (surat_dokumen)
      let kepadaName = '-';
      if (Array.isArray(formData.pegawai_list) && formData.pegawai_list.length > 0) {
        kepadaName = formData.pegawai_list[0].split('\n')[0];
      } else if (typeof formData.pegawai_list === 'string' && formData.pegawai_list) {
        kepadaName = formData.pegawai_list.split('\n')[0];
      }

      await addDoc(collection(db, 'surat_dokumen'), {
        nomor: formattedNumber,
        tanggal: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        templateNama: 'Surat Perintah (LPJ)',
        untuk: [formData.maksud || formData.kegiatan_poin_1 || 'Perjalanan Dinas'],
        kepada: [{ nama: kepadaName }],
      });

      // 5. Update form state
      onChange(formattedNumber);
      setCustomValue(formattedNumber);
      // alert(`Nomor surat berhasil di-generate: ${formattedNumber}`);
      setGenerateSuccess(true);
      setTimeout(() => setGenerateSuccess(false), 3000);
    } catch (err) {
      console.error('Error generating nomor surat', err);
      alert('Gagal meng-generate nomor surat.');
    } finally {
      setIsGenerating(false);
    }
  };

  const isAllSelected = Object.keys(selections).length === hierarchy.length;

  return (
    <div className="flex flex-col gap-3 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
          Pengaturan Nomor Surat:
        </div>
        {generateSuccess && (
          <span className="text-[10px] font-bold text-emerald-600 animate-pulse">
            Berhasil di-generate!
          </span>
        )}
      </div>

      {/* Jika sudah ada value, tampilkan input text (bisa diedit manual jika perlu) */}
      <div className="flex gap-2">
        <input
          type="text"
          value={customValue}
          onChange={(e) => {
            setCustomValue(e.target.value);
            onChange(e.target.value);
          }}
          placeholder="Atau ketik nomor surat manual..."
          disabled={disabled}
          className="flex-1 px-4 py-2 border rounded-xl text-sm focus:outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {!value && (
        <div className="flex flex-col gap-3 mt-2 border-t pt-3 border-slate-200 dark:border-slate-700">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 italic mb-1">
            Buat otomatis (Pilih struktur):
          </div>
          {hierarchy.map((type, idx) => {
            if (idx > 0 && !selections[idx - 1]) return null;

            const parentId = idx === 0 ? null : selections[idx - 1];
            const options = nomorSuratDB.filter((n) => {
              if (idx === 0)
                return (
                  n.parentId === null &&
                  (n.type === type || n.type?.toUpperCase() === type.toUpperCase())
                );
              return n.parentId === parentId;
            });

            if (options.length === 0 && parentId) {
              return (
                <div key={type} className="text-xs text-rose-500 italic">
                  Data {type} tidak tersedia.
                </div>
              );
            }

            return (
              <div key={type} className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 ml-1">
                  {idx + 1}. {type}
                </label>
                <select
                  value={selections[idx] || ''}
                  onChange={(e) => handleSelectChange(idx, e.target.value)}
                  disabled={disabled || isGenerating}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 transition-colors shadow-sm disabled:opacity-50"
                >
                  <option value="">-- Pilih {type} --</option>
                  {options.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.kode ? `${opt.kode} - ` : ''}
                      {opt.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={disabled || !isAllSelected || isGenerating}
            className="mt-2 w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isGenerating ? <FaSpinner className="animate-spin" /> : <FaPrint />}
            Generate Nomor Surat
          </button>
        </div>
      )}
    </div>
  );
}

// --- Sub Komponen: Detail Transaksi ----------------------------------
function DetailTransaksi({
  value,
  onChange,
  pegawaiList,
  disabled,
  isSaved,
  makDB,
  akunNodeId,
  tahunNodeId,
  makString,
}) {
  const [rows, setRows] = useState(Array.isArray(value) && value.length > 0 ? value : []);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Auto-resolve akunNodeId from makString if missing (because SPBY inherits mak as string from SPD)
  const resolvedAkunNodeId = useMemo(() => {
    if (akunNodeId) return akunNodeId;
    if (makString && makDB && makDB.length > 0) {
      const akunNodes = makDB.filter((n) => n.type?.toUpperCase() === 'AKUN');
      for (const node of akunNodes) {
        const parts = [];
        let curr = node;
        while (curr) {
          if (curr.kode) parts.unshift(curr.kode);
          curr = makDB.find((n) => n.id === curr.parentId);
        }
        if (parts.join(' ') === makString) {
          return node.id;
        }
      }
    }
    return '';
  }, [akunNodeId, makString, makDB]);

  // Get Item nodes from MAK (children of the selected Akun)
  const itemOptions =
    makDB && resolvedAkunNodeId
      ? makDB.filter((n) => n.parentId === resolvedAkunNodeId && n.type?.toUpperCase() === 'ITEM')
      : [];

  useEffect(() => {
    // Jika form sudah pernah disimpan (isSaved = true), jangan auto-generate ulang
    // meskipun rows kosong (karena mungkin user sengaja menghapusnya).
    // Hanya render sesuai value yang ada dari database.
    if (isSaved) {
      if (Array.isArray(value) && JSON.stringify(value) !== JSON.stringify(rows)) {
        setRows(value);
      }
      if (!hasInitialized) setHasInitialized(true);
      return;
    }

    // --- Mode Auto-Generate (HANYA untuk form baru yang belum pernah disave) ---
    // Jika ada value sementara, gunakan
    if (Array.isArray(value) && value.length > 0) {
      if (JSON.stringify(value) !== JSON.stringify(rows)) {
        setRows(value);
      }
      if (!hasInitialized) setHasInitialized(true);
    }
    // Jika value benar-benar kosong dan belum inisialisasi, auto-buatkan baris
    else if (!hasInitialized && pegawaiList && pegawaiList.length > 0) {
      const initialRows = pegawaiList.map((p, i) => {
        const nipNama = p.split('\n')[0];
        const nipOnly = p.includes('NIP.') ? p.split('NIP. ')[1].split('\n')[0] : '';
        const label = nipOnly ? `${nipOnly} - ${nipNama}` : nipNama;
        return {
          id: Date.now() + i, // unique ID
          pegawai: label,
          detail: '',
          itemNodeId: '',
          akunNodeId: '',
          tahunNodeId: '',
          itemKode: '',
          itemName: '',
          uraian: '',
          jumlah: '',
        };
      });
      setRows(initialRows);
      onChange(initialRows);
      setHasInitialized(true);
    }
  }, [value, pegawaiList, hasInitialized, isSaved]);

  const updateParent = (newRows) => {
    setRows(newRows);
    onChange(newRows);
  };

  const handleAdd = () => {
    updateParent([
      ...rows,
      {
        id: Date.now(),
        pegawai: '',
        detail: '',
        itemNodeId: '',
        akunNodeId: '',
        tahunNodeId: '',
        itemKode: '',
        itemName: '',
        uraian: '',
        jumlah: '',
      },
    ]);
  };

  const handleRemove = (id) => {
    updateParent(rows.filter((r) => r.id !== id));
  };

  const handleChange = (id, field, val) => {
    updateParent(rows.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
  };

  const handleDetailChange = (id, selectedValue) => {
    // Check if it's a MAK Item (starts with "mak:") or a static option
    if (selectedValue.startsWith('mak:')) {
      const itemId = selectedValue.replace('mak:', '');
      const itemNode = makDB?.find((n) => n.id === itemId);
      if (itemNode) {
        updateParent(
          rows.map((r) =>
            r.id === id
              ? {
                  ...r,
                  detail: `${itemNode.kode || ''} - ${itemNode.name}`.trim().replace(/^- /, ''),
                  itemNodeId: itemId,
                  akunNodeId: resolvedAkunNodeId || '',
                  tahunNodeId: tahunNodeId || '',
                  itemKode: itemNode.kode || '',
                  itemName: itemNode.name || '',
                }
              : r,
          ),
        );
        return;
      }
    }
    // Static option or clear
    updateParent(
      rows.map((r) =>
        r.id === id
          ? {
              ...r,
              detail: selectedValue,
              itemNodeId: '',
              akunNodeId: '',
              tahunNodeId: '',
              itemKode: '',
              itemName: '',
            }
          : r,
      ),
    );
  };

  const formatRupiah = (angka) => {
    if (!angka) return '';
    const number_string = angka.toString().replace(/[^,\d]/g, '');
    const split = number_string.split(',');
    const sisa = split[0].length % 3;
    let rupiah = split[0].substr(0, sisa);
    const ribuan = split[0].substr(sisa).match(/\d{3}/gi);

    if (ribuan) {
      const separator = sisa ? '.' : '';
      rupiah += separator + ribuan.join('.');
    }

    rupiah = split[1] !== undefined ? rupiah + ',' + split[1] : rupiah;
    return rupiah;
  };

  const parseRupiah = (string) => {
    return string.replace(/[^,\d]/g, '');
  };

  // Helper to find the current dropdown value for a row
  const getDropdownValue = (row) => {
    if (row.itemNodeId) {
      return `mak:${row.itemNodeId}`;
    }
    return row.detail || '';
  };

  return (
    <div className="flex flex-col border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-100 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="p-2 font-bold text-slate-600 dark:text-slate-300 text-center border-r">
                NAMA
              </th>
              <th className="p-2 font-bold text-slate-600 dark:text-slate-300 text-center border-r">
                Detail / Item MAK
                {itemOptions.length > 0 && (
                  <span className="ml-1 text-[9px] font-semibold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                    {itemOptions.length} Item
                  </span>
                )}
              </th>
              <th className="p-2 font-bold text-slate-600 dark:text-slate-300 text-center border-r">
                Jumlah (Rp)
              </th>
              <th className="p-2 font-bold text-slate-600 dark:text-slate-300 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const selectedItem = row.itemNodeId
                ? makDB?.find((n) => n.id === row.itemNodeId)
                : null;
              const itemPagu = selectedItem ? Number(selectedItem.pagu) || 0 : 0;

              return (
                <tr
                  key={row.id}
                  className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <td className="p-2 border-r">
                    <select
                      value={row.pegawai}
                      onChange={(e) => handleChange(row.id, 'pegawai', e.target.value)}
                      disabled={disabled}
                      className="w-full p-1.5 border rounded bg-white dark:bg-slate-800 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- Pilih Pegawai --</option>
                      {pegawaiList.map((p, i) => {
                        const nipNama = p.split('\n')[0]; // Ambil baris pertama (Nama)
                        const nipOnly = p.includes('NIP.')
                          ? p.split('NIP. ')[1].split('\n')[0]
                          : '';
                        const label = nipOnly ? `${nipOnly} - ${nipNama}` : nipNama;
                        return (
                          <option key={i} value={label}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </td>
                  <td className="p-2 border-r">
                    <select
                      value={getDropdownValue(row)}
                      onChange={(e) => handleDetailChange(row.id, e.target.value)}
                      disabled={disabled}
                      className={`w-full p-1.5 border rounded bg-white dark:bg-slate-800 focus:ring-1 focus:ring-indigo-500 ${row.itemNodeId ? 'border-teal-300 bg-teal-50' : ''}`}
                    >
                      <option value="">-- Pilih Detail --</option>
                      {/* MAK Item options (dynamic from hierarchy) */}
                      {itemOptions.length > 0 && (
                        <optgroup label="📦 Item MAK">
                          {itemOptions.map((item) => (
                            <option key={item.id} value={`mak:${item.id}`}>
                              {item.kode ? `${item.kode} - ` : ''}
                              {item.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    {/* Show item budget info */}
                    {selectedItem && itemPagu > 0 && (
                      <div className="mt-1 text-[9px] text-teal-600 flex items-center gap-1">
                        <span>Pagu: Rp {new Intl.NumberFormat('id-ID').format(itemPagu)}</span>
                      </div>
                    )}
                  </td>
                  <td className="p-2 border-r">
                    <input
                      type="text"
                      value={formatRupiah(row.jumlah)}
                      onChange={(e) => handleChange(row.id, 'jumlah', parseRupiah(e.target.value))}
                      disabled={disabled}
                      className="w-full p-1.5 border rounded focus:ring-1 focus:ring-indigo-500 text-right"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemove(row.id)}
                      disabled={disabled}
                      className="bg-rose-50 text-rose-600 px-2 py-1 rounded hover:bg-rose-100 disabled:opacity-50"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan="5" className="p-4 text-center text-slate-400 italic">
                  Belum ada detail transaksi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!disabled && (
        <div className="p-2 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={handleAdd}
            className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-colors font-semibold text-xs"
          >
            + Tambah Baris Transaksi
          </button>
        </div>
      )}
    </div>
  );
}
