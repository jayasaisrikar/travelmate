'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Clock3, LoaderCircle, UserPlus } from 'lucide-react';
import { RequestModal } from '@/components/social/RequestModal';
import type { ConnectionStatus, TravelerWithSignal } from '@/services/social';

interface RequestButtonProps {
  traveler: TravelerWithSignal;
  status: ConnectionStatus;
  onStatusChange?: (next: ConnectionStatus) => void;
  /** Stretch to fill the container width. */
  block?: boolean;
}

export function RequestButton({ traveler, status, onStatusChange, block }: RequestButtonProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localStatus, setLocalStatus] = useState<ConnectionStatus>(status);

  const update = (next: ConnectionStatus) => {
    setLocalStatus(next);
    onStatusChange?.(next);
  };

  // The card doesn't carry the request id, so look it up from the inbox and
  // respond through the proper accept/decline endpoint.
  const respond = async (action: 'accept' | 'decline') => {
    setBusy(true);
    try {
      const { listTripmateRequests, respondToTripmateRequest } = await import('@/services/social');
      const { incoming } = await listTripmateRequests();
      const pending = incoming.find(r => r.from_user === traveler.id && r.status === 'pending');
      if (!pending) {
        // The request is gone (expired/cancelled) — reset to a clean state.
        update('none');
        return;
      }
      const result = await respondToTripmateRequest(pending.id, action);
      update(result.status === 'accepted' ? 'connected' : 'none');
    } catch {
      // Leave status unchanged on failure.
    } finally {
      setBusy(false);
    }
  };

  const baseClass = `inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-150 select-none ${
    block ? 'w-full py-2' : ''
  }`;

  if (localStatus === 'connected') {
    return (
      <span className={`${baseClass} bg-[#F0FBF4] text-[#1B7A5A]`}>
        <Check size={13} />
        Connected
      </span>
    );
  }

  if (localStatus === 'blocked') {
    return null;
  }

  if (localStatus === 'request_sent') {
    return (
      <span className={`${baseClass} border border-[#DDDCE8] bg-[#FBFAFF] text-[#8A869C]`}>
        <Clock3 size={13} />
        Requested
      </span>
    );
  }

  if (localStatus === 'request_received') {
    return (
      <div className="flex items-center gap-1.5">
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => void respond('accept')}
          disabled={busy}
          className={`${baseClass} bg-[#6C63FF] text-white shadow-[0_2px_12px_rgba(108,99,255,0.35)] disabled:opacity-60`}
        >
          {busy ? <LoaderCircle size={13} className="animate-spin" /> : <Check size={13} />}
          Accept
        </motion.button>
        <button
          type="button"
          onClick={() => void respond('decline')}
          disabled={busy}
          className="rounded-xl border border-[#DDDCE8] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#8A869C] transition hover:border-[#C14D72] hover:text-[#C14D72] disabled:opacity-60"
        >
          Decline
        </button>
      </div>
    );
  }

  // status === 'none'
  return (
    <>
      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen(true)}
        className={`${baseClass} bg-[#6C63FF] text-white shadow-[0_2px_12px_rgba(108,99,255,0.35)] hover:bg-[#5b54e7]`}
      >
        <UserPlus size={13} />
        Request to connect
      </motion.button>
      <RequestModal
        open={open}
        onClose={() => setOpen(false)}
        traveler={traveler}
        onSent={update}
      />
    </>
  );
}
