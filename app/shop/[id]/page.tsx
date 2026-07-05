"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, Store, MapPin, Box, 
  BadgeCheck, MessageCircle, ShoppingBag 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function PublicShopPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params; 

  const [shopProfile, setShopProfile] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 🌟 [BARU] State untuk mendeteksi siapa yang sedang buka aplikasi
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchShopData = async () => {
      try {
        setLoading(true);

        // 1. Cek siapa yang sedang login sekarang
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          setCurrentUserId(authData.user.id);
        }

        // 2. Tarik Data Profil Toko
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, verification_status, address, role')
          .eq('id', id)
          .single();

        if (profileError) throw profileError;
        setShopProfile(profileData);

        // 3. Tarik Semua Barang Toko
        const { data: itemsData, error: itemsError } = await supabase
          .from('items')
          .select('id, name, price_per_day, condition, image_urls, stock')
          .eq('owner_id', id)
          .order('created_at', { ascending: false });

        if (!itemsError && itemsData) {
          setProducts(itemsData);
        }

      } catch (error) {
        console.error("Gagal memuat data toko:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchShopData();
  }, [id]);

  if (loading) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center bg-[#F2FDFB] text-teal-600">
        <div className="animate-spin h-8 w-8 border-b-2 border-teal-500 rounded-full"></div>
      </div>
    );
  }

  if (!shopProfile) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#F2FDFB] text-slate-500 font-medium px-6 text-center">
        <Store className="w-12 h-12 text-slate-300 mb-2" />
        <p className="text-[13px]">Toko tidak ditemukan atau telah dinonaktifkan.</p>
        <button onClick={() => router.back()} className="mt-4 text-[12px] font-bold text-teal-600 bg-teal-50 px-5 py-2.5 rounded-full hover:bg-teal-100 transition-colors">Kembali</button>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#F2FDFB] text-slate-800 overflow-hidden relative font-sans">
      
      {/* ================= HEADER ATAS ================= */}
      <header className="w-full bg-white/95 backdrop-blur-md z-40 px-5 py-4 md:pt-12 pt-6 flex items-center border-b border-slate-100 shrink-0 shadow-sm">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-slate-50 transition-colors cursor-pointer text-slate-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[15px] font-bold ml-1.5 text-slate-800 tracking-wide">Profil Toko</h1>
      </header>

      {/* Area Scroll Konten */}
      <div className="flex-1 overflow-y-auto scrollbar-hide pb-28">
        
        {/* ================= KARTU UTAMA PROFIL TOKO ================= */}
        <div className="bg-white px-5 py-8 border-b border-slate-100 shadow-sm flex flex-col items-center text-center relative">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-teal-400 p-1 shadow-lg shadow-teal-500/20 mb-3.5 overflow-hidden flex items-center justify-center shrink-0">
            {shopProfile.avatar_url ? (
              <img src={shopProfile.avatar_url} alt={shopProfile.full_name} className="w-full h-full rounded-full object-cover border-2 border-white" />
            ) : (
              <div className="text-white text-[28px] font-black tracking-widest">{shopProfile.full_name?.charAt(0).toUpperCase()}</div>
            )}
          </div>

          <div className="flex items-center gap-1.5 justify-center mb-1">
            <h2 className="text-[18px] font-bold text-slate-800 tracking-tight leading-none">{shopProfile.full_name}</h2>
            
            {/* 🌟 CENTANG VERIFIKASI SAJA (Label teks dihapus agar lebih clean) */}
            {shopProfile.verification_status === 'verified' && (
              <span title="Verified Owner" className="flex items-center cursor-help relative group">
                <span className="absolute inset-0 bg-emerald-400 rounded-full blur-[4px] opacity-40 group-hover:opacity-70 group-hover:animate-pulse transition-all"></span>
                <BadgeCheck className="w-5 h-5 text-emerald-500 shrink-0 relative z-10 drop-shadow-sm transition-transform duration-300 group-hover:scale-110" />
              </span>
            )}
          </div>

          <div className="flex items-center justify-center text-slate-500 text-[12px] font-medium mt-3.5 gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="line-clamp-1">{shopProfile.address || "Kota Singkawang, Kalbar"}</span>
          </div>

          {/* Statistik Singkat Toko */}
          <div className="flex items-center gap-6 mt-5 bg-slate-50 border border-slate-100 rounded-2xl px-6 py-3 shadow-inner w-full max-w-[260px]">
            <div className="flex-1 text-center border-r border-slate-200 pr-3">
              <span className="block text-[16px] font-bold text-slate-800">{products.length}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Alat Alat</span>
            </div>
            <div className="flex-1 text-center">
              <span className="block text-[16px] font-bold text-slate-800 flex items-center justify-center gap-0.5">
                <span className="text-yellow-500 text-[15px] mb-[2px]">★</span>5.0
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Rating</span>
            </div>
          </div>
        </div>

        {/* ================= DAFTAR GRID PRODUK TOKO ================= */}
        <div className="p-5">
          <h3 className="text-[14px] font-bold text-slate-800 mb-4 uppercase tracking-wider flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-teal-500" />
            Semua Produk Alat ({products.length})
          </h3>

          {products.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-[24px] border border-slate-100 shadow-sm">
              <Box className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-[12px] font-medium text-slate-500">Toko ini belum mengunggah alat sewaan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3.5">
              {products.map((item) => (
                <Link href={`/product/${item.id}`} key={item.id} className="block h-full">
                  <div className="bg-white rounded-[20px] shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 h-full flex flex-col overflow-hidden group cursor-pointer">
                    
                    <div className="w-full aspect-square relative bg-slate-50 overflow-hidden shrink-0">
                      <img 
                        src={item.image_urls?.[0] || 'https://via.placeholder.com/150'} 
                        alt={item.name} 
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                      {item.stock === 0 && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                          <span className="bg-rose-500 text-white font-black text-[10px] px-3 py-1.5 rounded-full uppercase tracking-widest shadow-md">Kosong</span>
                        </div>
                      )}
                    </div>

                    <div className="p-3.5 flex flex-col flex-1">
                      <h4 className="text-[13px] font-semibold text-slate-800 line-clamp-2 min-h-[36px] leading-snug mb-1.5">
                        {item.name}
                      </h4>
                      <div className="mt-auto flex flex-col gap-1.5">
                        <p className="text-[14px] font-bold text-teal-600">
                          Rp {item.price_per_day?.toLocaleString('id-ID')}
                        </p>
                        <div className="flex items-center text-[10px] font-medium text-slate-500 gap-1.5 mt-0.5">
                          <div className="flex items-center gap-0.5">
                            <span className="text-yellow-500 text-[11px] mb-[1px]">★</span>
                            <span className="text-slate-600">5.0</span>
                          </div>
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          <span className="truncate">Kondisi: {item.condition}</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ================= BUTTON CHAT STICKY DI BAWAH ================= */}
      {/* 🌟 [BARU] LOGIKA CERDAS: Tombol hanya muncul jika yang melihat BUKAN pemilik toko itu sendiri */}
      {currentUserId !== shopProfile.id && (
        <div className="absolute bottom-6 inset-x-0 mx-auto px-5 w-full z-50 pointer-events-none">
          <button 
            onClick={() => {
              router.push(`/chat?targetId=${shopProfile.id}&targetName=${encodeURIComponent(shopProfile.full_name)}&targetAvatar=${encodeURIComponent(shopProfile.avatar_url || '')}`);
            }}
            className="w-full bg-slate-900 text-white font-black py-4 rounded-[20px] flex justify-center items-center gap-2.5 shadow-[0_10px_30px_rgba(15,23,42,0.3)] hover:bg-slate-800 transition-all pointer-events-auto active:scale-[0.98] cursor-pointer text-[13px] tracking-wide"
          >
            <MessageCircle className="w-5 h-5 text-teal-400" />
            Hubungi / Chat Toko
          </button>
        </div>
      )}

    </div>
  );
}