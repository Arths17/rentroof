'use client'

import Link from 'next/link'
import { useState } from 'react'
import api from '@/lib/api'

export default function ChatbotSection() {
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setLoading(true)
    setError('')
    setResponse('')

    try {
      const data = await api.chatbot.sendMessage(message)
      if (data.error) {
        setError(data.error)
      } else {
        setResponse(data.response)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="py-16 px-4 md:py-24" style={{ background: 'linear-gradient(180deg, rgba(10,10,15,1), rgba(13,15,19,1))' }}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold tracking-[-0.04em] text-[color:var(--paper)] md:text-5xl">
            Questions? Ask instantly.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-6 text-[color:rgba(240,237,230,0.72)]">
            Get real-time answers about features, pricing, and how RentProof simplifies property management.
          </p>
        </div>

        <div className="mx-auto max-w-2xl rounded-2xl border" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'var(--bg)' }}>
          {/* Header */}
          <div className="border-b px-4 py-2.5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <p className="text-sm font-medium text-[color:var(--paper)]">Chat</p>
          </div>

          {/* Messages */}
          <div className="flex h-80 flex-col gap-3 overflow-y-auto px-4 py-4 space-y-3">
            <div className="flex justify-start">
              <div
                className="max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: '#fff',
                }}
              >
                Hi! I can help you with any questions about RentProof. Ask me about features, pricing, or property management.
              </div>
            </div>

            {response && (
              <div className="flex justify-start">
                <div
                  className="max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    color: '#fff',
                  }}
                >
                  {response}
                </div>
              </div>
            )}

            {loading && (
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
          </div>

          {/* Input */}
          <div className="border-t px-3 py-2.5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <form onSubmit={handleAsk} className="flex items-end gap-2">
              <div
                className="flex flex-1 items-center rounded-xl border px-3"
                style={{ borderColor: 'rgba(255,255,255,0.12)' }}
              >
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Message..."
                  disabled={loading}
                  className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-[rgba(255,255,255,0.4)] disabled:cursor-not-allowed"
                  style={{ color: 'var(--paper)' }}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !message.trim()}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-opacity disabled:opacity-40"
                style={{
                  backgroundColor: loading || !message.trim() ? 'rgba(232,79,43,0.3)' : 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 21L23 12L2 3V10L17 12L2 14V21Z" fill="currentColor" />
                </svg>
              </button>
            </form>
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/chatbot"
            className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(232,79,43,0.2)] transition-transform hover:scale-105"
          >
            Open full chat
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
