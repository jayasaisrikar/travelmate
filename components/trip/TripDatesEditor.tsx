'use client';

import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { updateTripDates, type Trip } from '@/lib/supabase-trips';

type TripDatesEditorProps = {
  trip: Trip;
  onSaved: (trip: Trip) => void;
};

export function TripDatesEditor({ trip, onSaved }: TripDatesEditorProps) {
  const [start, setStart] = useState(trip.trip_start_date ?? '');
  const [end, setEnd] = useState(trip.trip_end_date ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!start || !end) {
      setError('Pick both a start and end date.');
      return;
    }

    if (end < start) {
      setError('End date must be on or after the start date.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const updated = await updateTripDates(trip.id, { trip_start_date: start, trip_end_date: end });
      onSaved(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save dates. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-[#DDDCE8] bg-white p-5 shadow-[0_16px_48px_rgba(46,40,51,0.06)] sm:p-6">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-[#8A869C]">
        <CalendarDays className="h-4 w-4 text-[#6C63FF]" />
        Travel dates
      </div>
      <h2 className="mt-1 text-2xl font-black tracking-tight text-[#3F3D56]">Add your travel dates</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6F6C82]">
        We use these dates to confirm you actually went on the trip, so you can leave a rating and review once you&apos;re back.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="trip-start-date" className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#6F6C82]">
            Start date
          </label>
          <input
            id="trip-start-date"
            type="date"
            value={start}
            onChange={event => {
              setStart(event.target.value);
              setError('');
            }}
            disabled={saving}
            className="w-full rounded-xl border border-[#3F3D56] bg-white px-4 py-3 text-base text-[#3F3D56] outline-none placeholder:text-[#8A869C] focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        <div>
          <label htmlFor="trip-end-date" className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#6F6C82]">
            End date
          </label>
          <input
            id="trip-end-date"
            type="date"
            value={end}
            onChange={event => {
              setEnd(event.target.value);
              setError('');
            }}
            disabled={saving}
            className="w-full rounded-xl border border-[#3F3D56] bg-white px-4 py-3 text-base text-[#3F3D56] outline-none placeholder:text-[#8A869C] focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-[#C14D72] bg-[#FFF0F4] px-4 py-3 text-sm font-medium text-[#C14D72]">
          {error}
        </div>
      )}

      <div className="mt-5">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-xl border border-[#3F3D56] bg-[#3F3D56] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#302F43] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {saving ? 'Saving dates...' : 'Save dates'}
        </button>
      </div>
    </section>
  );
}
