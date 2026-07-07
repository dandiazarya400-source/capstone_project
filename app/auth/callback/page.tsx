"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase'; // Sesuaikan dengan letak file supabase komandan

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // 🌟 Saat halaman ini terbuka, Supabase secara otomatis sedang
    // menyedot token dari URL (#access_token=...) di belakang layar.
    
   const handleGoogleLogin = async () => {
    // 🌟 LOGIKA CERDAS: Ambil domain saat ini (localhost ATAU vercel.app)
    // lalu tempelkan /auth/callback di belakangnya
    const redirectUrl = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl, // 🌟 Paksa Google pulang ke alamat ini!
      }
    });

    if (error) {
      console.error("Gagal login Google:", error);
    }
  };

    // Beri jeda setengah detik agar mesin Supabase selesai mencerna URL-nya
    const timer = setTimeout(() => {
      handleGoogleLogin();
    }, 500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#F2FDFB] text-teal-600">
      {/* Tampilan Loading Estetik ala Aplikasi Komandan */}
      <div className="animate-spin h-10 w-10 border-4 border-slate-100 border-b-teal-500 rounded-full mb-4"></div>
      <p className="text-[13px] font-bold text-slate-600 animate-pulse tracking-wide">
        Memverifikasi Akun Google...
      </p>
    </div>
  );
}