import ChatBot from '@/components/ChatBot';

export const metadata = {
  title: 'RentProof Assistant | Property Management Help',
  description: 'Get instant help with RentProof features, pricing, and property management questions.',
};

export default function ChatBotPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            RentProof Assistant
          </h1>
          <p className="text-lg text-gray-600">
            Ask any questions about managing your properties with RentProof
          </p>
        </div>

        <div className="h-[600px]">
          <ChatBot />
        </div>

        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="font-bold text-gray-900 mb-2">Things you can ask:</h3>
          <ul className="text-gray-700 space-y-1 text-sm">
            <li>• What is RentProof?</li>
            <li>• How do I track rent payments?</li>
            <li>• What features are included in each pricing plan?</li>
            <li>• How does the deposit tracking work?</li>
            <li>• Tell me about maintenance request management</li>
            <li>• How do I use the tenant portal?</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
