"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Package, PlusCircle, 
  CalendarCheck, Users, Settings, LogOut,
  Menu, X, Home
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // State untuk mengontrol Sidebar buka/tutup
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        router.replace('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', authData.user.id)
        .single();

      if (profile?.is_admin === true) {
        setIsAdmin(true);
      } else {
        router.replace('/');
      }
      setLoading(false);
    };

    checkAdmin();
  }, [router]);

  const handleLogout = async () => {
    const confirmLogout = window.confirm("Yakin ingin keluar dari Admin Panel?");
    if (confirmLogout) {
      await supabase.auth.signOut();
      router.replace('/login');
    }
  };

  if (loading) return <div className="h-[100dvh] w-full flex items-center justify-center bg-fluent-bg text-fluent-accent">Memverifikasi Akses...</div>;
  if (!isAdmin) return null; 

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { name: 'Manajemen Barang', icon: Package, path: '/admin/items' },
    { name: 'Tambah Barang', icon: PlusCircle, path: '/admin/add' },
    { name: 'Daftar Booking', icon: CalendarCheck, path: '/admin/bookings' },
    { name: 'Data User', icon: Users, path: '/admin/users' },
    { name: 'Pengaturan', icon: Settings, path: '/admin/settings' },
  ];

  return (
    <div className="flex h-[100dvh] w-full bg-fluent-bg text-text-main overflow-hidden relative">
      
      {/* 1. OVERLAY GELAP (Selalu absolute agar tidak keluar dari frame HP) */}
      {isSidebarOpen && (
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* 2. SIDEBAR KIRI (Selalu melayang absolute di atas frame) */}
      <aside 
        className={`absolute top-0 left-0 h-full w-64 bg-[#1A0B2E] border-r border-white/5 flex flex-col z-50 shadow-2xl transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fluent-accent to-white">
              Admin Panel
            </h2>
            <p className="text-[10px] text-text-muted mt-1 uppercase tracking-widest">Workspace</p>
          </div>
          {/* Tombol Tutup Sidebar */}
          <button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-white/5 rounded-full text-text-muted hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-hide">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path || (item.path !== '/admin' && pathname.startsWith(item.path));
            
            return (
              <Link 
                key={item.name} 
                href={item.path}
                onClick={() => setIsSidebarOpen(false)} 
              >
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-fluent-accent text-white shadow-lg shadow-fluent-accent/20 font-bold' 
                    : 'text-text-muted hover:bg-white/5 hover:text-text-main font-medium'
                }`}>
                  <Icon className="w-5 h-5" />
                  <span className="text-sm">{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5 space-y-2">
          <Link href="/" onClick={() => setIsSidebarOpen(false)}>
            <div className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-text-muted hover:bg-white/5 hover:text-white transition-colors font-medium">
              <Home className="w-5 h-5" />
              <span className="text-sm">Lihat Beranda</span>
            </div>
          </Link>
        </div>

        <div className="p-4 border-t border-white/5">
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-400 hover:bg-red-500/10 transition-colors font-medium cursor-pointer">
            <LogOut className="w-5 h-5" />
            <span className="text-sm">Keluar</span>
          </button>
        </div>
      </aside>

      {/* 3. KONTEN UTAMA */}
      <main className="flex-1 h-full overflow-y-auto overflow-x-hidden bg-fluent-bg flex flex-col relative w-full min-w-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        
        {/* HEADER TOP-BAR */}
        <header className="w-full px-5 pt-12 pb-4 border-b border-white/5 flex items-center bg-fluent-bg/95 backdrop-blur-md sticky top-0 z-30 shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 bg-transparent text-text-main hover:bg-white/10 rounded-full transition-colors mr-3"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">Admin Workspace</h1>
        </header>

        <div className="flex-1">
          {children}
        </div>
        
      </main>
      
    </div>
  );
}