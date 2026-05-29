"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Store, Clock, Phone, MapPin, Save, BadgeCheck, Camera, Loader2, Crop, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
// Pustaka crop foto (sama dengan profil user)
import Cropper from 'react-easy-crop';

// FUNGSI UTILITY CROP
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
      ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
      canvas.toBlob((blob) => {
        if (!blob) return reject();
        resolve(blob);
      }, 'image/jpeg');
    };
    image.onerror = reject;
  });
};

const AdminStoreSettings = () => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  // Simpan ID admin yang sedang login untuk keperluan update
  const [adminId, setAdminId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    store_name: '',
    phone_number: '',
    address: '',
    open_hours: '',
    avatar_url: '' // Avatar toko
  });

  // State Fitur Crop
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // ================= 1. BACA DATA ADMIN =================
  useEffect(() => {
    const fetchStoreData = async () => {
      try {
        // Ambil sesi user yang sedang login saat ini (Admin yang sedang buka HP ini)
        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user) {
          router.push('/login');
          return;
        }

        const currentUserId = authData.user.id;
        setAdminId(currentUserId);

        // Ambil data profilnya dari database 
        // Menggunakan .maybeSingle() agar aman dari error "0 rows"
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, phone_number, address, open_hours, avatar_url, is_admin')
          .eq('id', currentUserId)
          .maybeSingle();

        if (error) throw error;

        // Peringatan jika ternyata akun ini BUKAN admin
        if (data && !data.is_admin) {
          alert('Akun ini bukan admin!');
          router.push('/');
          return;
        }

        if (data) {
          setFormData({
            store_name: data.full_name || '', 
            phone_number: data.phone_number || '',
            address: data.address || '',
            open_hours: data.open_hours || '',
            avatar_url: data.avatar_url || ''
          });
        }
      } catch (error) {
        console.error("Gagal mengambil data toko:", error);
      }
    };

    fetchStoreData();
  }, [router]);

  // ================= 2. FUNGSI CROP FOTO TOKO =================
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

  const handleCropSaveAndUpload = async () => {
    if (!imageToCrop || !croppedAreaPixels || !adminId) return;
    try {
      setUploadingImage(true);
      setImageToCrop(null); 
      const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      // Nama unik file logo toko
      const fileName = `store-${adminId}-${Math.random()}.jpg`;
      const croppedFile = new File([croppedBlob], fileName, { type: 'image/jpeg' });
      
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, croppedFile);
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setFormData({ ...formData, avatar_url: data.publicUrl });
    } catch (error: any) {
      console.error('Error upload:', error);
      alert('Gagal memproses gambar logo toko.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = ''; 
    }
  };

  // ================= 3. SIMPAN DATA TOKO =================
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminId) return;
    setLoading(true);

    try {
      // Update profil berdasarkan ID admin yang sedang login
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.store_name, 
          phone_number: formData.phone_number,
          address: formData.address,
          open_hours: formData.open_hours,
          avatar_url: formData.avatar_url
        })
        .eq('id', adminId);

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Gagal menyimpan:', error);
      alert('Terjadi kesalahan saat menyimpan data toko.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-fluent-bg text-text-main overflow-hidden relative">
      <header className="w-full bg-fluent-bg/95 backdrop-blur-md z-40 px-5 py-4 md:pt-12 pt-6 flex items-center border-b border-white/5 shrink-0 relative">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold ml-2">Pengaturan Toko</h1>
      </header>

      {/* NOTIFIKASI TOAST */}
      <div className="absolute top-20 md:top-28 left-0 w-full flex justify-center z-50 pointer-events-none px-4">
        {success && (
          <div className="flex items-center gap-2 bg-[#1a2e23]/90 backdrop-blur-md border border-green-500/30 text-green-400 px-4 py-2.5 rounded-full shadow-lg shadow-green-500/20 animate-in slide-in-from-top-5 fade-in duration-300">
            <BadgeCheck className="w-4 h-4" />
            <span className="text-[11px] font-bold tracking-wide">Data Toko Diperbarui!</span>
          </div>
        )}
      </div>

      <main className="flex-1 overflow-y-auto px-5 pt-6 pb-10 scrollbar-hide relative z-10">
        
        {/* Banner Info */}
        <div className="bg-fluent-accent/10 border border-fluent-accent/20 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <BadgeCheck className="w-8 h-8 text-fluent-accent shrink-0" />
          <p className="text-[10px] text-text-main font-medium leading-relaxed">
            Data ini akan ditampilkan publik sebagai identitas resmi dan lokasi pengambilan barang.
          </p>
        </div>

        {/* FOTO LOGO TOKO */}
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="relative w-28 h-28 rounded-full ring-2 ring-fluent-accent ring-offset-4 ring-offset-fluent-bg bg-fluent-card shadow-lg shadow-fluent-accent/20 flex items-center justify-center overflow-hidden group cursor-pointer">
            {uploadingImage ? (
              <Loader2 className="w-10 h-10 animate-spin text-fluent-accent/50" />
            ) : formData.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={formData.avatar_url} alt="Logo Toko" className="w-full h-full object-cover" />
            ) : (
              <Store className="w-12 h-12 text-text-muted/50" />
            )}
            
            <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10">
              <Camera className="w-6 h-6 text-white mb-1" />
              <span className="text-[9px] font-bold text-white uppercase tracking-wider">Ubah</span>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} disabled={uploadingImage} />
            </label>
          </div>
          <p className="text-[10px] text-text-muted mt-4 font-medium uppercase tracking-widest">Logo Toko / Studio</p>
        </div>

        {/* FORM DATA TOKO */}
        <form onSubmit={handleSave} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase ml-1 tracking-wider">Nama Toko/Studio</label>
            <div className="relative">
              <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-fluent-accent" />
              <input type="text" required className="w-full bg-fluent-card border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-fluent-accent/50 transition-all shadow-inner font-bold text-text-main" value={formData.store_name} onChange={(e) => setFormData({...formData, store_name: e.target.value})} />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase ml-1 tracking-wider">Telepon Admin</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-fluent-accent" />
              <input type="tel" required className="w-full bg-fluent-card border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-fluent-accent/50 transition-all shadow-inner text-text-main" value={formData.phone_number} onChange={(e) => setFormData({...formData, phone_number: e.target.value})} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase ml-1 tracking-wider">Jam Operasional</label>
            <div className="relative">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-fluent-accent" />
              <input type="text" placeholder="09:00 - 21:00 WIB" required className="w-full bg-fluent-card border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-fluent-accent/50 transition-all shadow-inner text-text-main" value={formData.open_hours} onChange={(e) => setFormData({...formData, open_hours: e.target.value})} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase ml-1 tracking-wider">Alamat Lengkap Toko</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-3.5 w-4.5 h-4.5 text-fluent-accent" />
              <textarea rows={3} required className="w-full bg-fluent-card border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-fluent-accent/50 transition-all shadow-inner resize-none text-text-main" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})}></textarea>
            </div>
          </div>

          <button type="submit" disabled={loading || uploadingImage} className="w-full mt-2 bg-fluent-accent text-white text-sm font-bold py-4 rounded-2xl flex justify-center items-center gap-2 shadow-lg shadow-fluent-accent/30 hover:bg-[#b58eff] transition-all disabled:opacity-50">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {loading ? 'Menyimpan...' : 'Simpan Pengaturan Toko'}
          </button>
        </form>
      </main>

      {/* MODAL CROP (GLASSMORPHISM) */}
      {imageToCrop && (
        <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-md p-5 flex flex-col animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-6 shrink-0 relative z-10 pt-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Crop className="w-4 h-4 text-fluent-accent" />
              Sesuaikan Logo Toko
            </h3>
            <button onClick={() => setImageToCrop(null)} className="p-1 text-white/50 hover:text-rose-400 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 relative w-full bg-fluent-card rounded-2xl border border-white/5 shadow-2xl overflow-hidden mb-5">
            <Cropper image={imageToCrop} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={true} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} classes={{ containerClassName: "bg-transparent", cropAreaClassName: "border-2 border-fluent-accent shadow-[0_0_20px_rgba(163,116,255,0.6)]" }} />
          </div>
          <div className="bg-fluent-card/70 backdrop-blur-md p-5 rounded-2xl border border-white/5 space-y-4 shrink-0 relative z-10 mb-2">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest pl-1">Perbesar / Perkecil</label>
              <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className="w-full h-1.5 bg-fluent-bg rounded-full appearance-none cursor-pointer accent-fluent-accent" />
            </div>
            <button onClick={handleCropSaveAndUpload} disabled={uploadingImage} className="w-full bg-fluent-accent text-white text-sm font-bold py-3.5 rounded-2xl flex justify-center items-center gap-2 shadow-lg hover:bg-[#b58eff] transition-all disabled:opacity-50">
              <BadgeCheck className="w-5 h-5" /> Terapkan Logo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStoreSettings;