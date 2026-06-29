"use client";

import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { 
  Search, Bell, MapPin, BadgeCheck, Clock, Gift,
  MonitorPlay, Music, Shirt, Grid, Loader2,
  ChevronRight, Sparkles, SlidersHorizontal, X, Check,
  Camera, Truck 
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import { useUserStore } from '@/store/useUserStore';


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
    <div className="bg-white rounded-[20px] shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full flex flex-col overflow-hidden group">
      
      <div className="w-full aspect-square relative bg-slate-50 overflow-hidden shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={image} 
          alt={title} 
          loading="lazy" 
          decoding="async" 
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
        />
      </div>
      
      <div className="p-3.5 flex flex-col flex-1">
        <h3 className="text-[13px] font-semibold text-slate-800 line-clamp-2 min-h-[36px] leading-snug mb-1.5">{title}</h3>
        
        <div className="mt-auto flex flex-col gap-1.5">
          <div className="flex items-baseline gap-1">
            <p className="text-[14px] font-bold text-teal-600">{price}</p>
            <span className="text-[9px] font-medium text-slate-400">/hari</span>
          </div>
          
          <div className="flex items-center text-[10px] font-medium text-slate-500 gap-1.5">
            <div className="flex items-center gap-0.5">
              <span className="text-yellow-400 text-[11px] mb-[1px]">★</span>
              <span className="text-slate-600">{rating}</span>
            </div>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span>{sold} disewa</span>
          </div>
          
          <div className="w-full h-px bg-slate-50 my-1"></div>
          
          <div className="flex items-center text-[10px] text-slate-500 space-x-1.5">
            {is_verified ? (
              <BadgeCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            ) : (
              <div className="w-3.5 h-3.5 rounded-full bg-slate-200 shrink-0"></div>
            )}
            <span className={`line-clamp-1 ${is_verified ? 'text-slate-700 font-semibold' : 'font-medium'}`}>{owner}</span>
          </div>
        </div>
      </div>
      
    </div>
  </Link>
);

// 🌟 SUB-KOMPONEN HITUNG MUNDUR KHUSUS BERANDA
const HomeCountdown = ({ expiresAt }: { expiresAt: string }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!expiresAt) return;
    const calculate = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('BERAKHIR'); return; }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!timeLeft) return null;

  // 🌟 DESAIN TIMER MELAYANG DI POJOK KANAN ATAS
  return (
    <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/20 shadow-lg">
      <Clock className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
      <span className="text-[11px] font-mono font-black text-white tracking-widest drop-shadow-md">{timeLeft}</span>
    </div>
  );
};


