'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BadgeCheck, Check, LoaderCircle, Send, ShieldCheck, Sparkles, X } from 'lucide-react';
import {
  REQUEST_REASONS,
  REQUEST_MESSAGE_LIMIT,
  sendTripmateRequest,
  type TravelerWithSignal,
  type TripmateRequestReason,
} from '@/services/social';

interface RequestModalProps {
  open: boolean;
  onClose: () => void;
  traveler: TravelerWithSignal;
  /** Called with the resulting status: 'request_sent' or 'connected'. */
  onSent: (status: 'request_sent' | 'connected') => void;
}

export function RequestModal({ open, onClose, traveler, onSent }: RequestModalProps) {
  const [reason, setReason] = useState<TripmateRequestReason | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const name = traveler.display_name ?? 'this traveller';
  const score = traveler.match_score;

  const matchLine = useMemo(() => {
    const reasons = traveler.match_reasons ?? [];
    if (reasons.length === 0) return null;
    return reasons.slice(0, 3).join(' · ');
  }, [traveler.match_reasons]);

  const close = () => {
    if (sending) return;
    setReason(null);
    setMessage('');
    setError('');
    onClose();
  };

  const handleSend = async () => {
    if (!reason) {
      setError('Pick a reason so they understand why you’re reaching out.');
      return;
    }
    setSending(true);
    setError('');
    try {
      const result = await sendTripmateRequest({
        toUserId: traveler.id,
        reason,
        message: message.trim() || undefined,
        toSignalId: traveler.signal_id,
      });
      onSent(result.status === 'accepted' ? 'connected' : 'request_sent');
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your request');
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 px-4 py-6 backdrop-blur-sm sm:items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-[#f0e2d0] bg-white shadow-[0_30px_90px_rgba(46,40,51,0.28)]"
            role="dialog"
            aria-modal="true"
            aria-label={`Connect with ${name}`}
          >
            {/* Header with match context */}
            <div className="relative bg-[linear-gradient(135deg,#ffedd5_0%,#FFFFFF_55%,#ffe4e6_100%)] px-6 pb-5 pt-6">
              <button
                type="button"
                onClick={close}
                disabled={sending}
                aria-label="Close"
                className="absolute right-4 top-4 rounded-lg border border-white/70 bg-white/70 p-1.5 text-[#9b8b92] transition hover:bg-white disabled:opacity-50"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ea580c]">
                <Sparkles size={13} />
                Tripmate request
              </div>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-[#1c1018]">
                Connect with {name}
              </h2>

              {score !== null && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#D9CEF7] bg-white/80 px-3 py-1.5 text-sm font-bold text-[#ea580c]">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-[#ea580c] text-[11px] font-black text-white">
                    {score}
                  </span>
                  {score}% match
                </div>
              )}
              {matchLine && (
                <p className="mt-2 text-sm leading-5 text-[#7c6a72]">{matchLine}</p>
              )}
            </div>

            <div className="space-y-5 px-6 py-5">
              {/* Reason chips */}
              <div>
                <p className="text-sm font-bold text-[#1c1018]">Why are you reaching out?</p>
                <p className="mt-0.5 text-xs text-[#9b8b92]">
                  Choose a reason so {name} understands your intent.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {REQUEST_REASONS.map(r => {
                    const active = reason === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setReason(r.id)}
                        title={r.hint}
                        aria-pressed={active}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          active
                            ? 'border-[#ea580c] bg-[#ea580c] text-white shadow-[0_4px_14px_rgba(234,88,12,0.3)]'
                            : 'border-[#eaddc7] bg-white text-[#7c6a72] hover:border-[#ea580c] hover:text-[#ea580c]'
                        }`}
                      >
                        {active && <Check size={12} />}
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional message */}
              <div>
                <label htmlFor="request-message" className="text-sm font-bold text-[#1c1018]">
                  Add a note <span className="font-normal text-[#9b8b92]">(optional)</span>
                </label>
                <textarea
                  id="request-message"
                  value={message}
                  onChange={e => setMessage(e.target.value.slice(0, REQUEST_MESSAGE_LIMIT))}
                  rows={3}
                  placeholder={`Hi ${name}, I'm planning a similar trip and would love to compare notes…`}
                  className="mt-2 w-full resize-none rounded-xl border border-[#eaddc7] bg-[#fffbf2] px-4 py-3 text-sm leading-6 text-[#3a2540] outline-none placeholder:text-[#9b8b92] focus:border-[#ea580c] focus:ring-2 focus:ring-[#ea580c]/20"
                />
                <div className="mt-1 text-right text-xs text-[#9b8b92]">
                  {message.length}/{REQUEST_MESSAGE_LIMIT}
                </div>
              </div>

              {/* Safety notice */}
              <div className="flex items-start gap-2 rounded-xl bg-[#fff7ed] px-3 py-2.5 text-xs leading-5 text-[#7c6a72]">
                <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#ea580c]" />
                <span>
                  Keep it about the trip. For your safety, links, emails and phone numbers
                  aren’t allowed until {name} accepts and you’re connected.
                </span>
              </div>

              {error && (
                <p className="rounded-xl border border-[#be123c] bg-[#ffe4e6] px-4 py-2.5 text-sm text-[#be123c]">
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={sending || !reason}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#ea580c] py-3 text-sm font-bold text-white transition hover:bg-[#c2410c] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
                  {sending ? 'Sending…' : 'Send request'}
                </button>
                <button
                  type="button"
                  onClick={close}
                  disabled={sending}
                  className="rounded-xl border border-[#eaddc7] px-4 py-3 text-sm font-semibold text-[#3a2540] transition hover:bg-[#fffbf4] disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>

              {traveler.verified && (
                <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-[#1B7A5A]">
                  <BadgeCheck size={13} />
                  This traveller is identity-verified
                </p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
