import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Klien VIP untuk menembus RLS dan update saldo/status
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    // 1. Tangkap surat cinta (payload) dari Xendit
    const payload = await request.json();
    console.log("Notifikasi Xendit Masuk:", payload);

    // 2. Pastikan statusnya BENAR-BENAR DIBAYAR
    if (payload.status === 'PAID' || payload.status === 'SETTLED') {
      const transactionId = payload.external_id; // Ini ID UUID kita

      // =================================================================
      // 🕵️‍♂️ MISI 1: CEK APAKAH INI TRANSAKSI SEWA BARANG?
      // =================================================================
      const { data: rentalData } = await supabaseAdmin
        .from('transactions')
        .select('id, status')
        .eq('id', transactionId)
        .single();

      if (rentalData) {
        // Jika ketemu di tabel transactions, ubah statusnya jadi Lunas!
        if (rentalData.status === 'Menunggu Pembayaran' || rentalData.status === 'menunggu') {
          await supabaseAdmin
            .from('transactions')
            .update({ status: 'Lunas' })
            .eq('id', transactionId);
            
          console.log(`✅ BERHASIL! Transaksi Sewa ${transactionId} menjadi Lunas`);
        }
        return NextResponse.json({ success: true, message: "Webhook Sewa Berhasil Diproses" });
      }


      // =================================================================
      // 🕵️‍♂️ MISI 2: KALAU BUKAN SEWA, APAKAH INI TOP UP WALLET?
      // =================================================================
      const { data: walletData } = await supabaseAdmin
        .from('wallet_transactions')
        .select('user_id, amount, status')
        .eq('id', transactionId)
        .single();

      if (walletData) {
        // Jika ketemu di tabel wallet_transactions, tambahkan saldonya!
        if (walletData.status === 'pending') {
          // A. Cek saldo saat ini
          const { data: profileData } = await supabaseAdmin
            .from('profiles')
            .select('balance')
            .eq('id', walletData.user_id)
            .single();

          const currentBalance = profileData?.balance || 0;
          const newBalance = currentBalance + walletData.amount;

          // B. Update saldo baru
          await supabaseAdmin
            .from('profiles')
            .update({ balance: newBalance })
            .eq('id', walletData.user_id);

          // C. Ubah status transaksi jadi 'success'
          await supabaseAdmin
            .from('wallet_transactions')
            .update({ 
              status: 'success',
              payment_channel: payload.payment_channel || payload.payment_method || 'Sistem Pembayaran'
            })
            .eq('id', transactionId);

          console.log(`✅ BERHASIL! Top up Rp${walletData.amount} masuk ke akun ${walletData.user_id}`);
        }
        return NextResponse.json({ success: true, message: "Webhook Top Up Berhasil Diproses" });
      }

      // Jika ID tidak ditemukan di kedua tabel
      return NextResponse.json({ message: "ID Transaksi tidak dikenali di database" });
    }

    // Beri tahu Xendit kalau pesannya sudah diterima (tapi belum dibayar)
    return NextResponse.json({ success: true, message: "Webhook diterima (Status bukan PAID)" });

  } catch (error) {
    console.error("Webhook Error Fatal:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}