"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, PackagePlus, Type, AlignLeft,
  Box, Folder, Save, UploadCloud, Tag, CheckCircle2, AlertCircle, X, Plus,
  Truck
} from 'lucide-react';

const AddProductPage = () => {
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pricePerDay, setPricePerDay] = useState('');
  const [stock, setStock] = useState('1');
  const [condition, setCondition] = useState('Baik');
  const [categoryId, setCategoryId] = useState('1'); 
  const [deliveryOption, setDeliveryOption] = useState('both');
  
  // [FIX] State untuk Kategori dari Database
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('id, name');
      if (data && data.length > 0) {
        setCategories(data);
        setCategoryId(String(data[0].id)); // Set default ke kategori pertama
      }
    };
    fetchCategories();
  }, []);
  
  // STATE BARU: Menggunakan Array untuk menampung banyak file
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) {
      setPricePerDay('');
      return;
    }
    const numericValue = parseInt(rawValue, 10);
    if (numericValue > 10000000) {
      showToast('error', 'Maksimal harga sewa adalah Rp 10.000.000/hari');
      return; 
    }
    const formattedValue = new Intl.NumberFormat('id-ID').format(numericValue);
    setPricePerDay(formattedValue);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    if (words.length <= 300) {
      setDescription(text);
    } else {
      const truncatedText = words.slice(0, 300).join(" ");
      setDescription(truncatedText + " "); 
      showToast('error', 'Maksimal deskripsi adalah 300 kata!');
    }
  };

  const currentWordCount = description.trim().split(/\s+/).filter(word => word.length > 0).length;

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  // LOGIKA BARU: Menambahkan gambar ke dalam array (Multi-select)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      
      // Batasi maksimal 5 foto agar tidak memberatkan
      if (files.length + selectedFiles.length > 5) {
        showToast('error', 'Maksimal 5 foto per barang!');
        return;
      }

      setFiles(prev => [...prev, ...selectedFiles]);
      
      const newPreviewUrls = selectedFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
    }
  };

  // LOGIKA BARU: Menghapus gambar tertentu dari deretan
  const removeImage = (indexToRemove: number) => {
    setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setPreviewUrls(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      showToast('error', 'Pilih minimal 1 foto alat terlebih dahulu!'); 
      return;
    }
    setLoading(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("Sesi login tidak ditemukan, silakan login ulang.");
      
      const currentUserId = authData.user.id;
      const uploadedImageUrls: string[] = [];

      // [FIX PERFORMA] Upload semua foto secara bersamaan (Paralel/Serentak)
      const uploadPromises = files.map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(uniqueFileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(uniqueFileName);
        
        return urlData.publicUrl;
      });

      // Tunggu semua proses upload selesai dalam 1 waktu
      const resolvedUrls = await Promise.all(uploadPromises);
      uploadedImageUrls.push(...resolvedUrls);
      
      const dbPrice = Number(pricePerDay.replace(/\./g, ''));

      const { error: dbError } = await supabase
        .from('items')
        .insert([{ 
          name, description, price_per_day: dbPrice,
          stock: Number(stock), condition, category_id: Number(categoryId), 
          image_urls: uploadedImageUrls, // Disimpan sebagai array link
          is_available: false,
          owner_id: currentUserId,
          delivery_option: deliveryOption
          
        }]);

      if (dbError) throw dbError;

      showToast('success', 'Barang berhasil dipublikasikan!');
      
      setTimeout(() => {
        router.push('/admin/items');
      }, 1500);

    } catch (error: any) {
      console.error('Kendala:', error);
      showToast('error', error.message || 'Gagal mengupload data barang.');
    } finally {
      setLoading(false);
    }
  };

  return (
    // [FIX SCROLL] Hapus h-full dan overflow-y-auto agar tidak bentrok dengan Layout
    <div className="w-full flex flex-col text-text-main pb-12">
      {toast.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-5 fade-in duration-300 w-[90%] max-w-[320px]">
          <div className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl ${
            toast.type === 'success' 
              ? 'bg-green-500/15 border-green-500/30 text-green-400' 
              : 'bg-red-500/15 border-red-500/30 text-red-400'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="text-sm font-bold leading-tight">{toast.message}</span>
          </div>
        </div>
      )}

      <header className="w-full px-5 py-4 border-b border-fluent-accent/10 flex items-center space-x-3 bg-fluent-bg">
        <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <PackagePlus className="w-5 h-5 text-fluent-accent" />
          Tambah Alat Sewa
        </h1>
      </header>

      <main className="p-5 pt-6 pb-24">
        <form onSubmit={handleSubmit} className="space-y-6"> 
          
          <div className="space-y-2"> 
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Nama Alat / Barang</label>
            <div className="relative flex items-center">
              <Type className="absolute left-3 w-4 h-4 text-text-muted" />
              <input type="text" required placeholder="Contoh: Kamera Sony Alpha 7 IV" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-fluent-card border border-white/10 rounded-xl p-3 pl-10 text-sm text-text-main focus:outline-none focus:border-fluent-accent transition-all" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Deskripsi Lengkap</label>
              <span className={`text-[10px] font-bold ${currentWordCount >= 300 ? 'text-red-400' : 'text-text-muted'}`}>
                {currentWordCount} / 300 kata
              </span>
            </div>
            <div className="relative flex">
              <AlignLeft className="absolute left-3 top-3.5 w-4 h-4 text-text-muted" />
              <textarea 
                required 
                placeholder="Jelaskan spesifikasi, kelengkapan, dan syarat sewa alat..." 
                value={description} 
                onChange={handleDescriptionChange} 
                rows={6} 
                className="w-full bg-fluent-card border border-white/10 rounded-xl p-3 pl-10 text-sm text-text-main focus:outline-none focus:border-fluent-accent transition-all resize-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              ></textarea>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Harga (Per Hari)</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-sm font-bold text-fluent-accent">Rp</span>
                <input type="text" required placeholder="150.000" value={pricePerDay} onChange={handlePriceChange} className="w-full bg-fluent-card border border-white/10 rounded-xl p-3 pl-9 text-sm text-text-main focus:outline-none focus:border-fluent-accent transition-all" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Jumlah Stok</label>
              <div className="relative flex items-center">
                <Box className="absolute left-3 w-4 h-4 text-text-muted" />
                <input type="number" required min="1" value={stock} onChange={(e) => setStock(e.target.value)} className="w-full bg-fluent-card border border-white/10 rounded-xl p-3 pl-10 text-sm text-text-main focus:outline-none focus:border-fluent-accent transition-all" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Kategori</label>
              <div className="relative flex items-center">
                <Folder className="absolute left-3 w-4 h-4 text-text-muted" />
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full bg-fluent-card border border-white/10 rounded-xl p-3 pl-10 text-sm text-text-main focus:outline-none focus:border-fluent-accent transition-all appearance-none cursor-pointer">
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id} className="bg-fluent-bg">{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Kondisi</label>
              <div className="relative flex items-center">
                <Tag className="absolute left-3 w-4 h-4 text-text-muted" />
                <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full bg-fluent-card border border-white/10 rounded-xl p-3 pl-10 text-sm text-text-main focus:outline-none focus:border-fluent-accent transition-all appearance-none cursor-pointer">
                  
                  <option value="Sangat Baik" className="bg-fluent-bg">Sangat Baik</option>
                  <option value="Baik" className="bg-fluent-bg">Baik</option>
                  <option value="Cukup" className="bg-fluent-bg">Cukup</option>
                </select>
              </div>
            </div>
          </div>

          {/* ================= [BARU] UI OPSI PENGIRIMAN ================= */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Opsi Pengiriman</label>
            <div className="relative flex items-center">
              <Truck className="absolute left-3 w-4 h-4 text-text-muted" />
              <select value={deliveryOption} onChange={(e) => setDeliveryOption(e.target.value)} className="w-full bg-fluent-card border border-white/10 rounded-xl p-3 pl-10 text-sm text-text-main focus:outline-none focus:border-fluent-accent transition-all appearance-none cursor-pointer">
                <option value="both" className="bg-fluent-bg">Bisa Diantar & Ambil Sendiri</option>
                <option value="pickup_only" className="bg-fluent-bg">Hanya Ambil Sendiri (Ke Toko)</option>
                <option value="delivery_only" className="bg-fluent-bg">Hanya Diantar (Oleh Pemilik)</option>
              </select>
            </div>
          </div>

          {/* ================= UI UPLOAD MULTIPLE FOTO ================= */}
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Upload Foto Alat</label>
              <span className="text-[10px] font-bold text-text-muted">{files.length}/5 Foto</span>
            </div>
            
            {/* Horizontal Scroll untuk deretan foto */}
            <div className="flex overflow-x-auto space-x-3 pb-2 scrollbar-hide w-full">
              {/* Box Preview (Berjejer ke kanan) */}
              {previewUrls.map((url, idx) => (
                <div key={idx} className="relative w-28 h-28 shrink-0 bg-fluent-card rounded-xl border border-white/10 overflow-hidden group">
                  <img src={url} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                  {/* Tombol Hapus X */}
                  <button 
                    type="button" 
                    onClick={() => removeImage(idx)}
                    className="absolute top-1.5 right-1.5 p-1 bg-red-500/80 hover:bg-red-500 text-white rounded-full backdrop-blur-sm transition-colors z-10"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* Tombol Tambah (Jika belum 5) */}
              {files.length < 5 && (
                <div className="relative w-28 h-28 shrink-0 flex flex-col items-center justify-center bg-fluent-card border-2 border-dashed border-white/20 rounded-xl hover:border-fluent-accent/70 hover:bg-fluent-accent/5 transition-all cursor-pointer group">
                  <input type="file" multiple accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className="w-10 h-10 bg-fluent-accent/5 rounded-full flex items-center justify-center mb-1 group-hover:scale-110 group-hover:text-fluent-accent transition-transform">
                    {files.length === 0 ? <UploadCloud className="w-5 h-5 text-text-muted group-hover:text-fluent-accent" /> : <Plus className="w-6 h-6 text-text-muted group-hover:text-fluent-accent" />}
                  </div>
                  <p className="text-[10px] font-bold text-text-muted">{files.length === 0 ? 'Pilih Foto' : 'Tambah'}</p>
                </div>
              )}
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full mt-8 bg-fluent-accent text-white font-bold py-3.5 rounded-xl flex justify-center items-center space-x-2 shadow-[0_4px_25px_rgba(163,116,255,0.4)] hover:bg-[#b58eff] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50">
            {loading ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : <Save className="w-5 h-5" />}
            <span>{loading ? 'Menyimpan Data...' : 'Publikasikan Alat'}</span>
          </button>

        </form>
      </main>
    </div>
  );
};

export default AddProductPage;