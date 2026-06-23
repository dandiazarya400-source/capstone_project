"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, Landmark, Info, Loader2 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const CheckoutInstructionContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // 1. TANGKAP SEMUA DATA DARI URL
  const itemId = searchParams.get('id');
  const startDay = searchParams.get('start');
  const endDay = searchParams.get('end');
  const deliveryParam = searchParams.get('delivery');
  const qtyParam = searchParams.get('qty'); 

  const [isProcessing, setIsProcessing] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  
  // State Harga & Detail
  const [totalPayment, setTotalPayment] = useState(0);
  const [isLoadingPrice, setIsLoadingPrice] = useState(true);
  const [duration, setDuration] = useState(1);

  // 2. FETCH HARGA ASLI & HITUNG TOTAL
  useEffect(() => {
    const fetchAndCalculatePrice = async () => {
      if (!itemId || !startDay || !endDay) return;
      
      try {
        setIsLoadingPrice(true);
        const { data, error } = await supabase
          .from('items')
          .select('price_per_day')
          .eq('id', itemId)
          .single();

        if (error) throw error;

        if (data && data.price_per_day) {
          const qty = qtyParam ? parseInt(qtyParam) : 1;
          // Memecah format string "15-7-2026" untuk mendapatkan tanggal
          const start = parseInt(startDay.split('-')[0]);
          const end = parseInt(endDay.split('-')[0]);
          
          const calcDuration = (end >= start) ? (end - start + 1) : 1;
          setDuration(calcDuration);
          
          const calculatedTotal = data.price_per_day * calcDuration * qty;
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

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };

  // 3. FUNGSI LANJUT KE XENDIT
  const handleProceedToPayment = async () => {
    if (!itemId || !startDay || !endDay || totalPayment <= 0) {
      alert("Data pesanan tidak valid.");
      return;
    }

    setIsProcessing(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) throw new Error("Silakan login kembali.");

      // Format ulang ke YYYY-MM-DD untuk backend API kita
      const [sDay, sMonth, sYear] = startDay.split('-');
      const [eDay, eMonth, eYear] = endDay.split('-');
      const formattedStart = `${sYear}-${sMonth.padStart(2, '0')}-${sDay.padStart(2, '0')}`;
      const formattedEnd = `${eYear}-${eMonth.padStart(2, '0')}-${eDay.padStart(2, '0')}`;
      
      const methodStr = deliveryParam === 'self' ? 'self' : 'owner';

      // TEMBAK API BACKEND KITA (Yang memanggil Xendit)
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

      // 🌟 TAMPILKAN DI DALAM APLIKASI (Ganti window.location.href jadi setInvoiceUrl)
      setInvoiceUrl(result.invoiceUrl);

    } catch (error: any) {
      console.error("Gagal checkout:", error);
      alert(error.message || "Terjadi kendala saat membuat tagihan.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 🌟 JIKA INVOICE URL SUDAH ADA, TAMPILKAN XENDIT DI DALAM IFRAME!
  if (invoiceUrl) {
    return (
      <div className="h-[100dvh] w-full flex flex-col bg-white overflow-hidden relative z-[100]">
        {/* Header Custom Untuk Iframe */}
        <header className="w-full bg-white px-5 py-4 md:pt-12 pt-6 flex items-center border-b border-slate-200 shrink-0 shadow-sm">
          <button 
            onClick={() => setInvoiceUrl(null)} // Tombol batal bayar
            className="p-2 -ml-2 bg-transparent rounded-full text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-base font-bold ml-2 text-slate-800">Selesaikan Pembayaran</h1>
        </header>

        {/* Jendela Ajaib Xendit */}
        <iframe 
          src={invoiceUrl} 
          className="flex-1 w-full border-none bg-slate-50"
          allow="payment" // Mengizinkan proses pembayaran di dalam iframe
        />
      </div>
    );
  }
  
  return (
    <div className="h-[100dvh] w-full flex flex-col bg-background text-main overflow-hidden relative">
      
      <header className="w-full bg-background/95 backdrop-blur-md z-40 px-5 py-4 md:pt-12 pt-6 flex items-center border-b border-primary/10 shrink-0">
        <button 
          onClick={() => router.back()} 
          className="p-2 -ml-2 bg-transparent rounded-full text-main hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold ml-2">Ringkasan Pesanan</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pt-6 pb-10 scrollbar-hide space-y-6">
        
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-main font-medium leading-relaxed">
            Silakan periksa kembali detail pesanan Anda sebelum melanjutkan ke halaman pembayaran.
          </p>
        </div>

        <div className="bg-surface rounded-[24px] p-6 shadow-lg border border-primary/10 space-y-4">
          <div className="flex justify-between items-center border-b border-primary/10 pb-4">
            <span className="text-sm font-medium text-muted">Durasi Sewa</span>
            <span className="text-sm font-bold text-main">{duration} Hari</span>
          </div>
          
          <div className="flex justify-between items-center border-b border-primary/10 pb-4">
            <span className="text-sm font-medium text-muted">Jumlah Barang</span>
            <span className="text-sm font-bold text-main">{qtyParam || 1} Unit</span>
          </div>

          <div className="flex justify-between items-center border-b border-primary/10 pb-4">
            <span className="text-sm font-medium text-muted">Metode Pengiriman</span>
            <span className="text-sm font-bold text-main capitalize">
              {deliveryParam === 'self' ? 'Ambil Sendiri' : 'Diantar Pemilik'}
            </span>
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-sm font-bold text-main">Total Pembayaran</span>
            <span className="text-xl font-black text-primary flex items-center gap-2">
              {isLoadingPrice ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : formatRupiah(totalPayment)}
            </span>
          </div>
        </div>

      </main>

      <div className="w-full bg-surface/95 backdrop-blur-xl p-5 md:pb-8 pb-5 rounded-t-[32px] shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.5)] border-t border-white/10 z-50 shrink-0">
        <div className="flex flex-col gap-3">
          <button 
            disabled={isProcessing || isLoadingPrice}
            onClick={handleProceedToPayment} 
            className="w-full bg-primary text-white font-bold py-4 rounded-2xl flex justify-center items-center space-x-2 shadow-lg shadow-primary/30 hover:bg-primary-hover transition-all disabled:opacity-50 disabled:cursor-wait"
          >
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Landmark className="w-5 h-5" />}
            <span>{isProcessing ? 'Memproses ke Xendit...' : 'Lanjut ke Pembayaran'}</span>
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