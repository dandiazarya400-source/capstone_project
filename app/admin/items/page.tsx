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

  const fetchItems = async () => {
    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      let user: any = session?.user;

      if (!user) {
        const { data: authData } = await supabase.auth.getUser();
        user = authData?.user;
      }

      if (!user) {
        console.error("Gagal mendapatkan sesi user");
        return;
      }

      const currentUserId = user.id;

      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('owner_id', currentUserId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      if (data) setItems(data);

    } catch (error) {
      console.error("Gagal menarik data barang:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleTogglePublish = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    
    setItems(items.map(item => item.id === id ? { ...item, is_available: newStatus } : item));

    const { error } = await supabase.from('items').update({ is_available: newStatus }).eq('id', id);
    if (error) {
      alert("Gagal merubah status barang.");
      fetchItems(); 
    }
  };

  const handleDelete = async (id: string) => {
    const isConfirm = window.confirm("Yakin ingin menghapus barang ini secara permanen? Data tidak bisa dikembalikan.");
    if (!isConfirm) return;

    const itemToDelete = items.find(item => item.id === id);

    setItems(items.filter(item => item.id !== id));

    const { error } = await supabase.from('items').delete().eq('id', id);
    
    if (error) {
      alert("Gagal menghapus barang.");
      fetchItems();
    } else {
      if (itemToDelete?.image_urls && itemToDelete.image_urls.length > 0) {
        const filesToRemove = itemToDelete.image_urls.map((url: string) => {
          const marker = 'product-images/';
          const index = url.indexOf(marker);
          if (index !== -1) {
            return url.substring(index + marker.length);
          }
          return url.substring(url.lastIndexOf('/') + 1); 
        });
        
        await supabase.storage.from('product-images').remove(filesToRemove);
      }
    }
  };

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);
  };

  return (
    <div className="w-full flex flex-col text-slate-800 pb-24">
      
      {/* AREA STICKY */}
      <div className="sticky top-[88px] z-30 bg-[#F2FDFB] px-5 pt-4 pb-3 border-b border-slate-100">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
              <PackageSearch className="w-6 h-6 text-teal-600" />
              Manajemen Barang
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">Atur data dan visibilitas alat sewaan</p>
          </div>
          <button 
            onClick={() => router.push('/admin/add')}
            className="bg-teal-500 hover:bg-teal-600 text-white p-2.5 rounded-xl shadow-md shadow-teal-500/20 transition-colors shrink-0"
          >
            <Plus className="w-5 h-5" />
          </button>
        </header>

        {/* Filter Tab */}
        <div className="flex gap-2 mb-1 px-1 overflow-x-auto scrollbar-hide pb-1">
          {(['semua', 'live', 'draft'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 rounded-full text-[12px] font-bold capitalize transition-all border ${
                filter === tab 
                  ? 'bg-teal-500 text-white border-teal-500 shadow-md shadow-teal-500/20' 
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* List Barang */}
      <main className="px-5 pt-5">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
          </div>
        ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white border border-slate-100 rounded-[20px] p-3.5 shadow-sm hover:shadow-md hover:border-teal-200 flex flex-col gap-3 relative overflow-hidden transition-all group">
              
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${item.is_available ? 'bg-emerald-500' : 'bg-rose-400'}`}></div>

              <div className="flex gap-3 ml-2">
                <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden shrink-0">
                  <img 
                    src={item.image_urls?.[0] || 'https://via.placeholder.com/150'} 
                    alt={item.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-sm truncate pr-2 text-slate-800">{item.name}</h3>
                    {item.is_available ? (
                      <span className="bg-emerald-50 text-emerald-600 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200 shrink-0">
                        <CheckCircle2 className="w-3 h-3" /> Live
                      </span>
                    ) : (
                      <span className="bg-rose-50 text-rose-500 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-rose-200 shrink-0">
                        <AlertCircle className="w-3 h-3" /> Draft
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center text-[10px] text-slate-400 font-medium gap-1 mb-1.5">
                    <Hash className="w-3 h-3" />
                    <span className="truncate">ID: {item.id.split('-')[0]}</span>
                  </div>

                  <div className="text-xs font-black text-teal-600">
                    {formatRupiah(item.price_per_day)} <span className="font-medium text-slate-400 text-[10px]">/hari</span>
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-slate-100 ml-2"></div>

              <div className="flex justify-between items-center ml-2">
                <div className="text-[11px] text-slate-500 font-medium bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                  Sisa Stok: <span className="text-slate-800 font-bold">{item.stock} unit</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-2 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors border border-rose-100"
                    title="Hapus Barang"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button 
                    onClick={() => router.push(`/admin/items/edit/${item.id}`)}
                    className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors border border-slate-200"
                    title="Edit Data Barang"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button 
                    onClick={() => handleTogglePublish(item.id, item.is_available)}
                    className={`p-2 rounded-xl border transition-colors ${
                      item.is_available 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' 
                        : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
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
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 border-dashed shadow-sm">
              <PackageSearch className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">Belum ada barang</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">Silakan tambah alat baru ke katalog Anda.</p>
              <button onClick={() => router.push('/admin/add')} className="text-xs font-bold text-teal-600 bg-teal-50 px-4 py-2 rounded-full border border-teal-100 hover:bg-teal-100 transition-colors">
                + Tambah Sekarang
              </button>
            </div>
          )}
        </div>
        )}
      </main>

    </div>
  );
};

export default AdminManageItems;