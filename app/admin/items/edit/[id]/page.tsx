"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, PackagePlus, Type, AlignLeft,
  Box, Folder, Save, UploadCloud, Tag, CheckCircle2, AlertCircle, X, Plus, Edit,
  Truck
} from 'lucide-react';

const EditProductPage = () => {
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pricePerDay, setPricePerDay] = useState('');
  const [stock, setStock] = useState('1');
  const [condition, setCondition] = useState('Baik');
  const [categoryId, setCategoryId] = useState('1'); 
  const [deliveryOption, setDeliveryOption] = useState('both');
  
  // STATE BARU UNTUK EDIT FOTO MULTIPLE
  const [existingImages, setExistingImages] = useState<string[]>([]); // Foto dari database
  const [newFiles, setNewFiles] = useState<File[]>([]); // Foto baru yang ditambahkan
  const [newPreviewUrls, setNewPreviewUrls] = useState<string[]>([]); // Preview untuk foto baru
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });

  // 1. Ambil data barang yang mau diedit
  useEffect(() => {
    if (!id) return;

    const fetchItem = async () => {
      try {
        // [BARU] Dapatkan ID Admin yang sedang login
        const { data: authData } = await supabase.auth.getUser();
        const currentUserId = authData.user?.id;

        if (!currentUserId) return;

        // [UBAH] Tarik data barang, dan tambahkan filter owner_id
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .eq('id', id)
          .eq('owner_id', currentUserId) // <--- KUNCI GEMBOKNYA DI SINI
          .single();

        if (error) {
          // [BARU] Jika error (barang bukan miliknya/tidak ada), usir kembali ke daftar barang
          showToast('error', 'Akses ditolak! Ini bukan barang milik Anda.');
          setTimeout(() => router.push('/admin/items'), 2000);
          return;
        }

        if (data) {
          setName(data.name || '');
          setDescription(data.description || '');
          setPricePerDay(data.price_per_day ? new Intl.NumberFormat('id-ID').format(data.price_per_day) : '');
          setStock(data.stock ? String(data.stock) : '1');
          setCondition(data.condition || 'Baik');
          setCategoryId(data.category_id ? String(data.category_id) : '1');
          setDeliveryOption(data.delivery_option || 'both');
          
          // Masukkan array foto dari DB ke state existingImages
          setExistingImages(data.image_urls || []);
        }
      } catch (error) {
        console.error("Gagal memuat data barang:", error);
        showToast('error', 'Gagal memuat data barang.');
      } finally {
        setFetching(false);
      }
    };

    fetchItem();
  }, [id]);

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

  // LOGIKA TAMBAH FOTO BARU
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      const totalImages = existingImages.length + newFiles.length + selectedFiles.length;
      
      if (totalImages > 5) {
        showToast('error', 'Total maksimal foto adalah 5!');
        return;
      }

      setNewFiles(prev => [...prev, ...selectedFiles]);
      const previewUrls = selectedFiles.map(file => URL.createObjectURL(file));
      setNewPreviewUrls(prev => [...prev, ...previewUrls]);
    }
  };

  // LOGIKA HAPUS FOTO LAMA (Dari DB)
  const removeExistingImage = (indexToRemove: number) => {
    setExistingImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  // LOGIKA HAPUS FOTO BARU (Belum diupload)
  const removeNewImage = (indexToRemove: number) => {
    setNewFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setNewPreviewUrls(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalImages = existingImages.length + newFiles.length;
    
    if (totalImages === 0) {
      showToast('error', 'Barang harus memiliki minimal 1 foto!'); 
      return;
    }
    setLoading(true);

    try {
      const uploadedImageUrls: string[] = [];

      // 1. Upload foto BARU (jika ada)
      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];
        const fileExt = file.name.split('.').pop();
        const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(uniqueFileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(uniqueFileName);
        
        uploadedImageUrls.push(urlData.publicUrl);
      }
      
      // 2. Gabungkan foto LAMA (yang tidak dihapus) dengan foto BARU
      const finalImageUrls = [...existingImages, ...uploadedImageUrls];

      const dbPrice = Number(pricePerDay.replace(/\./g, ''));

      // 3. Update database
      const { error: dbError } = await supabase
        .from('items')
        .update({ 
          name, 
          description, 
          price_per_day: dbPrice,
          stock: Number(stock), 
          condition, 
          category_id: Number(categoryId), 
          image_urls: finalImageUrls, 
          delivery_option: deliveryOption
        })
        .eq('id', id);

      if (dbError) throw dbError;

      showToast('success', 'Perubahan berhasil disimpan!');
      
      setTimeout(() => {
        router.back();
      }, 1500);

    } catch (error: any) {
      console.error('Kendala:', error);
      showToast('error', error.message || 'Gagal menyimpan perubahan.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="h-full w-full bg-fluent-bg flex items-center justify-center text-fluent-accent">Memuat Data...</div>;
  }

  const totalCurrentImages = existingImages.length + newFiles.length;

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden bg-fluent-bg text-text-main pb-12 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {toast.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-5 fade-in duration-300 w-[90%] max-w-[320px]">
          <div className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl ${
            toast.type === 'success' ? 'bg-green-500/15 border-green-500/30 text-green-400' : 'bg-red-500/15 border-red-500/30 text-red-400'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="text-sm font-bold leading-tight">{toast.message}</span>
          </div>
        </div>
      )}

      <header className="w-full px-5 py-4 border-b border-white/5 flex items-center space-x-3 bg-fluent-bg sticky top-0 z-50">
        <button onClick={() => router.back()} className="text-text-main hover:text-fluent-accent transition-colors cursor-pointer p-1 -ml-1">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <Edit className="w-5 h-5 text-fluent-accent" />
          Edit Data Alat
        </h1>
      </header>

      <main className="p-5 pt-6 pb-24">
        <form onSubmit={handleSubmit} className="space-y-6"> 
          
          <div className="space-y-2"> 
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Nama Alat / Barang</label>
            <div className="relative flex items-center">
              <Type className="absolute left-3 w-4 h-4 text-text-muted" />
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-fluent-card border border-white/10 rounded-xl p-3 pl-10 text-sm text-text-main focus:outline-none focus:border-fluent-accent transition-all" />
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
              <textarea required value={description} onChange={handleDescriptionChange} rows={6} className="w-full bg-fluent-card border border-white/10 rounded-xl p-3 pl-10 text-sm text-text-main focus:outline-none focus:border-fluent-accent transition-all resize-none scrollbar-hide"></textarea>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Harga (Per Hari)</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-sm font-bold text-fluent-accent">Rp</span>
                <input type="text" required value={pricePerDay} onChange={handlePriceChange} className="w-full bg-fluent-card border border-white/10 rounded-xl p-3 pl-9 text-sm text-text-main focus:outline-none focus:border-fluent-accent transition-all" />
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
                  <option value="1" className="bg-[#1A0B2E]">Elektronik</option>
                  <option value="2" className="bg-[#1A0B2E]">Musik</option>
                  <option value="3" className="bg-[#1A0B2E]">Kamera</option>
                  <option value="4" className="bg-[#1A0B2E]">Fashion</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Kondisi</label>
              <div className="relative flex items-center">
                <Tag className="absolute left-3 w-4 h-4 text-text-muted" />
                <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full bg-fluent-card border border-white/10 rounded-xl p-3 pl-10 text-sm text-text-main focus:outline-none focus:border-fluent-accent transition-all appearance-none cursor-pointer">
                  <option value="Sangat Baik" className="bg-[#1A0B2E]">Sangat Baik</option>
                  <option value="Baik" className="bg-[#1A0B2E]">Baik</option>
                  <option value="Cukup" className="bg-[#1A0B2E]">Cukup</option>
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
                <option value="both" className="bg-[#1A0B2E]">Bisa Diantar & Ambil Sendiri</option>
                <option value="pickup_only" className="bg-[#1A0B2E]">Hanya Ambil Sendiri (Ke Toko)</option>
                <option value="delivery_only" className="bg-[#1A0B2E]">Hanya Diantar (Oleh Pemilik)</option>
              </select>
            </div>
          </div>

          {/* ================= UI UPLOAD MULTIPLE FOTO (EDIT) ================= */}
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Edit Foto Alat</label>
              <span className="text-[10px] font-bold text-text-muted">{totalCurrentImages}/5 Foto</span>
            </div>
            
            <div className="flex overflow-x-auto space-x-3 pb-2 scrollbar-hide w-full">
              
              {/* 1. Render Foto Lama (Dari DB) */}
              {existingImages.map((url, idx) => (
                <div key={`existing-${idx}`} className="relative w-28 h-28 shrink-0 bg-fluent-card rounded-xl border border-white/10 overflow-hidden group">
                  <img src={url} alt={`Existing ${idx}`} className="w-full h-full object-cover" />
                  <button 
                    type="button" 
                    onClick={() => removeExistingImage(idx)}
                    className="absolute top-1.5 right-1.5 p-1 bg-red-500/80 hover:bg-red-500 text-white rounded-full backdrop-blur-sm transition-colors z-10"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* 2. Render Foto Baru (Belum Upload) */}
              {newPreviewUrls.map((url, idx) => (
                <div key={`new-${idx}`} className="relative w-28 h-28 shrink-0 bg-fluent-card rounded-xl border border-fluent-accent/50 overflow-hidden group">
                  <img src={url} alt={`New Preview ${idx}`} className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-fluent-accent/80 text-white text-[8px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">BARU</span>
                  <button 
                    type="button" 
                    onClick={() => removeNewImage(idx)}
                    className="absolute top-1.5 right-1.5 p-1 bg-red-500/80 hover:bg-red-500 text-white rounded-full backdrop-blur-sm transition-colors z-10"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* 3. Tombol Tambah Foto (Jika masih bisa ditambah) */}
              {totalCurrentImages < 5 && (
                <div className="relative w-28 h-28 shrink-0 flex flex-col items-center justify-center bg-fluent-card border-2 border-dashed border-white/20 rounded-xl hover:border-fluent-accent/70 hover:bg-white/5 transition-all cursor-pointer group">
                  <input type="file" multiple accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center mb-1 group-hover:scale-110 group-hover:text-fluent-accent transition-transform">
                    <Plus className="w-6 h-6 text-text-muted group-hover:text-fluent-accent" />
                  </div>
                  <p className="text-[10px] font-bold text-text-muted">Tambah Foto</p>
                </div>
              )}
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full mt-8 bg-fluent-accent text-white font-bold py-3.5 rounded-xl flex justify-center items-center space-x-2 shadow-[0_4px_25px_rgba(163,116,255,0.4)] hover:bg-[#b58eff] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50">
            {loading ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : <Save className="w-5 h-5" />}
            <span>{loading ? 'Menyimpan Perubahan...' : 'Simpan Perubahan'}</span>
          </button>

        </form>
      </main>
    </div>
  );
};

export default EditProductPage;