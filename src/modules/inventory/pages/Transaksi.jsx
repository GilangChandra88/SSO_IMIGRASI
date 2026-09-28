import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/config/firebase';
import {
  collection,
  addDoc,
  doc,
  onSnapshot,
  query,
  runTransaction,
  orderBy,
} from 'firebase/firestore';
import {
  FaExchangeAlt,
  FaPlus,
  FaSave,
  FaTimes,
  FaArrowUp,
  FaArrowDown,
  FaSearch,
  FaFilter,
  FaSort,
  FaSortUp,
  FaSortDown,
} from 'react-icons/fa';

export default function Transaksi() {
  const [transaksiList, setTransaksiList] = useState([]);
  const [itemsList, setItemsList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    jenis: 'Keluar',
    barangId: '',
    pengambil: '',
    tanggal: new Date().toISOString().split('T')[0],
    jumlah: 1,
  });

  // Untuk Custom Searchable Select
  const [searchBarang, setSearchBarang] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Filter, Search, Sort Table
  const [globalSearch, setGlobalSearch] = useState('');
  const [filterJenis, setFilterJenis] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'tanggal', direction: 'desc' });

  const txCol = collection(db, 'inventory_transaksi');
  const itemsCol = collection(db, 'inventory_items');

  useEffect(() => {
    const unsubTx = onSnapshot(query(txCol, orderBy('createdAt', 'desc')), (snapshot) => {
      setTransaksiList(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    const unsubItems = onSnapshot(query(itemsCol), (snapshot) => {
      setItemsList(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => {
      unsubTx();
      unsubItems();
    };
  }, []);

  // Handle click outside untuk menutup dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const filteredAndSortedTx = [...transaksiList]
    .filter((tx) => {
      const matchSearch =
        tx.namabarang?.toLowerCase().includes(globalSearch.toLowerCase()) ||
        tx.kodebarang?.toLowerCase().includes(globalSearch.toLowerCase()) ||
        tx.pengambil?.toLowerCase().includes(globalSearch.toLowerCase());
      const matchFilter = filterJenis === 'all' || tx.jenis === filterJenis;
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
    if (!formData.barangId || !formData.tanggal || formData.jumlah <= 0) {
      alert('Harap lengkapi semua data, termasuk memilih barang dari dropdown.');
      return;
    }

    const selectedItem = itemsList.find((i) => i.id === formData.barangId);
    if (!selectedItem) {
      alert('Barang tidak valid.');
      return;
    }

    if (formData.jenis === 'Keluar' && selectedItem.stokbarang < formData.jumlah) {
      alert(`Stok tidak cukup! Stok saat ini: ${selectedItem.stokbarang}`);
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const itemRef = doc(db, 'inventory_items', formData.barangId);
        const itemDoc = await transaction.get(itemRef);

        if (!itemDoc.exists()) {
          throw new Error('Item not found');
        }

        const newStock =
          formData.jenis === 'Masuk'
            ? itemDoc.data().stokbarang + Number(formData.jumlah)
            : itemDoc.data().stokbarang - Number(formData.jumlah);

        transaction.update(itemRef, { stokbarang: newStock });

        const newTxRef = doc(collection(db, 'inventory_transaksi'));
        transaction.set(newTxRef, {
          ...formData,
          jumlah: Number(formData.jumlah),
          namabarang: selectedItem.namabarang,
          kodebarang: selectedItem.kodebarang,
          satuan: selectedItem.satuan,
          createdAt: new Date().toISOString(),
        });
      });

      setIsAdding(false);
      setFormData({
        jenis: 'Keluar',
        barangId: '',
        pengambil: '',
        tanggal: new Date().toISOString().split('T')[0],
        jumlah: 1,
      });
      setSearchBarang('');
    } catch (error) {
      console.error('Transaction failed: ', error);
      alert('Terjadi kesalahan saat menyimpan transaksi.');
    }
  };

  const filteredItemsForSelect = itemsList.filter(
    (item) =>
      item.namabarang.toLowerCase().includes(searchBarang.toLowerCase()) ||
      item.kodebarang.toLowerCase().includes(searchBarang.toLowerCase()),
  );

  if (loading)
    return (
      <div className="flex justify-center items-center h-full bg-slate-50 dark:bg-slate-900">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 p-4 sm:p-6">
      <div className="w-full flex-1 flex flex-col min-h-0">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
              <FaExchangeAlt className="text-indigo-600 dark:text-indigo-400" /> Transaksi Stok
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">
              Catat transaksi barang masuk dan barang keluar.
            </p>
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden w-full h-full">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-slate-700 dark:text-slate-200">Riwayat Transaksi</h2>
              <button
                onClick={() => {
                  setIsAdding(true);
                  setSearchBarang('');
                  setFormData({ ...formData, barangId: '' });
                }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition-all"
              >
                <FaPlus /> Tambah Transaksi
              </button>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Cari barang atau nama pengambil..."
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
                  value={filterJenis}
                  onChange={(e) => setFilterJenis(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 appearance-none font-semibold cursor-pointer"
                >
                  <option value="all">Semua Jenis</option>
                  <option value="Masuk">Hanya Masuk</option>
                  <option value="Keluar">Hanya Keluar</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar relative">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <th
                    onClick={() => handleSort('tanggal')}
                    className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                  >
                    TANGGAL {getSortIcon('tanggal')}
                  </th>
                  <th
                    onClick={() => handleSort('jenis')}
                    className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                  >
                    JENIS {getSortIcon('jenis')}
                  </th>
                  <th
                    onClick={() => handleSort('namabarang')}
                    className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                  >
                    BARANG {getSortIcon('namabarang')}
                  </th>
                  <th
                    onClick={() => handleSort('jumlah')}
                    className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                  >
                    JUMLAH {getSortIcon('jumlah')}
                  </th>
                  <th
                    onClick={() => handleSort('pengambil')}
                    className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                  >
                    PENGAMBIL / PEMASUK {getSortIcon('pengambil')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedTx.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                  >
                    <td className="p-4 text-slate-600 dark:text-slate-300 text-sm font-medium">
                      {new Date(tx.tanggal).toLocaleDateString('id-ID')}
                    </td>
                    <td className="p-4">
                      {tx.jenis === 'Masuk' ? (
                        <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md text-xs font-bold dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400">
                          <FaArrowDown size={10} /> Masuk
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-md text-xs font-bold dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-400">
                          <FaArrowUp size={10} /> Keluar
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800 dark:text-slate-100">
                        {tx.namabarang}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 text-xs font-mono mt-0.5">
                        {tx.kodebarang}
                      </div>
                    </td>
                    <td className="p-4 font-bold text-slate-700 dark:text-slate-200 text-sm">
                      {tx.jumlah} {tx.satuan}
                    </td>
                    <td className="p-4 text-slate-700 dark:text-slate-300 text-sm">
                      {tx.pengambil}
                    </td>
                  </tr>
                ))}
                {filteredAndSortedTx.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm"
                    >
                      Tidak ada riwayat transaksi yang sesuai.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Modal Tambah Transaksi */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
                <FaPlus className="text-indigo-500" /> Tambah Transaksi
              </h3>
              <button
                type="button"
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
                    JENIS TRANSAKSI
                  </label>
                  <select
                    required
                    value={formData.jenis}
                    onChange={(e) => setFormData({ ...formData, jenis: e.target.value })}
                    className={`w-full text-sm py-2.5 px-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 font-bold ${formData.jenis === 'Masuk' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                  >
                    <option value="Keluar">Keluar (Outbound)</option>
                    <option value="Masuk">Masuk (Inbound)</option>
                  </select>
                </div>

                <div className="relative" ref={dropdownRef}>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    CARI & PILIH BARANG
                  </label>
                  <input
                    type="text"
                    placeholder="Ketik nama atau kode barang..."
                    value={searchBarang}
                    onChange={(e) => {
                      setSearchBarang(e.target.value);
                      setIsDropdownOpen(true);
                      setFormData({ ...formData, barangId: '' });
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    className="w-full text-sm py-2.5 px-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                  />
                  {!formData.barangId && searchBarang.length > 0 && !isDropdownOpen && (
                    <div className="text-[10px] text-rose-500 mt-1">
                      *Pilih barang dari daftar dropdown
                    </div>
                  )}

                  {isDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                      {filteredItemsForSelect.length === 0 ? (
                        <div className="p-4 text-sm text-slate-500 dark:text-slate-400 text-center">
                          Barang tidak ditemukan.
                        </div>
                      ) : (
                        filteredItemsForSelect.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => {
                              setFormData({ ...formData, barangId: item.id });
                              setSearchBarang(`${item.kodebarang} - ${item.namabarang}`);
                              setIsDropdownOpen(false);
                            }}
                            className="p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer border-b border-slate-100 dark:border-slate-700/50 last:border-0 transition-colors"
                          >
                            <div className="font-bold text-sm text-slate-800 dark:text-slate-100">
                              {item.namabarang}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                              {item.kodebarang} • Sisa Stok:{' '}
                              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                {item.stokbarang} {item.satuan}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    SIAPA YANG {formData.jenis === 'Masuk' ? 'MEMASUKKAN' : 'MENGAMBIL'}
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.pengambil}
                    onChange={(e) => setFormData({ ...formData, pengambil: e.target.value })}
                    className="w-full text-sm py-2.5 px-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                    placeholder="Nama pegawai / pihak..."
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                      JUMLAH
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={formData.jumlah}
                      onChange={(e) => setFormData({ ...formData, jumlah: e.target.value })}
                      className="w-full text-sm py-2.5 px-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                      TANGGAL
                    </label>
                    <input
                      required
                      type="date"
                      value={formData.tanggal}
                      onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                      className="w-full text-sm py-2.5 px-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
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
