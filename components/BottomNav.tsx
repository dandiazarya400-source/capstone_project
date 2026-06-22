"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, History, User } from 'lucide-react';

const BottomNav = () => {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;

  return (
    // Kita ubah absolute posisinya, beri margin kiri/kanan, dan buat rounded-full
    <nav className="absolute bottom-6 left-6 right-6 bg-surface/80 backdrop-blur-xl p-4 rounded-full shadow-[0_10px_25px_-5px_rgba(0,0,0,0.3)] border border-white/10 z-50">
      <div className="flex items-center justify-around">
        
        {/* Tombol Beranda */}
        <Link href="/" className={isActive("/") ? "text-teal-500" : "text-muted hover:text-teal-500 transition-colors"}>
          <Home className="w-6 h-6" strokeWidth={isActive("/") ? 2.5 : 2} />
        </Link>

        {/* Tombol Riwayat */}
        <Link href="/history" className={isActive("/history") ? "text-teal-500" : "text-muted hover:text-teal-500 transition-colors"}>
          <History className="w-6 h-6" strokeWidth={isActive("/history") ? 2.5 : 2} />
        </Link>

        {/* Tombol Profil */}
        <Link href="/profile" className={isActive("/profile") ? "text-teal-500" : "text-muted hover:text-teal-500 transition-colors"}>
          <User className="w-6 h-6" strokeWidth={isActive("/profile") ? 2.5 : 2} />
        </Link>

      </div>
    </nav>
  );
};

export default BottomNav;