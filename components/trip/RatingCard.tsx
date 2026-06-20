'use client';

import { useEffect, useState } from 'react';
import { Star, ShieldCheck, CalendarClock, MapPinOff } from 'lucide-react';
import { getRating, submitRating, type RatingState } from '@/lib/ratings-client';
import { VerifyToUnlock } from '@/components/social/VerifyToUnlock';

export function RatingCard({ tripId, destination }: { tripId: string; destination: string }) {
  const [state, setState] = useState<RatingState | null>(null);
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showVerify, setShowVerify] = useState(false);

  useEffect(() => {
    getRating(tripId)
      .then(s => {
        setState(s);
        if (s.mine) {
          setStars(s.mine.stars);
          setReview(s.mine.review ?? '');
        }
      })
      .catch(() => {});
  }, [tripId]);

  if (!state) return null;

  if (!state.eligibility.ok) {
    const reason = state.eligibility.reason;
    const copy =
      reason === 'verification_required'
        ? {
            icon: ShieldCheck,
            title: 'Verify your identity to rate',
            body: 'Only verified travelers can rate trips. It takes a couple of minutes with Didit.',
            cta: true,
          }
        : reason === 'presence_required'
        ? {
            icon: MapPinOff,
            title: `We couldn't confirm you visited ${destination}`,
            body: 'Ratings unlock once we verify your presence during the trip.',
            cta: false,
          }
        : {
            icon: CalendarClock,
            title: 'Rate after your trip ends',
            body: 'Come back once your trip wraps up to share how it went.',
            cta: false,
          };
    const Icon = copy.icon;

    return (
      <section className="rounded-[28px] border border-[#DDDCE8] bg-white p-5 shadow-[0_16px_48px_rgba(46,40,51,0.06)] sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EEEDFE] text-[#6C63FF]">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-[#3F3D56]">{copy.title}</h3>
            <p className="mt-1 text-sm leading-6 text-[#6F6C82]">{copy.body}</p>
            {copy.cta && (
              <button
                type="button"
                onClick={() => setShowVerify(true)}
                className="mt-4 rounded-xl bg-[#6C63FF] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5b53e6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C63FF] focus-visible:ring-offset-2"
              >
                Verify with Didit
              </button>
            )}
          </div>
        </div>
        <VerifyToUnlock open={showVerify} onClose={() => setShowVerify(false)} returnTo={`/trip/${tripId}`} />
      </section>
    );
  }

  async function save() {
    if (stars < 1 || saving) return;
    setSaving(true);
    setSaved(false);
    try {
      await submitRating(tripId, stars, review.trim() || undefined);
      setSaved(true);
      setState(prev =>
        prev
          ? { ...prev, mine: { stars, review: review.trim() || null } }
          : prev
      );
    } catch {
      setSaved(false);
    } finally {
      setSaving(false);
    }
  }

  function handleStarKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      setStars(prev => Math.min(5, (prev || 0) + 1));
      setSaved(false);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      setStars(prev => Math.max(1, (prev || 1) - 1));
      setSaved(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-[#DDDCE8] bg-white p-5 shadow-[0_16px_48px_rgba(46,40,51,0.06)] sm:p-6">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-[#8A869C]">
        <Star className="h-4 w-4 text-[#FFB020]" />
        Your rating
      </div>
      <h2 className="mt-1 text-2xl font-black tracking-tight text-[#3F3D56]">
        {state.mine ? 'Your rating' : `How was ${destination}?`}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6F6C82]">
        {state.mine
          ? 'Update your stars or review any time.'
          : 'Tap to rate, then share a few words for future travelers.'}
      </p>

      <div
        role="radiogroup"
        aria-label="Star rating"
        tabIndex={0}
        onKeyDown={handleStarKeyDown}
        className="mt-5 flex gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-[#6C63FF]/40 focus-visible:ring-offset-2 rounded-xl w-fit"
      >
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={stars === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            tabIndex={-1}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => {
              setStars(n);
              setSaved(false);
            }}
            className="rounded-lg p-1 transition-transform hover:scale-110 focus-visible:outline-none"
          >
            <Star
              className={`h-9 w-9 transition-colors ${
                (hover || stars) >= n ? 'fill-[#FFB020] text-[#FFB020]' : 'text-[#DDDCE8]'
              }`}
            />
          </button>
        ))}
      </div>

      <label htmlFor="rating-review" className="sr-only">
        Review (optional)
      </label>
      <textarea
        id="rating-review"
        value={review}
        onChange={event => {
          setReview(event.target.value);
          setSaved(false);
        }}
        placeholder="Add a short review (optional)"
        rows={3}
        className="mt-4 w-full rounded-xl border border-[#3F3D56]/20 bg-white px-4 py-3 text-sm text-[#3F3D56] outline-none placeholder:text-[#8A869C] focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20"
      />

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || stars < 1}
          className="rounded-xl border border-[#3F3D56] bg-[#3F3D56] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#302F43] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Saving…' : state.mine ? 'Update rating' : 'Submit rating'}
        </button>
        {saved && (
          <span className="text-sm font-semibold text-[#1B7A5A]" role="status">
            Saved ✓
          </span>
        )}
      </div>
    </section>
  );
}
