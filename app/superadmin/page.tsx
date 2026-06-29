"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Store, ShieldAlert, Flag, Clock,
  ArrowRight, Loader2, Crown, TrendingUp, 
  Activity, CheckCircle, AlertCircle, Megaphone
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface DashboardStats {
  totalUsers: number;
  totalStores: number;
  pendingVerifications: number;
  totalReports: number;
}

export default function SuperadminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalStores: 0,
    pendingVerifications: 0,
    totalReports: 0
  });
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState('Superadmin');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // 1. Ambil Nama Superadmin yang sedang login
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', session.user.id)
            .single();
          if (profile?.full_name) setAdminName(profile.full_name);
        }

        // 2. Tarik Statistik Global Beruntun (Menggunakan count kepala agar super cepat)
        const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        const { count: storesCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin');
        const { count: pendingCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending');
        
        // Guna mengantisipasi jika tabel 'reports' belum komandan buat di DB, kita bungkus try-catch kecil
        let reportsCount = 0;
        try {
          const { count } = await supabase.from('reports').select('*', { count: 'exact', head: true });
          reportsCount = count || 0;
        } catch (e) {
          console.log("Tabel reports belum siap atau kosong.");
        }

        setStats({
          totalUsers: usersCount || 0,
          totalStores: storesCount || 0,
          pendingVerifications: pendingCount || 0,
          totalReports: reportsCount
        });

      } catch (error) {
        console.error("Gagal memuat statistik makro:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="h-[70vh] w-full flex flex-col items-center justify-center text-primary gap-2">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-xs font-bold tracking-wider uppercase opacity-70">Menghubungkan ke Satelit Pusat...</span>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-[#F2FDFB] text-main">
      <main className="w-full px-5 pt-4 pb-24 space-y-6">
        
        {/* 👑 KARTU SELAMAT DATANG */}
        <div className="bg-gradient-to-br from-teal-700 to-teal-900 border border-teal-600/20 rounded-[32px] p-5 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full blur-xl" />
          <div className="flex items-center gap-2 bg-white/10 w-fit px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 backdrop-blur-sm">
            <Crown className="w-3 h-3 text-yellow-400 fill-yellow-400" /> Platform Owner
          </div>
          <h1 className="text-xl font-black leading-tight">Halo, {adminName}!</h1>
          <p className="text-xs text-teal-100/80 mt-1 leading-relaxed">Semua sistem termonitor dengan baik. Berikut ringkasan kendali platform hari ini.</p>
        </div>

        {/* 📊 GRID STATISTIK GLOBAL (2 Kolom Presisi) */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-muted uppercase tracking-wider ml-1">Kesehatan Platform</p>
          <div className="grid grid-cols-2 gap-3">
            
            {/* Total Pengguna (Tanpa Panah) */}
            <div 
              onClick={() => router.push('/superadmin/users')}
              className="bg-surface border border-primary/10 rounded-2xl p-4 shadow-sm flex flex-col justify-between h-28 cursor-pointer hover:bg-primary/5 active:scale-95 transition-all"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center"><Users className="w-4 h-4" /></div>
              <div>
                <span className="text-xl font-black text-main block tracking-tight">{stats.totalUsers}</span>
                <span className="text-[10px] font-bold text-muted uppercase tracking-wide mt-0.5 block">Total User</span>
              </div>
            </div>

            {/* Total Mitra Toko (Tanpa Panah) */}
              <div 
                onClick={() => router.push('/superadmin/stores')} // ✅ INI BARU TEPAT SASARAN!
                className="bg-surface border border-primary/10 rounded-2xl p-4 shadow-sm flex flex-col justify-between h-28 cursor-pointer hover:bg-primary/5 active:scale-95 transition-all"
              >
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center"><Store className="w-4 h-4" /></div>
              <div>
                <span className="text-xl font-black text-main block tracking-tight">{stats.totalStores}</span>
                <span className="text-[10px] font-bold text-muted uppercase tracking-wide mt-0.5 block">Mitra Toko</span>
              </div>
            </div>

            {/* Antrian KTP (Sekarang Bisa Di-Klik!) */}
            <div 
              onClick={() => router.push('/superadmin/verification')}
              className={`border rounded-2xl p-4 shadow-sm flex flex-col justify-between h-28 transition-all cursor-pointer active:scale-95 ${
                stats.pendingVerifications > 0 
                  ? 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20 animate-in fade-in duration-500' 
                  : 'bg-surface border-primary/10 hover:bg-primary/5'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  stats.pendingVerifications > 0 ? 'bg-yellow-500 text-white animate-pulse shadow-lg shadow-yellow-500/30' : 'bg-slate-500/10 text-slate-500'
                }`}><ShieldAlert className="w-4 h-4" /></div>
                
                
              </div>
              
              <div>
                <span className={`text-xl font-black block tracking-tight ${stats.pendingVerifications > 0 ? 'text-yellow-600' : 'text-main'}`}>{stats.pendingVerifications}</span>
                <span className="text-[10px] font-bold text-muted uppercase tracking-wide mt-0.5 block">Antrian KTP</span>
              </div>
            </div>

            {/* Laporan Pengaduan */}
            <div className={`border rounded-2xl p-4 shadow-sm flex flex-col justify-between h-28 ${
              stats.totalReports > 0 ? 'bg-rose-500/10 border-rose-500/30' : 'bg-surface border-primary/10'
            }`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                stats.totalReports > 0 ? 'bg-rose-500 text-white' : 'bg-slate-500/10 text-slate-500'
              }`}><Flag className="w-4 h-4" /></div>
              <div>
                <span className={`text-xl font-black block tracking-tight ${stats.totalReports > 0 ? 'text-rose-500' : 'text-main'}`}>{stats.totalReports}</span>
                <span className="text-[10px] font-bold text-muted uppercase tracking-wide mt-0.5 block">Laporan Toko</span>
              </div>
            </div>

          </div>
        </div>

        {/* ⚡ PINTASAN KENDALI (QUICK ACTIONS) */}
        <div className="space-y-2.5">
          <p className="text-[10px] font-bold text-muted uppercase tracking-wider ml-1">Gerbang Navigasi</p>
          
          {/* Menu 1: Verifikasi KTP */}
          <button 
            onClick={() => router.push('/superadmin/verification')}
            className="w-full flex items-center justify-between p-4 bg-surface border border-primary/10 rounded-2xl hover:bg-primary/5 transition-all text-left shadow-sm group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0"><CheckCircle className="w-4 h-4" /></div>
              <div>
                <p className="text-sm font-bold text-main">Eksekusi Verifikasi KTP</p>
                <p className="text-[10px] text-muted">
                  {stats.pendingVerifications > 0 
                    ? `Ada ${stats.pendingVerifications} akun meminta verifikasi` 
                    : 'Semua antrian identitas beres'}
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>

          {/* Menu 2: Laporan Masalah */}
          <button 
            onClick={() => router.push('/superadmin/reports')}
            className="w-full flex items-center justify-between p-4 bg-surface border border-primary/10 rounded-2xl hover:bg-primary/5 transition-all text-left shadow-sm group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0"><AlertCircle className="w-4 h-4" /></div>
              <div>
                <p className="text-sm font-bold text-main">Daftar Laporan Pelanggaran</p>
                <p className="text-[10px] text-muted">Pantau sengketa barang hilang atau rusak</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>

          {/* Menu 3: Manajemen Semua Toko */}
          <button 
            onClick={() => router.push('/superadmin/stores')}
            className="w-full flex items-center justify-between p-4 bg-surface border border-primary/10 rounded-2xl hover:bg-primary/5 transition-all text-left shadow-sm group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0"><Store className="w-4 h-4" /></div>
              <div>
                <p className="text-sm font-bold text-main">Kelola Seluruh Mitra Toko</p>
                <p className="text-[10px] text-muted">Lihat performa toko terdaftar di platform</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>

          {/* Menu 4: Manajemen Promo Utama */}
          <button 
            onClick={() => router.push('/superadmin/promos')}
            className="w-full flex items-center justify-between p-4 bg-surface border border-primary/10 rounded-2xl hover:bg-primary/5 transition-all text-left shadow-sm group"
          >
            <div className="flex items-center gap-3.5">
              {/* Menggunakan warna Orange agar menonjol sebagai fitur Marketing */}
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                <Megaphone className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-main">Manajemen Banner Promo</p>
                <p className="text-[10px] text-muted">Atur banner promosi tayang di Beranda User</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>
        </div>

        {/* 📈 INDIKATOR AKTIVITAS GLOBAL */}
        <div className="bg-surface border border-primary/10 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 animate-pulse">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-main">Satelit Server Terhubung</p>
            <p className="text-[9px] text-muted leading-tight mt-0.5">Seluruh database terenkripsi end-to-end dengan aman.</p>
          </div>
        </div>

      </main>
    </div>
  );
}