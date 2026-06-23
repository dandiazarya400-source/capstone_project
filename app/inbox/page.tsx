"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, Search, Loader2, Clock, Check, CheckCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ChatContact {
  id: string;
  full_name: string;
  avatar_url: string;
  last_message: string;
  last_time: string;
  timestamp: number;
}

export default function UniversalInboxPage() {
  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
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
    let isMounted = true; 
    let messageChannel: any;

    const fetchInbox = async () => {
      try {
        // Tangkap user yang sedang login
        const { data: { session } } = await supabase.auth.getSession();
        let user: any = session?.user;

        if (!user) {
          const { data: userData } = await supabase.auth.getUser();
          user = userData?.user;
        }

        if (!user || !isMounted) {
          router.push('/login');
          return;
        }

        // Kita ubah namanya dari currentAdminId jadi currentUserId agar universal
        const currentUserId = user.id;
        setMyId(currentUserId);

        // Tarik semua pesan yang melibatkan user ini (baik sebagai pengirim atau penerima)
        const { data: allMessages } = await supabase
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
          .order('created_at', { ascending: false });

        if (allMessages && allMessages.length > 0 && isMounted) {
          const contactMap = new Map();
          
          // Kelompokkan pesan berdasarkan Lawan Bicara
          allMessages.forEach(msg => {
            const contactId = msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id;
            
            if (!contactMap.has(contactId)) {
              contactMap.set(contactId, {
                last_message: msg.content,
                time: new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                timestamp: new Date(msg.created_at).getTime()
              });
            }
          });

          const contactIds = Array.from(contactMap.keys());

          if (contactIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .in('id', contactIds);

            if (profiles && isMounted) {
              const finalChatList: ChatContact[] = profiles.map(profile => ({
                id: profile.id,
                full_name: profile.full_name || 'Pengguna Tanpa Nama',
                avatar_url: profile.avatar_url || 'https://ui-avatars.com/api/?name=User&background=00C6B5&color=fff&bold=true',
                last_message: contactMap.get(profile.id).last_message,
                last_time: contactMap.get(profile.id).time,
                timestamp: contactMap.get(profile.id).timestamp
              }));

              finalChatList.sort((a, b) => b.timestamp - a.timestamp);
              setChatList(finalChatList);
            }
          } else {
             if(isMounted) setChatList([]);
          }
        }
        
        if (isMounted) setLoadingList(false);

        // Realtime Subscription untuk pesan baru
        const uniqueChannelName = `inbox_${Date.now()}`;
        messageChannel = supabase
          .channel(uniqueChannelName)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
            const newMsg = payload.new as any;
            const isFromOther = newMsg.sender_id !== currentUserId;
            
            setChatList((prevList) => {
              const contactId = isFromOther ? newMsg.sender_id : newMsg.receiver_id;
              const existingContact = prevList.find(c => c.id === contactId);
              
              if (existingContact) {
                const updatedList = prevList.map(c => 
                  c.id === contactId 
                    ? { ...c, last_message: newMsg.content, last_time: new Date(newMsg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }), timestamp: new Date(newMsg.created_at).getTime() }
                    : c
                );
                return updatedList.sort((a, b) => b.timestamp - a.timestamp);
              }
              return prevList; 
            });

            setActiveUser((currentActiveUser) => {
              if (currentActiveUser && newMsg.sender_id === currentActiveUser.id && newMsg.receiver_id === currentUserId) {
                supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id).then();
                setMessages(prev => {
                  if (prev.find(m => m.id === newMsg.id)) return prev;
                  return [...prev, {
                    id: newMsg.id, text: newMsg.content, sender: 'user', 
                    time: new Date(newMsg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }), is_read: true 
                  }];
                });
              }
              return currentActiveUser;
            });
          })
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
            const updatedMsg = payload.new as any;
            setMessages(prev => prev.map(msg => msg.id === updatedMsg.id ? { ...msg, is_read: updatedMsg.is_read } : msg));
          })
          .subscribe();

      } catch (error) {
        console.error("Gagal memuat inbox:", error);
        if (isMounted) setLoadingList(false);
      }
    };

    fetchInbox();

    return () => {
      isMounted = false;
      if (messageChannel) supabase.removeChannel(messageChannel);
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
        time: new Date(m.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        is_read: m.is_read
      }));
      setMessages(formatted);
    }

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', user.id)
      .eq('receiver_id', myId)
      .eq('is_read', false);
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !myId || !activeUser || isSending) return;

    const textToSend = inputText;
    setInputText('');  
    
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId, text: textToSend, sender: 'me',
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      isSending: true, is_read: false
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setIsSending(true);

    try {
      const { data: insertedMsg, error } = await supabase
        .from('messages')
        .insert([{ sender_id: myId, receiver_id: activeUser.id, content: textToSend, is_read: false }])
        .select().single(); 

      if (error) throw error;
      setMessages(prev => prev.map(msg => msg.id === tempId ? { ...msg, id: insertedMsg.id, isSending: false } : msg));
    } catch (error) {
      console.error("Gagal mengirim pesan:", error);
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      alert("Koneksi terputus. Pesan gagal dikirim.");
    } finally {
      setIsSending(false);
    }
  };

  // ================== TAMPILAN LIST ==================
  if (view === 'list') {
    return (
      <div className="h-[100dvh] w-full max-w-[100vw] flex flex-col bg-[#F2FDFB] text-slate-800 overflow-hidden overflow-x-hidden relative">
        <header className="w-full bg-white/95 backdrop-blur-md z-40 px-5 py-4 flex flex-col border-b border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] shrink-0">
          <div className="flex items-center space-x-3 mb-4 mt-2">
            <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-[18px] font-bold text-slate-800">Kotak Masuk</h1>
          </div>
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            {/* Wording diganti jadi obrolan agar universal */}
            <input 
              type="text" 
              placeholder="Cari obrolan..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-10 pr-4 text-[13px] font-medium focus:outline-none focus:border-teal-400 focus:bg-white transition-all placeholder:text-slate-400 text-slate-700 shadow-sm"
            />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide pb-20">
          {loadingList ? (
            <div className="flex flex-col items-center justify-center h-40 opacity-60">
              <Loader2 className="w-7 h-7 text-teal-500 animate-spin mb-3" />
              <p className="text-[13px] font-medium text-slate-500">Memuat pesan...</p>
            </div>
          ) : chatList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 opacity-70 mt-10">
              <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mb-3 shadow-sm border border-teal-100">
                <Clock className="w-7 h-7 text-teal-600" />
              </div>
              <p className="text-[14px] font-bold text-slate-700">Belum ada obrolan.</p>
              <p className="text-[12px] font-medium text-slate-500 mt-1">Mulai chat dengan toko atau pengguna lain!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 px-2 py-2">
              {chatList.map((chat) => (
                <div key={chat.id} onClick={() => openChatRoom(chat)} className="flex items-center p-3 rounded-2xl hover:bg-white transition-colors cursor-pointer active:scale-[0.98] mb-1">
                  <div className="w-[50px] h-[50px] rounded-full bg-slate-100 shrink-0 mr-4 overflow-hidden border border-slate-200 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={chat.avatar_url} alt={chat.full_name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-bold text-[14px] text-slate-800 truncate pr-2">{chat.full_name}</h3>
                      <span className="text-[10px] font-medium text-slate-400 shrink-0">{chat.last_time}</span>
                    </div>
                    <p className="text-[12px] font-medium text-slate-500 truncate">{chat.last_message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // ================== TAMPILAN RUANG CHAT ==================
  return (
    <div className="h-[100dvh] w-full max-w-[100vw] flex flex-col bg-[#F2FDFB] text-slate-800 overflow-hidden overflow-x-hidden relative animate-in slide-in-from-right-4 duration-300">
      <header className="w-full bg-white/95 backdrop-blur-md z-40 px-4 py-3 flex items-center justify-between border-b border-slate-100 shrink-0 shadow-sm">
        <div className="flex items-center space-x-3 mt-2">
          <button onClick={() => setView('list')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden border border-slate-200 shadow-sm">
               {/* eslint-disable-next-line @next/next/no-img-element */}
               <img src={activeUser?.avatar_url} alt="User" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-slate-800 leading-tight">{activeUser?.full_name}</h1>
              <div className="flex items-center mt-0.5">
                <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                  Obrolan Aktif {/* Wording universal */}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 scrollbar-hide space-y-4 pb-20">
        <div className="flex justify-center mb-6 mt-2">
          <span className="bg-teal-50 border border-teal-100 text-teal-700 text-[10px] font-bold px-4 py-1.5 rounded-full tracking-widest uppercase shadow-sm">
            Riwayat Pesan
          </span>
        </div>

        {messages.map((msg) => {
          const isMe = msg.sender === 'me';
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
              <div className="max-w-[85%] sm:max-w-[75%] flex flex-col">
                <div className={`px-4 py-2.5 text-[13px] font-medium shadow-sm relative transition-all duration-300 break-words whitespace-pre-wrap ${
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
        })}
        <div ref={chatEndRef} />
      </main>

      <div className="w-full bg-white/95 backdrop-blur-xl px-4 py-4 md:pb-8 pb-6 border-t border-slate-100 shrink-0 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
        <form onSubmit={handleSendReply} className="flex items-center space-x-2">
          <input 
            type="text"
            ref={inputRef} 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Ketik pesan...`}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-5 py-3.5 text-[13px] font-medium text-slate-800 focus:outline-none focus:border-teal-400 focus:bg-white transition-colors shadow-inner placeholder:text-slate-400"
          />
          <button 
            type="submit" 
            onMouseDown={(e) => e.preventDefault()}
            onTouchStart={(e) => e.preventDefault()}
            disabled={!inputText.trim() || isSending} 
            className="w-[46px] h-[46px] rounded-full bg-teal-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-teal-500/30 hover:bg-teal-600 transition-all disabled:opacity-50 disabled:grayscale"
          >
            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
          </button>
        </form>
      </div>
    </div>
  );
}