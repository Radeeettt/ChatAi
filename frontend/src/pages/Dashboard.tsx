import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../utils/api';

interface Contact {
  id: number;
  phoneNumber: string;
  name: string;
  isAiActive: boolean; 
  messages?: Message[];
}

interface Message {
  id: number;
  text: string;
  isFromMe: boolean;
  createdAt: string;
}

const Dashboard = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchContacts();

    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001');
    
    socket.on('new_message', (data: { contact: Contact, message: Message }) => {
      // Update contacts list if new
      setContacts(prev => {
        const exists = prev.find(c => c.id === data.contact.id);
        if (exists) {
          return prev.map(c => c.id === data.contact.id ? { ...c, messages: [data.message] } : c);
        }
        return [{ ...data.contact, messages: [data.message] }, ...prev];
      });

      // Update active chat if currently open
      setActiveContact(prevActive => {
        if (prevActive?.id === data.contact.id) {
          setMessages(prev => [...prev, data.message]);
        }
        return prevActive;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (activeContact) {
      fetchMessages(activeContact.id);
    }
  }, [activeContact?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchContacts = async () => {
    try {
      const res = await api.get('/chat/contacts');
      setContacts(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMessages = async (contactId: number) => {
    try {
      const res = await api.get(`/chat/messages/${contactId}`);
      setMessages(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const toggleAi = async () => {
    if (!activeContact) return;
    try {
      const newStatus = !activeContact.isAiActive;
      await api.post(`/chat/toggle-ai/${activeContact.id}`, { isAiActive: newStatus });
      setActiveContact({ ...activeContact, isAiActive: newStatus });
      setContacts(prev => prev.map(c => c.id === activeContact.id ? { ...c, isAiActive: newStatus } : c));
    } catch (error) {
      console.error(error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeContact) return;

    try {
      const res = await api.post(`/chat/send/${activeContact.id}`, { text: inputText });
      setMessages(prev => [...prev, res.data]);
      setInputText('');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: 'var(--bg-dark)' }}>
      {/* Contacts List */}
      <div style={{ width: '300px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Inbox</h2>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {contacts.map(c => (
            <div 
              key={c.id} 
              onClick={() => setActiveContact(c)}
              style={{
                padding: '1rem',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                background: activeContact?.id === c.id ? 'var(--bg-card)' : 'transparent',
                transition: 'background 0.2s',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <p style={{ fontWeight: '500', color: 'white' }}>{c.name || c.phoneNumber}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                  {c.messages?.[0]?.text || 'No messages yet'}
                </p>
              </div>
              {!c.isAiActive && (
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }} title="Human Handled" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      {activeContact ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-darker)' }}>
          {/* Chat Header */}
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'white' }}>{activeContact.name || activeContact.phoneNumber}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{activeContact.phoneNumber}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.85rem', color: activeContact.isAiActive ? 'var(--primary)' : 'var(--success)' }}>
                {activeContact.isAiActive ? '🤖 AI Active' : '🧑‍💻 Human Active'}
              </span>
              <button 
                onClick={toggleAi}
                style={{
                  background: activeContact.isAiActive ? 'transparent' : 'var(--primary)',
                  color: activeContact.isAiActive ? 'var(--primary)' : 'white',
                  border: `1px solid var(--primary)`,
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.85rem',
                  fontWeight: '500'
                }}
              >
                {activeContact.isAiActive ? 'Take Over (Human)' : 'Re-enable AI'}
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ display: 'flex', justifyContent: msg.isFromMe ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  background: msg.isFromMe ? 'var(--chat-bubble-me)' : 'var(--chat-bubble-them)',
                  color: 'white',
                  padding: '0.75rem 1rem',
                  borderRadius: '1rem',
                  borderBottomRightRadius: msg.isFromMe ? '0.2rem' : '1rem',
                  borderBottomLeftRadius: !msg.isFromMe ? '0.2rem' : '1rem',
                  maxWidth: '70%',
                  lineHeight: '1.5'
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            <form onSubmit={sendMessage} style={{ display: 'flex', gap: '1rem' }}>
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a message..." 
                style={{ flex: 1, padding: '1rem', borderRadius: '2rem' }}
                disabled={activeContact.isAiActive}
              />
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ borderRadius: '2rem', padding: '0 2rem' }}
                disabled={activeContact.isAiActive || !inputText.trim()}
              >
                Send
              </button>
            </form>
            {activeContact.isAiActive && (
              <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Take over chat to send manual messages.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Select a conversation to start chatting
        </div>
      )}
    </div>
  );
};

export default Dashboard;
