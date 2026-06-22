"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, ShieldCheck, IdCard, User, 
  MapPin, Camera, CheckCircle2, AlertCircle, Loader2, CreditCard
} from 'lucide-react';
import { useUserStore } from '@/store/useUserStore'; // 🌟 Import Zustand

const VerifyPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });

  // State Form Data
  const [fullName, setFullName] = useState('');
  const [nik, setNik] = useState('');
  const [address, setAddress] = useState('');
  
  // State File & Preview
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [ktpPreview, setKtpPreview] = useState<string | null>(null);
  
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);

  // 🌟 Panggil Zustand untuk sinkronisasi instan nanti
  const setProfile = useUserStore((state) => state.setProfile);

  // Ambil data dan cek kelayakan
  useEffect(() => {
    const fetchUserData = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const { data } = await supabase
        .from('profiles')
        // 🌟 PERBAIKAN 1: Tarik kolom 'role' untuk Penjaga Pintu
        .select('full_name, address, verification_status, role') 
        .eq('id', authData.user.id)
        .single();

      if (data) {
        // 🌟 PENJAGA PINTU: Tendang Admin/Superadmin jika nyasar ke sini!
        if (data.role === 'admin' || data.role === 'superadmin') {
          showToast('error', 'Admin tidak perlu melakukan verifikasi KTP!');
          setTimeout(() => router.back(), 2000);
          return;
        }

        if (data.verification_status === 'verified' || data.verification_status === 'pending') {
          showToast('error', 'Kamu sudah melakukan verifikasi!');
          setTimeout(() => router.back(), 2000);
          return;
        }
        setFullName(data.full_name || '');
        setAddress(data.address || '');
      }
    };
    fetchUserData();
  }, [router]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const handleKtpCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setKtpFile(file);
      setKtpPreview(URL.createObjectURL(file));
    }
  };

  const handleSelfieCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelfieFile(file);
      setSelfiePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ktpFile || !selfieFile) {
      showToast('error', 'Foto KTP dan Selfie wajib diisi!');
      return;
    }

    if (nik.length < 16) {
      showToast('error', 'NIK KTP harus 16 digit!');
      return;
    }

    setLoading(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("Sesi tidak valid.");
      const userId = authData.user.id;

      // 🌟 PERBAIKAN 2: Fallback ekstensi 'jpg' jika kamera HP tidak memberikan nama file yang benar
      const ktpExt = ktpFile.name.includes('.') ? ktpFile.name.split('.').pop() : 'jpg';
      const ktpName = `${userId}-KTP-${Date.now()}.${ktpExt}`;
      const { error: errKtp } = await supabase.storage.from('verifications').upload(ktpName, ktpFile);
      if (errKtp) throw errKtp;
      const { data: ktpUrl } = supabase.storage.from('verifications').getPublicUrl(ktpName);

      const selfieExt = selfieFile.name.includes('.') ? selfieFile.name.split('.').pop() : 'jpg';
      const selfieName = `${userId}-SELFIE-${Date.now()}.${selfieExt}`;
      const { error: errSelfie } = await supabase.storage.from('verifications').upload(selfieName, selfieFile);
      if (errSelfie) throw errSelfie;
      const { data: selfieUrl } = supabase.storage.from('verifications').getPublicUrl(selfieName);

      // 3. Update data di tabel profiles
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          nik: nik,
          address: address,
          ktp_url: ktpUrl.publicUrl,
          selfie_url: selfieUrl.publicUrl,
          verification_status: 'pending' // Berubah jadi pending
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // 🌟 PERBAIKAN 3: SINKRONISASI GHOST CACHE & ZUSTAND 🌟
      // Agar saat dilempar ke halaman profil, status 'Pending' (Kuning) langsung muncul 0 milidetik!
      const cached = localStorage.getItem('user_profile_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        parsed.verification_status = 'pending';
        parsed.full_name = fullName;
        localStorage.setItem('user_profile_cache', JSON.stringify(parsed));
        setProfile(parsed); // Update RAM
      }

      showToast('success', 'Data terkirim! Menunggu verifikasi admin.');
      
      setTimeout(() => {
        router.push('/profile'); 
      }, 2000);

    } catch (error: any) {
      console.error("Gagal verifikasi:", error);
      showToast('error', 'Gagal mengirim data verifikasi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-background text-main overflow-hidden relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      
      {/* Toast */}
      {toast.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-5 fade-in duration-300 w-[90%] max-w-[320px]">
          <div className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl ${
            toast.type === 'success' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-red-500/15 border-red-500/30 text-red-400'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="text-sm font-bold leading-tight">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="w-full px-5 py-4 border-b border-primary/10 flex items-center space-x-3 bg-background/95 backdrop-blur-md sticky top-0 z-50 shrink-0">
        <button onClick={() => router.back()} className="text-main hover:text-primary transition-colors p-1 -ml-1 rounded-full">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Verifikasi KTP
          </h1>
        </div>
      </header>

      {/* Main Form */}
      <main className="flex-1 overflow-y-auto p-5 pb-24 space-y-8">
        
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex gap-3 text-emerald-400">
          <ShieldCheck className="w-6 h-6 shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed font-medium">
            Verifikasi identitas diperlukan untuk keamanan bersama saat menyewa barang. Data Anda dilindungi dengan enkripsi tinggi.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <section className="space-y-4">
            <h2 className="text-sm font-bold text-muted uppercase tracking-wider border-b border-white/10 pb-2">1. Unggah Foto</h2>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-main flex justify-between">
                <span>Foto KTP Asli</span>
                {ktpPreview && <span className="text-emerald-400">✓ Tersimpan</span>}
              </label>
              <div className="relative w-full aspect-[16/9] bg-surface border-2 border-dashed border-white/20 rounded-2xl overflow-hidden hover:border-primary transition-all group cursor-pointer flex flex-col items-center justify-center">
                <input type="file" accept="image/*" capture="environment" onChange={handleKtpCapture} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                
                {ktpPreview ? (
                  <img src={ktpPreview} alt="KTP" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-muted group-hover:text-primary transition-colors">
                    <div className="w-12 h-12 bg-primary/5 rounded-full flex items-center justify-center mb-2">
                      <IdCard className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold">Ambil Foto KTP</span>
                    <span className="text-[10px] mt-1 opacity-70">Posisikan KTP di dalam garis</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-main flex justify-between">
                <span>Selfie dengan KTP</span>
                {selfiePreview && <span className="text-emerald-400">✓ Tersimpan</span>}
              </label>
              <div className="relative w-[70%] mx-auto aspect-[3/4] bg-surface border-2 border-dashed border-white/20 rounded-2xl overflow-hidden hover:border-primary transition-all group cursor-pointer flex flex-col items-center justify-center">
                <input type="file" accept="image/*" capture="user" onChange={handleSelfieCapture} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                
                {selfiePreview ? (
                  <img src={selfiePreview} alt="Selfie" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-muted group-hover:text-primary transition-colors">
                    <div className="w-12 h-12 bg-primary/5 rounded-full flex items-center justify-center mb-2">
                      <Camera className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold">Ambil Selfie</span>
                    <span className="text-[10px] mt-1 opacity-70 text-center px-4">Pegang KTP di bawah dagu</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4 pt-4">
            <h2 className="text-sm font-bold text-muted uppercase tracking-wider border-b border-white/10 pb-2">2. Konfirmasi Data</h2>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted">Nomor Induk Kependudukan (NIK)</label>
              <div className="relative flex items-center">
                <CreditCard className="absolute left-3 w-4 h-4 text-muted" />
                <input type="number" required value={nik} onChange={(e) => setNik(e.target.value.slice(0, 16))} placeholder="16 Digit NIK KTP" className="w-full bg-background border border-white/10 rounded-xl p-3.5 pl-10 text-sm font-bold tracking-widest text-main focus:outline-none focus:border-primary transition-all" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted">Nama Lengkap (Sesuai KTP)</label>
              <div className="relative flex items-center">
                <User className="absolute left-3 w-4 h-4 text-muted" />
                <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="NAMA LENGKAP" className="w-full bg-background border border-white/10 rounded-xl p-3.5 pl-10 text-sm text-main focus:outline-none focus:border-primary transition-all uppercase" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted">Alamat Domisili</label>
              <div className="relative flex">
                <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-muted" />
                <textarea required value={address} onChange={(e) => setAddress(e.target.value)} rows={3} placeholder="Alamat lengkap saat ini..." className="w-full bg-background border border-white/10 rounded-xl p-3.5 pl-10 text-sm text-main focus:outline-none focus:border-primary transition-all resize-none"></textarea>
              </div>
            </div>
          </section>

          <div className="pt-6">
            <button type="submit" disabled={loading} className="w-full bg-emerald-500 text-white font-bold py-4 rounded-2xl flex justify-center items-center space-x-2 shadow-[0_4px_25px_rgba(16,185,129,0.4)] hover:bg-emerald-400 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:grayscale">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
              <span>{loading ? 'Mengenkripsi & Mengirim...' : 'Kirim Verifikasi'}</span>
            </button>
          </div>

        </form>
      </main>
    </div>
  );
};

export default VerifyPage;