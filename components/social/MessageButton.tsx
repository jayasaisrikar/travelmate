'use client';

import { useState } from 'react';
import { LoaderCircle, MessageCircle, Send } from 'lucide-react';
import { sendTravelerMessage } from '@/services/social';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

interface MessageButtonProps {
  userId: string;
  travelerName: string | null;
}

const MAX_LENGTH = 500;
const WARN_LENGTH = 400;

export function MessageButton({ userId, travelerName }: MessageButtonProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  const close = () => {
    if (sending) return;
    setOpen(false);
    setError('');
    setMessage('');
  };

  const handleSend = async () => {
    const text = message.trim();
    if (!text) {
      setError('Write a message first.');
      return;
    }

    // Set loading before the await so the spinner shows immediately (no race).
    setSending(true);
    setError('');
    try {
      await sendTravelerMessage(userId, text);
      toast.success(`Message sent to ${travelerName ?? 'traveler'}.`);
      setOpen(false);
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const nearLimit = message.length >= WARN_LENGTH;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-[#DDDCE8] bg-white px-3 py-1.5 text-xs font-semibold text-[#3F3D56] transition hover:border-[#6C63FF] hover:text-[#6C63FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C63FF]/30"
      >
        <MessageCircle size={13} />
        Message traveler
      </button>

      <Modal
        open={open}
        onClose={close}
        dismissable={!sending}
        title={`Message ${travelerName ?? 'traveler'}`}
        description={`Keep it friendly and relevant to the trip. Maximum ${MAX_LENGTH} characters.`}
        footer={
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending}
            className="inline-flex items-center gap-2 rounded-xl bg-[#6C63FF] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5b54e7] disabled:opacity-60"
          >
            {sending ? <LoaderCircle size={15} className="animate-spin" /> : <Send size={15} />}
            {sending ? 'Sending…' : 'Send message'}
          </button>
        }
      >
        <textarea
          value={message}
          onChange={event => setMessage(event.target.value.slice(0, MAX_LENGTH))}
          rows={5}
          placeholder="Hey, I am planning a similar trip..."
          className="w-full resize-none rounded-xl border border-[#DDDCE8] bg-[#FBFAFF] px-4 py-3 text-sm leading-6 text-[#3F3D56] outline-none placeholder:text-[#8A869C] focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20"
        />
        <div
          className={`mt-1 text-right text-xs ${nearLimit ? 'font-semibold text-[#C14D72]' : 'text-[#8A869C]'}`}
        >
          {message.length}/{MAX_LENGTH}
        </div>
        {error && (
          <p
            role="alert"
            className="mt-3 rounded-xl border border-[#C14D72] bg-[#FFF0F4] px-4 py-2.5 text-sm text-[#C14D72]"
          >
            {error}
          </p>
        )}
      </Modal>
    </>
  );
}
