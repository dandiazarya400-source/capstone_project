"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  MessageCircle, Headphones, Wallet, Box, Truck, 
  CheckCircle2, Star, Banknote, Coins, Store, 
  Link2, Ticket, Heart, MapPin, BadgeCheck, LogOut, Edit3,
  LayoutDashboard, ChevronRight
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
// IMPORT SUPABASE
import { supabase } from '@/lib/supabase';

// --- Komponen Kartu Produk (Tetap sama) ---
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
    balance: 0, // <--- TAMBAH INI
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop'
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: authData } = await supabase.auth.getUser();
      
      if (!authData.user) {
        router.push('/login');
        return;
      }

      // Pakai .maybeSingle() agar tidak error meskipun datanya kosong/terkunci
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
          avatar_url: data.avatar_url || profile.avatar_url 
        });
      }
    };

    fetchProfile();
  }, [router]);

  // ================= FUNGSI LOGOUT =================
  const handleLogout = async () => {
    const confirmLogout = window.confirm("Apakah kamu yakin ingin keluar?");
    if (confirmLogout) {
      await supabase.auth.signOut();
      router.push('/login');
    }
  };

  // ================= FUNGSI SIMULASI TOP UP =================
  const handleTopup = async () => {
    const amountInput = window.prompt("Masukkan nominal saldo yang ingin diisi (Contoh: 500000):", "500000");
    if (!amountInput) return;

    const amount = Number(amountInput.replace(/\D/g, ''));
    if (amount <= 0) return;

    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const newBalance = profile.balance + amount;

      // 1. Update Saldo di tabel profiles
      await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', authData.user.id);

      // 2. Catat riwayat di tabel wallet_transactions
      await supabase
        .from('wallet_transactions')
        .insert([{
          user_id: authData.user.id,
          amount: amount,
          type: 'topup',
          status: 'Berhasil'
        }]);

      // 3. Update UI langsung tanpa refresh
      setProfile(prev => ({ ...prev, balance: newBalance }));
      alert(`Berhasil isi saldo sebesar Rp ${amount.toLocaleString('id-ID')}!`);

    } catch (error) {
      console.error("Gagal topup:", error);
      alert("Terjadi kesalahan sistem.");
    }
  };

  // Data Dummy untuk Rekomendasi
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
            {/* Foto Profil */}
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
              
              {/* Tombol ke halaman Edit Profil */}
              <Link href="/profile/edit" className="inline-flex items-center gap-1.5 text-[10px] text-white/80 bg-white/10 px-2.5 py-1 rounded-full border border-white/10 hover:bg-white/20 transition-colors">
                <Edit3 className="w-3 h-3" />
                Ubah Alamat
              </Link>
            </div>
          </div>
          
          {/* Tombol Logout & CS */}
          <div className="flex flex-col space-y-3">
            <button className="p-2 bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-sm transition-colors border border-white/10">
              <Headphones className="w-5 h-5 text-fluent-accent" />
            </button>
            <button onClick={handleLogout} className="p-2 bg-rose-500/10 hover:bg-rose-500/20 rounded-full backdrop-blur-sm transition-colors border border-rose-500/20">
              <LogOut className="w-5 h-5 text-rose-400" />
            </button>
          </div>
        </div>
      </div>

      <main className="px-4 mt-6 space-y-6">

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
                
                {/* Efek kilauan latar belakang */}
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-fluent-accent/20 rounded-full blur-2xl"></div>
              </div>
            </Link>
          </section>
        )}
        
        {/* ================= TRANSAKSI ================= */}
        <section className="bg-fluent-card p-5 rounded-fluent-rounded border border-white/5 shadow-lg">
          <h2 className="font-bold text-text-main mb-4">Transaksi</h2>
          {/* ... (Isi transaksi biarkan persis sama) ... */}
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

        {/* ... (Lanjutan kode Saldo, Menu Tambahan, dan Rekomendasi biarkan persis sama seperti yang kamu tulis) ... */}
        
        {/* ================= SALDO & POIN ================= */}
        <section className="bg-fluent-card p-5 rounded-fluent-rounded border border-white/5 shadow-lg flex justify-between items-center">
          <div className="flex-1 border-r border-white/10 pr-4">
            <div className="flex items-center space-x-2 mb-2">
              <Banknote className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]" />
              {/* UBAH ANGKA STATIS MENJADI DINAMIS */}
              <h3 className="font-extrabold text-text-main">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(profile.balance)}
              </h3>
            </div>
            <div className="flex space-x-2 mt-3">
              {/* TAMBAHKAN EVENT onClick DI SINI */}
              <button onClick={handleTopup} className="flex-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 py-1.5 rounded-full text-xs font-bold hover:bg-emerald-500/30 transition">
                Isi Saldo
              </button>
              <button className="flex-1 bg-rose-500/20 text-rose-400 border border-rose-500/50 py-1.5 rounded-full text-xs font-bold hover:bg-rose-500/30 transition">
                Tarik
              </button>
            </div>
          </div>
          
          <div className="flex-1 pl-4 flex flex-col items-center">
            <div className="flex items-center space-x-2 mb-2">
              <Coins className="w-5 h-5 text-fluent-accent drop-shadow-[0_0_5px_rgba(163,116,255,0.5)]" />
              <h3 className="font-extrabold text-text-main">1500 <span className="text-xs font-normal text-text-muted">Poin</span></h3>
            </div>
            <button className="w-full mt-3 bg-fluent-accent text-white py-1.5 rounded-full text-xs font-bold shadow-[0_2px_10px_rgba(163,116,255,0.4)] hover:bg-[#b58eff] transition">
              Tukar Poin
            </button>
          </div>
        </section>

        {/* ================= MENU TAMBAHAN ================= */}
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

        {/* ================= REKOMENDASI ================= */}
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

      <BottomNav />
      
    </div>
  );
};

export default ProfilePage;