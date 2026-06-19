'use client';

import { ShieldCheck, X } from 'lucide-react';
import { startDiditVerification } from '@/services/social';

interface VerifyToUnlockProps {
  open: boolean;
  onClose: () => void;
  returnTo?: string;
}

export function VerifyToUnlock({ open, onClose, returnTo }: VerifyToUnlockProps) {
  if (!open) return null;

  async function handleVerify() {
    const { sessionUrl } = await startDiditVerification(returnTo);
    if (sessionUrl) window.location.href = sessionUrl;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEEDFE] text-[#6C63FF]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <h2 className="mt-4 text-lg font-semibold text-[#3F3D56]">Verify to unlock Open Trips</h2>
        <p className="mt-2 text-sm leading-6 text-[#6F6C82]">
          To create or join public trips and keep the community safe, confirm your identity with Didit. It takes a couple of minutes.
        </p>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#6F6C82]">
            Not now
          </button>
          <button onClick={handleVerify} className="flex-1 rounded-xl bg-[#6C63FF] px-4 py-2.5 text-sm font-semibold text-white">
            Verify with Didit
          </button>
        </div>
      </div>
    </div>
  );
}
