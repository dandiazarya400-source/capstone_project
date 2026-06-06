"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, Download, Check, Home, 
  Frown, Meh, Smile, Laugh, Loader2, Building, Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

const SuccessPageContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const txId = searchParams.get('id'); 

  const [feedback, setFeedback] = useState<number | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [paymentChannel, setPaymentChannel] = useState<string>('Sistem Pembayaran');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const formatPaymentMethod = (channel: string) => {
    if (!channel) return 'Metode Pembayaran';
    const ch = channel.toUpperCase();
    if (ch.includes('BCA')) return 'Transfer Bank BCA';
    if (ch.includes('BNI')) return 'Transfer Bank BNI';
    if (ch.includes('MANDIRI')) return 'Transfer Bank Mandiri';
    if (ch.includes('QRIS')) return 'QRIS / E-Wallet';
    if (ch.includes('CREDIT')) return 'Kartu Kredit';
    return channel; 
  };

  const fireConfetti = () => {
    const duration = 2.5 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#10b981', '#3b82f6', '#a374ff'] });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#10b981', '#3b82f6', '#a374ff'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };

  useEffect(() => {
    const fetchTransaction = async () => {
      if (!txId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('wallet_transactions')
          .select('amount, payment_channel')
          .eq('id', txId)
          .single();

        if (data) {
          setAmount(data.amount);
          setPaymentChannel(formatPaymentMethod(data.payment_channel));
        }
      } catch (error) {
        console.error("Gagal menarik data transaksi:", error);
      } finally {
        setIsLoading(false);
        fireConfetti(); 
      }
    };

    // 🌟 FIX 1: Delay dipersingkat dari 2000ms (2 detik) jadi 600ms saja biar ngebut!
    const timer = setTimeout(() => {
      fetchTransaction();
    }, 600);

    return () => clearTimeout(timer);
  }, [txId]);

  const feedbackOptions = [
    { id: 1, icon: Frown, color: 'text-red-400', hoverBg: 'hover:bg-red-400/10', activeBg: 'bg-red-400/20 border-red-400' },
    { id: 2, icon: Meh, color: 'text-blue-400', hoverBg: 'hover:bg-blue-400/10', activeBg: 'bg-blue-400/20 border-blue-400' },
    { id: 3, icon: Smile, color: 'text-green-400', hoverBg: 'hover:bg-green-400/10', activeBg: 'bg-green-400/20 border-green-400' },
    { id: 4, icon: Laugh, color: 'text-yellow-400', hoverBg: 'hover:bg-yellow-400/10', activeBg: 'bg-yellow-400/20 border-yellow-400' },
  ];

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-fluent-bg text-text-main overflow-hidden relative">
      
      <header className="w-full bg-fluent-bg/95 backdrop-blur-md z-40 px-5 py-4 md:pt-12 pt-6 flex items-center border-b border-fluent-accent/10 shrink-0">
        <button onClick={() => router.back()} className="p-2 -ml-2 bg-transparent rounded-full text-text-main hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold ml-2">Status Pembayaran</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pt-16 pb-10 scrollbar-hide flex flex-col items-center justify-center">
        {/* 🌟 FIX 2: Hapus overflow-hidden agar bintangnya tidak terpotong garis */}
        <div className="bg-fluent-card w-full min-h-[380px] rounded-[32px] px-8 pb-8 pt-4 shadow-2xl border border-fluent-accent/10 relative flex flex-col items-center justify-center text-center mt-6">
          
          {isLoading ? (
            <div className="flex flex-col items-center animate-in fade-in duration-300">
              <div className="w-16 h-16 bg-fluent-accent/10 rounded-full flex items-center justify-center mb-5 relative">
                <Loader2 className="w-8 h-8 text-fluent-accent animate-spin relative z-10" />
                <div className="absolute inset-0 border-4 border-fluent-accent/20 border-t-fluent-accent rounded-full animate-spin-slow"></div>
              </div>
              <h2 className="text-lg font-bold text-text-main mb-1.5">Memverifikasi...</h2>
              <p className="text-xs text-text-muted">Mengambil data transaksi</p>
            </div>
          ) : (
            <div className="flex flex-col items-center w-full animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-500">
              
              <button className="absolute top-4 right-4 p-2 text-fluent-accent hover:bg-fluent-accent/10 rounded-full transition-colors">
                <Download className="w-5 h-5" />
              </button>

              {/* 🌟 FIX 3: Tambahkan -mt-14 agar ikon memotong garis atas kartu (Pop-up Badge Effect) */}
              <div className="relative -mt-14 mb-5">
                <div className="absolute inset-0 bg-emerald-500 rounded-full blur-xl opacity-40 animate-pulse"></div>
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-[0_4px_25px_rgba(16,185,129,0.5)] relative z-10 animate-in zoom-in spin-in-12 duration-500 delay-100 ring-4 ring-fluent-card">
                  <Check className="w-10 h-10 text-white" strokeWidth={4} />
                </div>
                <Sparkles className="absolute -top-2 -right-3 w-6 h-6 text-yellow-400 animate-spin-slow z-20" />
              </div>

              <h2 className="text-xl font-bold text-text-main mb-3">Transaksi Berhasil</h2>
              <div className="w-12 h-1 bg-fluent-accent rounded-full mb-5"></div>

              <h3 className="text-3xl font-black text-text-main tracking-tight mb-2">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)}
              </h3>
              
              <div className="flex items-center gap-1.5 text-xs font-bold text-fluent-accent mb-1 bg-fluent-accent/10 px-3 py-1.5 rounded-full">
                <Building className="w-3.5 h-3.5" />
                {paymentChannel}
              </div>
              
              {/* 🌟 FIX 4: Margin bottom (mb) diperkecil dari mb-8 jadi mb-5 */}
              <p className="text-[11px] font-medium text-text-muted mb-5 uppercase tracking-wider">
                ID: {txId?.split('-').pop() || 'TIDAK-DIKETAHUI'}
              </p>

              {/* 🌟 FIX 5: Padding top (pt) diperkecil dari pt-8 jadi pt-5 */}
              <div className="w-full pt-5 border-t border-white/10 mt-1">
                <p className="text-[11px] font-bold text-text-main mb-4">Bagaimana pengalamanmu menyewa di aplikasi ini?</p>
                <div className="flex justify-center gap-3">
                  {feedbackOptions.map((item) => {
                    const Icon = item.icon;
                    const isActive = feedback === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setFeedback(item.id)}
                        className={`p-2.5 rounded-full border border-transparent transition-all duration-200 ${item.color} ${item.hoverBg} ${isActive ? item.activeBg : 'hover:scale-110'}`}
                      >
                        <Icon className="w-7 h-7" strokeWidth={isActive ? 2.5 : 2} />
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}
        </div>
      </main>

      <div className="w-full bg-fluent-card/95 backdrop-blur-xl p-5 md:pb-8 pb-5 rounded-t-[32px] shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.5)] border-t border-white/10 z-50 shrink-0">
        <button onClick={() => router.push('/')} className="w-full bg-transparent border-2 border-fluent-accent text-fluent-accent font-bold py-3.5 rounded-2xl flex justify-center items-center space-x-2 hover:bg-fluent-accent/10 transition-colors">
          <Home className="w-5 h-5" />
          <span className="text-sm">Kembali ke menu utama</span>
        </button>
      </div>

    </div>
  );
};

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-fluent-bg text-text-main">Memuat...</div>}>
      <SuccessPageContent />
    </Suspense>
  );
}