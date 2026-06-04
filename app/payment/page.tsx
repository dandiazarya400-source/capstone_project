"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, MapPin, Landmark, QrCode, Wallet, 
  CheckCircle2, Circle, BadgeCheck, Star, Clock, ShieldCheck, Store 
} from 'lucide-react';
// IMPORT SUPABASE
import { supabase } from '@/lib/supabase';

const PaymentContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Tangkap parameter pengiriman dari URL
  const deliveryType = searchParams.get('delivery') || 'owner'; 
  const isPickUp = deliveryType === 'self'; // True jika Ambil Sendiri

  // ================= KALKULASI HARGA DINAMIS =================
  const startParam = searchParams.get('start');
  const endParam = searchParams.get('end');
  const qtyParam = searchParams.get('qty');
  const priceParam = searchParams.get('price'); // Persiapan jika harga dikirim via URL

  // Hitung Durasi (Hari)
  const start = startParam && startParam !== 'null' ? parseInt(startParam) : 0;
  const end = endParam && endParam !== 'null' ? parseInt(endParam) : start;
  const duration = start && end ? (end - start + 1) : 1;

  // Hitung Kuantitas & Harga per Hari
  const qty = qtyParam && qtyParam !== 'null' ? parseInt(qtyParam) : 1;
  const pricePerDay = priceParam ? parseInt(priceParam) : 0;

  // Rumus Matematika
  const subtotal = pricePerDay * duration * qty;
  const serviceFee = 1000; // Biaya layanan statis
  const discount = 10000; // Diskon statis
  const totalPayment = subtotal > 0 ? (subtotal + serviceFee - discount) : 0;
  // Fungsi untuk mengubah angka jadi format Rupiah (Rp X.XXX)
  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };
  // ==========================================================

  // State untuk memilih metode pembayaran
  const [selectedPayment, setSelectedPayment] = useState<string | null>('bca');

  // ================= STATE & LOGIKA ALAMAT =================
  const [loading, setLoading] = useState(!isPickUp); 
  const [userData, setUserData] = useState({
    name: 'Memuat...',
    phone: '',
    address: 'Sedang mengambil data alamat...'
  });

  // Data Statis untuk Toko (Muncul jika user pilih Ambil Sendiri)
  const storeData = {
    name: 'Asoka Lensa (Studio)',
    phone: '+62 812-3456-7890',
    address: 'Jl. Ahmad Yani No. 88, Pasiran, Singkawang Barat, KOTA SINGKAWANG, KALIMANTAN BARAT, ID 79123'
  };

  // Ambil data User dari Supabase (Hanya jika opsi Diantar Pemilik)
  useEffect(() => {
    if (!isPickUp) {
      const fetchUserData = async () => {
        try {
          const { data: authData } = await supabase.auth.getUser();
          if (!authData.user) return;

          const { data, error } = await supabase
            .from('profiles')
            .select('full_name, phone_number, address')
            .eq('id', authData.user.id)
            .maybeSingle();

          if (data) {
            setUserData({
              name: data.full_name || 'Pengguna Tanpa Nama',
              phone: data.phone_number || '(Belum ada nomor HP)',
              address: data.address || 'Alamat belum diatur. Silakan atur di menu Profil.'
            });
          }
        } catch (error) {
          console.error("Gagal mengambil data:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchUserData();
    }
  }, [isPickUp]);

  // Penentu data mana yang akan dirender di HTML bawah
  const displayData = isPickUp ? storeData : userData;

  // Daftar Metode Pembayaran
  const paymentMethods = [
    { id: 'bca', title: 'Transfer Bank', desc: 'Bank BCA', icon: Landmark },
    { id: 'bri', title: 'Transfer Bank', desc: 'Bank BRI', icon: Landmark },
    { id: 'qris', title: 'QRIS', desc: 'Bayar Instan', icon: QrCode },
    { id: 'dana', title: 'DANA', desc: 'E-Wallet', icon: Wallet },
  ];

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-fluent-bg text-text-main overflow-hidden relative">
      
      {/* ================= HEADER ================= */}
      <header className="w-full bg-fluent-bg/95 backdrop-blur-md z-40 px-5 py-4 md:pt-12 pt-6 flex items-center border-b border-fluent-accent/10 shrink-0">
        <button 
          onClick={() => {
             const startParam = searchParams.get('start');
             const endParam = searchParams.get('end');
             const qtyParam = searchParams.get('qty');
             // GANTI KATA push MENJADI replace
             router.replace(`/booking?delivery=${deliveryType}&start=${startParam}&end=${endParam}&qty=${qtyParam}`);
          }} 
          className="p-2 -ml-2 bg-transparent rounded-full text-text-main hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold ml-2 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-fluent-accent" />
          Pembayaran
        </h1>
      </header>

      {/* ================= AREA SCROLL ================= */}
      <main className="flex-1 overflow-y-auto px-4 pt-5 pb-10 scrollbar-hide space-y-6">
        
        {/* 1. KARTU ALAMAT PENGIRIMAN / PENGAMBILAN */}
        <section>
          {/* Judul akan berubah otomatis */}
          <h2 className="text-sm font-bold text-text-muted mb-3 uppercase tracking-wider ml-1">
            {isPickUp ? 'Alamat Pengambilan (Toko)' : 'Alamat Pengiriman'}
          </h2>
          
          <div className="bg-fluent-card rounded-[24px] p-5 shadow-lg border border-fluent-accent/10 relative overflow-hidden group cursor-pointer hover:border-fluent-accent/50 transition-colors">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-fluent-accent to-[#ff7e67]"></div>
            
            <div className="flex gap-4 relative z-10">
              {/* Ikon berubah otomatis */}
              {isPickUp ? (
                <Store className="w-6 h-6 text-fluent-accent shrink-0 mt-0.5" />
              ) : (
                <MapPin className="w-6 h-6 text-fluent-accent shrink-0 mt-0.5" />
              )}
              
              <div>
                <h3 className="font-bold text-text-main flex items-center gap-2">
                  {displayData.name} <span className="text-xs font-normal text-text-muted">{displayData.phone}</span>
                </h3>
                <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                  {loading ? 'Memuat alamat...' : displayData.address}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. KARTU METODE PEMBAYARAN */}
        <section>
          <h2 className="text-sm font-bold text-text-muted mb-3 uppercase tracking-wider ml-1">Metode Pembayaran</h2>
          <div className="bg-fluent-card rounded-[24px] p-2 shadow-lg border border-fluent-accent/10 flex flex-col gap-1">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              const isSelected = selectedPayment === method.id;
              
              return (
                <button
                  key={method.id}
                  onClick={() => setSelectedPayment(method.id)}
                  className={`flex items-center justify-between p-3 rounded-2xl transition-all duration-200 ${
                    isSelected 
                      ? 'bg-fluent-accent/15 border border-fluent-accent/30' 
                      : 'bg-transparent border border-transparent hover:bg-fluent-accent/5'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${
                      isSelected ? 'bg-fluent-accent text-white' : 'bg-fluent-bg text-text-muted'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <h3 className={`text-sm font-bold ${isSelected ? 'text-text-main' : 'text-text-main/90'}`}>
                        {method.title}
                      </h3>
                      <p className="text-xs text-text-muted">{method.desc}</p>
                    </div>
                  </div>
                  
                  <div>
                    {isSelected ? (
                      <CheckCircle2 className="w-6 h-6 text-fluent-accent drop-shadow-[0_0_8px_rgba(163,116,255,0.6)]" />
                    ) : (
                      <Circle className="w-6 h-6 text-text-muted/30" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 3. KARTU RINCIAN PESANAN & PEMBAYARAN */}
        <section>
          <h2 className="text-sm font-bold text-text-muted mb-3 uppercase tracking-wider ml-1">Rincian Pembayaran</h2>
          <div className="bg-fluent-card rounded-[24px] p-5 shadow-lg border border-fluent-accent/10">
            
            <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-fluent-bg rounded-full flex items-center justify-center border border-fluent-accent/30 overflow-hidden shadow-inner">
                  <span className="text-text-main font-black text-lg tracking-tighter">A<span className="text-fluent-accent">L</span></span>
                </div>
                <div>
                  <div className="flex items-center">
                    <h3 className="font-bold text-text-main text-sm">Asoka Lensa</h3>
                    <BadgeCheck className="w-4 h-4 text-fluent-accent ml-1" />
                  </div>
                  <p className="text-[10px] text-text-muted">Kota Singkawang</p>
                </div>
              </div>
              <button className="px-3 py-1 rounded-full border border-fluent-accent text-fluent-accent text-[11px] font-bold hover:bg-fluent-accent/10 transition-colors">
                Ikuti
              </button>
            </div>

            <div className="flex items-center gap-4 text-[11px] text-text-muted pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center">
                <Star className="w-3.5 h-3.5 text-fluent-accent mr-1" />
                <span className="text-text-main font-medium mr-1">5.0</span> (58.125 ulasan)
              </div>
              <div className="flex items-center">
                <Clock className="w-3.5 h-3.5 text-fluent-accent mr-1" />
                ± 3 jam proses
              </div>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-text-muted">
                <span className="flex flex-col">
                  Subtotal Pesanan
                  <span className="text-[10px] text-text-muted/60">({duration} hari x {qty} unit)</span>
                </span>
                <span className="text-text-main">{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between text-text-muted">
                <span>Biaya Layanan</span>
                <span className="text-text-main">{formatRupiah(serviceFee)}</span>
              </div>
              <div className="flex justify-between text-fluent-accent font-medium">
                <span>Voucher Diskon</span>
                <span>- {formatRupiah(discount)}</span>
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* ================= BOTTOM SHEET (NAVIGASI CHECKOUT) ================= */}
      <div className="w-full bg-fluent-card/95 backdrop-blur-xl p-5 md:pb-8 pb-5 rounded-t-[32px] shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.5)] border-t border-white/10 z-50 shrink-0">
        <div className="flex justify-between items-center">
          
          <div className="flex flex-col">
            <span className="text-xs font-medium text-text-muted mb-0.5">Total Pembayaran</span>
            <span className="text-xl font-black text-fluent-accent drop-shadow-[0_0_10px_rgba(163,116,255,0.3)]">
              {formatRupiah(totalPayment)}
            </span>
          </div>

          <button 
            disabled={!selectedPayment}
            // Tambahkan variabel totalPayment ke dalam URL
            onClick={() => router.push(`/payment/checkout?total=${totalPayment}`)}
            className="bg-fluent-accent text-white font-bold px-8 py-3.5 rounded-2xl flex justify-center items-center shadow-[0_4px_20px_rgba(163,116,255,0.4)] hover:bg-[#b58eff] transition-all disabled:opacity-50 disabled:grayscale active:scale-95"
          >
            Checkout
          </button>
        </div>
      </div>

    </div>
  );
};

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-fluent-bg text-text-muted">Memuat pembayaran...</div>}>
      <PaymentContent />
    </Suspense>
  );
}