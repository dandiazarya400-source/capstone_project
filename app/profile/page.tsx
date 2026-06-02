"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  MessageCircle, Headphones, Wallet, Box, Truck, 
  CheckCircle2, Star, Banknote, Coins, Store, 
  Link2, Ticket, Heart, MapPin, BadgeCheck, LogOut, Edit3,
  LayoutDashboard, ChevronRight, Loader2, AlertCircle, Clock, ShieldCheck
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/lib/supabase';

// --- Komponen Kartu Produk ---
interface ProductProps {
  id: string;
  title: string;
  price: string;
  rating: string;
  sold: string;
  owner: string;
  image: string;
  isVerified: boolean;
}

const ProductCard: React.FC<ProductProps> = ({ id, title, price, rating, sold, owner, image, isVerified }) => (
  <Link href={`/product/${id}`} className="block">
    <div className="bg-fluent-card rounded-fluent-rounded p-3 shadow-lg border border-white/5 hover:scale-[1.02] transition-transform cursor-pointer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt={title} className="w-full h-36 object-cover rounded-[18px] mb-3" />
      <h3 className="text-sm font-medium text-text-main line-clamp-2 min-h-[40px]">{title}</h3>
      <p className="text-base font-bold text-text-main mt-1">{price}</p>
      <div className="flex items-center text-xs mt-1 space-x-1.5">
        <span className="text-fluent-accent font-semibold flex items-center drop-shadow-[0_0_5px_rgba(163,116,255,0.5)]">
          ★ {rating}
        </span>
        <span className="text-text-muted">• {sold} Terpinjam</span>
      </div>
      <div className="flex items-center text-xs text-text-muted mt-2 space-x-1.5">
        {isVerified && <BadgeCheck className="w-4 h-4 text-fluent-accent" />}
        <span className={isVerified ? 'text-fluent-accent font-medium' : 'font-medium'}>{owner}</span>
      </div>
    </div>
  </Link>
);

