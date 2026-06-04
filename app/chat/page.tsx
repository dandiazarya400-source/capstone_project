"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MoreVertical, Send, Image as ImageIcon, Loader2, Store, BadgeCheck, Check, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const ChatPage = () => {
  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const [myId, setMyId] = useState<string | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  
  // 🌟 STATE BARU: Menyimpan status Online/Offline Admin
  const [isAdminOnline, setIsAdminOnline] = useState(false);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "auto" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    let messageChannel: any;
    let presenceChannel: any;

    const initChat = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user) return;
        const currentUserId = authData.user.id;
        setMyId(currentUserId);

        let targetAdminId = null;

        try {
          const { data: adminData, error: adminError } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'superadmin')
            .limit(1)
            .single();
            
          if (adminError) {
             console.error("CCTV Chat - Gagal mencari ID Superadmin:", adminError.message);
          } else if (adminData) {
             targetAdminId = adminData.id;
          }
        } catch (searchError) {
           console.error("CCTV Chat - Sistem gagal mencari admin:", searchError);
        }
        
        setAdminId(targetAdminId);

        if (targetAdminId) {
          const { data: oldMessages } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${targetAdminId}),and(sender_id.eq.${targetAdminId},receiver_id.eq.${currentUserId})`)
            .order('created_at', { ascending: true });

          if (oldMessages) {
            const formatted = oldMessages.map(m => ({
              id: m.id,
              text: m.content,
              sender: m.sender_id === currentUserId ? 'me' : 'store',
              time: new Date(m.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            }));
            setMessages(formatted);
          }
        }
        setLoading(false);

        const uniqueChannelName = `chat_user_${Date.now()}`;
        
        messageChannel = supabase
          .channel(uniqueChannelName)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
            const newMsg = payload.new as any;
            
            // 🌟 PERBAIKAN: Hanya tangkap pesan JIKA PENGIRIMNYA ADALAH ADMIN
            // Kita tidak perlu menangkap pesan kita sendiri karena sudah diurus Optimistic UI
            if (newMsg.sender_id === targetAdminId && newMsg.receiver_id === currentUserId) {
              setMessages(prev => {
                if (prev.find(m => m.id === newMsg.id)) return prev;
                return [...prev, {
                  id: newMsg.id,
                  text: newMsg.content,
                  sender: 'store', // Pasti dari toko/admin
                  time: new Date(newMsg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                }];
              });
            }
          })
          .subscribe();

        if (targetAdminId) {
          // HMR Fix: Hancurkan channel lama secara paksa sebelum membuat yang baru
          const presenceChannelName = 'admin-status';
          supabase.removeChannel(supabase.channel(presenceChannelName));
          
          presenceChannel = supabase.channel(presenceChannelName)
            .on('presence', { event: 'sync' }, () => {
              const state = presenceChannel.presenceState();
              const isOnline = Object.values(state).flat().some((p: any) => p.user_id === targetAdminId);
              setIsAdminOnline(isOnline);
            })
            .subscribe();
        }
      } catch (error) {
        console.error("Gagal memuat chat:", error);
        setLoading(false);
      }
    };

    initChat();

    return () => {
      if (messageChannel) supabase.removeChannel(messageChannel);
      if (presenceChannel) supabase.removeChannel(presenceChannel);
    };
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !myId || !adminId || isSending) return;

    const textToSend = inputText;
    setInputText(''); 
    
    // 🌟 JURUS OPTIMISTIC UI: Buat pesan sementara (Fake Message)
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      text: textToSend,
      sender: 'me',
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      isSending: true // <--- Status baru penanda "sedang terbang"
    };

    // 1. Tembakkan langsung ke layar TANPA NUNGGU SUPABASE! (Instan)
    setMessages(prev => [...prev, optimisticMessage]);
    
    // Matikan sebentar agar tidak dobel klik
    setIsSending(true);

    try {
      // 2. Kirim ke Supabase, dan tambahkan .select().single() agar kita 
      // mendapatkan ID asli yang dibuatkan oleh database
      const { data: insertedMsg, error } = await supabase
        .from('messages')
        .insert([{
          sender_id: myId,
          receiver_id: adminId,
          content: textToSend
        }])
        .select()
        .single();

      if (error) throw error;

      // 3. Sulap ID sementaranya jadi ID asli, dan hilangkan status isSending (Jadi Centang)
      setMessages(prev => prev.map(msg => 
        msg.id === tempId 
          ? { ...msg, id: insertedMsg.id, isSending: false } 
          : msg
      ));

    } catch (error) {
      console.error("Gagal mengirim:", error);
      // Kalau beneran gagal karena internet putus, tarik balik pesannya dari layar
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      alert("Internet terputus, pesan gagal dikirim.");
    } finally {
      setIsSending(false);
    }
  };

  const greetingMessage = {
    id: 'system-greeting',
    text: 'Halo! 👋 Selamat datang di Pinjam Dong. Ada kendala penyewaan atau pertanyaan yang bisa kami bantu hari ini?',
    sender: 'store',
    time: 'Admin'
  };

  const displayMessages = [greetingMessage, ...messages];

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-fluent-bg text-text-main overflow-hidden relative">
      
      {/* ================= HEADER ================= */}
      <header className="w-full bg-fluent-card/95 backdrop-blur-md z-40 px-4 py-4 md:pt-12 pt-6 flex items-center justify-between border-b border-white/5 shrink-0 shadow-sm">
        <div className="flex items-center space-x-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 bg-transparent rounded-full text-text-main hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="flex items-center space-x-3 cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fluent-accent to-blue-500 flex items-center justify-center shadow-inner overflow-hidden border border-white/10">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight flex items-center gap-1">
                Pinjam Dong <BadgeCheck className="w-4 h-4 text-blue-400" />
              </h1>
              <div className="flex items-center mt-0.5 transition-all duration-300">
                {/* 🌟 LAMPU INDIKATOR DINAMIS */}
                <span className={`w-2 h-2 rounded-full mr-1.5 ${isAdminOnline ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-gray-500'}`}></span>
                <span className="text-[11px] text-text-muted">{isAdminOnline ? 'Admin Online' : 'Sedang Offline'}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ================= AREA CHAT ================= */}
      <main className="flex-1 overflow-y-auto p-5 scrollbar-hide space-y-4 pb-10">
        <div className="flex justify-center mb-6 mt-2">
          <span className="bg-white/5 text-text-muted text-[10px] font-bold px-3 py-1 rounded-full tracking-widest uppercase">
            Riwayat Pesan
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-full opacity-50">
            <Loader2 className="w-6 h-6 text-fluent-accent animate-spin mb-2" />
            <p className="text-xs text-text-muted">Menghubungkan...</p>
          </div>
        ) : (
          displayMessages.map((msg) => {
            const isMe = msg.sender === 'me';
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
                <div className="max-w-[75%] flex flex-col">
                  
                  {/* 🌟 EFEK TRANSLUCENT: Kalau isSending true, pesannya sedikit memudar & mengecil */}
                  <div className={`px-4 py-2.5 text-sm shadow-md relative transition-all duration-300 ${
                    msg.isSending ? 'opacity-70 scale-95' : 'opacity-100 scale-100'
                  } ${
                    isMe 
                      ? 'bg-fluent-accent text-white rounded-t-[20px] rounded-bl-[20px] rounded-br-[4px]' 
                      : 'bg-fluent-card border border-white/5 text-text-main rounded-t-[20px] rounded-br-[20px] rounded-bl-[4px]'
                  }`}>
                    {msg.text}
                  </div>

                  {/* 🌟 STATUS TERKIRIM: Menambahkan Jam atau Centang (Khusus pesan kita sendiri) */}
                  <div className={`flex items-center gap-1 mt-1.5 ${isMe ? 'justify-end mr-1' : 'justify-start ml-1'}`}>
                    <span className="text-[10px] text-text-muted">
                      {msg.time}
                    </span>
                    
                    {isMe && (
                      msg.isSending ? (
                        <Clock className="w-3 h-3 text-text-muted opacity-70 animate-pulse" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-fluent-accent drop-shadow-[0_0_2px_rgba(163,116,255,0.8)]" />
                      )
                    )}
                  </div>

                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </main>

      {/* ================= INPUT AREA ================= */}
      <div className="w-full bg-fluent-card/95 backdrop-blur-xl px-4 py-4 md:pb-8 pb-6 border-t border-white/5 shrink-0 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.3)]">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <button type="button" className="p-3 rounded-full text-text-muted hover:text-fluent-accent hover:bg-white/5 transition-colors shrink-0">
            <ImageIcon className="w-5 h-5" />
          </button>

          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={!adminId || isSending}
            placeholder={adminId ? "Ketik pesan..." : "Mencari admin..."} 
            className="flex-1 bg-[#1A0B2E] border border-white/10 rounded-full px-5 py-3.5 text-sm text-text-main focus:outline-none focus:border-fluent-accent/50 transition-colors shadow-inner placeholder:text-text-muted/70 disabled:opacity-50"
          />

          <button 
            type="submit"
            disabled={!inputText.trim() || !adminId || isSending}
            className="w-12 h-12 rounded-full bg-fluent-accent flex items-center justify-center text-white shrink-0 shadow-[0_4px_15px_rgba(163,116,255,0.4)] hover:bg-[#b58eff] transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
          >
            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
          </button>
        </form>
      </div>

    </div>
  );
};

export default ChatPage;