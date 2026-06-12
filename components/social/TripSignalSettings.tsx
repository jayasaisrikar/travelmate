'use client';

import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, LoaderCircle, MapPin, Plus, Trash2 } from 'lucide-react';
import type { Trip } from '@/lib/supabase-trips';
import {
  getMySignals,
  publishTripSignal,
  retractTripSignal,
  type TravelerProfile,
  type TripSignal,
} from '@/services/social';

interface TripSignalSettingsProps {
  trips: Trip[];
  profile: TravelerProfile | null;
}

function isDateValue(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getTripWindow(trip: Trip) {
  const itinerary = trip.itinerary ?? {};
  const sourceWindow = itinerary?.sourceData?.tripWindow;
  const confirmationWindow = itinerary?.sourceData?.confirmation?.tripWindow;
  const arrivalDate =
    sourceWindow?.arrivalDate ||
    itinerary?.stay?.checkInDate ||
    confirmationWindow?.arrivalDate ||
    null;
  const departureDate =
    sourceWindow?.departureDate ||
    itinerary?.stay?.checkOutDate ||
    confirmationWindow?.departureDate ||
    null;

  return {
    arrivalDate: isDateValue(arrivalDate) ? arrivalDate : null,
    departureDate: isDateValue(departureDate) ? departureDate : null,
  };
}

function getTripMonthValue(trip: Trip) {
  return getTripWindow(trip).arrivalDate?.slice(0, 7) ?? '';
}

function parseMonthLabel(value: string | null) {
  if (!value) return '';

  const date = new Date(`${value} 1`);
  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().slice(0, 7);
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}-01T00:00:00Z`));
}

export function TripSignalSettings({ trips, profile }: TripSignalSettingsProps) {
  const [signals, setSignals] = useState<TripSignal[]>([]);
  const [months, setMonths] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getMySignals()
      .then(setSignals)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load public trips'))
      .finally(() => setLoading(false));
  }, []);

  const signalByTripId = useMemo(
    () => new Map(signals.filter(signal => signal.trip_id).map(signal => [signal.trip_id, signal])),
    [signals]
  );

  const handlePublish = async (trip: Trip) => {
    if (!profile?.is_public) {
      setError('Enable and save your traveler profile before publishing a trip.');
      return;
    }

    const month = months[trip.id] || signalByTripId.get(trip.id)?.travel_month || getTripMonthValue(trip);
    const monthValue = /^\d{4}-\d{2}$/.test(month) ? month : parseMonthLabel(month);
    if (!monthValue) {
      setError(`Choose a public travel month for ${trip.destination}.`);
      return;
    }

    setActionId(trip.id);
    setError('');

    try {
      const signal = await publishTripSignal({
        tripId: trip.id,
        destination: trip.destination,
        travelMonth: formatMonth(monthValue),
      });
      setSignals(previous => [signal, ...previous.filter(item => item.trip_id !== trip.id)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish trip');
    } finally {
      setActionId('');
    }
  };

  const handleRetract = async (signal: TripSignal) => {
    setActionId(signal.id);
    setError('');

    try {
      await retractTripSignal(signal.id);
      setSignals(previous => previous.filter(item => item.id !== signal.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to hide trip');
    } finally {
      setActionId('');
    }
  };

  if (loading) {
    return <div className="h-24 animate-pulse rounded-2xl bg-[#fff7ed]" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl border border-[#eaddc7] bg-white p-4">
        {profile?.is_public
          ? <Eye size={18} className="mt-0.5 shrink-0 text-[#ea580c]" />
          : <EyeOff size={18} className="mt-0.5 shrink-0 text-[#9b8b92]" />}
        <div>
          <p className="text-sm font-semibold text-[#1c1018]">Public trip signals</p>
          <p className="mt-1 text-xs leading-5 text-[#7c6a72]">
            Share only your destination and month. Your itinerary and exact dates stay private.
          </p>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-[#be123c] bg-[#ffe4e6] px-4 py-2.5 text-sm text-[#be123c]">
          {error}
        </p>
      )}

      {trips.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#eaddc7] px-4 py-5 text-sm text-[#7c6a72]">
          Create a trip first, then publish it here when you are ready to find companions.
        </p>
      ) : (
        <div className="space-y-3">
          {trips.map(trip => {
            const signal = signalByTripId.get(trip.id);
            const tripWindow = getTripWindow(trip);
            const monthValue = months[trip.id] ?? (parseMonthLabel(signal?.travel_month ?? null) || getTripMonthValue(trip));

            return (
              <div key={trip.id} className="rounded-2xl border border-[#eaddc7] bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#1c1018]">
                  <MapPin size={15} className="text-[#ea580c]" />
                  {trip.destination}
                </div>
                <p className="mt-1 text-xs text-[#9b8b92]">
                  {tripWindow.arrivalDate && tripWindow.departureDate
                    ? `Private trip dates: ${tripWindow.arrivalDate} to ${tripWindow.departureDate}`
                    : 'Saved exact dates are unavailable for this older trip. Choose the public month manually.'}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    type="month"
                    value={monthValue}
                    onChange={event => setMonths(previous => ({ ...previous, [trip.id]: event.target.value }))}
                    aria-label={`Public travel month for ${trip.destination}`}
                    className="rounded-xl border border-[#eaddc7] bg-[#fffbf2] px-3 py-2 text-xs text-[#3a2540] outline-none focus:border-[#ea580c]"
                  />
                  <button
                    type="button"
                    onClick={() => void handlePublish(trip)}
                    disabled={actionId === trip.id || !profile?.is_public}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#ea580c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#c2410c] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionId === trip.id ? <LoaderCircle size={14} className="animate-spin" /> : <Plus size={14} />}
                    {signal ? 'Update month' : 'Publish trip'}
                  </button>
                </div>

                {signal && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs font-medium text-[#ea580c]">
                      Visible on Explore{signal.travel_month ? ` for ${signal.travel_month}` : ''}
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleRetract(signal)}
                      disabled={actionId === signal.id}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#eaddc7] px-3 py-2 text-xs font-semibold text-[#7c6a72] transition hover:bg-[#ffe4e6] hover:text-[#be123c] disabled:opacity-60"
                    >
                      {actionId === signal.id ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      Hide trip
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
