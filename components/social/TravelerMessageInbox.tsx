'use client';

import { useEffect, useState } from 'react';
import { Inbox, LoaderCircle } from 'lucide-react';
import { getTravelerMessages, type TravelerMessage } from '@/services/social';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function TravelerMessageInbox() {
  const [messages, setMessages] = useState<TravelerMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getTravelerMessages()
      .then(setMessages)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load traveler messages'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="mt-8 rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2">
        <Inbox className="h-5 w-5 text-[#ea580c]" />
        <h2 className="text-xl font-black tracking-tight text-stone-950">Traveler messages</h2>
      </div>
      <p className="mt-1 text-sm text-[#7c6a72]">Messages other travelers sent from Explore.</p>

      {loading ? (
        <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-[#7c6a72]">
          <LoaderCircle className="h-4 w-4 animate-spin text-[#ea580c]" />
          Loading messages...
        </div>
      ) : error ? (
        <p className="mt-5 rounded-xl border border-[#be123c] bg-[#ffe4e6] px-4 py-3 text-sm text-[#be123c]">
          {error}
        </p>
      ) : messages.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-[#eaddc7] px-4 py-5 text-sm text-[#7c6a72]">
          No traveler messages yet.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {messages.map(message => (
            <article key={message.id} className="rounded-2xl border border-[#eaddc7] bg-[#fffbf2] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold text-[#1c1018]">
                  {message.sender?.display_name ?? 'Traveler'}
                </span>
                <span className="text-xs text-[#9b8b92]">{formatDate(message.created_at)}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#3a2540]">{message.body}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
