"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Headphones, Wallet, Box, Truck, CheckCircle2, Star, 
  Banknote, Store, Link2, Ticket, Heart, MapPin, MessageSquare,
  BadgeCheck, LogOut, Edit3, LayoutDashboard, ChevronRight, XCircle,
  Loader2, AlertCircle, Clock, ShieldCheck
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/useUserStore';

interface ProductProps {
  id: string; title: string; price: string; rating: string;
  sold: string; owner: string; image: string; isVerified: boolean;
}

const ProductCard: React.FC<ProductProps> = ({ id, title, price, rating, sold, owner, image, isVerified }) => (
  <Link href={`/product/${id}`} className="block h-full">
    <div className="bg-white rounded-[20px] shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full flex flex-col overflow-hidden group">
      <div className="w-full aspect-square relative bg-slate-50 overflow-hidden shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      </div>
      <div className="p-3.5 flex flex-col flex-1">
        <h3 className="text-[13px] font-semibold text-slate-800 line-clamp-2 min-h-[36px] leading-snug mb-1.5">{title}</h3>
        <div className="mt-auto flex flex-col gap-1.5">
          <p className="text-[14px] font-bold text-teal-600">{price}</p>
          <div className="flex items-center text-[10px] font-medium text-slate-500 gap-1.5">
            <div className="flex items-center gap-0.5">
              <span className="text-yellow-400 text-[11px] mb-[1px]">★</span>
              <span className="text-slate-600">{rating}</span>
            </div>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span>{sold} Terpinjam</span>
          </div>
          <div className="w-full h-px bg-slate-50 my-1"></div>
          <div className="flex items-center text-[10px] text-slate-500 space-x-1.5">
            {isVerified ? (
              <BadgeCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            ) : (
              <div className="w-3.5 h-3.5 rounded-full bg-slate-200 shrink-0"></div>
            )}
            <span className={`line-clamp-1 ${isVerified ? 'text-slate-700 font-semibold' : 'font-medium'}`}>{owner}</span>
          </div>
        </div>
      </div>
    </div>
  </Link>
);

