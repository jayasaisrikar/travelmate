'use client';

import { MapPin, X } from 'lucide-react';

interface LocationConsentPromptProps {
  open: boolean;
  onGrant: () => void;
  onDismiss: () => void;
}

export function LocationConsentPrompt({ open, onGrant, onDismiss }: LocationConsentPromptProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-3xl border border-[#DDDCE8] bg-white p-5 shadow-2xl sm:inset-x-auto sm:right-6">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F4F3FF] text-[#6C63FF]">
          <MapPin className="h-5 w-5" />
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="rounded-lg p-1 text-[#8A869C] hover:bg-[#F4F3F4]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-[#1A1726]">Confirm you&apos;re on your trip?</h3>
      <p className="mt-1 text-xs leading-5 text-[#6F6C82]">
        We check your location just once during your trip dates so you can rate it afterward. We store only the
        coordinates and distance — nothing else.
      </p>
      <div className="mt-4 flex gap-2">
        <button
          onClick={onDismiss}
          className="flex-1 rounded-xl border border-[#DDDCE8] px-3 py-2 text-xs font-semibold text-[#6F6C82] transition hover:bg-[#F4F3F4]"
        >
          Not now
        </button>
        <button
          onClick={onGrant}
          className="flex-1 rounded-xl bg-[#6C63FF] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#5b54e7]"
        >
          Allow location
        </button>
      </div>
    </div>
  );
}
