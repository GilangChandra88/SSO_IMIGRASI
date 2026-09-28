import { useState, useEffect } from 'react';
import { db } from '@/config/firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  FaPlus,
  FaFolderOpen,
  FaSitemap,
  FaFolder,
  FaColumns,
  FaTable,
  FaCopy,
  FaFileExcel,
  FaFilter,
  FaUpload,
} from 'react-icons/fa';

import ViewTree from '@/components/ViewTree';
import ViewExplorer from '@/components/ViewExplorer';
import ViewColumns from '@/components/ViewColumns';
import ViewRekap from '@/components/ViewRekap';

const HIERARCHY = [
  'Tahun',
  'Program',
  'Kegiatan',
  'KRO',
  'Output',
  'Komponen',
  'Sub Komponen',
  'Akun',
  'Item',
];

const BULAN_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export default function MakSetup() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('rekap'); // 'tree', 'explorer', 'columns', 'rekap'
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedPath, setFocusedPath] = useState(null);

  // MAK History state
  const [makHistory, setMakHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Period filter
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1); // 1-12
  const [filterYear, setFilterYear] = useState(now.getFullYear());

  // Copy year modal
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyFromYear, setCopyFromYear] = useState('');
  const [copyToYear, setCopyToYear] = useState('');
  const [isCopying, setIsCopying] = useState(false);

  // CSV Import modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ total: 0, current: 0 });

  const makCollection = collection(db, 'MAK');

  // Realtime listener for MAK nodes
  useEffect(() => {
    const q = query(makCollection);
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setNodes(data);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching data realtime:', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // Realtime listener for MAK_History
  useEffect(() => {
    const historyCollection = collection(db, 'MAK_History');
    const unsubscribe = onSnapshot(
      historyCollection,
      (querySnapshot) => {
        const data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMakHistory(data);
        setLoadingHistory(false);
      },
      (error) => {
        console.error('Error fetching MAK_History:', error);
        setLoadingHistory(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const handleAddNode = async (kode, name, type, parentId, pagu = 0, lockPagu = 0) => {
    try {
      await addDoc(makCollection, {
        kode: kode || '',
        name,
        type,
        parentId,
        pagu: Number(pagu) || 0,
        lockPagu: Number(lockPagu) || 0,
        createdAt: new Date().toISOString(),
      });
      // Realtime listener will handle state update
    } catch (error) {
      console.error('Error adding node:', error);
    }
  };

  const handleDeleteNode = async (id) => {
    if (!window.confirm('Yakin ingin menghapus item ini beserta seluruh isinya?')) return;

    // Recursive delete function to get all children
    const getChildrenIds = (parentId, allNodes) => {
      const children = allNodes.filter((n) => n.parentId === parentId);
      let ids = children.map((c) => c.id);
      children.forEach((c) => {
        ids = [...ids, ...getChildrenIds(c.id, allNodes)];
      });
      return ids;
    };

    const idsToDelete = [id, ...getChildrenIds(id, nodes)];

    try {
      for (const nodeId of idsToDelete) {
        await deleteDoc(doc(db, 'MAK', nodeId));
      }
      // Realtime listener will handle state update
    } catch (error) {
      console.error('Error deleting nodes:', error);
    }
  };

  const handleEditNode = async (id, kode, name, pagu = 0, lockPagu = 0) => {
    try {
      await updateDoc(doc(db, 'MAK', id), {
        kode,
        name,
        pagu: Number(pagu) || 0,
        lockPagu: Number(lockPagu) || 0,
      });
      // Realtime listener will handle state update
    } catch (error) {
      console.error('Error editing node:', error);
    }
  };

  // Copy year structure
  const handleCopyYear = async () => {
    if (!copyFromYear || !copyToYear) {
      alert('Pilih tahun sumber dan tahun tujuan.');
      return;
    }
    if (copyFromYear === copyToYear) {
      alert('Tahun sumber dan tujuan tidak boleh sama.');
      return;
    }

    // Check if target year already exists
    const existingTarget = nodes.find((n) => n.type === 'Tahun' && n.name === copyToYear);
    if (existingTarget) {
      if (
        !window.confirm(
          `Tahun ${copyToYear} sudah ada. Lanjutkan copy? (data yang sudah ada TIDAK akan dihapus, copy akan menambah data baru)`,
        )
      )
        return;
    }

    setIsCopying(true);
    try {
      // Find source year root
      const sourceRoot = nodes.find((n) => n.type === 'Tahun' && n.name === copyFromYear);
      if (!sourceRoot) {
        alert('Tahun sumber tidak ditemukan.');
        setIsCopying(false);
        return;
      }

      // Deep clone via BFS
      const idMapping = {}; // old id -> new id
      const queue = [{ oldNode: sourceRoot, newParentId: null }];
      let count = 0;
      const allOps = [];

      while (queue.length > 0) {
        const { oldNode, newParentId } = queue.shift();

        // Create new ref immediately to get ID
        const newDocRef = doc(makCollection);
        idMapping[oldNode.id] = newDocRef.id;

        // Create new node data
        const newName = oldNode.type === 'Tahun' ? copyToYear : oldNode.name;

        allOps.push({
          ref: newDocRef,
          data: {
            kode: oldNode.kode || '',
            name: newName,
            type: oldNode.type,
            parentId: newParentId,
            pagu: Number(oldNode.pagu) || 0,
            lockPagu: 0, // Reset lock pagu for new year
            createdAt: new Date().toISOString(),
          },
        });

        count++;

        // Queue children
        const children = nodes.filter((n) => n.parentId === oldNode.id);
        children.forEach((child) => {
          queue.push({ oldNode: child, newParentId: newDocRef.id });
        });
      }

      // Commit in chunks of 500
      const CHUNK_SIZE = 500;
      for (let i = 0; i < allOps.length; i += CHUNK_SIZE) {
        const chunk = allOps.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((op) => batch.set(op.ref, op.data));
        await batch.commit();
      }

      alert(`Berhasil menyalin ${count} item ke tahun ${copyToYear}.`);
      setShowCopyModal(false);
      setCopyFromYear('');
      setCopyToYear('');
    } catch (error) {
      console.error('Error copying year:', error);
      alert('Gagal menyalin tahun: ' + error.message);
    }
    setIsCopying(false);
  };

  const handleDownloadTemplate = () => {
    const header = [
      'Tahun',
      'Program',
      'Kegiatan',
      'KRO',
      'Output',
      'Komponen',
      'Sub Komponen',
      'Akun',
      'Item',
      'Pagu',
      'Lock Pagu',
    ];
    const row1 = [
      '2026',
      '054.01.WA - Program Dukungan Manajemen',
      '1048 - Pembinaan Keimigrasian',
      'EBA - Laporan Pelaksanaan Tugas',
      '994 - Layanan Umum',
      '002 - Dukungan Operasional',
      'A - Operasional',
      '524111 - Belanja Perjalanan Dinas Biasa',
      '000001 - Perjalanan Dinas Dalam Kota',
      '5000000',
      '0',
    ];
    const csvContent = [header.join(','), `"${row1.join('","')}"`].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Template_Import_MAK.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSV = (text) => {
    const result = [];
    let row = [];
    let inQuotes = false;
    let val = '';
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (inQuotes) {
        if (char === '"') {
          if (i + 1 < text.length && text[i + 1] === '"') {
            val += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          val += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          row.push(val);
          val = '';
        } else if (char === '\n' || char === '\r') {
          row.push(val);
          result.push(row);
          row = [];
          val = '';
          if (char === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
            i++;
          }
        } else {
          val += char;
        }
      }
    }
    if (row.length > 0 || val !== '') {
      row.push(val);
      result.push(row);
    }
    return result;
  };

  const handleProcessImport = async () => {
    if (!importFile) {
      alert('Pilih file CSV terlebih dahulu.');
      return;
    }

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const parsed = parseCSV(text);

        if (parsed.length < 2) throw new Error('File kosong atau hanya berisi header.');

        const headers = parsed[0].map((h) => h.trim().toLowerCase());
        const levels = [
          'tahun',
          'program',
          'kegiatan',
          'kro',
          'output',
          'komponen',
          'sub komponen',
          'akun',
          'item',
        ];

        const indices = levels.map((l) => headers.findIndex((h) => h === l));
        const idxPagu = headers.findIndex((h) => h === 'pagu');
        const idxLockPagu = headers.findIndex((h) => h === 'lock pagu' || h === 'lock_pagu');

        if (indices[0] === -1 || indices[8] === -1) {
          throw new Error(
            'Format kolom tidak sesuai template. Pastikan ada kolom Tahun sampai Item.',
          );
        }

        const currentNodes = [...nodes];
        const nodesToCreate = [];

        for (let r = 1; r < parsed.length; r++) {
          const row = parsed[r];
          if (!row || row.length === 0 || !row[indices[0]]) continue;

          let parentId = null;
          let deepestNode = null;

          for (let i = 0; i < levels.length; i++) {
            const levelType = HIERARCHY[i];
            const colIdx = indices[i];
            const rawValue = row[colIdx]?.trim();
            if (!rawValue) continue;

            let kode = '';
            let name = rawValue;
            if (rawValue.includes(' - ')) {
              const parts = rawValue.split(' - ');
              kode = parts[0].trim();
              name = parts.slice(1).join(' - ').trim();
            }

            let existing = currentNodes.find(
              (n) =>
                n.type === levelType &&
                n.parentId === parentId &&
                (kode ? n.kode === kode : n.name === name),
            );

            if (existing) {
              parentId = existing.id;
              deepestNode = existing;
            } else {
              const tempId = 'temp_' + Math.random().toString(36).substr(2, 9);
              const newNode = {
                id: tempId,
                kode,
                name,
                type: levelType,
                parentId: parentId,
                pagu: 0,
                lockPagu: 0,
                isNew: true,
              };
              currentNodes.push(newNode);
              nodesToCreate.push(newNode);
              parentId = tempId;
              deepestNode = newNode;
            }
          }

          const rowPagu = idxPagu !== -1 ? Number(row[idxPagu]?.replace(/[^0-9.-]+/g, '')) : 0;
          const rowLockPagu =
            idxLockPagu !== -1 ? Number(row[idxLockPagu]?.replace(/[^0-9.-]+/g, '')) : 0;

          if (deepestNode && (rowPagu > 0 || rowLockPagu > 0)) {
            deepestNode.pagu = rowPagu || 0;
            deepestNode.lockPagu = rowLockPagu || 0;
            deepestNode.needsUpdate = !deepestNode.isNew;
          }
        }

        const allOps = [];
        const tempToRealMap = {};

        // 1. Create new nodes
        for (const node of nodesToCreate) {
          const newDocRef = doc(makCollection);
          tempToRealMap[node.id] = newDocRef.id;

          const realParentId =
            node.parentId && tempToRealMap[node.parentId]
              ? tempToRealMap[node.parentId]
              : node.parentId;

          allOps.push({
            type: 'set',
            ref: newDocRef,
            data: {
              kode: node.kode || '',
              name: node.name,
              type: node.type,
              parentId: realParentId,
              pagu: node.pagu || 0,
              lockPagu: node.lockPagu || 0,
              createdAt: new Date().toISOString(),
            },
          });
        }

        // 2. Update existing nodes that got new Pagu
        const nodesToUpdate = currentNodes.filter((n) => n.needsUpdate);
        for (const node of nodesToUpdate) {
          allOps.push({
            type: 'update',
            ref: doc(db, 'MAK', node.id),
            data: {
              pagu: node.pagu || 0,
              lockPagu: node.lockPagu || 0,
            },
          });
        }

        setImportProgress({ total: allOps.length, current: 0 });

        // 3. Commit in chunks of 500 (Firestore limit)
        const CHUNK_SIZE = 500;
        let currentCount = 0;

        for (let i = 0; i < allOps.length; i += CHUNK_SIZE) {
          const chunk = allOps.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);

          chunk.forEach((op) => {
            if (op.type === 'set') {
              batch.set(op.ref, op.data);
            } else {
              batch.update(op.ref, op.data);
            }
          });

          await batch.commit();
          currentCount += chunk.length;
          setImportProgress((prev) => ({ ...prev, current: currentCount }));
        }

        alert('Import CSV berhasil!');
        setShowImportModal(false);
        setImportFile(null);
      } catch (err) {
        console.error('Import error:', err);
        alert('Gagal mengimport CSV: ' + err.message);
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(importFile);
  };

  const handleSearchResultClick = (clickedNode) => {
    const path = [];
    let current = clickedNode;
    while (current) {
      path.unshift(current.id);
      current = nodes.find((n) => n.id === current.parentId);
    }
    setFocusedPath(path);
    setSearchQuery('');
  };

  const rootNodes = nodes.filter((n) => n.parentId === null && n.type === 'Tahun');

  const filteredNodes = searchQuery.trim()
    ? nodes.filter(
        (n) =>
          (n.name && n.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (n.kode && n.kode.toLowerCase().includes(searchQuery.toLowerCase())),
      )
    : nodes;

  // Get available years for copy dropdown
  const availableYears = rootNodes.map((n) => n.name).filter(Boolean);

  return (
    <div className="w-full bg-white dark:bg-slate-950 min-h-screen font-sans flex flex-col">
      {/* Header Section */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-1 tracking-tight">
            Struktur MAK
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
            Tahun ➔ Program ➔ Kegiatan ➔ KRO ➔ Output ➔ Komponen ➔ Sub Komponen ➔ Akun ➔ Item
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full xl:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Cari kode / keterangan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>

          {/* Period Filter (for Rekap view) */}
          {viewMode === 'rekap' && (
            <div className="flex items-center gap-2 shrink-0">
              <FaFilter className="text-slate-400 dark:text-slate-500" size={12} />
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(Number(e.target.value))}
                className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {BULAN_NAMES.map((name, idx) => (
                  <option key={idx} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={filterYear}
                onChange={(e) => setFilterYear(Number(e.target.value))}
                className="w-20 text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-all"
              title="Import Data via CSV"
            >
              <FaUpload size={12} /> Import CSV
            </button>
            <button
              onClick={() => setShowCopyModal(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all"
              title="Copy Struktur Tahun"
            >
              <FaCopy size={12} /> Copy Tahun
            </button>
            <button
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all opacity-50 cursor-not-allowed"
              title="Export Excel (Coming Soon)"
              disabled
            >
              <FaFileExcel size={12} /> Export
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setViewMode('rekap')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'rekap' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
              <FaTable /> Rekap
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'tree' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
              <FaSitemap /> Pohon
            </button>
            <button
              onClick={() => setViewMode('explorer')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'explorer' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
              <FaFolderOpen /> Explorer
            </button>
            <button
              onClick={() => setViewMode('columns')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'columns' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
              <FaColumns /> Kolom
            </button>
          </div>
        </div>
      </div>

      {/* Copy Year Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">
              Copy Struktur Tahun
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Salin seluruh struktur MAK (Program, Kegiatan, dst.) beserta Pagu dari tahun sumber ke
              tahun tujuan baru. Lock Pagu akan direset ke 0.
            </p>

            <div className="flex flex-col gap-3 mb-6">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                  Tahun Sumber
                </label>
                <select
                  value={copyFromYear}
                  onChange={(e) => setCopyFromYear(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Pilih Tahun Sumber --</option>
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                  Tahun Tujuan
                </label>
                <input
                  type="text"
                  value={copyToYear}
                  onChange={(e) => setCopyToYear(e.target.value)}
                  placeholder="misal: 2027"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCopyYear}
                disabled={isCopying || !copyFromYear || !copyToYear}
                className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCopying ? 'Menyalin...' : 'Copy Sekarang'}
              </button>
              <button
                onClick={() => {
                  setShowCopyModal(false);
                  setCopyFromYear('');
                  setCopyToYear('');
                }}
                disabled={isCopying}
                className="px-4 py-2.5 text-slate-600 dark:text-slate-400 bg-slate-100 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-all"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
              Import Data MAK (CSV)
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
              Anda dapat mengimpor struktur MAK sekaligus menggunakan file CSV. Sistem akan otomatis
              membuat hierarki dari <strong>Tahun</strong> hingga <strong>Item</strong> beserta{' '}
              <strong>Pagu</strong>.
            </p>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
              <h3 className="text-sm font-bold text-amber-800 mb-1">Aturan Import:</h3>
              <ul className="text-xs text-amber-700 dark:text-amber-400 list-disc pl-4 space-y-1">
                <li>Gunakan template CSV yang disediakan agar format kolom sesuai.</li>
                <li>
                  Format penulisan kode dan nama: <strong>KODE - NAMA</strong> (contoh:{' '}
                  <code>1048 - Pembinaan Keimigrasian</code>).
                </li>
                <li>Jika kolom kode/nama kosong, cukup kosongkan cell tersebut.</li>
                <li>
                  Pagu hanya akan diisikan ke level paling bawah yang terisi pada baris tersebut
                  (umumnya level Item).
                </li>
                <li>
                  Gunakan pemisah koma (<code>,</code>) standar CSV.
                </li>
              </ul>
              <button
                onClick={handleDownloadTemplate}
                className="mt-3 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 w-fit"
              >
                <FaFileExcel /> Download Template Format
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Upload File CSV
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files[0])}
                className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 dark:bg-teal-900/20 file:text-teal-700 dark:text-teal-400 hover:file:bg-teal-100 dark:bg-teal-900/30 focus:outline-none"
              />
            </div>

            {isImporting && importProgress.total > 0 && (
              <div className="mb-6">
                <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  <span>Memproses data...</span>
                  <span>
                    {importProgress.current} / {importProgress.total}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div
                    className="bg-teal-50 dark:bg-teal-900/200 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
                disabled={isImporting}
                className="px-4 py-2.5 text-slate-600 dark:text-slate-400 bg-slate-100 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleProcessImport}
                disabled={isImporting || !importFile}
                className="flex items-center gap-2 bg-teal-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? (
                  'Mengimpor...'
                ) : (
                  <>
                    <FaUpload /> Mulai Import
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Section */}
      <div className="flex-1 bg-slate-50 dark:bg-slate-950 flex flex-col min-h-0">
        {loading ? (
          <div className="text-center py-16 flex flex-col items-center justify-center gap-4 flex-1">
            <div className="w-8 h-8 border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">
              Memuat struktur data...
            </p>
          </div>
        ) : searchQuery.trim() ? (
          <div className="flex-1 p-6 overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">
              Hasil Pencarian ({filteredNodes.length})
            </h2>
            {filteredNodes.length === 0 ? (
              <div className="text-center p-12 text-slate-500 ">
                Tidak ada data yang cocok dengan pencarian Anda.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredNodes.map((node) => (
                  <div
                    key={node.id}
                    onClick={() => handleSearchResultClick(node)}
                    className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-2 hover:border-indigo-300 dark:border-indigo-700 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-full border border-indigo-100">
                        {node.type}
                      </span>
                      {node.pagu > 0 && (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          Rp {new Intl.NumberFormat('id-ID').format(node.pagu)}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-800 dark:text-slate-200 mt-1">
                      {node.kode ? (
                        <strong className="font-bold block text-slate-600 dark:text-slate-400 mb-1">
                          {node.kode}
                        </strong>
                      ) : null}
                      <span className="font-medium leading-relaxed">{node.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 relative">
            {viewMode === 'rekap' && (
              <div className="flex-1 flex flex-col min-h-0">
                <ViewRekap
                  nodes={nodes}
                  hierarchy={HIERARCHY}
                  makHistory={makHistory}
                  onEdit={handleEditNode}
                  currentMonth={filterMonth}
                  currentYear={filterYear}
                />
              </div>
            )}
            {viewMode === 'tree' && (
              <div className="px-6 pb-6 flex-1 overflow-auto">
                <ViewTree
                  nodes={nodes}
                  hierarchy={HIERARCHY}
                  onAdd={handleAddNode}
                  onDelete={handleDeleteNode}
                  onEdit={handleEditNode}
                  focusedPath={focusedPath}
                />
              </div>
            )}
            {viewMode === 'explorer' && (
              <div className="flex-1 flex flex-col min-h-0">
                <ViewExplorer
                  nodes={nodes}
                  hierarchy={HIERARCHY}
                  onAdd={handleAddNode}
                  onDelete={handleDeleteNode}
                  onEdit={handleEditNode}
                  focusedPath={focusedPath}
                />
              </div>
            )}
            {viewMode === 'columns' && (
              <div className="flex-1 flex flex-col min-h-0">
                <ViewColumns
                  nodes={nodes}
                  hierarchy={HIERARCHY}
                  onAdd={handleAddNode}
                  onDelete={handleDeleteNode}
                  onEdit={handleEditNode}
                  focusedPath={focusedPath}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
