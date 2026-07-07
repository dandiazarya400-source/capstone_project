"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, MapPin, Phone, User, Save, CheckCircle2, Camera, Loader2, Crop, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Cropper from 'react-easy-crop';
import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('@/components/MapPicker'), { 
  ssr: false,
  loading: () => <div className="w-full h-[250px] bg-primary/5 animate-pulse rounded-2xl flex items-center justify-center text-primary/50 text-xs font-bold border border-primary/10">Memuat Satelit Peta...</div>
});

// FUNGSI UTILITY: Mengubah Canvas menjadi File
const getCroppedImg = (imageSrc: string, pixelCrop: any) => {
  const image = new Image();
  image.src = imageSrc;
  return new Promise<Blob>((resolve, reject) => {
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject();

      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      ctx.drawImage(
        image,
        pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
        0, 0, pixelCrop.width, pixelCrop.height
      );

      canvas.toBlob((blob) => {
        if (!blob) return reject();
        resolve(blob);
      }, 'image/jpeg');
    };
    image.onerror = reject;
  });
};

const EditProfileContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next');

  const [ktpStatus, setKtpStatus] = useState('unverified');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 1. GHOST CACHE: State Form langsung diisi dari memori (0 milidetik)
  const [formData, setFormData] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('edit_profile_cache');
      if (cached) return JSON.parse(cached);
      
      // Jika belum ada cache edit, coba tarik dari cache profil utama
      const mainProfile = localStorage.getItem('user_profile_cache');
      if (mainProfile) {
        const parsed = JSON.parse(mainProfile);
        return { full_name: parsed.full_name || '', phone_number: '', address: '', avatar_url: parsed.avatar_url || '' };
      }
    }
    return { full_name: '', phone_number: '', address: '', avatar_url: '' };
  });

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // State untuk anti-hydration mismatch Next.js
  const [isMounted, setIsMounted] = useState(false);

  // ================= STATE UNTUK FITUR CROP =================
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null); 
  const [crop, setCrop] = useState({ x: 0, y: 0 }); 
  const [zoom, setZoom] = useState(1); 
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null); 

  // ================= BACA DATA PROFIL =================
  useEffect(() => {
    setIsMounted(true); // Aman untuk dirender

    const fetchUserData = async () => {
      // INSTAN: Gunakan getSession
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.push('/login'); return; }
      
      const currentUserId = session.user.id;
      setUserId(currentUserId);
      
      // Tarik data terbaru dari DB di belakang layar
      const { data, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, phone_number, address, avatar_url, verification_status') 
          .eq('id', currentUserId)
          .maybeSingle();
      if (data) { 
        setKtpStatus(data.verification_status || 'unverified');
        const freshData = { 
          full_name: data.full_name || '', 
          phone_number: data.phone_number || '', 
          address: data.address || '', 
          avatar_url: data.avatar_url || '' 
        };
        setFormData(freshData); 
        localStorage.setItem('edit_profile_cache', JSON.stringify(freshData)); // Simpan ke cache edit
      }
    };
    fetchUserData();
  }, [router]);

  // ================= 1. SAAT GAMBAR DIPILIH =================
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => { setImageToCrop(reader.result as string); };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // ================= 2. SAAT KLIK "TERAPKAN" DI MODAL CROP =================
  const handleCropSaveAndUpload = async () => {
    if (!imageToCrop || !croppedAreaPixels || !userId) return;

    try {
      setUploadingImage(true);
      setImageToCrop(null); 

      const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      const fileName = `${userId}-${Math.random()}.jpg`;
      const croppedFile = new File([croppedBlob], fileName, { type: 'image/jpeg' });

      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, croppedFile);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setFormData({ ...formData, avatar_url: data.publicUrl });

    } catch (error: any) {
      console.error('Error saat crop/upload:', error);
      alert('Gagal memproses gambar. Pastikan formatnya benar.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = ''; 
    }
  };

  // ================= 3. SIMPAN DATA PROFIL =================
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({ 
        full_name: formData.full_name, 
        phone_number: formData.phone_number, 
        address: formData.address, 
        avatar_url: formData.avatar_url 
      }).eq('id', userId);
      if (error) throw error;
      
      // SINKRONISASI CACHE SUPER CEPAT:
      // 1. Simpan ke cache Edit Profil
      localStorage.setItem('edit_profile_cache', JSON.stringify(formData));
      
      // 2. Simpan juga ke cache Halaman Profil Utama, agar saat "router.push" nanti, foto/nama langsung berubah!
      const mainProfileStr = localStorage.getItem('user_profile_cache');
      if (mainProfileStr) {
        const mainProfile = JSON.parse(mainProfileStr);
        mainProfile.full_name = formData.full_name;
        mainProfile.avatar_url = formData.avatar_url;
        localStorage.setItem('user_profile_cache', JSON.stringify(mainProfile));
      }

      setSuccess(true);
      setTimeout(() => { 
        setSuccess(false); 
        
        // 🌟 LOGIKA RANTAI KYC (KYC CHAINING)
        if (ktpStatus === 'unverified' || ktpStatus === 'rejected') {
          // Jika KTP belum kelar, oper ke halaman Verify beserta surat jalannya!
          router.push(`/verify${nextUrl ? `?next=${encodeURIComponent(nextUrl)}` : ''}`);
        } else if (nextUrl) {
          // Jika KTP sudah aman, kembalikan ke Halaman Produk!
          router.push(nextUrl);
        } else {
          // Jika tidak ada surat jalan (user mengedit profil secara manual), kembalikan ke profil
          router.push('/profile'); 
        }
      }, 1500);

    // 🌟 INI DIA YANG HILANG KOMANDAN! (Penutup try, catch, finally, dan penutup fungsi)
    } catch (error) { 
      console.error('Gagal menyimpan:', error); 
      alert('Terjadi kesalahan saat menyimpan profil.'); 
    } finally { 
      setLoading(false); 
    }
  };

  // Sembunyikan UI dalam hitungan milidetik untuk mencegah Hydration Mismatch
  if (!isMounted) return null;

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-background text-main overflow-hidden relative animate-in fade-in duration-300">
      {/* ================= HEADER DINAMIS (STEPPER / NORMAL) ================= */}
      {nextUrl ? (
        // 🌟 TAMPILAN STEPPER (JIKA MAU SEWA BARANG)
        <header className="w-full bg-white/95 backdrop-blur-md z-40 px-5 pt-12 pb-4 flex flex-col border-b border-slate-100 shrink-0 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => router.back()} className="p-1.5 -ml-1.5 bg-slate-50 text-slate-500 rounded-full hover:bg-slate-100 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-teal-500 uppercase tracking-widest">Langkah 1 dari 2</span>
              <h1 className="text-[16px] font-bold text-slate-800 leading-tight">Lengkapi Profil</h1>
            </div>
          </div>
          {/* Progress Bar Visual */}
          <div className="w-full flex gap-1.5">
            <div className="h-1.5 flex-[1] bg-teal-500 rounded-full shadow-[0_0_10px_rgba(20,184,166,0.4)]"></div>
            <div className="h-1.5 flex-[1] bg-slate-100 rounded-full"></div>
          </div>
        </header>
      ) : (
        // 🌟 TAMPILAN NORMAL (JIKA HANYA EDIT PROFIL BIASA)
        <header className="w-full bg-background/95 backdrop-blur-md z-40 px-5 py-4 md:pt-12 pt-6 flex items-center border-b border-primary/10 shrink-0">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold ml-2">Atur Profil</h1>
        </header>
      )}

      {/* ================= NOTIFIKASI MELAYANG (TOAST) DI ATAS ================= */}
      <div className="absolute top-20 md:top-28 left-0 w-full flex justify-center z-50 pointer-events-none px-4">
        {success && (
          <div className="flex items-center gap-2 bg-[#1a2e23]/90 backdrop-blur-md border border-green-500/30 text-green-400 px-4 py-2.5 rounded-full shadow-lg shadow-green-500/20 animate-in slide-in-from-top-5 fade-in duration-300">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-[11px] font-bold tracking-wide">Profil diperbarui!</span>
          </div>
        )}
      </div>

      <main className="flex-1 overflow-y-auto px-5 pt-6 pb-10 scrollbar-hide">
        
        {/* ================= TOMBOL UPLOAD FOTO PROFIL ================= */}
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="relative w-28 h-28 rounded-full ring-2 ring-primary ring-offset-4 ring-offset-fluent-bg bg-surface shadow-lg flex items-center justify-center overflow-hidden group">
            {uploadingImage ? (
              <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
            ) : formData.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-12 h-12 text-muted/50" />
            )}
            
            <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10">
              <Camera className="w-6 h-6 text-white mb-1" />
              <span className="text-[9px] font-bold text-white uppercase tracking-wider">Ubah</span>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} disabled={uploadingImage} />
            </label>
          </div>
          <p className="text-[10px] text-muted mt-4 font-medium uppercase tracking-widest">Ketuk untuk menyesuaikan profil</p>
        </div>

        {/* ================= FORM BIODATA ================= */}
        <form onSubmit={handleSave} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted uppercase ml-1 tracking-wider">Nama Lengkap</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-primary" />
              <input type="text" placeholder="Masukkan nama" required className="w-full bg-surface border border-primary/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:border-primary/50 transition-all shadow-inner" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted uppercase ml-1 tracking-wider">Nomor WhatsApp</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-primary" />
              <input 
                type="tel" 
                placeholder="0895-xxxx-xxxx" 
                required 
                className="w-full bg-surface border border-primary/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:border-primary/50 transition-all shadow-inner" 
                value={formData.phone_number} 
                onChange={(e) => {
                  // 🌟 1. Bersihkan: Hapus paksa semua karakter yang BUKAN angka (mencegah huruf masuk)
                  const onlyNumbers = e.target.value.replace(/\D/g, '');
                  
                  // 🌟 2. Format: Tambahkan strip (-) setiap 4 angka berturut-turut
                  const formattedNumber = onlyNumbers.replace(/(\d{4})(?=\d)/g, '$1-');
                  
                  // 🌟 3. Batasi panjang maksimal (misal 15 karakter = 12 angka + 3 strip, khas nomor Indonesia)
                  const finalNumber = formattedNumber.substring(0, 16);
                  
                  // 4. Simpan ke state
                  setFormData({...formData, phone_number: finalNumber});
                }} 
              />
            </div>
          </div>
          {/* ================= ALAMAT PENGIRIMAN & PETA ================= */}
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-end ml-1">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Titik Lokasi Pengiriman</label>
              <span className="text-[9px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full animate-pulse">Klik Peta ⬇️</span>
            </div>
            
            {/* 🌟 RENDER PETA DI SINI */}
            <MapPicker 
              onLocationSelect={(address) => setFormData({...formData, address})} 
            />

            <div className="relative mt-2">
              <MapPin className="absolute left-4 top-3.5 w-4.5 h-4.5 text-primary" />
              <textarea 
                rows={3} 
                required 
                className="w-full bg-surface border border-primary/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-all shadow-inner resize-none text-main leading-relaxed" 
                value={formData.address} 
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                placeholder="Klik titik lokasimu di peta atas, atau ketik alamat manual di sini..."
              ></textarea>
            </div>
          </div>
          <button type="submit" disabled={loading || uploadingImage} className="w-full mt-4 bg-primary text-white text-sm font-bold py-4 rounded-2xl flex justify-center items-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90 hover:scale-[0.99] disabled:opacity-50 transition-all">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {loading ? 'Menyimpan...' : 'Simpan Profil'}
          </button>
        </form>
      </main>

      {/* ================= MODAL FULLSCREEN UNTUK CROP ================= */}
      {imageToCrop && (
        <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm p-6 flex flex-col animate-in fade-in duration-300">
          
          <div className="flex items-center justify-between mb-6 shrink-0 relative z-10 mt-6">
            <h3 className="text-base font-bold text-white flex items-center gap-2.5">
              <Crop className="w-5 h-5 text-primary" />
              Sesuaikan Foto
            </h3>
            <button onClick={() => setImageToCrop(null)} className="p-1.5 -mr-1.5 text-white/50 hover:text-rose-400 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 relative w-full bg-surface rounded-3xl border border-primary/10 shadow-2xl overflow-hidden mb-6">
            <Cropper
              image={imageToCrop}
              crop={crop}
              zoom={zoom}
              aspect={1} 
              cropShape="round" 
              showGrid={true}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              classes={{
                containerClassName: "bg-transparent",
                cropAreaClassName: "border-2 border-primary shadow-[0_0_20px_rgba(20,184,166,0.5)]"
              }}
            />
          </div>

          <div className="bg-surface/70 backdrop-blur-md p-6 rounded-3xl border border-primary/10 space-y-5 shrink-0 relative z-10 mb-6">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-muted uppercase tracking-widest pl-1">Perbesar / Perkecil</label>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-1.5 bg-background rounded-full appearance-none cursor-pointer accent-primary"
              />
            </div>

            <button 
              onClick={handleCropSaveAndUpload}
              disabled={uploadingImage}
              className="w-full bg-primary text-white text-sm font-bold py-3.5 rounded-2xl flex justify-center items-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-5 h-5" />
              Terapkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const EditProfilePage = () => {
  return (
    <Suspense 
      fallback={
        <div className="h-[100dvh] w-full flex items-center justify-center bg-[#0B0416] text-teal-500">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      }
    >
      <EditProfileContent />
    </Suspense>
  );
};

export default EditProfilePage;