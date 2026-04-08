'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle } from 'lucide-react';

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
      content: `Hi! 👋 I'm your travel planning assistant for your ${itinerary.destination} trip. I can help you modify your itinerary, answer questions, or suggest improvements. Are you happy with your current plan, or would you like to make some changes?`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    // Add user message
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

      // Add assistant response
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.message
        }
      ]);

      // Handle modifications if suggested
      if (data.modifications) {
        console.log('Suggested modification:', data.modifications);
      }
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

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans">
      {/* Chat Button */}
      {!showChat && (
        <button
          onClick={() => setShowChat(true)}
          className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg hover:shadow-xl transform hover:scale-110 transition-all flex items-center justify-center"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat Window */}
      {showChat && (
        <div className="w-96 h-96 bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 flex justify-between items-center">
            <h3 className="font-bold text-lg">
              ✈️ {itinerary.destination} Travel Assistant
            </h3>
            <button
              onClick={() => setShowChat(false)}
              className="text-white hover:text-gray-200 text-xl"
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm text-gray-500">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-4 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask or suggest changes..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <button
                onClick={handleSendMessage}
                disabled={loading || !input.trim()}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-3 py-2 transition-colors disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="border-t border-gray-200 bg-gray-50 p-3 grid grid-cols-3 gap-2 text-xs">
            <button
              onClick={() => setInput("I'm satisfied with this itinerary")}
              className="bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded transition-colors"
            >
              Satisfied ✓
            </button>
            <button
              onClick={() => setInput('Can you suggest changes?')}
              className="bg-orange-100 hover:bg-orange-200 text-orange-700 px-2 py-1 rounded transition-colors"
            >
              Suggest Changes
            </button>
            <button
              onClick={() => setInput('Any tips for this trip?')}
              className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-2 py-1 rounded transition-colors"
            >
              Travel Tips
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
