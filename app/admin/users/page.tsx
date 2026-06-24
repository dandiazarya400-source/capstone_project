"use client";

import React, { useState, useEffect } from 'react';
import { 
  Search, User, Phone, MapPin, ShieldCheck, 
  FileText, Ban, Flag, ChevronRight, XCircle,
  ArrowLeft, Loader2, Clock, X, CheckCircle, AlertTriangle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface UserProfile {
  id: string;
  full_name: string;
  phone_number: string;
  address: string;
  avatar_url: string;
  ktp_url: string;
  selfie_url: string;
  verification_status: string;
  created_at: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [adminId, setAdminId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userStats, setUserStats] = useState({ totalRent: 0, activeRent: 0 });
  const [existingNote, setExistingNote] = useState<string>('');

  const [myStoreItemIds, setMyStoreItemIds] = useState<string[]>([]);
  const [isBlacklisted, setIsBlacklisted] = useState(false);

  // State untuk Toast Notification (Sukses/Error)
  const [toast, setToast] = useState<{ show: boolean, message: string, type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  // State untuk Custom Modal (Menggantikan window.prompt)
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: 'note' | 'blacklist' | 'report';
    title: string;
    description: string;
    placeholder: string;
    value: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. INIT: AMBIL ADMIN ID & DAFTAR USER
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        const { data: authData } = await supabase.auth.getUser();
        const currentAdminId = authData.user?.id;
        
        if (!currentAdminId) return;
        setAdminId(currentAdminId);

        // [FIX PRIVASI: TAHAP 1] Cari semua barang milik admin ini
        const { data: myItems } = await supabase.from('items').select('id').eq('owner_id', currentAdminId);
        const myItemIds = myItems?.map(item => item.id) || [];

        if (myItemIds.length === 0) {
          setUsers([]); 
          return;
        }
        setMyStoreItemIds(myItemIds);

        // [FIX PRIVASI: TAHAP 2] Cari ID user (tenant_id) yang pernah menyewa barang-barang tersebut
        const { data: txData } = await supabase.from('transactions').select('tenant_id').in('item_id', myItemIds);
        const tenantIds = txData?.map(tx => tx.tenant_id) || [];
        const uniqueTenantIds = Array.from(new Set(tenantIds)); // Hapus ID ganda jika dia sewa berkali-kali

        if (uniqueTenantIds.length === 0) {
          setUsers([]);
          return;
        }

        // [FIX PRIVASI: TAHAP 3] Tarik profil HANYA untuk user-user tersebut
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .in('id', uniqueTenantIds)
          // .eq('is_admin', false)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        if (data) setUsers(data);

      } catch (error) {
        console.error("Gagal memuat pengguna:", error);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  // Fungsi Panggil Toast
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // 2. KLIK DETAIL USER
  const handleSelectUser = async (user: UserProfile) => {
    setSelectedUser(user);
    setExistingNote(''); 
    setIsBlacklisted(false); // Reset blacklist status
    
    try {
      // 🌟 FIX SINKRONISASI 1: Hitung statistik HANYA di toko admin ini!
      const { data: txData } = await supabase
        .from('transactions')
        .select('status')
        .eq('tenant_id', user.id)
        .in('item_id', myStoreItemIds); // Kunci hanya untuk barang admin ini
        
      if (txData) {
        const active = txData.filter(t => !['Selesai', 'Dibatalkan'].includes(t.status)).length;
        setUserStats({ totalRent: txData.length, activeRent: active });
      }

      if (adminId) {
        // Ambil Catatan Internal
        const { data: noteData } = await supabase
          .from('internal_notes').select('note')
          .eq('admin_id', adminId).eq('user_id', user.id).maybeSingle();
        if (noteData) setExistingNote(noteData.note);

        // 🌟 FIX SINKRONISASI 2: Cek apakah user ini sudah di-blacklist
        const { data: blacklistData } = await supabase
          .from('blacklists').select('id')
          .eq('admin_id', adminId).eq('user_id', user.id).maybeSingle();
        if (blacklistData) setIsBlacklisted(true);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // 3. SUBMIT AKSI DARI MODAL
  const handleModalSubmit = async () => {
    if (!actionModal || !selectedUser || !adminId) return;
    if (!actionModal.value.trim() && actionModal.type !== 'note') {
      showToast('Harap isi alasannya terlebih dahulu!', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (actionModal.type === 'note') {
        // 🌟 FIX LOGIKA SIMPAN: Hapus yang lama, masukkan yang baru (Aman dari error constraint)
        await supabase.from('internal_notes').delete().match({ admin_id: adminId, user_id: selectedUser.id });
        if (actionModal.value.trim()) {
            await supabase.from('internal_notes').insert({ admin_id: adminId, user_id: selectedUser.id, note: actionModal.value });
        }
        setExistingNote(actionModal.value);
        showToast('Catatan internal berhasil disimpan.');
      } 
      else if (actionModal.type === 'blacklist') {
        const { error } = await supabase.from('blacklists').insert({
          admin_id: adminId, user_id: selectedUser.id, reason: actionModal.value
        });
        if (error) throw error;
        setIsBlacklisted(true); // 🌟 SINKRON UI seketika
        showToast('User berhasil dimasukkan ke daftar Blacklist toko Anda.');
      } 
      else if (actionModal.type === 'report') {
        // ... (Biarkan sama persis seperti kodemu) ...
        const { error } = await supabase.from('reports').insert({
          reporter_id: adminId, reported_user_id: selectedUser.id, reason: actionModal.value
        });
        if (error) throw error;
        showToast('Laporan berhasil dikirim ke Superadmin untuk ditindaklanjuti.');
      }

      setActionModal(null);
    } catch (error: any) {
      console.error(error);
      showToast('Gagal memproses permintaan. Mungkin data sudah ada.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fungsi Pembuka Modal
  const openModal = (type: 'note' | 'blacklist' | 'report') => {
    let config = { isOpen: true, type, title: '', description: '', placeholder: '', value: '' };
    
    if (type === 'note') {
      config.title = 'Catatan Internal';
      config.description = 'Catatan ini rahasia dan hanya bisa dibaca oleh Anda. Berguna untuk mengingat reputasi penyewa ini.';
      config.placeholder = 'Contoh: Sering telat mengembalikan alat, tapi orangnya ramah...';
      config.value = existingNote;
    } else if (type === 'blacklist') {
      config.title = 'Blacklist Pengguna';
      config.description = 'Pengguna ini tidak akan bisa lagi menyewa barang dari toko Anda. Ini tidak memengaruhi toko lain.';
      config.placeholder = 'Alasan blacklist (wajib)...';
    } else if (type === 'report') {
      config.title = 'Laporkan Pengguna';
      config.description = 'Laporkan pengguna ini ke Superadmin platform atas tindakan pelanggaran berat (penipuan, pencurian, dll).';
      config.placeholder = 'Jelaskan kronologi pelanggaran secara detail...';
    }
    setActionModal(config);
  };

  // 🌟 STATE BARU UNTUK FILTER (Tambahkan ini jika belum ada)
  const [activeFilter, setActiveFilter] = useState('Semua');

  // 🌟 LOGIKA FILTER & PENCARIAN GABUNGAN
  const filteredUsers = users.filter(u => {
    // 1. Cek Pencarian Teks
    const matchSearch = u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        u.phone_number?.includes(searchQuery);
    
    // 2. Cek Filter Tab
    if (activeFilter === 'Semua') return matchSearch;
    if (activeFilter === 'Terverifikasi') return matchSearch && u.verification_status === 'verified';
    if (activeFilter === 'Menunggu') return matchSearch && u.verification_status === 'pending';
    
    return matchSearch;
  });

  // 🌟 HITUNG STATISTIK CEPAT UNTUK HEADER
  const totalUsers = users.length;
  const pendingVerifCount = users.filter(u => u.verification_status === 'pending').length;

  // =========================================================================
  // VIEW: DETAIL USER
  // =========================================================================
  if (selectedUser) {
    return (
      // 1. Hapus h-full, overflow, dan bg-background
      <div className="w-full flex flex-col text-main">
        
        {/* TOAST NOTIFICATION */}
        <div className="fixed top-24 left-0 w-full flex justify-center z-[100] pointer-events-none px-4">
          {toast.show && (
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg animate-in slide-in-from-top-5 fade-in duration-300 backdrop-blur-md border ${
              toast.type === 'success' 
                ? 'bg-[#1a2e23]/90 border-emerald-500/30 text-emerald-400 shadow-emerald-500/20' 
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-rose-500/20'
            }`}>
              {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span className="text-[11px] font-bold tracking-wide">{toast.message}</span>
            </div>
          )}
        </div>

        {/* CUSTOM MODAL AKSI */}
        {actionModal && actionModal.isOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !isSubmitting && setActionModal(null)} />
            
            <div className="relative w-full max-w-sm bg-surface border border-white/10 rounded-3xl p-5 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-start mb-2">
                <h3 className={`font-bold text-lg ${actionModal.type === 'report' ? 'text-rose-400' : actionModal.type === 'blacklist' ? 'text-orange-400' : 'text-primary'}`}>
                  {actionModal.title}
                </h3>
                <button onClick={() => setActionModal(null)} disabled={isSubmitting} className="p-1 text-white/40 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[11px] text-muted leading-relaxed mb-4">{actionModal.description}</p>
              
              <textarea 
                value={actionModal.value}
                onChange={(e) => setActionModal({ ...actionModal, value: e.target.value })}
                placeholder={actionModal.placeholder}
                rows={4}
                className="w-full bg-background border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 resize-none shadow-inner mb-4"
              />
              
              <div className="flex gap-3">
                <button onClick={() => setActionModal(null)} disabled={isSubmitting} className="flex-1 py-3 rounded-xl text-xs font-bold text-muted bg-primary/5 hover:bg-white/10 transition-colors">
                  Batal
                </button>
                <button onClick={handleModalSubmit} disabled={isSubmitting} className={`flex-1 py-3 rounded-xl text-xs font-bold text-white transition-colors flex justify-center items-center gap-2 shadow-lg ${
                  actionModal.type === 'report' ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30' : 
                  actionModal.type === 'blacklist' ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-600/30' : 
                  'bg-primary hover:bg-[#b58eff] shadow-primary/30'
                }`}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {isSubmitting ? 'Memproses...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. AREA KONTEN UTAMA (Tanpa header sticky) */}
        <main className="w-full px-5 pt-4 pb-24 space-y-6">
          
          {/* HEADER CARD DALAM (Aman dari tabrakan) */}
          <div className="flex items-center gap-3 bg-surface p-3 rounded-2xl border border-primary/10 shadow-lg">
            <button onClick={() => setSelectedUser(null)} className="p-2 bg-primary/5 rounded-full hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-bold text-main leading-tight">Detail Profil</h1>
              <p className="text-[10px] text-muted line-clamp-1">{selectedUser.full_name || 'Data Pengguna'}</p>
            </div>
          </div>

          {/* KARTU PROFIL UTAMA */}
          <div className="bg-surface p-5 rounded-2xl border border-primary/10 shadow-lg flex items-center gap-4">
            <img src={selectedUser.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'} alt="Avatar" className="w-16 h-16 rounded-full object-cover ring-2 ring-primary" />
            <div className="flex-1">
              <h2 className="font-bold text-lg leading-tight mb-1">{selectedUser.full_name || 'Tanpa Nama'}</h2>
              <div className="flex items-center gap-1.5 text-muted text-xs mb-1">
                <Phone className="w-3 h-3" />
                <span>{selectedUser.phone_number || 'Belum ada nomor'}</span>
              </div>
              <div className="flex items-start gap-1.5 text-muted text-xs">
                <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{selectedUser.address || 'Alamat belum diisi'}</span>
              </div>
            </div>
          </div>

          {/* KARTU STATISTIK SEWA */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-primary">{userStats.totalRent}</span>
              <span className="text-[10px] uppercase font-bold text-muted mt-1">Total Sewa</span>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-emerald-400">{userStats.activeRent}</span>
              <span className="text-[10px] uppercase font-bold text-muted mt-1">Sewa Aktif</span>
            </div>
          </div>

          {/* KARTU VERIFIKASI IDENTITAS */}
          <div className="bg-surface p-5 rounded-2xl border border-primary/10 shadow-lg space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-sm uppercase tracking-wider">Status Identitas</h3>
              {selectedUser.verification_status === 'verified' && <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Terverifikasi</span>}
              {selectedUser.verification_status === 'pending' && <span className="bg-yellow-500/20 text-yellow-400 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"><Clock className="w-3 h-3"/> Menunggu</span>}
              {selectedUser.verification_status === 'rejected' && <span className="bg-rose-500/20 text-rose-400 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"><XCircle className="w-3 h-3"/> Ditolak</span>}
              {selectedUser.verification_status === 'unverified' && <span className="bg-white/10 text-white/50 text-[10px] font-bold px-2 py-1 rounded-full">Belum Upload</span>}
            </div>

            <div className="space-y-2">
              <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Foto Verifikasi Wajah (Selfie)</p>
              <div className="w-full bg-background rounded-xl border border-white/10 overflow-hidden flex items-center justify-center p-2">
                {selectedUser.selfie_url ? (
                  <img src={selectedUser.selfie_url} className="w-full max-h-48 object-contain rounded-lg" alt="Selfie Penyewa" />
                ) : (
                  <div className="py-8 text-center">
                    <User className="w-8 h-8 text-white/20 mx-auto mb-2" />
                    <span className="text-xs text-white/30">Foto wajah belum tersedia</span>
                  </div>
                )}
              </div>
              <p className="text-[9px] text-muted mt-1 leading-relaxed">
                * KTP asli disimpan dan dienkripsi oleh sistem pusat demi privasi. Cocokkan wajah ini saat penyewa mengambil barang.
              </p>
            </div>
          </div>

          {/* MENU TINDAKAN KEAMANAN ADMIN */}
          <div className="space-y-2">
            <h3 className="font-bold text-[10px] text-muted uppercase tracking-wider ml-1 mb-2">Tindakan Keamanan</h3>
            
            {/* 🌟 TOMBOL BLACKLIST SINKRON */}
            <button 
              onClick={() => !isBlacklisted && openModal('blacklist')} 
              disabled={isBlacklisted}
              className={`w-full flex items-center justify-between p-4 border rounded-2xl transition-colors text-left ${
                isBlacklisted 
                  ? 'bg-black/40 border-orange-500/50 cursor-not-allowed opacity-70' 
                  : 'bg-surface border-primary/10 hover:bg-primary/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${isBlacklisted ? 'bg-orange-500/50 text-white' : 'bg-orange-500/20 text-orange-400'}`}>
                  <Ban className="w-4 h-4" />
                </div>
                <div>
                  <p className={`text-sm font-bold ${isBlacklisted ? 'text-orange-400' : 'text-main'}`}>
                    {isBlacklisted ? 'Telah Di-Blacklist' : 'Blacklist dari Toko'}
                  </p>
                  <p className="text-[10px] text-muted">
                    {isBlacklisted ? 'User ini sudah diblokir dari tokomu' : 'User tidak bisa menyewa di tokomu'}
                  </p>
                </div>
              </div>
              {!isBlacklisted && <ChevronRight className="w-4 h-4 text-muted shrink-0" />}
            </button>

            <button onClick={() => openModal('blacklist')} className="w-full flex items-center justify-between p-4 bg-surface border border-primary/10 rounded-2xl hover:bg-primary/5 transition-colors text-left">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 shrink-0 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400"><Ban className="w-4 h-4" /></div>
                <div>
                  <p className="text-sm font-bold text-main">Blacklist dari Toko</p>
                  <p className="text-[10px] text-muted">User tidak bisa menyewa di tokomu</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted shrink-0" />
            </button>

            <button onClick={() => openModal('report')} className="w-full flex items-center justify-between p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl hover:bg-rose-500/20 transition-colors text-left">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 shrink-0 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400"><Flag className="w-4 h-4" /></div>
                <div>
                  <p className="text-sm font-bold text-rose-400">Laporkan Akun</p>
                  <p className="text-[10px] text-rose-400/70">Laporkan ke sistem atas penipuan/kerusakan</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-rose-400 shrink-0" />
            </button>
          </div>
        </main>
      </div>
    );
  }

  // =========================================================================
  // VIEW UTAMA: DAFTAR SEMUA USER
  // =========================================================================
  return (
    <div className="w-full flex flex-col text-main relative">
      <main className="w-full px-5 pt-4 pb-24">
        
        {/* 🌟 UPGRADE 1: KARTU STATISTIK MINI DI ATAS */}
        <div className="grid grid-cols-2 gap-3 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex flex-col justify-center">
            <span className="text-2xl font-black text-primary">{totalUsers}</span>
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider mt-1">Total Pelanggan</span>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 flex flex-col justify-center">
            <span className="text-2xl font-black text-yellow-600">{pendingVerifCount}</span>
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider mt-1">Perlu Verifikasi</span>
          </div>
        </div>

        {/* PENCARIAN */}
        <div className="relative w-full mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-primary" />
          <input 
            type="text" 
            placeholder="Cari nama atau nomor HP..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-primary/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-all shadow-sm text-main placeholder:text-muted/50"
          />
        </div>

        {/* 🌟 UPGRADE 2: FILTER CHIPS (TOMBOL KATEGORI) */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-6 pb-1">
          {['Semua', 'Terverifikasi', 'Menunggu'].map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-2 rounded-full text-[11px] font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                activeFilter === f
                  ? 'bg-primary text-white shadow-md shadow-primary/20 border-primary'
                  : 'bg-surface border border-primary/10 text-muted hover:bg-primary/5'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* DAFTAR USER */}
        {loading ? (
          <div className="flex justify-center mt-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center mt-12 flex flex-col items-center opacity-50">
            <User className="w-12 h-12 mb-3 text-muted" />
            <p className="text-muted text-sm font-bold">Tidak ada pengguna ditemukan.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <button 
                key={user.id} 
                onClick={() => handleSelectUser(user)}
                className="w-full bg-surface border border-primary/10 p-3.5 rounded-2xl flex items-center justify-between hover:bg-primary/5 transition-all text-left shadow-sm group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Avatar User */}
                  <img src={user.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'} alt="Avatar" className="w-11 h-11 rounded-full object-cover ring-2 ring-primary/10 shrink-0" />
                  
                  {/* Nama dan Nomor */}
                  <div className="min-w-0 pr-2">
                    <h3 className="font-bold text-[13px] text-main truncate w-full">{user.full_name || 'Tanpa Nama'}</h3>
                    <p className="text-[10px] text-muted mt-0.5 font-medium">{user.phone_number || 'Tidak ada nomor HP'}</p>
                  </div>
                </div>

                {/* 🌟 UPGRADE 3: BADGE STATUS YANG JELAS & ELEGAN */}
                <div className="flex items-center gap-2 shrink-0">
                  {user.verification_status === 'verified' && <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-bold px-2 py-1 rounded-md">Terverifikasi</span>}
                  {user.verification_status === 'pending' && <span className="bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 text-[9px] font-bold px-2 py-1 rounded-md">Menunggu</span>}
                  {user.verification_status === 'rejected' && <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[9px] font-bold px-2 py-1 rounded-md">Ditolak</span>}
                  {(!user.verification_status || user.verification_status === 'unverified') && <span className="bg-slate-500/10 text-slate-500 border border-slate-500/20 text-[9px] font-bold px-2 py-1 rounded-md">Belum Verif</span>}
                  
                  <ChevronRight className="w-4 h-4 text-muted/30 group-hover:text-primary transition-colors shrink-0 ml-1" />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}