export default function ProfilePage() {
  const router = useRouter();
  
  const { profile, setProfile, updateBalance, clearProfile } = useUserStore();
  
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [isProcessingTopup, setIsProcessingTopup] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  

  useEffect(() => {
    setIsMounted(true);

    const fetchProfile = async () => {
      try {
        if (!profile) {
          const cachedProfile = localStorage.getItem('user_profile_cache');
          if (cachedProfile) {
            setProfile(JSON.parse(cachedProfile));
          }
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("CCTV Sesi Error:", sessionError.message);
        }

        if (!session?.user) {
          console.warn("Sesi kosong, mengarahkan ke login...");
          router.push('/login');
          return;
        }

      const { data, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, role, balance, verification_status, verification_note, avatar_url') 
          .eq('id', session.user.id)
          .maybeSingle(); 

        if (profileError) {
          console.error("CCTV Profil Error 400:", profileError.message);
          return; 
        }

        if (data) {
          const freshData = {
            full_name: data.full_name || 'Pengguna Baru',
            role: data.role || 'user', 
            balance: data.balance || 0,
            verification_status: data.verification_status || 'unverified',
            verification_note: data.verification_note || '',
            avatar_url: data.avatar_url || ''
          };
          
          setProfile(freshData);
          localStorage.setItem('user_profile_cache', JSON.stringify(freshData));
        }
        

      } catch (fatalError) {
        console.error("Error Fatal Jaringan/Sistem:", fatalError);
      }
    };

    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]); 

  if (!isMounted) return null;

  // ================= LOGIKA XENDIT TOP UP =================
  const submitTopup = async () => {
    const amount = Number(topupAmount);
    
    if (amount < 10000) {
      alert("Minimal Top Up Rp 10.000");
      return;
    }

    setIsProcessingTopup(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) throw new Error("Silakan login kembali.");

      const response = await fetch('/api/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: authData.user.id,
          amount: amount
        })
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.message);

      window.location.href = result.invoiceUrl;

    } catch (error: any) {
      console.error("Gagal top up:", error);
      alert(error.message || "Terjadi kendala saat memproses Top Up.");
    } finally {
      setIsProcessingTopup(false);
    }
  };



  const getInitials = (name: string) => {
    if (!name) return 'U'; 
    return name.trim().charAt(0).toUpperCase(); 
  };

  const userInitials = getInitials(profile?.full_name || '');

  let roleLabel = 'Pengguna Reguler';
  if (profile?.role === 'superadmin') roleLabel = 'Super Administrator';
  else if (profile?.role === 'admin') roleLabel = 'Admin Toko';

  return (
      <div className="h-[100dvh] w-full flex flex-col bg-[#F2FDFB] text-slate-800 overflow-hidden relative animate-in fade-in duration-300">      
      {/* ================= HEADER PROFIL ================= */}
      <div className="flex-1 overflow-y-auto scrollbar-hide pb-32">  
        <div className="relative pt-16 pb-10 px-6 shadow-[0_10px_30px_rgba(20,184,166,0.2)] rounded-b-[40px] border-b border-teal-300/30"> 

        {/* 🌟 LAYER 1: Background & Glow (Dibungkus terpisah agar overflow-hidden tidak memotong konten) */}
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-teal-400 rounded-b-[40px] overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-teal-300/30 rounded-full blur-2xl"></div>
        </div>
        
        {/* 🌟 LAYER 2: Konten Utama (Aman dari potongan) */}
        <div className="flex items-center justify-between relative z-10">
          
          {/* 🌟 LINK DINAMIS: Otomatis membelokkan arah sesuai kasta/role */}
          <Link 
            href={
              profile?.role === 'superadmin' ? '/superadmin/settings' : 
              profile?.role === 'admin' ? '/admin/settings' : 
              '/profile/edit'
            } 
            className="flex items-center space-x-4 group cursor-pointer"
          >
            {/* ... (kode avatar biarkan persis seperti aslimu) ... */}
            <div className="w-20 h-20 rounded-full bg-white p-1 ring-4 ring-white/30 shadow-xl shrink-0 flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-105 group-active:scale-95">
              {profile?.avatar_url && profile.avatar_url.startsWith('http') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-teal-700 to-teal-400 flex items-center justify-center text-white text-2xl font-black shadow-inner tracking-widest">
                  {userInitials}
                </div>
              )}
            </div>
            
            <div>
              <h1 className="text-2xl font-bold text-white line-clamp-1 drop-shadow-sm group-hover:text-white/90 transition-colors">{profile?.full_name || 'Menyiapkan...'}</h1>
              <p className="text-teal-50 text-[13px] font-medium mb-1 drop-shadow-sm">{roleLabel}</p>
              
              <span className="flex items-center gap-1.5 text-[10px] font-medium text-white/80 group-hover:text-white transition-colors mt-1.5">
                <Edit3 className="w-3 h-3" /> 
                {/* 🌟 TEKS DINAMIS: Biar admin melihat tulisan Pengaturan Toko */}
                {profile?.role === 'user' ? 'Ubah Profil' : 'Pengaturan Toko'}
              </span>
            </div>
          </Link>
          
          {/* 🌟 HANYA MUNCUL JIKA STATUSNYA ADALAH USER BIASA */}
          {profile?.role === 'user' && (
            <div className="flex flex-col space-y-3">
              <button onClick={() => router.push('/chat')} className="p-2.5 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-md transition-all border border-white/30 shadow-sm">
                <Headphones className="w-5 h-5 text-white" />
              </button>
              <button onClick={() => setShowLogoutModal(true)} className="p-2.5 bg-white/20 hover:bg-rose-500 hover:border-rose-500 rounded-full backdrop-blur-md transition-all border border-white/30 shadow-sm cursor-pointer group">
                <LogOut className="w-5 h-5 text-white" />
              </button> 
            </div>
          )}
        </div>
      </div>
      
      <main className="px-5 mt-6 space-y-5">

        {/* ================= STATUS VERIFIKASI ================= */}
        {profile?.role === 'user' && profile?.verification_status && (
          <section className="animate-in fade-in slide-in-from-bottom-3 duration-300">
            {profile.verification_status === 'unverified' && (
              <Link href="/verify">
                <div className="bg-rose-50 border border-rose-100 p-4 rounded-[20px] flex items-center justify-between hover:bg-rose-100/50 transition-colors group cursor-pointer shadow-sm">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-rose-500 group-hover:scale-105 transition-transform shadow-sm">
                      <AlertCircle className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-800 text-[14px]">Verifikasi Belum Lengkap</h2>
                      <p className="text-[11px] text-slate-500 mt-0.5">Lengkapi KTP & Selfie untuk menyewa alat</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:bg-rose-500 group-hover:text-white transition-colors">
                    <ChevronRight className="w-4 h-4 text-rose-400 group-hover:text-white" />
                  </div>
                </div>
              </Link>
            )}

            {profile.verification_status === 'pending' && (
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-[20px] flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-amber-500 shadow-sm">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-800 text-[14px]">Verifikasi Sedang Diproses</h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">Mohon tunggu, admin sedang memeriksa berkas</p>
                  </div>
                </div>
              </div>
            )}

            {profile.verification_status === 'verified' && (
              
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-[20px] flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-emerald-500 shadow-sm">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-800 text-[14px]">Akun Terverifikasi</h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">Identitas Anda valid. Selamat menyewa dengan aman!</p>
                  </div>
                </div>
              </div>
            )}
            {/* 🌟 KARTU STATUS DITOLAK (REJECTED) */}
            {profile.verification_status === 'rejected' && (
              <Link href="/verify">
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-[20px] flex items-start hover:bg-rose-100/50 transition-colors cursor-pointer shadow-sm relative overflow-hidden group">
                  
                  {/* 🌟 PERBAIKAN: Ikon diperkecil (w-9 h-9) dan diberi jarak margin yang pas */}
                  <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-rose-500 shrink-0 shadow-sm group-hover:scale-105 transition-transform mt-0.5 mr-3">
                    <XCircle className="w-4.5 h-4.5 animate-pulse" />
                  </div>
                  
                  <div className="flex-1 pr-1">
                    <h2 className="font-bold text-slate-800 text-[14px]">Verifikasi Ditolak!</h2>
                    <p className="text-[11px] text-slate-500 mt-0.5 mb-2.5">Mohon maaf, berkas Anda ditolak dengan alasan:</p>
                    
                    {/* Kotak Pesan dari Superadmin */}
                    <div className="bg-white/60 border border-rose-100 p-2.5 rounded-xl shadow-inner mb-3">
                      <p className="text-[11px] font-semibold text-rose-600 italic leading-relaxed">
                        "{profile.verification_note || 'Berkas tidak memenuhi syarat. Silakan coba lagi.'}"
                      </p>
                    </div>
                    
                    <div className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 uppercase tracking-wider group-hover:text-rose-600">
                      <span>Upload Ulang KTP</span>
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                </div>
              </Link>
            )}
            
          </section>
        )}

        

        {/* ================= TOMBOL KHUSUS ADMIN & SUPERADMIN ================= */}
        {(profile?.role === 'admin' || profile?.role === 'superadmin') && (
          <section>
            <Link href={profile?.role === 'superadmin' ? '/admin' : '/admin'}>
              <div className="bg-white border border-slate-100 p-4 rounded-[20px] flex items-center justify-between hover:border-teal-200 transition-all duration-300 shadow-sm group relative overflow-hidden">
                <div className="flex items-center space-x-4 relative z-10">
                  <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <LayoutDashboard className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-800 text-[15px]">
                      {profile?.role === 'superadmin' ? 'Superadmin Workspace' : 'Admin Workspace'}
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">Kelola barang, pesanan, dan pengguna</p>
                  </div>
                </div>
                <div className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center relative z-10 group-hover:bg-teal-500 transition-colors">
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* ================= KOTAK MASUK ================= */}
        {profile?.role === 'user' && (
        <section>
          <Link href="/inbox"> 
            <div className="bg-white p-4 rounded-[20px] border border-slate-100 shadow-sm flex items-center justify-between hover:border-blue-200 transition-all duration-300 group cursor-pointer">
              
              {/* 🌟 PERBAIKAN: Tambah overflow-hidden agar teks panjang bisa dipotong otomatis */}
              <div className="flex items-center space-x-3 overflow-hidden pr-2">
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-5 h-5 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-slate-800 text-[14px] truncate">Kotak Masuk</h2>
                  {/* 🌟 PERBAIKAN: Teks dipersingkat dan diberi truncate */}
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">Riwayat obrolan Anda</p>
                </div>
              </div>
              
              {/* 🌟 PERBAIKAN: shrink-0 agar lencana merah dan panah tidak pernah terhimpit */}
              <div className="flex items-center space-x-2 shrink-0">
                <span className="bg-rose-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                  BARU
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
              </div>

            </div>
          </Link>
        </section>
        )}
        
        {/* ================= TRANSAKSI ================= */}
        <section className="bg-white p-5 rounded-[20px] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-end mb-4">
            <h2 className="font-bold text-slate-800 text-[15px]">Transaksi</h2>
            <Link href="/history" className="text-[11px] font-bold text-teal-600 hover:underline">
              Lihat Riwayat
            </Link>
          </div>
          <div className="flex justify-between items-center px-1">
            {[ 
              { icon: Wallet, label: 'Bayar', tab: 'Berlangsung' }, 
              { icon: Box, label: 'Diproses', tab: 'Berlangsung' }, 
              { icon: Truck, label: 'Dikirim', tab: 'Berlangsung' }, 
              { icon: CheckCircle2, label: 'Tiba', tab: 'Selesai', alert: true }, 
              { icon: Star, label: 'Ulasan', tab: 'Selesai' } 
            ].map((item, idx) => (
              <Link href="/history" key={idx} className="flex flex-col items-center space-y-2 group">
                <div className="w-11 h-11 rounded-full bg-slate-50 flex items-center justify-center relative border border-slate-100 group-hover:bg-teal-50 group-hover:border-teal-200 transition-colors">
                  <item.icon className="w-5 h-5 text-teal-600 group-hover:scale-110 transition-transform" />
                  {item.alert && <span className="absolute top-0 right-0 w-3 h-3 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>}
                </div>
                <span className="text-[10px] font-medium text-slate-500 group-hover:text-teal-600 transition-colors">{item.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ================= SALDO ================= */}
        <section className="bg-white p-5 rounded-[20px] border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center">
                <Banknote className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500 mb-0.5">Saldo Aktif</p>
                {/* Tambahkan class "truncate" agar teks yang kepanjangan dipotong rapi */}
                <h3 className="font-black text-slate-800 text-[22px] tracking-tight truncate pr-2">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(profile?.balance || 0)}
                </h3>
              </div>
            </div>
            <div className="flex space-x-3 mt-1">
              <button onClick={() => setShowTopupModal(true)} className="flex-1 bg-teal-50 text-teal-600 border border-teal-100 py-2.5 rounded-xl text-[13px] font-bold hover:bg-teal-100 transition-colors shadow-sm">
                Isi Saldo
              </button>
              <button className="flex-1 bg-slate-50 text-slate-600 border border-slate-200 py-2.5 rounded-xl text-[13px] font-bold hover:bg-slate-100 transition-colors shadow-sm">
                Tarik Dana
              </button>
            </div>
          </div>
        </section>

        

      </main>

      </div>

      {/* ================= MODAL TOPUP ================= */}
      {showTopupModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-100 w-full max-w-[300px] rounded-[28px] p-6 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200 relative overflow-hidden">
            <div className="w-14 h-14 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mb-4 relative z-10">
              <Banknote className="w-7 h-7" />
            </div>
            <h3 className="text-[17px] font-bold text-slate-800 mb-1 relative z-10">Isi Saldo</h3>
            <p className="text-[12px] text-slate-500 mb-6 relative z-10 leading-relaxed">Masukkan nominal uang yang ingin kamu tambahkan ke dompet.</p>
            <div className="w-full relative z-10 mb-6">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-800 font-bold">Rp</span>
              <input
                type="text"
                value={topupAmount ? new Intl.NumberFormat('id-ID').format(Number(topupAmount)) : ''}
                onChange={(e) => setTopupAmount(e.target.value.replace(/\D/g, ''))}
                placeholder="50.000"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors placeholder:text-slate-400"
              />
            </div>
            <div className="flex w-full gap-3 relative z-10">
              <button onClick={() => setShowTopupModal(false)} className="flex-1 py-3 rounded-2xl text-[13px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">Batal</button>
              <button disabled={isProcessingTopup || !topupAmount || Number(topupAmount) <= 0} onClick={submitTopup} className="flex-1 py-3 rounded-2xl text-[13px] font-bold text-white bg-teal-500 hover:bg-teal-600 transition-colors shadow-md shadow-teal-500/20 disabled:opacity-50 flex justify-center items-center gap-2">
                {isProcessingTopup ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL LOGOUT ================= */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-100 w-full max-w-[280px] rounded-[28px] p-6 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200 relative overflow-hidden">
            <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-3 relative z-10">
              <LogOut className="w-6 h-6 ml-1" />
            </div>
            <h3 className="text-[17px] font-bold text-slate-800 mb-1.5 relative z-10">Keluar Akun?</h3>
            <p className="text-[12px] text-slate-500 mb-6 leading-relaxed relative z-10">
              Sesi kamu akan diakhiri. Kamu harus masuk kembali untuk menyewa alat.
            </p>
            <div className="flex w-full gap-3 relative z-10">
              <button 
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 rounded-2xl text-[13px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={async () => {
                  setShowLogoutModal(false);  
                  await supabase.auth.signOut();
                  localStorage.removeItem('user_profile_cache'); 
                  clearProfile();
                  router.push('/login');
                }}
                className="flex-1 py-2.5 rounded-2xl text-[13px] font-bold text-white bg-rose-500 hover:bg-rose-600 shadow-md shadow-rose-500/20 transition-colors"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}