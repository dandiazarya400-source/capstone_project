import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Klien VIP untuk menembus RLS dan update saldo
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
      const transactionId = payload.external_id; // Ini ID UUID yang kita buat kemarin

      // 3. Cari transaksi top up di database berdasarkan ID tersebut
      const { data: trxData, error: trxError } = await supabaseAdmin
        .from('wallet_transactions')
        .select('user_id, amount, status')
        .eq('id', transactionId)
        .single();

      // Kalau tidak ketemu, mungkin itu tagihan sewa alat (bukan top up)
      if (trxError || !trxData) {
        return NextResponse.json({ message: "Bukan tagihan top up" });
      }

      // 4. Momen Kritis: Tambahkan Saldonya! (Hanya jika statusnya masih pending)
      if (trxData.status === 'pending') {
        
        // A. Cek saldo dompet user saat ini
        const { data: profileData } = await supabaseAdmin
          .from('profiles')
          .select('balance')
          .eq('id', trxData.user_id)
          .single();

        const currentBalance = profileData?.balance || 0;
        const newBalance = currentBalance + trxData.amount;

        // B. Update saldo baru ke tabel profiles
        await supabaseAdmin
          .from('profiles')
          .update({ balance: newBalance })
          .eq('id', trxData.user_id);

        // C. Ubah status transaksi jadi 'success' agar tidak di-topup 2 kali
        await supabaseAdmin
          .from('wallet_transactions')
          .update({ status: 'success' })
          .eq('id', transactionId);

        console.log(`✅ BERHASIL! Top up Rp${trxData.amount} masuk ke akun ${trxData.user_id}`);
      }
    }

    // Beri tahu Xendit kalau pesannya sudah kita terima
    return NextResponse.json({ success: true, message: "Webhook diterima" });

  } catch (error) {
    console.error("Webhook Error Fatal:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}