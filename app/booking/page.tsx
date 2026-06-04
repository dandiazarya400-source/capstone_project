"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight, Minus, Plus, MessageCircle, CheckCircle2, CalendarDays } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const BookingContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const itemId = searchParams.get('id');
  const stockParam = searchParams.get('stock');
  const maxStock = stockParam ? parseInt(stockParam) : 1; 

  // State Utama untuk Kalender
  const [startDate, setStartDate] = useState<number | null>(null);
  const [endDate, setEndDate] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // State Interaktif lainnya
  const [quantity, setQuantity] = useState(1);
  const [deliveryMethod, setDeliveryMethod] = useState<'owner' | 'self'>('owner');

  const [loadingPrice, setLoadingPrice] = useState(true);
  const [price, setPrice] = useState(0);

  // Ambil harga asli dari database (Anti-hack URL)
  useEffect(() => {
    const fetchProductPrice = async () => {
      if (!itemId) return;
      setLoadingPrice(true);
      try {
        const { data, error } = await supabase
          .from('items') // Nama tabel barang aslimu
          .select('price_per_day')
          .eq('id', itemId)
          .single();
          
        if (data && data.price_per_day) {
          setPrice(data.price_per_day);
        }
      } catch (error) {
        console.error("Gagal mengambil harga:", error);
      } finally {
        setLoadingPrice(false);
      }
    };
    fetchProductPrice();
  }, [itemId]);

  // DATA MOCKUP (April 2025)
  const bookedDates = [13, 14, 15, 16, 17, 29, 30]; 
  const totalDays = 30;
  const startDayOffset = 2; // Mulai hari Selasa
  const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  // LOGIKA KLIK TANGGAL
  const handleDateClick = (day: number) => {
    if (bookedDates.includes(day)) return; 

    if (!startDate || (startDate && endDate)) {
      setStartDate(day);
      setEndDate(null);
    } else if (day < startDate) {
      setStartDate(day);
    } else if (day === startDate) {
      setStartDate(null);
    } else {
      const hasBookedInRange = bookedDates.some(bd => bd > startDate && bd < day);
      if (hasBookedInRange) {
        alert("Maaf, di antara tanggal tersebut ada hari yang sudah dibooking orang lain. Silakan pilih range yang berbeda.");
        setStartDate(day);
        return;
      }
      setEndDate(day);
    }
  };

  const getStatus = (day: number) => {
    if (bookedDates.includes(day)) return 'booked';
    if (day === startDate || day === endDate) return 'endpoint';
    if (startDate && endDate && day > startDate && day < endDate) return 'in-range';
    return 'available';
  };

  const duration = startDate && endDate ? (endDate - startDate) + 1 : (startDate ? 1 : 0);

  return (
    // [FIX SCROLL] Bebaskan ketinggian dan hapus overflow-hidden
    <div className="w-full flex flex-col text-text-main relative">
      
      {/* HEADER */}
      <header className="w-full bg-fluent-bg/95 backdrop-blur-md z-40 px-5 py-4 md:pt-12 pt-6 flex items-center border-b border-white/5 shrink-0">
        <button onClick={() => router.back()} className="p-2 -ml-2 bg-transparent rounded-full text-text-main hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold ml-2 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-fluent-accent" />
          Booking Alat
        </h1>
      </header>

      {/* AREA SCROLL */}
      <main className="w-full px-5 pb-24 pt-4">
        
        {/* LEGENDA */}
        <div className="mb-6">
          <p className="text-sm font-bold text-text-muted mb-3 uppercase tracking-wider">Status</p>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
            <div className="flex-shrink-0 flex items-center bg-fluent-card border border-white/10 px-2 py-1 rounded-full shadow-sm">
              <div className="w-2 h-2 rounded-full bg-red-500 mr-1.5 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
              <span className="text-[11px] font-medium text-text-main whitespace-nowrap">Sudah dibooking</span>
            </div>
            <div className="flex-shrink-0 flex items-center bg-fluent-card border border-white/10 px-2 py-1 rounded-full shadow-sm">
              <div className="w-2 h-2 rounded-full bg-fluent-accent mr-1.5 shadow-[0_0_8px_rgba(163,116,255,0.5)]"></div>
              <span className="text-[11px] font-medium text-text-main whitespace-nowrap">Pilihanmu</span>
            </div>
            <div className="flex-shrink-0 flex items-center bg-fluent-card border border-white/10 px-2 py-1 rounded-full shadow-sm">
              <div className="w-2 h-2 rounded-full bg-white/30 mr-1.5"></div>
              <span className="text-[11px] font-medium text-text-main whitespace-nowrap">Tersedia</span>
            </div>
          </div>
        </div>

        {/* KALENDER INTERAKTIF */}
        <div className="bg-fluent-card rounded-[24px] p-5 shadow-lg border border-white/5 mb-6">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-text-main flex items-center cursor-pointer hover:text-fluent-accent transition-colors">
              April 2025 <ChevronRight className="w-5 h-5 ml-1 text-fluent-accent" />
            </h2>
            <div className="flex space-x-3 text-fluent-accent">
              <ChevronLeft className="w-6 h-6 opacity-30 cursor-not-allowed" />
              <ChevronRight className="w-6 h-6 opacity-30 cursor-not-allowed" />
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-3 text-center">
            {daysOfWeek.map((day) => (
              <span key={day} className="text-[10px] font-bold text-text-muted tracking-wider uppercase">{day}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-2 text-center">
            {[...Array(startDayOffset)].map((_, i) => <div key={`empty-${i}`} className="h-10"></div>)}
            
            {[...Array(totalDays)].map((_, i) => {
              const day = i + 1;
              const status = getStatus(day);
              
              return (
                <div key={day} className="flex justify-center items-center h-10 relative group">
                  {status === 'in-range' && <div className="absolute w-full h-9 bg-fluent-accent/20"></div>}
                  {status === 'endpoint' && endDate && startDate !== endDate && (
                     <div className={`absolute w-1/2 h-9 bg-fluent-accent/20 ${day === startDate ? 'right-0' : 'left-0'}`}></div>
                  )}

                  <button 
                    onClick={() => handleDateClick(day)}
                    className={`w-9 h-9 flex justify-center items-center rounded-xl text-sm font-semibold transition-all duration-150 z-10
                      ${status === 'endpoint' ? 'bg-fluent-accent text-white' : ''}
                      ${status === 'in-range' ? 'text-fluent-accent font-bold' : ''}
                      ${status === 'booked' ? 'text-red-400 opacity-25 cursor-not-allowed' : 'text-text-main'}
                      ${status === 'available' ? 'hover:bg-white/10' : ''}
                    `}
                    disabled={status === 'booked'}
                  >
                    {day}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* PENGATURAN */}
        <div className="bg-fluent-card rounded-[24px] p-5 shadow-lg border border-white/5 space-y-5 mb-2">
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-text-muted">Total stok tersedia</span>
            <span className="text-base font-bold text-text-main">{maxStock} Unit</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-text-muted">Total Sewa Barang</span>
            <div className="flex items-center space-x-4 bg-[#1A0B2E] border border-white/5 rounded-full p-1 shadow-inner">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-full bg-fluent-card flex items-center justify-center text-text-main hover:text-fluent-accent transition-colors shadow-inner"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-base font-bold text-text-main w-4 text-center">{quantity}</span>
              <button 
                onClick={() => setQuantity(Math.min(maxStock, quantity + 1))}
                className="w-8 h-8 rounded-full bg-fluent-accent flex items-center justify-center text-white shadow-md hover:bg-[#b58eff] transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-white/5">
            <span className="text-sm font-medium text-text-muted">Durasi Sewa</span>
            <span className="text-base font-bold text-fluent-accent">
              {duration > 0 ? `${duration} Hari` : 'Pilih Tanggal'}
            </span>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-white/5">
            <span className="text-sm font-medium text-text-muted">Pengiriman</span>
            <div className="flex gap-2">
              <button 
                onClick={() => setDeliveryMethod('owner')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 shadow-sm border ${
                  deliveryMethod === 'owner' ? 'bg-fluent-accent text-white border-fluent-accent' : 'bg-white/5 text-text-muted border-white/5'
                }`}
              >
                Diantar Pemilik
              </button>
              <button 
                onClick={() => setDeliveryMethod('self')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 shadow-sm border ${
                  deliveryMethod === 'self' ? 'bg-fluent-accent text-white border-fluent-accent' : 'bg-white/5 text-text-muted border-white/5'
                }`}
              >
                Ambil Sendiri
              </button>
            </div>
          </div>
        </div>

      </main>

      {/* NAVIGASI BAWAH */}
      <nav className="w-full bg-fluent-card/95 backdrop-blur-md p-4 md:pb-8 pb-4 rounded-t-[32px] shadow-[0_-10px_30px_-5px_rgba(0,0,0,0.5)] border-t border-white/5 z-50 shrink-0 relative">
        <div className="flex items-center space-x-3">
          <button onClick={() => router.push('/chat')} className="flex-1 bg-transparent border-2 border-fluent-accent text-fluent-accent font-bold py-3.5 rounded-2xl flex justify-center items-center space-x-2 hover:bg-fluent-accent/10 transition-colors">
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm whitespace-nowrap">Chat Penyewa</span>
          </button>
          
          <button 
            disabled={!startDate || price === 0 || loadingPrice}
            onClick={() => setShowConfirmModal(true)}
            className="flex-1 bg-fluent-accent text-white font-bold py-3.5 rounded-2xl flex justify-center items-center space-x-2 shadow-[0_4px_20px_rgba(163,116,255,0.4)] hover:bg-[#b58eff] transition-colors disabled:opacity-30 disabled:grayscale disabled:shadow-none"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm whitespace-nowrap">
              {loadingPrice ? 'Memuat...' : 'Booking'}
            </span>
          </button>
        </div>
      </nav>

      {/* MODAL KONFIRMASI */}
      {showConfirmModal && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-5 bg-black/70 backdrop-blur-sm">
          <div className="bg-fluent-card border border-white/10 w-full max-w-[280px] rounded-[28px] p-5 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            
            <div className="w-14 h-14 bg-fluent-accent/20 text-fluent-accent rounded-full flex items-center justify-center mb-3 shadow-inner border border-fluent-accent/30">
              <CalendarDays className="w-6 h-6" />
            </div>
            
            <h3 className="text-base font-bold text-text-main mb-1.5">Konfirmasi Booking</h3>
            
            <p className="text-xs text-text-muted mb-6 leading-relaxed">
              Memproses booking tanggal <span className="font-bold text-fluent-accent">
                {startDate}{endDate && endDate !== startDate ? ` - ${endDate}` : ''} April 2025
              </span> (<span className="font-bold text-fluent-accent">{duration} hari</span>)?
            </p>
            
            <div className="flex w-full gap-2.5">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 rounded-2xl text-xs font-bold text-text-muted bg-white/5 border border-white/5 hover:bg-white/10 hover:text-text-main transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  setShowConfirmModal(false);
                  
                  // [FIX KEAMANAN CHECKOUT] Kita TIDAK LAGI melempar total harga lewat URL. 
                  // Kita lempar 'quantity' (jumlah barang) dan biarkan halaman Checkout yang mengalikan dengan harga asli dari DB!
                  router.push(`/payment/checkout?id=${itemId}&qty=${quantity}&start=${startDate}&end=${endDate || startDate}&delivery=${deliveryMethod}`);
                }}
                className="flex-1 py-2.5 rounded-2xl text-xs font-bold text-white bg-fluent-accent shadow-[0_4px_20px_rgba(163,116,255,0.4)] hover:bg-[#b58eff] transition-colors"
              >
                Ya, Lanjut
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="h-full w-full bg-fluent-bg text-center text-xs p-20 text-text-muted">Memuat...</div>}>
      <BookingContent />
    </Suspense>
  );
}