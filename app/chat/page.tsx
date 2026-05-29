"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MoreVertical, Send, Image as ImageIcon } from 'lucide-react';

const ChatPage = () => {
  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [inputText, setInputText] = useState('');
  
  // State untuk menyimpan daftar pesan
  const [messages, setMessages] = useState([
    { id: 1, text: 'Barangnya masih ada ya Kak??', sender: 'me', time: '10:00' },
    { id: 2, text: 'Masih ada kak....', sender: 'store', time: '10:02' },
    { id: 3, text: 'Silakan di order kak😁', sender: 'store', time: '10:02' },
    { id: 4, text: 'Oke kak', sender: 'me', time: '10:05' },
  ]);

  // Fungsi untuk scroll otomatis ke bawah setiap ada pesan baru
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fungsi mengirim pesan
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMessage = {
      id: Date.now(),
      text: inputText,
      sender: 'me',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages([...messages, newMessage]);
    setInputText(''); // Kosongkan input setelah kirim
  };

  return (
    // Menggunakan h-[100dvh] agar pas dengan layar HP (mengatasi navbar browser hp yang suka menutupi)
    <div className="h-[100dvh] w-full flex flex-col bg-fluent-bg text-text-main overflow-hidden relative">
      
      {/* ================= HEADER (shrink-0) ================= */}
      <header className="w-full bg-fluent-card/95 backdrop-blur-md z-40 px-4 py-4 md:pt-12 pt-6 flex items-center justify-between border-b border-white/5 shrink-0 shadow-sm">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => router.back()} 
            className="p-2 -ml-2 bg-transparent rounded-full text-text-main hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          {/* Profil Toko */}
          <div className="flex items-center space-x-3 cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-inner overflow-hidden">
              {/* Bisa diganti dengan tag <img> kalau ada logo sungguhan */}
              <span className="text-fluent-accent font-black text-xl tracking-tighter">A<span className="text-black">M</span></span>
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">ASOKA MAJU</h1>
              <div className="flex items-center mt-0.5">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
                <span className="text-[11px] text-text-muted">Online</span>
              </div>
            </div>
          </div>
        </div>

        <button className="p-2 text-text-muted hover:text-text-main transition-colors rounded-full hover:bg-white/5">
          <MoreVertical className="w-5 h-5" />
        </button>
      </header>

      {/* ================= AREA CHAT (flex-1 overflow-y-auto) ================= */}
      <main className="flex-1 overflow-y-auto p-5 scrollbar-hide space-y-4">
        
        {/* Tanggal Separator */}
        <div className="flex justify-center mb-6 mt-2">
          <span className="bg-white/5 text-text-muted text-[10px] font-bold px-3 py-1 rounded-full tracking-widest uppercase">
            Hari Ini
          </span>
        </div>

        {/* Looping Pesan */}
        {messages.map((msg) => {
          const isMe = msg.sender === 'me';
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[75%] flex flex-col">
                
                {/* Bubble Chat */}
                <div 
                  className={`px-4 py-2.5 text-sm shadow-md relative ${
                    isMe 
                      ? 'bg-fluent-accent text-white rounded-t-[20px] rounded-bl-[20px] rounded-br-[4px]' // Ujung runcing di kanan bawah
                      : 'bg-fluent-card border border-white/5 text-text-main rounded-t-[20px] rounded-br-[20px] rounded-bl-[4px]' // Ujung runcing di kiri bawah
                  }`}
                >
                  {msg.text}
                </div>
                
                {/* Waktu Pesan */}
                <span className={`text-[10px] text-text-muted mt-1.5 ${isMe ? 'text-right mr-1' : 'text-left ml-1'}`}>
                  {msg.time}
                </span>

              </div>
            </div>
          );
        })}
        
        {/* Elemen kosong untuk target autoscroll */}
        <div ref={chatEndRef} />
      </main>

      {/* ================= INPUT AREA (shrink-0) ================= */}
      <div className="w-full bg-fluent-card/95 backdrop-blur-xl px-4 py-4 md:pb-8 pb-6 border-t border-white/5 shrink-0 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.3)]">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          
          {/* Tombol Lampiran (Opsional, buat gaya-gayaan aja hehe) */}
          <button type="button" className="p-3 rounded-full text-text-muted hover:text-fluent-accent hover:bg-white/5 transition-colors shrink-0">
            <ImageIcon className="w-5 h-5" />
          </button>

          {/* Kotak Ketik */}
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Tulis pesan ..." 
            className="flex-1 bg-[#1A0B2E] border border-white/10 rounded-full px-5 py-3.5 text-sm text-text-main focus:outline-none focus:border-fluent-accent/50 transition-colors shadow-inner placeholder:text-text-muted/70"
          />

          {/* Tombol Kirim */}
          <button 
            type="submit"
            disabled={!inputText.trim()}
            className="w-12 h-12 rounded-full bg-fluent-accent flex items-center justify-center text-white shrink-0 shadow-[0_4px_15px_rgba(163,116,255,0.4)] hover:bg-[#b58eff] transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
          >
            {/* Icon Send biasanya sedikit digeser ke kanan (+ml-1) biar pas di tengah bulatannya */}
            <Send className="w-5 h-5 ml-1" /> 
          </button>

        </form>
      </div>

    </div>
  );
};

export default ChatPage;