import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/config/firebase';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  writeBatch,
  where,
  orderBy,
} from 'firebase/firestore';
import {
  FaBoxOpen,
  FaPlus,
  FaPen,
  FaTrash,
  FaSave,
  FaTimes,
  FaFileCsv,
  FaDownload,
  FaUpload,
  FaHistory,
  FaArrowDown,
  FaArrowUp,
  FaSearch,
  FaFilter,
  FaSort,
  FaSortUp,
  FaSortDown,
} from 'react-icons/fa';

export default function StokBarang() {
  const [itemsList, setItemsList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    kodebarang: '',
    namabarang: '',
    stokbarang: 0,
    satuan: 'Pcs',
  });

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const fileInputRef = useRef(null);

  // Detail Transaksi
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemTransactions, setItemTransactions] = useState([]);

  // Filter, Search, Sort
  const [globalSearch, setGlobalSearch] = useState('');
  const [filterStock, setFilterStock] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'namabarang', direction: 'asc' });

  const itemsCol = collection(db, 'inventory_items');
  const txCol = collection(db, 'inventory_transaksi');

  useEffect(() => {
    const unsub = onSnapshot(query(itemsCol), (snapshot) => {
      setItemsList(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!selectedItem) {
      setItemTransactions([]);
      return;
    }
    const q = query(txCol, where('barangId', '==', selectedItem.id), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setItemTransactions(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [selectedItem]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort className="opacity-30 inline ml-1" />;
    return sortConfig.direction === 'asc' ? (
      <FaSortUp className="inline ml-1" />
    ) : (
      <FaSortDown className="inline ml-1" />
    );
  };

  const filteredAndSortedItems = [...itemsList]
    .filter((item) => {
      const matchSearch =
        item.kodebarang.toLowerCase().includes(globalSearch.toLowerCase()) ||
        item.namabarang.toLowerCase().includes(globalSearch.toLowerCase());
      let matchFilter = true;
      if (filterStock === 'low') matchFilter = item.stokbarang > 0 && item.stokbarang <= 5;
      else if (filterStock === 'instock') matchFilter = item.stokbarang > 5;
      else if (filterStock === 'empty') matchFilter = item.stokbarang === 0;

      return matchSearch && matchFilter;
    })
    .sort((a, b) => {
      if (!sortConfig.key) return 0;
      let keyA = a[sortConfig.key];
      let keyB = b[sortConfig.key];

      if (typeof keyA === 'string') keyA = keyA.toLowerCase();
      if (typeof keyB === 'string') keyB = keyB.toLowerCase();

      if (keyA < keyB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (keyA > keyB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.kodebarang || !formData.namabarang) return;

    try {
      if (editingId) {
        await updateDoc(doc(db, 'inventory_items', editingId), {
          ...formData,
          stokbarang: Number(formData.stokbarang),
        });
        if (selectedItem && selectedItem.id === editingId) {
          setSelectedItem({
            ...selectedItem,
            ...formData,
            stokbarang: Number(formData.stokbarang),
          });
        }
      } else {
        await addDoc(itemsCol, {
          ...formData,
          stokbarang: Number(formData.stokbarang),
          createdAt: new Date().toISOString(),
        });
      }
      setIsAdding(false);
      setEditingId(null);
      setFormData({ kodebarang: '', namabarang: '', stokbarang: 0, satuan: 'Pcs' });
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus Barang ini?')) return;
    try {
      await deleteDoc(doc(db, 'inventory_items', id));
      if (selectedItem && selectedItem.id === id) {
        setSelectedItem(null);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const startEdit = (item) => {
    setFormData({
      kodebarang: item.kodebarang,
      namabarang: item.namabarang,
      stokbarang: item.stokbarang,
      satuan: item.satuan || 'Pcs',
    });
    setEditingId(item.id);
    setIsAdding(true);
  };

  const downloadTemplate = () => {
    const csvContent =
      'kodebarang,namabarang,stokbarang,satuan\nKODE-001,Kertas HVS A4,10,Rim\nKODE-002,Tinta Printer,5,Pcs';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_stok_barang.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress(0);
    setImportTotal(0);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').filter((line) => line.trim() !== '');

        if (lines.length <= 1) {
          throw new Error('File kosong atau hanya berisi header');
        }

        const dataRows = lines.slice(1);
        setImportTotal(dataRows.length);

        const chunkSize = 50;
        let processedCount = 0;

        for (let i = 0; i < dataRows.length; i += chunkSize) {
          const chunk = dataRows.slice(i, i + chunkSize);
          const batch = writeBatch(db);
          let validInChunk = 0;

          for (const line of chunk) {
            const row = line.split(',').map((item) => item.trim());
            if (row.length >= 4) {
              const kodebarang = row[0];
              const namabarang = row[1];
              const stokbarang = Number(row[2]) || 0;
              const satuan = row[3] || 'Pcs';

              if (kodebarang && namabarang) {
                const newDocRef = doc(collection(db, 'inventory_items'));
                batch.set(newDocRef, {
                  kodebarang,
                  namabarang,
                  stokbarang,
                  satuan,
                  createdAt: new Date().toISOString(),
                });
                validInChunk++;
              }
            }
          }

          if (validInChunk > 0) {
            await batch.commit();
            processedCount += validInChunk;
            setImportProgress(Math.min(i + chunkSize, dataRows.length));
            await delay(100);
          }
        }

        if (processedCount > 0) {
          alert(`Berhasil mengimpor ${processedCount} barang.`);
          setIsImportModalOpen(false);
        } else {
          alert('Tidak ada data valid yang diimpor. Pastikan format CSV sesuai template.');
        }
      } catch (err) {
        console.error('Error importing CSV:', err);
        alert(err.message || 'Terjadi kesalahan saat mengimpor CSV.');
      } finally {
        setIsImporting(false);
        setImportProgress(0);
        setImportTotal(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      alert('Gagal membaca file.');
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-full bg-slate-50 dark:bg-slate-900">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 p-4 sm:p-6">
      <div className="w-full flex-1 flex flex-col">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
              <FaBoxOpen className="text-indigo-600 dark:text-indigo-400" /> Stok Barang
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">
              Kelola data master barang dan sisa stok inventory.
            </p>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row gap-6 items-start min-h-0">
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden w-full h-full">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="font-bold text-slate-700 dark:text-slate-200">Daftar Stok Barang</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="bg-amber-50 text-amber-600 border border-amber-200 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400 flex items-center gap-2 transition-all"
                  >
                    <FaFileCsv /> <span className="hidden sm:inline">Import CSV</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsAdding(true);
                      setEditingId(null);
                      setFormData({ kodebarang: '', namabarang: '', stokbarang: 0, satuan: 'Pcs' });
                    }}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition-all"
                  >
                    <FaPlus /> Tambah Barang
                  </button>
                </div>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaSearch className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Cari kode atau nama barang..."
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="relative min-w-[150px]">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaFilter className="text-slate-400" />
                  </div>
                  <select
                    value={filterStock}
                    onChange={(e) => setFilterStock(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 appearance-none font-semibold cursor-pointer"
                  >
                    <option value="all">Semua Stok</option>
                    <option value="instock">Tersedia (&gt;5)</option>
                    <option value="low">Menipis (1-5)</option>
                    <option value="empty">Habis (0)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar relative">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                    <th
                      onClick={() => handleSort('kodebarang')}
                      className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                    >
                      KODE BARANG {getSortIcon('kodebarang')}
                    </th>
                    <th
                      onClick={() => handleSort('namabarang')}
                      className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                    >
                      NAMA BARANG {getSortIcon('namabarang')}
                    </th>
                    <th
                      onClick={() => handleSort('stokbarang')}
                      className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                    >
                      STOK SEKARANG {getSortIcon('stokbarang')}
                    </th>
                    <th
                      onClick={() => handleSort('satuan')}
                      className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                    >
                      SATUAN {getSortIcon('satuan')}
                    </th>
                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 text-right">
                      AKSI
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedItems.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`border-b border-slate-100 dark:border-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors cursor-pointer group ${selectedItem?.id === item.id ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
                    >
                      <td className="p-4 text-slate-600 dark:text-slate-300 font-mono text-sm font-semibold">
                        {item.kodebarang}
                      </td>
                      <td className="p-4 font-bold text-slate-800 dark:text-slate-100">
                        {item.namabarang}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded text-sm font-bold ${item.stokbarang === 0 ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' : item.stokbarang <= 5 ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}
                        >
                          {item.stokbarang}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300 text-sm">
                        {item.satuan}
                      </td>
                      <td className="p-4 text-right flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(item);
                          }}
                          className="p-2 text-slate-400 hover:text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <FaPen size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <FaTrash size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredAndSortedItems.length === 0 && (
                    <tr>
                      <td
                        colSpan="5"
                        className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm"
                      >
                        Tidak ada data yang sesuai.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail Pane */}
          {selectedItem && (
            <>
              {/* Mobile overlay */}
              <div
                className="lg:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity"
                onClick={() => setSelectedItem(null)}
              ></div>

              <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl lg:static lg:z-auto lg:rounded-2xl w-full lg:w-96 bg-white dark:bg-slate-900 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] lg:shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 self-start lg:sticky lg:top-24 transition-transform animate-in slide-in-from-bottom-full lg:slide-in-from-right-4 duration-300 max-h-[85vh] lg:max-h-none flex flex-col">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center shrink-0">
                  <h2 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <FaHistory className="text-indigo-500" /> Histori Transaksi
                  </h2>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg"
                  >
                    <FaTimes size={14} />
                  </button>
                </div>

                <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
                  <div className="mb-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 shrink-0">
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">
                      Barang Terpilih
                    </div>
                    <div className="font-bold text-lg text-slate-800 dark:text-slate-100 leading-tight">
                      {selectedItem.namabarang}
                    </div>
                    <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400 mt-1.5 font-semibold">
                      {selectedItem.kodebarang}
                    </div>
                  </div>

                  <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider shrink-0">
                    Riwayat Terakhir
                  </h3>

                  <div className="space-y-3 lg:max-h-[400px] lg:overflow-y-auto lg:custom-scrollbar pr-1">
                    {itemTransactions.length === 0 ? (
                      <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                        Belum ada transaksi untuk barang ini.
                      </div>
                    ) : (
                      itemTransactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded-md">
                              {new Date(tx.tanggal).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                            {tx.jenis === 'Masuk' ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800/50 dark:text-emerald-400 px-2 py-1 rounded flex items-center gap-1">
                                <FaArrowDown size={10} /> Masuk
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 dark:bg-rose-900/30 dark:border-rose-800/50 dark:text-rose-400 px-2 py-1 rounded flex items-center gap-1">
                                <FaArrowUp size={10} /> Keluar
                              </span>
                            )}
                          </div>
                          <div className="flex justify-between items-end">
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">
                                Oleh:
                              </div>
                              <div
                                className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate"
                                title={tx.pengambil}
                              >
                                {tx.pengambil}
                              </div>
                            </div>
                            <div className="font-bold text-lg text-slate-800 dark:text-slate-100 shrink-0">
                              {tx.jenis === 'Masuk' ? '+' : '-'}
                              {tx.jumlah}{' '}
                              <span className="text-xs font-medium text-slate-500">
                                {tx.satuan}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal Import CSV */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
                <FaFileCsv className="text-indigo-500" /> Import Stok (CSV)
              </h3>
              <button
                onClick={() => !isImporting && setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                disabled={isImporting}
              >
                <FaTimes size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Silakan download template CSV terlebih dahulu, isi data barang, lalu upload kembali.
              </p>

              <button
                onClick={downloadTemplate}
                className="w-full bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center gap-2 transition-all"
                disabled={isImporting}
              >
                <FaDownload /> Download Template CSV
              </button>

              <div className="border-t border-slate-200 dark:border-slate-700 my-4"></div>

              <label
                className={`w-full flex justify-center items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all border-2 border-dashed ${isImporting ? 'bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700' : 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100 cursor-pointer dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-400'}`}
              >
                <FaUpload /> {isImporting ? 'Mengimpor...' : 'Pilih File CSV & Import'}
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  disabled={isImporting}
                />
              </label>

              {isImporting && importTotal > 0 && (
                <div className="space-y-1 mt-4">
                  <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                    <span>Proses Import</span>
                    <span>
                      {Math.round((importProgress / importTotal) * 100)}% ({importProgress}/
                      {importTotal})
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(importProgress / importTotal) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                disabled={isImporting}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add/Edit Barang */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
                {editingId ? (
                  <>
                    <FaPen className="text-indigo-500" /> Edit Barang
                  </>
                ) : (
                  <>
                    <FaPlus className="text-indigo-500" /> Tambah Barang
                  </>
                )}
              </h3>
              <button
                onClick={() => setIsAdding(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <FaTimes size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    KODE BARANG
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.kodebarang}
                    onChange={(e) => setFormData({ ...formData, kodebarang: e.target.value })}
                    className="w-full text-sm py-2.5 px-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                    placeholder="KODE-001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    NAMA BARANG
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.namabarang}
                    onChange={(e) => setFormData({ ...formData, namabarang: e.target.value })}
                    className="w-full text-sm py-2.5 px-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                    placeholder="Kertas HVS A4"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                      STOK
                    </label>
                    <input
                      required
                      type="number"
                      value={formData.stokbarang}
                      onChange={(e) => setFormData({ ...formData, stokbarang: e.target.value })}
                      className="w-full text-sm py-2.5 px-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                      SATUAN
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.satuan}
                      onChange={(e) => setFormData({ ...formData, satuan: e.target.value })}
                      className="w-full text-sm py-2.5 px-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                      placeholder="Pcs/Rim"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                >
                  <FaTimes /> Batal
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition-colors"
                >
                  <FaSave /> Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
