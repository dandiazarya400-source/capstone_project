"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, PackagePlus, Type, AlignLeft, ChevronDown,
  Box, Folder, Save, UploadCloud, Tag, CheckCircle2, AlertCircle, X, Plus,
  Truck, Loader2
} from 'lucide-react';

const AddProductPage = () => {
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pricePerDay, setPricePerDay] = useState('');
  const [stock, setStock] = useState('1');
  const [condition, setCondition] = useState('Baik');
  const [categoryId, setCategoryId] = useState(''); 
  const [deliveryOption, setDeliveryOption] = useState('both');
  
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // STATE UNTUK MODAL TAMBAH KATEGORI
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // 🌟 STATE BARU UNTUK CEK ROLE SUPERADMIN
  const [userRole, setUserRole] = useState<string>('admin');

  useEffect(() => {
    // 🌟 FUNGSI BARU: Ambil Kategori & Cek Role secara paralel
    const fetchData = async () => {
      setLoadingCategories(true);
      
      try {
        // 1. Dapatkan Sesi User saat ini
        const { data: { session } } = await supabase.auth.getSession();
        let currentUserId = session?.user?.id;

        if (!currentUserId) {
          const { data: authData } = await supabase.auth.getUser();
          currentUserId = authData.user?.id;
        }

        // 2. Tarik Data Kategori & Role User secara bersamaan (Paralel agar cepat)
        if (currentUserId) {
          const [categoriesResponse, profileResponse] = await Promise.all([
            supabase.from('categories').select('id, name'),
            supabase.from('profiles').select('role').eq('id', currentUserId).single()
          ]);

          if (categoriesResponse.data && categoriesResponse.data.length > 0) {
            setCategories(categoriesResponse.data);
            setCategoryId(String(categoriesResponse.data[0].id));
          }

          if (profileResponse.data?.role) {
            setUserRole(profileResponse.data.role.trim().toLowerCase());
          }
        }
      } catch (error) {
        console.error("Gagal mengambil data awal:", error);
      } finally {
        setLoadingCategories(false); 
      }
    };

    fetchData();
  }, []);
  
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      
      if (files.length + selectedFiles.length > 5) {
        showToast('error', 'Maksimal 5 foto per barang!');
        return;
      }

      setFiles(prev => [...prev, ...selectedFiles]);
      const newPreviewUrls = selectedFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setPreviewUrls(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleAddNewCategory = async () => {
    if (!newCategoryName.trim()) {
      showToast('error', 'Nama kategori tidak boleh kosong!');
      return;
    }
    
    setIsAddingCategory(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name: newCategoryName.trim() }])
        .select()
        .single();

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
    if (files.length === 0) {
      showToast('error', 'Pilih minimal 1 foto alat terlebih dahulu!'); 
      return;
    }
    if (!categoryId || categoryId === 'ADD_NEW') {
      showToast('error', 'Pilih kategori yang valid!');
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      let user: any = session?.user;

      if (!user) {
        const { data: authData } = await supabase.auth.getUser();
        user = authData?.user;
      }

      if (!user) throw new Error("Sesi login tidak ditemukan, silakan login ulang.");
      
      const currentUserId = user.id;
      const uploadedImageUrls: string[] = [];

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

      const resolvedUrls = await Promise.all(uploadPromises);
      uploadedImageUrls.push(...resolvedUrls);
      
      const dbPrice = Number(pricePerDay.replace(/\./g, ''));

      const { error: dbError } = await supabase
        .from('items')
        .insert([{ 
          name, description, price_per_day: dbPrice,
          stock: Number(stock), condition, category_id: Number(categoryId), 
          image_urls: uploadedImageUrls, 
          is_available: false,
          owner_id: currentUserId,
          delivery_option: deliveryOption
        }]);

      if (dbError) throw dbError;

      showToast('success', 'Barang berhasil ditambahkan!');
      
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
    <div className="w-full flex flex-col text-slate-800 pb-12 min-h-screen bg-background relative">
      
      {/* MODAL TAMBAH KATEGORI BARU */}
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
            toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-danger/10 border-danger/30 text-danger'
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
          <PackagePlus className="w-5 h-5 text-primary" />
          Tambah Alat Sewa
        </h1>
      </header>

      <main className="p-5 pt-6 pb-24 max-w-2xl mx-auto w-full relative z-10">
        <form onSubmit={handleSubmit} className="space-y-6"> 
          
          <div className="space-y-2"> 
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Alat / Barang</label>
            <div className="relative flex items-center">
              <Type className="absolute left-3 w-4 h-4 text-slate-400" />
              <input type="text" required placeholder="Contoh: Kamera Sony Alpha 7 IV" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-surface border border-borderline rounded-xl p-3.5 pl-10 text-[13px] font-medium text-slate-800 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400 shadow-sm" />
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
              <textarea 
                required 
                placeholder="Jelaskan spesifikasi, kelengkapan, dan syarat sewa alat..." 
                value={description} 
                onChange={handleDescriptionChange} 
                rows={6} 
                className="w-full bg-surface border border-borderline rounded-xl p-3.5 pl-10 text-[13px] font-medium text-slate-800 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] placeholder:text-slate-400 shadow-sm"
              ></textarea>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Harga (Per Hari)</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-[13px] font-bold text-primary">Rp</span>
                <input type="text" required placeholder="150.000" value={pricePerDay} onChange={handlePriceChange} className="w-full bg-surface border border-borderline rounded-xl p-3.5 pl-[34px] text-[13px] font-bold text-slate-800 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400 shadow-sm" />
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

          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Upload Foto Alat</label>
              <span className="text-[10px] font-bold text-slate-400">{files.length}/5 Foto</span>
            </div>
            
            <div className="flex overflow-x-auto space-x-3 pb-2 scrollbar-hide w-full">
              {previewUrls.map((url, idx) => (
                <div key={idx} className="relative w-28 h-28 shrink-0 bg-surface rounded-xl border border-borderline overflow-hidden group shadow-sm">
                  <img src={url} alt={`Preview ${idx}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <button 
                    type="button" 
                    onClick={() => removeImage(idx)}
                    className="absolute top-1.5 right-1.5 p-1 bg-danger/90 hover:bg-danger text-white rounded-full backdrop-blur-sm transition-colors z-10 shadow-sm"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {files.length < 5 && (
                <div className="relative w-28 h-28 shrink-0 flex flex-col items-center justify-center bg-surface border-2 border-dashed border-borderline rounded-xl hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group shadow-sm">
                  <input type="file" multiple accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-1 group-hover:scale-110 group-hover:text-primary transition-transform">
                    {files.length === 0 ? <UploadCloud className="w-5 h-5 text-primary" /> : <Plus className="w-6 h-6 text-primary" />}
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 group-hover:text-primary transition-colors">{files.length === 0 ? 'Pilih Foto' : 'Tambah'}</p>
                </div>
              )}
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full mt-8 bg-primary text-white font-bold py-3.5 rounded-xl flex justify-center items-center space-x-2 shadow-[0_4px_20px_rgba(20,184,166,0.3)] hover:bg-primary-hover active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 disabled:grayscale">
            {loading ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : <Save className="w-5 h-5" />}
            <span>{loading ? 'Menyimpan Data...' : 'Publikasikan Alat'}</span>
          </button>

        </form>
      </main>
    </div>
  );
};

export default AddProductPage;