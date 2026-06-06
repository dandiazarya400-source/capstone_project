import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Pastikan path ini sesuai dengan file supabase-mu

export async function POST(request: Request) {
  try {
    // 1. Tangkap data dari frontend
    const body = await request.json();
    const { itemId, tenantId, startDate, endDate, totalPayment, deliveryMethod, quantity } = body;

    // 2. Buat ID Pesanan Unik (misal: INV-168901234-USER1)
    const orderId = `INV-${Date.now()}`;

    // 3. Siapkan Autentikasi Xendit (Encode Secret Key ke Base64)
    const xenditKey = Buffer.from(process.env.XENDIT_SECRET_KEY + ':').toString('base64');

    // 4. Minta Link Pembayaran ke Xendit
    const xenditResponse = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${xenditKey}`
      },
      body: JSON.stringify({
        external_id: orderId,
        amount: totalPayment,
        description: `Sewa Alat - Invoice ${orderId}`,
        invoice_duration: 86400, // Kadaluarsa dalam 24 Jam
        success_redirect_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payment/success`,
        failure_redirect_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payment/failed`,
      })
    });

    const xenditData = await xenditResponse.json();

    if (!xenditResponse.ok) {
      throw new Error(xenditData.message || "Gagal membuat invoice Xendit");
    }

    // 5. Simpan ke Database Supabase (Status: 'menunggu')
    const { error: dbError } = await supabase.from('transactions').insert([{
      id: orderId, // Gunakan ID dari kita
      tenant_id: tenantId,
      item_id: itemId,
      start_date: startDate,
      end_date: endDate,
      total_price: totalPayment,
      delivery_method: deliveryMethod,
      quantity: quantity,
      status: 'menunggu',
      payment_url: xenditData.invoice_url // 🌟 Simpan link Xendit-nya!
    }]);

    if (dbError) throw dbError;

    // 6. Kembalikan Link Xendit ke Frontend
    return NextResponse.json({ 
      success: true, 
      invoiceUrl: xenditData.invoice_url 
    });

  } catch (error: any) {
    console.error("API Checkout Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}