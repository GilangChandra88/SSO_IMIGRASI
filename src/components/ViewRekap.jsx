import { useState, useMemo } from 'react';
import { FaChevronDown, FaChevronRight, FaPen, FaCheck, FaTimes } from 'react-icons/fa';

const LEVEL_COLORS = {
  Tahun: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    text: 'text-indigo-800 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800',
    badge: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
  },
  Program: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-800 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  },
  Kegiatan: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-800 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  },
  KRO: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  },
  Output: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    text: 'text-orange-800 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
    badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  },
  Komponen: {
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    text: 'text-rose-800 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
    badge: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
  },
  'Sub Komponen': {
    bg: 'bg-pink-50 dark:bg-pink-900/20',
    text: 'text-pink-800 dark:text-pink-300',
    border: 'border-pink-200 dark:border-pink-800',
    badge: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400',
  },
  Akun: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    text: 'text-purple-800 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
    badge: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  },
  Item: {
    bg: 'bg-teal-50 dark:bg-teal-900/20',
    text: 'text-teal-800 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-800',
    badge: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400',
  },
};

const LEVEL_INDENT = {
  Tahun: 0,
  Program: 1,
  Kegiatan: 2,
  KRO: 3,
  Output: 4,
  Komponen: 5,
  'Sub Komponen': 6,
  Akun: 7,
  Item: 8,
};

const fmt = (n) => new Intl.NumberFormat('id-ID').format(n || 0);

