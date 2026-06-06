"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Check, 
  Wallet, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti'; // Boleh di-install: npm install canvas-confetti @types/canvas-confetti

export default function WalletSuccessPage() {
  const router = useRouter();

  // Efek kembang api (Confetti) saat berhasil top up! 🎉
  useEffect(() => {
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#10b981', '#3b82f6', '#a374ff']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#10b981', '#3b82f6', '#a374ff']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-fluent-bg text-text-main overflow-hidden relative justify-center items-center p-5 animate-in fade-in duration-500">
      
      {/* Efek Cahaya Latar Belakang */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] pointer-events-none"></div>

      <div className="bg-fluent-card w-full max-w-sm rounded-[40px] p-8 shadow-2xl border border-emerald-500/20 relative flex flex-col items-center text-center z-10">
        
        {/* Ikon Sukses */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-emerald-500 rounded-full blur-xl opacity-40 animate-pulse"></div>
          <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg relative z-10 animate-bounce-short">
            <Check className="w-12 h-12 text-white" strokeWidth={4} />
          </div>
          <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-400 animate-spin-slow z-20" />
        </div>

        <h1 className="text-2xl font-black text-text-main mb-2 tracking-tight">Top Up Berhasil!</h1>
        <p className="text-sm text-text-muted mb-8 leading-relaxed">
          Saldo dompet digitalmu telah berhasil ditambahkan. Selamat menyewa alat impianmu!
        </p>

        {/* Kotak Info Saldo */}
        <div className="w-full bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-center gap-3 mb-8">
          <Wallet className="w-6 h-6 text-emerald-500" />
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Saldo sudah otomatis masuk</span>
        </div>

        {/* Tombol Kembali */}
        <button 
          onClick={() => router.push('/profile')} 
          className="w-full bg-fluent-accent text-white font-bold py-4 rounded-2xl flex justify-center items-center space-x-2 shadow-lg shadow-fluent-accent/30 hover:bg-[#b58eff] transition-all active:scale-95"
        >
          <span>Kembali ke Profil</span>
          <ArrowRight className="w-5 h-5" />
        </button>

      </div>
    </div>
  );
}