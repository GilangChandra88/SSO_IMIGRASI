import { useState, useRef, useEffect } from 'react';
import {
  FaPlus,
  FaTrash,
  FaPen,
  FaChevronDown,
  FaChevronRight,
  FaFolder,
  FaFolderOpen,
  FaLayerGroup,
} from 'react-icons/fa';

const TYPE_COLORS = {
  Tahun:
    'text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-900 shadow-sm border-indigo-200 dark:border-indigo-800',
  Program:
    'text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-900 shadow-sm border-blue-200 dark:border-blue-800',
  Kegiatan:
    'text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900 shadow-sm border-emerald-200 dark:border-emerald-800',
  KRO: 'text-amber-700 dark:text-amber-400 bg-white dark:bg-slate-900 shadow-sm border-amber-200 dark:border-amber-800',
  OUTPUT:
    'text-orange-700 dark:text-orange-400 bg-white dark:bg-slate-900 shadow-sm border-orange-200 dark:border-orange-800',
  Output:
    'text-orange-700 dark:text-orange-400 bg-white dark:bg-slate-900 shadow-sm border-orange-200 dark:border-orange-800',
  KOMPONEN:
    'text-rose-700 dark:text-rose-400 bg-white dark:bg-slate-900 shadow-sm border-rose-200 dark:border-rose-800',
  Komponen:
    'text-rose-700 dark:text-rose-400 bg-white dark:bg-slate-900 shadow-sm border-rose-200 dark:border-rose-800',
  'SUB KOMPONEN':
    'text-pink-700 dark:text-pink-400 bg-white dark:bg-slate-900 shadow-sm border-pink-200 dark:border-pink-800',
  'Sub Komponen':
    'text-pink-700 dark:text-pink-400 bg-white dark:bg-slate-900 shadow-sm border-pink-200 dark:border-pink-800',
  AKUN: 'text-purple-700 dark:text-purple-400 bg-white dark:bg-slate-900 shadow-sm border-purple-200 dark:border-purple-800',
  Akun: 'text-purple-700 dark:text-purple-400 bg-white dark:bg-slate-900 shadow-sm border-purple-200 dark:border-purple-800',
  Seksi:
    'text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-900 shadow-sm border-blue-200 dark:border-blue-800',
  KOP: 'text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-900 shadow-sm border-indigo-200 dark:border-indigo-800',
  'Kode surat 1':
    'text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900 shadow-sm border-emerald-200 dark:border-emerald-800',
  'Kode surat 2':
    'text-amber-700 dark:text-amber-400 bg-white dark:bg-slate-900 shadow-sm border-amber-200 dark:border-amber-800',
  'Kode surat 3':
    'text-orange-700 dark:text-orange-400 bg-white dark:bg-slate-900 shadow-sm border-orange-200 dark:border-orange-800',
  Item: 'text-teal-700 dark:text-teal-400 bg-white dark:bg-slate-900 shadow-sm border-teal-200 dark:border-teal-800',
};

const WRAPPER_COLORS = {
  Tahun: 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700',
  Program: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
  Kegiatan: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700',
  KRO: 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700',
  Output: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700',
  OUTPUT: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700',
  Komponen: 'bg-rose-100 dark:bg-rose-900/30 border-rose-300 dark:border-rose-700',
  KOMPONEN: 'bg-rose-100 dark:bg-rose-900/30 border-rose-300 dark:border-rose-700',
  'Sub Komponen': 'bg-pink-100 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700',
  'SUB KOMPONEN': 'bg-pink-100 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700',
  Akun: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700',
  AKUN: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700',
  Seksi: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
  KOP: 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700',
  'Kode surat 1':
    'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700',
  'Kode surat 2': 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700',
  'Kode surat 3': 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700',
  Item: 'bg-teal-100 dark:bg-teal-900/30 border-teal-300 dark:border-teal-700',
};

