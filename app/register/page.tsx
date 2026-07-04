"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Eye, EyeOff, Loader2, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const RegisterPage = () => {
  const router = useRouter();
  
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
      }, 4000); 
      return () => clearTimeout(timer);
    }
  }, [message]);

  // === FUNGSI REGISTER SUPABASE ===
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 🌟 ANTI-SPAM GUARD: Jika masih loading atau notif masih ada, blokir klik tambahan
    if (loading || message.text) return;

    setLoading(true);
    setMessage({ text: '', type: '' });

    // Filter Gmail
    if (!email.toLowerCase().endsWith('@gmail.com')) {
      setMessage({ text: 'Pendaftaran hanya mengizinkan akun @gmail.com', type: 'error' });
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: { data: { full_name: fullName } }
      });

      if (error) throw error;

      // Jika sukses, beri tahu user untuk cek inbox email asli mereka
      setMessage({ text: 'Registrasi sukses! Silakan cek inbox email Anda untuk verifikasi.', type: 'success' });
      
      // Kosongkan form
      setFullName('');
      setEmail('');
      setPassword('');

      setTimeout(() => { router.push('/login'); }, 3500);

    } catch (error: any) {
      console.error('Error saat register:', error);
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
    <div className="w-full h-full flex flex-col bg-teal-500 overflow-hidden relative font-sans">

      {/* 🌟 1. NOTIFIKASI DI LAYAR TERDEPAN (FLOATING TOAST GLOBAL) */}
      {message.text && (
        <div className="absolute top-10 inset-x-0 mx-auto w-[85%] z-[100] pointer-events-none flex justify-center">
          <div className={`flex items-center gap-2 px-4 py-3.5 w-full rounded-2xl shadow-2xl border backdrop-blur-md animate-in slide-in-from-top-5 duration-300 pointer-events-auto ${
            message.type === 'success' 
              ? 'bg-[#1a2e23]/90 border-emerald-500/40 text-emerald-400' 
              : 'bg-[#2a1414]/90 border-rose-500/40 text-rose-400'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />} 
            <span className="text-[12px] font-bold tracking-wide leading-snug">{message.text}</span>
          </div>
        </div>
      )}
      
      {/* DEKORASI BACKGROUND */}
      <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-teal-400 rounded-full blur-2xl opacity-60"></div>
      <div className="absolute top-[10%] left-[-20px] w-32 h-32 bg-teal-600 rounded-full blur-xl opacity-50"></div>
      
      <div className="absolute top-12 right-6 opacity-20 pointer-events-none">
        <svg width="100" height="120" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M50 0C77.6142 0 100 22.3858 100 50C100 77.6142 50 120 50 120C50 120 0 77.6142 0 50C0 22.3858 22.3858 0 50 0Z" fill="white"/>
        </svg>
      </div>

      {/* HEADER TEKS */}
      <div className="pt-16 px-8 relative z-10 shrink-0">
        <h1 className="text-[36px] font-bold text-white leading-none tracking-tight mb-2">Create Account</h1>
        <p className="text-[14px] font-medium text-teal-50 opacity-90">Bergabunglah bersama kami</p>
      </div>

      {/* BOTTOM SHEET CONTAINER */}
      <div className="flex-1 bg-white mt-8 rounded-t-[40px] px-8 pt-8 pb-6 flex flex-col relative z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] overflow-y-auto scrollbar-hide">
        
        <button 
          onClick={() => router.push('/login')} 
          className="flex items-center text-slate-400 hover:text-teal-500 transition-colors mb-4 w-fit"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span className="text-[13px] font-bold">Back to login</span>
        </button>

        <h2 className="text-[28px] font-bold text-slate-800 mb-6">Sign Up</h2>

        <form onSubmit={handleRegister} className="space-y-4">
          
          {/* Input Nama Lengkap */}
          <div className="relative flex items-center">
            <User className="absolute left-5 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              required 
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)} 
              placeholder="Nama Lengkap"
              className="w-full bg-slate-50 border border-slate-200 rounded-full py-4 pl-12 pr-5 text-[14px] font-medium text-slate-800 focus:outline-none focus:border-teal-400 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Input Email */}
          <div className="relative flex items-center">
            <Mail className="absolute left-5 w-5 h-5 text-slate-400" />
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="Email"
              autoComplete="off"
              className="w-full bg-slate-50 border border-slate-200 rounded-full py-4 pl-12 pr-5 text-[14px] font-medium text-slate-800 focus:outline-none focus:border-teal-400 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Input Password */}
          <div className="relative flex items-center">
            <Lock className="absolute left-5 w-5 h-5 text-slate-400" />
            <input 
              type={showPassword ? "text" : "password"} 
              required 
              minLength={6} 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Password (Min 6 karakter)"
              autoComplete="new-password"
              className="w-full bg-slate-50 border border-slate-200 rounded-full py-4 pl-12 pr-12 text-[14px] font-medium text-slate-800 focus:outline-none focus:border-teal-400 focus:bg-white transition-all placeholder:text-slate-400"
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)} 
              className="absolute right-5 text-slate-400 hover:text-teal-500 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* 🌟 2. ANTI-SPAM BUTTON (Disabled jika loading ATAU jika notifikasi masih tampil di layar) */}
          <button 
            type="submit" 
            disabled={loading || !!message.text} 
            className="w-full mt-6 bg-teal-500 text-white text-[15px] font-bold py-4 rounded-full shadow-lg shadow-teal-500/30 hover:bg-teal-600 transition-all disabled:opacity-40 disabled:scale-100 flex justify-center items-center active:scale-[0.98] cursor-pointer"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign Up'}
          </button>
        </form>

        <div className="mt-auto pt-8 text-center pb-4">
          <p className="text-[13px] font-medium text-slate-500">
            Sudah punya akun? <Link href="/login" className="text-teal-600 font-bold hover:underline">Masuk</Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default RegisterPage;