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
  const [allowedDelivery, setAllowedDelivery] = useState<string>('both');

  const [loadingPrice, setLoadingPrice] = useState(true);
  const [price, setPrice] = useState(0);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  // / Ambil data produk & jadwal toko dari database (Anti-hack URL)
  useEffect(() => {
    const fetchProductDetails = async () => {
      if (!itemId) return;
      setLoadingPrice(true);
      try {
        const { data, error } = await supabase
          .from('items') 
          // 🌟 PERBAIKAN SINKRONISASI: Tarik juga operational_schedule dari tabel profiles!
          .select(`
            price_per_day, 
            owner_id, 
            delivery_option,
            profiles ( operational_schedule )
          `)
          .eq('id', itemId)
          .single();

        if (error) {
          console.error("CCTV Database Error:", error.message);
        }
          
        if (data) {
          if (data.price_per_day) setPrice(data.price_per_day);
          if (data.owner_id) setOwnerId(data.owner_id);
          
          if (data.delivery_option) {
            setAllowedDelivery(data.delivery_option);
            if (data.delivery_option === 'pickup_only') setDeliveryMethod('self');
            else if (data.delivery_option === 'delivery_only') setDeliveryMethod('owner');
          }

          // 🌟 MAGIC: TERJEMAHKAN JADWAL ADMIN KE KALENDER BOOKING!
          // (0 = Minggu, 1 = Senin, 2 = Selasa, 3 = Rabu, 4 = Kamis, 5 = Jumat, 6 = Sabtu)
          // Di database Admin: [0] Senin, [1] Selasa, ... [6] Minggu
          if (data.profiles && (data.profiles as any).operational_schedule) {
            const schedule = (data.profiles as any).operational_schedule;
            const dynamicallyClosedDays: number[] = [];
            
            if (schedule[0]?.isClosed) dynamicallyClosedDays.push(1); // Senin
            if (schedule[1]?.isClosed) dynamicallyClosedDays.push(2); // Selasa
            if (schedule[2]?.isClosed) dynamicallyClosedDays.push(3); // Rabu
            if (schedule[3]?.isClosed) dynamicallyClosedDays.push(4); // Kamis
            if (schedule[4]?.isClosed) dynamicallyClosedDays.push(5); // Jumat
            if (schedule[5]?.isClosed) dynamicallyClosedDays.push(6); // Sabtu
            if (schedule[6]?.isClosed) dynamicallyClosedDays.push(0); // Minggu
            
            // Update state kalender dengan hari libur admin!
            setClosedDays(dynamicallyClosedDays);
          }
        }
      } catch (error) {
        console.error("Gagal mengambil data:", error);
      } finally {
        setLoadingPrice(false);
      }
    };
    fetchProductDetails();
  }, [itemId]);

  // 🌟 TANGGAL DINAMIS & NAVIGASI BULAN
  const [activeDate, setActiveDate] = useState(new Date()); 
  const currentYear = activeDate.getFullYear();
  const currentMonth = activeDate.getMonth(); // 0-11
  
  // Deteksi Hari Ini yang Sebenarnya (Untuk mengunci hari yang lewat)
  const realToday = new Date();
  const isCurrentMonth = currentYear === realToday.getFullYear() && currentMonth === realToday.getMonth();
  const todayDate = realToday.getDate(); 

  // Hitung total hari bulan ini & offset
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
  const startDayOffset = new Date(currentYear, currentMonth, 1).getDay();
  const daysOfWeek = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];

  const monthName = activeDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' });

  // 🌟 FUNGSI GANTI BULAN
  const handlePrevMonth = () => {
    if (!isCurrentMonth) {
      setActiveDate(new Date(currentYear, currentMonth - 1, 1));
      setStartDate(null); // Reset pilihan agar tidak error lintas bulan
      setEndDate(null);
    }
  };

  const handleNextMonth = () => {
    setActiveDate(new Date(currentYear, currentMonth + 1, 1));
    setStartDate(null);
    setEndDate(null);
  };

  // 🌟 STATE UNTUK JADWAL BOOKING ASLI DARI DATABASE
  const [bookedDates, setBookedDates] = useState<number[]>([]); 

  // 🌟 TARIK DATA TRANSAKSI ASLI SETIAP KALI GANTI BULAN!
  useEffect(() => {
    const fetchBookings = async () => {
      if (!itemId) return;

      try {
        // Tarik semua transaksi barang ini yang TIDAK batal/selesai
        const { data, error } = await supabase
          .from('transactions')
          .select('start_date, end_date, status')
          .eq('item_id', itemId)
          .neq('status', 'Dibatalkan')
          .neq('status', 'Selesai'); 

        if (error) throw error;

        if (data) {
          let bookedDaysArray: number[] = [];

          // Rentang waktu bulan yang sedang dilihat di layar
          const calendarMonthStart = new Date(currentYear, currentMonth, 1);
          const calendarMonthEnd = new Date(currentYear, currentMonth + 1, 0);

          data.forEach((tx) => {
            const start = new Date(tx.start_date);
            const end = new Date(tx.end_date);

            // Jika transaksi bersinggungan dengan bulan yang sedang dilihat
            if (start <= calendarMonthEnd && end >= calendarMonthStart) {
              let currDate = new Date(start);
              
              // Loop dari tanggal mulai sampai tanggal selesai
              while (currDate <= end) {
                // Jika tanggal tersebut jatuh di bulan dan tahun yang sedang dilihat, catat angkanya!
                if (currDate.getMonth() === currentMonth && currDate.getFullYear() === currentYear) {
                  bookedDaysArray.push(currDate.getDate());
                }
                currDate.setDate(currDate.getDate() + 1); // Tambah 1 hari
              }
            }
          });

          // Hilangkan angka duplikat dan simpan ke kalender
          setBookedDates([...new Set(bookedDaysArray)]);
        }
      } catch (error) {
        console.error("Gagal menarik jadwal transaksi:", error);
      }
    };

    fetchBookings();
  }, [itemId, currentMonth, currentYear]); // 👈 Akan jalan ulang kalau ganti bulan!
  
  // 🌟 STATE BARU UNTUK HARI LIBUR ADMIN (Misal: 0 = Minggu libur/tutup)
  // (Nanti akan kita isi otomatis dari database admin)
  const [closedDays, setClosedDays] = useState<number[]>([0]); 

  // 🌟 LOGIKA STATUS TANGGAL (Dilengkapi proteksi lintas bulan)
  const getStatus = (day: number) => {
    // 1. Coret hari yang sudah lewat HANYA jika sedang di bulan ini
    if (isCurrentMonth && day < todayDate) return 'past';
    
    // Jika user memaksa mundur ke bulan lalu (proteksi ekstra)
    if (currentYear < realToday.getFullYear() || (currentYear === realToday.getFullYear() && currentMonth < realToday.getMonth())) return 'past';
    
    // 2. Cek apakah hari ini adalah hari libur admin
    const dayOfWeekIndex = (startDayOffset + day - 1) % 7;
    if (closedDays.includes(dayOfWeekIndex)) return 'closed';

    // 3. Cek apakah sudah dibooking
    if (bookedDates.includes(day)) return 'booked';

    // 4. Logika Pilihan User
    if (day === startDate || day === endDate) return 'endpoint';
    if (startDate && endDate && day > startDate && day < endDate) return 'in-range';
    
    return 'available';
  };

  // 🌟 LOGIKA KLIK TANGGAL (Pencegah tembus hari libur)
  const handleDateClick = (day: number) => {
    const status = getStatus(day);
    if (status === 'booked' || status === 'past' || status === 'closed') return; 

    if (!startDate || (startDate && endDate)) {
      setStartDate(day);
      setEndDate(null);
    } else if (day < startDate) {
      setStartDate(day);
    } else if (day === startDate) {
      setStartDate(null);
    } else {
      // Cek apakah ada hari booking/lewat/libur di antara rentang pilihan
      let hasInvalidDayInRange = false;
      for (let d = startDate + 1; d < day; d++) {
         const s = getStatus(d);
         if (s === 'booked' || s === 'closed') {
           hasInvalidDayInRange = true;
           break;
         }
      }
      
      if (hasInvalidDayInRange) {
        alert("Maaf, rentang tanggal yang Anda pilih melewati hari libur toko atau hari yang sudah dibooking. Silakan pilih rentang yang kosong.");
        setStartDate(day);
        return;
      }
      setEndDate(day);
    }
  };

  const duration = startDate && endDate ? (endDate - startDate) + 1 : (startDate ? 1 : 0);

  return (
    // 🌟 PERBAIKAN 1: Kunci tinggi penuh layar (h-[100dvh]) dan sembunyikan overflow luar
    <div className="h-[100dvh] w-full flex flex-col bg-background text-main relative overflow-hidden">
      
      {/* HEADER (Diam di atas) */}
      <header className="w-full bg-background/95 backdrop-blur-md z-40 px-5 py-4 md:pt-12 pt-6 flex items-center border-b border-primary/10 shrink-0">
        <button onClick={() => router.back()} className="p-2 -ml-2 bg-transparent rounded-full text-main hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold ml-2 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          Booking Alat
        </h1>
      </header>

      {/* 🌟 PERBAIKAN 2: AREA SCROLL (Bisa digulir secara mandiri) */}
      <main className="flex-1 w-full px-5 py-6 overflow-y-auto scrollbar-hide">
        
        {/* LEGENDA */}
        <div className="mb-6">
          <p className="text-sm font-bold text-muted mb-3 uppercase tracking-wider">Status</p>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
            <div className="flex-shrink-0 flex items-center bg-surface border border-primary/10 px-2 py-1 rounded-full shadow-sm">
              <div className="w-2 h-2 rounded-full bg-red-500 mr-1.5 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
              <span className="text-[11px] font-medium text-main whitespace-nowrap">Sudah dibooking</span>
            </div>
            <div className="flex-shrink-0 flex items-center bg-surface border border-primary/10 px-2 py-1 rounded-full shadow-sm">
              <div className="w-2 h-2 rounded-full bg-white border border-slate-300 mr-1.5"></div>
              <span className="text-[11px] font-medium text-main whitespace-nowrap">Tersedia</span>
            </div>
            
            {/* 🌟 TAMBAHAN STATUS LIBUR */}
            <div className="flex-shrink-0 flex items-center bg-surface border border-primary/10 px-2 py-1 rounded-full shadow-sm">
              <div className="w-2 h-2 rounded-full bg-orange-400 mr-1.5 shadow-[0_0_8px_rgba(251,146,60,0.5)]"></div>
              <span className="text-[11px] font-medium text-main whitespace-nowrap">Libur/Tutup</span>
            </div>

            <div className="flex-shrink-0 flex items-center bg-surface border border-primary/10 px-2 py-1 rounded-full shadow-sm">
              <div className="w-2 h-2 rounded-full bg-primary mr-1.5 shadow-[0_0_8px_rgba(20,184,166,0.5)]"></div>
              <span className="text-[11px] font-medium text-main whitespace-nowrap">Pilihanmu</span>
            </div>
            
          </div>
        </div>

        {/* KALENDER INTERAKTIF */}
        <div className="bg-surface rounded-[24px] p-5 shadow-lg border border-primary/10 mb-6">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-main flex items-center">
              {monthName}
            </h2>
            <div className="flex space-x-3 text-primary">
              <button 
                onClick={handlePrevMonth} 
                disabled={isCurrentMonth}
                className={`p-1.5 rounded-full transition-all ${isCurrentMonth ? 'opacity-30 cursor-not-allowed' : 'hover:bg-primary/10 cursor-pointer'}`}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button 
                onClick={handleNextMonth}
                className="p-1.5 rounded-full hover:bg-primary/10 transition-all cursor-pointer"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-3 text-center">
            {daysOfWeek.map((day) => (
              <span key={day} className="text-[10px] font-bold text-muted tracking-wider uppercase">{day}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-2 text-center">
            {/* 🌟 Tambahkan currentMonth pada key agar hari kosong langsung ter-reset */}
            {[...Array(startDayOffset)].map((_, i) => <div key={`empty-${currentMonth}-${i}`} className="h-10"></div>)}
            
            {[...Array(totalDays)].map((_, i) => {
              const day = i + 1;
              const status = getStatus(day);
              
              return (
                // Ganti key menjadi kombinasi Tahun-Bulan-Tanggal agar tidak ada animasi nyasar saat ganti bulan
                <div key={`${currentYear}-${currentMonth}-${day}`} className="flex justify-center items-center h-10 relative group">
                  {status === 'in-range' && <div className="absolute w-full h-9 bg-primary/10"></div>}
                  {status === 'endpoint' && endDate && startDate !== endDate && (
                      <div className={`absolute w-1/2 h-9 bg-primary/10 ${day === startDate ? 'right-0' : 'left-0'}`}></div>
                  )}

                  <button 
                    onClick={() => handleDateClick(day)}
                    className={`w-9 h-9 flex justify-center items-center rounded-xl text-sm font-semibold transition-all duration-150 z-10
                      ${status === 'endpoint' ? 'bg-primary text-white shadow-[0_2px_10px_rgba(20,184,166,0.4)]' : ''}
                      ${status === 'in-range' ? 'text-primary font-bold' : ''}
                      ${status === 'booked' ? 'text-red-400 opacity-25 cursor-not-allowed' : ''}
                      ${status === 'past' ? 'text-slate-300 opacity-30 cursor-not-allowed' : ''}
                      ${status === 'closed' ? 'text-orange-400 bg-orange-50 cursor-not-allowed opacity-50 line-through' : ''}
                      ${status === 'available' || status === 'in-range' || status === 'endpoint' ? 'text-main hover:bg-primary/10 hover:text-primary cursor-pointer' : ''}
                    `}
                    disabled={status === 'booked' || status === 'past' || status === 'closed'}
                  >
                    {day}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* PENGATURAN */}
        <div className="bg-surface rounded-[24px] p-5 shadow-lg border border-primary/10 space-y-5">
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted">Total stok tersedia</span>
            <span className="text-base font-bold text-main">{maxStock} Unit</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted">Total Sewa Barang</span>
            <div className="flex items-center space-x-4 bg-background border border-primary/10 rounded-full p-1 shadow-inner">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-main hover:text-primary transition-colors shadow-inner"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-base font-bold text-main w-4 text-center">{quantity}</span>
              <button 
                onClick={() => setQuantity(Math.min(maxStock, quantity + 1))}
                className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white shadow-md hover:bg-primary-hover transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-primary/10">
            <span className="text-sm font-medium text-muted">Durasi Sewa</span>
            <span className="text-base font-bold text-primary">
              {duration > 0 ? `${duration} Hari` : 'Pilih Tanggal'}
            </span>
          </div>

          <div className="flex flex-col pt-4 border-t border-primary/10 gap-3">
            <span className="text-sm font-medium text-muted">Metode Pengiriman</span>
            <div className="flex w-full gap-2">
              
              {/* TOMBOL DIANTAR: Muncul kalau allowedDelivery = 'both' atau 'delivery_only' */}
              {(allowedDelivery === 'both' || allowedDelivery === 'delivery_only') && (
                <button 
                  onClick={() => setDeliveryMethod('owner')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 shadow-sm border ${
                    deliveryMethod === 'owner' ? 'bg-primary text-white border-primary' : 'bg-primary/5 text-muted border-primary/10 hover:bg-primary/10'
                  }`}
                >
                  Diantar Pemilik
                </button>
              )}

              {/* TOMBOL AMBIL SENDIRI: Muncul kalau allowedDelivery = 'both' atau 'pickup_only' */}
              {(allowedDelivery === 'both' || allowedDelivery === 'pickup_only') && (
                <button 
                  onClick={() => setDeliveryMethod('self')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 shadow-sm border ${
                    deliveryMethod === 'self' ? 'bg-primary text-white border-primary' : 'bg-primary/5 text-muted border-primary/10 hover:bg-primary/10'
                  }`}
                >
                  Ambil Sendiri
                </button>
              )}
            </div>

            {/* 🌟 TEKS KECIL INFORMATIF JIKA OPSI DIBATASI ADMIN */}
            {allowedDelivery === 'pickup_only' && (
              <p className="text-[10px] text-orange-500 font-medium italic -mt-1 leading-tight">
                *Pemilik barang hanya melayani pengambilan langsung di toko (Ambil Sendiri).
              </p>
            )}
            
            {allowedDelivery === 'delivery_only' && (
              <p className="text-[10px] text-orange-500 font-medium italic -mt-1 leading-tight">
                *Pemilik barang hanya menyediakan layanan antar langsung ke lokasi Anda.
              </p>
            )}
            
          </div>
        </div>
      </main>

      {/* 🌟 PERBAIKAN 3: NAVIGASI BAWAH (Diam di bawah) */}
      <nav className="w-full bg-surface/95 backdrop-blur-md p-4 md:pb-8 pb-6 rounded-t-[32px] shadow-[0_-10px_30px_-5px_rgba(0,0,0,0.1)] border-t border-primary/10 z-50 shrink-0 relative">
        <div className="flex items-center space-x-3">
          <button 
          disabled={loadingPrice}
            onClick={() => {
              if (ownerId) {
                router.push(`/chat?targetId=${ownerId}`); // 🌟 GUNAKAN STATE YANG SUDAH DIAMBIL
              } else {
                alert("Sedang memuat data pemilik barang, mohon tunggu...");
              }
            }} 
            className="flex-1 bg-transparent border border-primary text-primary font-bold py-3.5 rounded-2xl flex justify-center items-center space-x-2 hover:bg-primary/10 transition-colors shadow-inner"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm whitespace-nowrap">Chat Pemilik</span>
          </button>
          
          <button 
            disabled={!startDate || price === 0 || loadingPrice}
            onClick={() => setShowConfirmModal(true)}
            className="flex-1 bg-primary text-white font-bold py-3.5 rounded-2xl flex justify-center items-center space-x-2 shadow-[0_4px_20px_rgba(20,184,166,0.3)] hover:bg-primary-hover transition-colors disabled:opacity-30 disabled:grayscale disabled:shadow-none"
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
          <div className="bg-surface border border-white/10 w-full max-w-[280px] rounded-[28px] p-5 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            
            <div className="w-14 h-14 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-3 shadow-inner border border-primary/30">
              <CalendarDays className="w-6 h-6" />
            </div>
            
            <h3 className="text-base font-bold text-main mb-1.5">Konfirmasi Booking</h3>
            
            <p className="text-xs text-muted mb-6 leading-relaxed">
              Memproses booking tanggal <span className="font-bold text-primary">
                {startDate}{endDate && endDate !== startDate ? ` - ${endDate}` : ''} {monthName}
              </span> (<span className="font-bold text-primary">{duration} hari</span>)?
            </p>
            
            <div className="flex w-full gap-2.5">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 rounded-2xl text-xs font-bold text-muted bg-primary/5 border border-primary/10 hover:bg-white/10 hover:text-main transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  setShowConfirmModal(false);
                  
                  // Format: HH-BB-TTTT (Contoh: 15-7-2026)
                  const startStr = `${startDate}-${currentMonth + 1}-${currentYear}`;
                  const endStr = `${endDate || startDate}-${currentMonth + 1}-${currentYear}`;
                  
                  router.push(`/payment/checkout?id=${itemId}&qty=${quantity}&start=${startStr}&end=${endStr}&delivery=${deliveryMethod}`);
                }}
                className="flex-1 py-2.5 rounded-2xl text-xs font-bold text-white bg-primary shadow-[0_4px_20px_rgba(20,184,166,0.3)] hover:bg-primary-hover transition-colors"
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
    <Suspense fallback={<div className="h-full w-full bg-background text-center text-xs p-20 text-muted">Memuat...</div>}>
      <BookingContent />
    </Suspense>
  );
}