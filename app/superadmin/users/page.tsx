"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, Users, Store, ArrowLeft, 
  Loader2, ShieldCheck, UserCircle, 
  MapPin, Phone, MoreVertical
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface UserData {
  id: string;
  full_name: string;
  phone_number: string;
  role: string;
  verification_status: string;
  created_at: string;
  address: string;
}

export default function UsersManagementPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 🌟 STATE TABS
  const [activeTab, setActiveTab] = useState<'all' | 'user' | 'admin'>('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone_number, role, verification_status, address, created_at')
        // Sembunyikan akun superadmin dari daftar agar tidak terhapus/teredit tidak sengaja
        .neq('role', 'superadmin') 
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Gagal menarik data pengguna:', error);
    } finally {
      setLoading(false);
    }
  };

  // 🌟 LOGIKA PEMISAHAN DATA
  // Anggap user biasa adalah yang role-nya null, kosong, atau 'user'
  const regularUsers = users.filter(u => u.role !== 'admin');
  const adminUsers = users.filter(u => u.role === 'admin');

  // Logika Filter Pencarian & Tab Aktif
  const currentTabUsers = users.filter(u => {
    const matchesTab = activeTab === 'all' ? true : activeTab === 'admin' ? u.role === 'admin' : u.role !== 'admin';
    const matchesSearch = (u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.phone_number?.includes(searchQuery));
    return matchesTab && matchesSearch;
  });

  return (
    <div className="w-full min-h-screen overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col bg-[#F2FDFB] text-main relative">
      <main className="w-full px-5 pt-4 pb-24 space-y-5">
        
        {/* HEADER AKSI KEMBALI */}
        <div className="flex items-center gap-3 bg-surface p-3 rounded-2xl border border-primary/10 shadow-sm sticky top-0 z-30 backdrop-blur-md">
          <button onClick={() => router.push('/superadmin')} className="p-2 bg-primary/5 rounded-full hover:bg-primary/10 text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-main leading-tight">Database Pengguna</h1>
            <p className="text-[10px] text-muted font-medium mt-0.5">Kelola seluruh akun platform</p>
          </div>
        </div>

        {/* 🌟 STATISTIK CEPAT */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex flex-col justify-center">
            <span className="text-2xl font-black text-blue-600">{regularUsers.length}</span>
            <span className="text-[10px] font-bold text-blue-600/70 uppercase tracking-wider mt-1">Total Penyewa</span>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 flex flex-col justify-center">
            <span className="text-2xl font-black text-purple-600">{adminUsers.length}</span>
            <span className="text-[10px] font-bold text-purple-600/70 uppercase tracking-wider mt-1">Total Mitra Toko</span>
          </div>
        </div>

        {/* 🌟 FILTER TABS (Anti-Getar dengan border-transparent) */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button 
            onClick={() => setActiveTab('all')} 
            className={`relative px-4 py-2.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex-shrink-0 flex items-center gap-2 ${
              activeTab === 'all' 
                ? 'bg-primary text-white shadow-md shadow-primary/20 border border-transparent' 
                : 'bg-surface border border-primary/10 text-muted hover:bg-primary/5'
            }`}
          >
            Semua Akun
            <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'}`}>{users.length}</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('user')} 
            className={`relative px-4 py-2.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex-shrink-0 flex items-center gap-2 ${
              activeTab === 'user' 
                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20 border border-transparent' 
                : 'bg-surface border border-primary/10 text-muted hover:bg-primary/5'
            }`}
          >
            Penyewa (User)
            {regularUsers.length > 0 && <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${activeTab === 'user' ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-500'}`}>{regularUsers.length}</span>}
          </button>

          <button 
            onClick={() => setActiveTab('admin')} 
            className={`relative px-4 py-2.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex-shrink-0 flex items-center gap-2 ${
              activeTab === 'admin' 
                ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20 border border-transparent' 
                : 'bg-surface border border-primary/10 text-muted hover:bg-primary/5'
            }`}
          >
            Mitra Toko (Admin)
            {adminUsers.length > 0 && <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${activeTab === 'admin' ? 'bg-white/20 text-white' : 'bg-purple-500/10 text-purple-500'}`}>{adminUsers.length}</span>}
          </button>
        </div>

        {/* INPUT PENCARIAN */}
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-primary" />
          <input 
            type="text" 
            placeholder="Cari nama atau nomor HP..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-primary/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-all shadow-sm text-main placeholder:text-muted/50"
          />
        </div>

        {/* LIST DAFTAR PENGGUNA */}
        {loading ? (
          <div className="flex flex-col items-center justify-center mt-12 gap-3 opacity-60">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Mengambil Data...</p>
          </div>
        ) : currentTabUsers.length === 0 ? (
          <div className="text-center mt-16 flex flex-col items-center opacity-60">
            <Users className="w-12 h-12 mb-3 text-muted" />
            <p className="text-main text-sm font-bold">Tidak Ditemukan</p>
            <p className="text-[10px] text-muted font-medium mt-0.5">Tidak ada pengguna yang cocok dengan filter ini.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-muted uppercase tracking-wider ml-1 mt-2">Menampilkan {currentTabUsers.length} Akun</p>
            
            {currentTabUsers.map((user) => (
              <div 
                key={user.id} 
                className="w-full bg-surface border border-primary/10 p-4 rounded-2xl flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    
                    {/* AVATAR BERDASARKAN ROLE */}
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 border ${
                      user.role === 'admin' 
                        ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' 
                        : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                    }`}>
                      {user.role === 'admin' ? <Store className="w-5 h-5" /> : <UserCircle className="w-5 h-5" />}
                    </div>
                    
                    <div className="min-w-0 pr-2">
                      <h3 className="font-bold text-[14px] text-main truncate w-full flex items-center gap-1.5">
                        {user.full_name || 'Tanpa Nama'}
                        {/* BADGE VERIFIKASI */}
                        {user.verification_status === 'verified' && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                      </h3>
                      
                      {/* BADGE ROLE */}
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider mt-1 border ${
                        user.role === 'admin' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                      }`}>
                        {user.role === 'admin' ? 'Mitra Toko' : 'Penyewa'}
                      </span>
                    </div>
                  </div>

                  {/* Tombol Opsi (Untuk fitur delete/edit nantinya) */}
                  <button className="p-2 -mr-2 text-muted hover:bg-primary/5 rounded-full transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>

                {/* INFO TAMBAHAN BAWAH */}
                <div className="flex items-center gap-4 pt-3 border-t border-primary/5">
                  <div className="flex items-center gap-1.5 text-muted">
                    <Phone className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-medium">{user.phone_number || 'Tidak ada HP'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-medium truncate max-w-[120px]">{user.address || 'Alamat kosong'}</span>
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