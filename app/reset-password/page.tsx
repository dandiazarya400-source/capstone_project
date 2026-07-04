"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    // 🌟 Proteksi: Pastikan user benar-benar datang dari link email (punya sesi valid)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("Sesi tidak valid atau telah kedaluwarsa. Silakan request link baru.");
        router.push('/forgot-password');
      }
    };
    checkSession();
  }, [router]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      // 🌟 Fungsi dewa Supabase untuk menimpa password lama
      const { error } = await supabase.auth.updateUser({ password: password });
      
      if (error) throw error;

      setMessage({ text: 'Password berhasil diperbarui! Mengalihkan ke Beranda...', type: 'success' });
      
      setTimeout(() => { router.push('/'); }, 2500);
    } catch (error: any) {
      console.error('Error update password:', error);
      setMessage({ text: 'Gagal memperbarui password. Minimal 6 karakter.', type: 'error' });
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

      <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-teal-400 rounded-full blur-2xl opacity-60"></div>
      
      <div className="pt-24 px-8 relative z-10 shrink-0">
        <h1 className="text-[32px] font-bold text-white leading-tight mb-2">Buat Password<br/>Baru</h1>
      </div>

      <div className="flex-1 bg-white mt-10 rounded-t-[40px] px-8 pt-10 pb-6 flex flex-col relative z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        
        <p className="text-[13px] text-slate-500 mb-6 leading-relaxed font-medium">
          Silakan buat password baru yang kuat untuk mengamankan akun Anda.
        </p>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="relative flex items-center">
            <Lock className="absolute left-5 w-5 h-5 text-slate-400" />
            <input 
              type={showPassword ? "text" : "password"} 
              required 
              minLength={6}
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Password Baru (Min 6 Karakter)"
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

          <button 
            type="submit" 
            disabled={loading || !!message.text || password.length < 6} 
            className="w-full mt-4 bg-slate-800 text-white text-[15px] font-bold py-4 rounded-full shadow-lg shadow-slate-800/30 hover:bg-slate-900 transition-all disabled:opacity-40 flex justify-center items-center active:scale-[0.98] cursor-pointer"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Simpan Password Baru'}
          </button>
        </form>
      </div>
    </div>
  );
}