const HomePage = () => {
  // =====================================================================
  // 🌟 JURUS SINKRONISASI PROFIL (INI YANG KEMARIN KETINGGALAN!)
  // 1. Tarik data profil dari global state
  const { profile } = useUserStore();

  // 2. Buat logika pengambil inisial huruf (jika user belum punya foto)
  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.trim().charAt(0).toUpperCase();
  };
  const userInitials = getInitials(profile?.full_name || '');
  // =====================================================================


  // 🌟 JURUS 1: Ambil data produk & jumlah dari memori
  const [products, setProducts] = useState<ProductProps[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('homeProductsCache');
      if (cached) return JSON.parse(cached);
    }
    return [];
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // 🌟 Hanya loading jika data memori kosong
  const [loading, setLoading] = useState(() => products.length === 0);
  
  const [visibleCount, setVisibleCount] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(sessionStorage.getItem('homeVisibleCount') || '10', 10);
    }
    return 10;
  });

  // 🌟 JURUS 2: "Jubah Transparan" 
  // Jika ada scroll yang harus di-restore, buat layar transparan (sembunyi) dulu sedetik!
  const [isReady, setIsReady] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(sessionStorage.getItem('homeScrollPosition') || '0', 10) === 0;
    }
    return true;
  });

  // 🌟 (Hanya 1 blok F5 Refresh)
  useEffect(() => {
    const handleRefresh = () => {
      sessionStorage.removeItem('homeScrollPosition');
      sessionStorage.removeItem('homeVisibleCount');
      sessionStorage.removeItem('homeProductsCache');
    };
    window.addEventListener('beforeunload', handleRefresh);
    return () => window.removeEventListener('beforeunload', handleRefresh);
  }, []);

  const [activeCategory, setActiveCategory] = useState('Semua');
  const [isFilterOpen, setIsFilterOpen] = useState(false); 
  
  const [sortBy, setSortBy] = useState('terbaru');
  const [filterCondition, setFilterCondition] = useState('Semua');
  const [priceMax, setPriceMax] = useState('');
  const [priceMin, setPriceMin] = useState('');

  const promoRef = useRef<HTMLDivElement>(null);
  const [activePromo, setActivePromo] = useState(0);
  const mainScrollRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const isSearching = debouncedSearch.trim().length > 0;
  const isFilterActive = sortBy !== 'terbaru' || filterCondition !== 'Semua' || priceMin !== '' || priceMax !== '';

  const formatRupiah = (value: string) => {
    let numberString = value.replace(/[^,\d]/g, '').toString();
    if (numberString && parseInt(numberString, 10) > 100000000) {
      numberString = '100000000';
    }
    const split = numberString.split(',');
    const sisa = split[0].length % 3;
    let rupiah = split[0].substr(0, sisa);
    const ribuan = split[0].substr(sisa).match(/\d{3}/gi);
    if (ribuan) {
      const separator = sisa ? '.' : '';
      rupiah += separator + ribuan.join('.');
    }
    return rupiah ? rupiah : '';
  };

  // 🌟 JURUS DETEKSI IKON OTOMATIS UNTUK KATEGORI BARU
  const getCategoryStyle = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('elektronik')) return { icon: MonitorPlay, color: 'text-blue-500', bg: 'bg-blue-50' };
    if (lowerName.includes('musik')) return { icon: Music, color: 'text-purple-500', bg: 'bg-purple-50' };
    if (lowerName.includes('fashion') || lowerName.includes('pakaian')) return { icon: Shirt, color: 'text-pink-500', bg: 'bg-pink-50' };
    if (lowerName.includes('kamera')) return { icon: Camera, color: 'text-orange-500', bg: 'bg-orange-50' };
    
    // Default jika Superadmin membuat kategori baru yang aneh-aneh
    return { icon: Grid, color: 'text-teal-500', bg: 'bg-teal-50' };
  };

  // 🌟 STATE BARU UNTUK MENAMPUNG KATEGORI DARI SUPABASE
  const [dbCategories, setDbCategories] = useState<any[]>([]);

  const [promos, setPromos] = useState<any[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (promoRef.current) {
        const container = promoRef.current;
        const isAtEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 10;
        if (isAtEnd) container.scrollTo({ left: 0, behavior: 'smooth' });
        else container.scrollBy({ left: container.clientWidth, behavior: 'smooth' });
      }
    }, 10000); 
    return () => clearInterval(timer); 
  }, [activePromo]);

  const handlePromoScroll = () => {
    if (promoRef.current) {
      const scrollLeft = promoRef.current.scrollLeft;
      const width = promoRef.current.offsetWidth;
      setActivePromo(Math.round(scrollLeft / width));
    }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        if (products.length === 0) {
          setLoading(true);
        }

        // 🌟 TARIKAN DATA SUPER PARALEL
        const [itemsResponse, categoriesResponse, promosResponse] = await Promise.all([
          supabase.from('items').select(`*, profiles!owner_id (full_name)`).eq('is_available', true),
          supabase.from('categories').select('id, name'),
          // Tarik semua promo yang is_active = true
          supabase.from('promos').select('*').eq('is_active', true).order('created_at', { ascending: true }) 
        ]);

        if (categoriesResponse.data) setDbCategories(categoriesResponse.data);
        
        // 🌟 FILTER BERLAPIS (ANTI-KEDALUWARSA): Cek langsung dari waktu HP Pengguna!
        if (promosResponse.data) {
          const currentTimeMs = Date.now(); // Ambil waktu mili-detik saat ini di HP user
          
          const validPromos = promosResponse.data.filter(promo => {
            // Jika tidak ada batas waktu, tampilkan!
            if (!promo.expires_at) return true; 
            
            // Jika ada batas waktu, pastikan waktu kedaluwarsa LEBIH BESAR dari waktu sekarang
            const expiryTimeMs = new Date(promo.expires_at).getTime();
            return expiryTimeMs > currentTimeMs;
          });
          
          setPromos(validPromos); // Hanya simpan promo yang masih hidup!
        }

        if (itemsResponse.error) throw itemsResponse.error;
        
        if (itemsResponse.data && itemsResponse.data.length > 0) {
          const itemIds = itemsResponse.data.map(item => item.id);
          const { data: txData } = await supabase
            .from('transactions')
            .select('item_id')
            .in('item_id', itemIds);

          const mappedData = itemsResponse.data.map((item: any) => {
            const borrowedCount = txData ? txData.filter(tx => tx.item_id === item.id).length : 0;
            return {
              id: item.id,
              title: item.name || "Alat Sewa", 
              price: `Rp ${item.price_per_day?.toLocaleString('id-ID') || 0}`,
              rawPrice: item.price_per_day || 0,
              rating: "5.0", 
              sold: String(borrowedCount), 
              owner: item.profiles?.full_name || "Mitra Penyewa", 
              image: item.image_urls && item.image_urls.length > 0 ? item.image_urls[0] : "https://via.placeholder.com/150",
              is_verified: true,
              category_id: item.category_id,
              condition: item.condition || "Baik"
            };
          });
          
          setProducts(mappedData);
          sessionStorage.setItem('homeProductsCache', JSON.stringify(mappedData));
        } else {
          setProducts([]);
        }
      } catch (err) {
        console.error('Gagal memuat barang:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🌟 JURUS 4: Teleportasi Sempurna di balik layar transparan!
  useLayoutEffect(() => {
    if (!isReady && products.length > 0 && !loading) {
      const savedScroll = parseInt(sessionStorage.getItem('homeScrollPosition') || '0', 10);
      if (savedScroll > 0 && mainScrollRef.current) {
        mainScrollRef.current.scrollTop = savedScroll;
      }
      
      // Buka "Jubah Transparan" setelah scroll selesai dipasang secara diam-diam!
      requestAnimationFrame(() => {
        setIsReady(true);
      });
    }
  }, [isReady, products.length, loading]);

  const prevFilters = useRef({ debouncedSearch, activeCategory, sortBy, filterCondition, priceMin, priceMax });

  useEffect(() => {
    const isFilterChanged = 
      debouncedSearch !== prevFilters.current.debouncedSearch ||
      activeCategory !== prevFilters.current.activeCategory ||
      sortBy !== prevFilters.current.sortBy ||
      filterCondition !== prevFilters.current.filterCondition ||
      priceMin !== prevFilters.current.priceMin ||
      priceMax !== prevFilters.current.priceMax;

    if (isFilterChanged) {
      setVisibleCount(10);
      sessionStorage.removeItem('homeScrollPosition'); 
      sessionStorage.removeItem('homeVisibleCount'); 
      mainScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
      
      prevFilters.current = { debouncedSearch, activeCategory, sortBy, filterCondition, priceMin, priceMax };
    }
  }, [debouncedSearch, activeCategory, sortBy, filterCondition, priceMin, priceMax]);

  let filteredProducts = products.filter(product => {
    const matchSearch = product.title.toLowerCase().includes(debouncedSearch.toLowerCase());
    
    // 🌟 PERBAIKAN LOGIKA: COCOKKAN NAMA KATEGORI KE ID DI DATABASE
    const targetCategoryObj = dbCategories.find(c => c.name === activeCategory);
    const matchCategory = activeCategory === 'Semua' || String(product.category_id) === String(targetCategoryObj?.id);
    
    const matchCondition = filterCondition === 'Semua' || product.condition === filterCondition;
    
    const minVal = priceMin === '' ? 0 : parseInt(priceMin.replace(/\D/g, ''), 10);
    const maxVal = priceMax === '' ? Infinity : parseInt(priceMax.replace(/\D/g, ''), 10);
    const matchPrice = product.rawPrice >= minVal && product.rawPrice <= maxVal;
    
    return matchSearch && matchCategory && matchCondition && matchPrice; 
  });

  if (sortBy === 'termurah') {
    filteredProducts.sort((a, b) => a.rawPrice - b.rawPrice);
  } else if (sortBy === 'termahal') {
    filteredProducts.sort((a, b) => b.rawPrice - a.rawPrice);
  }

  const handleMainScroll = (e: React.UIEvent<HTMLElement>) => {
    const target = e.currentTarget;
    sessionStorage.setItem('homeScrollPosition', target.scrollTop.toString());
    sessionStorage.setItem('homeVisibleCount', visibleCount.toString());

    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 150) {
      if (visibleCount < filteredProducts.length) {
        setVisibleCount(prev => prev + 10); 
      }
    }
  };

  const displayedProducts = filteredProducts.slice(0, visibleCount);

  const handleResetFilter = () => {
    setSortBy('terbaru');
    setFilterCondition('Semua');
    setPriceMin(''); 
    setPriceMax(''); 
    setActiveCategory('Semua');
    setIsFilterOpen(false);
  };

  return (
    // 🌟 JURUS 5: Jika layar belum siap ditarik (isReady=false), buat layar transparan (opacity-0)!
    <div className={`h-[100dvh] w-full flex flex-col bg-[#F2FDFB] text-slate-800 overflow-hidden relative transition-opacity duration-0 ${!isReady ? 'opacity-0' : 'opacity-100'}`}>
      
      {/* MODAL FILTER */}
      {isFilterOpen && (
        <div className="absolute inset-0 z-[100] flex items-end justify-center overflow-hidden p-0">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsFilterOpen(false)}></div>
          <div className="relative w-full bg-white rounded-t-3xl pt-3 pb-8 px-5 shadow-2xl border-t border-slate-100 animate-in slide-in-from-bottom-full duration-300 max-h-[85vh] overflow-y-auto scrollbar-hide">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-5"></div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-teal-600" /> Filter Pencarian
              </h2>
              <button onClick={() => setIsFilterOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-slate-800 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="mb-6">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Kategori</label>
              <div className="flex flex-wrap gap-2">
                {/* 🌟 TOMBOL SEBAGAI KUNCI UTAMA "SEMUA" */}
                <button 
                  onClick={() => setActiveCategory('Semua')} 
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeCategory === 'Semua' ? 'bg-teal-50 text-teal-600 border border-teal-200' : 'bg-slate-50 text-slate-600 border border-transparent hover:bg-slate-100'}`}
                >
                  Semua
                </button>

                {/* 🌟 MERENDER KATEGORI SECARA OTOMATIS DARI SUPABASE */}
                {dbCategories.map((kat) => (
                  <button 
                    key={kat.id} 
                    onClick={() => setActiveCategory(kat.name)} 
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeCategory === kat.name ? 'bg-teal-50 text-teal-600 border border-teal-200' : 'bg-slate-50 text-slate-600 border border-transparent hover:bg-slate-100'}`}
                  >
                    {kat.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Urutkan</label>
              <div className="flex flex-wrap gap-2">
                {['terbaru', 'termurah', 'termahal'].map((sortType) => (
                  <button key={sortType} onClick={() => setSortBy(sortType)} className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${sortBy === sortType ? 'bg-teal-50 text-teal-600 border border-teal-200' : 'bg-slate-50 text-slate-600 border border-transparent hover:bg-slate-100'}`}>
                    {sortType}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Rentang Harga</label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1 flex items-center">
                  <span className="absolute left-3 text-sm font-bold text-slate-400">Rp</span>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    placeholder="Min" 
                    value={priceMin} 
                    onChange={(e) => setPriceMin(formatRupiah(e.target.value))} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-9 pr-3 text-sm focus:outline-none focus:border-teal-400 focus:bg-white transition-all text-slate-800" 
                  />
                </div>
                <span className="text-slate-400 font-bold">-</span>
                <div className="relative flex-1 flex items-center">
                  <span className="absolute left-3 text-sm font-bold text-slate-400">Rp</span>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    placeholder="Max" 
                    value={priceMax} 
                    onChange={(e) => setPriceMax(formatRupiah(e.target.value))} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-9 pr-3 text-sm focus:outline-none focus:border-teal-400 focus:bg-white transition-all text-slate-800" 
                  />
                </div>
              </div>
            </div>

            <div className="mb-8">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Kondisi Alat</label>
              <div className="grid grid-cols-2 gap-2">
                {['Semua', 'Sangat Baik', 'Baik', 'Cukup'].map((kondisi) => (
                  <button key={kondisi} onClick={() => setFilterCondition(kondisi)} className={`px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all flex justify-between items-center ${filterCondition === kondisi ? 'bg-teal-500 text-white shadow-md border-teal-600' : 'bg-slate-50 text-slate-600 border border-transparent hover:bg-slate-100'}`}>
                    {kondisi}
                    {filterCondition === kondisi && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleResetFilter} className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Reset</button>
              <button onClick={() => setIsFilterOpen(false)} className="flex-[2] py-3.5 rounded-xl font-bold text-white bg-teal-500 hover:bg-teal-600 shadow-lg shadow-teal-500/30 transition-colors">Terapkan</button>
            </div>
          </div>
        </div>
      )}

      <main 
        ref={mainScrollRef} 
        onScroll={handleMainScroll}
        className="flex-1 overflow-y-auto scrollbar-hide pb-24 w-full"
      >
        
        <div className="w-full bg-gradient-to-br from-[#00C6B5] to-[#0092D0] rounded-b-[40px] pt-12 pb-20 px-6 relative overflow-hidden shadow-lg shadow-teal-500/20 shrink-0">
          <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-20px] left-[-20px] w-32 h-32 bg-cyan-300/20 rounded-full blur-2xl"></div>

          <div className="flex justify-between items-center relative z-10">
            <div>
              <p className="text-white/80 text-xs font-medium mb-1">Lokasi Anda</p>
              <div className="flex items-center text-white font-bold text-sm cursor-pointer group">
                <div className="relative mr-1.5 flex items-center justify-center">
                  <span className="absolute w-4 h-4 bg-yellow-400/50 rounded-full animate-ping"></span>
                  <MapPin className="w-4 h-4 text-yellow-300 relative z-10 group-hover:-translate-y-1 transition-transform duration-300" />
                </div>
                Singkawang, ID
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Link href="/notifications">
                <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white relative border border-white/20 hover:bg-white/30 transition-colors cursor-pointer">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
                </button>
              </Link>
              
              {/* 🌟 WADAH AVATAR DINAMIS (VERSI FIX - ANTI MOGOK) */}
              <Link href="/profile">
                <div className="w-10 h-10 rounded-full shadow-md hover:scale-105 transition-transform cursor-pointer border-[2px] border-white overflow-hidden bg-teal-600 relative flex items-center justify-center group">
                  
                  {/* 1. Jika state profile dari Zustand benar-benar belum siap sama sekali */}
                  {profile === undefined ? (
                    <Loader2 className="w-4 h-4 text-white/70 animate-spin" />
                  ) : profile?.avatar_url && profile.avatar_url.startsWith('http') ? (
                    <>
                      {/* 2. Latar belakang warna teal yang berdenyut selama browser mengunduh gambar */}
                      <div className="absolute inset-0 bg-teal-500/30 animate-pulse"></div>
                      
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={profile.avatar_url} 
                        alt="Profile" 
                        // 🌟 Kita buang opacity-0 gaibnya agar gambar langsung tampil begitu sukses diunduh
                        className="w-full h-full object-cover relative z-10" 
                      />
                    </>
                  ) : (
                    // 3. Jika user tidak punya foto profil, tampilkan inisial huruf nama mereka
                    <span className="text-white font-bold text-[14px] relative z-10">
                      {userInitials || 'U'}
                    </span>
                  )}
                  
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* =============================================================== */}
        {/* ⚡ UPGRADE SEARCH BAR PREMIUM & MICRO-TAGS PENCARIAN POPULER ⚡ */}
        {/* =============================================================== */}
        <div className="px-5 -mt-8 relative z-20 space-y-3.5">
          
          {/* CONTAINER UTAMA SEARCH & FILTER */}
          <div className="flex gap-2.5">
            
            {/* KOTAK INPUT (Dengan efek transisi border dan focus glow) */}
            <div className="flex-1 bg-white rounded-2xl p-1.5 border border-slate-100 shadow-[0_10px_30px_rgba(0,198,181,0.08)] focus-within:border-teal-400 focus-within:shadow-[0_10px_30px_rgba(20,184,166,0.15)] flex items-center relative transition-all duration-300">
              
              <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center shrink-0">
                <Search className="w-4.5 h-4.5 text-teal-600" />
              </div>
              
              <input 
                id="search-input"
                type="text" 
                placeholder="Cari alat studio, kamera, sound..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent px-3 py-2 text-[13px] font-bold text-slate-700 focus:outline-none placeholder:text-slate-400 placeholder:font-medium pr-10" 
              />
              
              {isSearching && (
                <button 
                  onClick={() => setSearchQuery('')} 
                  className="absolute right-3 p-1.5 bg-slate-100 rounded-full text-slate-400 hover:bg-rose-100 hover:text-rose-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* TOMBOL FILTER */}
            <button 
              onClick={() => setIsFilterOpen(true)} 
              className="w-[54px] h-[54px] bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,198,181,0.08)] hover:shadow-[0_10px_30px_rgba(20,184,166,0.15)] flex items-center justify-center border border-slate-100 shrink-0 relative hover:bg-slate-50 active:scale-95 transition-all group"
            >
              <SlidersHorizontal className="w-4.5 h-4.5 text-teal-600 group-hover:rotate-90 transition-transform duration-300" />
              {(sortBy !== 'terbaru' || filterCondition !== 'Semua' || priceMax !== '') && (
                <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
              )}
            </button>
          </div>

          {/* 🌟 FITUR TAMBAHAN: PILLS PENCARIAN (Polos & Elegan) */}
          {!isSearching && (
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 animate-in fade-in duration-500">
              {/* Teks "Pencarian Teratas:" dihapus, Emoji dihapus, Font disesuaikan proporsional */}
              {[
                { label: 'Sony Alpha', query: 'Sony' },
                { label: 'Proyektor', query: 'Epson' },
                { label: 'Speaker JBL', query: 'JBL' },
                { label: 'Wireless Mic', query: 'Mic' }
              ].map((tag, i) => (
                <button
                  key={i}
                  onClick={() => setSearchQuery(tag.query)}
                  className="px-4 py-1.5 bg-white border border-slate-100 hover:border-teal-200 hover:bg-teal-50 text-[12px] font-semibold text-slate-600 hover:text-teal-600 rounded-full shadow-sm active:scale-95 transition-all shrink-0"
                >
                  {tag.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ================= BANNER PROMO ================= */}
        {(!isSearching && activeCategory === 'Semua' && !isFilterActive && promos.length > 0) && (
          <div className="mt-5 relative w-full shrink-0 animate-in fade-in duration-500"> 
            <div ref={promoRef} onScroll={handlePromoScroll} className="flex w-full overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2">
              {promos.map((promo) => {
                const IconMap: { [key: string]: React.ComponentType<any> } = { Sparkles, Camera, Truck, Grid, Gift, MonitorPlay, Music, Shirt };
                const PromoIcon = IconMap[promo.icon] || Sparkles; 
                return (
                  <div key={promo.id} className="w-full shrink-0 snap-center px-5">
                    <div className={`w-full bg-gradient-to-r ${promo.bg} rounded-[24px] p-6 text-white relative overflow-hidden shadow-lg shadow-teal-500/10`}>
                      
                      {/* Efek Kilau */}
                      <style>{`@keyframes hShimmer { 100% { transform: translateX(100%); } } .home-shimmer { animation: hShimmer 2.5s infinite; }`}</style>
                      {promo.has_shimmer && (
                        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent home-shimmer pointer-events-none z-0" />
                      )}

                      {/* 🌟 INI DIA! PEMANGGILAN TIMER DI POJOK KANAN ATAS */}
                      {promo.expires_at && (
                        <HomeCountdown expiresAt={promo.expires_at} />
                      )}

                      <div className="absolute right-0 top-0 w-32 h-32 bg-white/20 rounded-full blur-2xl translate-x-10 -translate-y-10"></div>
                      <div className="relative z-10 w-[70%]">
                        <span className="inline-block px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[10px] font-black tracking-wider uppercase mb-2">{promo.tag}</span>
                        <h2 className="text-lg font-black leading-tight mb-3 drop-shadow-sm">{promo.title}</h2>
                        <button className="bg-white text-slate-800 text-[11px] font-bold px-4 py-2 rounded-full shadow-md hover:scale-105 transition-transform">{promo.btn}</button>
                      </div>
                      <PromoIcon className="absolute bottom-4 right-4 w-16 h-16 text-white/30 z-0" strokeWidth={1} />
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Indikator Titik Carousel */}
            <div className="flex justify-center gap-1.5 mt-2">
              {promos.map((_, idx) => (
                <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${activePromo === idx ? 'w-5 bg-teal-500' : 'w-1.5 bg-slate-300'}`} />
              ))}
            </div>
          </div>
        )}


        {/* ================= REKOMENDASI / HASIL PENCARIAN ================= */}
        {/* 🌟 GAP DIRAPATKAN MENJADI mt-6 (atau mt-8 jika dari atas) */}
        <div className={`px-5 ${(!isSearching && promos.length > 0) ? 'mt-6' : 'mt-8'} shrink-0`}>
          {!isSearching && (
            <div className="flex justify-between items-end mb-4">
              <h3 className="text-[16px] font-bold text-slate-700">
                {activeCategory !== 'Semua' 
                  ? `Kategori: ${activeCategory}` 
                  : isFilterActive 
                    ? 'Hasil Filter' 
                    : 'Rekomendasi untuk Anda'}
              </h3>
              
              {(isFilterActive || activeCategory !== 'Semua') && (
                 <button onClick={handleResetFilter} className="text-[11px] font-semibold text-rose-400 flex items-center cursor-pointer hover:underline">
                   Reset Filter
                 </button>
              )}
            </div>
          )}

          {/* 🌟 UPGRADE: SKELETON LOADING (PREMIUM FEEL) */}
          {loading && products.length === 0 ? (
            <section className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="bg-white rounded-[20px] shadow-sm border border-slate-50 overflow-hidden flex flex-col h-full">
                  {/* Kotak Gambar */}
                  <div className="w-full aspect-square bg-slate-200 animate-pulse"></div>
                  <div className="p-3.5 flex flex-col flex-1 gap-2">
                    {/* Baris Teks Judul */}
                    <div className="w-full h-3 bg-slate-200 rounded-full animate-pulse mt-1"></div>
                    <div className="w-2/3 h-3 bg-slate-200 rounded-full animate-pulse"></div>
                    {/* Baris Harga */}
                    <div className="w-1/2 h-4 bg-teal-100 rounded-full animate-pulse mt-3"></div>
                    <div className="mt-auto pt-2">
                      <div className="w-full h-px bg-slate-100 mb-2"></div>
                      {/* Baris Nama Toko */}
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 bg-slate-200 rounded-full animate-pulse"></div>
                        <div className="w-1/2 h-2.5 bg-slate-200 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <Search className="w-8 h-8 opacity-50 mb-3" />
              <p className="text-sm font-bold text-slate-600">Barang tidak ditemukan</p>
              {isSearching && (
                 <p className="text-xs text-slate-500 mt-2 text-center">Coba gunakan kata kunci lain yang lebih umum.</p>
              )}
            </div>
          ) : (
            <section className="grid grid-cols-2 gap-4">
              {displayedProducts.map((product) => (
                <ProductCard key={product.id} {...product} />
              ))}
              
              {visibleCount < filteredProducts.length && (
                <div className="col-span-2 flex justify-center py-4">
                  <div className="animate-spin h-5 w-5 border-b-2 border-teal-500 rounded-full"></div>
                </div>
              )}
            </section>
          )}
        </div>

      </main>

      <BottomNav />
    </div>
  );
};

export default HomePage;