"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, CalendarClock, CheckCircle2, 
  Package, PackageCheck, PackageOpen, Clock, AlertCircle, Search, XCircle, Undo2
} from 'lucide-react';

const AdminBookingsPage = () => {
  const router = useRouter();
  
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Semua');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);

      // ================= LOGIKA MARKETPLACE (JURUS 2 LANGKAH) =================
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData.user?.id;
      if (!currentUserId) return;

      // Langkah 1: Cari tau ID barang milik admin ini
      const { data: myItems } = await supabase.from('items').select('id').eq('owner_id', currentUserId);
      const myItemIds = myItems ? myItems.map(item => item.id) : [];

      // Langkah 2: Tarik pesanan hanya jika barangnya milik admin ini
      if (myItemIds.length > 0) {
        const { data, error } = await supabase
          .from('transactions')
          .select(`
            *,
            items (name, image_urls),
            profiles (full_name)
          `)
          .in('item_id', myItemIds) // <--- Mencegah admin lain mengintip!
          .order('created_at', { ascending: false });

        if (error) throw error;
        setBookings(data || []);
      } else {
        setBookings([]); // Jika belum punya barang, kosongkan daftar
      }
      // ========================================================================

    } catch (err) {
      console.error("Gagal memuat booking:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Fungsi untuk mengubah status pesanan (Berlaku juga untuk Undo/Cancel)
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    // [FIX KONKURENSI] Cegah eksekusi jika masih ada proses yang berjalan
    if (processingId === id) return;

    // Jika tombolnya "Batal/Hapus", beri peringatan dulu
    if (newStatus === 'Dibatalkan') {
      const confirm = window.confirm("Yakin ingin membatalkan dan menolak pesanan ini?");
      if (!confirm) return;
    }

    try {
      setProcessingId(id); // Kunci tombol untuk ID ini
      
      // 1. Update di Database
      const { error } = await supabase
        .from('transactions')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      // 2. Update UI secara instan
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
      showToast('success', `Status pesanan diubah menjadi ${newStatus}!`);
    } catch (err: any) {
      console.error("Gagal update:", err);
      showToast('error', `Gagal merubah status pesanan.`);
    } finally {
      setProcessingId(null);
    }
  };

  // 🌟 1. LOGIKA PENGHITUNG ANGKA NOTIFIKASI
  const getTabCount = (tabName: string) => {
    if (tabName === 'Semua') return bookings.length;
    if (tabName === 'Menunggu Konfirmasi') {
      return bookings.filter(b => b.status === 'Menunggu Konfirmasi' || b.status?.toUpperCase() === 'LUNAS').length;
    }
    return bookings.filter(b => b.status?.toLowerCase() === tabName.toLowerCase()).length;
  };

  // 🌟 2. LOGIKA FILTER (Mengenali LUNAS)
  const filteredBookings = bookings.filter(b => {
    if (activeTab === 'Semua') return true;
    if (activeTab === 'Menunggu Konfirmasi') {
      return b.status === 'Menunggu Konfirmasi' || b.status?.toUpperCase() === 'LUNAS';
    }
    return b.status?.toLowerCase() === activeTab.toLowerCase();
  });

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  return (
    <div className="h-full w-full flex flex-col bg-background text-main overflow-hidden relative">
      
      {/* Toast Notification */}
      {toast.show && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-5 fade-in duration-300 w-[90%] max-w-[320px]">
          <div className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl ${
            toast.type === 'success' ? 'bg-green-500/15 border-green-500/30 text-green-400' : 'bg-red-500/15 border-red-500/30 text-red-400'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="text-sm font-bold leading-tight">{toast.message}</span>
          </div>
        </div>
      )}

      {/* BLOK ATAS */}
      <div className="w-full relative z-10 bg-background/95 backdrop-blur-md shrink-0 border-b border-primary/10">
        <header className="w-full px-5 py-4 flex items-center space-x-3">
          {/* <button onClick={() => router.back()} className="text-main hover:text-primary transition-colors cursor-pointer p-1 -ml-1">
            <ArrowLeft className="w-6 h-6" />
          </button> */}
          <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Daftar Pesanan
          </h1>
        </header>

        {/* [FIX TAB & TAMBAH ANGKA NOTIFIKASI] */}
        <section className="w-full px-5 pb-4 flex items-center space-x-2.5 overflow-x-auto scrollbar-hide">
          {['Semua', 'Menunggu Konfirmasi', 'Diserahkan', 'Selesai', 'Dibatalkan'].map((tab) => {
            const count = getTabCount(tab);
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-shrink-0 px-5 py-2 rounded-full text-[13px] font-medium transition-all duration-200 border flex items-center gap-2 ${
                  activeTab === tab
                    ? 'bg-primary/20 text-primary border-primary/50 shadow-lg'
                    : 'bg-transparent text-muted border-white/10 hover:bg-primary/5'
                }`}
              >
                {tab}
                {/* 🌟 ANGKA NOTIFIKASI DENGAN WARNA DINAMIS */}
                {count > 0 && tab !== 'Semua' && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold text-white ${
                    activeTab === tab ? 'bg-primary' : 
                    tab === 'Selesai' ? 'bg-emerald-500' : 
                    tab === 'Diserahkan' ? 'bg-blue-400' : 
                    tab === 'Menunggu Konfirmasi' ? 'bg-yellow-500' : 
                    'bg-rose-500'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </section>
      </div>

      {/* BLOK BAWAH (Daftar Booking) */}
      <main className="flex-1 overflow-y-auto px-5 pb-24 scrollbar-hide pt-4">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin h-6 w-6 border-b-2 border-primary rounded-full"></div>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 opacity-50" />
            </div>
            <p className="text-sm font-bold text-main">Belum ada pesanan</p>
            <p className="text-xs mt-1 text-center max-w-[200px]">Pesanan dengan status ini masih kosong.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <div key={booking.id} className="bg-surface border border-primary/10 rounded-2xl p-4 shadow-lg flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4">
                
                {/* Bagian Atas: Profil User & Status */}
                <div className="flex justify-between items-start border-b border-primary/10 pb-3 gap-2">
                  
                  {/* Kiri: Avatar & Info User */}
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-xs shrink-0 mt-0.5">
                      {booking.profiles?.full_name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-main truncate w-full pr-2">
                        {booking.profiles?.full_name || 'User Tidak Dikenal'}
                      </h3>
                      
                      {/* 🌟 FIX TABRAKAN: Tambahkan flex-wrap agar otomatis turun jika sempit */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 pr-1">
                        <p className="text-[10px] text-muted shrink-0">ID: {booking.id.substring(0, 8)}</p>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-500 whitespace-nowrap">
                          {booking.delivery_method === 'diantar' || booking.delivery_method === 'delivery' 
                            ? '🛵 Diantar' 
                            : '🏪 Ambil ke Toko'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Kanan: Badge Status (Diberi shrink-0 agar tidak gepeng) */}
                  <div className={`shrink-0 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5 ${
                    booking.status === 'Menunggu Konfirmasi' || booking.status?.toUpperCase() === 'LUNAS' ? 'bg-yellow-500/20 text-yellow-500' :
                    booking.status === 'Diserahkan' ? 'bg-blue-500/20 text-blue-400' :
                    booking.status === 'Dibatalkan' ? 'bg-red-500/20 text-red-400' :
                    'bg-green-500/20 text-green-500'
                  }`}>
                    {(booking.status === 'Menunggu Konfirmasi' || booking.status?.toUpperCase() === 'LUNAS') && <Clock className="w-3 h-3" />}
                    {booking.status === 'Diserahkan' && <PackageOpen className="w-3 h-3" />}
                    {booking.status === 'Selesai' && <CheckCircle2 className="w-3 h-3" />}
                    {booking.status === 'Dibatalkan' && <XCircle className="w-3 h-3" />}
                    {booking.status}
                  </div>
                </div>

                {/* Bagian Tengah: Info Barang & Tanggal */}
                <div className="flex gap-3">
                  <div className="w-16 h-16 bg-background rounded-xl overflow-hidden shrink-0 border border-primary/10">
                    <img src={booking.items?.image_urls?.[0] || 'https://via.placeholder.com/150'} alt="Item" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <h4 className="text-sm font-medium text-main line-clamp-1">{booking.items?.name || 'Barang Dihapus'}</h4>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-muted">
                      <CalendarClock className="w-3.5 h-3.5 text-primary" />
                      <span>{formatDate(booking.start_date)} - {formatDate(booking.end_date)}</span>
                    </div>
                    <p className="text-xs font-bold text-primary mt-1.5">
                      Rp {booking.total_price.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>

                {/* ================= UI TOMBOL AKSI LENGKAP ================= */}
                <div className="pt-2 flex flex-col gap-2 mt-2 border-t border-primary/5 pt-3">
                  
                  {/* 🌟 JIKA STATUS: MENUNGGU ATAU LUNAS */}
                  {(booking.status === 'Menunggu Konfirmasi' || booking.status?.toUpperCase() === 'LUNAS') && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleUpdateStatus(booking.id, 'Dibatalkan')}
                        className="flex-1 py-2.5 bg-red-500/10 text-red-500 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 hover:bg-red-500/20 transition-colors border border-red-500/20"
                      >
                        <XCircle className="w-4 h-4" /> Tolak
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(booking.id, 'Diserahkan')}
                        disabled={processingId === booking.id}
                        className="flex-[2] py-2.5 bg-primary text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 hover:opacity-90 transition-colors shadow-lg"
                      >
                        <PackageCheck className="w-4 h-4" /> Serahkan Barang
                      </button>
                    </div>
                  )}

                  {/* Jika Status: DISERAHKAN */}
                  {booking.status === 'Diserahkan' && (
                    <div className="flex gap-2">
                      
                      {/* 🌟 FIX: Buang ikon, jadikan murni teks rapi di tengah */}
                      <button 
                        onClick={() => handleUpdateStatus(booking.id, 'Menunggu Konfirmasi')}
                        className="flex-1 py-1.5 px-2 bg-primary/5 text-muted rounded-xl flex items-center justify-center hover:bg-primary/10 transition-colors border border-primary/10"
                      >
                        <span className="text-[10px] font-bold leading-tight text-center">Batal<br/>Serahkan</span>
                      </button>

                      {/* Tombol Utama: Barang Kembali */}
                      <button 
                        onClick={() => handleUpdateStatus(booking.id, 'Selesai')}
                        className="flex-[2] py-2.5 bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 hover:bg-emerald-400 transition-colors shadow-lg"
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0" /> Barang Kembali
                      </button>
                      
                    </div>
                  )}

                  {/* Jika Status: SELESAI (Salah klik selesai) */}
                  {booking.status === 'Selesai' && (
                    <button 
                      onClick={() => handleUpdateStatus(booking.id, 'Diserahkan')}
                      className="w-full py-2 bg-transparent text-muted hover:text-main text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-dashed border-white/10 hover:bg-primary/5"
                    >
                      <Undo2 className="w-3.5 h-3.5" /> Batal Selesai (Barang belum kembali)
                    </button>
                  )}

                  {/* Jika Status: DIBATALKAN (Salah klik tolak) */}
                  {booking.status === 'Dibatalkan' && (
                    <button 
                      onClick={() => handleUpdateStatus(booking.id, 'Menunggu Konfirmasi')}
                      className="w-full py-2 bg-transparent text-muted hover:text-main text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-dashed border-white/10 hover:bg-primary/5"
                    >
                      <Undo2 className="w-3.5 h-3.5" /> Pulihkan Pesanan (Batal Tolak)
                    </button>
                  )}

                </div>
                {/* ================================================================ */}

              </div>
            ))}
          </div>
        )}
      </main>

    </div>
  );
};

export default AdminBookingsPage;