'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Brand } from '@/components/common/Brand';
import type { GeneratedItinerary, PublicTripSharePayload } from '@/lib/travel-types';

type PublicTripShareProps = {
  shareToken: string;
  shareUrl: string;
  shareBadge: string;
  shareTitle: string;
  shareDescription: string;
  suggestionsCount: number;
  trip: PublicTripSharePayload['trip'];
};

function getDailyPlans(itinerary: GeneratedItinerary | null | undefined) {
  if (Array.isArray(itinerary?.dailyPlans)) {
    return itinerary.dailyPlans;
  }

  if (Array.isArray(itinerary?.daily_plans)) {
    return itinerary.daily_plans;
  }

  return [];
}

export function PublicTripShare({
  shareToken,
  shareUrl,
  shareBadge,
  shareTitle,
  shareDescription,
  suggestionsCount,
  trip,
}: PublicTripShareProps) {
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  const dailyPlans = useMemo(() => getDailyPlans(trip?.itinerary), [trip]);
  const topHighlights = useMemo(
    () =>
      dailyPlans
        .slice(0, 3)
        .map(day => day?.theme || `Day ${day?.day}`)
        .filter(Boolean),
    [dailyPlans]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/share/${encodeURIComponent(shareToken)}/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName,
          guestEmail,
          message: suggestion,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit suggestion');
      }

      setSubmitted(true);
      setGuestName('');
      setGuestEmail('');
      setSuggestion('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit suggestion');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareBadge}\n${shareUrl}`);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 1500);
    } catch {
      setCopyStatus('idle');
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator === 'undefined' || !('share' in navigator)) {
      return;
    }

    try {
      await navigator.share({
        title: shareTitle,
        text: shareBadge,
        url: shareUrl,
      });
    } catch {
      // ignore cancellations
    }
  };

  return (
    <main className="min-h-screen bg-[#fbf4ea] text-[#3a2540]">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
        <section className="border border-[#3a2540] bg-white p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <Brand href="/" compact />
            <div className="inline-flex border border-[#3a2540] bg-[#ea580c] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white">
              Trip share
            </div>
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Check out my trip on wayflo</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#7c6a72] sm:text-base">{shareBadge}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="border border-[#3a2540] bg-[#fffbf2] px-4 py-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9b8b92]">Destination</div>
              <div className="mt-2 text-lg font-black">{trip.destination}</div>
            </div>
            <div className="border border-[#3a2540] bg-[#fffbf2] px-4 py-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9b8b92]">Duration</div>
              <div className="mt-2 text-lg font-black">{trip.duration} days</div>
            </div>
            <div className="border border-[#3a2540] bg-[#fffbf2] px-4 py-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9b8b92]">Suggestions</div>
              <div className="mt-2 text-lg font-black">{suggestionsCount} open</div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="border border-[#3a2540] bg-[#3a2540] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2c1b33]"
            >
              {copyStatus === 'copied' ? 'Copied link' : 'Copy share link'}
            </button>
            <button
              type="button"
              onClick={handleNativeShare}
              className="border border-[#3a2540] bg-white px-4 py-3 text-sm font-semibold text-[#3a2540] transition hover:bg-[#ffe4e6]"
            >
              Share on device
            </button>
          </div>

          {topHighlights.length > 0 && (
            <div className="mt-6 border border-[#eaddc7] bg-[#fffbf2] p-4">
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#9b8b92]">Trip highlights</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {topHighlights.map((item: string) => (
                  <span key={item} className="border border-[#3a2540] bg-white px-3 py-2 text-sm font-medium">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="border border-[#3a2540] bg-white p-5 sm:p-6">
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#9b8b92]">Send a suggestion</div>
            <h2 className="mt-1 text-2xl font-black tracking-tight">Help improve this trip</h2>
            <p className="mt-2 text-sm leading-6 text-[#7c6a72]">
              Leave a practical idea, a better restaurant, a smarter route, or a place to skip.
            </p>

            {submitted && (
              <div className="mt-5 border border-[#ea580c] bg-[#ffedd5] px-4 py-3 text-sm font-medium text-[#3a2540]">
                Thanks, your suggestion was sent to the trip owner.
              </div>
            )}

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#7c6a72]">
                  Your name
                </label>
                <input
                  value={guestName}
                  onChange={event => setGuestName(event.target.value)}
                  placeholder="Optional"
                  className="w-full border border-[#3a2540] bg-[#fffbf2] px-4 py-3 text-base text-[#3a2540] outline-none placeholder:text-[#9b8b92]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#7c6a72]">
                  Your email
                </label>
                <input
                  value={guestEmail}
                  onChange={event => setGuestEmail(event.target.value)}
                  placeholder="Optional"
                  type="email"
                  className="w-full border border-[#3a2540] bg-[#fffbf2] px-4 py-3 text-base text-[#3a2540] outline-none placeholder:text-[#9b8b92]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#7c6a72]">
                  Your suggestion
                </label>
                <textarea
                  value={suggestion}
                  onChange={event => setSuggestion(event.target.value)}
                  required
                  rows={5}
                  placeholder="Tell the traveler what you would change or add..."
                  className="w-full border border-[#3a2540] bg-[#fffbf2] px-4 py-3 text-base text-[#3a2540] outline-none placeholder:text-[#9b8b92]"
                />
              </div>

              {error && (
                <div className="border border-[#be123c] bg-[#ffe4e6] px-4 py-3 text-sm font-medium text-[#be123c]">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full border border-[#3a2540] bg-[#3a2540] px-4 py-3 font-semibold text-white transition hover:bg-[#2c1b33] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Submitting...' : 'Submit suggestion'}
              </button>
            </form>
          </div>

          <div className="border border-[#3a2540] bg-[#fffbf2] p-5 sm:p-6">
            <Brand asLink={false} compact className="mb-4" />
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#9b8b92]">Why this exists</div>
            <h2 className="mt-1 text-2xl font-black tracking-tight">Why this share works</h2>
            <div className="mt-4 space-y-3">
              {[
                'Guests can react with real-world suggestions.',
                'Owners can read responses back on the trip page.',
                'The share badge is ready for social posts.',
              ].map(item => (
                <div key={item} className="border border-[#3a2540] bg-white px-4 py-3 text-sm font-medium text-[#3a2540]">
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-5 border border-[#3a2540] bg-white px-4 py-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9b8b92]">Share title</div>
              <p className="mt-2 text-sm font-medium text-[#3a2540]">{shareTitle}</p>
              <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[#9b8b92]">Share description</div>
              <p className="mt-2 text-sm leading-6 text-[#7c6a72]">{shareDescription}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
