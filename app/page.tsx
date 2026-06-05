"use client";
// @ts-nocheck
/* eslint-disable */

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { Search, Home, User, History, BadgeCheck, SlidersHorizontal, X, Check } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';


interface ProductProps {
  id: string;
  title: string;
  price: string;
  rawPrice: number;
  rating: string;
  sold: string;
  owner: string;
  image: string;
  is_verified: boolean;
  category_id: number; 
  condition: string;
}

const ProductCard: React.FC<ProductProps> = ({ id, title, price, rating, sold, owner, image, is_verified }) => (
  <Link href={`/product/${id}`} className="block h-full">
    <div className="bg-fluent-card rounded-fluent-rounded p-3 shadow-lg border border-fluent-accent/10 hover:scale-[1.02] transition-transform cursor-pointer h-full flex flex-col">
      {/* Gambar Persegi (Aspect Ratio 1:1) anti penyok */}
      <div className="w-full aspect-square overflow-hidden rounded-[14px] mb-3 relative bg-fluent-bg/50">
        <img src={image} alt={title} className="absolute inset-0 w-full h-full object-cover" />
      </div>
      <h3 className="text-sm font-medium text-text-main line-clamp-2 min-h-[40px] flex-1">{title}</h3>
      <p className="text-base font-bold text-text-main mt-1">{price}</p>
      <div className="flex items-center text-xs mt-1 space-x-1.5">
        <span className="text-fluent-accent font-semibold flex items-center">★ {rating}</span>
        <span className="text-text-muted">• {sold} Terpinjam</span>
      </div>
      <div className="flex items-center text-xs text-text-muted mt-2 space-x-1.5">
        {is_verified && <BadgeCheck className="w-4 h-4 text-fluent-accent shrink-0" />}
        <span className={`line-clamp-1 ${is_verified ? 'text-fluent-accent font-medium' : 'font-medium'}`}>{owner}</span>
      </div>
    </div>
  </Link>
);

