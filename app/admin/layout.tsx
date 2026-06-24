"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Package, PlusCircle, 
  CalendarCheck, Users, Settings, LogOut,
  Menu, X, Home, ShieldCheck, Flag
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // State untuk mengontrol Sidebar buka/tutup
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        // 🌟 JURUS JARING GANDA: Cek session lokal dulu (0 milidetik)
        const { data: { session } } = await supabase.auth.getSession();
        let user: any = session?.user;

        // Kalau di session lokal kosong, baru kita panggil server Supabase
        if (!user) {
          const { data: authData } = await supabase.auth.getUser();
          user = authData?.user;
        }

        // Kalau dua-duanya tetap kosong, baru usir ke login
        if (!user) {
          console.warn("CCTV Admin Layout: Sesi kosong, melempar ke login...");
          router.replace('/login');
          return;
        }

        // 🌟 PERBAIKAN: Tarik kolom 'role' dari database
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role') 
          .eq('id', user.id)
          .single();

        if (error) {
          console.error("CCTV Admin Layout - Gagal cek role:", error.message);
          router.replace('/');
          return;
        }

        // 🌟 PERBAIKAN LOGIKA: Simpan role yang spesifik ke dalam state
        if (profile?.role === 'admin' || profile?.role === 'superadmin') {
          setUserRole(profile.role);
        } else {
          router.replace('/'); 
        }
      } catch (err) {
        console.error("Error Sistem di Admin Layout:", err);
        router.replace('/');
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [router]);


  if (loading) return <div className="h-[100dvh] w-full flex items-center justify-center bg-background text-primary">Memverifikasi Akses...</div>;
  if (!userRole) return null;

  // 🌟 MAGIC MENU: Kita tentukan siapa yang boleh melihat menu apa
  const menuItems = [
    // --- MENU ADMIN TOKO ---
    { name: 'Dashboard', icon: LayoutDashboard, path: '/admin', roles: ['admin'] },
    { name: 'Manajemen Barang', icon: Package, path: '/admin/items', roles: ['admin'] },
    { name: 'Tambah Barang', icon: PlusCircle, path: '/admin/add', roles: ['admin'] },
    { name: 'Daftar Booking', icon: CalendarCheck, path: '/admin/bookings', roles: ['admin'] },
    { name: 'Data User', icon: Users, path: '/admin/users', roles: ['admin'] },
    { name: 'Pengaturan Toko', icon: Settings, path: '/admin/settings', roles: ['admin'] },

    // --- MENU SUPERADMIN (KOMANDAN PUSAT) ---
    { name: 'Dashboard Pusat', icon: LayoutDashboard, path: '/superadmin', roles: ['superadmin'] },
    { name: 'Verifikasi KTP', icon: ShieldCheck, path: '/superadmin/verification', roles: ['superadmin'] },
    { name: 'Laporan Masalah', icon: Flag, path: '/superadmin/reports', roles: ['superadmin'] },
    { name: 'Semua Toko', icon: Package, path: '/superadmin/stores', roles: ['superadmin'] },
    { name: 'Pengaturan Sistem', icon: Settings, path: '/superadmin/settings', roles: ['superadmin'] },
  ];

  return (
    <div className="flex h-[100dvh] w-full bg-[#F2FDFB] text-slate-800 overflow-hidden relative">
      
      {/* 1. OVERLAY GELAP (Selalu absolute agar tidak keluar dari frame HP) */}
      {isSidebarOpen && (
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* 2. SIDEBAR KIRI (Selalu melayang absolute di atas frame) */}
      <aside 
        className={`absolute top-0 left-0 h-full w-64 bg-background border-r border-primary/10 flex flex-col z-50 shadow-2xl transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-primary/10 flex justify-between items-center">
          <div>
            {/* 🌟 JUDUL DINAMIS SESUAI ROLE */}
            <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-teal-300">
              {userRole === 'superadmin' ? 'Superadmin' : 'Admin'} Panel
            </h2>
            <p className="text-[10px] text-muted mt-1 uppercase tracking-widest">Workspace</p>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-primary/5 rounded-full text-muted hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-hide">
          {/* 🌟 FILTER MENU: Hanya tampilkan menu yang roles-nya cocok dengan userRole */}
          {menuItems
            .filter((item) => item.roles.includes(userRole))
            .map((item) => {
            const Icon = item.icon;
            // Logika aktifnya juga disesuaikan agar tidak bentrok
            const isActive = pathname === item.path || (item.path !== '/admin' && item.path !== '/superadmin' && pathname.startsWith(item.path));
            
            return (
              <Link 
                key={item.name} 
                href={item.path}
                onClick={() => setIsSidebarOpen(false)} 
              >
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20 font-bold' 
                    : 'text-muted hover:bg-primary/5 hover:text-main font-medium'
                }`}>
                  <Icon className="w-5 h-5" />
                  <span className="text-sm">{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-primary/10 space-y-2">
          <Link href="/" onClick={() => setIsSidebarOpen(false)}>
            <div className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-muted hover:bg-primary/5 hover:text-white transition-colors font-medium">
              <Home className="w-5 h-5" />
              <span className="text-sm">Lihat Beranda</span>
            </div>
          </Link>
        </div>

        <div className="p-4 border-t border-primary/10">
          <button onClick={() => {
        setIsSidebarOpen(false); // Tutup sidebar dulu biar rapi
        setShowLogoutModal(true); // Tampilkan modal custom
      }} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-400 hover:bg-red-500/10 transition-colors font-medium cursor-pointer">
            <LogOut className="w-5 h-5" />
            <span className="text-sm">Keluar</span>
          </button>
        </div>
      </aside>

      {/* 3. KONTEN UTAMA */}
      {/* 🌟 PERBAIKAN: Hentikan scroll bawaan layout JIKA sedang di halaman inbox */}
      <main className={`flex-1 h-full flex flex-col relative w-full min-w-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${pathname === '/admin/inbox' ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'}`}>
        
        {/* 🌟 PERBAIKAN: Ubah bg-background/95 menjadi bg-background (Solid) dan naikkan ke z-40 */}
        {pathname !== '/admin/inbox' && (
          <header className="w-full px-5 pt-12 pb-4 border-b border-primary/10 flex items-center bg-background sticky top-0 z-40 shrink-0">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 bg-transparent text-main hover:bg-white/10 rounded-full transition-colors mr-3"
            >
              <Menu className="w-6 h-6" />
            </button>
            {/* 🌟 HEADER DINAMIS SESUAI ROLE */}
            <h1 className="text-lg font-bold">
              {userRole === 'superadmin' ? 'Superadmin Workspace' : 'Admin Workspace'}
            </h1>
          </header>
        )}

        <div className={`flex-1 ${pathname === '/admin/inbox' ? 'h-full flex flex-col' : ''}`}>
          {children}
        </div>
        
      </main>
      {/* ======================================================= */}
      {/* MODAL KONFIRMASI KELUAR CUSTOM */}
      {/* ======================================================= */}
      {showLogoutModal && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-5 bg-black/70 backdrop-blur-sm">
          <div className="bg-surface border border-white/10 w-full max-w-[280px] rounded-[28px] p-5 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            
            <div className="w-14 h-14 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mb-3 shadow-inner border border-red-500/20">
              <LogOut className="w-6 h-6 ml-1" />
            </div>
            
            <h3 className="text-base font-bold text-main mb-1.5">Keluar Admin?</h3>
            
            <p className="text-xs text-muted mb-6 leading-relaxed">
              Sesi kamu akan diakhiri dan harus masuk kembali untuk mengakses panel.
            </p>
            
            <div className="flex w-full gap-2.5">
              <button 
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 rounded-2xl text-xs font-bold text-muted bg-primary/5 border border-primary/10 hover:bg-white/10 hover:text-main transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={async () => {
                  setShowLogoutModal(false);
                  
                  // Logika Sign Out Supabase dipindah ke sini
                  await supabase.auth.signOut();
                  router.replace('/login');
                }}
                className="flex-1 py-2.5 rounded-2xl text-xs font-bold text-white bg-red-500 shadow-[0_4px_20px_rgba(239,68,68,0.4)] hover:bg-red-600 transition-colors"
              >
                Ya, Keluar
              </button>
            </div>

          </div>
        </div>
      )}
      
    </div>
  );
}