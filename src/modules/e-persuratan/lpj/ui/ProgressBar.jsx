import React from 'react';

/**
 * Bilah progres tanpa inline style. Warna lintasan & isian lewat kelas pseudo-element, mis.
 * track: 'bg-white/15 [&::-webkit-progress-bar]:bg-white/15'
 * fill:  '[&::-webkit-progress-value]:bg-sky-300 [&::-moz-progress-bar]:bg-sky-300'
 */
export default function ProgressBar({ value, className = '' }) {
  const v = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <progress
      value={v}
      max={100}
      aria-label={`${v}% selesai`}
      className={`block w-full appearance-none border-0 overflow-hidden [&::-webkit-progress-value]:transition-all ${className}`}
    />
  );
}
