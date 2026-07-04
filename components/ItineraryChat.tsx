'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Send, Sparkles, X } from 'lucide-react';
import type { GeneratedItinerary } from '@/lib/travel-types';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ItineraryChatProps {
  itinerary: GeneratedItinerary | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ItineraryChat({ itinerary, isOpen, onClose }: ItineraryChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedPrompts = useMemo(
    () => [
      'Make this itinerary lighter and slower.',
      'Suggest food stops near each day.',
      'Make this more budget friendly.',
      'What should I skip if I am short on time?',
    ],
    []
  );

  const renderAssistantMessage = (content: string) => {
    const lines = content
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    const blocks: ReactNode[] = [];
    let bulletGroup: string[] = [];

    const flushBullets = () => {
      if (bulletGroup.length === 0) {
        return;
      }

      blocks.push(
        <ul key={`bullets-${blocks.length}`} className="mt-2 space-y-2">
          {bulletGroup.map((line, index) => (
            <li key={`${line}-${index}`} className="flex items-start gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-[#6C63FF]" />
              <span>{line.replace(/^[-*•]\s*/, '')}</span>
            </li>
          ))}
        </ul>
      );
      bulletGroup = [];
    };

    lines.forEach((line, index) => {
      const isBullet = /^[-*•]\s+/.test(line) || /^\d+\.\s+/.test(line);
      const isHeading = /^[A-Za-z][A-Za-z\s]+:$/i.test(line) || /^#[#\s]/.test(line);

      if (isBullet) {
        bulletGroup.push(line);
        return;
      }

      flushBullets();

      if (isHeading) {
        blocks.push(
          <div key={`${line}-${index}`} className="mt-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#6C63FF]">
            {line.replace(/[:#]/g, '').trim()}
          </div>
        );
        return;
      }

      blocks.push(
        <p key={`${line}-${index}`} className={blocks.length === 0 ? 'leading-6' : 'mt-2 leading-6'}>
          {line}
        </p>
      );
    });

    flushBullets();

    if (blocks.length === 0) {
      return <p className="leading-6">{content}</p>;
    }

    return <div className="space-y-1">{blocks}</div>;
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [isOpen, messages]);

  const handleSendMessage = async (overrideMessage?: string) => {
    const userMessage = (overrideMessage ?? input).trim();

    if (!userMessage || loading) {
      return;
    }

    const nextMessages = [...messages, { role: 'user' as const, content: userMessage }];

    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          itinerary,
          conversationHistory: nextMessages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Chat failed');
      }

      setMessages(previous => [
        ...previous,
        {
          role: 'assistant',
          content: data.message,
        },
      ]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(previous => [
        ...previous,
        {
          role: 'assistant',
          content: 'We could not reach the itinerary assistant. Please try again in a moment.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-4"
      >
        <motion.div
          initial={{ y: 24, scale: 0.98 }}
          animate={{ y: 0, scale: 1 }}
          exit={{ y: 24, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 180, damping: 24 }}
          className="flex h-[100dvh] w-full max-w-none flex-col overflow-hidden border border-[#DDDCE8] bg-[#FBFAFF] shadow-[0_30px_120px_rgba(46,40,51,0.18)] sm:h-[min(84vh,760px)] sm:max-w-[420px] sm:rounded-[32px]"
        >
          <div className="relative overflow-hidden border-b border-[#DDDCE8] bg-[#3F3D56] px-4 py-5 text-white sm:px-5">
            <div className="relative flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#6C63FF] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                  <Sparkles size={12} />
                  Trip Assistant
                </div>
                <h3 className="text-xl font-extrabold tracking-tight sm:text-2xl">{itinerary?.destination || 'Current itinerary'}</h3>
                <p className="max-w-[24rem] text-sm text-white">
                  Ask for swaps, pacing changes, budget help, or smarter routing.
                </p>
              </div>
              <button
                onClick={onClose}
                className="grid h-10 w-10 place-items-center border border-white bg-white text-[#3F3D56] transition hover:bg-[#FF6584]"
                aria-label="Close itinerary assistant"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-[#F2F2F2] px-4 py-4 sm:px-5">
            {messages.length === 0 && (
              <div className="mb-4 border border-[#DDDCE8] bg-white p-4 shadow-sm">
                <p className="text-sm leading-6 text-[#3F3D56]">
                  I can help you tighten the itinerary, swap stops, change the tempo, or make the plan cheaper.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {suggestedPrompts.map(prompt => (
                    <button
                      key={prompt}
                      onClick={() => handleSendMessage(prompt)}
                      disabled={loading}
                      className="rounded-2xl border border-[#DDDCE8] bg-[#FBFAFF] px-3 py-3 text-left text-sm font-medium text-[#3F3D56] transition hover:-translate-y-0.5 hover:border-[#6C63FF] hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-[22px] px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[78%] ${
                      message.role === 'user'
                        ? 'rounded-br-md bg-[#6C63FF] text-white'
                        : 'rounded-bl-md border border-[#DDDCE8] bg-white text-[#3F3D56]'
                    }`}
                  >
                    <div className={message.role === 'assistant' ? 'whitespace-normal' : 'whitespace-pre-wrap'}>
                      {message.role === 'assistant' ? renderAssistantMessage(message.content) : message.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {loading && (
              <div className="mt-3 flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-[18px] border border-[#DDDCE8] bg-white px-4 py-3 text-sm text-[#6F6C82] shadow-sm">
                  <motion.span animate={{ opacity: [0.35, 1, 0.35] }} transition={{ repeat: Infinity, duration: 1.1 }} className="h-2 w-2 rounded-full bg-[#6C63FF]" />
                  <motion.span animate={{ opacity: [0.35, 1, 0.35] }} transition={{ repeat: Infinity, duration: 1.1, delay: 0.15 }} className="h-2 w-2 rounded-full bg-[#FF6584]" />
                  <motion.span animate={{ opacity: [0.35, 1, 0.35] }} transition={{ repeat: Infinity, duration: 1.1, delay: 0.3 }} className="h-2 w-2 rounded-full bg-[#FF6584]" />
                  Thinking
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-[#DDDCE8] bg-white px-3 py-3 sm:px-4">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={event => setInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask about this itinerary"
                rows={1}
                className="min-h-[48px] max-h-28 flex-1 resize-none rounded-[18px] border border-[#DDDCE8] bg-[#FBFAFF] px-4 py-3 text-sm text-[#3F3D56] outline-none transition placeholder:text-[#8A869C] focus:border-[#6C63FF] focus:ring-4 focus:ring-[#6C63FF]/10"
                disabled={loading}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={loading || !input.trim()}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-[#6C63FF] text-white transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
