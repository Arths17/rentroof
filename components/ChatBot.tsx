'use client';

import { useState, useRef, useEffect } from 'react';
import api from '@/lib/api';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

export default function ChatBot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hi! I\'m the RentProof Assistant. Ask me anything about managing properties, tracking rent, handling maintenance, or our pricing plans.',
      sender: 'assistant',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.chatbot.sendMessage(input);

      if (data.error) {
        setError(data.error);
        return;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        sender: 'assistant',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full" style={{
      backgroundColor: 'var(--bg)',
      color: 'var(--paper)',
      borderRadius: '12px',
      border: 'none',
      boxShadow: '0 10px 30px rgba(2,6,23,0.06)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div className="px-4 py-3 border-b" style={{
        borderColor: 'transparent',
        backgroundColor: 'transparent',
      }}>
        <div style={{ 
          fontSize: '0.95rem', 
          fontWeight: '700', 
          color: 'var(--paper)',
          letterSpacing: '-0.01em',
        }}>
          Assistant
        </div>
        <div style={{ 
          fontSize: '0.7rem', 
          color: 'var(--mid)', 
          marginTop: '0.3rem',
          letterSpacing: '0.02em',
        }}>
          Powered by Gemini AI
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto" style={{ 
        backgroundColor: 'var(--bg)',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        minHeight: 0,
        overflowY: 'auto',
      }}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              style={{
                maxWidth: '80%',
                padding: '0.65rem 0.95rem',
                borderRadius: '14px',
                fontSize: '0.88rem',
                lineHeight: '1.45',
                wordBreak: 'break-word',
                backgroundColor: message.sender === 'user' ? 'var(--accent)' : 'var(--card-bg)',
                color: message.sender === 'user' ? '#fff' : 'var(--paper)',
                border: message.sender === 'user' ? 'none' : `1px solid rgba(255,255,255,0.03)` ,
                boxShadow: message.sender === 'user' ? '0 4px 14px rgba(99,102,241,0.12)' : 'none',
                backdropFilter: message.sender === 'assistant' ? 'saturate(120%) blur(2px)' : undefined,
              }}
            >
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {message.content}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border)',
                display: 'flex',
                gap: '0.5rem',
              }}
            >
              <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--mid)' }}></div>
              <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--mid)', animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--mid)', animationDelay: '0.2s' }}></div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              maxWidth: '90%',
              textAlign: 'center',
              backgroundColor: 'rgba(220, 38, 38, 0.08)',
              color: '#dc2626',
              border: '1px solid rgba(220, 38, 38, 0.2)',
              fontSize: '0.75rem',
              fontWeight: '500',
            }}>
              ⚠️ {error}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="border-t p-3" style={{
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        flexShrink: 0,
        marginTop: 'auto',
        padding: '1rem',
      }}>
        <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={isLoading}
            className="flex-1 rounded-full focus:outline-none transition-all disabled:cursor-not-allowed"
            style={{
              padding: '0.6rem 1rem',
              borderColor: 'transparent',
              backgroundColor: 'rgba(255,255,255,0.02)',
              color: 'var(--paper)',
              fontSize: '0.9rem',
              border: '1px solid rgba(255,255,255,0.03)',
              boxSizing: 'border-box',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)',
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-full transition-all flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              width: '44px',
              height: '44px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isLoading || !input.trim() ? 'rgba(255,255,255,0.03)' : 'var(--accent)',
              color: '#fff',
              fontSize: '0.9rem',
              border: 'none',
              cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M2 21L23 12L2 3V10L17 12L2 14V21Z" fill="currentColor" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
