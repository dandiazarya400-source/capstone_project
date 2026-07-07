"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase'; // Sesuaikan jalurnya

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Memverifikasi Akun Google...");

  useEffect(() => {
    // 🌟 JURUS 1: PASANG SENSOR OTOMATIS
    // Supabase akan berteriak 'SIGNED_IN' tepat di milidetik saat token berhasil diamankan ke memori.
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setStatus("Verifikasi Sukses! Mengalihkan...");
        router.replace('/'); // Tendang ke beranda
      }
    });

    // 🌟 JURUS 2: BACKUP PENGECEKAN MANUAL
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          router.replace('/');
        } else {
          // Jika di percobaan pertama kosong, beri toleransi waktu untuk Supabase mencerna URL
          setTimeout(async () => {
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (retrySession) {
              router.replace('/');
            } else {
              setStatus("Sesi tidak ditemukan. Mengembalikan ke login...");
              setTimeout(() => router.replace('/login'), 2000);
            }
          }, 2000); // Tunggu maksimal 2 detik
        }
      } catch (err) {
        console.error("Gagal verifikasi:", err);
        router.replace('/login');
      }
    };

    checkSession();

    // Bersihkan sensor saat komponen ditutup
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#F2FDFB] text-teal-600">
      <div className="animate-spin h-10 w-10 border-4 border-slate-100 border-b-teal-500 rounded-full mb-4"></div>
      <p className="text-[13px] font-bold text-slate-600 animate-pulse tracking-wide">
        {status}
      </p>
    </div>
  );
}