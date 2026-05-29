import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marketplace Rental Alat",
  description: "Aplikasi penyewaan alat musik dan panggung",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-[#0B0416] flex justify-center items-center h-[100dvh] w-screen overflow-hidden">
        
        {/* Pindahkan script ke sini agar valid secara HTML */}
        <script src="https://cdn.jsdelivr.net/npm/eruda"></script>
        <script dangerouslySetInnerHTML={{ __html: 'eruda.init();' }} />

        {/* Wrapper ini kita buat flex-1 agar dia mengisi ruang yang tersedia 
            dengan aman di mobile.
        */}
        <div className="relative w-full h-full md:w-[390px] md:h-[90vh] md:max-h-[850px] 
                        md:rounded-[3rem] md:border-[12px] md:border-[#1E1E2E] 
                        md:shadow-[0_0_60px_-10px_rgba(163,116,255,0.25)] bg-fluent-bg overflow-hidden">
          
          {/* Poni Kamera */}
          <div className="hidden md:flex absolute top-2 inset-x-0 justify-center z-50 pointer-events-none">
            <div className="w-28 h-7 bg-black rounded-full"></div>
          </div>

          {/* Konten Aplikasi - Tambahkan flex flex-col untuk keamanan */}
          <div className="w-full h-full relative flex flex-col">
            {children}
          </div>

          {/* Garis Home Bawah */}
          <div className="hidden md:flex absolute bottom-2 inset-x-0 justify-center z-50 pointer-events-none">
            <div className="w-1/3 h-1.5 bg-white/20 rounded-full"></div>
          </div>

        </div>
      </body>
    </html>
  );
}