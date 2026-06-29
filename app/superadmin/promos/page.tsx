"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, Trash2, Edit3, Loader2, Megaphone, Clock,
  Sparkles, Camera, Truck, MonitorPlay, Music, Shirt, Grid, Gift,
  Eye, EyeOff
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const IconMap: { [key: string]: React.ComponentType<any> } = {
  Sparkles, Camera, Truck, MonitorPlay, Music, Shirt, Grid, Gift
};

// 🌟 SUB-KOMPONEN HITUNG MUNDUR (COUNTDOWN) PINTAR
const AdminCountdown = ({ expiresAt }: { expiresAt: string | null }) => {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    if (!expiresAt) return;
    const calculate = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('KEDALUWARSA'); return; }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!expiresAt) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded border backdrop-blur-md ${timeLeft === 'KEDALUWARSA' ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' : 'bg-black/40 border-white/10 text-yellow-400'}`}>
      <Clock className="w-3 h-3" /> {timeLeft}
    </span>
  );
};

export default function SuperadminPromosPage() {
  const router = useRouter();
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPromos(); }, []);

  const fetchPromos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('promos').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      setPromos(data || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus permanen banner ini?')) return;
    try {
      await supabase.from('promos').delete().eq('id', id);
      setPromos(promos.filter(p => p.id !== id));
    } catch (e) { alert('Gagal hapus'); }
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    try {
      await supabase.from('promos').update({ is_active: !currentStatus }).eq('id', id);
      setPromos(promos.map(p => p.id === id ? { ...p, is_active: !currentStatus } : p));
    } catch (e) { alert('Gagal ubah status'); }
  };

  // 🌟 PERBAIKAN 1: Komponen Preview Promo diberi padding atas (pt-14) agar tidak tabrakan
  const PromoPreview = ({ data }: { data: any }) => {
    const PromoIcon = IconMap[data.icon] || Sparkles;
    return (
      <div className={`w-full bg-gradient-to-r ${data.bg} rounded-[24px] p-6 pt-14 text-white relative overflow-hidden shadow-lg shadow-teal-500/10`}>
        <style>{`@keyframes cmdShimmer { 100% { transform: translateX(100%); } } .cmd-shimmer { animation: cmdShimmer 2s infinite; }`}</style>
        {data.has_shimmer && <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent cmd-shimmer z-0 pointer-events-none" />}
        <div className="absolute right-0 top-0 w-32 h-32 bg-white/20 rounded-full blur-2xl translate-x-10 -translate-y-10"></div>
        
        <div className="relative z-10 w-[75%]">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="inline-block px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[10px] font-black tracking-wider uppercase">{data.tag}</span>
            <AdminCountdown expiresAt={data.expires_at} />
          </div>
          <h2 className="text-lg font-black leading-tight mb-3 drop-shadow-sm">{data.title}</h2>
          <button type="button" className="bg-white text-slate-800 text-[11px] font-bold px-4 py-2 rounded-full shadow-md">{data.btn}</button>
        </div>
        <PromoIcon className="absolute bottom-4 right-4 w-16 h-16 text-white/30 z-0" strokeWidth={1} />
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen overflow-y-auto bg-[#F2FDFB] text-main">
      <main className="flex-1 px-5 pt-4 pb-24 space-y-6">
        <div className="border border-primary/10 rounded-2xl p-4 bg-surface flex items-center justify-between shadow-sm">
          <div>
            <h2 className="text-2xl font-black text-primary">Manajemen Promo</h2>
            <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5 text-muted">Tekan tombol mata untuk merubah Draft menjadi Live</p>
          </div>
          <div className="w-11 h-11 rounded-full flex items-center justify-center bg-primary/10 text-primary"><Megaphone className="w-5 h-5" /></div>
        </div>

        <button onClick={() => router.push('/superadmin/promos/add')} className="w-full bg-primary text-white font-bold py-3.5 rounded-2xl flex justify-center items-center gap-2 shadow-lg cursor-pointer"><Plus className="w-5 h-5" /> Tambah Banner Baru</button>

        {loading ? <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div> : promos.length === 0 ? <div className="text-center py-12 opacity-60">Belum ada promo terdaftar.</div> : (
          <div className="space-y-5">
            {promos.map((promo) => {
              // 🌟 LOGIKA: Cek otomatis apakah waktu sekarang sudah melewati batas expires_at
              const isExpired = promo.expires_at ? new Date(promo.expires_at).getTime() <= Date.now() : false;

              return (
                // 🌟 PERBAIKAN DI SINI: Grayscale HANYA diaplikasikan jika isExpired = true
                <div key={promo.id} className={`relative group transition-all duration-300 ${isExpired ? 'opacity-60 grayscale' : ''}`}>
                  
                  <PromoPreview data={promo} />
                  
                  {/* 🌟 BADGE DINAMIS: DRAFT VS LIVE VS BERAKHIR */}
                  <div className="absolute top-4 left-4 flex gap-2 z-20">
                    <span className={`text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full border shadow-sm ${
                      isExpired ? 'bg-slate-600 text-white border-slate-700' :
                      promo.is_active ? 'bg-emerald-500 text-white border-emerald-600' : 
                      'bg-amber-500 text-white border-amber-600'
                    }`}>
                      {isExpired ? 'TELAH BERAKHIR' : promo.is_active ? 'LIVE BERANDA' : 'DRAFT'}
                    </span>
                  </div>
                  
                  {/* TOMBOL AKSI */}
                  <div className="absolute top-3 right-3 flex gap-2 z-20">
                    <button 
                      onClick={() => handleToggleActive(promo.id, promo.is_active)} 
                      className={`w-8 h-8 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors shadow-sm cursor-pointer ${promo.is_active ? 'bg-white/30 hover:bg-orange-500' : 'bg-black/40 hover:bg-green-500'}`}
                      title={promo.is_active ? "Sembunyikan Promo" : "Tampilkan Promo"}
                    >
                      {promo.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={() => router.push(`/superadmin/promos/add?id=${promo.id}`)} 
                      className="w-8 h-8 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white hover:text-blue-500 transition-colors shadow-sm cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(promo.id)} 
                      className="w-8 h-8 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white hover:text-rose-500 transition-colors shadow-sm cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}