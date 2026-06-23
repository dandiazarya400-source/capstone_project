"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, Download, Check, Home, 
  Frown, Meh, Smile, Laugh, Loader2, FileText
} from 'lucide-react';
import { supabase } from '@/lib/supabase'; 

const SuccessContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [feedback, setFeedback] = useState<number | null>(null);
  const [totalPrice, setTotalPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 🌟 SEKARANG KITA TANGKAP 'order_id' HASIL TITIPAN API CHECKOUT KITA
  const orderId = searchParams.get('order_id'); 

  useEffect(() => {
    if (window.self !== window.top && window.top) {
      window.top.location.href = window.location.href;
    }
  }, []);

  useEffect(() => {
    const fetchTransactionDetails = async () => {
      if (!orderId) {
        setIsLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('total_price')
          .eq('id', orderId)
          .single();

        if (!error && data) {
          setTotalPrice(data.total_price);
        }
      } catch (err) {
        console.error("Gagal menarik data transaksi:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactionDetails();
  }, [orderId]);

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };

  // 🌟 FUNGSI CETAK INVOICE / UNDUH PDF
  const handlePrintInvoice = () => {
    window.print();
  };

  const feedbackOptions = [
    { id: 1, icon: Frown, color: 'text-red-400', hoverBg: 'hover:bg-red-400/10', activeBg: 'bg-red-400/20 border-red-400' },
    { id: 2, icon: Meh, color: 'text-blue-400', hoverBg: 'hover:bg-blue-400/10', activeBg: 'bg-blue-400/20 border-blue-400' },
    { id: 3, icon: Smile, color: 'text-green-400', hoverBg: 'hover:bg-green-400/10', activeBg: 'bg-green-400/20 border-green-400' },
    { id: 4, icon: Laugh, color: 'text-yellow-400', hoverBg: 'hover:bg-yellow-400/10', activeBg: 'bg-yellow-400/20 border-yellow-400' },
  ];

  return (
    // Tambahkan class 'print:bg-white' agar saat dicetak background-nya putih bersih
    <div className="h-[100dvh] w-full flex flex-col bg-background text-main overflow-hidden relative print:bg-white print:h-auto print:overflow-visible">
      
      {/* HEADER (Sembunyikan saat dicetak) */}
      <header className="w-full bg-background/95 backdrop-blur-md z-40 px-5 py-4 md:pt-12 pt-6 flex items-center border-b border-primary/10 shrink-0 print:hidden">
        <button 
          onClick={() => router.push('/')} 
          className="p-2 -ml-2 bg-transparent rounded-full text-main hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold ml-2">Status Pembayaran</h1>
      </header>

      {/* AREA UTAMA INVOICE */}
      <main className="flex-1 overflow-y-auto px-5 pt-10 pb-10 scrollbar-hide flex flex-col items-center print:pt-0 print:overflow-visible">
        
        {/* KARTU SUKSES (Jadi Invoice saat dicetak) */}
        <div className="bg-surface w-full rounded-[32px] p-8 shadow-2xl border border-primary/10 relative flex flex-col items-center text-center mt-4 animate-in zoom-in-95 duration-500 fade-in print:shadow-none print:border-none print:p-0">
          
          {/* Tombol Cetak (Sembunyikan saat kertas sedang dicetak) */}
          <button 
            onClick={handlePrintInvoice}
            className="absolute top-5 right-5 p-2 text-primary hover:bg-primary/10 rounded-full transition-colors print:hidden" 
            title="Unduh Invoice"
          >
            <Download className="w-5 h-5" />
          </button>

          {/* Logo Invoice Khusus Muncul Saat Dicetak Saja */}
          <div className="hidden print:flex flex-col items-center mb-8 border-b-2 border-slate-200 pb-4 w-full">
            <h1 className="text-2xl font-black text-slate-800 tracking-widest uppercase">INVOICE RENTAL</h1>
            <p className="text-sm text-slate-500">Tanda Terima Pembayaran Sah</p>
          </div>

          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.4)] animate-bounce-short print:shadow-none print:bg-white print:border-4 print:border-emerald-500">
            <Check className="w-10 h-10 text-white print:text-emerald-500" strokeWidth={4} />
          </div>

          <h2 className="text-2xl font-bold text-main mb-4">Transaksi Berhasil</h2>
          
          <div className="w-16 h-1 bg-primary rounded-full mb-6 print:hidden"></div>

          <h3 className="text-3xl font-black text-main tracking-tight mb-2">
            {isLoading ? <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto print:hidden" /> : (totalPrice ? formatRupiah(totalPrice) : 'Rp -')}
          </h3>
          
          <p className="text-xs font-medium text-muted mb-2 break-all px-4">
            ID Pesanan: <span className="font-bold text-main">
              {orderId ? `ASOKA-${orderId.split('-')[0].toUpperCase()}` : 'Memuat...'}
            </span>
          </p>
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-wider mb-10 print:bg-white print:border print:border-emerald-500">
            <Check className="w-3 h-3" />
            Lunas Dibayar
          </div>

          {/* Area Feedback (Sembunyikan saat dicetak) */}
          <div className="w-full pt-8 border-t border-primary/10 mt-2 print:hidden">
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

      {/* NAVIGASI BAWAH (Sembunyikan saat dicetak) */}
      <div className="w-full bg-surface/95 backdrop-blur-xl p-5 md:pb-8 pb-5 rounded-t-[32px] shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.5)] border-t border-white/10 z-50 shrink-0 print:hidden">
        <button 
          onClick={() => router.push('/')}
          className="w-full bg-transparent border-2 border-primary text-primary font-bold py-3.5 rounded-2xl flex justify-center items-center space-x-2 hover:bg-primary/10 transition-colors"
        >
          <Home className="w-5 h-5" />
          <span className="text-sm">Kembali ke menu utama</span>
        </button>
      </div>

    </div>
  );
};

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="h-[100dvh] w-full flex items-center justify-center bg-background text-primary">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}