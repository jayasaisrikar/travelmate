'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BadgeCheck, Check, Clock3, Inbox, LoaderCircle, Send, X } from 'lucide-react';
import {
  cancelTripmateRequest,
  listTripmateRequests,
  respondToTripmateRequest,
  REQUEST_REASONS,
  type TripmateRequest,
  type TripmateRequestReason,
} from '@/services/social';

const reasonLabel = (reason: TripmateRequestReason) =>
  REQUEST_REASONS.find(r => r.id === reason)?.label ?? reason;

function Avatar({ req }: { req: TripmateRequest }) {
  const name = req.counterpart?.display_name ?? 'Traveler';
  if (req.counterpart?.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={req.counterpart.avatar_url} alt={name} className="h-10 w-10 rounded-full object-cover" />
    );
  }
  return (
    <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#6C63FF] to-[#FF6584] text-sm font-bold text-white">
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

const statusBadge: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-[#FBFAFF] text-[#8A869C] border-[#DDDCE8]' },
  accepted: { label: 'Connected', className: 'bg-[#F0FBF4] text-[#1B7A5A] border-[#BEE8D0]' },
  declined: { label: 'Declined', className: 'bg-[#FFF0F4] text-[#C14D72] border-[#F5B8C8]' },
  expired: { label: 'Expired', className: 'bg-[#FFF9EB] text-[#A07800] border-[#F0D9A8]' },
  cancelled: { label: 'Cancelled', className: 'bg-[#F4F3F4] text-[#8A869C] border-[#DDDCE8]' },
};

export function RequestInbox() {
  const [incoming, setIncoming] = useState<TripmateRequest[]>([]);
  const [outgoing, setOutgoing] = useState<TripmateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await listTripmateRequests();
      setIncoming(data.incoming);
      setOutgoing(data.outgoing);
    } catch {
      setIncoming([]);
      setOutgoing([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const respond = async (id: string, action: 'accept' | 'decline') => {
    setBusyId(id);
    try {
      const updated = await respondToTripmateRequest(id, action);
      setIncoming(prev => prev.map(r => (r.id === id ? { ...r, status: updated.status } : r)));
    } catch {
      /* leave as-is on failure */
    } finally {
      setBusyId(null);
    }
  };

  const cancel = async (id: string) => {
    setBusyId(id);
    try {
      await cancelTripmateRequest(id);
      setOutgoing(prev => prev.map(r => (r.id === id ? { ...r, status: 'cancelled' } : r)));
    } catch {
      /* leave as-is on failure */
    } finally {
      setBusyId(null);
    }
  };

  const pendingIncoming = incoming.filter(r => r.status === 'pending');

  return (
    <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#F4F3FF] text-[#6C63FF]">
          <Inbox size={17} />
        </div>
        <div>
          <h2 className="text-base font-black tracking-tight text-slate-900">Tripmate requests</h2>
          <p className="text-xs text-[#8A869C]">Accept a request to unlock messaging.</p>
        </div>
        {pendingIncoming.length > 0 && (
          <span className="ml-auto rounded-full bg-[#6C63FF] px-2.5 py-1 text-xs font-bold text-white">
            {pendingIncoming.length} new
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-[#6F6C82]">
          <LoaderCircle size={15} className="animate-spin text-[#6C63FF]" />
          Loading requests…
        </div>
      ) : incoming.length === 0 && outgoing.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[#DDDCE8] bg-[#FBFAFF] px-4 py-6 text-center text-sm text-[#6F6C82]">
          No tripmate requests yet. Head to{' '}
          <span className="font-semibold text-[#6C63FF]">Explore</span> to find travellers heading your way.
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {/* Incoming */}
          {incoming.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#8A869C]">Received</p>
              <ul className="space-y-2.5">
                <AnimatePresence initial={false}>
                  {incoming.map(req => (
                    <motion.li
                      key={req.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="rounded-2xl border border-[#E4E2F0] bg-white p-3.5"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar req={req} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-bold text-[#1A1726]">
                              {req.counterpart?.display_name ?? 'Traveler'}
                            </span>
                            {req.counterpart?.verified && (
                              <BadgeCheck size={13} className="text-[#1B7A5A]" />
                            )}
                            <span className="rounded-full bg-[#F4F3FF] px-2 py-0.5 text-[10px] font-semibold text-[#6C63FF]">
                              {reasonLabel(req.reason)}
                            </span>
                            {typeof req.match_score === 'number' && (
                              <span className="text-[11px] font-bold text-[#6C63FF]">{req.match_score}% match</span>
                            )}
                          </div>
                          {req.message && (
                            <p className="mt-1 text-sm leading-5 text-[#6F6C82]">“{req.message}”</p>
                          )}

                          {req.status === 'pending' ? (
                            <div className="mt-2.5 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => void respond(req.id, 'accept')}
                                disabled={busyId === req.id}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[#6C63FF] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#5b54e7] disabled:opacity-60"
                              >
                                {busyId === req.id ? <LoaderCircle size={13} className="animate-spin" /> : <Check size={13} />}
                                Accept
                              </button>
                              <button
                                type="button"
                                onClick={() => void respond(req.id, 'decline')}
                                disabled={busyId === req.id}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-[#DDDCE8] px-3 py-1.5 text-xs font-semibold text-[#6F6C82] transition hover:border-[#C14D72] hover:text-[#C14D72] disabled:opacity-60"
                              >
                                <X size={13} />
                                Decline
                              </button>
                            </div>
                          ) : (
                            <span className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusBadge[req.status]?.className ?? ''}`}>
                              {statusBadge[req.status]?.label ?? req.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          )}

          {/* Outgoing */}
          {outgoing.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#8A869C]">Sent</p>
              <ul className="space-y-2.5">
                {outgoing.map(req => (
                  <li key={req.id} className="flex items-center gap-3 rounded-2xl border border-[#E4E2F0] bg-white p-3.5">
                    <Avatar req={req} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-bold text-[#1A1726]">
                          {req.counterpart?.display_name ?? 'Traveler'}
                        </span>
                        <span className="rounded-full bg-[#F4F3FF] px-2 py-0.5 text-[10px] font-semibold text-[#6C63FF]">
                          {reasonLabel(req.reason)}
                        </span>
                      </div>
                      <span className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusBadge[req.status]?.className ?? ''}`}>
                        {req.status === 'pending' ? <Clock3 size={11} /> : req.status === 'accepted' ? <Check size={11} /> : <Send size={11} />}
                        {statusBadge[req.status]?.label ?? req.status}
                      </span>
                    </div>
                    {req.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => void cancel(req.id)}
                        disabled={busyId === req.id}
                        className="rounded-lg border border-[#DDDCE8] px-2.5 py-1.5 text-xs font-semibold text-[#8A869C] transition hover:border-[#C14D72] hover:text-[#C14D72] disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
