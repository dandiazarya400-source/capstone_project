"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Package, CalendarCheck, TrendingUp, MessageSquare, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const AdminDashboard = () => {
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

  const [adminRole, setAdminRole] = useState<string | null>(null);

  // State untuk menghindari Hydration Mismatch Next.js
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true); // Aman untuk dirender

    const fetchRealData = async () => {
      try {
        // 1. INSTAN: Gunakan getSession
        const { data: { session } } = await supabase.auth.getSession();
        const currentUserId = session?.user?.id;
        
        if (!currentUserId) return;

        // 2. PARALEL: Tarik Profil (termasuk ROLE) dan Data Barang
        const [profileResponse, itemsResponse] = await Promise.all([
          supabase.from('profiles').select('full_name, role').eq('id', currentUserId).maybeSingle(),
          supabase.from('items').select('id').eq('owner_id', currentUserId)
        ]);

        // --- Set Nama Admin & Role ---
        let newName = 'Admin';
        if (profileResponse.data?.full_name) {
          newName = profileResponse.data.full_name;
        } else if (session.user?.email) {
          newName = session.user.email.split('@')[0];
        }
        setAdminName(newName);
        localStorage.setItem('admin_dashboard_name', newName);

        if (profileResponse.data?.role) {
          setAdminRole(profileResponse.data.role); // Update state dari DB
          localStorage.setItem('admin_dashboard_role', profileResponse.data.role);
        }

        // --- Kalkulasi Statistik Awal ---
        const myItemIds = itemsResponse.data ? itemsResponse.data.map(item => item.id) : [];
        const totalItemsCount = myItemIds.length;

        let activeBookingsCount = 0;
        let totalCustomersCount = 0;
        let totalRevenue = 0;

        // 3. TARIK TRANSAKSI (Hanya jika admin punya barang)
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

        // 4. PERBARUI UI & CACHE Sembunyi-Sembunyi
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
  }, []);

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };

  if (!isMounted) return null;

  return (
    <div className="p-5 w-full mx-auto pb-20 animate-in fade-in duration-300">
      
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-main capitalize">Selamat Datang, {adminName}!</h1>
        <p className="text-text-muted text-[11px] mt-1">Ringkasan performa tokomu hari ini.</p>
      </div>

      {/* ================= TOMBOL EKSKLUSIF SUPERADMIN ================= */}
      {adminRole === 'superadmin' && (
        <Link href="/admin/inbox" className="block mb-5">
          <div className="bg-gradient-to-r from-fluent-accent to-blue-600 p-4 rounded-2xl shadow-[0_8px_20px_rgba(163,116,255,0.25)] flex items-center justify-between hover:scale-[1.02] transition-transform cursor-pointer relative overflow-hidden border border-white/10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shadow-inner">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-sm">Kotak Masuk Pusat</h2>
                <p className="text-white/80 text-[10px] mt-0.5">Pantau keluhan & pertanyaan pelanggan</p>
              </div>
            </div>
            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center relative z-10">
              <ChevronRight className="w-4 h-4 text-white" />
            </div>
          </div>
        </Link>
      )}

      {/* ================= GRID STATISTIK ================= */}
      <div className="grid grid-cols-2 gap-3">
        
        <div className="bg-fluent-card border border-white/5 p-4 rounded-2xl shadow-lg flex flex-col gap-3 hover:border-white/10 transition-colors">
          <div className="w-8 h-8 bg-fluent-accent/20 rounded-xl text-fluent-accent flex justify-center items-center">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-0.5 truncate">Total Alat</p>
            <h2 className="text-xl font-black text-text-main">{stats.totalItems}</h2>
          </div>
        </div>

        <div className="bg-fluent-card border border-white/5 p-4 rounded-2xl shadow-lg flex flex-col gap-3 hover:border-white/10 transition-colors">
          <div className="w-8 h-8 bg-blue-500/20 rounded-xl text-blue-400 flex justify-center items-center">
            <CalendarCheck className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-0.5 truncate">Pesanan Masuk</p>
            <h2 className="text-xl font-black text-text-main">{stats.activeBookings}</h2>
          </div>
        </div>

        <div className="bg-fluent-card border border-white/5 p-4 rounded-2xl shadow-lg flex flex-col gap-3 hover:border-white/10 transition-colors">
          <div className="w-8 h-8 bg-green-500/20 rounded-xl text-green-400 flex justify-center items-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-0.5 truncate">Pelanggan</p>
            <h2 className="text-xl font-black text-text-main">{stats.totalUsers}</h2>
          </div>
        </div>

        <div className="bg-fluent-card border border-white/5 p-4 rounded-2xl shadow-lg flex flex-col gap-3 hover:border-white/10 transition-colors">
          <div className="w-8 h-8 bg-yellow-500/20 rounded-xl text-yellow-400 flex justify-center items-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-0.5 truncate">Pendapatan</p>
            <h2 className="text-base font-black text-fluent-accent line-clamp-1">{formatRupiah(stats.revenue)}</h2>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;