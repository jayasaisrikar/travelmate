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
    <main className="min-h-screen bg-[#F2F2F2] text-[#3F3D56]">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
        <section className="border border-[#3F3D56] bg-white p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <Brand href="/" compact />
            <div className="inline-flex border border-[#3F3D56] bg-[#6C63FF] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white">
              Trip share
            </div>
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Check out my trip on wayflo</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#6F6C82] sm:text-base">{shareBadge}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="border border-[#3F3D56] bg-[#FBFAFF] px-4 py-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8A869C]">Destination</div>
              <div className="mt-2 text-lg font-black">{trip.destination}</div>
            </div>
            <div className="border border-[#3F3D56] bg-[#FBFAFF] px-4 py-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8A869C]">Duration</div>
              <div className="mt-2 text-lg font-black">{trip.duration} days</div>
            </div>
            <div className="border border-[#3F3D56] bg-[#FBFAFF] px-4 py-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8A869C]">Budget</div>
              <div className="mt-2 text-lg font-black">{trip.budget || 'Not set'}</div>
            </div>
            <div className="border border-[#3F3D56] bg-[#FBFAFF] px-4 py-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8A869C]">Suggestions</div>
              <div className="mt-2 text-lg font-black">{suggestionsCount} open</div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="border border-[#3F3D56] bg-[#3F3D56] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#302F43]"
            >
              {copyStatus === 'copied' ? 'Copied link' : 'Copy share link'}
            </button>
            <button
              type="button"
              onClick={handleNativeShare}
              className="border border-[#3F3D56] bg-white px-4 py-3 text-sm font-semibold text-[#3F3D56] transition hover:bg-[#FFEAF0]"
            >
              Share on device
            </button>
          </div>

          {topHighlights.length > 0 && (
            <div className="mt-6 border border-[#DDDCE8] bg-[#FBFAFF] p-4">
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#8A869C]">Trip highlights</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {topHighlights.map((item: string) => (
                  <span key={item} className="border border-[#3F3D56] bg-white px-3 py-2 text-sm font-medium">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="border border-[#3F3D56] bg-white p-5 sm:p-6">
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#8A869C]">Send a suggestion</div>
            <h2 className="mt-1 text-2xl font-black tracking-tight">Help improve this trip</h2>
            <p className="mt-2 text-sm leading-6 text-[#6F6C82]">
              Leave a practical idea, a better restaurant, a smarter route, or a place to skip.
            </p>

            {submitted && (
              <div className="mt-5 border border-[#6C63FF] bg-[#EEEDFE] px-4 py-3 text-sm font-medium text-[#3F3D56]">
                Thanks, your suggestion was sent to the trip owner.
              </div>
            )}

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#6F6C82]">
                  Your name
                </label>
                <input
                  value={guestName}
                  onChange={event => setGuestName(event.target.value)}
                  placeholder="Optional"
                  className="w-full border border-[#3F3D56] bg-[#FBFAFF] px-4 py-3 text-base text-[#3F3D56] outline-none placeholder:text-[#8A869C]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#6F6C82]">
                  Your email
                </label>
                <input
                  value={guestEmail}
                  onChange={event => setGuestEmail(event.target.value)}
                  placeholder="Optional"
                  type="email"
                  className="w-full border border-[#3F3D56] bg-[#FBFAFF] px-4 py-3 text-base text-[#3F3D56] outline-none placeholder:text-[#8A869C]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#6F6C82]">
                  Your suggestion
                </label>
                <textarea
                  value={suggestion}
                  onChange={event => setSuggestion(event.target.value)}
                  required
                  rows={5}
                  placeholder="Tell the traveler what you would change or add..."
                  className="w-full border border-[#3F3D56] bg-[#FBFAFF] px-4 py-3 text-base text-[#3F3D56] outline-none placeholder:text-[#8A869C]"
                />
              </div>

              {error && (
                <div className="border border-[#C14D72] bg-[#FFF0F4] px-4 py-3 text-sm font-medium text-[#C14D72]">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full border border-[#3F3D56] bg-[#3F3D56] px-4 py-3 font-semibold text-white transition hover:bg-[#302F43] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Submitting...' : 'Submit suggestion'}
              </button>
            </form>
          </div>

          <div className="border border-[#3F3D56] bg-[#FBFAFF] p-5 sm:p-6">
            <Brand asLink={false} compact className="mb-4" />
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#8A869C]">Why this exists</div>
            <h2 className="mt-1 text-2xl font-black tracking-tight">Why this share works</h2>
            <div className="mt-4 space-y-3">
              {[
                'Guests can react with real-world suggestions.',
                'Owners can read responses back on the trip page.',
                'The share badge is ready for social posts.',
              ].map(item => (
                <div key={item} className="border border-[#3F3D56] bg-white px-4 py-3 text-sm font-medium text-[#3F3D56]">
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-5 border border-[#3F3D56] bg-white px-4 py-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8A869C]">Share title</div>
              <p className="mt-2 text-sm font-medium text-[#3F3D56]">{shareTitle}</p>
              <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[#8A869C]">Share description</div>
              <p className="mt-2 text-sm leading-6 text-[#6F6C82]">{shareDescription}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
