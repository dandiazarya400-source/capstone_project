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
    <div className="h-full w-full overflow-y-auto overflow-x-hidden bg-fluent-bg text-text-main pb-32 scrollbar-hide">
      
      <header className="absolute top-0 left-0 w-full bg-fluent-bg/95 backdrop-blur-md z-50 px-6 py-4 md:pt-12 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={() => router.back()} className="text-text-main hover:text-fluent-accent transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold tracking-tight">History</h1>
          </div>
          <button className="p-2 bg-fluent-card rounded-full border border-white/5">
            <Search className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        <div className="flex space-x-3 mt-6">
          <button className="px-4 py-1.5 bg-fluent-accent text-white rounded-full text-xs font-bold shadow-lg shadow-fluent-accent/20">
            Semua
          </button>
          <button className="px-4 py-1.5 bg-fluent-card text-text-muted border border-white/5 rounded-full text-xs font-medium">
            Berlangsung
          </button>
          <button className="px-4 py-1.5 bg-fluent-card text-text-muted border border-white/5 rounded-full text-xs font-medium">
            Selesai
          </button>
        </div>
      </header>

      <main className="px-4 mt-40">
        <section className="mb-6">
          <div className="flex items-center space-x-2 mb-4 px-2">
            <Calendar className="w-4 h-4 text-fluent-accent" />
            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Riwayat Transaksi</span>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-10 text-xs text-text-muted">Memuat data...</div>
            ) : historyItems.length === 0 ? (
              <div className="text-center py-10 text-xs text-text-muted">Belum ada transaksi.</div>
            ) : (
              historyItems.map((item) => (
                <div 
                  key={item.id}
                  className="bg-fluent-card p-4 rounded-fluent-rounded border border-white/5 shadow-md flex items-center justify-between group active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner shrink-0">
                      {item.type === 'topup' ? <Plus className="w-5 h-5 text-emerald-400" /> : 
                       item.type === 'withdraw' ? <MinusCircle className="w-5 h-5 text-rose-400" /> : 
                       <ReceiptText className="w-5 h-5 text-fluent-accent" />}
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-1">
                        <h3 className="font-bold text-text-main text-sm line-clamp-1">{item.title}</h3>
                        {item.duration && (
                          <span className="text-[10px] bg-fluent-accent/20 text-fluent-accent px-1.5 py-0.5 rounded-md font-bold whitespace-nowrap">
                            {item.duration}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-text-muted mt-0.5">{formatDate(item.date)}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`font-extrabold text-sm ${item.type === 'topup' ? 'text-emerald-400' : 'text-text-main'}`}>
                      {item.type === 'topup' ? '+' : ''}{formatRupiah(item.amount)}
                    </p>
                    <div className="flex items-center justify-end space-x-1 mt-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span className="text-[10px] font-bold text-emerald-400 uppercase">{item.status}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <div className="py-12 flex flex-col items-center justify-center opacity-20">
            <Clock className="w-12 h-12 mb-2" />
            <p className="text-xs">Tidak ada riwayat lama</p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default HistoryPage;