"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  PackageSearch, Edit, Eye, EyeOff, 
  Plus, CheckCircle2, AlertCircle, Loader2, Trash2, Hash
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const AdminManageItems = () => {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'semua' | 'live' | 'draft'>('semua');

  const filteredItems = items.filter(item => {
    if (filter === 'live') return item.is_available === true;
    if (filter === 'draft') return item.is_available === false;
    return true;
  });

  // ================= PERUBAHAN UTAMA DI SINI =================
  const fetchItems = async () => {
    setLoading(true);

    try {
      // 1. Dapatkan ID Admin yang sedang login
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const currentUserId = authData.user?.id;

      if (authError || !currentUserId) {
        console.error("Gagal mendapatkan sesi user");
        setLoading(false);
        return;
      }

      // 2. Tarik SEMUA barang, TAPI hanya yang owner_id-nya milik Admin ini
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('owner_id', currentUserId) // <--- KUNCI PEMISAH RUANGAN
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      if (data) setItems(data);

    } catch (error) {
      console.error("Gagal menarik data barang:", error);
    } finally {
      setLoading(false);
    }
  };
  // ===========================================================

  useEffect(() => {
    fetchItems();
  }, []);

  // 2. Fungsi Toggle Publish
  const handleTogglePublish = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    
    // Update UI duluan biar terasa cepat (Optimistic Update)
    setItems(items.map(item => item.id === id ? { ...item, is_available: newStatus } : item));

    const { error } = await supabase.from('items').update({ is_available: newStatus }).eq('id', id);
    if (error) {
      alert("Gagal merubah status barang.");
      fetchItems(); // Tarik data lama jika error
    }
  };

  // 3. Fungsi Hapus Barang
  const handleDelete = async (id: string) => {
    const isConfirm = window.confirm("Yakin ingin menghapus barang ini secara permanen? Data tidak bisa dikembalikan.");
    if (!isConfirm) return;

    // [FIX STORAGE] Cari data barangnya dulu sebelum dihapus dari UI
    const itemToDelete = items.find(item => item.id === id);

    // Hapus dari UI sementara
    setItems(items.filter(item => item.id !== id));

    // Hapus dari database
    const { error } = await supabase.from('items').delete().eq('id', id);
    
    if (error) {
      alert("Gagal menghapus barang.");
      fetchItems();
    } else {
      // [FIX STORAGE] Jika berhasil dihapus dari DB, hapus juga file fotonya di Storage
      if (itemToDelete?.image_urls && itemToDelete.image_urls.length > 0) {
        // Ambil nama file dari ujung URL
        const filesToRemove = itemToDelete.image_urls.map((url: string) => {
          return url.substring(url.lastIndexOf('/') + 1);
        });
        
        // Hapus fisik gambarnya secara serentak
        await supabase.storage.from('product-images').remove(filesToRemove);
      }
    }
  };

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);
  };

  return (
    // 1. [UBAH BUNGKUS LUAR] Hapus h-full, overflow-y-auto, dan p-5
    <div className="w-full flex flex-col text-text-main pb-24">
      
      {/* 2. [BUAT AREA STICKY] Bungkus Header & Filter agar selalu menempel cantik di atas */}
      <div className="sticky top-0 z-30 bg-fluent-bg/95 backdrop-blur-md px-5 pt-5 pb-3 border-b border-fluent-accent/10">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <PackageSearch className="w-6 h-6 text-fluent-accent" />
              Manajemen Barang
            </h1>
            <p className="text-xs text-text-muted mt-1">Atur data dan visibilitas alat sewaan</p>
          </div>
          <button 
            onClick={() => router.push('/admin/add')}
            className="bg-fluent-accent hover:bg-[#b58eff] text-white p-2.5 rounded-xl shadow-[0_4px_20px_rgba(163,116,255,0.4)] transition-colors shrink-0"
          >
            <Plus className="w-5 h-5" />
          </button>
        </header>

      {/* Filter Tab */}
      <div className="flex gap-2 mb-1 px-1 overflow-x-auto scrollbar-hide">
          {(['semua', 'live', 'draft'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 rounded-full text-[11px] font-bold capitalize transition-all ${
                filter === tab 
                  ? 'bg-fluent-accent text-white shadow-lg' 
                  : 'bg-fluent-accent/5 text-text-muted hover:bg-white/10'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

      </div>

      {/* List Barang */}
      <main className="px-5 pt-5">
        {/* List Barang */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 text-fluent-accent animate-spin" />
          </div>
        ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-fluent-card border border-fluent-accent/10 rounded-2xl p-3 shadow-lg flex flex-col gap-3 relative overflow-hidden transition-all">
              
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${item.is_available ? 'bg-green-500' : 'bg-red-500/50'}`}></div>

              <div className="flex gap-3 ml-2">
                <div className="w-16 h-16 rounded-xl bg-fluent-bg border border-white/10 overflow-hidden shrink-0">
                  <img 
                    src={item.image_urls?.[0] || 'https://via.placeholder.com/150'} 
                    alt={item.name} 
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-sm truncate pr-2 text-text-main">{item.name}</h3>
                    {item.is_available ? (
                      <span className="bg-green-500/10 text-green-400 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-green-500/20 shrink-0">
                        <CheckCircle2 className="w-3 h-3" /> Live
                      </span>
                    ) : (
                      <span className="bg-red-500/10 text-red-400 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-red-500/20 shrink-0">
                        <AlertCircle className="w-3 h-3" /> Draft
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center text-[10px] text-text-muted gap-1 mb-1.5">
                    <Hash className="w-3 h-3" />
                    <span className="truncate">ID: {item.id.split('-')[0]}</span>
                  </div>

                  <div className="text-xs font-semibold text-fluent-accent">
                    {formatRupiah(item.price_per_day)} <span className="font-normal text-text-muted text-[10px]">/hari</span>
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-fluent-accent/5 ml-2"></div>

              <div className="flex justify-between items-center ml-2">
                <div className="text-[11px] text-text-muted font-medium bg-fluent-accent/5 px-2.5 py-1 rounded-lg border border-fluent-accent/10">
                  Sisa Stok: <span className="text-text-main font-bold">{item.stock} unit</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/20"
                    title="Hapus Barang"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button 
                    onClick={() => router.push(`/admin/items/edit/${item.id}`)}
                    className="p-2 rounded-xl bg-fluent-accent/5 hover:bg-white/10 text-text-main transition-colors border border-fluent-accent/10"
                    title="Edit Data Barang"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button 
                    onClick={() => handleTogglePublish(item.id, item.is_available)}
                    className={`p-2 rounded-xl border transition-colors ${
                      item.is_available 
                        ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20' 
                        : 'bg-fluent-accent/5 text-text-muted border-white/10 hover:bg-white/10'
                    }`}
                    title={item.is_available ? "Sembunyikan dari Homepage" : "Tampilkan ke Homepage"}
                  >
                    {item.is_available ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>

            </div>
          ))}
          
          {items.length === 0 && (
              <div className="text-center py-16 bg-fluent-card rounded-2xl border border-fluent-accent/10 border-dashed">
                <PackageSearch className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-50" />
                <p className="text-sm font-bold text-text-main">Belum ada barang</p>
                <p className="text-xs text-text-muted mt-1 mb-4">Silakan tambah alat baru ke katalog Anda.</p>
                <button onClick={() => router.push('/admin/add')} className="text-xs font-bold text-fluent-accent bg-fluent-accent/10 px-4 py-2 rounded-full hover:bg-fluent-accent/20 transition-colors">
                  + Tambah Sekarang
                </button>
              </div>
            )}
          </div>
        )}
      </main>

    </div>
  );
}

export default AdminManageItems;