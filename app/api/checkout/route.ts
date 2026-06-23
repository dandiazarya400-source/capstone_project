import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js'; // 🌟 Kita import langsung dari supabase-js
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { itemId, tenantId, startDate, endDate, totalPayment, deliveryMethod, quantity } = body;

    const orderId = randomUUID();

    // 🌟 DETEKSI DOMAIN OTOMATIS (Bisa Localhost, bisa Vercel)
    const origin = request.headers.get('origin') || 'https://pinjamdong.vercel.app';



    // 🌟 BIKIN KLIEN SUPER ADMIN (Pegang Kunci Master untuk Tembus RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Menggunakan Kunci Dewa
    );

    // Siapkan Autentikasi Xendit
    const xenditKey = Buffer.from(process.env.XENDIT_SECRET_KEY + ':').toString('base64');

    // Minta Link Pembayaran ke Xendit
    const xenditResponse = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${xenditKey}`
      },
      body: JSON.stringify({
        external_id: orderId, 
        amount: totalPayment,
        description: `Sewa Alat - Transaksi ${orderId.split('-')[0]}`,
        invoice_duration: 86400, 
        
        // 🌟 GUNAKAN DOMAIN OTOMATIS YANG SUDAH DITANGKAP
        success_redirect_url: `${origin}/payment/success?order_id=${orderId}`,
        failure_redirect_url: `${origin}/payment/failed`,
      })
    });

    const xenditData = await xenditResponse.json();

    if (!xenditResponse.ok) {
      throw new Error(xenditData.message || "Gagal membuat invoice Xendit");
    }

    // 🌟 SIMPAN KE DATABASE MENGGUNAKAN supabaseAdmin (Bukan supabase biasa)
    const { error: dbError } = await supabaseAdmin.from('transactions').insert([{
      id: orderId, 
      tenant_id: tenantId,
      item_id: itemId,
      start_date: startDate,
      end_date: endDate,
      total_price: totalPayment,
      delivery_method: deliveryMethod,
      quantity: quantity,
      status: 'Menunggu Pembayaran'
    }]);

    if (dbError) {
      console.error("CCTV DB Error:", dbError);
      throw dbError;
    }

    return NextResponse.json({ 
      success: true, 
      invoiceUrl: xenditData.invoice_url 
    });

  } catch (error: any) {
    console.error("API Checkout Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}