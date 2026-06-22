"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, Type, AlignLeft, ChevronDown,
  Box, Folder, Save, UploadCloud, Tag, CheckCircle2, AlertCircle, X, Plus, Edit,
  Truck, Loader2
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

  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [userRole, setUserRole] = useState<string>('admin');
  
  // STATE BARU UNTUK EDIT FOTO MULTIPLE
  const [existingImages, setExistingImages] = useState<string[]>([]); 
  const [newFiles, setNewFiles] = useState<File[]>([]); 
  const [newPreviewUrls, setNewPreviewUrls] = useState<string[]>([]); 
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });

  // 1. Ambil data Barang, Kategori, & Role secara paralel
  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let currentUserId = session?.user?.id;

        if (!currentUserId) {
          const { data: authData } = await supabase.auth.getUser();
          currentUserId = authData.user?.id;
        }

        if (!currentUserId) {
          showToast('error', 'Sesi tidak valid, silakan login ulang.');
          return;
        }

        // 🌟 JURUS PARALEL: Tarik 3 Data Sekaligus!
        const [itemRes, catRes, profileRes] = await Promise.all([
          supabase.from('items').select('*').eq('id', id).eq('owner_id', currentUserId).single(),
          supabase.from('categories').select('id, name'),
          supabase.from('profiles').select('role').eq('id', currentUserId).single()
        ]);

        if (itemRes.error) {
          showToast('error', 'Akses ditolak! Ini bukan barang milik Anda.');
          setTimeout(() => router.push('/admin/items'), 2000);
          return;
        }

        // Set Data Barang
        if (itemRes.data) {
          setName(itemRes.data.name || '');
          setDescription(itemRes.data.description || '');
          setPricePerDay(itemRes.data.price_per_day ? new Intl.NumberFormat('id-ID').format(itemRes.data.price_per_day) : '');
          setStock(itemRes.data.stock ? String(itemRes.data.stock) : '1');
          setCondition(itemRes.data.condition || 'Baik');
          setDeliveryOption(itemRes.data.delivery_option || 'both');
          setExistingImages(itemRes.data.image_urls || []);
          
          // Set Kategori terpilih (atau default)
          if (itemRes.data.category_id) {
            setCategoryId(String(itemRes.data.category_id));
          } else if (catRes.data && catRes.data.length > 0) {
            setCategoryId(String(catRes.data[0].id));
          }
        }

        // Set List Kategori & Role
        if (catRes.data) setCategories(catRes.data);
        if (profileRes.data?.role) setUserRole(profileRes.data.role.trim().toLowerCase());

      } catch (error) {
        console.error("Gagal memuat data:", error);
        showToast('error', 'Gagal memuat data.');
      } finally {
        setFetching(false);
        setLoadingCategories(false);
      }
    };

    fetchData();
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

  const removeExistingImage = (indexToRemove: number) => {
    const urlToRemove = existingImages[indexToRemove];
    setImagesToDelete(prev => [...prev, urlToRemove]);
    setExistingImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const removeNewImage = (indexToRemove: number) => {
    setNewFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setNewPreviewUrls(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  // 🌟 FUNGSI BARU: Simpan Kategori ke Supabase
  const handleAddNewCategory = async () => {
    if (!newCategoryName.trim()) {
      showToast('error', 'Nama kategori tidak boleh kosong!');
      return;
    }
    
    setIsAddingCategory(true);
    try {
      const { data, error } = await supabase.from('categories').insert([{ name: newCategoryName.trim() }]).select().single();
      if (error) throw error;

      if (data) {
        setCategories(prev => [...prev, data]);
        setCategoryId(String(data.id));
        setShowCategoryModal(false);
        setNewCategoryName('');
        showToast('success', 'Kategori baru berhasil ditambahkan!');
      }
    } catch (error: any) {
      console.error('Gagal tambah kategori:', error);
      showToast('error', error.message || 'Gagal menambah kategori.');
      if (categories.length > 0) setCategoryId(String(categories[0].id));
    } finally {
      setIsAddingCategory(false);
    }
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
      
      const finalImageUrls = [...existingImages, ...uploadedImageUrls];
      const dbPrice = Number(pricePerDay.replace(/\./g, ''));

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

      if (imagesToDelete.length > 0) {
        const filesToRemove = imagesToDelete.map(url => {
          const marker = 'product-images/';
          const index = url.indexOf(marker);
          if (index !== -1) {
            return url.substring(index + marker.length);
          }
          return url.substring(url.lastIndexOf('/') + 1);
        });
        
        await supabase.storage.from('product-images').remove(filesToRemove);
      }

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
    return <div className="h-full w-full bg-background flex items-center justify-center text-primary">Memuat Data...</div>;
  }

  const totalCurrentImages = existingImages.length + newFiles.length;

  return (
    <div className="w-full flex flex-col text-slate-800 pb-12 min-h-screen bg-background">

      {/* 🌟 MODAL TAMBAH KATEGORI BARU */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-5 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-[320px] shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Tambah Kategori</h3>
            <p className="text-xs text-slate-500 mb-5">Kategori ini akan langsung tersedia di aplikasi.</p>
            
            <input 
              type="text" 
              autoFocus
              placeholder="Contoh: Alat Camping" 
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all mb-6"
            />
            
            <div className="flex gap-3 w-full">
              <button 
                type="button"
                onClick={() => {
                  setShowCategoryModal(false);
                  setNewCategoryName('');
                  if (categories.length > 0) setCategoryId(String(categories[0].id));
                }}
                disabled={isAddingCategory}
                className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button 
                type="button"
                onClick={handleAddNewCategory}
                disabled={isAddingCategory}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-primary hover:bg-primary-hover shadow-lg shadow-primary/30 transition-colors flex justify-center items-center"
              >
                {isAddingCategory ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-5 fade-in duration-300 w-[90%] max-w-[320px]">
          <div className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl ${
            toast.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
              : 'bg-danger/10 border-danger/30 text-danger'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="text-sm font-bold leading-tight">{toast.message}</span>
          </div>
        </div>
      )}

      
      <header className="w-full px-5 py-4 flex items-center space-x-3 bg-surface z-30 border-b border-borderline shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <button onClick={() => router.back()} className="text-slate-600 hover:text-primary transition-colors cursor-pointer p-1 -ml-1 rounded-full hover:bg-primary/10">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold tracking-tight flex items-center gap-2 text-slate-800">
          <Edit className="w-5 h-5 text-primary" />
          Edit Data Alat
        </h1>
      </header>

      <main className="p-5 pt-6 pb-24 max-w-2xl mx-auto w-full">
        <form onSubmit={handleSubmit} className="space-y-6"> 
          
          <div className="space-y-2"> 
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Alat / Barang</label>
            <div className="relative flex items-center">
              <Type className="absolute left-3 w-4 h-4 text-slate-400" />
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-surface border border-borderline rounded-xl p-3.5 pl-10 text-[13px] font-medium text-slate-800 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400 shadow-sm" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Deskripsi Lengkap</label>
              <span className={`text-[10px] font-bold ${currentWordCount >= 300 ? 'text-danger' : 'text-slate-500'}`}>
                {currentWordCount} / 300 kata
              </span>
            </div>
            <div className="relative flex">
              <AlignLeft className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
              <textarea required value={description} onChange={handleDescriptionChange} rows={6} className="w-full bg-surface border border-borderline rounded-xl p-3.5 pl-10 text-[13px] font-medium text-slate-800 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] placeholder:text-slate-400 shadow-sm"></textarea>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Harga (Per Hari)</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-[13px] font-bold text-primary">Rp</span>
                <input type="text" required value={pricePerDay} onChange={handlePriceChange} className="w-full bg-surface border border-borderline rounded-xl p-3.5 pl-[34px] text-[13px] font-bold text-slate-800 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400 shadow-sm" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Jumlah Stok</label>
              <div className="relative flex items-center">
                <Box className="absolute left-3 w-4 h-4 text-slate-400" />
                <input type="number" required min="1" value={stock} onChange={(e) => setStock(e.target.value)} className="w-full bg-surface border border-borderline rounded-xl p-3.5 pl-10 text-[13px] font-bold text-slate-800 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-sm" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kategori</label>
              <div className="relative flex items-center">
                <Folder className="absolute left-3 w-4 h-4 text-slate-400 z-10" />
                <select 
                  value={categoryId} 
                  onChange={(e) => {
                    if (e.target.value === 'ADD_NEW') {
                      setShowCategoryModal(true);
                    } else {
                      setCategoryId(e.target.value);
                    }
                  }} 
                  className="w-full bg-surface border border-borderline rounded-xl p-3.5 pl-10 pr-10 text-[13px] font-medium text-slate-800 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all appearance-none cursor-pointer relative z-0 shadow-sm"
                >
                  {loadingCategories ? (
                    <option value="" disabled>Memuat...</option>
                  ) : (
                    <>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                      
                      {/* 🌟 HANYA TAMPIL JIKA SUPERADMIN */}
                      {userRole === 'superadmin' && (
                        <>
                          <option disabled>──────────</option>
                          <option value="ADD_NEW" className="font-bold text-primary bg-primary/5">
                            + Tambah Kategori Baru
                          </option>
                        </>
                      )}
                    </>
                  )}
                </select>
                <ChevronDown className="absolute right-3 w-4 h-4 text-slate-400 pointer-events-none z-10" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kondisi</label>
              <div className="relative flex items-center">
                <Tag className="absolute left-3 w-4 h-4 text-slate-400 z-10" />
                <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full bg-surface border border-borderline rounded-xl p-3.5 pl-10 pr-10 text-[13px] font-medium text-slate-800 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all appearance-none cursor-pointer relative z-0 shadow-sm">
                  <option value="Sangat Baik">Sangat Baik</option>
                  <option value="Baik">Baik</option>
                  <option value="Cukup">Cukup</option>
                </select>
                <ChevronDown className="absolute right-3 w-4 h-4 text-slate-400 pointer-events-none z-10" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Opsi Pengiriman</label>
            <div className="relative flex items-center">
              <Truck className="absolute left-3 w-4 h-4 text-slate-400 z-10" />
              <select value={deliveryOption} onChange={(e) => setDeliveryOption(e.target.value)} className="w-full bg-surface border border-borderline rounded-xl p-3.5 pl-10 pr-10 text-[13px] font-medium text-slate-800 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all appearance-none cursor-pointer relative z-0 shadow-sm">
                <option value="both">Bisa Diantar & Ambil Sendiri</option>
                <option value="pickup_only">Hanya Ambil Sendiri (Ke Toko)</option>
                <option value="delivery_only">Hanya Diantar (Oleh Pemilik)</option>
              </select>
              <ChevronDown className="absolute right-3 w-4 h-4 text-slate-400 pointer-events-none z-10" />
            </div>
          </div>

          {/* UPLOAD MULTIPLE FOTO */}
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Edit Foto Alat</label>
              <span className="text-[10px] font-bold text-slate-500">{totalCurrentImages}/5 Foto</span>
            </div>
            
            <div className="flex overflow-x-auto space-x-3 pb-2 scrollbar-hide w-full">
              
              {/* 1. Render Foto Lama (Dari DB) */}
              {existingImages.map((url, idx) => (
                <div key={`existing-${idx}`} className="relative w-28 h-28 shrink-0 bg-surface rounded-xl border border-borderline overflow-hidden group shadow-sm">
                  <img src={url} alt={`Existing ${idx}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <button 
                    type="button" 
                    onClick={() => removeExistingImage(idx)}
                    className="absolute top-1.5 right-1.5 p-1 bg-danger/90 hover:bg-danger text-white rounded-full backdrop-blur-sm transition-colors z-10 shadow-sm"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* 2. Render Foto Baru (Belum Upload) */}
              {newPreviewUrls.map((url, idx) => (
                <div key={`new-${idx}`} className="relative w-28 h-28 shrink-0 bg-surface rounded-xl border border-primary/50 overflow-hidden group shadow-sm">
                  <img src={url} alt={`New Preview ${idx}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-primary/90 text-white text-[8px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">BARU</span>
                  <button 
                    type="button" 
                    onClick={() => removeNewImage(idx)}
                    className="absolute top-1.5 right-1.5 p-1 bg-danger/90 hover:bg-danger text-white rounded-full backdrop-blur-sm transition-colors z-10 shadow-sm"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* 3. Tombol Tambah Foto */}
              {totalCurrentImages < 5 && (
                <div className="relative w-28 h-28 shrink-0 flex flex-col items-center justify-center bg-surface border-2 border-dashed border-borderline rounded-xl hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group shadow-sm">
                  <input type="file" multiple accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-1 group-hover:scale-110 group-hover:text-primary transition-transform">
                    <Plus className="w-6 h-6 text-slate-400 group-hover:text-primary" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 group-hover:text-primary transition-colors">Tambah Foto</p>
                </div>
              )}
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full mt-8 bg-primary text-white font-bold py-3.5 rounded-xl flex justify-center items-center space-x-2 shadow-[0_4px_20px_rgba(20,184,166,0.3)] hover:bg-primary-hover active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 disabled:grayscale">
            {loading ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : <Save className="w-5 h-5" />}
            <span>{loading ? 'Menyimpan Perubahan...' : 'Simpan Perubahan'}</span>
          </button>

        </form>
      </main>
    </div>
  );
};

export default EditProductPage;