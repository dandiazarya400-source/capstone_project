"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, Save, Loader2, Zap, Clock,
  Sparkles, Camera, Truck, MonitorPlay, Music, Shirt, Grid, Gift
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const IconMap: { [key: string]: React.ComponentType<any> } = {
  Sparkles, Camera, Truck, MonitorPlay, Music, Shirt, Grid, Gift
};

const bgOptions = [
  { label: 'Cyan Tosca (Classic)', value: 'from-[#20D2EB] to-[#04E09E]' },
  { label: 'Blue Indigo (Elegan)', value: 'from-blue-400 to-indigo-500' },
  { label: 'Purple Pink (Ceria)', value: 'from-purple-400 to-pink-500' },
  { label: 'Orange Amber (Hangat)', value: 'from-orange-400 to-amber-400' },
  { label: 'Rose Red (Tegas)', value: 'from-rose-400 to-red-500' }
];

const iconOptions = ['Sparkles', 'Camera', 'Truck', 'Gift', 'MonitorPlay', 'Music', 'Shirt', 'Grid'];

// 🌟 KOLEKSI TEMPLATE DIPERBARUI DENGAN LOGIKA JAM BARU
const promoTemplates = [
  { name: '⚡ Flash Sale 3 Jam', tag: 'FLASH SALE', title: 'Serbu Kilat! Diskon 30% Alat Studio Hanya 3 Jam!', btn: 'Sewa Sekarang', bg: 'from-orange-400 to-amber-400', icon: 'Sparkles', has_shimmer: true, has_timer: true, timer_hours: 3 },
  { name: '🚚 Gratis Ongkir', tag: 'BEBAS ONGKIR', title: 'Bebas Biaya Antar Jemput Alat ke Seluruh Singkawang!', btn: 'Cek Slot', bg: 'from-[#20D2EB] to-[#04E09E]', icon: 'Truck', has_shimmer: false, has_timer: true, timer_hours: 24 },
  { name: '🎁 Cashback Gila', tag: 'CASHBACK', title: 'Sewa Kamera Hari Ini & Dapatkan Cashback Rp 50.000!', btn: 'Ambil Promo', bg: 'from-purple-400 to-pink-500', icon: 'Gift', has_shimmer: true, has_timer: true, timer_hours: 12 }
];

function PromoFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  
  // 🌟 STATE BARU UNTUK TIMER KUSTOM
  const [hasTimer, setHasTimer] = useState(false);
  const [timerHours, setTimerHours] = useState<number>(1);
  
  const [formData, setFormData] = useState({
    tag: '',
    title: '',
    btn: 'Pesan Sekarang',
    bg: bgOptions[0].value,
    icon: iconOptions[0],
    is_active: false, 
    has_shimmer: false
  });

  useEffect(() => {
    if (id) {
      fetchPromoDetail(id);
    }
  }, [id]);

  const fetchPromoDetail = async (promoId: string) => {
    setPageLoading(true);
    try {
      const { data, error } = await supabase.from('promos').select('*').eq('id', promoId).single();
      if (error) throw error;
      if (data) {
        setFormData({
          tag: data.tag,
          title: data.title,
          btn: data.btn,
          bg: data.bg,
          icon: data.icon,
          is_active: data.is_active,
          has_shimmer: data.has_shimmer || false
        });

        // 🌟 JIKA SEDANG EDIT, HITUNG SISA WAKTU UNTUK DITAMPILKAN DI INPUT
        if (data.expires_at) {
          const diffMs = new Date(data.expires_at).getTime() - Date.now();
          if (diffMs > 0) {
            const diffHrs = (diffMs / (1000 * 60 * 60)).toFixed(1); // Ambil 1 angka desimal
            setHasTimer(true);
            setTimerHours(Math.max(1, parseFloat(diffHrs)));
          }
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setPageLoading(false);
    }
  };

  const handleApplyTemplate = (tpl: typeof promoTemplates[0]) => {
    setHasTimer(tpl.has_timer);
    setTimerHours(tpl.timer_hours);
    setFormData({
      ...formData,
      tag: tpl.tag,
      title: tpl.title,
      btn: tpl.btn,
      bg: tpl.bg,
      icon: tpl.icon,
      has_shimmer: tpl.has_shimmer
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // 🌟 RUMUS PENGHITUNG WAKTU KEDALUWARSA
    let calculatedExpiry: string | null = null;
    if (hasTimer && timerHours >= 1) {
      calculatedExpiry = new Date(Date.now() + timerHours * 60 * 60 * 1000).toISOString();
    }

    const finalData = {
      ...formData,
      expires_at: calculatedExpiry
    };

    try {
      if (id) {
        const { error } = await supabase.from('promos').update(finalData).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('promos').insert([finalData]);
        if (error) throw error;
      }
      router.push('/superadmin/promos');
    } catch (error) {
      alert('Gagal menyimpan promo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const PromoPreview = ({ data }: { data: typeof formData }) => {
    const PromoIcon = IconMap[data.icon] || Sparkles;
    return (
      <div className={`w-full bg-gradient-to-r ${data.bg} rounded-[24px] p-6 text-white relative overflow-hidden shadow-lg`}>
        <style>{`
          @keyframes customShimmer { 100% { transform: translateX(100%); } }
          .animate-shimmer-glow { animation: customShimmer 2s infinite; }
        `}</style>

        {data.has_shimmer && (
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer-glow z-0 pointer-events-none" />
        )}

        {/* PREVIEW MOCKUP TIMER DI POJOK KANAN ATAS */}
        {hasTimer && (
          <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/20 shadow-lg">
            <Clock className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
            <span className="text-[11px] font-mono font-black text-white tracking-widest drop-shadow-md">
              {String(Math.floor(timerHours)).padStart(2, '0')}:{(timerHours % 1) * 60 === 30 ? '30' : '00'}:00
            </span>
          </div>
        )}

        <div className="absolute right-0 top-0 w-32 h-32 bg-white/20 rounded-full blur-2xl translate-x-10 -translate-y-10"></div>
        <div className="relative z-10 w-[70%] mt-2">
          <span className="inline-block px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[10px] font-black tracking-wider uppercase mb-2">
            {data.tag || 'TAG PROMO'}
          </span>
          <h2 className="text-lg font-black leading-tight mb-3 drop-shadow-sm">
            {data.title || 'Judul Menarik Di Sini'}
          </h2>
          <button type="button" className="bg-white text-slate-800 text-[11px] font-bold px-4 py-2 rounded-full shadow-md">
            {data.btn || 'Teks Tombol'}
          </button>
        </div>
        <PromoIcon className="absolute bottom-4 right-4 w-16 h-16 text-white/30 z-10" strokeWidth={1} />
      </div>
    );
  };

  if (pageLoading) return <div className="h-[50vh] w-full flex items-center justify-center text-primary"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <main className="w-full px-5 pt-4 pb-32 space-y-5 animate-in fade-in duration-300 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="flex items-center gap-3 bg-surface p-3 rounded-2xl border border-primary/10 shadow-sm sticky top-0 z-30 backdrop-blur-md">
        <button onClick={() => router.back()} className="p-2 bg-primary/5 rounded-full hover:bg-primary/10 text-primary transition-colors cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-bold text-main leading-tight">{id ? 'Edit Banner Promo' : 'Buat Promo Baru'}</h1>
          <p className="text-[10px] text-muted font-medium mt-0.5">Status bawaan otomatis terdaftar sebagai <span className="text-orange-500 font-bold">DRAFT</span></p>
        </div>
      </div>

      {!id && (
        <div className="bg-surface p-4 rounded-2xl border border-primary/10 shadow-sm space-y-2.5">
          <p className="text-[10px] font-black text-muted uppercase tracking-wider ml-1 flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500"/> Template Promo Siap Pakai:</p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {promoTemplates.map((tpl, idx) => (
              <button key={idx} type="button" onClick={() => handleApplyTemplate(tpl)} className="px-3 py-2 bg-background border border-primary/10 hover:border-primary text-[11px] font-bold text-main rounded-xl transition-all shrink-0 active:scale-95">
                {tpl.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-surface p-4 rounded-2xl border border-primary/10 shadow-sm">
        <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2 ml-1">Live Preview Beranda:</p>
        <PromoPreview data={formData} />
      </div>

      <div className="bg-surface p-5 rounded-2xl border border-primary/10 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted uppercase ml-1">Label Tag</label>
              <input type="text" maxLength={15} required placeholder="CASHBACK" value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} className="w-full bg-background border border-primary/10 rounded-xl px-4 py-3 text-[13px] font-bold focus:border-primary focus:outline-none uppercase" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted uppercase ml-1">Teks Tombol</label>
              <input type="text" maxLength={15} required placeholder="Klaim Promo" value={formData.btn} onChange={e => setFormData({...formData, btn: e.target.value})} className="w-full bg-background border border-primary/10 rounded-xl px-4 py-3 text-[13px] font-bold focus:border-primary focus:outline-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted uppercase ml-1">Judul Utama</label>
            <textarea rows={2} required placeholder="Diskon 20% Untuk Sewa Pertamamu!" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-background border border-primary/10 rounded-xl px-4 py-3 text-[13px] font-bold focus:border-primary focus:outline-none resize-none leading-relaxed"></textarea>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted uppercase ml-1">Warna Latar (Gradient)</label>
            <select value={formData.bg} onChange={e => setFormData({...formData, bg: e.target.value})} className="w-full bg-background border border-primary/10 rounded-xl px-4 py-3 text-[13px] font-bold focus:border-primary focus:outline-none appearance-none">
              {bgOptions.map((bg, idx) => <option key={idx} value={bg.value}>{bg.label}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted uppercase ml-1">Ikon Penghias</label>
            <select value={formData.icon} onChange={e => setFormData({...formData, icon: e.target.value})} className="w-full bg-background border border-primary/10 rounded-xl px-4 py-3 text-[13px] font-bold focus:border-primary focus:outline-none appearance-none">
              {iconOptions.map((icon, idx) => <option key={idx} value={icon}>{icon}</option>)}
            </select>
          </div>

          <div className="w-full h-px bg-primary/10 my-4"></div>

          {/* 🌟 PENGATURAN TIMER & ANIMASI KUSTOM */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-background border border-primary/10 rounded-xl">
              <div>
                <p className="text-[12px] font-bold text-main">Gunakan Batas Waktu (Flash Sale)</p>
                <p className="text-[10px] text-muted">Menampilkan jam hitung mundur di pojok kanan</p>
              </div>
              <input type="checkbox" checked={hasTimer} onChange={e => setHasTimer(e.target.checked)} className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 accent-primary" />
            </div>

            {hasTimer && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl animate-in fade-in slide-in-from-top-2">
                <label className="text-[10px] font-bold text-primary uppercase ml-1 block mb-2">Durasi Tayang (Dalam Jam)</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    min="1" 
                    step="0.5" 
                    required={hasTimer}
                    value={timerHours} 
                    onChange={e => setTimerHours(parseFloat(e.target.value) || 1)} 
                    className="flex-1 bg-background border border-primary/20 rounded-lg px-4 py-2.5 text-sm font-bold focus:border-primary focus:outline-none" 
                  />
                  <div className="text-[11px] font-bold text-primary bg-primary/10 px-3 py-2.5 rounded-lg border border-primary/20 shrink-0">
                    {Math.floor(timerHours)} Jam {((timerHours % 1) * 60) > 0 ? '30 Menit' : ''}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-3 bg-background border border-primary/10 rounded-xl">
              <div>
                <p className="text-[12px] font-bold text-main">Efek Animasi Berkilau</p>
                <p className="text-[10px] text-muted">Menambahkan pantulan cahaya kilat pada banner</p>
              </div>
              <input type="checkbox" checked={formData.has_shimmer} onChange={e => setFormData({...formData, has_shimmer: e.target.checked})} className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 accent-primary" />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full mt-6 bg-primary text-white font-bold py-3.5 rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer">
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {id ? 'Perbarui & Simpan' : 'Simpan Sebagai Draft'}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function SuperadminPromosFormPage() {
  return (<Suspense fallback={<div><Loader2 className="w-8 h-8 animate-spin" /></div>}><PromoFormContent /></Suspense>);
}