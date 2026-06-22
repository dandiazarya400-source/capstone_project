"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Download, Check, Home, 
  Frown, Meh, Smile, Laugh 
} from 'lucide-react';

const SuccessPage = () => {
  const router = useRouter();
  const [feedback, setFeedback] = useState<number | null>(null);

  // Data untuk emotikon feedback beserta warnanya
  const feedbackOptions = [
    { id: 1, icon: Frown, color: 'text-red-400', hoverBg: 'hover:bg-red-400/10', activeBg: 'bg-red-400/20 border-red-400' },
    { id: 2, icon: Meh, color: 'text-blue-400', hoverBg: 'hover:bg-blue-400/10', activeBg: 'bg-blue-400/20 border-blue-400' },
    { id: 3, icon: Smile, color: 'text-green-400', hoverBg: 'hover:bg-green-400/10', activeBg: 'bg-green-400/20 border-green-400' },
    { id: 4, icon: Laugh, color: 'text-yellow-400', hoverBg: 'hover:bg-yellow-400/10', activeBg: 'bg-yellow-400/20 border-yellow-400' },
  ];

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-background text-main overflow-hidden relative">
      
      {/* ================= HEADER ================= */}
      <header className="w-full bg-background/95 backdrop-blur-md z-40 px-5 py-4 md:pt-12 pt-6 flex items-center border-b border-primary/10 shrink-0">
        <button 
          onClick={() => router.back()} 
          className="p-2 -ml-2 bg-transparent rounded-full text-main hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold ml-2">Status Pembayaran</h1>
      </header>

      {/* ================= AREA SCROLL (Tengah Layar) ================= */}
      <main className="flex-1 overflow-y-auto px-5 pt-10 pb-10 scrollbar-hide flex flex-col items-center">
        
        {/* KARTU SUKSES */}
        <div className="bg-surface w-full rounded-[32px] p-8 shadow-2xl border border-primary/10 relative flex flex-col items-center text-center mt-4">
          
          {/* Tombol Unduh (Kanan Atas) */}
          <button className="absolute top-5 right-5 p-2 text-primary hover:bg-primary/10 rounded-full transition-colors">
            <Download className="w-5 h-5" />
          </button>

          {/* Ikon Ceklis Hijau Besar */}
          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.4)] animate-bounce-short">
            <Check className="w-10 h-10 text-white" strokeWidth={4} />
          </div>

          <h2 className="text-2xl font-bold text-main mb-4">Transaksi Berhasil</h2>
          
          {/* Garis Pemisah (Divider) */}
          <div className="w-16 h-1 bg-primary rounded-full mb-6"></div>

          <h3 className="text-3xl font-black text-main tracking-tight mb-2">Rp291.000</h3>
          <p className="text-sm font-medium text-muted mb-10">ID Transaksi #2512007</p>

          {/* Area Feedback */}
          <div className="w-full pt-8 border-t border-white/10 mt-2">
            <p className="text-xs font-bold text-main mb-6">
              Bagaimana pengalamanmu menyewa di aplikasi ini?
            </p>
            
            <div className="flex justify-center gap-4">
              {feedbackOptions.map((item) => {
                const Icon = item.icon;
                const isActive = feedback === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => setFeedback(item.id)}
                    className={`p-3 rounded-full border border-transparent transition-all duration-200 
                      ${item.color} ${item.hoverBg} 
                      ${isActive ? item.activeBg : 'hover:scale-110'}
                    `}
                  >
                    <Icon className="w-8 h-8" strokeWidth={isActive ? 2.5 : 2} />
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </main>

      {/* ================= NAVIGASI BAWAH ================= */}
      <div className="w-full bg-surface/95 backdrop-blur-xl p-5 md:pb-8 pb-5 rounded-t-[32px] shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.5)] border-t border-white/10 z-50 shrink-0">
        <button 
          onClick={() => router.push('/')} // Arahkan kembali ke Beranda / Home
          className="w-full bg-transparent border-2 border-primary text-primary font-bold py-3.5 rounded-2xl flex justify-center items-center space-x-2 hover:bg-primary/10 transition-colors"
        >
          <Home className="w-5 h-5" />
          <span className="text-sm">Kembali ke menu utama</span>
        </button>
      </div>

    </div>
  );
};

export default SuccessPage;