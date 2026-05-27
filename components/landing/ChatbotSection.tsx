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
    <section className="py-20 px-4 bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Questions? Ask RentProof Assistant
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Get instant answers about features, pricing, and how RentProof can help you manage properties
          </p>
        </div>

        {/* Chat Container */}
        <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200">
          {/* Demo Chat */}
          <div className="h-64 md:h-80 overflow-y-auto p-6 bg-gray-50 space-y-4">
            <div className="flex justify-start">
              <div className="bg-blue-100 text-gray-900 px-4 py-2 rounded-lg rounded-tl-none max-w-xs">
                <p className="text-sm">Hi! I&apos;m the RentProof Assistant. Ask me anything about managing properties, tracking rent, or our pricing plans.</p>
              </div>
            </div>

            {response && (
              <div className="flex justify-start">
                <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg rounded-tl-none max-w-sm">
                  <p className="text-sm whitespace-pre-wrap">{response}</p>
                </div>
              </div>
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-200 text-gray-900 px-4 py-3 rounded-lg rounded-tl-none">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-900 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-900 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-900 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-center">
                <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm max-w-xs">
                  {error}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-6 bg-white border-t border-gray-200">
            <form onSubmit={handleAsk} className="flex gap-3">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Try: What is RentProof?"
                disabled={loading}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900"
              />
              <button
                type="submit"
                disabled={loading || !message.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Ask
              </button>
            </form>
          </div>
        </div>

        {/* Suggested Questions */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">Try asking:</p>
          <div className="flex flex-wrap justify-center gap-3">
            {['What features does RentProof have?', 'How much does it cost?', 'Do you support move-in walkthroughs?'].map(
              (q) => (
                <button
                  key={q}
                  onClick={() => {
                    setMessage(q)
                    setTimeout(() => {
                      const form = document.querySelector('form')
                      if (form) form.dispatchEvent(new Event('submit', { bubbles: true }))
                    }, 0)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:border-blue-600 hover:text-blue-600 transition-colors"
                >
                  {q}
                </button>
              )
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">Want to explore more?</p>
          <Link
            href="/chatbot"
            className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Open Full Chat →
          </Link>
        </div>
      </div>
    </section>
  )
}