export default function ViewRekap({
  nodes,
  hierarchy,
  makHistory,
  onEdit,
  currentMonth,
  currentYear,
}) {
  const [collapsed, setCollapsed] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editPagu, setEditPagu] = useState(0);
  const [editLockPagu, setEditLockPagu] = useState(0);

  // Build realisasi lookup from MAK_History
  const realisasiMap = useMemo(() => {
    const map = {}; // nodeId -> { periodeLalu, periodeIni, total }
    if (!makHistory || makHistory.length === 0) return map;

    for (const entry of makHistory) {
      if (entry.status !== 'active') continue;
      const nodeId = entry.makNodeId;
      if (!map[nodeId]) map[nodeId] = { periodeLalu: 0, periodeIni: 0, total: 0 };

      const jumlah = Number(entry.jumlah) || 0;
      map[nodeId].total += jumlah;

      if (entry.bulan === currentMonth && entry.tahun === currentYear) {
        map[nodeId].periodeIni += jumlah;
      } else {
        map[nodeId].periodeLalu += jumlah;
      }
    }
    return map;
  }, [makHistory, currentMonth, currentYear]);

  // Recursively calculate realisasi for parent nodes (sum of all descendants)
  const getRealisasi = useMemo(() => {
    const cache = {};

    const calc = (nodeId) => {
      if (cache[nodeId]) return cache[nodeId];

      const directRealisasi = realisasiMap[nodeId] || { periodeLalu: 0, periodeIni: 0, total: 0 };
      const children = nodes.filter((n) => n.parentId === nodeId);

      if (children.length === 0) {
        cache[nodeId] = { ...directRealisasi };
        return cache[nodeId];
      }

      let periodeLalu = directRealisasi.periodeLalu;
      let periodeIni = directRealisasi.periodeIni;
      let total = directRealisasi.total;

      for (const child of children) {
        const childRealisasi = calc(child.id);
        periodeLalu += childRealisasi.periodeLalu;
        periodeIni += childRealisasi.periodeIni;
        total += childRealisasi.total;
      }

      cache[nodeId] = { periodeLalu, periodeIni, total };
      return cache[nodeId];
    };

    return calc;
  }, [nodes, realisasiMap]);

  // Recursively calculate pagu for parent nodes (bottom-up rollup)
  const getCalculatedPagu = useMemo(() => {
    const cache = {};

    const calc = (nodeId) => {
      if (cache[nodeId]) return cache[nodeId];

      const node = nodes.find((n) => n.id === nodeId);
      const children = nodes.filter((n) => n.parentId === nodeId);
      const explicitPagu = Number(node?.pagu) || 0;
      const explicitLockPagu = Number(node?.lockPagu) || 0;

      if (children.length === 0) {
        cache[nodeId] = {
          pagu: explicitPagu,
          lockPagu: explicitLockPagu,
          childrenPagu: 0,
        };
        return cache[nodeId];
      }

      let childrenPagu = 0;
      let childrenLockPagu = 0;

      for (const child of children) {
        const childCalc = calc(child.id);
        childrenPagu += childCalc.pagu;
        childrenLockPagu += childCalc.lockPagu;
      }

      cache[nodeId] = {
        pagu: explicitPagu > 0 ? explicitPagu : childrenPagu,
        lockPagu: explicitLockPagu > 0 ? explicitLockPagu : childrenLockPagu,
        childrenPagu: childrenPagu,
      };

      return cache[nodeId];
    };

    return calc;
  }, [nodes]);

  // Build flat ordered list via DFS for table rendering
  const flatList = useMemo(() => {
    const result = [];
    const rootNodes = nodes.filter((n) => n.parentId === null && n.type === hierarchy[0]);

    const traverse = (node, depth) => {
      const children = nodes.filter((n) => n.parentId === node.id);
      result.push({ ...node, depth, hasChildren: children.length > 0 });
      if (!collapsed[node.id]) {
        children.forEach((child) => traverse(child, depth + 1));
      }
    };

    rootNodes.forEach((root) => traverse(root, 0));
    return result;
  }, [nodes, hierarchy, collapsed]);

  const toggleCollapse = (nodeId) => {
    setCollapsed((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const handleStartEdit = (node) => {
    setEditingId(node.id);
    setEditPagu(node.pagu || 0);
    setEditLockPagu(node.lockPagu || 0);
  };

  const handleSaveEdit = async (node) => {
    await onEdit(
      node.id,
      node.kode || '',
      node.name || '',
      Number(editPagu) || 0,
      Number(editLockPagu) || 0,
    );
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  return (
    <div className="flex-1 overflow-auto bg-white dark:bg-slate-900">
      <div className="min-w-[1100px]">
        {/* Table Header */}
        <div className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-xs font-bold border-b border-slate-200 dark:border-slate-700">
          <div className="flex">
            <div className="flex-1 min-w-[400px] px-4 py-3 border-r border-slate-200 dark:border-slate-700">
              Uraian
            </div>
            <div className="w-[120px] px-3 py-3 text-right border-r border-slate-200 dark:border-slate-700">
              Pagu Revisi
            </div>
            <div className="w-[100px] px-3 py-3 text-right border-r border-slate-200 dark:border-slate-700">
              Lock Pagu
            </div>
            <div className="w-[120px] px-3 py-3 text-right border-r border-slate-200 dark:border-slate-700">
              Periode Lalu
            </div>
            <div className="w-[120px] px-3 py-3 text-right border-r border-slate-200 dark:border-slate-700">
              Periode Ini
            </div>
            <div className="w-[120px] px-3 py-3 text-right border-r border-slate-200 dark:border-slate-700">
              s.d. Periode
            </div>
            <div className="w-[70px] px-3 py-3 text-right border-r border-slate-200 dark:border-slate-700">
              %
            </div>
            <div className="w-[120px] px-3 py-3 text-right border-r border-slate-200 dark:border-slate-700">
              Sisa Anggaran
            </div>
            <div className="w-[60px] px-3 py-3 text-center">Aksi</div>
          </div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-slate-100">
          {flatList.length === 0 ? (
            <div className="text-center py-16 text-slate-400 dark:text-slate-500">
              Belum ada data MAK. Tambahkan melalui view Pohon, Explorer, atau Kolom.
            </div>
          ) : (
            flatList.map((node) => {
              const colors = LEVEL_COLORS[node.type] || LEVEL_COLORS['Item'];
              const indent = (LEVEL_INDENT[node.type] || node.depth) * 20;
              const explicitPagu = Number(node.pagu) || 0;
              const calcResult = getCalculatedPagu(node.id);
              const pagu = calcResult.pagu;
              const lockPagu = calcResult.lockPagu;
              const childrenPaguTotal = calcResult.childrenPagu;

              const realisasi = getRealisasi(node.id);
              const sisa = pagu - realisasi.total;
              const persen = pagu > 0 ? (realisasi.total / pagu) * 100 : 0;
              const paguWarning =
                node.hasChildren && explicitPagu > 0 && childrenPaguTotal > explicitPagu;
              const isEditing = editingId === node.id;
              const sisaTersedia = pagu - lockPagu - realisasi.total;

              return (
                <div
                  key={node.id}
                  className={`flex items-stretch group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${colors.bg} ${node.depth === 0 ? 'font-bold' : ''}`}
                >
                  {/* Uraian */}
                  <div
                    className={`flex-1 min-w-[400px] px-4 py-2.5 flex items-center gap-2 border-r border-slate-100 dark:border-slate-800 cursor-pointer`}
                    style={{ paddingLeft: `${16 + indent}px` }}
                    onClick={() => node.hasChildren && toggleCollapse(node.id)}
                  >
                    {node.hasChildren ? (
                      <button className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 shrink-0 w-4">
                        {collapsed[node.id] ? (
                          <FaChevronRight size={10} />
                        ) : (
                          <FaChevronDown size={10} />
                        )}
                      </button>
                    ) : (
                      <span className="w-4 shrink-0" />
                    )}
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${colors.badge} shrink-0`}
                    >
                      {node.type}
                    </span>
                    <span className={`text-xs ${colors.text} truncate`}>
                      {node.kode && <strong className="font-bold mr-1">{node.kode}</strong>}
                      <span className="font-medium">{node.name}</span>
                    </span>
                    {paguWarning && (
                      <span
                        className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 shrink-0"
                        title={`Total pagu children (${fmt(childrenPaguTotal)}) melebihi pagu node ini (${fmt(pagu)})`}
                      >
                        ⚠ Over
                      </span>
                    )}
                  </div>

                  {/* Pagu Revisi */}
                  <div
                    className={`w-[120px] px-3 py-2.5 text-right text-xs border-r border-slate-100 dark:border-slate-800 ${colors.text} font-semibold`}
                  >
                    {isEditing ? (
                      <input
                        type="number"
                        value={editPagu}
                        onChange={(e) => setEditPagu(e.target.value)}
                        className="w-full text-right text-xs p-1 border border-emerald-300 dark:border-emerald-700 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        autoFocus
                      />
                    ) : pagu > 0 ? (
                      fmt(pagu)
                    ) : (
                      '-'
                    )}
                  </div>

                  {/* Lock Pagu */}
                  <div
                    className={`w-[100px] px-3 py-2.5 text-right text-xs border-r border-slate-100 dark:border-slate-800 ${lockPagu > 0 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}
                  >
                    {isEditing ? (
                      <input
                        type="number"
                        value={editLockPagu}
                        onChange={(e) => setEditLockPagu(e.target.value)}
                        className="w-full text-right text-xs p-1 border border-amber-300 dark:border-amber-700 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    ) : lockPagu > 0 ? (
                      fmt(lockPagu)
                    ) : (
                      '0'
                    )}
                  </div>

                  {/* Periode Lalu */}
                  <div className="w-[120px] px-3 py-2.5 text-right text-xs border-r border-slate-100 dark:border-slate-800 text-slate-600 ">
                    {realisasi.periodeLalu > 0 ? fmt(realisasi.periodeLalu) : '0'}
                  </div>

                  {/* Periode Ini */}
                  <div className="w-[120px] px-3 py-2.5 text-right text-xs border-r border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                    {realisasi.periodeIni > 0 ? fmt(realisasi.periodeIni) : '0'}
                  </div>

                  {/* s.d. Periode */}
                  <div className="w-[120px] px-3 py-2.5 text-right text-xs border-r border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold">
                    {realisasi.total > 0 ? fmt(realisasi.total) : '0'}
                  </div>

                  {/* % */}
                  <div
                    className={`w-[70px] px-3 py-2.5 text-center text-xs border-r border-slate-100 dark:border-slate-800 font-bold ${persen >= 100 ? 'text-rose-600 dark:text-rose-400' : persen >= 80 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}
                  >
                    {pagu > 0 ? `${persen.toFixed(2)}%` : '-'}
                  </div>

                  {/* Sisa Anggaran */}
                  <div
                    className={`w-[120px] px-3 py-2.5 text-right text-xs font-bold border-r border-slate-100 dark:border-slate-800 ${sisa < 0 ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20' : sisa === 0 ? 'text-slate-400 dark:text-slate-500' : sisaTersedia < 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}
                  >
                    {pagu > 0 ? fmt(sisa) : '-'}
                  </div>

                  {/* Aksi */}
                  <div className="w-[60px] px-2 py-2.5 flex items-center justify-center">
                    {isEditing ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleSaveEdit(node)}
                          className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 rounded"
                          title="Simpan"
                        >
                          <FaCheck size={10} />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                          title="Batal"
                        >
                          <FaTimes size={10} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartEdit(node)}
                        className="p-1 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 rounded opacity-0 group-hover:opacity-100"
                        title="Edit Pagu"
                      >
                        <FaPen size={10} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
