'use client';

import { useState } from 'react';
import { Globe2, Check, Copy } from 'lucide-react';
import { setTripPublished } from '@/lib/publish-client';
import { isVerificationRequiredError } from '@/hooks/useVerificationGate';
import { VerifyToUnlock } from '@/components/social/VerifyToUnlock';
import type { Trip } from '@/lib/supabase-trips';

export function PublishToggle({ trip }: { trip: Trip }) {
  const [published, setPublished] = useState(!!trip.is_published);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showVerify, setShowVerify] = useState(false);

  async function toggle() {
    const next = !published;
    setBusy(true);
    setError('');
    setPublished(next); // optimistic
    try {
      const result = await setTripPublished(trip.id, next);
      setPublished(result.is_published);
    } catch (e) {
      setPublished(!next); // rollback
      if (isVerificationRequiredError(e)) {
        setShowVerify(true);
      } else {
        setError("We couldn't update publishing — please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  function copyLink() {
    const url = `${window.location.origin}/itinerary/${trip.id}`;
    navigator.clipboard
      ?.writeText(url)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }

  return (
    <section className="rounded-[28px] border border-[#DDDCE8] bg-white p-5 shadow-[0_16px_48px_rgba(46,40,51,0.06)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EEEDFE] text-[#6C63FF]">
            <Globe2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-[#3F3D56]">
              {published ? 'Published' : 'Make this trip public'}
            </h3>
            <p className="mt-1.5 text-sm leading-6 text-[#6F6C82]">
              {published
                ? 'Anyone with the link can view this itinerary.'
                : 'Share your plan on its destination page in one tap.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          role="switch"
          aria-checked={published}
          aria-label={published ? 'Unpublish trip' : 'Publish trip'}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C63FF] focus-visible:ring-offset-2 disabled:opacity-60 ${
            published ? 'bg-[#6C63FF]' : 'bg-[#DDDCE8]'
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-all duration-200 ${
              published ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      {published && (
        <button
          type="button"
          onClick={copyLink}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-[#3F3D56] bg-[#FBFAFF] px-4 py-2.5 text-sm font-semibold text-[#3F3D56] transition hover:bg-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C63FF] focus-visible:ring-offset-2"
        >
          {copied ? (
            <Check className="h-4 w-4 text-[#1B7A5A]" />
          ) : (
            <Copy className="h-4 w-4 text-[#6C63FF]" />
          )}
          {copied ? 'Copied' : 'Copy public link'}
        </button>
      )}

      {error && (
        <p className="mt-3 text-xs font-medium text-[#C14D72]" role="alert">
          {error}
        </p>
      )}

      <VerifyToUnlock open={showVerify} onClose={() => setShowVerify(false)} returnTo={`/trip/${trip.id}`} />
    </section>
  );
}
