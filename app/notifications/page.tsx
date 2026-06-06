"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Package, Sparkles, MessageSquare, Info, CheckCheck } from 'lucide-react';

export default function NotificationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Semua');

  // Data Dummy Notifikasi
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'promo',
      title: 'Diskon 50% Khusus Hari Ini! 🎉',
      message: 'Sewa Kamera Sony A6000 sekarang dapat potongan setengah harga. Jangan sampai kehabisan!',
      time: 'Baru saja',
      isRead: false,
      icon: Sparkles,
      color: 'bg-rose-50 text-rose-500',
    },
    {
      id: 2,
      type: 'transaksi',
      title: 'Pesanan Berhasil Dikonfirmasi',
      message: 'Pemilik barang telah menyetujui penyewaan Tenda Camping 4 Orang. Silakan ambil barang sesuai jadwal.',
      time: '2 jam yang lalu',
      isRead: false,
      icon: Package,
      color: 'bg-teal-50 text-teal-500',
    },
    {
      id: 3,
      type: 'chat',
      title: 'Pesan Baru dari Budi',
      message: '"Halo, untuk kameranya besok bisa diambil jam 9 pagi ya di toko saya..."',
      time: 'Kemarin, 14:30',
      isRead: true,
      icon: MessageSquare,
      color: 'bg-blue-50 text-blue-500',
    },
    {
      id: 4,
      type: 'sistem',
      title: 'Pengingat Pengembalian Barang',
      message: 'Waktu sewa Drone DJI Mavic 3 Anda akan habis besok. Mohon kembalikan tepat waktu untuk menghindari denda.',
      time: '2 Hari yang lalu',
      isRead: true,
      icon: Info,
      color: 'bg-amber-50 text-amber-500',
    }
  ]);

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

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
              className={`px-5 py-2 rounded-full text-[13px] font-bold transition-all duration-300 ${
                activeTab === tab 
                  ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20' 
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100'
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
          
          {filteredNotifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                <CheckCheck className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-[15px] font-bold text-slate-600">Belum ada notifikasi</p>
              <p className="text-[12px] text-center mt-1">Nanti kalau ada info seru, bakal muncul di sini!</p>
            </div>
          ) : (
            filteredNotifs.map((notif) => {
              const Icon = notif.icon;
              return (
                <div 
                  key={notif.id} 
                  className={`relative bg-white rounded-[20px] p-4 flex gap-4 transition-all duration-300 cursor-pointer border ${
                    notif.isRead ? 'border-slate-100 shadow-sm' : 'border-teal-100 shadow-[0_8px_30px_rgba(0,198,181,0.06)]'
                  }`}
                >
                  {/* Ikon Notif */}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${notif.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>

                  {/* Konten */}
                  <div className="flex-1 pt-0.5">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className={`text-[14px] leading-snug pr-4 ${notif.isRead ? 'font-semibold text-slate-700' : 'font-black text-slate-900'}`}>
                        {notif.title}
                      </h3>
                      {/* Indikator Titik Merah jika belum dibaca */}
                      {!notif.isRead && (
                        <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1.5"></div>
                      )}
                    </div>
                    
                    <p className="text-[12px] text-slate-500 leading-relaxed mb-2 line-clamp-2">
                      {notif.message}
                    </p>
                    
                    <span className="text-[10px] font-semibold text-slate-400">
                      {notif.time}
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