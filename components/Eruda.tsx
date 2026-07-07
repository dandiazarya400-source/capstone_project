"use client";

import { useEffect, useState } from 'react';
import Script from 'next/script';

export default function Eruda() {
  // 🌟 STATE BARU: Untuk menahan render sampai komponen benar-benar masuk ke browser
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // useEffect HANYA berjalan di Client/Browser. 
    // Jadi saat ini tereksekusi, kita tahu aman untuk memunculkan Script.
    setIsMounted(true);
  }, []);

  // Tahan prosesnya jika belum masuk browser ATAU jika ini adalah server Production (Vercel)
  if (!isMounted || process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Script 
      src="https://cdn.jsdelivr.net/npm/eruda" 
      strategy="lazyOnload" 
      onLoad={() => {
        if (typeof window !== 'undefined' && (window as any).eruda) {
          (window as any).eruda.init();
        }
      }} 
    />
  );
}