const MakNode = ({
  node,
  allNodes,
  levelIndex,
  onAdd,
  onDelete,
  onEdit,
  hierarchy,
  focusedPath,
}) => {
  const [expanded, setExpanded] = useState(true);
  const nodeRef = useRef(null);

  // Auto-scroll and highlight if this node is the target of search
  const isFocused = focusedPath && focusedPath[focusedPath.length - 1] === node.id;
  useEffect(() => {
    if (isFocused && nodeRef.current) {
      setTimeout(() => {
        nodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [isFocused]);

  // Adding state
  const [isAdding, setIsAdding] = useState(false);
  const [newKode, setNewKode] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newPagu, setNewPagu] = useState(0);
  const [newLockPagu, setNewLockPagu] = useState(0);

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editKode, setEditKode] = useState(node.kode || '');
  const [editName, setEditName] = useState(node.name || '');
  const [editPagu, setEditPagu] = useState(node.pagu || 0);
  const [editLockPagu, setEditLockPagu] = useState(node.lockPagu || 0);

  const childType = hierarchy[levelIndex + 1];
  const children = allNodes.filter((n) => n.parentId === node.id);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    await onAdd(
      newKode.trim(),
      newItemName.trim(),
      childType,
      node.id,
      Number(newPagu) || 0,
      Number(newLockPagu) || 0,
    );
    setNewKode('');
    setNewItemName('');
    setNewPagu(0);
    setNewLockPagu(0);
    setIsAdding(false);
    setExpanded(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    await onEdit(
      node.id,
      editKode.trim(),
      editName.trim(),
      Number(editPagu) || 0,
      Number(editLockPagu) || 0,
    );
    setIsEditing(false);
  };

  const typeStyle =
    TYPE_COLORS[node.type] ||
    'text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 shadow-sm border-slate-300 dark:border-slate-700';
  const wrapperStyle =
    WRAPPER_COLORS[node.type] || 'bg-slate-100 border-slate-300 dark:border-slate-700';
  const bgClass = wrapperStyle
    .split(' ')
    .filter((c) => c.includes('bg-'))
    .join(' '); // Extract background color classes

  return (
    <div
      ref={nodeRef}
      className={`mt-3 rounded-2xl border transition-all duration-300 ${wrapperStyle} ${isFocused ? 'ring-4 ring-indigo-400 shadow-lg' : 'shadow-sm'}`}
    >
      {/* Node Header Card - Fixed 3rem height for perfect sticky stacking without overlap */}
      <div
        className={`flex items-center gap-2 sticky px-2 py-2 transition-all duration-200 group ${bgClass} rounded-t-2xl border-b border-black/10 shadow-sm`}
        style={{
          top: `${levelIndex * 3}rem`,
          height: '3rem',
          zIndex: 50 - levelIndex,
        }}
      >
        {/* Expand/Collapse Button */}
        <div className="flex items-center justify-center w-6 shrink-0">
          {children.length > 0 ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:text-indigo-400 transition-colors p-1 rounded-full hover:bg-white dark:hover:bg-slate-700 dark:bg-slate-900"
            >
              {expanded ? <FaChevronDown size={14} /> : <FaChevronRight size={14} />}
            </button>
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
          )}
        </div>

        {/* Icon */}
        <div
          className={`flex items-center justify-center w-8 h-8 rounded-lg border shrink-0 ${typeStyle}`}
        >
          {expanded && children.length > 0 ? <FaFolderOpen size={14} /> : <FaFolder size={14} />}
        </div>

        {/* Content or Edit Form */}
        {isEditing ? (
          <form onSubmit={handleEdit} className="flex-1 flex gap-2 items-center mr-2 min-w-0">
            {node.type !== hierarchy[0] && (
              <>
                <input
                  type="text"
                  autoFocus
                  value={editKode}
                  onChange={(e) => setEditKode(e.target.value)}
                  placeholder="Kode"
                  className="w-16 text-xs py-1 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 dark:text-slate-300"
                />
                <span className="text-slate-400 dark:text-slate-500 font-bold">-</span>
              </>
            )}
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder={`Keterangan...`}
              className="flex-1 min-w-0 text-xs py-1 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-medium"
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
            <button
              type="submit"
              className="bg-indigo-600 text-white px-2 py-1 rounded-md text-xs font-semibold hover:bg-indigo-700"
            >
              OK
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:text-slate-500 p-1 text-xs"
            >
              Batal
            </button>
          </form>
        ) : (
          <div className="flex items-center flex-1 min-w-0 pr-2 gap-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900/60 px-1.5 py-0.5 rounded shadow-sm border border-black/5 dark:border-white/10 shrink-0">
              {node.type}
            </span>
            <span className="text-sm text-slate-800 dark:text-slate-200 truncate">
              {node.kode ? <strong className="font-bold">{node.kode}</strong> : null}
              {node.kode ? ' - ' : ''}
              <span className="font-medium">{node.name}</span>
            </span>
            {node.pagu > 0 && (
              <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded border border-emerald-100 shrink-0 ml-auto">
                Rp {new Intl.NumberFormat('id-ID').format(node.pagu)}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        {!isEditing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0 bg-white dark:bg-slate-900/50 px-1.5 py-0.5 rounded-lg">
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center justify-center w-8 h-8 rounded-full text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors shadow-sm"
              title="Edit"
            >
              <FaPen size={12} />
            </button>
            {childType && (
              <button
                onClick={() => setIsAdding(!isAdding)}
                className="flex items-center justify-center w-8 h-8 rounded-full text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:text-emerald-400 hover:bg-white dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors shadow-sm"
                title={`Tambah ${childType}`}
              >
                <FaPlus size={12} />
              </button>
            )}
            <button
              onClick={() => onDelete(node.id)}
              className="flex items-center justify-center w-8 h-8 rounded-full text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:text-rose-400 hover:bg-white dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors shadow-sm"
              title="Hapus"
            >
              <FaTrash size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Children Container */}
      {expanded && (
        <div className="ml-2 sm:ml-6 mt-1 flex flex-col gap-1 border-l-2 border-white/40 pl-2 sm:pl-4 pb-3 sm:pb-4 pr-3 sm:pr-6">
          {children.length > 0 &&
            children.map((child) => (
              <MakNode
                key={child.id}
                node={child}
                allNodes={allNodes}
                levelIndex={levelIndex + 1}
                onAdd={onAdd}
                onDelete={onDelete}
                onEdit={onEdit}
                hierarchy={hierarchy}
                focusedPath={focusedPath}
              />
            ))}

          {isAdding && (
            <div className="mt-3 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-white dark:bg-slate-900/60 p-3 shadow-sm ring-2 ring-indigo-100 backdrop-blur-sm">
              <form onSubmit={handleAdd} className="flex gap-2 items-center">
                <div className="text-indigo-400 mr-1 shrink-0">
                  <FaLayerGroup size={14} />
                </div>
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
                  className="w-24 shrink-0 text-sm py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-bold"
                />
                <span className="text-slate-400 dark:text-slate-500 font-bold shrink-0">-</span>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder={`Keterangan ${childType}...`}
                  className="flex-1 min-w-0 text-sm py-1.5 px-2 bg-transparent focus:outline-none text-slate-700 dark:text-slate-300 placeholder-slate-400 font-medium border-b border-transparent focus:border-indigo-300 dark:border-indigo-700"
                />
                <div className="flex gap-2 shrink-0 ml-auto pl-2">
                  <button
                    type="submit"
                    className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-all"
                  >
                    Simpan
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:text-slate-500 p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 dark:bg-slate-900"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function ViewTree({ nodes, hierarchy, onAdd, onDelete, onEdit, focusedPath }) {
  const [isAddingRoot, setIsAddingRoot] = useState(false);
  const [rootName, setRootName] = useState('');
  const [rootPagu, setRootPagu] = useState(0);
  const [rootLockPagu, setRootLockPagu] = useState(0);

  const handleAddRoot = async (e) => {
    e.preventDefault();
    if (!rootName.trim()) return;
    await onAdd(
      '',
      rootName.trim(),
      hierarchy[0],
      null,
      Number(rootPagu) || 0,
      Number(rootLockPagu) || 0,
    );
    setRootName('');
    setRootPagu(0);
    setRootLockPagu(0);
    setIsAddingRoot(false);
  };

  const rootNodes = nodes.filter((n) => n.parentId === null && n.type === hierarchy[0]);

  return (
    <div className="pb-12 pt-4">
      <div className="min-w-full pr-4">
        {rootNodes.map((node) => (
          <div key={node.id} className="mb-8 relative">
            <MakNode
              node={node}
              allNodes={nodes}
              levelIndex={0}
              onAdd={onAdd}
              onDelete={onDelete}
              onEdit={onEdit}
              hierarchy={hierarchy}
              focusedPath={focusedPath}
            />
          </div>
        ))}

        {/* Tambah Tahun Button at the bottom */}
        <div className="mt-4 w-full">
          {isAddingRoot ? (
            <form
              onSubmit={handleAddRoot}
              className="flex gap-2 items-center bg-white dark:bg-slate-900 p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-sm w-full"
            >
              <div className="text-indigo-400 mr-2 shrink-0">
                <FaFolder size={16} />
              </div>
              <input
                type="number"
                value={rootPagu}
                onChange={(e) => setRootPagu(e.target.value)}
                placeholder="Pagu"
                className="w-28 shrink-0 text-sm py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 dark:text-slate-300 text-right"
              />
              <input
                type="number"
                value={rootLockPagu}
                onChange={(e) => setRootLockPagu(e.target.value)}
                placeholder="Lock Pagu"
                className="w-28 shrink-0 text-sm py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-700 dark:text-slate-300 text-right"
              />
              <input
                type="text"
                autoFocus
                value={rootName}
                onChange={(e) => setRootName(e.target.value)}
                placeholder={`Tambah ${hierarchy[0]}...`}
                className="w-56 text-sm py-1.5 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              />
              <div className="flex gap-2 shrink-0 ml-auto pl-2">
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingRoot(false)}
                  className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:text-slate-500 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsAddingRoot(true)}
              className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:text-indigo-400 hover:border-indigo-300 dark:border-indigo-700 hover:bg-indigo-50 dark:bg-indigo-900/20 transition-all"
            >
              <FaPlus size={14} /> Tambah {hierarchy[0]}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
