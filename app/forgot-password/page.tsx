"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Loader2, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ text: '', type: '' }), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || message.text) return;

    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // 🌟 Mengarahkan user ke halaman ganti password setelah klik link di email
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setMessage({ text: 'Link pemulihan berhasil dikirim! Silakan cek kotak masuk email Anda.', type: 'success' });
      setEmail('');
    } catch (error: any) {
      console.error('Error reset password:', error);
      setMessage({ text: 'Gagal mengirim link. Pastikan email terdaftar.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-teal-500 overflow-hidden relative font-sans">
      
      {/* 🌟 FLOATING TOAST NOTIFICATION */}
      {message.text && (
        <div className="absolute top-10 inset-x-0 mx-auto w-[85%] z-[100] pointer-events-none flex justify-center">
          <div className={`flex items-center gap-2 px-4 py-3.5 w-full rounded-2xl shadow-2xl border backdrop-blur-md animate-in slide-in-from-top-5 duration-300 pointer-events-auto ${
            message.type === 'success' ? 'bg-[#1a2e23]/90 border-emerald-500/40 text-emerald-400' : 'bg-[#2a1414]/90 border-rose-500/40 text-rose-400'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />} 
            <span className="text-[12px] font-bold tracking-wide leading-snug">{message.text}</span>
          </div>
        </div>
      )}

      {/* DEKORASI BACKGROUND */}
      <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-teal-400 rounded-full blur-2xl opacity-60"></div>
      <div className="absolute top-[10%] left-[-20px] w-32 h-32 bg-teal-600 rounded-full blur-xl opacity-50"></div>

      {/* HEADER TEKS */}
      <div className="pt-20 px-8 relative z-10 shrink-0">
        <h1 className="text-[36px] font-bold text-white leading-tight tracking-tight mb-2">Lupa<br/>Password?</h1>
        <p className="text-[14px] font-medium text-teal-50 opacity-90">Jangan khawatir, kami akan membantu memulihkannya.</p>
      </div>

      {/* BOTTOM SHEET CONTAINER */}
      <div className="flex-1 bg-white mt-10 rounded-t-[40px] px-8 pt-8 pb-6 flex flex-col relative z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        
        <button onClick={() => router.push('/login')} className="flex items-center text-slate-400 hover:text-teal-500 transition-colors mb-6 w-fit cursor-pointer">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span className="text-[13px] font-bold">Kembali ke Login</span>
        </button>

        <form onSubmit={handleResetPassword} className="space-y-4 mt-2">
          <div className="relative flex items-center">
            <Mail className="absolute left-5 w-5 h-5 text-slate-400" />
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="Masukkan Email Anda"
              className="w-full bg-slate-50 border border-slate-200 rounded-full py-4 pl-12 pr-5 text-[14px] font-medium text-slate-800 focus:outline-none focus:border-teal-400 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading || !!message.text || !email} 
            className="w-full mt-2 bg-teal-500 text-white text-[15px] font-bold py-4 rounded-full shadow-lg shadow-teal-500/30 hover:bg-teal-600 transition-all disabled:opacity-40 flex justify-center items-center active:scale-[0.98] cursor-pointer"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Kirim Link Pemulihan'}
          </button>
        </form>
      </div>
    </div>
  );
}