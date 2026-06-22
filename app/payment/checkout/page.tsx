"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, Copy, Timer, Landmark, 
  Info, CheckCircle2, Loader2 
} from 'lucide-react';
import { supabase } from '@/lib/supabase'; // PASTIKAN IMPORT SUPABASE

const CheckoutInstructionContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // 1. TANGKAP SEMUA DATA DARI URL (Tanpa mengambil 'total'!)
  const itemId = searchParams.get('id');
  const startDay = searchParams.get('start');
  const endDay = searchParams.get('end');
  const deliveryParam = searchParams.get('delivery');
  const qtyParam = searchParams.get('qty'); // Tangkap jumlah barang dari URL

  const [isProcessing, setIsProcessing] = useState(false);
  
  // [FIX KEAMANAN CHECKOUT] State untuk menyimpan harga yang dihitung di server
  const [totalPayment, setTotalPayment] = useState(0);
  const [isLoadingPrice, setIsLoadingPrice] = useState(true);

  // 2. FETCH HARGA ASLI DARI DATABASE & HITUNG TOTAL
  useEffect(() => {
    const fetchAndCalculatePrice = async () => {
      if (!itemId || !startDay || !endDay) return;
      
      try {
        setIsLoadingPrice(true);
        // Tarik harga asli per hari dari database
        const { data, error } = await supabase
          .from('items')
          .select('price_per_day')
          .eq('id', itemId)
          .single();

        if (error) throw error;

        if (data && data.price_per_day) {
          const qty = qtyParam ? parseInt(qtyParam) : 1;
          const start = parseInt(startDay);
          const end = parseInt(endDay);
          
          // Hitung durasi (jika hari yang sama = 1 hari)
          const duration = (end >= start) ? (end - start + 1) : 1;
          
          // Hitung Total = Harga Asli * Durasi * Jumlah Barang
          const calculatedTotal = data.price_per_day * duration * qty;
          setTotalPayment(calculatedTotal);
        }
      } catch (error) {
        console.error("Gagal menarik harga asli:", error);
      } finally {
        setIsLoadingPrice(false);
      }
    };

    fetchAndCalculatePrice();
  }, [itemId, startDay, endDay, qtyParam]);

  // Fungsi Format Rupiah
  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };

  // State untuk timer (Hitung mundur 24 jam)
  const [timeLeft, setTimeLeft] = useState({ hours: 23, minutes: 59, seconds: 59 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59, hours: prev.hours };
        return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Tersalin ke papan klip!');
  };

  const handlePaymentConfirm = async () => {
    if (!itemId || !startDay || !endDay || totalPayment <= 0) {
      alert("Data pesanan tidak valid.");
      return;
    }

    setIsProcessing(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) throw new Error("Silakan login kembali.");

      const formattedStart = `2025-04-${startDay.padStart(2, '0')}`;
      const formattedEnd = `2025-04-${endDay.padStart(2, '0')}`;
      const methodStr = deliveryParam === 'self' ? 'self' : 'owner';

      // 🌟 TEMBAK API BACKEND KITA!
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: itemId,
          tenantId: authData.user.id,
          startDate: formattedStart,
          endDate: formattedEnd,
          totalPayment: totalPayment,
          deliveryMethod: methodStr,
          quantity: parseInt(qtyParam || '1')
        })
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.message);

      // 🌟 AJAIB! Lempar user ke halaman UI Pembayaran Xendit!
      window.location.href = result.invoiceUrl;

    } catch (error: any) {
      console.error("Gagal checkout:", error);
      alert(error.message || "Terjadi kendala saat membuat tagihan.");
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="h-[100dvh] w-full flex flex-col bg-background text-main overflow-hidden relative">
      
      <header className="w-full bg-background/95 backdrop-blur-md z-40 px-5 py-4 md:pt-12 pt-6 flex items-center border-b border-primary/10 shrink-0">
        <button 
          onClick={() => router.back()} 
          className="p-2 -ml-2 bg-transparent rounded-full text-main hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold ml-2">Intruksi Pembayaran</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-6 pb-10 scrollbar-hide space-y-6">
        
        <div className="bg-gradient-to-r from-primary/20 to-transparent border border-primary/30 rounded-3xl p-5 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <Timer className="w-6 h-6 text-primary animate-pulse" />
            <div>
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Batas Waktu Bayar</p>
              <p className="text-lg font-black text-main">
                {String(timeLeft.hours).padStart(2, '0')}:
                {String(timeLeft.minutes).padStart(2, '0')}:
                {String(timeLeft.seconds).padStart(2, '0')}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-muted">Jatuh Tempo</p>
            <p className="text-xs font-bold text-main">Besok, 14:20 WIB</p>
          </div>
        </div>

        <div className="bg-surface rounded-[32px] p-6 shadow-xl border border-primary/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <Landmark className="w-6 h-6 text-black" />
            </div>
            <div>
              <h3 className="font-bold text-main">Transfer Bank BCA</h3>
              <p className="text-xs text-muted">Dicek Otomatis • Asoka Lensa</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-background rounded-2xl p-4 border border-primary/10">
              <p className="text-[10px] font-bold text-muted uppercase mb-1">Nomor Rekening / Virtual Account</p>
              <div className="flex justify-between items-center">
                <span className="text-xl font-black text-primary tracking-wider">125 0895 1679 9498</span>
                <button 
                  onClick={() => handleCopy('125089516799498')}
                  className="flex items-center gap-1.5 text-xs font-bold text-main hover:text-primary transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Salin
                </button>
              </div>
            </div>

        <div className="bg-background rounded-2xl p-4 border border-primary/10">
          <p className="text-[10px] font-bold text-muted uppercase mb-1">Total Pembayaran</p>
          <div className="flex justify-between items-center">
            <span className="text-xl font-black text-main flex items-center gap-2">
              {isLoadingPrice ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : formatRupiah(totalPayment)}
            </span>
            <button 
              onClick={() => handleCopy(totalPayment.toString())}
              className="flex items-center gap-1.5 text-xs font-bold text-main hover:text-primary transition-colors"
            >
              <Copy className="w-4 h-4" />
              Salin
            </button>
          </div>
        </div>
          </div>
        </div>

        <div className="px-2">
          <h4 className="text-sm font-bold text-main mb-4 flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" />
            Cara Pembayaran
          </h4>
          <ul className="space-y-4">
            {[
              "Pilih menu Transfer ke Rekening Virtual Account.",
              "Masukkan nomor Virtual Account yang tertera di atas.",
              "Pastikan nominal bayar sesuai hingga 3 digit terakhir.",
              "Simpan bukti transfer hingga status transaksi berubah."
            ].map((step, i) => (
              <li key={i} className="flex gap-4 items-start">
                <span className="w-5 h-5 rounded-full bg-primary/5 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-0.5 border border-white/10">
                  {i + 1}
                </span>
                <p className="text-xs text-muted leading-relaxed">{step}</p>
              </li>
            ))}
          </ul>
        </div>

      </main>

      <div className="w-full bg-surface/95 backdrop-blur-xl p-5 md:pb-8 pb-5 rounded-t-[32px] shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.5)] border-t border-white/10 z-50 shrink-0">
        <div className="flex flex-col gap-3">
          <button 
            disabled={isProcessing}
            onClick={handlePaymentConfirm} // PANGGIL FUNGSI DATABASE DI SINI
            className="w-full bg-primary text-white font-bold py-4 rounded-2xl flex justify-center items-center space-x-2 shadow-lg shadow-primary/30 hover:bg-[#b58eff] transition-all disabled:opacity-50 disabled:cursor-wait"
          >
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            <span>{isProcessing ? 'Memverifikasi...' : 'Saya Sudah Bayar'}</span>
          </button>
          
          <button 
            onClick={() => router.push('/')}
            className="w-full bg-transparent text-muted text-xs font-bold py-2 hover:text-main transition-colors"
          >
            Nanti saja, Kembali ke Beranda
          </button>
        </div>
      </div>

    </div>
  );
};

// Bungkus dengan Suspense agar aman saat di-build Next.js
export default function CheckoutInstructionPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-background text-muted">Memuat instruksi...</div>}>
      <CheckoutInstructionContent />
    </Suspense>
  );
}