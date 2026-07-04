"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, Trash2, Edit3, Loader2, Megaphone, Clock,
  Sparkles, Camera, Truck, MonitorPlay, Music, Shirt, Grid, Gift,
  Eye, EyeOff, Filter, AlertTriangle
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
  
  const [activeTab, setActiveTab] = useState<'semua' | 'live' | 'draft' | 'berakhir'>('semua');

  // 🌟 STATE BARU UNTUK MODAL HAPUS PROFESIONAL
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null as number | null });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { fetchPromos(); }, []);

  const fetchPromos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('promos').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setPromos(data || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  // 🌟 FUNGSI PEMICU MODAL HAPUS
  const triggerDelete = (id: number) => {
    setDeleteModal({ show: true, id });
  };

  // 🌟 FUNGSI EKSEKUSI HAPUS PERMANEN
  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    setIsDeleting(true);
    try {
      await supabase.from('promos').delete().eq('id', deleteModal.id);
      setPromos(promos.filter(p => p.id !== deleteModal.id));
      setDeleteModal({ show: false, id: null }); // Tutup modal setelah sukses
    } catch (e) { 
      alert('Gagal menghapus promo'); 
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    try {
      await supabase.from('promos').update({ is_active: !currentStatus }).eq('id', id);
      setPromos(promos.map(p => p.id === id ? { ...p, is_active: !currentStatus } : p));
    } catch (e) { alert('Gagal ubah status'); }
  };

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

  const processedPromos = promos.map(promo => {
    const isExpired = promo.expires_at ? new Date(promo.expires_at).getTime() <= Date.now() : false;
    const status = isExpired ? 'berakhir' : promo.is_active ? 'live' : 'draft';
    return { ...promo, isExpired, status };
  });

  const filteredPromos = processedPromos.filter(promo => {
    if (activeTab === 'semua') return true;
    return promo.status === activeTab;
  });

  const countLive = processedPromos.filter(p => p.status === 'live').length;
  const countDraft = processedPromos.filter(p => p.status === 'draft').length;
  const countBerakhir = processedPromos.filter(p => p.status === 'berakhir').length;

  return (
    <div className="w-full h-full flex flex-col bg-[#F2FDFB] text-main relative overflow-hidden">
      
      {/* 🌟 MODAL KONFIRMASI HAPUS (Sekarang akan aman terkunci di tengah bingkai layar) */}
      {deleteModal.show && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-5">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => !isDeleting && setDeleteModal({ show: false, id: null })}
          />
          <div className="relative z-10 w-full max-w-[320px] bg-surface rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 border border-rose-500/20">
            <div className="w-14 h-14 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-center text-main mb-2">Hapus Banner?</h3>
            <p className="text-[11px] font-medium text-muted text-center leading-relaxed mb-6">
              Banner promo ini akan dihapus secara permanen dari sistem dan tidak dapat dikembalikan.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteModal({ show: false, id: null })}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button 
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-[1.5] py-3 rounded-xl text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 flex items-center justify-center gap-2 transition-colors shadow-lg shadow-rose-500/30 disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} 
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 PERBAIKAN 2: Pindahkan scroll (overflow-y-auto) ke dalam tag <main> */}
      <main className="flex-1 overflow-y-auto px-5 pt-4 pb-24 space-y-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        
        {/* HEADER */}
        <div className="border border-primary/10 rounded-2xl p-4 bg-surface flex items-center justify-between shadow-sm">
          <div>
            <h2 className="text-2xl font-black text-primary">Manajemen Promo</h2>
            <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5 text-muted">Pantau & Atur Banner Promosi</p>
          </div>
          <div className="w-11 h-11 rounded-full flex items-center justify-center bg-primary/10 text-primary"><Megaphone className="w-5 h-5" /></div>
        </div>

        <button onClick={() => router.push('/superadmin/promos/add')} className="w-full bg-primary text-white font-bold py-3.5 rounded-2xl flex justify-center items-center gap-2 shadow-lg cursor-pointer hover:opacity-90 active:scale-95 transition-all">
          <Plus className="w-5 h-5" /> Tambah Banner Baru
        </button>

        {/* 🌟 FILTER TABS (Sudah dikunci border transparan agar tidak goyang) */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 pt-2">
          {/* Tab Semua */}
          <button 
            onClick={() => setActiveTab('semua')} 
            className={`relative px-4 py-2.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex-shrink-0 flex items-center gap-2 border ${
              activeTab === 'semua' ? 'bg-primary text-white border-transparent shadow-md' : 'bg-surface border-primary/10 text-muted hover:bg-primary/5'
            }`}
          >
            Semua Banner
            <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${activeTab === 'semua' ? 'bg-primary text-white' : 'bg-slate-800/10 text-slate-800'}`}>{promos.length}</span>
          </button>

          {/* Tab Live */}
          <button 
            onClick={() => setActiveTab('live')} 
            className={`relative px-4 py-2.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex-shrink-0 flex items-center gap-2 border ${
              activeTab === 'live' ? 'bg-emerald-500 text-white border-transparent shadow-md shadow-emerald-500/20' : 'bg-surface border-primary/10 text-muted hover:bg-primary/5'
            }`}
          >
            Live Beranda
            {countLive > 0 && <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${activeTab === 'live' ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-500'}`}>{countLive}</span>}
          </button>

          {/* Tab Draft */}
          <button 
            onClick={() => setActiveTab('draft')} 
            className={`relative px-4 py-2.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex-shrink-0 flex items-center gap-2 border ${
              activeTab === 'draft' ? 'bg-amber-500 text-white border-transparent shadow-md shadow-amber-500/20' : 'bg-surface border-primary/10 text-muted hover:bg-primary/5'
            }`}
          >
            Draft (Disimpan)
            {countDraft > 0 && <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${activeTab === 'draft' ? 'bg-white/20 text-white' : 'bg-amber-500/10 text-amber-500'}`}>{countDraft}</span>}
          </button>

          {/* Tab Berakhir */}
          <button 
            onClick={() => setActiveTab('berakhir')} 
            className={`relative px-4 py-2.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex-shrink-0 flex items-center gap-2 border ${
              activeTab === 'berakhir' ? 'bg-slate-500 text-white border-transparent shadow-md shadow-slate-500/20' : 'bg-surface border-primary/10 text-muted hover:bg-primary/5'
            }`}
          >
            Telah Berakhir
            {countBerakhir > 0 && <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${activeTab === 'berakhir' ? 'bg-white/20 text-white' : 'bg-slate-500/10 text-slate-500'}`}>{countBerakhir}</span>}
          </button>
        </div>

        {/* LIST RENDERING */}
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : filteredPromos.length === 0 ? (
          <div className="text-center py-12 opacity-60 bg-surface border border-primary/10 rounded-2xl p-6 mt-2">
            <Filter className="w-10 h-10 mx-auto text-muted mb-3 opacity-50" />
            <p className="font-bold text-main">Data Kosong</p>
            <p className="text-[11px] text-muted mt-1">Tidak ada banner di kategori {activeTab} saat ini.</p>
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            {filteredPromos.map((promo) => (
              <div key={promo.id} className={`relative group transition-all duration-300 ${promo.isExpired ? 'opacity-60 grayscale' : ''}`}>
                <PromoPreview data={promo} />
                
                <div className="absolute top-4 left-4 flex gap-2 z-20">
                  <span className={`text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full border shadow-sm ${
                    promo.isExpired ? 'bg-slate-600 text-white border-slate-700' :
                    promo.is_active ? 'bg-emerald-500 text-white border-emerald-600' : 
                    'bg-amber-500 text-white border-amber-600'
                  }`}>
                    {promo.isExpired ? 'TELAH BERAKHIR' : promo.is_active ? 'LIVE BERANDA' : 'DRAFT'}
                  </span>
                </div>
                
                <div className="absolute top-3 right-3 flex gap-2 z-20">
                  {!promo.isExpired && (
                    <button 
                      onClick={() => handleToggleActive(promo.id, promo.is_active)} 
                      className={`w-8 h-8 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors shadow-sm cursor-pointer ${promo.is_active ? 'bg-white/30 hover:bg-orange-500' : 'bg-black/40 hover:bg-green-500'}`}
                      title={promo.is_active ? "Jadikan Draft" : "Tayangkan Live"}
                    >
                      {promo.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                  <button 
                    onClick={() => router.push(`/superadmin/promos/add?id=${promo.id}`)} 
                    className="w-8 h-8 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white hover:text-blue-500 transition-colors shadow-sm cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  {/* 🌟 PEMICU MODAL HAPUS TERBARU */}
                  <button 
                    onClick={() => triggerDelete(promo.id)} 
                    className="w-8 h-8 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white hover:text-rose-500 transition-colors shadow-sm cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}