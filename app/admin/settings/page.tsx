"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Store, Clock, Phone, MapPin, Save, 
  BadgeCheck, Camera, Loader2, Crop, X, Calendar, Check 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
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
  const [adminId, setAdminId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    store_name: '',
    phone_number: '',
    address: '',
    avatar_url: '' 
  });

  const defaultSchedule = [
    { day: 'Senin', open: '08:00', close: '17:00', isClosed: false },
    { day: 'Selasa', open: '08:00', close: '17:00', isClosed: false },
    { day: 'Rabu', open: '08:00', close: '17:00', isClosed: false },
    { day: 'Kamis', open: '08:00', close: '17:00', isClosed: false },
    { day: 'Jumat', open: '08:00', close: '17:00', isClosed: false },
    { day: 'Sabtu', open: '08:00', close: '17:00', isClosed: false },
    { day: 'Minggu', open: '08:00', close: '17:00', isClosed: true }, 
  ];
  const [schedule, setSchedule] = useState(defaultSchedule);

  const updateSchedule = (index: number, field: string, value: any) => {
    const newSchedule = [...schedule];
    newSchedule[index] = { ...newSchedule[index], [field]: value };
    setSchedule(newSchedule);
  };

  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2).toString().padStart(2, '0');
    const minute = i % 2 === 0 ? '00' : '30';
    return `${hour}:${minute}`;
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
        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user) {
          router.push('/login');
          return;
        }

        const currentUserId = authData.user.id;
        setAdminId(currentUserId);

        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, phone_number, address, avatar_url, is_admin, operational_schedule')
          .eq('id', currentUserId)
          .maybeSingle();

        if (error) throw error;

        if (data && !data.is_admin) {
          alert('Akun ini bukan admin!');
          router.push('/');
          return;
        }

        if (data) {
          const storeData = data as any;
          setFormData({
            store_name: storeData.full_name || '', 
            phone_number: storeData.phone_number || '',
            address: storeData.address || '',
            avatar_url: storeData.avatar_url || ''
          });
          
          // Sinkronisasi jadwal dari JSON database jika ada
          if (storeData.operational_schedule) {
            setSchedule(storeData.operational_schedule);
          }
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
      const fileName = `store-${adminId}-${Math.random()}.jpg`;
      const croppedFile = new File([croppedBlob], fileName, { type: 'image/jpeg' });
      
      // [FIX STORAGE] Hapus logo lama dari storage jika sudah ada sebelumnya
      if (formData.avatar_url && formData.avatar_url.includes('supabase.co')) {
        const oldFileName = formData.avatar_url.substring(formData.avatar_url.lastIndexOf('/') + 1);
        await supabase.storage.from('avatars').remove([oldFileName]);
      }

      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, croppedFile);
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, avatar_url: data.publicUrl }));
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
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.store_name, 
          phone_number: formData.phone_number,
          address: formData.address,
          avatar_url: formData.avatar_url,
          operational_schedule: schedule // Simpan data array JSON jadwal terstruktur
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
    <div className="w-full flex flex-col text-text-main relative">

      {/* NOTIFIKASI TOAST */}
      <div className="fixed top-24 left-0 w-full flex justify-center z-50 pointer-events-none px-4">
        {success && (
          <div className="flex items-center gap-2 bg-[#1a2e23]/90 backdrop-blur-md border border-green-500/30 text-green-400 px-4 py-2.5 rounded-full shadow-lg shadow-green-500/20 animate-in slide-in-from-top-5 fade-in duration-300">
            <BadgeCheck className="w-4 h-4" />
            <span className="text-[11px] font-bold tracking-wide">Data Toko Diperbarui!</span>
          </div>
        )}
      </div>

      <main className="w-full px-5 pt-4 pb-24">

        {/* HEADER PENGATURAN TOKO (Model Card Dalam) */}
        <div className="flex items-center gap-3 mb-6 bg-fluent-card p-3 rounded-2xl border border-fluent-accent/10 shadow-lg">
          <button type="button" onClick={() => router.back()} className="p-2 bg-fluent-accent/5 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-text-main leading-tight">Pengaturan Toko</h1>
            <p className="text-[10px] text-text-muted">Kelola identitas dan jadwal operasional</p>
          </div>
        </div>

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
              <input type="text" required className="w-full bg-fluent-card border border-fluent-accent/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-fluent-accent/50 transition-all shadow-inner font-bold text-text-main" value={formData.store_name} onChange={(e) => setFormData({...formData, store_name: e.target.value})} />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase ml-1 tracking-wider">Telepon Admin</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-fluent-accent" />
              <input type="tel" required className="w-full bg-fluent-card border border-fluent-accent/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-fluent-accent/50 transition-all shadow-inner text-text-main" value={formData.phone_number} onChange={(e) => setFormData({...formData, phone_number: e.target.value})} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase ml-1 tracking-wider">Alamat Lengkap Toko</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-3.5 w-4.5 h-4.5 text-fluent-accent" />
              <textarea rows={3} required className="w-full bg-fluent-card border border-fluent-accent/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-fluent-accent/50 transition-all shadow-inner resize-none text-text-main" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})}></textarea>
            </div>
          </div>

          {/* ================= UI JADWAL OPERASIONAL TERPADU ================= */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between items-end mb-2 px-1">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Jadwal Operasional</label>
              <span className="text-[9px] text-text-muted/70 font-bold uppercase tracking-wider">Tutup / Libur</span>
            </div>
            
            {/* Card Besar Gabungan Anti-Aneh */}
            <div className="bg-fluent-card border border-fluent-accent/10 rounded-2xl overflow-hidden divide-y divide-white/5 shadow-md">
              {schedule.map((item, idx) => (
                <div key={item.day} className="flex items-center justify-between p-3.5 transition-colors hover:bg-white/[0.01]">
                  
                  {/* Nama Hari */}
                  <div className="w-16 shrink-0">
                    <span className={`text-xs font-bold transition-all ${item.isClosed ? 'text-text-muted line-through opacity-40' : 'text-text-main'}`}>
                      {item.day}
                    </span>
                  </div>
                  
                  {/* Jam Operasional (Ubah jadi Select Dropdown) */}
                  <div className="flex items-center gap-1">
                    <select 
                      value={item.open} 
                      onChange={(e) => updateSchedule(idx, 'open', e.target.value)}
                      disabled={item.isClosed}
                      className={`bg-fluent-bg border border-white/10 rounded-xl px-2 py-1.5 text-xs font-semibold focus:outline-none focus:border-fluent-accent transition-all appearance-none cursor-pointer text-center min-w-[70px] ${item.isClosed ? 'opacity-20 cursor-not-allowed text-text-muted' : 'text-text-main'}`}
                    >
                      {timeOptions.map(time => (
                        <option key={`open-${time}`} value={time} className="bg-fluent-bg">{time}</option>
                      ))}
                    </select>

                    <span className="text-text-muted text-xs opacity-50 px-0.5">-</span>
                    
                    <select 
                      value={item.close} 
                      onChange={(e) => updateSchedule(idx, 'close', e.target.value)}
                      disabled={item.isClosed}
                      className={`bg-fluent-bg border border-white/10 rounded-xl px-2 py-1.5 text-xs font-semibold focus:outline-none focus:border-fluent-accent transition-all appearance-none cursor-pointer text-center min-w-[70px] ${item.isClosed ? 'opacity-20 cursor-not-allowed text-text-muted' : 'text-text-main'}`}
                    >
                      {timeOptions.map(time => (
                        <option key={`close-${time}`} value={time} className="bg-fluent-bg">{time}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tombol Centang Box Minimalis (Menggantikan Slide Toggle) */}
                  <button 
                    type="button"
                    onClick={() => updateSchedule(idx, 'isClosed', !item.isClosed)}
                    className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                      item.isClosed 
                        ? 'bg-rose-500 border-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.3)]' 
                        : 'border-white/20 text-transparent hover:border-fluent-accent/50 bg-white/[0.02]'
                    }`}
                  >
                    <Check className={`w-3.5 h-3.5 transition-transform duration-200 ${item.isClosed ? 'scale-100' : 'scale-0'}`} />
                  </button>

                </div>
              ))}
            </div>
          </div>
          {/* ========================================================================= */}

          <button type="submit" disabled={loading || uploadingImage} className="w-full mt-4 bg-fluent-accent text-white text-sm font-bold py-4 rounded-2xl flex justify-center items-center gap-2 shadow-lg shadow-fluent-accent/30 hover:bg-[#b58eff] transition-all disabled:opacity-50 cursor-pointer">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {loading ? 'Menyimpan...' : 'Simpan Pengaturan Toko'}
          </button>
        </form>
      </main>

      {/* MODAL CROP FIX (Aman & Berjarak Pasti) */}
      {imageToCrop && (
        <div className="absolute inset-0 z-[100] bg-black/95 p-5 flex flex-col animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-4 shrink-0 pt-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Crop className="w-4 h-4 text-fluent-accent" />
              Sesuaikan Logo Toko
            </h3>
            <button type="button" onClick={() => setImageToCrop(null)} className="p-1 text-white/50 hover:text-rose-400 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Wadah dengan tinggi absolut (h-72) agar tidak menghilang di Mobile Frame */}
          <div className="relative w-full h-72 bg-neutral-900 rounded-2xl border border-fluent-accent/10 overflow-hidden mb-4 shrink-0 shadow-inner">
            <Cropper image={imageToCrop} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={true} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} classes={{ containerClassName: "bg-transparent", cropAreaClassName: "border-2 border-fluent-accent shadow-[0_0_20px_rgba(163,116,255,0.6)]" }} />
          </div>
          
          <div className="bg-fluent-card p-5 rounded-2xl border border-fluent-accent/10 space-y-4 shadow-xl">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest pl-1">Perbesar / Perkecil</label>
              <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className="w-full h-1.5 bg-fluent-bg rounded-full appearance-none cursor-pointer accent-fluent-accent" />
            </div>
            <button type="button" onClick={handleCropSaveAndUpload} disabled={uploadingImage} className="w-full bg-fluent-accent text-white text-sm font-bold py-3.5 rounded-2xl flex justify-center items-center gap-2 shadow-lg hover:bg-[#b58eff] transition-all disabled:opacity-50">
              <BadgeCheck className="w-5 h-5" /> Terapkan Logo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStoreSettings;