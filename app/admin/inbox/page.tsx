"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, Search, Loader2, BadgeCheck, Clock, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ChatContact {
  id: string;
  full_name: string;
  avatar_url: string;
  last_message: string;
  last_time: string;
  timestamp: number;
}

export default function AdminInboxPage() {
  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [myId, setMyId] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  
  const [view, setView] = useState<'list' | 'chat'>('list');
  const [chatList, setChatList] = useState<ChatContact[]>([]);
  
  const [activeUser, setActiveUser] = useState<ChatContact | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (view === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [messages, view]);

  useEffect(() => {
    let messageChannel: any;
    let presenceChannel: any;

    const fetchInbox = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user) {
          router.push('/login');
          return;
        }
        
        const currentAdminId = authData.user.id;

        // 🌟 PERBAIKAN: Gunakan Try-Catch dan Fallback
        let userRole = 'user'; // Default

        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentAdminId)
            .single();

          if (profileError) {
             console.error("CCTV Supabase Error:", profileError.message);
             // JIKA ERROR (Misal cache nyangkut), ambil dari localStorage!
             userRole = localStorage.getItem('admin_dashboard_role') || 'user';
          } else if (profileData) {
             userRole = profileData.role?.trim().toLowerCase() || 'user';
          }
        } catch (dbError) {
          console.error("Database gagal merespon:", dbError);
          userRole = localStorage.getItem('admin_dashboard_role') || 'user';
        }

        console.log("CCTV Final Role:", userRole);

        // Jika dia BUKAN superadmin, tendang keluar!
        if (userRole !== 'superadmin') {
          console.warn("Akses Ditolak! Role kamu dibaca oleh sistem sebagai:", `"${userRole}"`);
          router.push('/admin'); 
          return;
        }

        setMyId(currentAdminId);

        // ------------------------------------------------------------------
        // JANGAN LUPA: Gunakan HMR Fix untuk Presence seperti yang saya 
        // berikan sebelumnya agar konsolmu tidak merah-merah!
        const presenceChannelName = 'admin-status';
        supabase.removeChannel(supabase.channel(presenceChannelName));

        presenceChannel = supabase.channel(presenceChannelName);
        presenceChannel.subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({
              user_id: currentAdminId,
              status: 'online'
            });
          }
        });

        const { data: allMessages } = await supabase
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${currentAdminId},receiver_id.eq.${currentAdminId}`)
          .order('created_at', { ascending: false });

        if (allMessages && allMessages.length > 0) {
          const contactMap = new Map();
          
          allMessages.forEach(msg => {
            const contactId = msg.sender_id === currentAdminId ? msg.receiver_id : msg.sender_id;
            
            if (!contactMap.has(contactId)) {
              contactMap.set(contactId, {
                last_message: msg.content,
                time: new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                timestamp: new Date(msg.created_at).getTime()
              });
            }
          });

          const contactIds = Array.from(contactMap.keys());

          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', contactIds);

          if (profiles) {
            const finalChatList: ChatContact[] = profiles.map(profile => ({
              id: profile.id,
              full_name: profile.full_name || 'Pengguna Tanpa Nama',
              avatar_url: profile.avatar_url || 'https://ui-avatars.com/api/?name=User&background=2B164D&color=A374FF&bold=true',
              last_message: contactMap.get(profile.id).last_message,
              last_time: contactMap.get(profile.id).time,
              timestamp: contactMap.get(profile.id).timestamp
            }));

            finalChatList.sort((a, b) => b.timestamp - a.timestamp);
            setChatList(finalChatList);
          }
        }
        setLoadingList(false);

        // HMR Fix: Nama channel unik
        const uniqueChannelName = `admin_inbox_${Date.now()}`;
        messageChannel = supabase
          .channel(uniqueChannelName)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
            const newMsg = payload.new as any;
            
            setActiveUser((currentActiveUser) => {
              // 🌟 PERBAIKAN: Hanya tangkap pesan JIKA PENGIRIMNYA ADALAH USER (Pelanggan)
              if (
                currentActiveUser && 
                newMsg.sender_id === currentActiveUser.id && 
                newMsg.receiver_id === currentAdminId
              ) {
                setMessages(prev => {
                  if (prev.find(m => m.id === newMsg.id)) return prev;
                  return [...prev, {
                    id: newMsg.id,
                    text: newMsg.content,
                    sender: 'user', // Pasti dari user
                    time: new Date(newMsg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                  }];
                });
              }
              return currentActiveUser;
            });
          })
          .subscribe();

      } catch (error) {
        console.error("Gagal memuat inbox:", error);
        setLoadingList(false);
      }
    };

    fetchInbox();

    return () => {
      if (messageChannel) supabase.removeChannel(messageChannel);
      if (presenceChannel) supabase.removeChannel(presenceChannel); 
    };
  }, [router]);

  const openChatRoom = async (user: ChatContact) => {
    setActiveUser(user);
    setView('chat');
    setMessages([]);
    
    if (!myId) return;

    const { data: chatHistory } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${myId},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${myId})`)
      .order('created_at', { ascending: true });

    if (chatHistory) {
      const formatted = chatHistory.map(m => ({
        id: m.id,
        text: m.content,
        sender: m.sender_id === myId ? 'me' : 'user',
        time: new Date(m.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      }));
      setMessages(formatted);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !myId || !activeUser || isSending) return;

    const textToSend = inputText;
    setInputText(''); 
    
    // 🌟 JURUS OPTIMISTIC UI: Pesan palsu instan
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      text: textToSend,
      sender: 'me',
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      isSending: true // <--- Penanda efek memudar & jam
    };

    // Tembak ke layar admin tanpa nunggu Supabase!
    setMessages(prev => [...prev, optimisticMessage]);
    setIsSending(true);

    try {
      const { data: insertedMsg, error } = await supabase
        .from('messages')
        .insert([{
          sender_id: myId,
          receiver_id: activeUser.id,
          content: textToSend
        }])
        .select()
        .single(); // Wajib ada ini untuk ngambil ID asli

      if (error) throw error;

      // Sukses terkirim! Sulap jam menjadi centang
      setMessages(prev => prev.map(msg => 
        msg.id === tempId 
          ? { ...msg, id: insertedMsg.id, isSending: false } 
          : msg
      ));
    } catch (error) {
      console.error("Gagal mengirim balasan:", error);
      // Tarik balik jika beneran gagal
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      alert("Koneksi terputus. Pesan gagal dikirim.");
    } finally {
      setIsSending(false);
    }
  };

  // TAMPILAN LIST (KOTAK MASUK)
  if (view === 'list') {
    return (
      <div className="h-full w-full flex flex-col bg-fluent-bg text-text-main overflow-hidden relative">
        {/* Hapus padding atas yang terlalu besar agar pas dengan navbar layout */}
        <header className="w-full bg-fluent-card/95 backdrop-blur-md z-40 px-5 py-3 flex flex-col border-b border-fluent-accent/10 shadow-sm shrink-0">
          <div className="flex items-center space-x-3 mb-3">
            <button onClick={() => router.back()} className="p-1.5 -ml-1.5 rounded-full hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold">Kotak Masuk</h1>
          </div>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input 
              type="text" 
              placeholder="Cari pelanggan..." 
              className="w-full bg-fluent-bg border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:border-fluent-accent/50 transition-all placeholder:text-text-muted/70"
            />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-hide pb-20">
          {loadingList ? (
            <div className="flex flex-col items-center justify-center h-40 opacity-50">
              <Loader2 className="w-6 h-6 text-fluent-accent animate-spin mb-2" />
              <p className="text-xs text-text-muted">Memuat pesan...</p>
            </div>
          ) : chatList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 opacity-50 mt-10">
              <div className="w-16 h-16 bg-fluent-accent/5 rounded-full flex items-center justify-center mb-3">
                <Clock className="w-8 h-8 text-text-muted" />
              </div>
              <p className="text-sm font-medium text-text-main">Belum ada pesan masuk.</p>
              <p className="text-xs text-text-muted mt-1">Pesan dari pelanggan akan muncul di sini.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {chatList.map((chat) => (
                <div key={chat.id} onClick={() => openChatRoom(chat)} className="flex items-center p-4 hover:bg-fluent-accent/5 transition-colors cursor-pointer active:bg-white/10">
                  <div className="w-12 h-12 rounded-full bg-fluent-card shrink-0 mr-4 overflow-hidden border border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={chat.avatar_url} alt={chat.full_name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-bold text-sm text-text-main truncate pr-2">{chat.full_name}</h3>
                      <span className="text-[10px] text-text-muted shrink-0">{chat.last_time}</span>
                    </div>
                    <p className="text-xs text-text-muted truncate">{chat.last_message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // TAMPILAN RUANG CHAT
  return (
    <div className="h-full w-full flex flex-col bg-fluent-bg text-text-main overflow-hidden relative animate-in slide-in-from-right-4 duration-300">
      <header className="w-full bg-fluent-card/95 backdrop-blur-md z-40 px-4 py-3 flex items-center justify-between border-b border-fluent-accent/10 shrink-0 shadow-sm">
        <div className="flex items-center space-x-3">
          <button onClick={() => setView('list')} className="p-1.5 -ml-1.5 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full shrink-0 overflow-hidden border border-white/10">
               {/* eslint-disable-next-line @next/next/no-img-element */}
               <img src={activeUser?.avatar_url} alt="User" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight">{activeUser?.full_name}</h1>
              <div className="flex items-center mt-0.5">
                <span className="text-[10px] text-text-muted flex items-center gap-1">
                  Membalas sebagai: <span className="text-white font-bold inline-flex items-center gap-0.5">Pinjam Dong <BadgeCheck className="w-3.5 h-3.5 text-blue-400" /></span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 scrollbar-hide space-y-4 pb-20">
        {messages.map((msg) => {
          const isMe = msg.sender === 'me';
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
              <div className="max-w-[75%] flex flex-col">
                
                {/* 🌟 EFEK TRANSLUCENT: Memudar dan mengecil saat isSending */}
                <div className={`px-4 py-2.5 text-sm shadow-md relative transition-all duration-300 ${
                  msg.isSending ? 'opacity-70 scale-95' : 'opacity-100 scale-100'
                } ${
                  isMe 
                    ? 'bg-fluent-accent text-white rounded-t-[20px] rounded-bl-[20px] rounded-br-[4px]' 
                    : 'bg-fluent-card border border-fluent-accent/10 text-text-main rounded-t-[20px] rounded-br-[20px] rounded-bl-[4px]'
                }`}>
                  {msg.text}
                </div>

                {/* 🌟 STATUS TERKIRIM: Jam -> Centang */}
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
        })}
        <div ref={chatEndRef} />
      </main>

      <div className="w-full bg-fluent-card/95 backdrop-blur-xl px-4 py-3 pb-6 border-t border-fluent-accent/10 shrink-0 z-50">
        <form onSubmit={handleSendReply} className="flex items-center space-x-2">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isSending}
            placeholder={`Balas ${activeUser?.full_name.split(' ')[0]}...`}
            className="flex-1 bg-fluent-bg border border-white/10 rounded-full px-5 py-2.5 text-sm text-text-main focus:outline-none focus:border-fluent-accent/50 transition-colors shadow-inner"
          />
          <button type="submit" disabled={!inputText.trim() || isSending} className="w-10 h-10 rounded-full bg-fluent-accent flex items-center justify-center text-white shrink-0 shadow-lg hover:bg-[#b58eff] transition-all disabled:opacity-50">
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
          </button>
        </form>
      </div>
    </div>
  );
}