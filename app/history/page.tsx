"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Search, Plus, ReceiptText, 
  CheckCircle2, Clock, Calendar, MinusCircle, XCircle
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/lib/supabase';

const HistoryPage = () => {
  const router = useRouter();
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 🌟 JURUS 1: State untuk Filter Tab
  const [activeTab, setActiveTab] = useState('Semua');

  // 🌟 JURUS BARU: State untuk Pencarian
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':');
  };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user) return;

        const userId = authData.user.id;

        const { data: walletData } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('user_id', userId);

        const { data: rentalData } = await supabase
          .from('transactions')
          .select('*, items(name)')
          .eq('tenant_id', userId);

        let combinedData: any[] = [];

        if (walletData) {
          const formattedWallet = walletData.map(w => ({
            id: `wallet-${w.id}`,
            type: w.type,
            title: w.type === 'topup' ? 'Isi Saldo' : 'Tarik Dana',
            date: w.created_at,
            amount: w.amount,
            status: w.status,
            duration: null,
            created_at: w.created_at
          }));
          combinedData = [...combinedData, ...formattedWallet];
        }

        if (rentalData) {
          const formattedRental = rentalData.map(r => {
            const start = new Date(r.start_date);
            const end = new Date(r.end_date);
            const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

            return {
              id: `rental-${r.id}`,
              type: 'rental',
              title: r.items?.name || 'Sewa Barang',
              date: r.created_at,
              amount: r.total_price,
              status: r.status,
              duration: `${diffDays} hari`,
              created_at: r.created_at
            };
          });
          combinedData = [...combinedData, ...formattedRental];
        }

        combinedData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setHistoryItems(combinedData);

      } catch (error) {
        console.error("Gagal memuat history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  // 🌟 JURUS 2: Logika Filter Berdasarkan Status & Pencarian
  const filteredHistory = historyItems.filter(item => {
    // A. Filter Tab Status
    const s = item.status.toLowerCase();
    const isSelesai = s.includes('selesai') || s.includes('berhasil') || s.includes('batal') || s.includes('gagal');
    
    let matchTab = true;
    if (activeTab === 'Selesai') matchTab = isSelesai;
    if (activeTab === 'Berlangsung') matchTab = !isSelesai;

    // B. Filter Pencarian Teks
    const matchSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());

    return matchTab && matchSearch;
  });

  // 🌟 JURUS 3: Detektor Status (Warna & Ikon Otomatis)
  const getStatusUI = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('selesai') || s.includes('berhasil')) {
      return { color: 'text-emerald-500', icon: CheckCircle2 };
    }
    if (s.includes('batal') || s.includes('gagal') || s.includes('tolak')) {
      return { color: 'text-rose-500', icon: XCircle };
    }
    // Default: Menunggu / Diproses
    return { color: 'text-amber-500', icon: Clock };
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-[#F2FDFB] text-slate-800">
      
      {/* ================= HEADER ================= */}
      <header className="bg-white px-5 pt-12 pb-4 flex flex-col gap-4 sticky top-0 z-50 rounded-b-[30px] shadow-[0_8px_30px_rgba(0,0,0,0.03)] border-b border-slate-100">
        
        {/* Area Atas (Judul / Kolom Pencarian) */}
        <div className="flex items-center justify-between h-10">
          {!isSearchOpen ? (
            <>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => router.back()} 
                  className="w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-full transition-colors shrink-0"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-700" />
                </button>
                <h1 className="text-[19px] font-black tracking-tight text-slate-800">Riwayat</h1>
              </div>
              
              <button 
                onClick={() => setIsSearchOpen(true)}
                className="w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-600 shrink-0"
              >
                <Search className="w-5 h-5" />
              </button>
            </>
          ) : (
            <div className="flex items-center w-full animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex-1 bg-slate-50 rounded-full flex items-center px-4 h-10 border border-slate-100 shadow-inner">
                <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                
                {/* 🌟 JURUS UX: onBlur untuk menutup otomatis saat diklik di luar */}
                <input
                  type="text"
                  autoFocus
                  placeholder="Cari transaksi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={() => {
                    // Kalau input kosong lalu user klik area lain, otomatis tutup!
                    if (!searchQuery.trim()) {
                      setIsSearchOpen(false);
                    }
                  }}
                  className="w-full bg-transparent text-[13px] font-medium text-slate-700 focus:outline-none placeholder:text-slate-400"
                />
                
                {/* 🌟 JURUS UX: Tombol X kecil di dalam kolom jika ada teksnya */}
                {searchQuery && (
                  <button 
                    onMouseDown={(e) => {
                      e.preventDefault(); // Cegah onBlur tereksekusi duluan
                      setSearchQuery('');
                      setIsSearchOpen(false);
                    }}
                    className="p-1 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors shrink-0 ml-1"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 🌟 PERBAIKAN: Tombol Filter Aktif */}
        <div className="flex gap-2">
          {['Semua', 'Berlangsung', 'Selesai'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-full text-[13px] font-bold transition-all duration-300 border ${
                activeTab === tab 
                  ? 'bg-teal-500 text-white border-transparent shadow-md shadow-teal-500/20' 
                  : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 overflow-y-auto px-5 pt-6 pb-32 scrollbar-hide">
        <section className="mb-6">
          <div className="flex items-center space-x-2 mb-4 px-1">
            <Calendar className="w-4 h-4 text-teal-500" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Riwayat Transaksi</span>
          </div>

          <div className="space-y-3">
            {loading ? (
              // 🌟 PERBAIKAN: Skeleton Loading Premium
              [1, 2, 3].map((n) => (
                <div key={n} className="bg-white p-4 rounded-[20px] border border-slate-50 flex items-center justify-between shadow-sm">
                  <div className="flex items-center space-x-4 w-full">
                    <div className="w-12 h-12 rounded-2xl bg-slate-200 animate-pulse shrink-0"></div>
                    <div className="flex-1 space-y-2">
                      <div className="w-2/3 h-3 bg-slate-200 rounded-full animate-pulse"></div>
                      <div className="w-1/2 h-2.5 bg-slate-100 rounded-full animate-pulse"></div>
                    </div>
                    <div className="shrink-0 space-y-2 flex flex-col items-end">
                      <div className="w-16 h-3 bg-slate-200 rounded-full animate-pulse"></div>
                      <div className="w-12 h-2.5 bg-slate-100 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
              ))
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400 font-medium bg-white rounded-[20px] border border-slate-100 border-dashed">
                Belum ada transaksi di tab ini.
              </div>
            ) : (
              filteredHistory.map((item) => {
                const statusUI = getStatusUI(item.status);
                const StatusIcon = statusUI.icon;

                return (
                  <div 
                    key={item.id}
                    className="bg-white p-4 rounded-[20px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer hover:border-teal-100"
                  >
                    <div className="flex items-center space-x-4">
                      {/* ICON BOX */}
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0">
                        {item.type === 'topup' ? <Plus className="w-6 h-6 text-emerald-500" /> : 
                         item.type === 'withdraw' ? <MinusCircle className="w-6 h-6 text-rose-500" /> : 
                         <ReceiptText className="w-5 h-5 text-teal-500" />}
                      </div>
                      
                      {/* TEKS INFO */}
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-bold text-slate-800 text-[14px] line-clamp-1">{item.title}</h3>
                          {item.duration && (
                            <span className="text-[9px] bg-teal-50 text-teal-600 border border-teal-100 px-1.5 py-0.5 rounded-md font-bold whitespace-nowrap">
                              {item.duration}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-medium text-slate-500 mt-0.5">{formatDate(item.date)}</p>
                      </div>
                    </div>

                    {/* STATUS & HARGA */}
                    <div className="text-right shrink-0 pl-2">
                      <p className={`font-extrabold text-[14px] ${item.type === 'topup' ? 'text-emerald-500' : 'text-slate-800'}`}>
                        {item.type === 'topup' ? '+' : ''}{formatRupiah(item.amount)}
                      </p>
                      <div className="flex items-center justify-end space-x-1 mt-1">
                        <StatusIcon className={`w-3.5 h-3.5 ${statusUI.color}`} />
                        <span className={`text-[10px] font-bold uppercase ${statusUI.color}`}>{item.status}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default HistoryPage;