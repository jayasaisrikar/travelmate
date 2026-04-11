'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Brand } from '@/components/common/Brand';

type PublicTripShareProps = {
  shareToken: string;
  shareUrl: string;
  shareBadge: string;
  shareTitle: string;
  shareDescription: string;
  suggestionsCount: number;
  trip: any;
};

function getDailyPlans(itinerary: any): any[] {
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
        .map((day: any) => day?.theme || `Day ${day?.day}`)
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
    <main className="min-h-screen bg-[#fbfaf7] text-[#2e2833]">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
        <section className="border border-[#2e2833] bg-white p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <Brand href="/" compact />
            <div className="inline-flex border border-[#2e2833] bg-[#5aa7e8] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white">
              Trip share
            </div>
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
            Hey Check out my trip and submit your suggestions on TravelMate
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#756978] sm:text-base">{shareBadge}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="border border-[#2e2833] bg-[#fffdf9] px-4 py-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#a79aaa]">Destination</div>
              <div className="mt-2 text-lg font-black">{trip.destination}</div>
            </div>
            <div className="border border-[#2e2833] bg-[#fffdf9] px-4 py-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#a79aaa]">Duration</div>
              <div className="mt-2 text-lg font-black">{trip.duration} days</div>
            </div>
            <div className="border border-[#2e2833] bg-[#fffdf9] px-4 py-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#a79aaa]">Budget</div>
              <div className="mt-2 text-lg font-black">{trip.budget || 'Not set'}</div>
            </div>
            <div className="border border-[#2e2833] bg-[#fffdf9] px-4 py-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#a79aaa]">Suggestions</div>
              <div className="mt-2 text-lg font-black">{suggestionsCount} open</div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="border border-[#2e2833] bg-[#2e2833] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1f1b23]"
            >
              {copyStatus === 'copied' ? 'Copied link' : 'Copy share link'}
            </button>
            <button
              type="button"
              onClick={handleNativeShare}
              className="border border-[#2e2833] bg-white px-4 py-3 text-sm font-semibold text-[#2e2833] transition hover:bg-[#fff8e6]"
            >
              Share on device
            </button>
          </div>

          {topHighlights.length > 0 && (
            <div className="mt-6 border border-[#eadde5] bg-[#fffdf9] p-4">
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#a79aaa]">Trip highlights</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {topHighlights.map((item: string) => (
                  <span key={item} className="border border-[#2e2833] bg-white px-3 py-2 text-sm font-medium">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="border border-[#2e2833] bg-white p-5 sm:p-6">
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#a79aaa]">Send a suggestion</div>
            <h2 className="mt-1 text-2xl font-black tracking-tight">Help improve this trip</h2>
            <p className="mt-2 text-sm leading-6 text-[#756978]">
              Leave a practical idea, a better restaurant, a smarter route, or a place to skip.
            </p>

            {submitted && (
              <div className="mt-5 border border-[#5aa7e8] bg-[#eef7ff] px-4 py-3 text-sm font-medium text-[#2e2833]">
                Thanks, your suggestion was sent to the trip owner.
              </div>
            )}

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#756978]">
                  Your name
                </label>
                <input
                  value={guestName}
                  onChange={event => setGuestName(event.target.value)}
                  placeholder="Optional"
                  className="w-full border border-[#2e2833] bg-[#fffdf9] px-4 py-3 text-base text-[#2e2833] outline-none placeholder:text-[#a79aaa]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#756978]">
                  Your email
                </label>
                <input
                  value={guestEmail}
                  onChange={event => setGuestEmail(event.target.value)}
                  placeholder="Optional"
                  type="email"
                  className="w-full border border-[#2e2833] bg-[#fffdf9] px-4 py-3 text-base text-[#2e2833] outline-none placeholder:text-[#a79aaa]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#756978]">
                  Your suggestion
                </label>
                <textarea
                  value={suggestion}
                  onChange={event => setSuggestion(event.target.value)}
                  required
                  rows={5}
                  placeholder="Tell the traveler what you would change or add..."
                  className="w-full border border-[#2e2833] bg-[#fffdf9] px-4 py-3 text-base text-[#2e2833] outline-none placeholder:text-[#a79aaa]"
                />
              </div>

              {error && (
                <div className="border border-[#a65372] bg-[#fff3f7] px-4 py-3 text-sm font-medium text-[#a65372]">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full border border-[#2e2833] bg-[#2e2833] px-4 py-3 font-semibold text-white transition hover:bg-[#1f1b23] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Submitting...' : 'Submit suggestion'}
              </button>
            </form>
          </div>

          <div className="border border-[#2e2833] bg-[#fffdf9] p-5 sm:p-6">
            <Brand asLink={false} compact className="mb-4" />
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#a79aaa]">Why this exists</div>
            <h2 className="mt-1 text-2xl font-black tracking-tight">TravelMate feedback loop</h2>
            <div className="mt-4 space-y-3">
              {[
                'Guests can react with real-world suggestions.',
                'Owners can read responses back on the trip page.',
                'The share badge is ready for social posts.',
              ].map(item => (
                <div key={item} className="border border-[#2e2833] bg-white px-4 py-3 text-sm font-medium text-[#2e2833]">
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-5 border border-[#2e2833] bg-white px-4 py-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#a79aaa]">Share title</div>
              <p className="mt-2 text-sm font-medium text-[#2e2833]">{shareTitle}</p>
              <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[#a79aaa]">Share description</div>
              <p className="mt-2 text-sm leading-6 text-[#756978]">{shareDescription}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
