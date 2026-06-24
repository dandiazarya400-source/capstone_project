"use client";

import React, { useState, useEffect } from 'react';
import { 
  Search, CheckCircle, XCircle, User, 
  ShieldCheck, Loader2, ArrowLeft, AlertTriangle, 
  FileCheck, FileX, ZoomIn, MapPin, Hash, Phone, MessageSquare
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PendingUser {
  id: string;
  full_name: string;
  phone_number: string;
  nik: string;
  address: string;
  ktp_url: string;
  selfie_url: string;
  created_at: string;
  verification_status: string; 
  verification_note: string;   
}

export default function VerificationPage() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 🌟 FILTER TABS STATE
  const [activeTab, setActiveTab] = useState<'pending' | 'verified' | 'rejected'>('pending');

  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ show: boolean, message: string, type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  // Modal Penolakan & Alasan
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState(''); // 🌟 STATE ALASAN TOLAK
  
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isKtpLoading, setIsKtpLoading] = useState(true);
  const [isSelfieLoading, setIsSelfieLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      setIsKtpLoading(true);
      setIsSelfieLoading(true);
    }
  }, [selectedUser]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // 🌟 PERBAIKAN: Ambil SEMUA user yang bukan 'unverified'
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone_number, nik, address, ktp_url, selfie_url, created_at, verification_status, verification_note')
        .neq('verification_status', 'unverified')
        .order('created_at', { ascending: false }); 

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      showToast('Gagal memuat data antrian', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // 🌟 Fungsi Setujui
  const handleApprove = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ verification_status: 'verified', verification_note: null }) 
        .eq('id', selectedUser.id)
        .select(); // 🌟 WAJIB DITAMBAHKAN: Untuk memaksa DB merespon hasil updatenya!

      if (error) throw error;
      
      // 🌟 ALARM ANTI-TIPU: Jika data kosong, berarti DB memblokirnya (RLS)
      if (!data || data.length === 0) {
        throw new Error("Update ditolak oleh sistem keamanan (RLS Supabase)!");
      }

      showToast('Pengguna berhasil diverifikasi!');
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, verification_status: 'verified', verification_note: '' } : u));
      setSelectedUser(null); 
    } catch (error: any) {
      console.error(error);
      showToast(error.message || 'Gagal memverifikasi pengguna.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🌟 Fungsi Tolak (Dengan Alasan)
  const handleReject = async () => {
    if (!selectedUser) return;
    if (!rejectReason.trim()) {
      showToast('Harap isi alasan penolakan!', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ verification_status: 'rejected', verification_note: rejectReason })
        .eq('id', selectedUser.id)
        .select(); // 🌟 WAJIB DITAMBAHKAN

      if (error) throw error;
      
      // 🌟 ALARM ANTI-TIPU
      if (!data || data.length === 0) {
        throw new Error("Update ditolak oleh sistem keamanan (RLS Supabase)!");
      }
      
      showToast('Verifikasi ditolak dan pesan terkirim.', 'success');
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, verification_status: 'rejected', verification_note: rejectReason } : u));
      setRejectModal(false);
      setRejectReason('');
      setSelectedUser(null);
    } catch (error: any) {
      console.error(error);
      showToast(error.message || 'Gagal menolak verifikasi.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🌟 LOGIKA TAB & STATISTIK
  const pendingUsers = users.filter(u => u.verification_status === 'pending');
  const verifiedUsers = users.filter(u => u.verification_status === 'verified');
  const rejectedUsers = users.filter(u => u.verification_status === 'rejected');

  const currentTabUsers = users.filter(u => 
    u.verification_status === activeTab &&
    (u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.phone_number?.includes(searchQuery))
  );

  // =========================================================================
  // VIEW: DETAIL VERIFIKASI (LAYAR KEPUTUSAN)
  // =========================================================================
  if (selectedUser) {
    return (
      <div className="w-full min-h-screen overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-[#F2FDFB] text-main relative animate-in fade-in duration-300">
        
        {/* 🌟 1. TOAST (Diposisikan absolute di dalam frame HP, bebas dari poni hitam) */}
        <div className="absolute top-16 left-0 right-0 mx-auto w-[90%] max-w-[320px] flex justify-center z-[100] pointer-events-none">
          {toast.show && (
            <div className={`flex items-center justify-center gap-2 px-4 py-3 w-full rounded-full shadow-2xl border ${
              toast.type === 'success' 
                ? 'bg-[#1a2e23] border-emerald-500/50 text-emerald-400' 
                : 'bg-rose-900 border-rose-500/50 text-white'
            }`}>
              {toast.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />} 
              <span className="text-[11px] font-bold tracking-wide line-clamp-1">{toast.message}</span>
            </div>
          )}
        </div>

        {zoomedImage && (
          <div className="fixed inset-0 z-[120] bg-black/95 flex items-center justify-center p-4" onClick={() => setZoomedImage(null)}>
            <img src={zoomedImage} alt="Zoom" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" />
            <p className="absolute bottom-8 text-white/40 text-[10px] font-bold tracking-widest uppercase animate-pulse">Ketuk untuk menutup</p>
          </div>
        )}

        {/* 🌟 MODAL KONFIRMASI TOLAK DENGAN ALASAN */}
        {rejectModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-surface border border-rose-500/30 w-full max-w-sm rounded-3xl p-5 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center"><AlertTriangle className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-bold text-base text-rose-400 leading-tight">Tolak & Kirim Pesan</h3>
                  <p className="text-[10px] text-muted">User akan membaca alasan ini.</p>
                </div>
              </div>
              
              <textarea 
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Contoh: Foto KTP sangat buram dan wajah tidak terlihat jelas..."
                rows={4}
                className="w-full bg-background border border-rose-500/20 rounded-xl p-3 text-sm text-main placeholder:text-muted focus:outline-none focus:border-rose-500 resize-none mb-5 shadow-inner"
              />

              <div className="flex gap-3">
                <button onClick={() => setRejectModal(false)} disabled={isSubmitting} className="flex-1 py-3 rounded-xl text-xs font-bold text-muted bg-primary/5 hover:bg-white/10 transition-colors">Batal</button>
                <button onClick={handleReject} disabled={isSubmitting} className="flex-1 py-3 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 flex items-center justify-center gap-2 transition-colors shadow-lg shadow-rose-600/30">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileX className="w-4 h-4" />} Kirim Penolakan
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="w-full px-5 pt-4 pb-32 space-y-5">
          {/* HEADER AKSI KEMBALI */}
          <div className="flex items-center justify-between bg-surface p-3 rounded-2xl border border-primary/10 shadow-sm sticky top-0 z-30 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedUser(null)} className="p-2 bg-primary/5 rounded-full hover:bg-primary/10 text-primary transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-base font-bold text-main leading-tight">Review Berkas KTP</h1>
                <p className="text-[10px] text-muted font-medium mt-0.5">Pemohon: {selectedUser.full_name || 'Tanpa Nama'}</p>
              </div>
            </div>
            
            {/* BADGE STATUS SAAT INI */}
            {selectedUser.verification_status === 'verified' && <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-[10px] font-bold">Telah Disetujui</span>}
            {selectedUser.verification_status === 'rejected' && <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2.5 py-1 rounded-lg text-[10px] font-bold">Telah Ditolak</span>}
          </div>

          {/* 🌟 RIWAYAT PENOLAKAN (MUNCUL JIKA STATUS REJECTED) */}
          {selectedUser.verification_status === 'rejected' && selectedUser.verification_note && (
            <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl shadow-sm flex gap-3">
              <MessageSquare className="w-5 h-5 text-rose-500 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-1">Pesan Penolakan Sebelumnya</p>
                <p className="text-xs text-rose-400 font-medium leading-relaxed">"{selectedUser.verification_note}"</p>
              </div>
            </div>
          )}

          {/* VALIDASI DATA DIRI (Sama seperti sebelumnya) */}
          <div className="bg-surface p-5 rounded-2xl border border-primary/10 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2"><User className="w-4 h-4 text-primary"/> Validasi Formulir Data Diri</h3>
            <div className="grid grid-cols-1 gap-4 divide-y divide-primary/5">
              <div className="pt-1">
                <p className="text-[9px] text-muted font-bold tracking-widest uppercase flex items-center gap-1"><Hash className="w-3 h-3 text-primary/70"/> Nomor NIK</p>
                {selectedUser.nik?.trim() ? <p className="text-sm font-black text-main mt-0.5 tracking-wider">{selectedUser.nik}</p> : <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-lg mt-1 border border-rose-500/20 animate-pulse">⚠️ NIK Kosong</span>}
              </div>
              <div className="pt-3">
                <p className="text-[9px] text-muted font-bold tracking-widest uppercase flex items-center gap-1"><User className="w-3 h-3 text-primary/70"/> Nama Lengkap</p>
                {selectedUser.full_name?.trim() ? <p className="text-sm font-bold text-main mt-0.5">{selectedUser.full_name}</p> : <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-lg mt-1 border border-rose-500/20">⚠️ Nama Kosong</span>}
              </div>
              <div className="pt-3">
                <p className="text-[9px] text-muted font-bold tracking-widest uppercase flex items-center gap-1"><MapPin className="w-3 h-3 text-primary/70"/> Alamat Domisili KTP</p>
                {selectedUser.address?.trim() ? <p className="text-xs font-semibold text-main mt-0.5 leading-relaxed">{selectedUser.address}</p> : <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-500 bg-orange-500/10 px-2.5 py-1 rounded-lg mt-1 border border-orange-500/20 animate-pulse">⚠️ Alamat Kosong</span>}
              </div>
              <div className="pt-3">
                <p className="text-[9px] text-muted font-bold tracking-widest uppercase flex items-center gap-1"><Phone className="w-3 h-3 text-primary/70"/> Kontak Handphone</p>
                {selectedUser.phone_number?.trim() ? <p className="text-xs font-bold text-main mt-0.5">{selectedUser.phone_number}</p> : <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-lg mt-1 border border-rose-500/20">⚠️ Nomor Kosong</span>}
              </div>
            </div>
          </div>

          {/* FOTO KTP & SELFIE DENGAN SKELETON */}
          <div className="space-y-4">
            <div className="bg-surface p-4 rounded-2xl border border-primary/10 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-2"><FileCheck className="w-4 h-4 text-primary"/> Foto Fisik KTP</h3>
              <div className="relative w-full aspect-[8/5] bg-slate-900 border border-primary/10 rounded-xl overflow-hidden cursor-pointer group shadow-inner" onClick={() => !isKtpLoading && selectedUser.ktp_url && setZoomedImage(selectedUser.ktp_url)}>
                {isKtpLoading && <div className="absolute inset-0 bg-slate-800 animate-pulse flex flex-col items-center justify-center text-slate-400 gap-2 text-xs"><Loader2 className="w-6 h-6 animate-spin text-teal-400" /><span>Membaca KTP...</span></div>}
                {selectedUser.ktp_url ? (
                  <><img src={selectedUser.ktp_url} alt="KTP" className={`w-full h-full object-cover group-hover:scale-102 transition-all duration-300 ${isKtpLoading ? 'opacity-0' : 'opacity-100'}`} onLoad={() => setIsKtpLoading(false)}/>{!isKtpLoading && <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><ZoomIn className="w-7 h-7 text-white"/></div>}</>
                ) : (<div className="flex items-center justify-center h-full text-muted text-xs">Berkas KTP Kosong</div>)}
              </div>
            </div>

            <div className="bg-surface p-4 rounded-2xl border border-primary/10 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-2"><User className="w-4 h-4 text-primary"/> Foto Wajah (Selfie)</h3>
              <div className="relative w-full max-w-[240px] mx-auto aspect-[3/4] bg-slate-900 border border-primary/10 rounded-xl overflow-hidden cursor-pointer group shadow-inner" onClick={() => !isSelfieLoading && selectedUser.selfie_url && setZoomedImage(selectedUser.selfie_url)}>
                {isSelfieLoading && <div className="absolute inset-0 bg-slate-800 animate-pulse flex flex-col items-center justify-center text-slate-400 gap-2 text-xs"><Loader2 className="w-6 h-6 animate-spin text-teal-400" /><span>Membaca Wajah...</span></div>}
                {selectedUser.selfie_url ? (
                  <><img src={selectedUser.selfie_url} alt="Selfie" className={`w-full h-full object-cover group-hover:scale-102 transition-all duration-300 ${isSelfieLoading ? 'opacity-0' : 'opacity-100'}`} onLoad={() => setIsSelfieLoading(false)}/>{!isSelfieLoading && <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><ZoomIn className="w-7 h-7 text-white"/></div>}</>
                ) : (<div className="flex items-center justify-center h-full text-muted text-xs">Selfie Kosong</div>)}
              </div>
            </div>
          </div>

          {/* BOARD PANEL KEPUTUSAN */}
          <div className="bg-primary/5 border border-primary/20 rounded-3xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-center text-main flex items-center justify-center gap-1.5"><ShieldCheck className="w-4 h-4 text-primary"/> Konfirmasi Ulang Keputusan</h3>
            <p className="text-[10px] text-center text-muted mt-1 mb-5 leading-relaxed">Anda dapat mengubah status verifikasi user ini kapan saja jika terdapat kesalahan.</p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => { setRejectReason(selectedUser.verification_note || ''); setRejectModal(true); }} 
                disabled={isSubmitting || selectedUser.verification_status === 'rejected'} 
                className="flex-1 py-3.5 rounded-xl text-xs font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedUser.verification_status === 'rejected' ? 'Sudah Ditolak' : 'Tolak Berkas'}
              </button>
              
              <button 
                onClick={handleApprove} 
                disabled={isSubmitting || isKtpLoading || isSelfieLoading || selectedUser.verification_status === 'verified'} 
                className="flex-[2] py-3.5 rounded-xl text-xs font-bold text-white bg-emerald-500 border border-transparent shadow-md shadow-emerald-500/20 hover:bg-emerald-400 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} 
                {selectedUser.verification_status === 'verified' ? 'Sudah Diverifikasi' : 'Verifikasi Sukses'}
              </button>
            </div>
          </div>

        </main>
      </div>
    );
  }

  // =========================================================================
  // VIEW UTAMA: DAFTAR ANTRIAN & FILTER TABS
  // =========================================================================
  return (
    <div className="w-full min-h-screen overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col bg-[#F2FDFB] text-main relative">
      <main className="w-full px-5 pt-4 pb-24">
        
        {/* PANEL DASHBOARD VERIFIKASI (Dinamis sesuai Tab) */}
        <div className={`border rounded-2xl p-4 flex items-center justify-between mb-5 shadow-sm transition-colors ${
          activeTab === 'pending' ? 'bg-yellow-500/10 border-yellow-500/20' :
          activeTab === 'verified' ? 'bg-emerald-500/10 border-emerald-500/20' :
          'bg-rose-500/10 border-rose-500/20'
        }`}>
          <div>
            <h2 className={`text-2xl font-black ${
              activeTab === 'pending' ? 'text-yellow-600' : activeTab === 'verified' ? 'text-emerald-500' : 'text-rose-500'
            }`}>
              {activeTab === 'pending' ? pendingUsers.length : activeTab === 'verified' ? verifiedUsers.length : rejectedUsers.length}
            </h2>
            <p className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
              activeTab === 'pending' ? 'text-yellow-600/70' : activeTab === 'verified' ? 'text-emerald-500/70' : 'text-rose-500/70'
            }`}>
              {activeTab === 'pending' ? 'Antrian Tertunda' : activeTab === 'verified' ? 'Telah Disetujui' : 'Berkas Ditolak'}
            </p>
          </div>
          <div className={`w-11 h-11 rounded-full flex items-center justify-center ${
            activeTab === 'pending' ? 'bg-yellow-500/20 text-yellow-500' : activeTab === 'verified' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
          }`}>
            {activeTab === 'pending' ? <ShieldCheck className="w-5 h-5" /> : activeTab === 'verified' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          </div>
        </div>

        {/* 🌟 FILTER TABS DENGAN BADGE NOTIFIKASI */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-5 pb-1">
          {/* Tab Pending */}
          <button 
            onClick={() => setActiveTab('pending')} 
            className={`relative px-4 py-2.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex-shrink-0 flex items-center gap-2 ${
              activeTab === 'pending' 
                ? 'bg-yellow-500 text-white shadow-md shadow-yellow-500/20 border border-transparent' 
                : 'bg-surface border border-primary/10 text-muted hover:bg-primary/5'
            }`}
          >
            Tertunda 
            {pendingUsers.length > 0 && <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-yellow-500/20 text-yellow-600'}`}>{pendingUsers.length}</span>}
          </button>
          
          {/* Tab Verified */}
          <button 
            onClick={() => setActiveTab('verified')} 
            className={`relative px-4 py-2.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex-shrink-0 flex items-center gap-2 ${
              activeTab === 'verified' 
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 border border-transparent' 
                : 'bg-surface border border-primary/10 text-muted hover:bg-primary/5'
            }`}
          >
            Disetujui
            <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${activeTab === 'verified' ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-500'}`}>{verifiedUsers.length}</span>
          </button>

          {/* Tab Rejected */}
          <button 
            onClick={() => setActiveTab('rejected')} 
            className={`relative px-4 py-2.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex-shrink-0 flex items-center gap-2 ${
              activeTab === 'rejected' 
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20 border border-transparent' 
                : 'bg-surface border border-primary/10 text-muted hover:bg-primary/5'
            }`}
          >
            Ditolak
            {rejectedUsers.length > 0 && <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${activeTab === 'rejected' ? 'bg-white/20 text-white' : 'bg-rose-500/10 text-rose-500'}`}>{rejectedUsers.length}</span>}
          </button>
        </div>

        {/* INPUT PENCARIAN */}
        <div className="relative w-full mb-5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-primary" />
          <input 
            type="text" 
            placeholder={`Cari nama di tab ${activeTab}...`} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-primary/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-all shadow-sm text-main placeholder:text-muted/50"
          />
        </div>

        {/* LIST USER SESUAI TAB AKTIF */}
        {loading ? (
          <div className="flex justify-center mt-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : currentTabUsers.length === 0 ? (
          <div className="text-center mt-16 flex flex-col items-center opacity-60">
            <ShieldCheck className="w-12 h-12 mb-2 text-muted animate-bounce" />
            <p className="text-muted text-sm font-bold">Data Kosong</p>
            <p className="text-[10px] text-muted font-medium mt-0.5">Tidak ada user di kategori ini.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentTabUsers.map((user) => (
              <button 
                key={user.id} 
                onClick={() => setSelectedUser(user)}
                className="w-full bg-surface border border-primary/10 p-4 rounded-2xl flex items-center justify-between hover:bg-primary/5 transition-all text-left shadow-sm group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    activeTab === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                    activeTab === 'verified' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                  }`}>
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 pr-2">
                    <h3 className="font-bold text-[13px] text-main truncate w-full">{user.full_name || 'User Tanpa Nama'}</h3>
                    <p className="text-[9px] text-muted font-medium mt-0.5">
                      {activeTab === 'pending' ? 'Masuk: ' : 'Diperbarui: '} 
                      {new Date(user.created_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}
                    </p>
                  </div>
                </div>
                <div className="bg-primary/10 text-primary text-[10px] font-bold px-3 py-1.5 rounded-xl shrink-0 group-hover:bg-primary group-hover:text-white transition-colors shadow-sm">
                  {activeTab === 'pending' ? 'Periksa' : 'Lihat'}
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}