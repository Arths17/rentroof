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
      content: 'Hi! How can I help you today?',
      sender: 'assistant',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 100)}px`;
  }, [input]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

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

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          content: data.response,
          sender: 'assistant',
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage(e as unknown as React.FormEvent);
    }
  };

  return (
    <div className="flex h-full flex-col bg-[color:var(--bg)]">
      {/* Header */}
      <div className="border-b px-4 py-2.5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <p className="text-sm font-medium text-[color:var(--paper)]">Chat</p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ minHeight: 0 }}>
        <div className="space-y-3">
          {messages.map((message) => {
            const isUser = message.sender === 'user';
            return (
              <div
                key={message.id}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className="max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed"
                  style={{
                    backgroundColor: isUser ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                    color: '#fff',
                  }}
                >
                  {message.content}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex justify-start">
              <div
                className="flex gap-1 rounded-2xl px-3 py-2"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
              >
                <div
                  className="h-1 w-1 animate-bounce rounded-full"
                  style={{ backgroundColor: 'var(--mid)' }}
                />
                <div
                  className="h-1 w-1 animate-bounce rounded-full"
                  style={{ backgroundColor: 'var(--mid)', animationDelay: '0.1s' }}
                />
                <div
                  className="h-1 w-1 animate-bounce rounded-full"
                  style={{ backgroundColor: 'var(--mid)', animationDelay: '0.2s' }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-center">
              <div
                className="max-w-[75%] rounded-2xl px-3 py-2 text-center text-xs"
                style={{
                  backgroundColor: 'rgba(220, 38, 38, 0.1)',
                  color: '#fca5a5',
                }}
              >
                {error}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t px-3 py-2.5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <div
            className="flex flex-1 items-center rounded-xl border px-3"
            style={{ borderColor: 'rgba(255,255,255,0.12)' }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message..."
              disabled={isLoading}
              rows={1}
              className="w-full resize-none bg-transparent py-2 text-sm outline-none placeholder:text-[rgba(255,255,255,0.4)] disabled:cursor-not-allowed"
              style={{ color: 'var(--paper)', minHeight: '1.75rem', maxHeight: '80px' }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-opacity disabled:opacity-40"
            style={{
              backgroundColor: isLoading || !input.trim() ? 'rgba(232,79,43,0.3)' : 'var(--accent)',
              color: '#fff',
              border: 'none',
            }}
            aria-label="Send"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M2 21L23 12L2 3V10L17 12L2 14V21Z" fill="currentColor" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