const ProfilePage = () => {
  const router = useRouter();
  
  // ================= STATE UNTUK DATA USER =================
  const [profile, setProfile] = useState({
    full_name: 'Memuat...',
    is_admin: false,
    balance: 0,
    verification_status: 'unverified', // <--- STATE BARU UNTUK VERIFIKASI
    avatar_url: 'https://ui-avatars.com/api/?name=User&background=2B164D&color=A374FF&bold=true'
  });

  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [isProcessingTopup, setIsProcessingTopup] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: authData } = await supabase.auth.getUser();
      
      if (!authData.user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle(); 

      if (data) {
        setProfile({
          full_name: data.full_name || 'Pengguna Baru',
          is_admin: data.is_admin || false,
          balance: data.balance || 0,
          verification_status: data.verification_status || 'unverified', // <--- MENGAMBIL DATA DARI DB
          avatar_url: data.avatar_url || profile.avatar_url 
        });
      }
    };

    fetchProfile();
  }, [router]);

  const handleLogout = async () => {
    const confirmLogout = window.confirm("Apakah kamu yakin ingin keluar?");
    if (confirmLogout) {
      await supabase.auth.signOut();
      router.push('/login');
    }
  };

  const handleTopup = () => {
    setTopupAmount('');
    setShowTopupModal(true);
  };

  const submitTopup = async () => {
    const amount = Number(topupAmount);
    if (amount <= 0) return;

    setIsProcessingTopup(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const newBalance = profile.balance + amount;

      await supabase.from('profiles').update({ balance: newBalance }).eq('id', authData.user.id);
      await supabase.from('wallet_transactions').insert([{
        user_id: authData.user.id,
        amount: amount,
        type: 'topup',
        status: 'Berhasil'
      }]);

      setProfile(prev => ({ ...prev, balance: newBalance }));
      setShowTopupModal(false);
      
      alert(`Berhasil isi saldo sebesar Rp ${amount.toLocaleString('id-ID')}!`);
    } catch (error) {
      console.error("Gagal topup:", error);
      alert("Terjadi kesalahan sistem.");
    } finally {
      setIsProcessingTopup(false);
    }
  };

  const recommendations: ProductProps[] = [
    { id: "2", title: "Samyang AF 35mm f/1.8 Sony", price: "Rp. 250.000", rating: "5.0", sold: "20", owner: "Asoka Maju", image: "https://via.placeholder.com/150", isVerified: true },
    { id: "5", title: "Setelan Jas Formal", price: "Rp. 100.000", rating: "4.8", sold: "198", owner: "Asoka Maju", image: "https://via.placeholder.com/150", isVerified: true },
  ];

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden bg-fluent-bg text-text-main pb-32 scrollbar-hide">
      
      {/* ================= HEADER PROFIL ================= */}
      <div className="bg-gradient-to-br from-[#2B164D] to-fluent-bg pt-12 pb-8 px-6 rounded-b-[40px] shadow-lg border-b border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-fluent-accent/20 rounded-full blur-3xl"></div>
        
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center space-x-4">
            
            <div className="w-20 h-20 rounded-full bg-white p-1 ring-2 ring-fluent-accent ring-offset-2 ring-offset-fluent-bg shadow-[0_0_15px_rgba(163,116,255,0.4)] shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={profile.avatar_url} 
                alt="Profile" 
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            
            {/* Nama & Edit Profil */}
            <div>
              <h1 className="text-2xl font-bold text-text-main line-clamp-1">{profile.full_name}</h1>
              <p className="text-text-muted text-sm font-medium mb-1">
                {profile.is_admin ? 'Administrator' : 'Pengguna Reguler'}
              </p>
              
              <Link href="/profile/edit" className="inline-flex items-center gap-1.5 text-[10px] text-white/80 bg-white/10 px-2.5 py-1 rounded-full border border-white/10 hover:bg-white/20 transition-colors mt-1">
                <Edit3 className="w-3 h-3" />
                Ubah Alamat
              </Link>
            </div>
          </div>
          
          <div className="flex flex-col space-y-3">
            <button
            onClick={() => router.push('/chat')} 
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-sm transition-colors border border-white/10">
              <Headphones className="w-5 h-5 text-fluent-accent" />
            </button>
            <button onClick={handleLogout} className="p-2 bg-rose-500/10 hover:bg-rose-500/20 rounded-full backdrop-blur-sm transition-colors border border-rose-500/20">
              <LogOut className="w-5 h-5 text-rose-400" />
            </button>
          </div>
        </div>
      </div>

      <main className="px-4 mt-6 space-y-6">

        {/* ================= [BARU] MENU STATUS VERIFIKASI KTP (DI ATAS TRANSAKSI) ================= */}
        {!profile.is_admin && (
          <section className="animate-in fade-in slide-in-from-bottom-3 duration-300">
            {/* Keadaan 1: Belum Verifikasi */}
            {profile.verification_status === 'unverified' && (
              <Link href="/verify">
                <div className="bg-gradient-to-r from-red-500/10 to-transparent border border-red-500/20 p-4 rounded-fluent-rounded flex items-center justify-between hover:bg-red-500/15 transition-colors group cursor-pointer shadow-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center text-red-400 group-hover:scale-105 transition-transform shadow-inner">
                      <AlertCircle className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h2 className="font-bold text-text-main text-sm">Verifikasi KTP Belum Lengkap</h2>
                      <p className="text-[11px] text-text-muted mt-0.5">Lengkapi KTP & Selfie untuk bisa menyewa alat</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                    <ChevronRight className="w-4 h-4 text-red-400" />
                  </div>
                </div>
              </Link>
            )}

            {/* Keadaan 2: Menunggu Verifikasi */}
            {profile.verification_status === 'pending' && (
              <div className="bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/20 p-4 rounded-fluent-rounded flex items-center justify-between shadow-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-400 shadow-inner">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="font-bold text-text-main text-sm">Verifikasi Sedang Diproses</h2>
                    <p className="text-[11px] text-text-muted mt-0.5">Mohon tunggu, admin sedang memeriksa berkas Anda</p>
                  </div>
                </div>
              </div>
            )}

            {/* Keadaan 3: Terverifikasi Sukses */}
            {profile.verification_status === 'verified' && (
              <div className="bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 p-4 rounded-fluent-rounded flex items-center justify-between shadow-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 shadow-inner">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="font-bold text-text-main text-sm">Akun Terverifikasi</h2>
                    <p className="text-[11px] text-text-muted mt-0.5">Identitas Anda valid. Selamat menyewa dengan aman!</p>
                  </div>
                </div>
              </div>
            )}

            {/* Keadaan 4: Verifikasi Ditolak */}
            {profile.verification_status === 'rejected' && (
              <Link href="/verify">
                <div className="bg-gradient-to-r from-rose-500/10 to-transparent border border-rose-500/20 p-4 rounded-fluent-rounded flex items-center justify-between hover:bg-rose-500/15 transition-colors group cursor-pointer shadow-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-rose-500/20 rounded-full flex items-center justify-center text-rose-400 shadow-inner">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="font-bold text-rose-400 text-sm">Verifikasi KTP Ditolak</h2>
                      <p className="text-[11px] text-text-muted mt-0.5">Klik di sini untuk mengirim ulang foto yang lebih jelas</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-rose-500/20 transition-colors">
                    <ChevronRight className="w-4 h-4 text-rose-400" />
                  </div>
                </div>
              </Link>
            )}
          </section>
        )}

        {/* ================= TOMBOL KHUSUS ADMIN ================= */}
        {profile.is_admin && (
          <section>
            <Link href="/admin">
              <div className="relative overflow-hidden bg-gradient-to-r from-fluent-accent/20 to-transparent border border-fluent-accent/30 p-4 rounded-fluent-rounded flex items-center justify-between hover:bg-fluent-accent/30 transition-colors shadow-[0_0_20px_rgba(163,116,255,0.15)] group">
                <div className="flex items-center space-x-4 relative z-10">
                  <div className="w-12 h-12 bg-fluent-accent/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <LayoutDashboard className="w-6 h-6 text-fluent-accent drop-shadow-[0_0_8px_rgba(163,116,255,0.8)]" />
                  </div>
                  <div>
                    <h2 className="font-bold text-text-main text-lg">Admin Workspace</h2>
                    <p className="text-xs text-text-muted mt-0.5">Kelola barang, pesanan, dan pengguna</p>
                  </div>
                </div>
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center relative z-10 group-hover:bg-fluent-accent transition-colors">
                  <ChevronRight className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-fluent-accent/20 rounded-full blur-2xl"></div>
              </div>
            </Link>
          </section>
        )}
        
        <section className="bg-fluent-card p-5 rounded-fluent-rounded border border-white/5 shadow-lg">
          <h2 className="font-bold text-text-main mb-4">Transaksi</h2>
          <div className="flex justify-between items-center px-2">
            <div className="flex flex-col items-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-fluent-accent/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-fluent-accent" />
              </div>
              <span className="text-[10px] text-text-muted">Bayar</span>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-fluent-accent/10 flex items-center justify-center">
                <Box className="w-5 h-5 text-fluent-accent" />
              </div>
              <span className="text-[10px] text-text-muted">Diproses</span>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-fluent-accent/10 flex items-center justify-center">
                <Truck className="w-5 h-5 text-fluent-accent" />
              </div>
              <span className="text-[10px] text-text-muted">Dikirim</span>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-fluent-accent/10 flex items-center justify-center relative">
                <CheckCircle2 className="w-5 h-5 text-fluent-accent" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border border-fluent-card"></span>
              </div>
              <span className="text-[10px] text-text-muted">Sudah Tiba</span>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-fluent-accent/10 flex items-center justify-center">
                <Star className="w-5 h-5 text-fluent-accent" />
              </div>
              <span className="text-[10px] text-text-muted">Ulasan</span>
            </div>
          </div>
        </section>

        <section className="bg-fluent-card p-5 rounded-fluent-rounded border border-white/5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shadow-inner">
                  <Banknote className="w-6 h-6 text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-text-muted mb-0.5">Saldo Aktif</p>
                  <h3 className="font-extrabold text-text-main text-2xl tracking-tight">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(profile.balance)}
                  </h3>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-1">
              <button onClick={handleTopup} className="flex-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-500/30 transition-colors shadow-sm">
                Isi Saldo
              </button>
              <button className="flex-1 bg-rose-500/20 text-rose-400 border border-rose-500/50 py-2.5 rounded-xl text-sm font-bold hover:bg-rose-500/30 transition-colors shadow-sm">
                Tarik Dana
              </button>
            </div>
          </div>
        </section>

        <section className="bg-fluent-card p-5 rounded-fluent-rounded border border-white/5 shadow-lg">
          <div className="grid grid-cols-5 gap-y-4">
            <div className="flex flex-col items-center space-y-2">
              <Store className="w-5 h-5 text-text-muted" />
              <span className="text-[10px] text-text-muted text-center leading-tight">Buka Sewa</span>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <Link2 className="w-5 h-5 text-text-muted" />
              <span className="text-[10px] text-text-muted text-center leading-tight">Affiliate</span>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <Ticket className="w-5 h-5 text-text-muted" />
              <span className="text-[10px] text-text-muted text-center leading-tight">Kupon Saya</span>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <Heart className="w-5 h-5 text-text-muted" />
              <span className="text-[10px] text-text-muted text-center leading-tight">Wishlist</span>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <MapPin className="w-5 h-5 text-text-muted" />
              <span className="text-[10px] text-text-muted text-center leading-tight">Tempat Favorit</span>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-1 h-5 bg-fluent-accent rounded-full"></div>
            <h2 className="font-bold text-text-main">Rekomendasi untuk anda</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {recommendations.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        </section>

      </main>

      {showTopupModal && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-5 bg-black/70 backdrop-blur-sm">
          <div className="bg-fluent-card border border-white/10 w-full max-w-[300px] rounded-[28px] p-6 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200 relative overflow-hidden">
            
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl"></div>

            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4 shadow-inner border border-emerald-500/30 relative z-10">
              <Banknote className="w-7 h-7 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            </div>

            <h3 className="text-lg font-bold text-text-main mb-1 relative z-10">Isi Saldo</h3>
            <p className="text-xs text-text-muted mb-6 relative z-10 leading-relaxed">
              Masukkan nominal uang yang ingin kamu tambahkan ke dompet.
            </p>

            <div className="w-full relative z-10 mb-6">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-main font-bold">Rp</span>
              <input
                type="text"
                value={topupAmount ? new Intl.NumberFormat('id-ID').format(Number(topupAmount)) : ''}
                onChange={(e) => {
                  const rawValue = e.target.value.replace(/\D/g, '');
                  setTopupAmount(rawValue);
                }}
                placeholder="500.000"
                className="w-full bg-[#1A0B2E] border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold text-text-main focus:outline-none focus:border-emerald-500/50 transition-colors placeholder:text-white/20"
              />
            </div>

            <div className="flex w-full gap-3 relative z-10">
              <button
                onClick={() => setShowTopupModal(false)}
                className="flex-1 py-3 rounded-2xl text-xs font-bold text-text-muted bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
              >
                Batal
              </button>
              <button
                disabled={isProcessingTopup || !topupAmount || Number(topupAmount) <= 0}
                onClick={submitTopup}
                className="flex-1 py-3 rounded-2xl text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-400 transition-colors shadow-[0_4px_20px_rgba(16,185,129,0.3)] disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isProcessingTopup ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
      
    </div>
  );
};

export default ProfilePage;