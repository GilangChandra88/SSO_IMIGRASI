/**
 * FlowView — Diagram Visual Aliran Surat (Ala Figma)
 * ====================================================
 * Visualisasi hubungan antar surat menggunakan SVG murni.
 * Fitur:
 *  - Node surat bisa di-drag
 *  - Garis koneksi beranimasi "aliran listrik" (animated dash)
 *  - Zoom in/out dengan scroll/pinch
 *  - Pan dengan drag di area kosong
 *  - Highlight node & koneksi saat di-klik
 *  - Tooltip label koneksi
 *
 * Tidak perlu install library tambahan (no ReactFlow, no D3).
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import SuratNode, { NODE_W, NODE_H } from './SuratNode';
import { FaSearchPlus, FaSearchMinus, FaExpand, FaSync } from 'react-icons/fa';

// Warna garis per tipe koneksi
const CONNECTION_COLORS = {
  triggers: '#6366f1', // indigo — surat A memicu surat B
  requires: '#f59e0b', // amber  — surat A butuh surat B lebih dulu
  references: '#10b981', // emerald — surat A mereferensi surat B
  default: '#94a3b8', // slate
};

// Label tipe koneksi
const CONNECTION_LABELS = {
  triggers: 'Memicu →',
  requires: 'Butuh',
  references: 'Referensi',
};

/**
 * Hitung jalur kurva cubic bezier antara dua node
 */
function buildPath(fromX, fromY, toX, toY) {
  const dx = Math.abs(toX - fromX);
  const cx = Math.min(dx * 0.6, 120);
  return `M ${fromX} ${fromY} C ${fromX + cx} ${fromY}, ${toX - cx} ${toY}, ${toX} ${toY}`;
}

/**
 * @param {{
 *   suratList: object[],
 *   highlightId: string|null,
 *   onSelectSurat: (surat: object) => void
 * }} props
 */
