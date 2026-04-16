'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, RefreshCcw, Save, Sparkles } from 'lucide-react';
import { regenerateTripItinerarySection, updateTripItinerary, type Trip } from '@/lib/supabase-trips';
import type { ItineraryDayPlan } from '@/lib/travel-types';

type FlatActivity = {
  dayIndex: number;
  activityIndex: number;
  flatIndex: number;
  time: string;
  name: string;
  category: string;
  description: string;
  address: string | null;
  estimated_cost: number | null;
};

interface TimelineViewProps {
  tripId: string;
  itinerary: Trip['itinerary'];
  dailyPlans: ItineraryDayPlan[];
  interests: string[];
  selectedActivityIndex: number | null;
  onSelectActivity: (index: number | null) => void;
  onTripUpdated: (trip: Trip) => void;
}

type RegenerationTarget =
  | {
      scope: 'day';
      dayIndex: number;
      label: string;
    }
  | {
      scope: 'cluster';
      dayIndex: number;
      activityIndex: number;
      label: string;
    };

function cloneDayPlans(dailyPlans: ItineraryDayPlan[]): ItineraryDayPlan[] {
  return dailyPlans.map(day => ({
    ...day,
    activities: day.activities.map(activity => ({ ...activity })),
    restSlots: day.restSlots?.map(slot => ({ ...slot })),
  }));
}

function renumberDayPlans(dailyPlans: ItineraryDayPlan[]): ItineraryDayPlan[] {
  return dailyPlans.map((day, index) => ({
    ...day,
    day: index + 1,
  }));
}

function buildUpdatedItinerary(itinerary: Trip['itinerary'], dailyPlans: ItineraryDayPlan[]) {
  return {
    ...itinerary,
    dailyPlans,
    daily_plans: dailyPlans,
  };
}

function flattenActivities(dailyPlans: ItineraryDayPlan[]): FlatActivity[] {
  return dailyPlans.flatMap((day, dayIndex) =>
    day.activities.map((activity, activityIndex) => ({
      dayIndex,
      activityIndex,
      flatIndex: 0,
      time: activity.time,
      name: activity.name,
      category: activity.category,
      description: activity.description,
      address: activity.address,
      estimated_cost: activity.estimated_cost ?? activity.cost ?? null,
    }))
  ).map((activity, flatIndex) => ({
    ...activity,
    flatIndex,
  }));
}

