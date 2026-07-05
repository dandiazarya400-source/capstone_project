import { create } from 'zustand';

// 1. Tentukan bentuk datanya (TypeScript)
interface UserProfile {
  id: string;
  full_name: string;
  role: string;
  balance: number;
  verification_status: string;
  verification_note?: string | null;
  avatar_url: string;
}

// 2. Tentukan apa saja yang bisa dilakukan oleh Brankas ini
interface UserState {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
  updateBalance: (amount: number) => void;
  clearProfile: () => void;
}

// 3. Buat Brankasnya!
export const useUserStore = create<UserState>((set) => ({
  profile: null, // Default saat aplikasi baru pertama kali dibuka
  
  // Fungsi untuk menyimpan profil dari database ke brankas
  setProfile: (newProfile) => set({ profile: newProfile }),
  
  // Fungsi khusus untuk topup (langsung ubah saldo tanpa repot)
  updateBalance: (amount) => set((state) => ({
    profile: state.profile 
      ? { ...state.profile, balance: state.profile.balance + amount } 
      : null
  })),
  
  // Fungsi untuk membersihkan brankas (dipanggil saat Logout)
  clearProfile: () => set({ profile: null }),
}));