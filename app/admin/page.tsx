"use client";

import React, { useEffect, useState } from 'react';
import { Users, Package, CalendarCheck, TrendingUp, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalItems: 0,
    activeBookings: 0,
    totalUsers: 0,
    revenue: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState('Admin');

  useEffect(() => {
    const fetchRealData = async () => {
      try {
        setLoading(true);

        // 1. Ambil ID Admin yang sedang login
        const { data: authData } = await supabase.auth.getUser();
        const currentUserId = authData.user?.id;

        if (!currentUserId) return;

        // 2. AMBIL NAMA ADMIN
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', currentUserId)
          .single();

        if (profile && profile.full_name) {
          setAdminName(profile.full_name);
        } else if (authData.user?.email) {
          const emailName = authData.user.email.split('@')[0];
          setAdminName(emailName);
        }

        // ================= LOGIKA MARKETPLACE MULTI-VENDOR =================

        // 3. AMBIL SEMUA ID BARANG MILIK ADMIN INI
        const { data: myItems } = await supabase
          .from('items')
          .select('id')
          .eq('owner_id', currentUserId);

        const myItemIds = myItems ? myItems.map(item => item.id) : [];
        const totalItemsCount = myItemIds.length;

        let activeBookingsCount = 0;
        let totalCustomersCount = 0;
        let totalRevenue = 0;

        // 4. JIKA ADMIN PUNYA BARANG, CARI TRANSAKSINYA
        if (myItemIds.length > 0) {
          // Tarik data dari tabel transactions khusus untuk barang milik admin ini
          const { data: myTransactions } = await supabase
            .from('transactions')
            .select('tenant_id, total_price, status')
            .in('item_id', myItemIds); // <--- KUNCI RAHASIANYA DI SINI!

          if (myTransactions) {
            // Hitung total pesanan
            activeBookingsCount = myTransactions.length;

            // Hitung Pelanggan Unik (Satu orang sewa 3 kali, tetap dihitung 1 pelanggan)
            const uniqueCustomers = new Set(myTransactions.map(tx => tx.tenant_id));
            totalCustomersCount = uniqueCustomers.size;

            // [FIX BUG PENDAPATAN] Hanya hitung jika statusnya 'Selesai' atau 'Diserahkan'
            totalRevenue = myTransactions
              .filter(tx => ['Selesai', 'Diserahkan'].includes(tx.status))
              .reduce((sum, tx) => sum + (Number(tx.total_price) || 0), 0);
          }
        }

        // 5. UPDATE STATE STATISTIK
        setStats({
          totalItems: totalItemsCount,
          activeBookings: activeBookingsCount,
          totalUsers: totalCustomersCount, // Berubah makna dari "Semua User" menjadi "Pelanggan Toko Ini"
          revenue: totalRevenue
        });

      } catch (error) {
        console.error("Gagal memuat dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRealData();
  }, []);

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };

  return (
    <div className="p-5 w-full mx-auto pb-20">
      
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-main capitalize">Selamat Datang, {adminName}!</h1>
        <p className="text-text-muted text-[11px] mt-1">Ringkasan performa tokomu hari ini.</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-50">
          <Loader2 className="w-8 h-8 text-fluent-accent animate-spin mb-3" />
          <p className="text-xs text-text-muted font-medium">Menyiapkan Workspace Anda...</p>
        </div>
      ) : (
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
      )}

    </div>
  );
};

export default AdminDashboard;