export function TimelineView({
  tripId,
  itinerary,
  dailyPlans,
  interests,
  selectedActivityIndex,
  onSelectActivity,
  onTripUpdated,
}: TimelineViewProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [regenerationTarget, setRegenerationTarget] = useState<RegenerationTarget | null>(null);
  const [regenerationInstruction, setRegenerationInstruction] = useState('');
  const [regenerationLoading, setRegenerationLoading] = useState(false);
  const [regenerationError, setRegenerationError] = useState('');
  const [regenerationStatus, setRegenerationStatus] = useState('');

  const flatActivities = useMemo(() => flattenActivities(dailyPlans), [dailyPlans]);

  const persistPlans = async (nextPlans: ItineraryDayPlan[]) => {
    setSaving(true);
    setError('');
    setStatus('');

    try {
      const updatedTrip = await updateTripItinerary(
        tripId,
        buildUpdatedItinerary(itinerary, nextPlans)
      );

      onTripUpdated(updatedTrip);
      onSelectActivity(null);
      setStatus('Timeline saved');

      window.setTimeout(() => setStatus(''), 1800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save timeline changes');
    } finally {
      setSaving(false);
    }
  };

  const moveDay = async (dayIndex: number, direction: -1 | 1) => {
    const nextIndex = dayIndex + direction;

    if (nextIndex < 0 || nextIndex >= dailyPlans.length) {
      return;
    }

    const nextPlans = renumberDayPlans(cloneDayPlans(dailyPlans));
    const [movedDay] = nextPlans.splice(dayIndex, 1);
    nextPlans.splice(nextIndex, 0, movedDay);

    await persistPlans(renumberDayPlans(nextPlans));
  };

  const moveActivity = async (dayIndex: number, activityIndex: number, direction: -1 | 1) => {
    const nextPlans = cloneDayPlans(dailyPlans);
    const day = nextPlans[dayIndex];
    const nextIndex = activityIndex + direction;

    if (!day || nextIndex < 0 || nextIndex >= day.activities.length) {
      return;
    }

    const [movedActivity] = day.activities.splice(activityIndex, 1);
    day.activities.splice(nextIndex, 0, movedActivity);

    await persistPlans(renumberDayPlans(nextPlans));
  };

  const openDayRegeneration = (dayIndex: number) => {
    const dayNumber = dailyPlans[dayIndex]?.day || dayIndex + 1;
    setRegenerationTarget({
      scope: 'day',
      dayIndex,
      label: `Day ${dayNumber}`,
    });
    setRegenerationInstruction('Keep the current pacing but refresh this day with better activities and flow.');
    setRegenerationError('');
    setRegenerationStatus('');
  };

  const openClusterRegeneration = (dayIndex: number, activityIndex: number) => {
    const dayNumber = dailyPlans[dayIndex]?.day || dayIndex + 1;
    const activity = dailyPlans[dayIndex]?.activities?.[activityIndex];

    setRegenerationTarget({
      scope: 'cluster',
      dayIndex,
      activityIndex,
      label: activity ? `Day ${dayNumber} · ${activity.time} · ${activity.name}` : `Day ${dayNumber}`,
    });
    setRegenerationInstruction('Refresh this stop cluster while keeping the day structure and timing stable.');
    setRegenerationError('');
    setRegenerationStatus('');
  };

  const submitRegeneration = async () => {
    if (!regenerationTarget) {
      return;
    }

    const instruction = regenerationInstruction.trim();

    if (!instruction) {
      setRegenerationError('Please describe how you want this section changed.');
      return;
    }

    setRegenerationLoading(true);
    setRegenerationError('');
    setRegenerationStatus('');

    try {
      const updatedTrip = await regenerateTripItinerarySection({
        tripId,
        scope: regenerationTarget.scope,
        dayIndex: regenerationTarget.dayIndex,
        activityIndex: regenerationTarget.scope === 'cluster' ? regenerationTarget.activityIndex : null,
        instruction,
      });

      onTripUpdated(updatedTrip);
      onSelectActivity(null);
      setRegenerationTarget(null);
      setRegenerationInstruction('');
      setRegenerationStatus(
        regenerationTarget.scope === 'day'
          ? 'Regenerated that day and kept the rest of the trip stable.'
          : 'Regenerated the selected activity cluster and kept the rest of the trip stable.'
      );

      window.setTimeout(() => setRegenerationStatus(''), 2200);
    } catch (err: unknown) {
      setRegenerationError(err instanceof Error ? err.message : 'Failed to regenerate itinerary section');
    } finally {
      setRegenerationLoading(false);
    }
  };

  if (dailyPlans.length === 0) {
    return (
      <section className="mt-8 rounded-[30px] border border-[#DDDCE8] bg-white p-5 shadow-[0_16px_48px_rgba(46,40,51,0.06)] sm:p-6">
        <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#8A869C]">Itinerary</div>
        <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Day-by-day timeline</h2>
        <div className="mt-4 rounded-[24px] border border-dashed border-[#DDDCE8] bg-[#FBFAFF] p-5 text-sm leading-6 text-[#6F6C82]">
          This trip was saved without daily plans. Regenerate the itinerary once the API returns structured activities.
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-[30px] border border-[#DDDCE8] bg-white p-5 shadow-[0_16px_48px_rgba(46,40,51,0.06)] sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#8A869C]">Itinerary</div>
          <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Day-by-day timeline</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6F6C82]">
            Reorder days or stops and save the result back to the trip. This is the first step toward a fuller editable timeline.
          </p>
        </div>

        <div className="text-sm font-medium text-[#6F6C82]">
          {interests.length > 0 ? interests.join(' · ') : 'No interests saved'}
        </div>
      </div>

      {(saving || status || error || regenerationLoading || regenerationStatus || regenerationError) && (
        <div className="mt-4 space-y-2">
          {saving && (
            <div className="inline-flex items-center gap-2 border border-[#DDDCE8] bg-[#FBFAFF] px-3 py-2 text-sm font-medium text-[#6F6C82]">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="h-4 w-4 border-2 border-[#6C63FF] border-t-transparent"
              />
              Saving timeline changes...
            </div>
          )}

          {status && (
            <div className="border border-[#6C63FF] bg-[#EEEDFE] px-4 py-3 text-sm font-medium text-[#3F3D56]">
              {status}
            </div>
          )}

          {error && (
            <div className="border border-[#C14D72] bg-[#FFF0F4] px-4 py-3 text-sm font-medium text-[#C14D72]">
              {error}
            </div>
          )}

          {regenerationLoading && (
            <div className="inline-flex items-center gap-2 border border-[#DDDCE8] bg-[#FBFAFF] px-3 py-2 text-sm font-medium text-[#6F6C82]">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="h-4 w-4 border-2 border-[#FF6584] border-t-transparent"
              />
              Regenerating section...
            </div>
          )}

          {regenerationStatus && (
            <div className="border border-[#FF6584] bg-[#FFEAF0] px-4 py-3 text-sm font-medium text-[#3F3D56]">
              {regenerationStatus}
            </div>
          )}

          {regenerationError && (
            <div className="border border-[#C14D72] bg-[#FFF0F4] px-4 py-3 text-sm font-medium text-[#C14D72]">
              {regenerationError}
            </div>
          )}
        </div>
      )}

      <div className="mt-5 grid gap-4">
        {dailyPlans.map((day, dayIndex) => {
          const activities = Array.isArray(day.activities) ? day.activities : [];
          const firstTime = activities[0]?.time;
          const lastTime = activities[activities.length - 1]?.time;
          const currentDayNumber = day.day || dayIndex + 1;

          return (
            <div
              key={`${currentDayNumber}-${day.theme ?? 'day'}`}
              className="overflow-hidden border border-[#DDDCE8] bg-white shadow-[0_16px_48px_rgba(46,40,51,0.06)]"
            >
              <div className="border-b border-[#DDDCE8] bg-[#FBFAFF] p-5 sm:p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex bg-[#6C63FF] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                      Day {currentDayNumber}
                    </div>
                    {day.intensity && (
                      <div className="border border-[#DDDCE8] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6F6C82]">
                        {day.intensity}
                      </div>
                    )}
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8A869C]">
                      {activities.length} stops
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h3 className="text-xl font-black tracking-tight sm:text-2xl">
                        {day.theme || `Day ${currentDayNumber}`}
                      </h3>
                      <p className="mt-1 text-sm text-[#6F6C82]">
                        {day.date || 'No date'}
                        {firstTime && lastTime ? ` · ${firstTime} to ${lastTime}` : ''}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={saving || regenerationLoading}
                        onClick={() => openDayRegeneration(dayIndex)}
                        className="inline-flex items-center gap-2 border border-[#3F3D56] bg-[#FBFAFF] px-3 py-2 text-sm font-semibold text-[#3F3D56] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <RefreshCcw size={16} />
                        Regenerate day
                      </button>
                      <button
                        type="button"
                        disabled={saving || regenerationLoading || dayIndex === 0}
                        onClick={() => void moveDay(dayIndex, -1)}
                        className="inline-flex items-center gap-2 border border-[#3F3D56] bg-white px-3 py-2 text-sm font-semibold text-[#3F3D56] transition hover:bg-[#FBFAFF] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ChevronUp size={16} />
                        Move day up
                      </button>
                      <button
                        type="button"
                        disabled={saving || regenerationLoading || dayIndex === dailyPlans.length - 1}
                        onClick={() => void moveDay(dayIndex, 1)}
                        className="inline-flex items-center gap-2 border border-[#3F3D56] bg-white px-3 py-2 text-sm font-semibold text-[#3F3D56] transition hover:bg-[#FBFAFF] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ChevronDown size={16} />
                        Move day down
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-5 sm:p-6">
                {activities.length > 0 ? (
                  activities.map((activity, activityIndex) => {
                    const flatIndex = flatActivities.findIndex(
                      item =>
                        item.dayIndex === dayIndex &&
                        item.activityIndex === activityIndex &&
                        item.name === activity.name
                    );
                    const isSelected = selectedActivityIndex === flatIndex;
                    const cost = activity.cost ?? activity.estimated_cost;

                    return (
                      <div
                        key={`${dayIndex}-${activityIndex}-${activity.name}`}
                        className={`border p-4 transition ${
                          isSelected ? 'border-[#6C63FF] bg-[#EEEDFE]' : 'border-[#DDDCE8] bg-[#FBFAFF]'
                        }`}
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <button
                            type="button"
                            onClick={() => onSelectActivity(isSelected ? null : flatIndex)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="text-base font-bold text-[#3F3D56]">
                              {[activity.time, activity.name].filter(Boolean).join(' · ')}
                            </div>
                            {activity.category && (
                              <div className="mt-2 inline-flex bg-[#EEEDFE] px-3 py-1 text-xs font-semibold text-[#6C63FF]">
                                {activity.category}
                              </div>
                            )}
                            {activity.description && (
                              <p className="mt-3 text-sm leading-6 text-[#6F6C82]">{activity.description}</p>
                            )}
                            {(activity.address || activity.latitude || activity.longitude) && (
                              <div className="mt-3 border border-[#DDDCE8] bg-white px-3 py-2 text-xs leading-6 text-[#6F6C82]">
                                {activity.address || 'Address unavailable'}
                                {activity.latitude && activity.longitude && (
                                  <span className="ml-2 font-semibold text-[#3F3D56]">
                                    ({activity.latitude.toFixed(4)}, {activity.longitude.toFixed(4)})
                                  </span>
                                )}
                              </div>
                            )}
                          </button>

                          <div className="flex flex-wrap items-center gap-2">
                            {cost !== undefined && cost !== null && (
                              <div className="bg-[#FFEAF0] px-3 py-1 text-sm font-bold text-[#FF6584]">
                                ${cost}
                              </div>
                            )}
                            <button
                              type="button"
                              disabled={saving || regenerationLoading}
                              onClick={() => openClusterRegeneration(dayIndex, activityIndex)}
                              className="inline-flex items-center gap-1 border border-[#3F3D56] bg-[#FBFAFF] px-3 py-2 text-sm font-semibold text-[#3F3D56] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Sparkles size={14} />
                              Regenerate cluster
                            </button>
                            <button
                              type="button"
                              disabled={saving || regenerationLoading || activityIndex === 0}
                              onClick={() => void moveActivity(dayIndex, activityIndex, -1)}
                              className="inline-flex items-center gap-1 border border-[#3F3D56] bg-white px-3 py-2 text-sm font-semibold text-[#3F3D56] transition hover:bg-[#FBFAFF] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <ChevronUp size={14} />
                              Up
                            </button>
                            <button
                              type="button"
                              disabled={saving || regenerationLoading || activityIndex === activities.length - 1}
                              onClick={() => void moveActivity(dayIndex, activityIndex, 1)}
                              className="inline-flex items-center gap-1 border border-[#3F3D56] bg-white px-3 py-2 text-sm font-semibold text-[#3F3D56] transition hover:bg-[#FBFAFF] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <ChevronDown size={14} />
                              Down
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-[24px] border border-dashed border-[#DDDCE8] bg-[#FBFAFF] p-5 text-sm leading-6 text-[#6F6C82]">
                    No activities returned for this day.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {regenerationTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-2xl border border-[#3F3D56] bg-[#F2F2F2] p-5 text-[#3F3D56] shadow-[0_30px_120px_rgba(46,40,51,0.28)] sm:p-6"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#3F3D56] pb-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#8A869C]">
                  {regenerationTarget.scope === 'day' ? 'Regenerate day' : 'Regenerate cluster'}
                </div>
                <h3 className="mt-1 text-2xl font-black tracking-tight">{regenerationTarget.label}</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (regenerationLoading) {
                    return;
                  }

                  setRegenerationTarget(null);
                  setRegenerationInstruction('');
                  setRegenerationError('');
                }}
                className="border border-[#3F3D56] bg-white px-3 py-2 text-sm font-semibold text-[#3F3D56] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={regenerationLoading}
              >
                Close
              </button>
            </div>

            <p className="mt-3 text-sm leading-6 text-[#6F6C82]">
              Rewrite only this slice of the itinerary. The rest of the trip stays fixed unless you edit it separately.
            </p>

            <div className="mt-5">
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#6F6C82]">
                What should change?
              </label>
              <textarea
                value={regenerationInstruction}
                onChange={event => setRegenerationInstruction(event.target.value)}
                rows={6}
                placeholder="Example: make this day more relaxed, replace the museum stop with a local food experience, and keep the evening free."
                className="w-full resize-y border border-[#3F3D56] bg-white px-4 py-3 text-base leading-7 text-[#3F3D56] outline-none placeholder:text-[#8A869C]"
              />
            </div>

            {regenerationError && (
              <div className="mt-4 border border-[#C14D72] bg-[#FFF0F4] px-4 py-3 text-sm font-medium text-[#C14D72]">
                {regenerationError}
              </div>
            )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={submitRegeneration}
                disabled={regenerationLoading}
                className="flex-1 border border-[#3F3D56] bg-[#3F3D56] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#302F43] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {regenerationLoading ? 'Regenerating...' : 'Regenerate section'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (regenerationLoading) {
                    return;
                  }

                  setRegenerationTarget(null);
                  setRegenerationInstruction('');
                  setRegenerationError('');
                }}
                disabled={regenerationLoading}
                className="border border-[#3F3D56] bg-white px-4 py-3 text-sm font-semibold text-[#3F3D56] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="mt-5 flex items-center gap-2 text-sm text-[#6F6C82]">
        <Save size={16} />
        Changes are saved back to the trip record immediately.
      </div>
    </section>
  );
}
