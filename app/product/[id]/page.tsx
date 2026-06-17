"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, Search, ShoppingCart, Menu, Star, 
  Clock, BadgeCheck, MessageCircle, CalendarCheck, Tag, AlignLeft 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const ProductDetailPage = () => {
  const router = useRouter(); 
  const params = useParams();
  const { id } = params; 

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // === [BARU] STATE UNTUK SISTEM ULASAN ===
  const [reviews, setReviews] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState("0.0");
  
  // State untuk Validasi Reviewer
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [eligibleTxId, setEligibleTxId] = useState<string | null>(null); 
  
  // State untuk Form Input Review
  const [userRating, setUserRating] = useState(5);
  const [userComment, setUserComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // === STATE UNTUK SENSOR MOUSE SWIPE ===
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('items')
          .select('*, profiles(full_name, avatar_url)')
          .eq('id', id)
          .single();

        if (error) throw error;

        // 1. SET DATA PRODUK UTAMA
        setProduct({
          title: data.name,
          rawPrice: data.price_per_day,
          price: `Rp ${data.price_per_day?.toLocaleString('id-ID')}`,
          description: data.description || "Tidak ada deskripsi tersedia.",
          condition: data.condition || "Baik", 
          stock: data.stock || 0, 
          owner: data.profiles?.full_name || "Pengguna Anonim",
          owner_avatar: data.profiles?.avatar_url || "",
          owner_id: data.owner_id,
          is_verified: true,
          process_time: "3 jam", 
          images: data.image_urls && data.image_urls.length > 0 ? data.image_urls : ["https://via.placeholder.com/150"]
        });

        // 2. [BARU] TARIK DATA ULASAN
        const { data: reviewData } = await supabase
          .from('reviews')
          .select('*, profiles(full_name, avatar_url)')
          .eq('item_id', id)
          .order('created_at', { ascending: false });

        if (reviewData) {
          setReviews(reviewData);
          if (reviewData.length > 0) {
            const total = reviewData.reduce((sum, r) => sum + r.rating, 0);
            setAverageRating((total / reviewData.length).toFixed(1));
          }
        }

        // 3. [BARU] VALIDASI APAKAH USER BISA MEMBERI ULASAN
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          setCurrentUserId(authData.user.id);
          const userId = authData.user.id;

          const { data: txData } = await supabase.from('transactions')
            .select('id')
            .eq('item_id', id)
            .eq('tenant_id', userId)
            .eq('status', 'Selesai');

          if (txData && txData.length > 0) {
            const { data: myReviews } = await supabase.from('reviews')
              .select('transaction_id')
              .eq('item_id', id)
              .eq('reviewer_id', userId);
            
            const reviewedTxIds = myReviews?.map(r => r.transaction_id) || [];
            const eligibleTx = txData.find(tx => !reviewedTxIds.includes(tx.id));
            if (eligibleTx) {
              setEligibleTxId(eligibleTx.id); 
            }
          }
          if (data.owner_id) { // 'data' ini dari fetchProduct paling atas
            const { data: followData, error: followError } = await supabase
              .from('follows')
              .select('id')
              .eq('follower_id', userId) // Gunakan userId yang sudah diambil di atas
              .eq('following_id', data.owner_id)
              .maybeSingle();
              
            if (!followError && followData) {
              setIsFollowing(true);
            }
          }
        }
      } catch (err) {
        console.error("Gagal memuat produk:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // Ini fungsi ASLI milikmu untuk foto (Biarkan saja)
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollPosition = e.currentTarget.scrollLeft;
    const containerWidth = e.currentTarget.clientWidth;
    const newIndex = Math.round(scrollPosition / containerWidth);
    setCurrentImageIndex(newIndex);
  };

  // 🌟 BARU: Tambahkan fungsi ini untuk mendeteksi scroll Halaman
  const handlePageScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // Jika halaman turun lebih dari 40px, nyalakan background putih
    setIsScrolled(e.currentTarget.scrollTop > 40);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    if (carouselRef.current) {
      setStartX(e.pageX - carouselRef.current.offsetLeft);
      setScrollLeft(carouselRef.current.scrollLeft);
      carouselRef.current.style.scrollBehavior = 'auto'; 
    }
  };

  const handleMouseLeaveOrUp = () => {
    setIsDragging(false);
    if (carouselRef.current) {
      carouselRef.current.style.scrollBehavior = 'smooth'; 
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; 
    carouselRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleSubmitReview = async () => {
    if (!currentUserId || !eligibleTxId || !id) return;
    setIsSubmittingReview(true);
    
    try {
      const { error } = await supabase.from('reviews').insert({
        item_id: id,
        reviewer_id: currentUserId,
        transaction_id: eligibleTxId,
        rating: userRating,
        comment: userComment
      });

      if (error) throw error;
      
      alert("Terima kasih! Ulasanmu berhasil dikirim.");
      window.location.reload(); 
    } catch (error) {
      console.error("Gagal mengirim ulasan:", error);
      alert("Gagal mengirim ulasan.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // === FUNGSI TOGGLE FOLLOW ===
  const handleToggleFollow = async () => {
    if (!currentUserId) {
      alert("Silakan login untuk mengikuti toko.");
      return;
    }
    if (!product?.owner_id) return;

    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        // Berhenti mengikuti (Unfollow)
        await supabase.from('follows').delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', product.owner_id);
        setIsFollowing(false);
      } else {
        // Mulai mengikuti (Follow)
        const { error } = await supabase.from('follows').insert({ 
          follower_id: currentUserId, 
          following_id: product.owner_id 
        });
        if (error) throw error;
        setIsFollowing(true);
      }
    } catch (error) {
      console.error("Gagal follow:", error);
      // Tetap ubah UI secara optimis kalau terjadi error (atau tabelnya belum kamu buat)
      setIsFollowing(!isFollowing); 
    } finally {
      setIsFollowLoading(false);
    }
  };

  // === [BARU] STATE UNTUK FITUR FOLLOW ===
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  // 🌟 JURUS KEAMANAN: Hapus cache Home saat berpindah navigasi (agar stok di Home terupdate nanti)
  const handleBackToHome = () => {
    sessionStorage.removeItem('homeProductsCache');
    router.back();
  };

  const handleBooking = () => {
    sessionStorage.removeItem('homeProductsCache');
    router.push(`/booking?stock=${product.stock}&id=${id}&price=${product.rawPrice}`);
  };

  if (loading) return <div className="h-[100dvh] w-full flex items-center justify-center bg-[#F2FDFB] text-teal-600"><div className="animate-spin h-8 w-8 border-b-2 border-teal-500 rounded-full"></div></div>;
  if (!product) return <div className="h-[100dvh] w-full flex items-center justify-center bg-[#F2FDFB] text-slate-500 font-medium">Produk tidak ditemukan.</div>;

return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#F2FDFB] text-slate-800 overflow-hidden relative">
      
      {/* 🌟 1. HEADER DINAMIS (Berubah warna pakai isScrolled) */}
      <header className={`absolute top-0 left-0 w-full z-40 px-4 py-4 md:pt-12 pt-4 flex justify-between items-center transition-all duration-300 ${
        isScrolled ? 'bg-white/90 backdrop-blur-md shadow-sm' : 'bg-transparent pointer-events-none'
      }`}>
        <button onClick={handleBackToHome} className="p-2.5 bg-white/80 backdrop-blur-xl rounded-full text-slate-700 cursor-pointer hover:bg-white transition-colors border border-white pointer-events-auto shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex space-x-3 text-slate-700 pointer-events-auto">
          <button className="p-2.5 bg-white/80 backdrop-blur-xl rounded-full border border-white hover:bg-white transition-colors shadow-sm"><ShoppingCart className="w-5 h-5" /></button>
          <button className="p-2.5 bg-white/80 backdrop-blur-xl rounded-full border border-white hover:bg-white transition-colors shadow-sm"><Menu className="w-5 h-5" /></button>
        </div>
      </header>

      {/* Area yang bisa di-scroll */}
      <div className="flex-1 overflow-y-auto scrollbar-hide relative" onScroll={handlePageScroll}>
        <div className="w-full h-[400px] relative bg-slate-100 group">
          <div 
            ref={carouselRef}
            className={`w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            onScroll={handleScroll}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeaveOrUp}
            onMouseUp={handleMouseLeaveOrUp}
            onMouseMove={handleMouseMove}
          >
            {product.images.map((imgUrl: string, index: number) => (
              // 🌟 PERBAIKAN 1: Tambahkan pt-20 (padding-top) agar gambar turun menghindari tombol header
              // Tambahkan pb-10 agar tidak menabrak titik indikator carousel di bawah
              <div key={index} className="w-full h-full flex-shrink-0 snap-center relative pt-20 pb-10 px-6 flex items-center justify-center">
                
                {/* 🌟 PERBAIKAN 2: Ubah object-cover menjadi object-contain agar gambar tidak terpotong */}
                {/* Opsional: Tambahkan mix-blend-multiply jika background fotonya putih agar menyatu dengan background slate-100 */}
                <img 
                  src={imgUrl} 
                  alt={`${product.title} - ${index + 1}`} 
                  className="w-full h-full object-contain pointer-events-none mix-blend-multiply" 
                />
              </div>
            ))}
          </div>

          <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#F2FDFB] to-transparent pointer-events-none"></div>
          
          {product.images.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-1.5 z-10">
              {product.images.map((_: any, index: number) => (
                <div key={index} className={`h-1.5 rounded-full transition-all duration-300 ${currentImageIndex === index ? 'bg-teal-500 w-5' : 'bg-teal-500/30 w-1.5'}`} />
              ))}
            </div>
          )}
        </div>

        <main className="px-5 mt-2 pb-10">
          <div className="mb-6">
            <h1 className="text-[22px] font-bold text-slate-800 leading-tight">{product.title}</h1>
            <p className="text-[26px] font-black text-teal-600 mt-1">{product.price} <span className="text-sm font-semibold text-slate-400">/ hari</span></p>
            
            <div className="flex items-center text-[12px] text-slate-500 mt-3 space-x-3">
              <div className="flex items-center text-yellow-500">
                <Star className="w-4 h-4 fill-yellow-400 mr-1" />
                <span className="font-bold text-slate-700">{averageRating}</span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center">
                <Tag className="w-4 h-4 mr-1.5 text-slate-400" />
                <span>Kondisi: <span className="font-bold text-slate-700">{product.condition}</span></span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center">
                {/* 🌟 WARNA STOK DINAMIS (Merah jika habis) */}
                <span className={product.stock === 0 ? "text-rose-500 font-bold" : ""}>
                  Stok: <span className="font-bold">{product.stock}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] mb-6">
            <div className="flex justify-between items-center border-b border-slate-50 pb-4 mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-400 rounded-full flex items-center justify-center shadow-inner overflow-hidden border border-teal-100 text-white font-black text-xl">
                  {product.owner_avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.owner_avatar} alt={product.owner} className="w-full h-full object-cover" />
                  ) : (
                    product.owner.substring(0, 1).toUpperCase() 
                  )}
                </div>
                <div>
                  <div className="flex items-center">
                    <h3 className="font-bold text-slate-800 text-[15px]">{product.owner}</h3>
                    {product.is_verified && <BadgeCheck className="w-4 h-4 text-blue-500 ml-1.5" />}
                  </div>
                  <p className="text-[11px] font-medium text-slate-500">Kota Singkawang</p>
                </div>
              </div>
              <button 
                onClick={handleToggleFollow}
                disabled={isFollowLoading}
                className={`px-5 py-1.5 rounded-full border-2 text-[11px] font-bold transition-all duration-300 disabled:opacity-50 ${
                  isFollowing 
                    ? 'bg-teal-50 border-teal-100 text-teal-600' // Jika sudah follow
                    : 'border-teal-500 text-teal-600 hover:bg-teal-50' // Jika belum follow
                }`}
              >
                {isFollowLoading ? '...' : isFollowing ? 'Mengikuti' : 'Ikuti'}
              </button>
            </div>
            <div className="space-y-2 text-[12px] font-medium text-slate-500">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2 text-teal-500" /> 
                ± {product.process_time} pesanan diproses
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-[16px] font-bold text-slate-800 mb-3 flex items-center">
              <AlignLeft className="w-5 h-5 mr-2 text-teal-500" />
              Deskripsi Alat
            </h3>
            <p className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
              {product.description}
            </p>
          </div>

          <div className="mb-8 border-t border-slate-200/60 pt-6">
            <h3 className="text-[16px] font-bold text-slate-800 mb-4 flex items-center justify-between">
              <div className="flex items-center">
                <MessageCircle className="w-5 h-5 mr-2 text-teal-500" />
                Ulasan Penyewa
              </div>
              <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-full border border-teal-100">
                <Star className="w-3.5 h-3.5 inline fill-yellow-400 text-yellow-400 mr-1 mb-0.5" />
                {averageRating} ({reviews.length} Ulasan)
              </span>
            </h3>

            {eligibleTxId && (
              <div className="bg-teal-50 border border-teal-100 rounded-[20px] p-4 mb-6 animate-in fade-in zoom-in duration-300">
                <p className="text-[12px] font-bold text-teal-700 mb-3">Kamu sudah menyewa alat ini. Yuk, beri ulasan!</p>
                
                <div className="flex space-x-2 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setUserRating(star)} className="focus:outline-none hover:scale-110 transition-transform">
                      <Star className={`w-8 h-8 transition-colors ${star <= userRating ? 'fill-yellow-400 text-yellow-400 drop-shadow-sm' : 'text-slate-300'}`} />
                    </button>
                  ))}
                </div>
                
                <textarea 
                  value={userComment}
                  onChange={(e) => setUserComment(e.target.value)}
                  placeholder="Bagaimana kondisi alat ini saat kamu gunakan?"
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-[13px] font-medium text-slate-800 focus:outline-none focus:border-teal-400 resize-none mb-3 shadow-sm placeholder:text-slate-400"
                  rows={3}
                ></textarea>
                
                <button 
                  onClick={handleSubmitReview}
                  disabled={isSubmittingReview || !userComment.trim()}
                  className="w-full bg-teal-500 text-white text-[13px] font-bold py-3 rounded-xl hover:bg-teal-600 transition-colors disabled:opacity-50 shadow-md shadow-teal-500/20"
                >
                  {isSubmittingReview ? "Mengirim..." : "Kirim Ulasan"}
                </button>
              </div>
            )}

            <div className="space-y-3">
              {reviews.length === 0 ? (
                <p className="text-[12px] font-medium text-slate-500 text-center py-8 bg-slate-50 rounded-[20px] border border-slate-200 border-dashed">Belum ada ulasan untuk barang ini.</p>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="bg-white p-4 rounded-[20px] border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <img src={review.profiles?.avatar_url || 'https://via.placeholder.com/40'} alt="User" className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-50" />
                        <div>
                          <p className="text-[13px] font-bold text-slate-800 leading-none mb-1">{review.profiles?.full_name || 'Pengguna'}</p>
                          <p className="text-[10px] font-medium text-slate-400">{new Date(review.created_at).toLocaleDateString('id-ID')}</p>
                        </div>
                      </div>
                      <div className="flex items-center bg-yellow-50 px-2 py-1 rounded-lg flex-shrink-0 border border-yellow-100">
                        <Star className="w-3 h-3 fill-yellow-500 text-yellow-500 mr-1" />
                        <span className="text-[11px] font-bold text-yellow-600">{review.rating}.0</span>
                      </div>
                    </div>
                    <p className="text-[12px] font-medium text-slate-600 mt-2.5 leading-relaxed">"{review.comment}"</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </main>
      </div>

      <nav className="w-full bg-white/95 backdrop-blur-xl p-4 md:pb-8 pb-4 rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] border-t border-slate-100 z-50 shrink-0">
        <div className="flex items-center space-x-3">
          <button 
            disabled={!product}
            onClick={() => {
              if (product?.owner_id) {
              router.push(`/chat?targetId=${product.owner_id}&targetName=${encodeURIComponent(product.owner)}&targetAvatar=${encodeURIComponent(product.owner_avatar || '')}`);              } else {
                router.push('/chat'); 
              }
            }} 
            className="flex-1 bg-teal-50 border-2 border-teal-100 text-teal-600 font-bold py-3.5 rounded-[18px] flex justify-center items-center space-x-2 hover:bg-teal-100 transition-colors disabled:opacity-50"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-[13px]">Chat Pemilik</span>
          </button>
          
          {/* 🌟 PERBAIKAN BUG KRITIS: Tombol akan nonaktif (disabled) jika stok = 0 */}
          <button 
            disabled={product.stock === 0}
            onClick={handleBooking} 
            className="flex-1 bg-teal-500 text-white font-bold py-3.5 rounded-[18px] flex justify-center items-center space-x-2 shadow-lg shadow-teal-500/30 hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CalendarCheck className="w-5 h-5" />
            <span className="text-[13px]">
              {product.stock === 0 ? "Stok Habis" : "Sewa Sekarang"}
            </span>
          </button>
        </div>
      </nav>
      
    </div>
  );
};

export default ProductDetailPage;