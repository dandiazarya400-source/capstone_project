"use client";

import React, { useEffect, useState } from 'react';
import { Users, Package, CalendarCheck, TrendingUp, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const AdminDashboard = () => {
  // State untuk menyimpan angka asli dari database
  const [stats, setStats] = useState({
    totalItems: 0,
    activeBookings: 0,
    totalUsers: 0,
    revenue: 0
  });
  
  const [loading, setLoading] = useState(true);
  
  // State untuk menyimpan nama Admin
  const [adminName, setAdminName] = useState('Admin');

  useEffect(() => {
    const fetchRealData = async () => {
      try {
        setLoading(true);

        // 1. Ambil ID Admin yang sedang login
        const { data: authData } = await supabase.auth.getUser();
        const currentUserId = authData.user?.id;

        if (!currentUserId) return;

        // 2. AMBIL NAMA ADMIN DARI DATABASE (Tabel profiles)
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name') // Ganti jadi 'name' atau 'username' jika nama kolommu berbeda
          .eq('id', currentUserId)
          .single();

        if (profile && profile.full_name) {
          setAdminName(profile.full_name);
        } else if (authData.user?.email) {
          // Jika full_name kosong, gunakan awalan email
          const emailName = authData.user.email.split('@')[0];
          setAdminName(emailName);
        }

        // 3. HITUNG TOTAL BARANG MILIK ADMIN
        const { count: itemsCount, error: itemsError } = await supabase
          .from('items')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', currentUserId);

        if (itemsError) console.error("Error fetch items:", itemsError);

        // 4. HITUNG TOTAL USER
        let usersCount = 0;
        try {
          const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
          usersCount = count || 0;
        } catch (e) {
          // Abaikan jika tabel profiles belum ada/dikunci RLS
        }

        // 5. HITUNG PESANAN AKTIF
        let bookingsCount = 0;
        try {
          const { count } = await supabase.from('bookings').select('*', { count: 'exact', head: true });
          bookingsCount = count || 0;
        } catch (e) {
          // Abaikan jika tabel bookings belum kita buat
        }

        // 6. Update state statistik
        setStats({
          totalItems: itemsCount || 0,
          activeBookings: bookingsCount,
          totalUsers: usersCount,
          revenue: 0 // Pendapatan biarkan 0 dulu
        });

      } catch (error) {
        console.error("Gagal memuat dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRealData();
  }, []);

  // Format Rupiah untuk pendapatan nanti
  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };

  return (
    <div className="p-5 w-full mx-auto pb-20">
      
      <div className="mb-6">
        {/* NAMA ADMIN TAMPIL DI SINI */}
        <h1 className="text-xl font-bold text-text-main capitalize">Selamat Datang, {adminName}!</h1>
        <p className="text-text-muted text-[11px] mt-1">Ringkasan performa aplikasimu hari ini.</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-50">
          <Loader2 className="w-8 h-8 text-fluent-accent animate-spin mb-3" />
          <p className="text-xs text-text-muted font-medium">Menyiapkan Workspace Anda...</p>
        </div>
      ) : (
        /* Kartu Statistik */
        <div className="grid grid-cols-2 gap-3">
          
          {/* Total Barang */}
          <div className="bg-fluent-card border border-white/5 p-4 rounded-2xl shadow-lg flex flex-col gap-3 hover:border-white/10 transition-colors">
            <div className="w-8 h-8 bg-fluent-accent/20 rounded-xl text-fluent-accent flex justify-center items-center">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-0.5 truncate">Total Alat</p>
              <h2 className="text-xl font-black text-text-main">{stats.totalItems}</h2>
            </div>
          </div>

          {/* Total Booking */}
          <div className="bg-fluent-card border border-white/5 p-4 rounded-2xl shadow-lg flex flex-col gap-3 hover:border-white/10 transition-colors">
            <div className="w-8 h-8 bg-blue-500/20 rounded-xl text-blue-400 flex justify-center items-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-0.5 truncate">Pesanan Aktif</p>
              <h2 className="text-xl font-black text-text-main">{stats.activeBookings}</h2>
            </div>
          </div>

          {/* Total User */}
          <div className="bg-fluent-card border border-white/5 p-4 rounded-2xl shadow-lg flex flex-col gap-3 hover:border-white/10 transition-colors">
            <div className="w-8 h-8 bg-green-500/20 rounded-xl text-green-400 flex justify-center items-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-0.5 truncate">Total User</p>
              <h2 className="text-xl font-black text-text-main">{stats.totalUsers}</h2>
            </div>
          </div>

          {/* Pendapatan */}
          <div className="bg-fluent-card border border-white/5 p-4 rounded-2xl shadow-lg flex flex-col gap-3 hover:border-white/10 transition-colors">
            <div className="w-8 h-8 bg-yellow-500/20 rounded-xl text-yellow-400 flex justify-center items-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-0.5 truncate">Pendapatan</p>
              <h2 className="text-xl font-black text-fluent-accent">{formatRupiah(stats.revenue)}</h2>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default AdminDashboard;