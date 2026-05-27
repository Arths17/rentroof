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
      backgroundColor: 'var(--card-bg)',
      color: 'var(--paper)',
    }}>
      {/* Header */}
      <div className="px-4 py-4 border-b" style={{
        borderColor: 'var(--border)',
        backgroundColor: 'var(--card-bg)',
      }}>
        <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--paper)', marginBottom: '0.5rem' }}>
          💬 Assistant
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--mid)', lineHeight: '1.4' }}>
          Ask anything about managing your properties
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundColor: 'var(--bg)' }}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] px-4 py-3 rounded-lg text-sm leading-relaxed ${
                message.sender === 'user'
                  ? 'rounded-br-none'
                  : 'rounded-bl-none'
              }`}
              style={{
                backgroundColor: message.sender === 'user' ? 'var(--accent)' : 'var(--bg-raised)',
                color: message.sender === 'user' ? '#fff' : 'var(--paper)',
                borderColor: 'var(--border)',
                ...(message.sender !== 'user' && { border: '1px solid var(--border)' }),
              }}
            >
              <p className="whitespace-pre-wrap break-words m-0" style={{ fontSize: '0.825rem', lineHeight: '1.5' }}>
                {message.content}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-lg rounded-bl-none" style={{
              backgroundColor: 'var(--bg-raised)',
              borderColor: 'var(--border)',
              border: '1px solid var(--border)',
            }}>
              <div className="flex space-x-2">
                <div className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--mid)' }}></div>
                <div className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--mid)', animationDelay: '0.1s' }}></div>
                <div className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--mid)', animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="px-4 py-3 rounded-lg text-xs max-w-[85%] text-center" style={{
              backgroundColor: 'rgba(220, 38, 38, 0.1)',
              color: '#dc2626',
              border: '1px solid rgba(220, 38, 38, 0.2)',
              fontSize: '0.775rem',
              lineHeight: '1.4',
            }}>
              ⚠️ {error}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="border-t p-4" style={{
        borderColor: 'var(--border)',
        backgroundColor: 'var(--card-bg)',
      }}>
        <form onSubmit={handleSendMessage} className="flex gap-2.5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask..."
            disabled={isLoading}
            className="flex-1 px-3.5 py-2.5 border rounded focus:outline-none focus:ring-1 disabled:cursor-not-allowed transition-colors"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--bg)',
              color: 'var(--paper)',
              fontSize: '0.85rem',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.boxShadow = '0 0 0 1px var(--accent)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2.5 text-white rounded font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 hover:opacity-90"
            style={{
              backgroundColor: 'var(--accent)',
              fontSize: '0.85rem',
              border: 'none',
              cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
              minWidth: '40px',
              textAlign: 'center',
            }}
          >
            →
          </button>
        </form>
      </div>
    </div>
  );
}
