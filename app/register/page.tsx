"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const RegisterPage = () => {
  const router = useRouter();
  
  // State form & UI (LOGIKA ASLI)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // === FUNGSI MENGHILANGKAN NOTIFIKASI OTOMATIS (LOGIKA ASLI) ===
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 4000); 
      return () => clearTimeout(timer);
    }
  }, [message]);

  // === FUNGSI REGISTER SUPABASE (LOGIKA ASLI) ===
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
    <div className="h-[100dvh] w-full flex flex-col bg-teal-500 overflow-hidden relative font-sans">
      
      {/* ================= DEKORASI BACKGROUND ================= */}
      <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-teal-400 rounded-full blur-2xl opacity-60"></div>
      <div className="absolute top-[10%] left-[-20px] w-32 h-32 bg-teal-600 rounded-full blur-xl opacity-50"></div>
      
      {/* Ornamen Abstrak Mirip Daun di Kanan Atas */}
      <div className="absolute top-12 right-6 opacity-20 pointer-events-none">
        <svg width="100" height="120" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M50 0C77.6142 0 100 22.3858 100 50C100 77.6142 50 120 50 120C50 120 0 77.6142 0 50C0 22.3858 22.3858 0 50 0Z" fill="white"/>
        </svg>
      </div>

      {/* ================= HEADER TEKS ================= */}
      <div className="pt-16 px-8 relative z-10 shrink-0">
        <h1 className="text-[36px] font-bold text-white leading-none tracking-tight mb-2">Create Account</h1>
        <p className="text-[14px] font-medium text-teal-50 opacity-90">Bergabunglah bersama kami</p>
      </div>

      {/* ================= BOTTOM SHEET CONTAINER ================= */}
      <div className="flex-1 bg-white mt-8 rounded-t-[40px] px-8 pt-8 pb-6 flex flex-col relative z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] overflow-y-auto scrollbar-hide">
        
        {/* Tombol Back ala Referensi Gambar */}
        <button 
          onClick={() => router.push('/login')} 
          className="flex items-center text-slate-400 hover:text-teal-500 transition-colors mb-4 w-fit"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span className="text-[13px] font-bold">Back to login</span>
        </button>

        <h2 className="text-[28px] font-bold text-slate-800 mb-6">Sign Up</h2>

        {/* Notifikasi Melayang */}
        <div className="relative w-full h-0">
          {message.text && (
            <div className={`absolute -top-4 left-0 w-full flex items-center justify-center px-4 py-2.5 rounded-xl text-[12px] font-bold border animate-in slide-in-from-top-2 fade-in duration-200 z-50 shadow-sm ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-600 border-green-200' 
                : 'bg-red-50 text-red-500 border-red-100'
            }`}>
              {message.text}
            </div>
          )}
        </div>

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

          {/* Register Button */}
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full mt-6 bg-teal-500 text-white text-[15px] font-bold py-4 rounded-full shadow-lg shadow-teal-500/30 hover:bg-teal-600 transition-all disabled:opacity-50 flex justify-center items-center active:scale-[0.98]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign Up'}
          </button>
        </form>

        {/* Footer Daftar (Sebagai opsional/pelengkap) */}
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