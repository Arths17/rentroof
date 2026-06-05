'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import api from '@/lib/api';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

const suggestedPrompts = [
  'How do I add a property?',
  'Show me overdue payments',
  'What maintenance is open?',
];

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
});

function renderRichText(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const lines = text.split('\n');

  const parseInline = (line: string, lineIndex: number) => {
    const parts: ReactNode[] = [];
    const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(line.slice(lastIndex, match.index));
      }

      const token = match[0];

      if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(
          <strong key={`${lineIndex}-${match.index}`}>{token.slice(2, -2)}</strong>
        );
      } else if (token.startsWith('*') && token.endsWith('*')) {
        parts.push(<em key={`${lineIndex}-${match.index}`}>{token.slice(1, -1)}</em>);
      } else if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code key={`${lineIndex}-${match.index}`}>{token.slice(1, -1)}</code>
        );
      }

      lastIndex = match.index + token.length;
    }

    if (lastIndex < line.length) {
      parts.push(line.slice(lastIndex));
    }

    return parts;
  };

  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) {
      nodes.push(<br key={`break-${lineIndex}`} />);
    }
    nodes.push(...parseInline(line, lineIndex));
  });

  return nodes;
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
    textarea.style.height = `${Math.min(textarea.scrollHeight, 104)}px`;
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

  const applyPrompt = (prompt: string) => {
    setInput(prompt);
    textareaRef.current?.focus();
  };

  return (
    <div className="chatbot-panel">
      <div className="chatbot-panel__grid" aria-hidden="true" />

      <header className="chatbot-header">
        <div className="chatbot-header__main">
          <div className="chatbot-avatar chatbot-avatar--brand" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M7 8.5C7 7.12 8.12 6 9.5 6h5C15.88 6 17 7.12 17 8.5v3C17 12.88 15.88 14 14.5 14H11l-3.5 3v-3H9.5C8.12 14 7 12.88 7 11.5v-3Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M9.5 9.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M9.5 11.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>

          <div className="chatbot-header__copy">
            <p className="chatbot-kicker">Personal AI Companion</p>
            <h2 className="chatbot-title">RentProof Assistant</h2>
            <p className="chatbot-subtitle">
              Ask about properties, tenants, rent, maintenance, or deposits without leaving the dashboard.
            </p>
          </div>
        </div>
      </header>

      <div className="chatbot-body">
        <section className="chatbot-prompts">
          <p className="chatbot-section-label">Quick prompts</p>
          <div className="chatbot-prompt-list">
            {suggestedPrompts.map((prompt) => (
              <button key={prompt} type="button" className="chatbot-prompt" onClick={() => applyPrompt(prompt)}>
                {prompt}
              </button>
            ))}
          </div>
        </section>

        <section className="chatbot-messages" aria-label="Chat messages">
          {messages.map((message) => {
            const isUser = message.sender === 'user';
            return (
              <div key={message.id} className={`chatbot-row ${isUser ? 'is-user' : 'is-assistant'}`}>
                {!isUser && <div className="chatbot-avatar chatbot-avatar--assistant">RPA</div>}

                <div className={`chatbot-bubble ${isUser ? 'chatbot-bubble--user' : 'chatbot-bubble--assistant'}`}>
                  <div className="chatbot-bubble__text">{renderRichText(message.content)}</div>
                  <div className={`chatbot-bubble__meta ${isUser ? 'is-user' : 'is-assistant'}`}>
                    {timeFormatter.format(message.timestamp)}
                  </div>
                </div>

                {isUser && <div className="chatbot-avatar chatbot-avatar--user">You</div>}
              </div>
            );
          })}

          {isLoading && (
            <div className="chatbot-row is-assistant">
              <div className="chatbot-avatar chatbot-avatar--assistant">AI</div>
              <div className="chatbot-typing">
                <span className="chatbot-typing__dot" />
                <span className="chatbot-typing__dot" />
                <span className="chatbot-typing__dot" />
                <span className="chatbot-typing__label">Thinking</span>
              </div>
            </div>
          )}

          {error && <div className="chatbot-error">{error}</div>}

          <div ref={messagesEndRef} />
        </section>
      </div>

      <footer className="chatbot-composer-wrap">
        <form onSubmit={handleSendMessage} className="chatbot-composer">
          <div className="chatbot-composer__field">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the assistant..."
              disabled={isLoading}
              rows={1}
              className="chatbot-composer__input"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="chatbot-send"
            aria-label="Send"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 21L23 12L2 3V10L17 12L2 14V21Z" fill="currentColor" />
            </svg>
          </button>
        </form>

        <p className="chatbot-composer-hint">Press Enter to send, Shift+Enter for a new line</p>
      </footer>
    </div>
  );
}
