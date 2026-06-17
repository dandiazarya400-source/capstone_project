"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Search, Plus, ReceiptText, 
  CheckCircle2, Clock, Calendar, MinusCircle
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/lib/supabase';

const HistoryPage = () => {
  const router = useRouter();
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Format Rupiah
  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };

  // Format Tanggal (Contoh: 04 Jul 2025 18:52)
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

        // 1. Ambil Riwayat Isi Saldo / Penarikan
        const { data: walletData } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('user_id', userId);

        // 2. Ambil Riwayat Sewa Barang (Join dengan tabel items)
        const { data: rentalData } = await supabase
          .from('transactions')
          .select('*, items(name)')
          .eq('tenant_id', userId);

        // 3. Normalisasi & Gabungkan Data
        let combinedData: any[] = [];

        if (walletData) {
          const formattedWallet = walletData.map(w => ({
            id: `wallet-${w.id}`,
            type: w.type, // 'topup' atau 'withdraw'
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
            // Hitung durasi hari
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

        // 4. Urutkan dari yang paling baru
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

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-[#F2FDFB] text-slate-800">
      
      {/* ================= HEADER ================= */}
      <header className="bg-white px-5 pt-12 pb-4 flex flex-col gap-4 sticky top-0 z-50 rounded-b-[30px] shadow-[0_8px_30px_rgba(0,0,0,0.03)] border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.back()} 
              className="w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </button>
            <h1 className="text-[19px] font-black tracking-tight text-slate-800">Riwayat</h1>
          </div>
          
          <button className="w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-600">
            <Search className="w-5 h-5" />
          </button>
        </div>

        {/* TABS FILTER */}
        <div className="flex gap-2">
          <button className="px-5 py-2 rounded-full text-[13px] font-bold transition-all duration-300 bg-teal-500 text-white shadow-md shadow-teal-500/20">
            Semua
          </button>
          <button className="px-5 py-2 rounded-full text-[13px] font-bold transition-all duration-300 bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100">
            Berlangsung
          </button>
          <button className="px-5 py-2 rounded-full text-[13px] font-bold transition-all duration-300 bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100">
            Selesai
          </button>
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
              <div className="text-center py-10 text-xs text-slate-400 font-medium">Memuat data...</div>
            ) : historyItems.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400 font-medium">Belum ada transaksi.</div>
            ) : (
              historyItems.map((item) => (
                <div 
                  key={item.id}
                  className="bg-white p-4 rounded-[20px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center justify-between group active:scale-[0.98] transition-all"
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
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-[10px] font-bold text-emerald-500 uppercase">{item.status}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* EMPTY STATE BAWAH */}
        <div className="py-8 flex flex-col items-center justify-center text-slate-300">
            <Clock className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-[11px] font-medium">Tidak ada riwayat lama</p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default HistoryPage;