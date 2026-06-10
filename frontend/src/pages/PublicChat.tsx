import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../utils/api';

interface Message {
  id: number;
  text: string;
  isFromMe: boolean;
  createdAt: string;
}

const PublicChat = () => {
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [session, setSession] = useState<{ id: number; name: string; phoneNumber: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load session from localStorage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('public_chat_session');
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      setSession(parsed);
      fetchMessages(parsed.id);
    }
  }, []);

  // Listen for socket events when session is active
  useEffect(() => {
    if (!session) return;

    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001');

    socket.on('new_message', (data: { contact: { id: number }, message: Message }) => {
      if (data.contact.id === session.id) {
        setMessages(prev => {
          // Prevent duplicate messages in state
          if (prev.some(m => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });

        // If message is from AI (isFromMe is true, since AI represents the business)
        if (data.message.isFromMe) {
          setIsAiTyping(false);
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [session]);

  // Scroll to bottom on message change or typing state change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiTyping]);

  const fetchMessages = async (contactId: number) => {
    try {
      const res = await api.get(`/public-chat/messages/${contactId}`);
      setMessages(res.data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phoneNumber.trim()) return;

    setIsLoading(true);
    try {
      const res = await api.post('/public-chat/start', { name, phoneNumber });
      const contactData = res.data;
      const sessionData = {
        id: contactData.id,
        name: contactData.name || name,
        phoneNumber: contactData.phoneNumber,
      };
      setSession(sessionData);
      localStorage.setItem('public_chat_session', JSON.stringify(sessionData));
      fetchMessages(contactData.id);
    } catch (error) {
      console.error('Failed to start chat:', error);
      alert('Terjadi kesalahan saat memulai chat. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !session) return;

    const userText = inputText;
    setInputText('');
    setIsAiTyping(true); // Show typing indicator right away as AI responds fast

    try {
      await api.post('/public-chat/message', {
        contactId: session.id,
        text: userText,
      });
      // The socket event will trigger adding the message to state.
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsAiTyping(false);
      alert('Gagal mengirim pesan. Silakan coba lagi.');
    }
  };

  const handleLogout = () => {
    if (window.confirm('Apakah Anda yakin ingin keluar dari sesi chat ini?')) {
      localStorage.removeItem('public_chat_session');
      setSession(null);
      setMessages([]);
      setName('');
      setPhoneNumber('');
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.15), var(--bg-darker))',
      padding: '1rem',
      overflow: 'hidden'
    }}>
      {!session ? (
        // Onboarding Form
        <div 
          className="glass-panel animate-fade-in" 
          style={{
            width: '100%',
            maxWidth: '450px',
            padding: '2.5rem',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '3rem' }}>🤖</span>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'white', marginTop: '1rem' }}>
              Chat AI Asisten
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Mulai obrolan interaktif dengan asisten pintar kami untuk mendapatkan informasi instan.
            </p>
          </div>

          <form onSubmit={handleStartChat} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                Nama Lengkap
              </label>
              <input 
                type="text" 
                placeholder="Masukkan nama Anda"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  fontSize: '0.95rem',
                  borderRadius: '0.75rem',
                  background: 'rgba(15, 23, 42, 0.6)'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                Nomor WhatsApp
              </label>
              <input 
                type="tel" 
                placeholder="Contoh: 08123456789"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  fontSize: '0.95rem',
                  borderRadius: '0.75rem',
                  background: 'rgba(15, 23, 42, 0.6)'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                *Dapat digunakan untuk melanjutkan percakapan di WhatsApp nanti.
              </span>
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.9rem',
                fontSize: '1rem',
                fontWeight: '600',
                borderRadius: '0.75rem',
                marginTop: '0.5rem',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoading ? 'Menghubungkan...' : 'Mulai Obrolan'}
            </button>
          </form>
        </div>
      ) : (
        // Active Chat Interface
        <div 
          className="glass-panel animate-fade-in" 
          style={{
            width: '100%',
            maxWidth: '800px',
            height: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          {/* Header */}
          <div style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(30, 41, 59, 0.4)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem'
              }}>
                🤖
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'white' }}>AI Asisten Pelanggan</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.1rem' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: '500' }}>AI Aktif</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              style={{
                background: 'transparent',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border)'
              }}
              onMouseOver={e => e.currentTarget.style.color = 'var(--danger)'}
              onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              Keluar
            </button>
          </div>

          {/* Messages List */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            background: 'rgba(11, 15, 25, 0.4)'
          }}>
            {messages.length === 0 ? (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                gap: '0.5rem'
              }}>
                <span>👋 Halo {session.name}!</span>
                <span>Kirimkan pesan pertama Anda untuk mulai berkonsultasi.</span>
              </div>
            ) : (
              messages.map(msg => {
                // Here, message.isFromMe === true means the system/AI sent it.
                // message.isFromMe === false means the customer sent it.
                const isCustomer = !msg.isFromMe;
                return (
                  <div 
                    key={msg.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: isCustomer ? 'flex-end' : 'flex-start' 
                    }}
                  >
                    <div style={{
                      background: isCustomer ? 'var(--chat-bubble-me)' : 'var(--chat-bubble-them)',
                      color: 'white',
                      padding: '0.85rem 1.1rem',
                      borderRadius: '1.25rem',
                      borderBottomRightRadius: isCustomer ? '0.25rem' : '1.25rem',
                      borderBottomLeftRadius: !isCustomer ? '0.25rem' : '1.25rem',
                      maxWidth: '75%',
                      lineHeight: '1.5',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      fontSize: '0.95rem',
                      whiteSpace: 'pre-line'
                    }}>
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}

            {isAiTyping && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  background: 'var(--chat-bubble-them)',
                  color: 'var(--text-muted)',
                  padding: '0.85rem 1.1rem',
                  borderRadius: '1.25rem',
                  borderBottomLeftRadius: '0.25rem',
                  maxWidth: '75%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.9rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <span style={{ fontSize: '1rem', animation: 'spin 2s linear infinite' }}>🤖</span>
                  <span>AI sedang mengetik...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={{
            padding: '1.25rem 1.5rem',
            borderTop: '1px solid var(--border)',
            background: 'rgba(30, 41, 59, 0.4)'
          }}>
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.75rem' }}>
              <input 
                type="text" 
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Ketik pertanyaan Anda di sini..." 
                disabled={isAiTyping}
                style={{
                  flex: 1,
                  padding: '0.85rem 1.25rem',
                  borderRadius: '2rem',
                  border: '1px solid var(--border)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  fontSize: '0.95rem'
                }}
              />
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={isAiTyping || !inputText.trim()}
                style={{
                  borderRadius: '2rem',
                  padding: '0 1.75rem',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: (isAiTyping || !inputText.trim()) ? 'not-allowed' : 'pointer'
                }}
              >
                Kirim
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicChat;
