"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Package, Sparkles, MessageSquare, Info, CheckCheck, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Tipe data notifikasi dari database
interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Semua');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);

  // 🌟 1. TARIK DATA AKURAT DARI DATABASE
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        // Ambil ID User yang sedang login
        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user) return;
        
        const currentUserId = authData.user.id;
        setMyId(currentUserId);

        // Tarik notifikasi khusus untuk user ini
        const { data: notifData, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', currentUserId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (notifData) setNotifications(notifData);
      } catch (error) {
        console.error("Gagal memuat notifikasi:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  // 🌟 2. FUNGSI TANDAI SEMUA DIBACA (UPDATE KE DATABASE)
  const markAllAsRead = async () => {
    if (!myId || notifications.every(n => n.is_read)) return;

    // Update UI seketika (Optimistic UI)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

    // Update Database di latar belakang
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', myId)
        .eq('is_read', false);
    } catch (error) {
      console.error("Gagal menandai dibaca:", error);
    }
  };

  // 🌟 3. FUNGSI TANDAI SATU DIBACA & NAVIGASI PINTAR SAAT DIKLIK
  const handleNotifClick = async (notif: Notification) => {
    // A. Ubah status jadi Read di layar dan Database
    if (!notif.is_read) {
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
    }
    
    // B. Navigasi Pintar (Teleportasi ke halaman yang tepat)
    switch (notif.type.toLowerCase()) {
      case 'chat':
        router.push('/inbox'); // Buka kotak masuk
        break;
      case 'transaksi':
      case 'sistem':
        // Jika itu notif sewa atau isi saldo, langsung buka halaman Riwayat!
        router.push('/history'); 
        break;
      case 'promo':
        router.push('/'); // Kembali ke beranda untuk cari barang
        break;
      default:
        break;
    }
  };

  // 🌟 4. PENERJEMAH TIPE KE IKON & WARNA
  const getNotifStyle = (type: string) => {
    switch (type.toLowerCase()) {
      case 'promo': return { icon: Sparkles, color: 'bg-rose-50 text-rose-500' };
      case 'transaksi': return { icon: Package, color: 'bg-teal-50 text-teal-500' };
      case 'chat': return { icon: MessageSquare, color: 'bg-blue-50 text-blue-500' };
      default: return { icon: Info, color: 'bg-amber-50 text-amber-500' };
    }
  };

  // 🌟 5. FORMAT WAKTU (Relative Time)
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Baru saja';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mnt yang lalu`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam yang lalu`;
    if (diffInSeconds < 172800) return 'Kemarin';
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  // Filter berdasarkan Tab
  const filteredNotifs = notifications.filter(n => {
    if (activeTab === 'Semua') return true;
    if (activeTab === 'Transaksi' && n.type === 'transaksi') return true;
    if (activeTab === 'Promo' && n.type === 'promo') return true;
    return false;
  });

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-[#F2FDFB] text-slate-800">
      
      {/* ================= HEADER ================= */}
      <header className="bg-white px-5 pt-12 pb-4 flex flex-col gap-4 sticky top-0 z-50 rounded-b-[30px] shadow-[0_8px_30px_rgba(0,0,0,0.03)] border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.back()} 
              className="w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </button>
            <h1 className="text-[19px] font-black tracking-tight text-slate-800">Notifikasi</h1>
          </div>
          
          <button 
            onClick={markAllAsRead}
            className="w-10 h-10 flex items-center justify-center text-teal-600 hover:bg-teal-50 rounded-full transition-colors"
            title="Tandai semua dibaca"
          >
            <CheckCheck className="w-5 h-5" />
          </button>
        </div>

        {/* TABS KATEGORI NOTIF */}
        <div className="flex gap-2">
          {['Semua', 'Transaksi', 'Promo'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              
              className={`px-5 py-2 rounded-full text-[13px] font-bold transition-all duration-300 border ${
                activeTab === tab 
                  ? 'bg-teal-500 text-white border-transparent shadow-md shadow-teal-500/20' 
                  : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* ================= LIST NOTIFIKASI ================= */}
      <main className="flex-1 overflow-y-auto px-5 pt-6 pb-24">
        <div className="flex flex-col gap-4">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-teal-500">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p className="text-[13px] font-bold text-slate-500">Memuat info...</p>
            </div>
          ) : filteredNotifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                <CheckCheck className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-[15px] font-bold text-slate-600">Belum ada notifikasi</p>
              <p className="text-[12px] text-center mt-1">Nanti kalau ada info seru, bakal muncul di sini!</p>
            </div>
          ) : (
            filteredNotifs.map((notif) => {
              const { icon: Icon, color } = getNotifStyle(notif.type);
              return (
                <div 
                  key={notif.id} 
                  onClick={() => handleNotifClick(notif)}
                  className={`relative bg-white rounded-[20px] p-4 flex gap-4 transition-all duration-300 cursor-pointer border ${
                    notif.is_read ? 'border-slate-100 shadow-sm' : 'border-teal-100 shadow-[0_8px_30px_rgba(0,198,181,0.06)]'
                  }`}
                >
                  {/* Ikon Notif Dinamis */}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${color}`}>
                    <Icon className="w-6 h-6" />
                  </div>

                  {/* Konten */}
                  <div className="flex-1 pt-0.5">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className={`text-[14px] leading-snug pr-4 ${notif.is_read ? 'font-semibold text-slate-700' : 'font-black text-slate-900'}`}>
                        {notif.title}
                      </h3>
                      {/* Indikator Titik Merah jika belum dibaca */}
                      {!notif.is_read && (
                        <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1.5"></div>
                      )}
                    </div>
                    
                    <p className="text-[12px] text-slate-500 leading-relaxed mb-2 line-clamp-2">
                      {notif.message}
                    </p>
                    
                    {/* Waktu Dinamis */}
                    <span className="text-[10px] font-semibold text-slate-400">
                      {formatTime(notif.created_at)}
                    </span>
                  </div>
                </div>
              );
            })
          )}

        </div>
      </main>

    </div>
  );
}