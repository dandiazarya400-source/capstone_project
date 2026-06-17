"use client";

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Send, Image as ImageIcon, Loader2, BadgeCheck, Check, CheckCheck, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const ChatContent = () => {
  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const [myId, setMyId] = useState<string | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const targetIdFromUrl = searchParams.get('targetId');
  const targetNameFromUrl = searchParams.get('targetName');
  const targetAvatarFromUrl = searchParams.get('targetAvatar');
  
  // Ghost Cache awal dari URL
  const [targetName, setTargetName] = useState(targetNameFromUrl || 'Memuat...');
  const [targetAvatar, setTargetAvatar] = useState(targetAvatarFromUrl || '');

  const [autoGreeting, setAutoGreeting] = useState('Halo! 👋 Ada yang bisa kami bantu?');
  const [isAdminOnline, setIsAdminOnline] = useState(false);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "auto" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    let isMounted = true; // 🌟 FIX BUG MEMORI LEAK: Penjaga komponen aktif
    let messageChannel: any;
    let presenceChannel: any;

    const initChat = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user || !isMounted) return;
        const currentUserId = authData.user.id;
        setMyId(currentUserId);

        let finalTargetId = targetIdFromUrl; 

        if (!finalTargetId) {
          try {
            const { data: adminData } = await supabase
              .from('profiles')
              .select('id')
              .eq('role', 'superadmin')
              .order('created_at', { ascending: true }) 
              .limit(1)
              .single();
              
            if (adminData) {
              finalTargetId = adminData.id;
            }
          } catch (searchError) {
            console.error("CCTV Chat - Sistem gagal mencari admin:", searchError);
          }
        }
        
        if (!isMounted) return; // Stop jika user sudah pindah halaman
        setAdminId(finalTargetId);

        if (finalTargetId) {
          const { data: targetProfile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, auto_greeting')
            .eq('id', finalTargetId)
            .single();
            
          if (targetProfile && isMounted) {
            // 🌟 FIX BUG PHISHING: SELALU TIMPA data URL dengan data ASLI dari Database!
            setTargetName(targetProfile.full_name || 'Pengguna');
            setTargetAvatar(targetProfile.avatar_url || '');
            if (targetProfile.auto_greeting) {
              setAutoGreeting(targetProfile.auto_greeting);
            }
          }
        }

        if (finalTargetId && isMounted) {
          const { data: oldMessages } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${finalTargetId}),and(sender_id.eq.${finalTargetId},receiver_id.eq.${currentUserId})`)
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
        
        if (!isMounted) return;
        setLoading(false);

        const uniqueChannelName = `chat_channel_${currentUserId}_to_${finalTargetId}`;
        
        messageChannel = supabase
          .channel(uniqueChannelName)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
            const newMsg = payload.new as any;
            if (newMsg.sender_id === finalTargetId && newMsg.receiver_id === currentUserId) {
              setMessages(prev => {
                if (prev.find(m => m.id === newMsg.id)) return prev;
                return [...prev, {
                  id: newMsg.id,
                  text: newMsg.content,
                  sender: 'store',
                  time: new Date(newMsg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                }];
              });
            }
          })
          .subscribe();

        if (finalTargetId) {
          const presenceChannelName = 'admin-status';
          supabase.removeChannel(supabase.channel(presenceChannelName)); // Bersihkan yang lama
          
          presenceChannel = supabase.channel(presenceChannelName)
            .on('presence', { event: 'sync' }, () => {
              const state = presenceChannel.presenceState();
              const isOnline = Object.values(state).flat().some((p: any) => p.user_id === finalTargetId);
              if (isMounted) setIsAdminOnline(isOnline);
            })
            .subscribe();
        }
      } catch (error) {
        console.error("Gagal memuat chat:", error);
        if (isMounted) setLoading(false);
      }
    };

    initChat();

    // 🌟 CLEANUP YANG BENAR: Set isMounted false, dan tutup channel jika sudah terbuat
    return () => {
      isMounted = false;
      if (messageChannel) supabase.removeChannel(messageChannel);
      if (presenceChannel) supabase.removeChannel(presenceChannel);
    };
  }, [targetIdFromUrl]); 

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !myId || !adminId || isSending) return;

    const textToSend = inputText;
    setInputText(''); 
    
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      text: textToSend,
      sender: 'me',
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      isSending: true
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setIsSending(true);

    try {
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

      setMessages(prev => prev.map(msg => 
        msg.id === tempId 
          ? { ...msg, id: insertedMsg.id, isSending: false } 
          : msg
      ));

    } catch (error) {
      console.error("Gagal mengirim:", error);
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      alert("Internet terputus, pesan gagal dikirim.");
    } finally {
      setIsSending(false);
    }
  };

  const greetingMessage = {
    id: 'system-greeting',
    text: autoGreeting,
    sender: 'store',
    time: 'Sistem'
  };

  const displayMessages = [greetingMessage, ...messages];

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#F2FDFB] text-slate-800 overflow-hidden relative">
      
      {/* ================= HEADER ================= */}
      <header className="w-full bg-white/95 backdrop-blur-md z-40 px-4 py-4 md:pt-12 pt-6 flex items-center justify-between border-b border-slate-100 shrink-0 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <div className="flex items-center space-x-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 bg-transparent rounded-full text-slate-600 hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="flex items-center space-x-3 cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-400 flex items-center justify-center shadow-sm overflow-hidden border border-teal-100 text-white font-bold text-lg">
              {targetAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={targetAvatar} alt={targetName} className="w-full h-full object-cover" />
              ) : (
                targetName.substring(0, 1).toUpperCase()
              )}
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-slate-800 leading-tight flex items-center gap-1 line-clamp-1 max-w-[150px]">
                {targetName} <BadgeCheck className="w-4 h-4 text-blue-500 shrink-0" />
              </h1>
              {isAdminOnline && (
                <div className="flex items-center mt-0.5 animate-in fade-in duration-300">
                  <span className="w-2 h-2 rounded-full mr-1.5 bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                  <span className="text-[11px] font-bold text-teal-600">Admin Online</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ================= AREA CHAT ================= */}
      <main className="flex-1 overflow-y-auto p-5 scrollbar-hide space-y-4 pb-10">
        <div className="flex justify-center mb-6 mt-2">
          <span className="bg-teal-50 border border-teal-100 text-teal-700 text-[10px] font-bold px-4 py-1.5 rounded-full tracking-widest uppercase shadow-sm">
            Riwayat Pesan
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-full opacity-60">
            <Loader2 className="w-7 h-7 text-teal-500 animate-spin mb-3" />
            <p className="text-[13px] font-medium text-slate-500">Menghubungkan ke obrolan...</p>
          </div>
        ) : (
          displayMessages.map((msg) => {
            const isMe = msg.sender === 'me';
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
                <div className="max-w-[75%] flex flex-col">
                  
                  <div className={`px-4 py-2.5 text-[13px] font-medium shadow-sm relative transition-all duration-300 ${
                    msg.isSending ? 'opacity-70 scale-95' : 'opacity-100 scale-100'
                  } ${
                    isMe 
                      ? 'bg-teal-500 text-white rounded-t-[20px] rounded-bl-[20px] rounded-br-[4px] shadow-teal-500/20' 
                      : 'bg-white border border-slate-100 text-slate-700 rounded-t-[20px] rounded-br-[20px] rounded-bl-[4px]'
                  }`}>
                    {msg.text}
                  </div>

                  <div className={`flex items-center gap-1 mt-1.5 ${isMe ? 'justify-end mr-1' : 'justify-start ml-1'}`}>
                    <span className="text-[10px] font-medium text-slate-400">
                      {msg.time}
                    </span>
                    
                    {isMe && (
                      msg.isSending ? (
                        <Clock className="w-3 h-3 text-slate-400 opacity-70 animate-pulse" />
                      ) : msg.is_read ? (
                        
                        <CheckCheck className="w-4 h-4 text-blue-500 drop-shadow-sm" />
                      ) : (
                        
                        <Check className="w-3.5 h-3.5 text-teal-500 drop-shadow-sm" />
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
      <div className="w-full bg-white/95 backdrop-blur-xl px-4 py-4 md:pb-8 pb-6 border-t border-slate-100 shrink-0 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <button type="button" className="p-3 rounded-full text-slate-400 hover:text-teal-500 hover:bg-teal-50 transition-colors shrink-0">
            <ImageIcon className="w-5 h-5" />
          </button>

          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={!adminId || isSending}
            placeholder={adminId ? "Ketik pesan..." : "Mencari admin..."} 
            className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-5 py-3.5 text-[13px] font-medium text-slate-800 focus:outline-none focus:border-teal-400 focus:bg-white transition-colors shadow-inner placeholder:text-slate-400 disabled:opacity-50"
          />

          <button 
            type="submit"
            disabled={!inputText.trim() || !adminId || isSending}
            className="w-[46px] h-[46px] rounded-full bg-teal-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-teal-500/30 hover:bg-teal-600 transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
          >
            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
          </button>
        </form>
      </div>

    </div>
  );
};

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#F2FDFB]">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin mb-4" />
        <p className="text-[13px] font-bold text-slate-500">Memuat Obrolan...</p>
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}