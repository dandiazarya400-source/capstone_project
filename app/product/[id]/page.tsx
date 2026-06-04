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
  const [eligibleTxId, setEligibleTxId] = useState<string | null>(null); // ID Transaksi jika dia berhak mereview
  
  // State untuk Form Input Review
  const [userRating, setUserRating] = useState(5);
  const [userComment, setUserComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // === STATE UNTUK SENSOR MOUSE SWIPE ===
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('items')
          .select('*')
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
          owner: "Asoka Maju", // (Nanti bisa ditarik dari tabel profiles owner_id)
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

          // Cari transaksi user untuk barang ini yang sudah Selesai
          const { data: txData } = await supabase.from('transactions')
            .select('id')
            .eq('item_id', id)
            .eq('tenant_id', userId)
            .eq('status', 'Selesai');

          if (txData && txData.length > 0) {
            // Cek apakah transaksi tersebut sudah direview
            const { data: myReviews } = await supabase.from('reviews')
              .select('transaction_id')
              .eq('item_id', id)
              .eq('reviewer_id', userId);
            
            const reviewedTxIds = myReviews?.map(r => r.transaction_id) || [];
            
            // Cari 1 saja transaksi yang belum direview
            const eligibleTx = txData.find(tx => !reviewedTxIds.includes(tx.id));
            if (eligibleTx) {
              setEligibleTxId(eligibleTx.id); // Buka gembok form ulasan!
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

  // Update indikator titik saat di-scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollPosition = e.currentTarget.scrollLeft;
    const containerWidth = e.currentTarget.clientWidth;
    const newIndex = Math.round(scrollPosition / containerWidth);
    setCurrentImageIndex(newIndex);
  };

  // === FUNGSI DRAG MOUSE UNTUK PC ===
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    if (carouselRef.current) {
      setStartX(e.pageX - carouselRef.current.offsetLeft);
      setScrollLeft(carouselRef.current.scrollLeft);
      carouselRef.current.style.scrollBehavior = 'auto'; // Matikan smooth sementara agar responsif
    }
  };

  const handleMouseLeaveOrUp = () => {
    setIsDragging(false);
    if (carouselRef.current) {
      carouselRef.current.style.scrollBehavior = 'smooth'; // Nyalakan lagi efek snap-nya
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Kecepatan tarikan
    carouselRef.current.scrollLeft = scrollLeft - walk;
  };

  // === FUNGSI KIRIM ULASAN ===
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
      window.location.reload(); // Refresh instan untuk memunculkan ulasan baru
    } catch (error) {
      console.error("Gagal mengirim ulasan:", error);
      alert("Gagal mengirim ulasan.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (loading) return <div className="h-full w-full flex items-center justify-center bg-fluent-bg text-fluent-accent">Memuat...</div>;
  if (!product) return <div className="h-full w-full flex items-center justify-center bg-fluent-bg text-text-main">Produk tidak ditemukan.</div>;

  return (
    <div className="h-full w-full flex flex-col bg-fluent-bg text-text-main overflow-hidden relative">
      
      <header className="absolute top-0 left-0 w-full bg-gradient-to-b from-black/70 to-transparent z-40 px-4 py-4 md:pt-12 pt-4 flex justify-between items-center pointer-events-none">
        <button onClick={() => router.back()} className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white cursor-pointer hover:bg-black/60 transition-colors border border-white/10 pointer-events-auto">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex space-x-3 text-white pointer-events-auto">
          <button className="p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10"><ShoppingCart className="w-5 h-5" /></button>
          <button className="p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10"><Menu className="w-5 h-5" /></button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        
        <div className="w-full h-[400px] relative bg-fluent-card group">
          
          {/* Wadah yang sudah dipasangi sensor Mouse Drag */}
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
              <div key={index} className="w-full h-full flex-shrink-0 snap-center relative">
                {/* Pointer-events-none pada gambar penting agar tidak mengganggu klik mouse */}
                <img src={imgUrl} alt={`${product.title} - ${index + 1}`} className="w-full h-full object-cover pointer-events-none" />
              </div>
            ))}
          </div>

          <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-fluent-bg to-transparent pointer-events-none"></div>
          
          {product.images.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-1.5 z-10">
              {product.images.map((_: any, index: number) => (
                <div key={index} className={`h-1.5 rounded-full transition-all duration-300 ${currentImageIndex === index ? 'bg-fluent-accent w-4' : 'bg-white/50 w-1.5'}`} />
              ))}
            </div>
          )}
        </div>

        <main className="px-5 mt-2 pb-10">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-text-main leading-tight">{product.title}</h1>
            <p className="text-2xl font-extrabold text-fluent-accent mt-2">{product.price} <span className="text-sm font-medium text-text-muted">/ hari</span></p>
            
            <div className="flex items-center text-sm text-text-muted mt-3 space-x-3">
              <div className="flex items-center text-fluent-accent">
                <Star className="w-4 h-4 fill-fluent-accent mr-1" />
                <span className="font-bold text-text-main">{product.rating}</span>
              </div>
              <span>•</span>
              <div className="flex items-center">
                <Tag className="w-4 h-4 mr-1.5 opacity-70" />
                <span>Kondisi: <span className="font-semibold text-text-main">{product.condition}</span></span>
              </div>
              <span>•</span>
              <div className="flex items-center">
                <span>Stok: <span className="font-semibold text-text-main">{product.stock}</span></span>
              </div>
            </div>
          </div>

          <div className="bg-fluent-card rounded-[24px] p-4 border border-white/5 shadow-lg mb-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-[#1A0B2E] border border-fluent-accent/30 rounded-full flex items-center justify-center shadow-inner overflow-hidden">
                  <span className="text-text-main font-black text-xl tracking-tighter">A<span className="text-fluent-accent">M</span></span>
                </div>
                <div>
                  <div className="flex items-center">
                    <h3 className="font-bold text-text-main text-base">{product.owner}</h3>
                    {product.is_verified && <BadgeCheck className="w-4 h-4 text-fluent-accent ml-1" />}
                  </div>
                  <p className="text-xs text-text-muted">Kota Singkawang</p>
                </div>
              </div>
              <button className="px-4 py-1.5 rounded-full border border-fluent-accent text-fluent-accent text-xs font-bold hover:bg-fluent-accent/10 transition-colors">
                Ikuti
              </button>
            </div>
            <div className="space-y-2 text-sm text-text-muted">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2 text-fluent-accent" /> 
                ± {product.process_time} pesanan diproses
              </div>
            </div>
          </div>

          {/* UBAH RATING JADI DINAMIS (Ubah ini di bagian atas juga kalau ada) */}
          {/* Di atas tadi ada blok: <span className="font-bold text-text-main">{product.rating}</span> */}
          {/* Ubah menjadi: <span className="font-bold text-text-main">{averageRating} ({reviews.length})</span> */}

          <div className="mb-8">
            <h3 className="text-lg font-bold text-text-main mb-3 flex items-center">
              <AlignLeft className="w-5 h-5 mr-2 text-fluent-accent" />
              Deskripsi Alat
            </h3>
            <p className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">
              {product.description}
            </p>
          </div>

          {/* ========================================================= */}
          {/* [BARU] SEGMEN ULASAN PENYEWA */}
          {/* ========================================================= */}
          <div className="mb-8 border-t border-white/10 pt-6">
            <h3 className="text-lg font-bold text-text-main mb-4 flex items-center justify-between">
              <div className="flex items-center">
                <MessageCircle className="w-5 h-5 mr-2 text-fluent-accent" />
                Ulasan Penyewa
              </div>
              <span className="text-sm font-medium text-text-muted bg-white/5 px-3 py-1 rounded-full">
                <Star className="w-3.5 h-3.5 inline text-yellow-400 mr-1 mb-0.5" />
                {averageRating} ({reviews.length} Ulasan)
              </span>
            </h3>

            {/* FORM INPUT ULASAN (HANYA MUNCUL JIKA USER ELIGIBLE) */}
            {eligibleTxId && (
              <div className="bg-fluent-accent/10 border border-fluent-accent/30 rounded-2xl p-4 mb-6 animate-in fade-in zoom-in duration-300">
                <p className="text-xs font-bold text-fluent-accent mb-2">Kamu sudah menyewa alat ini. Yuk, beri ulasan!</p>
                
                <div className="flex space-x-2 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setUserRating(star)} className="focus:outline-none">
                      <Star className={`w-7 h-7 transition-colors ${star <= userRating ? 'fill-yellow-400 text-yellow-400' : 'text-white/20'}`} />
                    </button>
                  ))}
                </div>
                
                <textarea 
                  value={userComment}
                  onChange={(e) => setUserComment(e.target.value)}
                  placeholder="Bagaimana kondisi alat ini saat kamu gunakan?"
                  className="w-full bg-[#1A0B2E] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-fluent-accent resize-none mb-3 shadow-inner"
                  rows={3}
                ></textarea>
                
                <button 
                  onClick={handleSubmitReview}
                  disabled={isSubmittingReview || !userComment.trim()}
                  className="w-full bg-fluent-accent text-white text-xs font-bold py-3 rounded-xl hover:bg-[#b58eff] transition-colors disabled:opacity-50"
                >
                  {isSubmittingReview ? "Mengirim..." : "Kirim Ulasan"}
                </button>
              </div>
            )}

            {/* DAFTAR ULASAN */}
            <div className="space-y-4">
              {reviews.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-6 bg-white/5 rounded-2xl border border-white/5 border-dashed">Belum ada ulasan untuk barang ini.</p>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="bg-fluent-card p-4 rounded-2xl border border-white/5 shadow-md">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <img src={review.profiles?.avatar_url || 'https://via.placeholder.com/40'} alt="User" className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10" />
                        <div>
                          <p className="text-xs font-bold text-text-main leading-none">{review.profiles?.full_name || 'Pengguna'}</p>
                          <p className="text-[9px] text-text-muted mt-1">{new Date(review.created_at).toLocaleDateString('id-ID')}</p>
                        </div>
                      </div>
                      <div className="flex items-center bg-yellow-400/10 px-2 py-0.5 rounded flex-shrink-0">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 mr-1" />
                        <span className="text-[10px] font-bold text-yellow-400">{review.rating}.0</span>
                      </div>
                    </div>
                    <p className="text-xs text-text-muted mt-2 leading-relaxed">"{review.comment}"</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </main>
      </div>

    

      <nav className="w-full bg-fluent-card/95 backdrop-blur-md p-4 md:pb-8 pb-4 rounded-t-[32px] shadow-[0_-10px_30px_-5px_rgba(0,0,0,0.5)] border-t border-white/5 z-50 shrink-0">
        <div className="flex items-center space-x-3">
          <button onClick={() => router.push('/chat')} className="flex-1 bg-transparent border-2 border-fluent-accent text-fluent-accent font-bold py-3.5 rounded-[18px] flex justify-center items-center space-x-2 hover:bg-fluent-accent/10 transition-colors">
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm">Chat</span>
          </button>
          <button onClick={() => router.push(`/booking?stock=${product.stock}&id=${id}&price=${product.rawPrice}`)} className="flex-1 bg-fluent-accent text-white font-bold py-3.5 rounded-[18px] flex justify-center items-center space-x-2 shadow-[0_4px_20px_rgba(163,116,255,0.4)] hover:bg-[#b58eff] transition-colors">
            <CalendarCheck className="w-5 h-5" />
            <span className="text-sm">Sewa Sekarang</span>
          </button>
        </div>
      </nav>
      
    </div>
  );
};

export default ProductDetailPage;