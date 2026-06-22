"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const LoginPage = () => {
  const router = useRouter();
  
  // State form & UI (LOGIKA ASLI - TIDAK DIUBAH)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // === MENGHILANGKAN NOTIFIKASI OTOMATIS (LOGIKA ASLI) ===
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // === FUNGSI LOGIN SUPABASE (LOGIKA ASLI) ===
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (authError) throw authError;

      if (authData.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .single();

        if (profileError) {
          console.error('Gagal menarik data role:', profileError.message);
        }

        setMessage({ text: 'Login berhasil! Mengalihkan...', type: 'success' });
        
        setTimeout(() => { 
          if (profile?.role === 'admin' || profile?.role === 'superadmin') {
            router.push('/admin'); 
          } else {
            router.push('/'); 
          }
        }, 1500);
      }

    } catch (error: any) {
      console.error('Error saat login:', error);
      let errorMessage = error.message;
      if (errorMessage.includes("Invalid login credentials")) {
        errorMessage = "Email atau password salah.";
      }
      setMessage({ text: errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-teal-500 overflow-hidden relative font-sans">

      {/* ================= POP-UP NOTIFIKASI MEWAH (CENTERED) ================= */}
      {message.text && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-5">
          {/* Latar belakang gelap & blur */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"></div>
          
          {/* Kotak Pop-up */}
          <div className="relative bg-white rounded-[28px] p-6 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-300 max-w-[280px] w-full border border-slate-50">
            
            {/* Ikon Sukses atau Error dengan Efek Bounce */}
            {message.type === 'success' ? (
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4 shadow-inner animate-bounce">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4 shadow-inner animate-bounce">
                <AlertCircle className="w-8 h-8 text-rose-500" />
              </div>
            )}
            
            {/* Judul & Teks Pesan */}
            <h3 className="text-[18px] font-black text-slate-800 mb-1.5">
              {message.type === 'success' ? 'Berhasil!' : 'Oops!'}
            </h3>
            <p className="text-[13px] font-medium text-slate-500 leading-relaxed px-2">
              {message.text}
            </p>
          </div>
        </div>
      )}
      
      {/* ================= DEKORASI BACKGROUND (Ala Referensi Gambar) ================= */}
      <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-teal-400 rounded-full blur-2xl opacity-60"></div>
      <div className="absolute top-[10%] left-[-20px] w-32 h-32 bg-teal-600 rounded-full blur-xl opacity-50"></div>
      
      {/* Ornamen Abstrak Mirip Daun/Bentuk di Kanan Atas */}
      <div className="absolute top-12 right-6 opacity-20 pointer-events-none">
        <svg width="100" height="120" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M50 0C77.6142 0 100 22.3858 100 50C100 77.6142 50 120 50 120C50 120 0 77.6142 0 50C0 22.3858 22.3858 0 50 0Z" fill="white"/>
        </svg>
      </div>

      {/* ================= HEADER TEKS ================= */}
      <div className="pt-20 px-8 relative z-10 shrink-0">
        <h1 className="text-[42px] font-bold text-white leading-none tracking-tight mb-2">Hello!</h1>
        <p className="text-[15px] font-medium text-teal-50 opacity-90">Welcome to Aplikasi Sewa</p>
      </div>

      {/* ================= BOTTOM SHEET CONTAINER ================= */}
      <div className="flex-1 bg-white mt-10 rounded-t-[40px] px-8 pt-10 pb-6 flex flex-col relative z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] overflow-y-auto scrollbar-hide">
        
        <h2 className="text-[28px] font-bold text-slate-800 mb-8">Login</h2>

        

        <form onSubmit={handleLogin} className="space-y-5">
          
          {/* Input Email */}
          <div className="relative flex items-center">
            <Mail className="absolute left-5 w-5 h-5 text-slate-400" />
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="Email"
              className="w-full bg-slate-50 border border-slate-200 rounded-full py-4 pl-12 pr-5 text-[14px] font-medium text-slate-800 focus:outline-none focus:border-teal-400 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Input Password */}
          <div className="space-y-2">
            <div className="relative flex items-center">
              <Lock className="absolute left-5 w-5 h-5 text-slate-400" />
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Password"
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
            
            {/* Lupa Password */}
            <div className="flex justify-end px-2">
              <Link href="#" className="text-[12px] font-bold text-slate-400 hover:text-teal-500 transition-colors">
                Forgot Password
              </Link>
            </div>
          </div>

          {/* Login Button */}
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full mt-4 bg-teal-500 text-white text-[15px] font-bold py-4 rounded-full shadow-lg shadow-teal-500/30 hover:bg-teal-600 transition-all disabled:opacity-50 flex justify-center items-center active:scale-[0.98]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login'}
          </button>
        </form>

        {/* Pemisah Sosial Media */}
        <div className="flex items-center space-x-4 mt-8 mb-6">
          <div className="h-px flex-1 bg-slate-200"></div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Or login with</span>
          <div className="h-px flex-1 bg-slate-200"></div>
        </div>

        {/* Tombol Sosial Media (Bentuk Lingkaran - FIXED PERFECT CENTER) */}
        <div className="flex justify-center gap-5">
          
          {/* Tombol Facebook */}
          <button 
            type="button" 
            className="w-12 h-12 grid place-items-center rounded-full bg-white border border-slate-200 hover:border-[#1877F2]/30 hover:bg-blue-50 transition-all shadow-sm group shrink-0"
          >
            <svg className="w-[18px] h-[18px] text-slate-400 group-hover:text-[#1877F2] transition-colors" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
            </svg>
          </button>

          {/* Tombol Google */}
          <button 
            type="button" 
            className="w-12 h-12 grid place-items-center rounded-full bg-white border border-slate-200 hover:border-red-300 hover:bg-red-50 transition-all shadow-sm group shrink-0"
          >
            <svg className="w-5 h-5 grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0112 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115z"/>
              <path fill="#34A853" d="M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 01-6.723-4.823l-4.04 3.067A11.965 11.965 0 0012 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987z"/>
              <path fill="#4A90E2" d="M19.834 21c2.195-2.048 3.62-5.096 3.62-9 0-.71-.109-1.473-.272-2.182H12v4.637h6.436c-.317 1.559-1.17 2.766-2.395 3.558L19.834 21z"/>
              <path fill="#FBBC05" d="M5.277 14.268A7.12 7.12 0 014.909 12c0-.782.125-1.533.357-2.235L1.24 6.65A11.934 11.934 0 000 12c0 1.92.445 3.73 1.237 5.335l4.04-3.067z"/>
            </svg>
          </button>

          {/* Tombol Apple */}
          <button 
            type="button" 
            className="w-12 h-12 grid place-items-center rounded-full bg-white border border-slate-200 hover:border-slate-800 hover:bg-slate-50 transition-all shadow-sm group shrink-0"
          >
            <svg className="w-5 h-5 text-slate-400 group-hover:text-black transition-colors" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.48-2.48 4.25-2.51 1.34-.02 2.6.92 3.42.92.83 0 2.33-1.15 3.93-1.03.68.03 2.58.28 3.8 1.94-.1.06-2.27 1.32-2.24 3.93.03 3.14 2.73 4.25 2.76 4.26-.02.08-.43 1.48-1.36 3.26M15.97 4.17c.68-.81 1.14-1.95.99-3.08-1 .04-2.22.67-2.94 1.72-.64.91-1.2 2.07-1.02 3.18 1.12.08 2.27-.61 2.97-1.82z"/>
            </svg>
          </button>

        </div>

        {/* Footer Daftar */}
        <div className="mt-auto pt-8 text-center pb-4">
          <p className="text-[13px] font-medium text-slate-500">
            Don't have account? <Link href="/register" className="text-teal-600 font-bold hover:underline">Sign Up</Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;