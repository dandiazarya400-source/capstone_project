"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Briefcase, Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
// IMPORT SUPABASE DI SINI
import { supabase } from '@/lib/supabase';

const LoginPage = () => {
  const router = useRouter();
  
  // State form & UI
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // === MENGHILANGKAN NOTIFIKASI OTOMATIS ===
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // === FUNGSI LOGIN SUPABASE ===
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      setMessage({ text: 'Login berhasil! Mengalihkan...', type: 'success' });
      
      // Jika sukses, arahkan ke halaman Home / Booking
      setTimeout(() => { 
        router.push('/'); // Ubah '/' ke rute beranda utamamu jika beda
      }, 1500);

    } catch (error: any) {
      console.error('Error saat login:', error);
      let errorMessage = error.message;
      // Terjemahkan error umum
      if (errorMessage.includes("Invalid login credentials")) {
        errorMessage = "Email atau password salah.";
      }
      setMessage({ text: errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-fluent-bg px-4 relative overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-0 w-full h-1/2 bg-gradient-to-b from-fluent-accent/5 to-transparent"></div>
      
      {/* ================= CONTAINER KACA ================= */}
      <div className="w-full max-w-[320px] bg-fluent-card/70 backdrop-blur-sm border border-white/5 rounded-[28px] p-5 shadow-xl relative z-10 animate-in fade-in zoom-in-95 duration-300 max-h-[90dvh] overflow-y-auto scrollbar-hide">
        
        {/* Logo Area */}
        <div className="flex flex-col items-center mb-4 mt-2">
          <div className="w-12 h-12 bg-fluent-bg/80 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-inner border border-white/5 mb-2">
            <Briefcase className="w-6 h-6 text-fluent-accent" />
          </div>
          <h1 className="text-lg font-bold text-text-main">Selamat Datang</h1>
          <p className="text-[10px] text-text-muted mt-0.5">Masuk ke akun kamu</p>
        </div>

        {/* Notifikasi Melayang */}
        <div className="relative h-10 mb-1 w-full">
          {message.text && (
            <div className={`absolute inset-0 flex items-center justify-center px-3 rounded-lg text-[10px] font-bold border animate-in slide-in-from-top-2 fade-in duration-200 ${
              message.type === 'success' 
                ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
              {message.text}
            </div>
          )}
        </div>

        <form onSubmit={handleLogin} className="space-y-3">
          
          {/* Input Email */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider pl-1">Email</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3 w-4 h-4 text-text-muted/60" />
              <input 
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com"
                className="w-full bg-fluent-bg border border-white/5 rounded-xl py-2.5 pl-9 text-xs text-text-main focus:border-fluent-accent/50 transition-all shadow-inner"
              />
            </div>
          </div>

          {/* Input Password */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider pl-1">Password</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 w-4 h-4 text-text-muted/60" />
              <input 
                type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********"
                className="w-full bg-fluent-bg border border-white/5 rounded-xl py-2.5 pl-9 pr-9 text-xs text-text-main focus:border-fluent-accent/50 transition-all shadow-inner"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 text-text-muted/60 hover:text-text-main">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Lupa Password */}
          <div className="flex justify-end pt-1">
            <Link href="#" className="text-[9px] font-medium text-fluent-accent hover:underline">
              Lupa Password?
            </Link>
          </div>

          {/* Login Button */}
          <button type="submit" disabled={loading} className="w-full mt-2 bg-fluent-accent text-white text-xs font-bold py-3 rounded-xl shadow-lg shadow-fluent-accent/20 hover:bg-[#b58eff] transition-all disabled:opacity-50 flex justify-center items-center">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Masuk'}
          </button>
        </form>

        {/* Pemisah Sosial Media (Lebih mungil) */}
        <div className="flex items-center space-x-3 mt-5 mb-4">
          <div className="h-px flex-1 bg-white/5"></div>
          <span className="text-[9px] text-text-muted uppercase tracking-wider">Atau</span>
          <div className="h-px flex-1 bg-white/5"></div>
        </div>

        {/* Tombol Sosial Media (Lebih Compact) */}
        <div className="grid grid-cols-2 gap-3">
          <button className="flex items-center justify-center py-2.5 rounded-xl bg-fluent-bg border border-white/5 hover:border-white/20 transition-all shadow-inner">
             <span className="text-[10px] font-bold text-text-main">Facebook</span>
          </button>
          <button className="flex items-center justify-center py-2.5 rounded-xl bg-fluent-bg border border-white/5 hover:border-white/20 transition-all shadow-inner">
             <span className="text-[10px] font-bold text-text-main">Google</span>
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-5">
          <p className="text-[10px] text-text-muted">
            Belum punya akun? <Link href="/register" className="text-fluent-accent font-bold hover:underline">Daftar</Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;