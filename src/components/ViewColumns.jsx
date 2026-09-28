import { useState, useEffect, useRef } from 'react';
import { FaPlus, FaTrash, FaPen, FaChevronRight, FaFolder } from 'react-icons/fa';

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

export default function ViewColumns({ nodes, hierarchy, onAdd, onDelete, onEdit, focusedPath }) {
  const [selectedPath, setSelectedPath] = useState([]); // array of selected node IDs
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (focusedPath) {
      setSelectedPath(focusedPath);
    }
  }, [focusedPath]);

  // When selectedPath changes, scroll right
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [selectedPath]);

  const handleSelect = (levelIndex, node) => {
    const newPath = selectedPath.slice(0, levelIndex);
    newPath.push(node.id);
    setSelectedPath(newPath);
  };

  // Build the columns to render
  const columns = [];

  // First column: Root (Tahun)
  columns.push({
    levelIndex: 0,
    type: hierarchy[0],
    parentId: null,
    items: nodes.filter((n) => n.parentId === null),
  });

  // Subsequent columns based on selectedPath
  for (let i = 0; i < selectedPath.length; i++) {
    const parentId = selectedPath[i];
    const levelIndex = i + 1;
    if (levelIndex < hierarchy.length) {
      columns.push({
        levelIndex,
        type: hierarchy[levelIndex],
        parentId: parentId,
        items: nodes.filter((n) => n.parentId === parentId),
      });
    }
  }

  return (
    <div
      ref={scrollContainerRef}
      className="flex gap-4 overflow-x-auto pb-4 flex-1 h-full min-h-[500px] snap-x p-6 bg-slate-50 dark:bg-slate-950"
    >
      {columns.map((col) => (
        <Column
          key={col.levelIndex}
          column={col}
          hierarchy={hierarchy}
          selectedId={selectedPath[col.levelIndex]}
          onSelect={(node) => handleSelect(col.levelIndex, node)}
          onAdd={onAdd}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}

function Column({ column, hierarchy, selectedId, onSelect, onAdd, onDelete, onEdit }) {
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

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    await onAdd(
      newKode.trim(),
      newItemName.trim(),
      column.type,
      column.parentId,
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

  return (
    <div className="flex flex-col min-w-[320px] max-w-[320px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm snap-start shrink-0 h-full">
      {/* Column Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950 rounded-t-2xl">
        <h3 className="font-bold text-slate-700 dark:text-slate-300">{column.type}</h3>
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 bg-slate-200 px-2 py-1 rounded-full">
          {column.items.length}
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2">
        {column.items.length === 0 ? (
          <div className="text-center p-6 text-sm text-slate-400 dark:text-slate-500">
            Kosong. Tambahkan item di bawah.
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {column.items.map((node) => {
              const isSelected = selectedId === node.id;
              const typeStyle =
                TYPE_COLORS[node.type] ||
                'text-slate-600 dark:text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700';
              const isEditing = editingNodeId === node.id;

              return (
                <div
                  key={node.id}
                  onClick={() => !isEditing && onSelect(node)}
                  className={`group flex items-start gap-3 p-3 rounded-xl transition-all border ${isEditing ? 'bg-white dark:bg-slate-900 border-indigo-300 dark:border-indigo-700 shadow-sm' : isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 shadow-sm cursor-pointer' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-950 hover:border-slate-200 dark:border-slate-700 cursor-pointer'}`}
                >
                  <div
                    className={`p-2 rounded-lg border mt-0.5 ${isSelected && !isEditing ? typeStyle : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'}`}
                  >
                    <FaFolder size={14} />
                  </div>

                  {isEditing ? (
                    <form
                      onSubmit={(e) => handleEditSubmit(e, node.id)}
                      className="flex-1 flex flex-col gap-2 min-w-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {node.type !== hierarchy[0] && (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            autoFocus={node.type !== hierarchy[0]}
                            value={editKode}
                            onChange={(e) => setEditKode(e.target.value)}
                            placeholder="Kode"
                            className="w-16 text-xs py-1 px-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 dark:text-slate-300 shadow-sm"
                          />
                          <span className="text-slate-400 dark:text-slate-500 font-bold">-</span>
                        </div>
                      )}
                      <input
                        type="text"
                        autoFocus={node.type === hierarchy[0]}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Keterangan..."
                        className="w-full p-1.5 border border-indigo-300 dark:border-indigo-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                      />
                      <input
                        type="number"
                        value={editPagu}
                        onChange={(e) => setEditPagu(e.target.value)}
                        placeholder="Pagu"
                        className="w-full text-sm py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 dark:text-slate-300 text-right"
                      />
                      <input
                        type="number"
                        value={editLockPagu}
                        onChange={(e) => setEditLockPagu(e.target.value)}
                        placeholder="Lock Pagu"
                        className="w-full text-sm py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-700 dark:text-slate-300 text-right"
                      />
                      <div className="flex gap-2 mt-1">
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
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p
                          className={`text-sm ${isSelected ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}
                        >
                          {node.kode ? (
                            <strong className="font-bold block text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-0.5">
                              {node.kode}
                            </strong>
                          ) : null}
                          <span className={`font-medium ${node.kode ? 'line-clamp-2' : ''}`}>
                            {node.name}
                          </span>
                        </p>
                        {node.pagu > 0 && (
                          <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                            Rp {new Intl.NumberFormat('id-ID').format(node.pagu)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity self-center">
                        <button
                          onClick={(e) => startEditing(node, e)}
                          className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:bg-indigo-900/30 rounded-md"
                          title="Edit"
                        >
                          <FaPen size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(node.id);
                          }}
                          className="p-1.5 text-rose-400 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:bg-rose-900/30 rounded-md"
                          title="Hapus"
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>

                      {/* Arrow for selection indicator */}
                      {!isSelected && (
                        <FaChevronRight
                          className="text-slate-300 ml-1 opacity-0 group-hover:opacity-100 self-center"
                          size={14}
                        />
                      )}
                      {isSelected && (
                        <FaChevronRight className="text-indigo-500 ml-1 self-center" size={14} />
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Footer */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-b-2xl">
        {isAdding ? (
          <form onSubmit={handleAdd} className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="text"
                autoFocus
                value={newKode}
                onChange={(e) => setNewKode(e.target.value)}
                placeholder="Kode"
                className="w-1/3 p-2 text-sm border border-indigo-200 dark:border-indigo-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 font-bold"
              />
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder={`Keterangan ${column.type}...`}
                className="w-2/3 p-2 text-sm border border-indigo-200 dark:border-indigo-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={newPagu}
                onChange={(e) => setNewPagu(e.target.value)}
                placeholder="Pagu"
                className="w-1/2 p-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-900 text-right"
              />
              <input
                type="number"
                value={newLockPagu}
                onChange={(e) => setNewLockPagu(e.target.value)}
                placeholder="Lock Pagu"
                className="w-1/2 p-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-slate-900 text-right"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-indigo-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Simpan
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="flex-1 bg-slate-200 text-slate-600 dark:text-slate-400 dark:text-slate-500 text-xs font-bold py-2 rounded-lg hover:bg-slate-300 transition-colors"
              >
                Batal
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:text-indigo-400 hover:border-indigo-300 dark:border-indigo-700 hover:bg-indigo-50 dark:bg-indigo-900/20 transition-all"
          >
            <FaPlus size={12} /> Tambah {column.type}
          </button>
        )}
      </div>
    </div>
  );
}