export default function FlowView({ suratList, highlightId, onSelectSurat }) {
  const svgRef = useRef(null);

  // Posisi tiap node (id → {x, y})
  const [positions, setPositions] = useState(() => buildInitialPositions(suratList));
  const [selectedId, setSelectedId] = useState(highlightId || null);

  // Kamera (pan + zoom)
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });

  // State drag node
  const draggingNode = useRef(null);
  // State pan (drag canvas)
  const panStart = useRef(null);

  // Sinkronisasi posisi saat suratList berubah (ada surat baru)
  useEffect(() => {
    setPositions((prev) => {
      const next = { ...prev };
      suratList.forEach((s) => {
        if (!next[s.id]) {
          next[s.id] = s.nodePosition || {
            x: 80 + Math.random() * 400,
            y: 80 + Math.random() * 300,
          };
        }
      });
      return next;
    });
  }, [suratList]);

  // Highlight dari luar (saat klik "Lihat di Flow" dari CardView)
  useEffect(() => {
    if (highlightId) {
      setSelectedId(highlightId);
      // Pan ke node tersebut
      const pos = positions[highlightId];
      if (pos) {
        setCamera((c) => ({
          ...c,
          x: -pos.x * c.scale + 300,
          y: -pos.y * c.scale + 200,
        }));
      }
    }
  }, [highlightId]); // eslint-disable-line

  // ─── Mouse handlers: drag node ─────────────────────────────────────────────
  const handleNodeDragStart = useCallback(
    (e, suratId) => {
      e.stopPropagation();
      const svgRect = svgRef.current.getBoundingClientRect();
      draggingNode.current = {
        id: suratId,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startNodeX: positions[suratId]?.x || 0,
        startNodeY: positions[suratId]?.y || 0,
      };
      setSelectedId(suratId);
    },
    [positions],
  );

  // ─── Mouse handlers: pan canvas ────────────────────────────────────────────
  const handleSvgMouseDown = useCallback(
    (e) => {
      if (e.target === svgRef.current || e.target.tagName === 'svg') {
        panStart.current = { x: e.clientX - camera.x, y: e.clientY - camera.y };
      }
    },
    [camera],
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (draggingNode.current) {
        const { id, startMouseX, startMouseY, startNodeX, startNodeY } = draggingNode.current;
        const dx = (e.clientX - startMouseX) / camera.scale;
        const dy = (e.clientY - startMouseY) / camera.scale;
        setPositions((prev) => ({
          ...prev,
          [id]: { x: startNodeX + dx, y: startNodeY + dy },
        }));
      } else if (panStart.current) {
        setCamera((c) => ({
          ...c,
          x: e.clientX - panStart.current.x,
          y: e.clientY - panStart.current.y,
        }));
      }
    },
    [camera.scale],
  );

  const handleMouseUp = useCallback(() => {
    draggingNode.current = null;
    panStart.current = null;
  }, []);

  // ─── Zoom ──────────────────────────────────────────────────────────────────
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setCamera((c) => ({
      ...c,
      scale: Math.min(Math.max(c.scale * delta, 0.3), 3),
    }));
  }, []);

  const zoomIn = () => setCamera((c) => ({ ...c, scale: Math.min(c.scale * 1.2, 3) }));
  const zoomOut = () => setCamera((c) => ({ ...c, scale: Math.max(c.scale / 1.2, 0.3) }));
  const resetCamera = () => setCamera({ x: 0, y: 0, scale: 1 });

  // ─── Kumpulkan semua koneksi ───────────────────────────────────────────────
  const connections = [];
  suratList.forEach((surat) => {
    (surat.connections || []).forEach((conn) => {
      connections.push({
        fromId: surat.id,
        toId: conn.targetSuratId,
        type: conn.type || 'default',
        label: conn.label || CONNECTION_LABELS[conn.type] || '',
      });
    });
  });

  // ─── Highlight logic ───────────────────────────────────────────────────────
  const relatedIds = new Set();
  if (selectedId) {
    relatedIds.add(selectedId);
    connections.forEach((c) => {
      if (c.fromId === selectedId) relatedIds.add(c.toId);
      if (c.toId === selectedId) relatedIds.add(c.fromId);
    });
  }

  return (
    <div
      className="relative flex-1 w-full h-full bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
      style={{ minHeight: '520px' }}
    >
      {/* Dot-grid background */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="dot-grid"
            x={camera.x % 24}
            y={camera.y % 24}
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r="1" fill="#cbd5e1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dot-grid)" />
      </svg>

      {/* ── Toolbar kamera ── */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5">
        {[
          { icon: <FaSearchPlus size={13} />, action: zoomIn, title: 'Zoom In' },
          { icon: <FaSearchMinus size={13} />, action: zoomOut, title: 'Zoom Out' },
          { icon: <FaExpand size={13} />, action: resetCamera, title: 'Reset View' },
        ].map(({ icon, action, title }) => (
          <button
            key={title}
            onClick={action}
            title={title}
            className="w-8 h-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm
                       flex items-center justify-center text-slate-500 dark:text-slate-400
                       hover:text-indigo-600 hover:border-indigo-300 transition-colors"
          >
            {icon}
          </button>
        ))}
      </div>

      {/* Scale indicator */}
      <div className="absolute bottom-4 right-4 z-20">
        <span className="text-[10px] font-mono text-slate-400 bg-white dark:bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
          {Math.round(camera.scale * 100)}%
        </span>
      </div>

      {/* Hint */}
      {suratList.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center text-slate-400">
            <FaSync size={36} className="mx-auto mb-3 opacity-20" />
            <p className="font-medium text-sm">Belum ada surat terdaftar.</p>
            <p className="text-xs mt-1">Tambahkan surat dari tab Kartu Surat.</p>
          </div>
        </div>
      )}

      {/* Empty connections hint */}
      {suratList.length > 0 && connections.length === 0 && (
        <div className="absolute bottom-4 left-4 z-10 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            💡 Belum ada koneksi antar surat. Hubungkan dengan mengatur{' '}
            <code className="bg-slate-100 dark:bg-slate-800/50 px-1 rounded">connections</code> di
            definisi surat.
          </p>
        </div>
      )}

      {/* ── Main SVG Canvas ── */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        style={{ cursor: panStart.current ? 'grabbing' : 'default' }}
        onMouseDown={handleSvgMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Animasi CSS untuk aliran listrik */}
        <defs>
          <style>{`
            @keyframes flowDash {
              to { stroke-dashoffset: -24; }
            }
            .flow-line-animated {
              animation: flowDash 0.8s linear infinite;
            }
            .flow-line-slow {
              animation: flowDash 1.6s linear infinite;
            }
          `}</style>

          {/* Arrow marker untuk tiap warna */}
          {Object.entries(CONNECTION_COLORS).map(([type, color]) => (
            <marker
              key={type}
              id={`arrow-${type}`}
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L0,6 L8,3 z" fill={color} />
            </marker>
          ))}
        </defs>

        {/* Semua konten dalam group yang terkena transform kamera */}
        <g transform={`translate(${camera.x}, ${camera.y}) scale(${camera.scale})`}>
          {/* ── Garis Koneksi ── */}
          {connections.map((conn, i) => {
            const from = positions[conn.fromId];
            const to = positions[conn.toId];
            if (!from || !to) return null;

            const color = CONNECTION_COLORS[conn.type] || CONNECTION_COLORS.default;
            const isHighlighted =
              selectedId && (conn.fromId === selectedId || conn.toId === selectedId);
            const opacity = selectedId && !isHighlighted ? 0.15 : 1;

            // Titik keluar dari kanan node sumber, masuk dari kiri node tujuan
            const x1 = from.x + NODE_W;
            const y1 = from.y + NODE_H / 2;
            const x2 = to.x;
            const y2 = to.y + NODE_H / 2;

            const pathD = buildPath(x1, y1, x2, y2);

            // Titik tengah untuk label
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2 - 12;

            return (
              <g
                key={`${conn.fromId}-${conn.toId}-${i}`}
                style={{ opacity, transition: 'opacity 0.2s' }}
              >
                {/* Garis bayangan (background, tebal) */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={color}
                  strokeWidth={isHighlighted ? 3 : 2}
                  strokeOpacity={0.15}
                />
                {/* Garis animasi "aliran listrik" */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={color}
                  strokeWidth={isHighlighted ? 2.5 : 1.5}
                  strokeDasharray="8 6"
                  strokeLinecap="round"
                  markerEnd={`url(#arrow-${conn.type})`}
                  className={isHighlighted ? 'flow-line-animated' : 'flow-line-slow'}
                />

                {/* Label koneksi */}
                {conn.label && (
                  <g>
                    <rect
                      x={midX - 30}
                      y={midY - 8}
                      width={60}
                      height={16}
                      rx={8}
                      fill="white"
                      stroke={color}
                      strokeWidth={1}
                      opacity={0.9}
                    />
                    <text
                      x={midX}
                      y={midY + 4}
                      textAnchor="middle"
                      fontSize={9}
                      fontWeight="600"
                      fill={color}
                      fontFamily="system-ui, sans-serif"
                    >
                      {conn.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* ── Node Surat ── */}
          {suratList.map((surat) => {
            const pos = positions[surat.id] || { x: 80, y: 80 };
            const isDimmed = selectedId && !relatedIds.has(surat.id);

            return (
              <g key={surat.id} style={{ opacity: isDimmed ? 0.2 : 1, transition: 'opacity 0.2s' }}>
                <SuratNode
                  surat={surat}
                  x={pos.x}
                  y={pos.y}
                  isSelected={selectedId === surat.id}
                  onSelect={() => {
                    setSelectedId(selectedId === surat.id ? null : surat.id);
                    onSelectSurat(surat);
                  }}
                  onDragStart={(e) => handleNodeDragStart(e, surat.id)}
                />
              </g>
            );
          })}
        </g>
      </svg>

      {/* ── Panel detail surat yang dipilih ── */}
      {selectedId &&
        (() => {
          const surat = suratList.find((s) => s.id === selectedId);
          if (!surat) return null;
          const outgoing = connections.filter((c) => c.fromId === selectedId);
          const incoming = connections.filter((c) => c.toId === selectedId);

          return (
            <div className="absolute top-4 left-4 z-20 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{surat.icon || '📄'}</span>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    {surat.kode}
                  </p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                    {surat.nama}
                  </p>
                </div>
              </div>
              {surat.deskripsi && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                  {surat.deskripsi}
                </p>
              )}
              <div className="space-y-1 text-[10px]">
                {outgoing.length > 0 && (
                  <div>
                    <p className="font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      Memicu →
                    </p>
                    {outgoing.map((c) => {
                      const target = suratList.find((s) => s.id === c.toId);
                      return (
                        <p key={c.toId} className="text-indigo-600 font-semibold pl-2">
                          • {target?.kode || c.toId}
                        </p>
                      );
                    })}
                  </div>
                )}
                {incoming.length > 0 && (
                  <div>
                    <p className="font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      ← Dipicu oleh
                    </p>
                    {incoming.map((c) => {
                      const source = suratList.find((s) => s.id === c.fromId);
                      return (
                        <p key={c.fromId} className="text-emerald-600 font-semibold pl-2">
                          • {source?.kode || c.fromId}
                        </p>
                      );
                    })}
                  </div>
                )}
                {outgoing.length === 0 && incoming.length === 0 && (
                  <p className="text-slate-400 italic">Belum ada koneksi.</p>
                )}
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="mt-3 w-full text-[10px] text-slate-400 hover:text-slate-600 text-center"
              >
                ✕ Tutup
              </button>
            </div>
          );
        })()}
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Bangun posisi awal semua node.
 * Pakai nodePosition dari definisi jika ada, kalau tidak auto-layout grid.
 */
function buildInitialPositions(suratList) {
  const positions = {};
  const COLS = 3;
  const GAP_X = NODE_W + 100;
  const GAP_Y = NODE_H + 60;

  suratList.forEach((surat, i) => {
    if (surat.nodePosition) {
      positions[surat.id] = { ...surat.nodePosition };
    } else {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      positions[surat.id] = {
        x: 60 + col * GAP_X,
        y: 60 + row * GAP_Y,
      };
    }
  });

  return positions;
}
