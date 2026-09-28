import { useState, useEffect } from 'react';
import {
  FaPlus,
  FaTrash,
  FaPen,
  FaFolder,
  FaChevronRight,
  FaFolderOpen,
  FaArrowLeft,
} from 'react-icons/fa';

const TYPE_COLORS = {
  Tahun:
    'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800',
  Program:
    'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  Kegiatan:
    'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
  KRO: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  OUTPUT:
    'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
  Output:
    'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
  KOMPONEN:
    'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800',
  Komponen:
    'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800',
  'SUB KOMPONEN':
    'text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800',
  'Sub Komponen':
    'text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800',
  AKUN: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
  Akun: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
  Seksi:
    'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  KOP: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800',
  'Kode surat 1':
    'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
  'Kode surat 2':
    'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  'Kode surat 3':
    'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
  Item: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800',
};

export default function ViewExplorer({ nodes, hierarchy, onAdd, onDelete, onEdit, focusedPath }) {
  const [currentParentId, setCurrentParentId] = useState(null);

  // Track focusedPath to open correct folder
  useEffect(() => {
    if (focusedPath && focusedPath.length > 0) {
      const clickedNodeId = focusedPath[focusedPath.length - 1];
      const clickedNode = nodes.find((n) => n.id === clickedNodeId);
      if (clickedNode) {
        setCurrentParentId(clickedNode.parentId);
      }
    }
  }, [focusedPath, nodes]);

  const [currentPath, setCurrentPath] = useState([]); // array of nodes
  const [isAdding, setIsAdding] = useState(false);
  const [newKode, setNewKode] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newPagu, setNewPagu] = useState(0);
  const [newLockPagu, setNewLockPagu] = useState(0);

  const [editingNodeId, setEditingNodeId] = useState(null);
  const [editKode, setEditKode] = useState('');
  const [editName, setEditName] = useState('');
  const [editPagu, setEditPagu] = useState(0);
  const [editLockPagu, setEditLockPagu] = useState(0);

  const parentId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : null;
  const currentLevelIndex = currentPath.length;
  const childType = hierarchy[currentLevelIndex];

  const currentChildren = nodes.filter((n) => n.parentId === parentId);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    await onAdd(
      newKode.trim(),
      newItemName.trim(),
      childType,
      parentId,
      Number(newPagu) || 0,
      Number(newLockPagu) || 0,
    );
    setNewKode('');
    setNewItemName('');
    setNewPagu(0);
    setNewLockPagu(0);
    setIsAdding(false);
  };

  const startEditing = (node, e) => {
    e.stopPropagation();
    setEditingNodeId(node.id);
    setEditKode(node.kode || '');
    setEditName(node.name || '');
    setEditPagu(node.pagu || 0);
    setEditLockPagu(node.lockPagu || 0);
  };

  const handleEditSubmit = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editName.trim()) return;
    await onEdit(
      id,
      editKode.trim(),
      editName.trim(),
      Number(editPagu) || 0,
      Number(editLockPagu) || 0,
    );
    setEditingNodeId(null);
  };

  const handleNavigate = (node) => {
    if (editingNodeId === node.id) return; // Prevent navigation while editing
    if (currentLevelIndex >= hierarchy.length - 1) return; // reached end
    setCurrentPath([...currentPath, node]);
  };

  const handleNavigateUp = (index) => {
    if (index === -1) {
      setCurrentPath([]);
    } else {
      setCurrentPath(currentPath.slice(0, index + 1));
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* Breadcrumb Header */}
      <div className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-700 p-4 flex flex-wrap items-center gap-2 text-sm font-medium">
        <button
          onClick={() => handleNavigateUp(-1)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${currentPath.length === 0 ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold' : 'text-slate-600 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-200'}`}
        >
          <FaFolderOpen
            className={
              currentPath.length === 0
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-400 dark:text-slate-500'
            }
          />
          Root (Tahun)
        </button>

        {currentPath.map((node, index) => (
          <div key={node.id} className="flex items-center gap-2">
            <FaChevronRight className="text-slate-400 dark:text-slate-500 text-xs" />
            <button
              onClick={() => handleNavigateUp(index)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${index === currentPath.length - 1 ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold' : 'text-slate-600 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-200'}`}
              title={node.name}
            >
              {node.kode || node.name}
            </button>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
        <div className="text-slate-600 dark:text-slate-400 dark:text-slate-500 font-semibold">
          {childType ? `Daftar ${childType}` : 'Item Terakhir (Akun)'}
        </div>
        {childType && (
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm"
          >
            <FaPlus size={12} /> Tambah {childType}
          </button>
        )}
      </div>

      {/* Add Form */}
      {isAdding && childType && (
        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100">
          <form onSubmit={handleAdd} className="flex gap-3 max-w-2xl items-center">
            <input
              type="number"
              value={newPagu}
              onChange={(e) => setNewPagu(e.target.value)}
              placeholder="Pagu"
              className="w-28 shrink-0 text-sm py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 dark:text-slate-300 text-right"
            />
            <input
              type="number"
              value={newLockPagu}
              onChange={(e) => setNewLockPagu(e.target.value)}
              placeholder="Lock Pagu"
              className="w-28 shrink-0 text-sm py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-700 dark:text-slate-300 text-right"
            />
            <input
              type="text"
              autoFocus
              value={newKode}
              onChange={(e) => setNewKode(e.target.value)}
              placeholder="Kode"
              className="w-24 p-2 border border-indigo-200 dark:border-indigo-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 shadow-sm font-bold text-sm text-slate-700 dark:text-slate-300"
            />
            <span className="text-slate-400 dark:text-slate-500 font-bold">-</span>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={`Keterangan ${childType}...`}
              className="flex-1 p-2 border border-indigo-200 dark:border-indigo-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 shadow-sm text-sm text-slate-700 dark:text-slate-300 font-medium"
            />
            <button
              type="submit"
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 ml-2"
            >
              Simpan
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-slate-500 dark:text-slate-400 dark:text-slate-500 text-sm hover:text-slate-700 dark:text-slate-300 font-medium px-2"
            >
              Batal
            </button>
          </form>
        </div>
      )}

      {/* Item List */}
      <div className="flex-1 overflow-y-auto p-4 min-h-[300px]">
        {currentChildren.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 p-8">
            <FaFolderOpen size={48} className="mb-4 opacity-20" />
            <p>Belum ada item di level ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentChildren.map((node) => {
              const typeStyle =
                TYPE_COLORS[node.type] ||
                'text-slate-600 dark:text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700';
              const isLastLevel = currentLevelIndex >= hierarchy.length - 1;
              const isEditing = editingNodeId === node.id;

              return (
                <div
                  key={node.id}
                  onClick={() => handleNavigate(node)}
                  className={`flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all group ${isLastLevel || isEditing ? 'cursor-default' : 'cursor-pointer hover:border-indigo-300 dark:border-indigo-700 hover:shadow-md'}`}
                >
                  <div className={`p-3 rounded-xl border ${typeStyle}`}>
                    <FaFolder size={20} />
                  </div>

                  {isEditing ? (
                    <form
                      onSubmit={(e) => handleEditSubmit(e, node.id)}
                      className="flex-1 flex flex-col gap-2 min-w-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex gap-2 w-full">
                        {node.type !== hierarchy[0] && (
                          <input
                            type="text"
                            autoFocus
                            value={editKode}
                            onChange={(e) => setEditKode(e.target.value)}
                            placeholder="Kode"
                            className="w-1/3 p-1.5 border border-indigo-300 dark:border-indigo-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold"
                          />
                        )}
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Keterangan..."
                          className="flex-1 p-1.5 border border-indigo-300 dark:border-indigo-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                        />
                        <input
                          type="number"
                          value={editPagu}
                          onChange={(e) => setEditPagu(e.target.value)}
                          placeholder="Pagu"
                          className="w-28 shrink-0 text-sm py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 dark:text-slate-300 text-right"
                        />
                        <input
                          type="number"
                          value={editLockPagu}
                          onChange={(e) => setEditLockPagu(e.target.value)}
                          placeholder="Lock Pagu"
                          className="w-28 shrink-0 text-sm py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-700 dark:text-slate-300 text-right"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="flex-1 bg-indigo-600 text-white text-xs py-1.5 rounded-md hover:bg-indigo-700"
                        >
                          Simpan
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingNodeId(null)}
                          className="flex-1 bg-slate-200 text-slate-600 dark:text-slate-400 dark:text-slate-500 text-xs py-1.5 rounded-md hover:bg-slate-300"
                        >
                          Batal
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
                          {node.type}
                        </p>
                        <p
                          className="text-sm text-slate-800 dark:text-slate-200 truncate"
                          title={`${node.kode ? node.kode + ' - ' : ''}${node.name}`}
                        >
                          {node.kode ? <strong className="font-bold">{node.kode}</strong> : null}
                          {node.kode ? ' - ' : ''}
                          <span className="font-medium">{node.name}</span>
                        </p>
                        {node.pagu > 0 && (
                          <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                            Pagu: Rp {new Intl.NumberFormat('id-ID').format(node.pagu)}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => startEditing(node, e)}
                          className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:bg-indigo-900/20 rounded-lg"
                          title="Edit"
                        >
                          <FaPen size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(node.id);
                          }}
                          className="p-1.5 text-rose-400 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:bg-rose-900/20 rounded-lg"
                          title="Hapus"
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
