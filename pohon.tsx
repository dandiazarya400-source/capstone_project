import React from 'react';

const EtherealTreeHero = () => {
  return (
    <div className="relative min-h-screen bg-[#030712] flex items-center justify-center overflow-hidden font-sans">
      
      {/* Latar Belakang Gambar & Overlay Gelap */}
      {/* Catatan: Ganti 'url_gambar_anda.png' dengan path/URL gambar pohon magis tersebut */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-50"
        style={{ backgroundImage: `url('/url_gambar_anda.png')` }}
      />
      
      {/* Gradasi untuk memperhalus transisi dari gambar ke latar belakang gelap */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-[#030712]/70 to-[#030712]" />

      {/* Simulasi Partikel Cahaya (Kunang-kunang/Spora Biru) */}
      <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-300 rounded-full blur-[2px] animate-pulse" />
      <div className="absolute top-1/2 right-1/3 w-3 h-3 bg-blue-100 rounded-full blur-[3px] animate-pulse delay-700" />
      <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-yellow-200 rounded-full blur-[1px] animate-pulse delay-1000" />

      {/* Konten Utama (UI) */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center max-w-4xl mx-auto mt-32">
        
        {/* Tipografi dengan efek pendaran (glow) */}
        <h1 className="text-5xl md:text-7xl font-semibold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-100 via-blue-200 to-white drop-shadow-[0_0_25px_rgba(162,210,255,0.7)] mb-6">
          Akar Keabadian
        </h1>
        
        <p className="text-lg md:text-xl text-blue-100/80 leading-relaxed mb-10 font-light drop-shadow-md">
          Temukan keseimbangan antara energi kuno dan ketenangan abadi. 
          Pohon pendar ini merepresentasikan kehidupan yang terus tumbuh di tengah gulita, 
          memancarkan harapan bagi mereka yang menjelajahi hutan tanpa akhir.
        </p>

        {/* Tombol Interaktif dengan efek Glassmorphism & Hover */}
        <div className="flex gap-4">
          <button className="px-8 py-3 rounded-full bg-blue-900/30 border border-blue-400/50 text-blue-50 font-medium tracking-wide backdrop-blur-md transition-all duration-300 hover:bg-blue-400 hover:text-[#030712] hover:shadow-[0_0_30px_rgba(162,210,255,0.6)] focus:outline-none focus:ring-2 focus:ring-blue-300">
            Jelajahi Hutan
          </button>
          
          <button className="px-8 py-3 rounded-full bg-transparent border-none text-blue-200/70 font-medium tracking-wide transition-all duration-300 hover:text-white hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] focus:outline-none">
            Pelajari Mitosnya
          </button>
        </div>

      </div>

      {/* Dekorasi Bagian Bawah (opsional untuk efek kabut/tanah) */}
      <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-[#030712] to-transparent z-10" />
    </div>
  );
};

export default EtherealTreeHero;