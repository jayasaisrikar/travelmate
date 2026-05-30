'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LoaderCircle, MessageCircle, Send, X } from 'lucide-react';
import { sendTravelerMessage } from '@/services/social';

interface MessageButtonProps {
  userId: string;
  travelerName: string | null;
}

export function MessageButton({ userId, travelerName }: MessageButtonProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const close = () => {
    if (sending) return;
    setOpen(false);
    setError('');
    setSent(false);
    setMessage('');
  };

  const handleSend = async () => {
    const text = message.trim();
    if (!text) {
      setError('Write a message first.');
      return;
    }

    setSending(true);
    setError('');
    try {
      await sendTravelerMessage(userId, text);
      setSent(true);
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-[#DDDCE8] bg-white px-3 py-1.5 text-xs font-semibold text-[#3F3D56] transition hover:border-[#6C63FF] hover:text-[#6C63FF]"
      >
        <MessageCircle size={13} />
        Message traveler
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 12 }}
              className="w-full max-w-md rounded-2xl border border-[#DDDCE8] bg-white p-5 shadow-[0_30px_80px_rgba(46,40,51,0.22)]"
              role="dialog"
              aria-modal="true"
              aria-label={`Message ${travelerName ?? 'traveler'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-[#1A1726]">
                    Message {travelerName ?? 'traveler'}
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-[#6F6C82]">
                    Keep it friendly and relevant to the trip. Maximum 500 characters.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  disabled={sending}
                  aria-label="Close message composer"
                  className="rounded-lg border border-[#DDDCE8] p-1.5 text-[#8A869C] transition hover:bg-[#F4F3FF] disabled:opacity-50"
                >
                  <X size={15} />
                </button>
              </div>

              {sent ? (
                <div className="mt-5">
                  <p className="rounded-xl border border-[#6C63FF] bg-[#EEEDFE] px-4 py-3 text-sm font-semibold text-[#3F3D56]">
                    Message sent.
                  </p>
                  <button
                    type="button"
                    onClick={close}
                    className="mt-4 rounded-xl bg-[#3F3D56] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#302F43]"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <textarea
                    value={message}
                    onChange={event => setMessage(event.target.value.slice(0, 500))}
                    rows={5}
                    placeholder="Hey, I am planning a similar trip..."
                    className="mt-5 w-full resize-none rounded-xl border border-[#DDDCE8] bg-[#FBFAFF] px-4 py-3 text-sm leading-6 text-[#3F3D56] outline-none placeholder:text-[#8A869C] focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20"
                  />
                  <div className="mt-1 text-right text-xs text-[#8A869C]">{message.length}/500</div>
                  {error && (
                    <p className="mt-3 rounded-xl border border-[#C14D72] bg-[#FFF0F4] px-4 py-2.5 text-sm text-[#C14D72]">
                      {error}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={sending}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#6C63FF] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5b54e7] disabled:opacity-60"
                  >
                    {sending ? <LoaderCircle size={15} className="animate-spin" /> : <Send size={15} />}
                    {sending ? 'Sending...' : 'Send message'}
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
