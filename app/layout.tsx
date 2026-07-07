import type { Metadata } from "next";
// 🌟 1. Import font elegan dari Google Fonts
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// 🌟 PERBAIKAN 1: Import Eruda dari folder components (menggunakan alias @ jika komandan pakai alias, atau ../)
import Eruda from '@/components/Eruda'; 

// 🌟 2. Konfigurasi Font
const jakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  title: "Marketplace Rental Alat",
  description: "Aplikasi penyewaan alat musik dan panggung",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      {/* 🌟 3. Sisipkan jakarta.className dan antialiased ke dalam body tanpa menghapus class aslimu */}
      <body className={`${jakarta.className} antialiased bg-[#0B0416] flex justify-center items-center h-[100dvh] w-screen overflow-hidden`}>
        
        {/* 🌟 PERBAIKAN 2: Blok <Script> lama SUDAH DIHAPUS dari sini agar tidak error merah */}

        {/* 🌟 4. Ubah bg-background menjadi bg-slate-50 agar temanya jadi putih bersih */}
        <div className="relative w-full h-full md:w-[390px] md:h-[90vh] md:max-h-[850px] 
                        md:rounded-[3rem] md:border-[12px] md:border-[#1E1E2E] 
                        md:shadow-[0_0_60px_-10px_rgba(163,116,255,0.25)] bg-slate-50 overflow-hidden">
          
          {/* Poni Kamera */}
          <div className="hidden md:flex absolute top-2 inset-x-0 justify-center z-50 pointer-events-none">
            <div className="w-28 h-7 bg-black rounded-full"></div>
          </div>

          {/* Konten Aplikasi - Tambahkan flex flex-col untuk keamanan */}
          <div className="w-full h-full relative flex flex-col">
            {children}
          </div>

          {/* Garis Home Bawah (Diubah warnanya jadi abu-abu agar kelihatan di background putih) */}
          <div className="hidden md:flex absolute bottom-2 inset-x-0 justify-center z-50 pointer-events-none">
            <div className="w-1/3 h-1.5 bg-slate-300 rounded-full"></div>
          </div>

        </div>
        
        {/* 🌟 PERBAIKAN 3: Panggilan komponen Eruda yang sudah aman ditaruh di sini */}
        <Eruda />
        
      </body>
    </html>
  );
}