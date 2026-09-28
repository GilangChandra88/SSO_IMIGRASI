import React, { useState } from 'react';
import { auth } from '@/config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock, FaSignInAlt } from 'react-icons/fa';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
      window.dispatchEvent(new Event('triggerSplash'));
    } catch (err) {
      console.error(err);
      setError('Email atau password salah.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-[#020617] font-sans relative overflow-hidden p-4 sm:p-8">
      {/* Keyframes */}
      <style>{`
        .fade-in-up {
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(30,41,59,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.5)_1px,transparent_1px)] bg-[length:40px_40px] opacity-30"></div>

      {/* Glow Effects */}
      <div className="absolute top-0 left-0 w-[30rem] h-[30rem] bg-cyan-600/20 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-[40rem] h-[40rem] bg-cyan-600/20 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3 animate-pulse"></div>

      {/* Core UI */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        {/* Login Card (Glassmorphism) */}
        <div
          className="w-full bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-cyan-500/30 p-8 sm:p-10 fade-in-up"
          style={{ animationDelay: '0.2s', opacity: 0 }}
        >
          <div className="mb-8 text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight">
              Selamat Datang
            </h2>
            <p className="text-cyan-200/60 text-xs sm:text-sm font-medium">
              Otorisasi akses identitas Anda.
            </p>
          </div>

          {error && (
            <div className="bg-rose-500/10 text-rose-400 p-4 rounded-2xl text-sm font-medium mb-6 border border-rose-500/20 flex items-center gap-3">
              <div className="w-1.5 h-full min-h-[24px] rounded-full bg-rose-500"></div>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-cyan-300 mb-2 uppercase tracking-wider">
                Email Kredensial
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-cyan-400/50 group-focus-within:text-cyan-400 transition-colors">
                  <FaEnvelope size={16} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Masukkan email..."
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-950/50 border border-cyan-500/20 rounded-2xl focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all text-white placeholder-cyan-200/30 font-medium text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-cyan-300 mb-2 uppercase tracking-wider">
                Kata Sandi
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-cyan-400/50 group-focus-within:text-cyan-400 transition-colors">
                  <FaLock size={16} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Masukkan sandi..."
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-950/50 border border-cyan-500/20 rounded-2xl focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all text-white placeholder-cyan-200/30 font-medium text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-4 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] active:scale-[0.98] mt-6"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <FaSignInAlt size={16} />
                  <span className="text-xs sm:text-sm tracking-widest uppercase">
                    Otorisasi Masuk
                  </span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
