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
    // Jika tombolnya "Batal/Hapus", beri peringatan dulu
    if (newStatus === 'dibatalkan') {
      const confirm = window.confirm("Yakin ingin membatalkan dan menolak pesanan ini?");
      if (!confirm) return;
    }

    try {
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
    }
  };

  const filteredBookings = bookings.filter(b => {
    if (activeTab === 'Semua') return true;
    return b.status.toLowerCase() === activeTab.toLowerCase();
  });

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  return (
    <div className="h-full w-full flex flex-col bg-fluent-bg text-text-main overflow-hidden relative">
      
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-5 fade-in duration-300 w-[90%] max-w-[320px]">
          <div className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl ${
            toast.type === 'success' ? 'bg-green-500/15 border-green-500/30 text-green-400' : 'bg-red-500/15 border-red-500/30 text-red-400'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="text-sm font-bold leading-tight">{toast.message}</span>
          </div>
        </div>
      )}

      {/* BLOK ATAS */}
      <div className="w-full relative z-40 bg-fluent-bg/95 backdrop-blur-md shrink-0 border-b border-white/5">
        <header className="w-full px-5 py-4 flex items-center space-x-3">
          <button onClick={() => router.back()} className="text-text-main hover:text-fluent-accent transition-colors cursor-pointer p-1 -ml-1">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-fluent-accent" />
            Daftar Pesanan
          </h1>
        </header>

        {/* [BARU] Tambah tab 'Dibatalkan' */}
        <section className="w-full px-5 pb-4 flex items-center space-x-2.5 overflow-x-auto scrollbar-hide">
          {['Semua', 'Menunggu', 'Diserahkan', 'Selesai', 'Dibatalkan'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 px-5 py-2 rounded-full text-[13px] font-medium transition-all duration-200 border ${
                activeTab === tab
                  ? 'bg-fluent-accent/20 text-fluent-accent border-fluent-accent/50 shadow-lg'
                  : 'bg-transparent text-text-muted border-white/10 hover:bg-white/5'
              }`}
            >
              {tab}
            </button>
          ))}
        </section>
      </div>

      {/* BLOK BAWAH (Daftar Booking) */}
      <main className="flex-1 overflow-y-auto px-5 pb-24 scrollbar-hide pt-4">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin h-6 w-6 border-b-2 border-fluent-accent rounded-full"></div>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-muted animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 opacity-50" />
            </div>
            <p className="text-sm font-bold text-text-main">Belum ada pesanan</p>
            <p className="text-xs mt-1 text-center max-w-[200px]">Pesanan dengan status ini masih kosong.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <div key={booking.id} className="bg-fluent-card border border-white/5 rounded-2xl p-4 shadow-lg flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4">
                
                {/* Bagian Atas: Profil User & Status */}
                <div className="flex justify-between items-start border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-fluent-accent/20 rounded-full flex items-center justify-center text-fluent-accent font-bold text-xs">
                      {booking.profiles?.full_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text-main leading-tight">{booking.profiles?.full_name || 'User Tidak Dikenal'}</h3>
                      <p className="text-[10px] text-text-muted mt-0.5">ID: {booking.id.substring(0, 8)}</p>
                    </div>
                  </div>
                  
                  {/* Badge Status Diperbarui */}
                  <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                    booking.status === 'menunggu' ? 'bg-yellow-500/20 text-yellow-400' :
                    booking.status === 'diserahkan' ? 'bg-blue-500/20 text-blue-400' :
                    booking.status === 'dibatalkan' ? 'bg-red-500/20 text-red-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {booking.status === 'menunggu' && <Clock className="w-3 h-3" />}
                    {booking.status === 'diserahkan' && <PackageOpen className="w-3 h-3" />}
                    {booking.status === 'selesai' && <CheckCircle2 className="w-3 h-3" />}
                    {booking.status === 'dibatalkan' && <XCircle className="w-3 h-3" />}
                    {booking.status}
                  </div>
                </div>

                {/* Bagian Tengah: Info Barang & Tanggal */}
                <div className="flex gap-3">
                  <div className="w-16 h-16 bg-fluent-bg rounded-xl overflow-hidden shrink-0 border border-white/5">
                    <img src={booking.items?.image_urls?.[0] || 'https://via.placeholder.com/150'} alt="Item" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <h4 className="text-sm font-medium text-text-main line-clamp-1">{booking.items?.name || 'Barang Dihapus'}</h4>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-text-muted">
                      <CalendarClock className="w-3.5 h-3.5 text-fluent-accent" />
                      <span>{formatDate(booking.start_date)} - {formatDate(booking.end_date)}</span>
                    </div>
                    <p className="text-xs font-bold text-fluent-accent mt-1.5">
                      Rp {booking.total_price.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>

                {/* ================= UI TOMBOL AKSI LENGKAP & UNDO ================= */}
                <div className="pt-2 flex flex-col gap-2">
                  
                  {/* Jika Status: MENUNGGU */}
                  {booking.status === 'menunggu' && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleUpdateStatus(booking.id, 'dibatalkan')}
                        className="flex-1 py-2.5 bg-red-500/10 text-red-400 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 hover:bg-red-500/20 transition-colors border border-red-500/20"
                      >
                        <XCircle className="w-4 h-4" /> Batal
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(booking.id, 'diserahkan')}
                        className="flex-[2] py-2.5 bg-fluent-accent text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 hover:bg-[#b58eff] transition-colors shadow-lg"
                      >
                        <PackageCheck className="w-4 h-4" /> Serahkan Barang
                      </button>
                    </div>
                  )}

                  {/* Jika Status: DISERAHKAN */}
                  {booking.status === 'diserahkan' && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleUpdateStatus(booking.id, 'menunggu')}
                        className="flex-1 py-2.5 bg-white/5 text-text-muted text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 hover:bg-white/10 transition-colors border border-white/5"
                      >
                        <Undo2 className="w-4 h-4" /> Batal Serahkan
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(booking.id, 'selesai')}
                        className="flex-[2] py-2.5 bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 hover:bg-emerald-400 transition-colors shadow-lg"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Barang Kembali
                      </button>
                    </div>
                  )}

                  {/* Jika Status: SELESAI (Salah klik selesai) */}
                  {booking.status === 'selesai' && (
                    <button 
                      onClick={() => handleUpdateStatus(booking.id, 'diserahkan')}
                      className="w-full py-2 bg-transparent text-text-muted hover:text-text-main text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-dashed border-white/10 hover:bg-white/5"
                    >
                      <Undo2 className="w-3.5 h-3.5" /> Batal Selesai (Barang belum kembali)
                    </button>
                  )}

                  {/* Jika Status: DIBATALKAN (Salah klik tolak) */}
                  {booking.status === 'dibatalkan' && (
                    <button 
                      onClick={() => handleUpdateStatus(booking.id, 'menunggu')}
                      className="w-full py-2 bg-transparent text-text-muted hover:text-text-main text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-dashed border-white/10 hover:bg-white/5"
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