const HomePage = () => {
  const [products, setProducts] = useState<ProductProps[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [isSearchFocused, setIsSearchFocused] = useState(false); 
  const [isFilterOpen, setIsFilterOpen] = useState(false); 
  
  const [sortBy, setSortBy] = useState('terbaru');
  const [filterCondition, setFilterCondition] = useState('Semua');
  const [priceMax, setPriceMax] = useState('');

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const categoryMap: { [key: string]: string } = {
    'Elektronik': '1',
    'Musik': '2',
    'Fashion': '3'
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        // "Sihir" Join: Ambil item, sekaligus ambil nama profil pemiliknya
        const { data, error } = await supabase
          .from('items')
          .select(`
            *,
            profiles!owner_id (full_name)
          `)
          .eq('is_available', true);

        if (error) throw error;
        
        if (data && data.length > 0) { // Pastikan ada barang dulu
          
          // 1. Kumpulkan semua ID barang yang ada di layar
          const itemIds = data.map(item => item.id);

          // 2. Tarik transaksi HANYA untuk barang-barang tersebut (.in)
          const { data: txData } = await supabase
            .from('transactions')
            .select('item_id')
            .in('item_id', itemIds);

            const mappedData = data.map((item: any) => {
            const borrowedCount = txData ? txData.filter(tx => tx.item_id === item.id).length : 0;

            return {
              id: item.id,
              title: item.name || "Tanpa Nama", 
              price: `Rp ${item.price_per_day?.toLocaleString('id-ID') || 0}`,
              rawPrice: item.price_per_day || 0,
              rating: "5.0", 
              sold: String(borrowedCount), 
              // Supabase mengembalikan data relasi dalam bentuk array jika tidak unik, 
              // atau object jika FK-nya tunggal. Kita jaga-jaga dengan fallback yang aman.
              owner: item.profiles?.full_name || "Pengguna", 
              image: item.image_urls && item.image_urls.length > 0 ? item.image_urls[0] : "https://via.placeholder.com/150",
              is_verified: true,
              category_id: item.category_id,
              condition: item.condition || "Baik"
            };
          });
          setProducts(mappedData);
        } else {
          setProducts([]); // Jika tidak ada barang sama sekali
        }
      } catch (err) {
        console.error('Gagal memuat barang:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  let filteredProducts = products.filter(product => {
    const matchSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase());
    const productCategoryIdStr = String(product.category_id);
    const matchCategory = activeCategory === 'Semua' || productCategoryIdStr === categoryMap[activeCategory];
    const matchCondition = filterCondition === 'Semua' || product.condition === filterCondition;
    const matchPrice = priceMax === '' || product.rawPrice <= parseInt(priceMax.replace(/\D/g, ''), 10);
    return matchSearch && matchCategory && matchCondition && matchPrice; 
  });

  if (sortBy === 'termurah') {
    filteredProducts.sort((a, b) => a.rawPrice - b.rawPrice);
  } else if (sortBy === 'termahal') {
    filteredProducts.sort((a, b) => b.rawPrice - a.rawPrice);
  }

  const handleResetFilter = () => {
    setSortBy('terbaru');
    setFilterCondition('Semua');
    setPriceMax('');
    setIsFilterOpen(false);
  };

  const handleWheelScroll = (e: React.WheelEvent) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-fluent-bg text-text-main overflow-hidden relative">
      
      {/* ================= MODAL FILTER (MURNI MOBILE BOTTOM SHEET) ================= */}
      {isFilterOpen && (
        <div className="absolute inset-0 z-[100] flex items-end justify-center overflow-hidden p-0">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsFilterOpen(false)}></div>
          
          <div className="relative w-full bg-fluent-card rounded-t-3xl pt-3 pb-8 px-5 shadow-2xl border-t border-white/10 animate-in slide-in-from-bottom-full duration-300 max-h-[85vh] overflow-y-auto scrollbar-hide">
            
            {/* Garis Pegangan (Handle Bar) */}
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-5"></div>
            
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-fluent-accent" />
                Filter Pencarian
              </h2>
              <button onClick={() => setIsFilterOpen(false)} className="p-2 bg-fluent-accent/5 rounded-full text-text-muted hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-6">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 block">Urutkan</label>
              <div className="flex flex-wrap gap-2">
                {['terbaru', 'termurah', 'termahal'].map((sortType) => (
                  <button key={sortType} onClick={() => setSortBy(sortType)} className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${sortBy === sortType ? 'bg-fluent-accent/20 text-fluent-accent border border-fluent-accent/50' : 'bg-fluent-accent/5 text-text-muted border border-transparent hover:bg-white/10'}`}>
                    {sortType}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 block">Maksimal Harga</label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-sm font-bold text-fluent-accent">Rp</span>
                <input type="number" placeholder="Tanpa batas" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} className="w-full bg-fluent-bg border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-fluent-accent transition-all" />
              </div>
            </div>

            <div className="mb-8">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 block">Kondisi Alat</label>
              <div className="grid grid-cols-2 gap-2">
                {['Semua', 'Sangat Baik', 'Baik', 'Cukup'].map((kondisi) => (
                  <button key={kondisi} onClick={() => setFilterCondition(kondisi)} className={`px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all flex justify-between items-center ${filterCondition === kondisi ? 'bg-fluent-accent text-white shadow-lg border-fluent-accent' : 'bg-fluent-accent/5 text-text-muted border border-transparent hover:bg-white/10'}`}>
                    {kondisi}
                    {filterCondition === kondisi && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleResetFilter} className="flex-1 py-3.5 rounded-xl font-bold text-text-muted bg-fluent-accent/5 hover:bg-white/10 transition-colors">Reset</button>
              <button onClick={() => setIsFilterOpen(false)} className="flex-[2] py-3.5 rounded-xl font-bold text-white bg-fluent-accent hover:bg-[#b58eff] shadow-[0_4px_20px_rgba(163,116,255,0.4)] transition-colors">Terapkan</button>
            </div>

          </div>
        </div>
      )}

      {/* BLOK ATAS */}
      <div className="w-full relative z-40 bg-fluent-bg/95 backdrop-blur-md shrink-0">
        
        <header className="w-full px-4 pt-10">
          <div className="flex items-center space-x-3">
            <div className="flex-1 relative">
              <div className={`relative rounded-full p-[1.5px] overflow-hidden transition-shadow duration-500 ${isSearchFocused ? 'shadow-[0_0_15px_rgba(163,116,255,0.2)]' : 'shadow-inner'}`}>
                
                {/* Animasi Satu Garis yang Diperbaiki (Lebih Lebar dan Tipis) */}
                {isSearchFocused && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300%] aspect-square animate-[spin_3.5s_linear_infinite] bg-[conic-gradient(transparent_345deg,#A374FF_360deg)]"></div>
                )}
                
                <div className="relative bg-fluent-card text-fluent-accent rounded-full p-3 flex items-center z-10 w-full h-full">
                  <Search className="w-5 h-5 mr-2 shrink-0" />
                  <input type="text" placeholder="Mau cari barang apa?" className="w-full text-text-main focus:outline-none placeholder:text-text-muted bg-transparent text-sm" onChange={(e) => setSearchQuery(e.target.value)} onFocus={() => setIsSearchFocused(true)} onBlur={() => setIsSearchFocused(false)} />
                </div>
              </div>
            </div>
            <button type="button" onClick={() => setIsFilterOpen(true)} className="bg-fluent-card p-3 rounded-full text-text-muted hover:text-fluent-accent hover:bg-fluent-accent/5 border border-fluent-accent/10 shadow-lg transition-colors shrink-0 relative">
              <SlidersHorizontal className="w-5 h-5" />
              {(sortBy !== 'terbaru' || filterCondition !== 'Semua' || priceMax !== '') && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-fluent-accent rounded-full border border-fluent-bg"></span>
              )}
            </button>
          </div>
        </header>

        {/* ================= FILTER ADAPTIF & KATEGORI CEPAT ================= */}
        <section 
          ref={scrollContainerRef}
          onWheel={handleWheelScroll} 
          className="w-full px-4 pt-5 pb-4 flex items-center space-x-2.5 overflow-x-auto scrollbar-hide"
        >
          {priceMax && (
            <button onClick={() => setPriceMax('')} className="flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-bold bg-fluent-accent text-white shadow-lg flex items-center gap-1.5 transition-all border border-fluent-accent animate-in zoom-in duration-200">
              Maks Rp {new Intl.NumberFormat('id-ID').format(Number(priceMax))}
              <X className="w-3.5 h-3.5 opacity-80" />
            </button>
          )}

          {filterCondition !== 'Semua' && (
            <button onClick={() => setFilterCondition('Semua')} className="flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-bold bg-fluent-accent text-white shadow-lg flex items-center gap-1.5 transition-all border border-fluent-accent animate-in zoom-in duration-200">
              Kondisi: {filterCondition}
              <X className="w-3.5 h-3.5 opacity-80" />
            </button>
          )}

          {['Semua', 'Elektronik', 'Musik', 'Fashion'].map((kat) => (
            <button
              key={kat}
              type="button"
              onClick={() => setActiveCategory(kat)} 
              className={`flex-shrink-0 px-5 py-2 rounded-full text-[13px] font-medium transition-all duration-300 cursor-pointer border ${
                activeCategory === kat
                  ? 'bg-fluent-accent text-white shadow-[0_4px_15px_rgba(163,116,255,0.4)] border-fluent-accent' 
                  : 'bg-fluent-card text-text-muted border-fluent-accent/10 hover:bg-fluent-accent/10 hover:text-fluent-accent' 
              }`}
            >
              {kat}
            </button>
          ))}
        </section>
      </div>

      {/* BLOK BAWAH (Grid Terkunci 2 Kolom untuk Mobile) */}
      <main className="flex-1 overflow-y-auto px-4 pb-24 scrollbar-hide pt-2 w-full">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin h-6 w-6 border-b-2 border-fluent-accent rounded-full"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-muted animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-fluent-accent/5 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 opacity-50" />
            </div>
            <p className="text-sm font-bold text-text-main">Barang tidak ditemukan</p>
            <p className="text-xs mt-1 text-center max-w-[200px]">Coba ubah kata kunci atau sesuaikan filter pencarianmu.</p>
            {(sortBy !== 'terbaru' || filterCondition !== 'Semua' || priceMax !== '') && (
               <button onClick={handleResetFilter} className="mt-4 px-4 py-2 bg-fluent-accent/20 text-fluent-accent text-xs font-bold rounded-full transition-colors hover:bg-fluent-accent/30">
                 Reset Filter
               </button>
            )}
          </div>
        ) : (
          <section className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </section>
        )}
      </main>

      <BottomNav />
      
    </div>
  );
};

export default HomePage;