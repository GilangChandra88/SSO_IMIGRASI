import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-lg w-full rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-800 p-6 shadow-sm">
            <h1 className="text-lg font-bold text-rose-700 dark:text-rose-400">
              Terjadi kesalahan pada aplikasi
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Muat ulang halaman. Bila masalah berulang, laporkan ke admin aplikasi beserta waktu
              kejadian dan halaman yang sedang dibuka.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 rounded-xl bg-[#0f2040] text-white text-sm font-bold"
            >
              Muat ulang
            </button>
            {/* Detail teknis hanya saat pengembangan; di produksi tidak ditampilkan (K34) */}
            {import.meta.env.DEV && this.state.error && (
              <pre className="mt-4 p-3 max-h-80 overflow-auto rounded-lg border border-rose-200 bg-rose-50 text-[11px] text-rose-900 whitespace-pre-wrap">
                {this.state.error.message}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </StrictMode>,
);
