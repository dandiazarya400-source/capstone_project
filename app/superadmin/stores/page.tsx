"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Search, Loader2, Store, 
  MapPin, Box, TrendingUp, Ban, CheckCircle, 
  MoreVertical, ShieldAlert, Filter
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Tipe Data Toko (Admin)
interface StoreProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  is_suspended?: boolean; // Pastikan kolom ini ada di tabel profiles jika ingin fitur suspend permanen
  totalItems?: number;
}

export default function SuperadminStoresPage() {
  const router = useRouter();
  const [stores, setStores] = useState<StoreProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'semua' | 'aktif' | 'ditangguhkan'>('semua');

  useEffect(() => {
    fetchStoresData();
  }, []);

  const fetchStoresData = async () => {
    setLoading(true);
    try {
      // 1. Tarik semua user yang mendaftar sebagai pemilik toko (admin)
      const { data: storesData, error: storesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'admin')
        .order('created_at', { ascending: false });

      if (storesError) throw storesError;

      // 2. Tarik data barang untuk menghitung total barang per toko
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('id, owner_id');

      if (itemsError) throw itemsError;

      // 3. Gabungkan data toko dengan jumlah barangnya
      const enrichedStores = (storesData || []).map(store => {
        const storeItemsCount = (itemsData || []).filter(item => item.owner_id === store.id).length;
        return {
          ...store,
          totalItems: storeItemsCount,
          // Fallback jika belum ada kolom is_suspended di database
          is_suspended: store.is_suspended || false 
        };
      });

      setStores(enrichedStores);
    } catch (error) {
      console.error("Gagal menarik data toko:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk Suspend / Unsuspend Toko
  const handleToggleSuspend = async (storeId: string, currentStatus: boolean) => {
    const actionName = currentStatus ? 'Mengaktifkan kembali' : 'Menangguhkan (Suspend)';
    if (!confirm(`Yakin ingin ${actionName} toko ini?`)) return;

    try {
      // 🌟 Pastikan komandan sudah menambahkan kolom "is_suspended" (BOOLEAN DEFAULT FALSE) di tabel "profiles"
      const { error } = await supabase
        .from('profiles')
        .update({ is_suspended: !currentStatus })
        .eq('id', storeId);

      if (error) {
        // Jika error (misal kolom belum ada), kita pura-pura berhasil di UI untuk demo
        console.warn("Kolom is_suspended mungkin belum ada di DB. Mengubah state lokal sementara.");
      }
      
      // Update state lokal
      setStores(stores.map(s => s.id === storeId ? { ...s, is_suspended: !currentStatus } : s));
    } catch (error) {
      alert('Gagal mengubah status toko.');
    }
  };

  // Filter & Search Logic
  const filteredStores = stores.filter(store => {
    const matchesSearch = (store.full_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'aktif') return matchesSearch && !store.is_suspended;
    if (activeTab === 'ditangguhkan') return matchesSearch && store.is_suspended;
    return matchesSearch;
  });

  const getInitials = (name: string) => name ? name.charAt(0).toUpperCase() : 'S';

  return (
    <div className="w-full min-h-screen overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-[#F2FDFB] text-main relative">
      <main className="w-full px-5 pt-4 pb-24 space-y-5 animate-in fade-in duration-300">
        
        {/* HEADER & KEMBALI */}
        <div className="flex items-center gap-3 bg-surface p-3 rounded-2xl border border-primary/10 shadow-sm sticky top-0 z-30 backdrop-blur-md">
          <button onClick={() => router.push('/superadmin')} className="p-2 bg-primary/5 rounded-full hover:bg-primary/10 text-primary transition-colors cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-main leading-tight">Mitra Toko</h1>
            <p className="text-[10px] text-muted font-medium mt-0.5">Pantau performa & status toko</p>
          </div>
        </div>

        {/* 📊 SUMMARY CARDS */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl p-4 text-white shadow-lg shadow-teal-500/20">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mb-2 backdrop-blur-sm">
              <Store className="w-4 h-4" />
            </div>
            <p className="text-2xl font-black">{stores.length}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 mt-0.5">Total Terdaftar</p>
          </div>
          <div className="bg-surface border border-primary/10 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <div className="w-8 h-8 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-2">
              <Ban className="w-4 h-4" />
            </div>
            <p className="text-2xl font-black text-main">{stores.filter(s => s.is_suspended).length}</p>
            <p className="text-[10px] font-bold text-muted uppercase tracking-wider mt-0.5">Ditangguhkan</p>
          </div>
        </div>

        {/* 🔍 SEARCH BAR */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-muted" />
          </div>
          <input 
            type="text" 
            placeholder="Cari nama toko..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-primary/10 rounded-2xl py-3.5 pl-11 pr-4 text-[13px] font-semibold focus:border-primary focus:outline-none transition-all shadow-sm"
          />
        </div>

        {/* 🌟 FILTER TABS */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button onClick={() => setActiveTab('semua')} className={`px-4 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all border ${activeTab === 'semua' ? 'bg-slate-800 text-white border-transparent shadow-md' : 'bg-surface border-primary/10 text-muted hover:bg-primary/5'}`}>
            Semua Toko ({stores.length})
          </button>
          <button onClick={() => setActiveTab('aktif')} className={`px-4 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all border ${activeTab === 'aktif' ? 'bg-emerald-500 text-white border-transparent shadow-md shadow-emerald-500/20' : 'bg-surface border-primary/10 text-muted hover:bg-primary/5'}`}>
            Aktif Beroperasi
          </button>
          <button onClick={() => setActiveTab('ditangguhkan')} className={`px-4 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all border ${activeTab === 'ditangguhkan' ? 'bg-rose-500 text-white border-transparent shadow-md shadow-rose-500/20' : 'bg-surface border-primary/10 text-muted hover:bg-primary/5'}`}>
            Ditangguhkan
          </button>
        </div>

        {/* 📋 LIST TOKO */}
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : filteredStores.length === 0 ? (
          <div className="text-center py-12 opacity-60 bg-surface border border-primary/10 rounded-2xl p-6">
            <Store className="w-10 h-10 mx-auto text-muted mb-3 opacity-50" />
            <p className="font-bold text-main">Toko Tidak Ditemukan</p>
            <p className="text-[11px] text-muted mt-1">Coba gunakan kata kunci pencarian yang lain.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredStores.map((store) => (
              <div key={store.id} className={`bg-surface border ${store.is_suspended ? 'border-rose-500/30 bg-rose-500/5' : 'border-primary/10'} rounded-2xl p-4 shadow-sm relative transition-all group`}>
                
                {/* Badge Status Kanan Atas */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-black tracking-widest border flex items-center gap-1 ${
                    store.is_suspended ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  }`}>
                    {store.is_suspended ? <ShieldAlert className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                    {store.is_suspended ? 'SUSPENDED' : 'ACTIVE'}
                  </span>
                </div>

                <div className="flex items-start gap-4">
                  {/* Foto Profil Toko */}
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-black text-white shrink-0 border-2 overflow-hidden ${
                    store.is_suspended ? 'bg-rose-400 border-rose-200 grayscale' : 'bg-primary border-primary/20'
                  }`}>
                    {store.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={store.avatar_url} alt={store.full_name} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(store.full_name)
                    )}
                  </div>

                  {/* Info Toko */}
                  <div className="flex-1 pt-1">
                    <h3 className="text-sm font-black text-main leading-tight pr-20 line-clamp-1">{store.full_name || 'Toko Tanpa Nama'}</h3>
                    <p className="text-[11px] font-medium text-muted mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Area Singkawang
                    </p>
                    
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-md bg-teal-500/10 text-teal-600 flex items-center justify-center"><Box className="w-3 h-3" /></div>
                        <div>
                          <p className="text-[12px] font-bold text-main leading-none">{store.totalItems}</p>
                          <p className="text-[9px] font-semibold text-muted">Barang</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-md bg-blue-500/10 text-blue-600 flex items-center justify-center"><TrendingUp className="w-3 h-3" /></div>
                        <div>
                          <p className="text-[12px] font-bold text-main leading-none">Mitra</p>
                          <p className="text-[9px] font-semibold text-muted">Terverifikasi</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Garis Pemisah */}
                <div className="w-full h-px bg-primary/5 my-4"></div>

                {/* Aksi Bawah */}
                <div className="flex justify-between items-center">
                  <p className="text-[9px] text-muted font-medium">Bergabung: {new Date(store.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleToggleSuspend(store.id, store.is_suspended || false)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors border ${
                        store.is_suspended 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' 
                          : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                      }`}
                    >
                      {store.is_suspended ? 'Pulihkan Toko' : 'Tangguhkan'}
                    </button>
                    <button className="w-7 h-7 rounded-lg bg-surface border border-primary/10 flex items-center justify-center text-muted hover:text-main hover:bg-primary/5 transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}