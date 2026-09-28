import React, { useState, useEffect } from 'react';
import { FaStamp, FaFileSignature, FaLock } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';

export default function SplashScreen({ onFinish }) {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [stamped, setStamped] = useState(false);

  // Ambil data user dari AuthContext
  const { currentUser, userData, loading } = useAuth();

  useEffect(() => {
    // Jangan mulai animasi stempel jika masih loading auth
    if (loading) return;

    // Timing untuk stempel menghantam dokumen
    const stampTimer = setTimeout(() => {
      setStamped(true);
    }, 1000);

    // Memicu fade out layar
    const fadeOutTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 2800);

    // Menghapus komponen
    const finishTimer = setTimeout(() => {
      onFinish();
    }, 3300);

    return () => {
      clearTimeout(stampTimer);
      clearTimeout(fadeOutTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish, loading]);

  const userName = userData?.nama || currentUser?.email?.split('@')[0] || '';

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-[#020617] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 ease-in-out ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Definisi Keyframes */}
      <style>{`
        .hologram-float {
          animation: float 4s ease-in-out infinite;
          transform-style: preserve-3d;
          perspective: 1000px;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotateX(15deg) rotateY(-15deg); filter: drop-shadow(0 0 15px rgba(34,211,238,0.4)); }
          50% { transform: translateY(-20px) rotateX(25deg) rotateY(-5deg); filter: drop-shadow(0 0 30px rgba(34,211,238,0.8)); }
        }
        
        .stamp-strike {
          animation: strike 1.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes strike {
          0% { transform: translateY(-150px) scale(2.5) rotate(20deg); opacity: 0; }
          50% { transform: translateY(-150px) scale(2.5) rotate(20deg); opacity: 0; }
          85% { transform: translateY(15px) scale(0.9) rotate(-10deg); opacity: 1; }
          100% { transform: translateY(0) scale(1) rotate(-5deg); opacity: 1; }
        }
        
        .shockwave {
          animation: ripple 0.8s cubic-bezier(0.0, 0.0, 0.2, 1) forwards;
        }
        @keyframes ripple {
          0% { transform: scale(0.5); opacity: 1; border-width: 8px; }
          100% { transform: scale(3.5); opacity: 0; border-width: 1px; }
        }
        
        .scanline {
          width: 100%;
          height: 3px;
          background: rgba(34,211,238, 0.9);
          position: absolute;
          animation: scan 2s linear infinite;
          box-shadow: 0 0 15px rgba(34,211,238, 1);
          z-index: 50;
        }
        @keyframes scan {
          0% { top: -10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 110%; opacity: 0; }
        }
      `}</style>

      {/* Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(30,41,59,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.5)_1px,transparent_1px)] bg-[length:40px_40px] opacity-30"></div>

      <div className="absolute inset-0 flex items-center justify-center opacity-40">
        <div
          className={`w-[30rem] h-[30rem] rounded-full blur-[150px] animate-pulse ${currentUser ? 'bg-emerald-900/50' : 'bg-rose-900/40'}`}
        ></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center mt-[-40px]">
        {/* Dokumen Hologram */}
        <div className="relative flex items-center justify-center mb-16 hologram-float">
          <div className="absolute inset-[-10%] z-20 overflow-hidden rounded-2xl pointer-events-none">
            <div className="scanline"></div>
          </div>

          <div
            className={`relative bg-slate-900/60 backdrop-blur-md border-2 p-8 rounded-3xl flex flex-col items-center justify-center transform transition-colors duration-1000 ${stamped ? (currentUser ? 'border-emerald-400/60 shadow-[0_0_40px_rgba(16,185,129,0.2)]' : 'border-rose-500/60 shadow-[0_0_40px_rgba(244,63,94,0.2)]') : 'border-slate-500/50 shadow-none'}`}
          >
            {stamped && !currentUser ? (
              <FaLock className="text-rose-500 text-7xl opacity-90 drop-shadow-[0_0_15px_rgba(244,63,94,0.8)]" />
            ) : (
              <FaFileSignature className="text-cyan-400 text-7xl opacity-90 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]" />
            )}
            <div
              className={`w-20 h-1.5 mt-5 rounded-full ${stamped && !currentUser ? 'bg-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-cyan-400/50 shadow-[0_0_10px_rgba(34,211,238,0.5)]'}`}
            ></div>
            <div
              className={`w-14 h-1.5 mt-2.5 rounded-full ${stamped && !currentUser ? 'bg-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-cyan-400/50 shadow-[0_0_10px_rgba(34,211,238,0.5)]'}`}
            ></div>
          </div>

          {/* Stempel hanya muncul jika sudah login */}
          {currentUser && (
            <div className="absolute top-[-20px] right-[-50px] z-30 stamp-strike">
              <FaStamp className="text-emerald-500 text-7xl drop-shadow-[0_0_20px_rgba(16,185,129,0.7)]" />
            </div>
          )}

          {/* Efek Gelombang Kejut */}
          {stamped && currentUser && (
            <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
              <div className="w-48 h-48 border-emerald-500 rounded-full shockwave absolute"></div>
              <div
                className="w-48 h-48 border-emerald-400 rounded-full shockwave absolute"
                style={{ animationDelay: '0.1s' }}
              ></div>
            </div>
          )}
          {stamped && !currentUser && (
            <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
              <div className="w-48 h-48 border-rose-500 rounded-full shockwave absolute"></div>
            </div>
          )}
        </div>

        {/* Teks Animasi */}
        <div className="flex flex-col items-center text-center">
          <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-cyan-300 to-blue-600 tracking-widest uppercase mb-4 drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]">
            SSO Imigrasi Buleleng
          </h1>

          <div className="h-12 flex flex-col items-center justify-center">
            {loading ? (
              <p className="text-cyan-500 font-bold text-sm tracking-[0.4em] uppercase opacity-80 animate-pulse">
                Memuat Sistem...
              </p>
            ) : stamped ? (
              currentUser ? (
                <>
                  <p className="text-emerald-400 font-bold text-base tracking-[0.4em] uppercase animate-[pulse_0.5s_ease-in-out_infinite] drop-shadow-[0_0_8px_rgba(16,185,129,0.9)] mb-1">
                    TERVERIFIKASI
                  </p>
                  <p className="text-slate-300 text-xs tracking-widest uppercase font-semibold">
                    SELAMAT DATANG, {userName}
                  </p>
                </>
              ) : (
                <p className="text-rose-500 font-bold text-sm tracking-[0.3em] uppercase drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]">
                  AUTENTIKASI DIPERLUKAN
                </p>
              )
            ) : (
              <p className="text-cyan-500 font-bold text-sm tracking-[0.4em] uppercase opacity-80 animate-pulse">
                Memindai Data...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
