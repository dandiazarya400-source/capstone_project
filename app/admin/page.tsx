"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Package, CalendarCheck, TrendingUp, MessageSquare, ChevronRight, ArrowLeft, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const AdminDashboard = () => {
  const router = useRouter();
  
  // 1. GHOST CACHE: Ambil data dari memori (0 milidetik loading)
  const [stats, setStats] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('admin_dashboard_stats');
      if (cached) return JSON.parse(cached);
    }
    return { totalItems: 0, activeBookings: 0, totalUsers: 0, revenue: 0 };
  });
  
  const [adminName, setAdminName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('admin_dashboard_name') || 'Admin';
    }
    return 'Admin';
  });

  // 🌟 GHOST CACHE UNTUK ROLE: Biar tombol Kotak Masuk langsung muncul 0 detik!
  const [adminRole, setAdminRole] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('admin_dashboard_role');
    }
    return null;
  });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true); 

    const fetchRealData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUserId = session?.user?.id;
        
        if (!currentUserId) return;

        const [profileResponse, itemsResponse] = await Promise.all([
          supabase.from('profiles').select('full_name, role').eq('id', currentUserId).maybeSingle(),
          supabase.from('items').select('id').eq('owner_id', currentUserId)
        ]);

        const userRole = profileResponse.data?.role?.trim().toLowerCase() || 'user';
        
        if (userRole !== 'admin' && userRole !== 'superadmin') {
           localStorage.removeItem('admin_dashboard_role');
           router.push('/profile'); 
           return;
        }

        let newName = 'Admin';
        if (profileResponse.data?.full_name) {
          newName = profileResponse.data.full_name;
        } else if (session.user?.email) {
          newName = session.user.email.split('@')[0];
        }
        setAdminName(newName);
        localStorage.setItem('admin_dashboard_name', newName);

        setAdminRole(userRole); 
        localStorage.setItem('admin_dashboard_role', userRole);

        const myItemIds = itemsResponse.data ? itemsResponse.data.map(item => item.id) : [];
        const totalItemsCount = myItemIds.length;

        let activeBookingsCount = 0;
        let totalCustomersCount = 0;
        let totalRevenue = 0;

        if (myItemIds.length > 0) {
          const { data: myTransactions } = await supabase
            .from('transactions')
            .select('tenant_id, total_price, status')
            .in('item_id', myItemIds);

          if (myTransactions) {
            activeBookingsCount = myTransactions.length;
            
            const uniqueCustomers = new Set(myTransactions.map(tx => tx.tenant_id));
            totalCustomersCount = uniqueCustomers.size;

            totalRevenue = myTransactions
              .filter(tx => ['Selesai', 'Diserahkan'].includes(tx.status))
              .reduce((sum, tx) => sum + (Number(tx.total_price) || 0), 0);
          }
        }

        const newStats = {
          totalItems: totalItemsCount,
          activeBookings: activeBookingsCount,
          totalUsers: totalCustomersCount,
          revenue: totalRevenue
        };
        
        setStats(newStats);
        localStorage.setItem('admin_dashboard_stats', JSON.stringify(newStats));

      } catch (error) {
        console.error("Gagal memuat dashboard:", error);
      }
    };

    fetchRealData();
  }, [router]);

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };

  if (!isMounted) return null;

  return (
    <div className="p-5 w-full mx-auto pb-20 animate-in fade-in duration-300">
      
      {/* ================= GREETING & SWITCH KE PROFIL PRIBADI ================= */}
      <div className="flex items-center justify-between mb-7 mt-2">
        <div>
          <h1 className="text-xl font-black text-slate-800 capitalize tracking-tight leading-tight">
            Selamat Datang, {adminName}!
          </h1>
          <p className="text-slate-500 text-[12px] mt-1 font-medium">
            Ringkasan performa tokomu hari ini.
          </p>
        </div>
        
        {/* 🌟 TOMBOL PENYEBERANGAN KE MODE PEMBELI/PROFIL */}
        <Link 
          href="/profile" 
          title="Beralih ke Profil Pembeli"
          className="p-2.5 bg-white rounded-full text-slate-500 hover:text-teal-600 hover:bg-teal-50 transition-all shadow-[0_4px_10px_rgba(0,0,0,0.03)] border border-slate-100 shrink-0 cursor-pointer active:scale-95"
        >
          <User className="w-5 h-5" />
        </Link>
      </div>

      {/* ================= TOMBOL INBOX UNTUK ADMIN & SUPERADMIN ================= */}
      {(adminRole === 'superadmin' || adminRole === 'admin') && (
        <Link href="/admin/inbox" className="block mb-6">
          <div className="bg-gradient-to-r from-teal-500 to-emerald-400 p-4 rounded-[20px] shadow-[0_8px_20px_rgba(20,184,166,0.25)] flex items-center justify-between hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden border border-teal-400/50">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-3xl"></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md shadow-inner border border-white/30">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              
              {/* 🌟 AREA BUNGLON BERADA DI SINI */}
              <div>
                <h2 className="text-white font-bold text-[16px] drop-shadow-sm tracking-wide">
                  {adminRole === 'superadmin' ? 'Kotak Masuk Pusat' : 'Chat Pelanggan'}
                </h2>
                <p className="text-teal-50 text-[11px] mt-0.5 font-medium drop-shadow-sm">
                  {adminRole === 'superadmin' 
                    ? 'Pantau seluruh percakapan sistem' 
                    : 'Pesan dari penyewa alatmu'}
                </p>
              </div>

            </div>
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center relative z-10 backdrop-blur-sm">
              <ChevronRight className="w-4 h-4 text-white" />
            </div>
          </div>
        </Link>
      )}

      {/* ================= GRID STATISTIK ================= */}
      <div className="grid grid-cols-2 gap-3.5">
        
        {/* Card Total Alat */}
        <div className="bg-white border border-slate-100 p-4 rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col gap-3 hover:border-teal-200 transition-colors group cursor-pointer">
          <div className="w-10 h-10 bg-teal-50 rounded-2xl text-teal-600 flex justify-center items-center group-hover:scale-110 transition-transform">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5 truncate">Total Alat</p>
            <h2 className="text-[22px] font-black text-slate-800">{stats.totalItems}</h2>
          </div>
        </div>

        {/* Card Pesanan Masuk */}
        <div className="bg-white border border-slate-100 p-4 rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col gap-3 hover:border-blue-200 transition-colors group cursor-pointer">
          <div className="w-10 h-10 bg-blue-50 rounded-2xl text-blue-500 flex justify-center items-center group-hover:scale-110 transition-transform">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5 truncate">Pesanan Masuk</p>
            <h2 className="text-[22px] font-black text-slate-800">{stats.activeBookings}</h2>
          </div>
        </div>

        {/* Card Pelanggan */}
        <div className="bg-white border border-slate-100 p-4 rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col gap-3 hover:border-emerald-200 transition-colors group cursor-pointer">
          <div className="w-10 h-10 bg-emerald-50 rounded-2xl text-emerald-500 flex justify-center items-center group-hover:scale-110 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5 truncate">Pelanggan</p>
            <h2 className="text-[22px] font-black text-slate-800">{stats.totalUsers}</h2>
          </div>
        </div>

        {/* Card Pendapatan */}
        <div className="bg-white border border-slate-100 p-4 rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col gap-3 hover:border-amber-200 transition-colors group cursor-pointer">
          <div className="w-10 h-10 bg-amber-50 rounded-2xl text-amber-500 flex justify-center items-center group-hover:scale-110 transition-transform">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5 truncate">Pendapatan</p>
            <h2 className="text-[15px] font-black text-teal-600 line-clamp-1 mt-1">{formatRupiah(stats.revenue)}</h2>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;