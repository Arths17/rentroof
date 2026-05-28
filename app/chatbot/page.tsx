import ChatBot from '@/components/ChatBot';

export const metadata = {
  title: 'RentProof Assistant | Property Management Help',
  description: 'Get instant help with RentProof features, pricing, and property management questions.',
};

export default function ChatBotPage() {
  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-b from-[rgba(10,10,15,1)] to-[rgba(13,15,19,1)] px-4 py-8 md:px-6 md:py-12">
      <div className="mx-auto w-full max-w-4xl flex-1">
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold tracking-[-0.04em] text-[color:var(--paper)] md:text-6xl">
            RentProof Assistant
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-6 text-[color:rgba(240,237,230,0.72)]">
            Ask anything about property management, pricing, maintenance, or tenant communication.
          </p>
        </div>

        <div className="h-[75vh] min-h-[680px] rounded-2xl border" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'var(--bg)' }}>
          <ChatBot />
        </div>
      </div>
    </main>
  );
}
