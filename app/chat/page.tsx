"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MoreVertical, Send, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase'; // PASTIKAN IMPORT SUPABASE

const ChatPage = () => {
  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Menyimpan ID pengguna
  const [myId, setMyId] = useState<string | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    let channel: any;

    const initChat = async () => {
      try {
        // 1. Ambil ID kita sendiri
        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user) return;
        const currentUserId = authData.user.id;
        setMyId(currentUserId);

        // 2. Cari ID Admin (Anggap saja Asoka Maju adalah user dengan is_admin = true)
        const { data: adminData } = await supabase
          .from('profiles')
          .select('id')
          .eq('is_admin', true)
          .limit(1)
          .single();
        
        const targetAdminId = adminData?.id || null;
        setAdminId(targetAdminId);

        // 3. Tarik riwayat pesan jika Admin ketemu
        if (targetAdminId) {
          const { data: oldMessages } = await supabase
            .from('messages')
            .select('*')
            // Ambil chat di mana saya pengirim & admin penerima, ATAU sebaliknya
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

        // 4. PASANG RADAR REAL-TIME SUPABASE! 📡
        channel = supabase
          .channel('realtime:messages')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
            const newMsg = payload.new as any;
            
            // Pastikan pesan yang masuk benar-benar milik obrolan kita & admin ini
            if (
              (newMsg.sender_id === currentUserId && newMsg.receiver_id === targetAdminId) ||
              (newMsg.sender_id === targetAdminId && newMsg.receiver_id === currentUserId)
            ) {
              setMessages(prev => {
                // Cegah duplikasi (karena pengirim juga menerima payload real-time)
                if (prev.find(m => m.id === newMsg.id)) return prev;
                return [...prev, {
                  id: newMsg.id,
                  text: newMsg.content,
                  sender: newMsg.sender_id === currentUserId ? 'me' : 'store',
                  time: new Date(newMsg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                }];
              });
            }
          })
          .subscribe();

      } catch (error) {
        console.error("Gagal memuat chat:", error);
        setLoading(false);
      }
    };

    initChat();

    // Hapus radar jika user keluar dari halaman chat
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // ================= FUNGSI KIRIM PESAN KE DATABASE =================
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !myId || !adminId || isSending) return;

    const textToSend = inputText;
    setInputText(''); // Langsung kosongkan input agar terasa responsif
    setIsSending(true);

    try {
      const { error } = await supabase.from('messages').insert([{
        sender_id: myId,
        receiver_id: adminId,
        content: textToSend
      }]);

      if (error) throw error;
      // Catatan: Kita tidak perlu melakukan setMessages di sini.
      // Radar Real-time (channel) di atas akan otomatis menangkap pesan yang baru masuk ke database
      // dan menampilkannya di layar secara instan!
    } catch (error) {
      console.error("Gagal mengirim:", error);
      alert("Pesan gagal dikirim.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-fluent-bg text-text-main overflow-hidden relative">
      
      {/* ================= HEADER ================= */}
      <header className="w-full bg-fluent-card/95 backdrop-blur-md z-40 px-4 py-4 md:pt-12 pt-6 flex items-center justify-between border-b border-white/5 shrink-0 shadow-sm">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => router.back()} 
            className="p-2 -ml-2 bg-transparent rounded-full text-text-main hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="flex items-center space-x-3 cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-inner overflow-hidden">
              <span className="text-fluent-accent font-black text-xl tracking-tighter">A<span className="text-black">M</span></span>
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">ASOKA MAJU</h1>
              <div className="flex items-center mt-0.5">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
                <span className="text-[11px] text-text-muted">Admin Online</span>
              </div>
            </div>
          </div>
        </div>
        <button className="p-2 text-text-muted hover:text-text-main transition-colors rounded-full hover:bg-white/5">
          <MoreVertical className="w-5 h-5" />
        </button>
      </header>

      {/* ================= AREA CHAT ================= */}
      <main className="flex-1 overflow-y-auto p-5 scrollbar-hide space-y-4">
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
        ) : messages.length === 0 ? (
          <div className="text-center text-xs text-text-muted pt-10 opacity-50">
            Belum ada pesan. Mulai sapa admin!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender === 'me';
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
                <div className="max-w-[75%] flex flex-col">
                  <div 
                    className={`px-4 py-2.5 text-sm shadow-md relative ${
                      isMe 
                        ? 'bg-fluent-accent text-white rounded-t-[20px] rounded-bl-[20px] rounded-br-[4px]' 
                        : 'bg-fluent-card border border-white/5 text-text-main rounded-t-[20px] rounded-br-[20px] rounded-bl-[4px]' 
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className={`text-[10px] text-text-muted mt-1.5 ${isMe ? 'text-right mr-1' : 'text-left ml-1'}`}>
                    {msg.time}
                  </span>
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
            placeholder={adminId ? "Tulis pesan ..." : "Mencari admin..."} 
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