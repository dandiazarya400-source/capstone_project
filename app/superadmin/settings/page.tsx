"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Save, Loader2, Settings, 
  Globe, Shield, Percent, Power, CheckCircle, 
  AlertTriangle, Mail, Smartphone
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function SuperadminSettingsPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // 🌟 STATE PENGATURAN GLOBAL (DUMMY/MOCK STATE SEBELUM DISAMBUNG KE DB)
  const [settings, setSettings] = useState({
    platform_name: 'Pinjam Dong',
    contact_email: 'admin@pinjamdong.com',
    cs_number: '6281234567890',
    platform_fee: 10, // Potongan 10%
    maintenance_mode: false,
    auto_verify_users: false,
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // 🌟 LOGIKA SIMPAN KE DATABASE (Tabel 'global_settings' jika sudah komandan buat)
      // const { error } = await supabase.from('global_settings').update(settings).eq('id', 1);
      // if (error) throw error;

      // Simulasi delay jaringan
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      showToast('Konfigurasi sistem berhasil diperbarui!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Gagal menyimpan pengaturan sistem.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-[#F2FDFB] text-main relative">
      
      {/* 🌟 TOAST NOTIFICATION (Melayang Anti-Poni Layar) */}
      <div className="fixed top-16 left-0 right-0 mx-auto w-[90%] max-w-[320px] flex justify-center z-[100] pointer-events-none">
        {toast.show && (
          <div className={`flex items-center justify-center gap-2 px-4 py-3 w-full rounded-full shadow-2xl border animate-in slide-in-from-top-5 duration-300 ${
            toast.type === 'success' 
              ? 'bg-[#1a2e23] border-emerald-500/50 text-emerald-400' 
              : 'bg-rose-900 border-rose-500/50 text-white'
          }`}>
            {toast.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />} 
            <span className="text-[11px] font-bold tracking-wide line-clamp-1">{toast.message}</span>
          </div>
        )}
      </div>

      <main className="w-full px-5 pt-4 pb-32 space-y-5 animate-in fade-in duration-300">
        
        {/* HEADER */}
        <div className="flex items-center gap-3 bg-surface p-3 rounded-2xl border border-primary/10 shadow-sm sticky top-0 z-30 backdrop-blur-md">
          <button onClick={() => router.push('/superadmin')} className="p-2 bg-primary/5 rounded-full hover:bg-primary/10 text-primary transition-colors cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-main leading-tight">Pengaturan Sistem</h1>
            <p className="text-[10px] text-muted font-medium mt-0.5">Kendali pusat aplikasi & kebijakan</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          
          {/* ========================================= */}
          {/* SEGMEN 1: INFORMASI PLATFORM UTAMA */}
          {/* ========================================= */}
          <div className="bg-surface p-5 rounded-2xl border border-primary/10 shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-teal-500" />
              <h2 className="text-sm font-black text-main">Identitas Platform</h2>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted uppercase ml-1">Nama Aplikasi</label>
              <input 
                type="text" 
                value={settings.platform_name}
                onChange={(e) => setSettings({...settings, platform_name: e.target.value})}
                className="w-full bg-background border border-primary/10 rounded-xl px-4 py-3 text-[13px] font-bold focus:border-primary focus:outline-none transition-colors" 
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted uppercase ml-1">Email Pusat Bantuan</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input 
                  type="email" 
                  value={settings.contact_email}
                  onChange={(e) => setSettings({...settings, contact_email: e.target.value})}
                  className="w-full bg-background border border-primary/10 rounded-xl py-3 pl-10 pr-4 text-[13px] font-semibold focus:border-primary focus:outline-none transition-colors" 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted uppercase ml-1">Nomor WhatsApp CS</label>
              <div className="relative">
                <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input 
                  type="text" 
                  inputMode="numeric"
                  value={settings.cs_number}
                  onChange={(e) => setSettings({...settings, cs_number: e.target.value})}
                  className="w-full bg-background border border-primary/10 rounded-xl py-3 pl-10 pr-4 text-[13px] font-semibold focus:border-primary focus:outline-none transition-colors" 
                />
              </div>
            </div>
          </div>

          {/* ========================================= */}
          {/* SEGMEN 2: KEBIJAKAN BIAYA & PAJAK */}
          {/* ========================================= */}
          <div className="bg-surface p-5 rounded-2xl border border-primary/10 shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="w-4 h-4 text-orange-500" />
              <h2 className="text-sm font-black text-main">Kebijakan Finansial</h2>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted uppercase ml-1">Potongan Layanan Platform (%)</label>
              <div className="flex items-center gap-3">
                <input 
                  type="number" 
                  min="0"
                  max="100"
                  value={settings.platform_fee}
                  onChange={(e) => setSettings({...settings, platform_fee: parseInt(e.target.value) || 0})}
                  className="flex-1 bg-background border border-primary/20 rounded-xl px-4 py-3 text-sm font-black focus:border-primary focus:outline-none transition-colors text-orange-600" 
                />
                <div className="text-[11px] font-bold text-orange-600 bg-orange-500/10 px-4 py-3 rounded-xl border border-orange-500/20 shrink-0">
                  Total {settings.platform_fee}%
                </div>
              </div>
              <p className="text-[9px] text-muted ml-1 mt-1 leading-relaxed">
                Persentase biaya layanan ini akan otomatis dipotong dari setiap transaksi penyewaan sukses yang dilakukan oleh Mitra Toko.
              </p>
            </div>
          </div>

          {/* ========================================= */}
          {/* SEGMEN 3: KEAMANAN & SISTEM */}
          {/* ========================================= */}
          <div className="bg-surface p-5 rounded-2xl border border-primary/10 shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-rose-500" />
              <h2 className="text-sm font-black text-main">Kontrol Keamanan Sistem</h2>
            </div>
            
            {/* Saklar 1: Verifikasi Otomatis */}
            <div className="flex items-center justify-between p-3 bg-background border border-primary/10 rounded-xl hover:border-primary/30 transition-colors">
              <div>
                <p className="text-[12px] font-bold text-main">Auto-Verify Identitas</p>
                <p className="text-[9px] text-muted mt-0.5">Setujui KTP otomatis tanpa review admin</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={settings.auto_verify_users}
                  onChange={(e) => setSettings({...settings, auto_verify_users: e.target.checked})}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* Saklar 2: Maintenance Mode (DANGER ZONE) */}
            <div className="flex items-center justify-between p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl hover:border-rose-500/40 transition-colors">
              <div>
                <p className="text-[12px] font-bold text-rose-600 flex items-center gap-1">
                  <Power className="w-3 h-3" /> Mode Perbaikan (Maintenance)
                </p>
                <p className="text-[9px] text-rose-500/70 mt-0.5">Tutup akses aplikasi untuk semua user biasa</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={settings.maintenance_mode}
                  onChange={(e) => setSettings({...settings, maintenance_mode: e.target.checked})}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
              </label>
            </div>
          </div>

          {/* TOMBOL SIMPAN MASTER */}
          <div className="pt-2 pb-6">
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="w-full bg-primary text-white font-bold py-3.5 rounded-2xl flex justify-center items-center gap-2 shadow-xl shadow-primary/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {isSubmitting ? 'Menyimpan ke Satelit...' : 'Simpan Konfigurasi Sistem'}
            </button>
          </div>

        </form>
      </main>
    </div>
  );
}