import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js'; // 🌟 KITA PANGGIL KLIEN ASLI

// 🌟 BUAT KLIEN SUPABASE VIP (MENEMBUS RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { userId, amount } = await request.json();

    if (!userId || !amount || amount < 10000) {
      throw new Error("Minimal top up adalah Rp 10.000");
    }

    // 1. Buat ID Top Up Unik format UUID
    const topupId = crypto.randomUUID();

    // 2. Siapkan Autentikasi Xendit
    const xenditKey = Buffer.from(process.env.XENDIT_SECRET_KEY + ':').toString('base64');

    // 3. Minta Link Pembayaran ke Xendit
    const xenditResponse = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${xenditKey}`
      },
      body: JSON.stringify({
        external_id: topupId,
        amount: amount,
        description: `Top Up Saldo Pinjam Dong`,
        invoice_duration: 86400,
        success_redirect_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/wallet/success`,
        failure_redirect_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/wallet/failed`,
      })
    });

    const xenditData = await xenditResponse.json();

    if (!xenditResponse.ok) {
      throw new Error(xenditData.message || "Gagal membuat invoice Top Up");
    }

    // 4. Catat riwayat Top Up ke Supabase pakai KLIEN VIP!
    const { error: dbError } = await supabaseAdmin
      .from('wallet_transactions')
      .insert([{
        id: topupId,
        user_id: userId,
        amount: amount,
        type: 'topup', // 🌟 Tadi ini ketinggalan!
        status: 'pending',
        payment_url: xenditData.invoice_url
      }]);

    if (dbError) throw dbError;

    // 5. Kembalikan Link Pembayaran ke Frontend
    return NextResponse.json({ success: true, invoiceUrl: xenditData.invoice_url });

  } catch (error: any) {
    console.error("API Topup Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}