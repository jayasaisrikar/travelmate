'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ItineraryChatProps {
  itinerary: any;
  tripId: string;
  onSave?: (updatedItinerary: any) => Promise<void>;
}

export default function ItineraryChat({ itinerary, tripId, onSave }: ItineraryChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Hi! 👋 I'm your travel planning assistant for your ${itinerary.destination} trip. Are you happy with your current plan, or would you like to make some changes?`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          itinerary,
          conversationHistory: messages
        })
      });

      if (!response.ok) throw new Error('Chat failed');

      const data = await response.json();

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.message
        }
      ]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!showChat) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans w-96 max-h-screen">
      <div className="w-full h-[550px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 flex justify-between items-center flex-shrink-0">
          <h3 className="font-bold text-lg">✈️ {itinerary.destination} Assistant</h3>
          <button
            onClick={() => setShowChat(false)}
            className="text-white hover:text-gray-200 text-2xl font-bold transition hover:scale-110"
          >
            ×
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-white">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-xs px-4 py-3 rounded-xl text-sm break-words ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white rounded-br-none font-medium shadow-md'
                    : 'bg-white border-2 border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border-2 border-gray-200 px-4 py-2 rounded-xl text-sm text-gray-500 shadow-sm">
                <span className="inline-block animate-bounce">⏳</span> Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        <div className="border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 p-3 grid grid-cols-3 gap-2 text-xs flex-shrink-0">
          <button
            onClick={() => setInput('I love this itinerary!')}
            className="bg-green-100 hover:bg-green-200 text-green-700 px-2 py-2 rounded-lg font-bold transition-all hover:scale-105"
          >
            👍 Love It
          </button>
          <button
            onClick={() => setInput('Can you suggest changes?')}
            className="bg-orange-100 hover:bg-orange-200 text-orange-700 px-2 py-2 rounded-lg font-bold transition-all hover:scale-105"
          >
            ✏️ Modify
          </button>
          <button
            onClick={() => setInput('What are travel tips?')}
            className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-2 py-2 rounded-lg font-bold transition-all hover:scale-105"
          >
            💡 Tips
          </button>
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-3 bg-white flex-shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask a question..."
              className="flex-1 border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
              autoFocus
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !input.trim()}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold hover:shadow-md"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
