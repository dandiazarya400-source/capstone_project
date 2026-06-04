"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Briefcase, Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
// IMPORT SUPABASE-NYA DI SINI
import { supabase } from '@/lib/supabase';

const RegisterPage = () => {
  const router = useRouter();
  
  // State form & UI
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // === FUNGSI MENGHILANGKAN NOTIFIKASI OTOMATIS ===
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 4000); // Pesan hilang setelah 4 detik
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const { error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: { data: { full_name: fullName } }
      });

      if (error) throw error;

      setMessage({ text: 'Registrasi berhasil! Cek email untuk verifikasi.', type: 'success' });
      
      setTimeout(() => { router.push('/login'); }, 2000);

    } catch (error: any) {
      console.error('Error saat register:', error);
      // Terjemahkan error umum agar lebih ramah user
      let errorMessage = error.message;
      if (errorMessage.includes("invalid format")) errorMessage = "Format email tidak valid.";
      if (errorMessage.includes("weak_password")) errorMessage = "Password terlalu lemah (min 6 karakter).";
      if (errorMessage.includes("already registered")) errorMessage = "Email ini sudah terdaftar.";
      
      setMessage({ text: errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-fluent-bg px-4 relative overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-0 w-full h-1/2 bg-gradient-to-b from-fluent-accent/5 to-transparent"></div>
      
      {/* ================= CONTAINER UTAMA ================= */}
      {/* max-h-[90dvh] dan overflow-y-auto memastikan konten bisa di-scroll jika layar HP sangat kecil */}
      <div className="w-full max-w-[320px] bg-fluent-card/70 backdrop-blur-sm border border-fluent-accent/10 rounded-[28px] p-5 shadow-xl relative z-10 animate-in fade-in zoom-in-95 duration-300 max-h-[90dvh] overflow-y-auto scrollbar-hide">
        
        {/* Logo Area */}
        <div className="flex flex-col items-center mb-4">
          <div className="w-12 h-12 bg-fluent-bg/80 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-inner border border-fluent-accent/10 mb-2">
            <Briefcase className="w-6 h-6 text-fluent-accent" />
          </div>
          <h1 className="text-lg font-bold text-text-main">Buat Akun</h1>
          <p className="text-[10px] text-text-muted mt-0.5">Daftar untuk mulai menyewa</p>
        </div>

        {/* Notifikasi Dinamis (Absolute positioning agar tidak mendorong konten lain) */}
        <div className="relative h-10 mb-2 w-full">
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

        <form onSubmit={handleRegister} className="space-y-3">
          
          {/* Input Nama */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider pl-1">Nama Lengkap</label>
            <div className="relative flex items-center">
              <User className="absolute left-3 w-4 h-4 text-text-muted/60" />
              <input 
                type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Contoh: Jecky"
                className="w-full bg-fluent-bg border border-fluent-accent/10 rounded-xl py-2.5 pl-9 text-xs text-text-main focus:border-fluent-accent/50 transition-all shadow-inner"
              />
            </div>
          </div>

          {/* Input Email */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider pl-1">Email</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3 w-4 h-4 text-text-muted/60" />
              <input 
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com"
                autoComplete="off"
                className="w-full bg-fluent-bg border border-fluent-accent/10 rounded-xl py-2.5 pl-9 text-xs text-text-main focus:border-fluent-accent/50 transition-all shadow-inner"
              />
            </div>
          </div>

          {/* Input Password */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider pl-1">Password</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 w-4 h-4 text-text-muted/60" />
              <input 
                type={showPassword ? "text" : "password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 karakter"
                autoComplete="new-password"
                className="w-full bg-fluent-bg border border-fluent-accent/10 rounded-xl py-2.5 pl-9 pr-9 text-xs text-text-main focus:border-fluent-accent/50 transition-all shadow-inner"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 text-text-muted/60 hover:text-text-main">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Button */}
          <button type="submit" disabled={loading} className="w-full mt-4 bg-fluent-accent text-white text-xs font-bold py-3 rounded-xl shadow-lg shadow-fluent-accent/20 hover:bg-[#b58eff] transition-all disabled:opacity-50 flex justify-center items-center">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Daftar Sekarang'}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center mt-4">
          <p className="text-[10px] text-text-muted">
            Sudah punya akun? <Link href="/login" className="text-fluent-accent font-bold hover:underline">Masuk</Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default RegisterPage;