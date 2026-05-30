'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, RefreshCcw, Save } from 'lucide-react';
import { regenerateTripItinerarySection, updateTripItinerary, type Trip } from '@/lib/supabase-trips';
import type { ItineraryDayPlan } from '@/lib/travel-types';
import { ActivityCard } from '@/components/trip/ActivityCard';
import { StatusCard } from '@/components/common/StatusCard';

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
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([0]));
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
      <section className="mt-8">
        <StatusCard
          eyebrow="Itinerary"
          title="Day-by-day timeline"
          description="This trip was saved without daily plans. Open the assistant or regenerate the itinerary so we can rebuild the route with structured activities."
          tone="primary"
        />
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-[30px] border border-[#DDDCE8] bg-white p-5 shadow-[0_16px_48px_rgba(46,40,51,0.06)] sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#8A869C]">Itinerary</div>
          <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Day-by-day timeline</h2>
        </div>
        <div className="flex items-center gap-3">
          {interests.length > 0 && (
            <span className="hidden text-xs font-medium text-[#8A869C] sm:block">{interests.join(' · ')}</span>
          )}
          <button
            type="button"
            onClick={() =>
              setExpandedDays(
                expandedDays.size === dailyPlans.length
                  ? new Set()
                  : new Set(dailyPlans.map((_, i) => i))
              )
            }
            className="text-xs font-semibold text-[#6C63FF] underline-offset-2 hover:underline"
          >
            {expandedDays.size === dailyPlans.length ? 'Collapse all' : 'Expand all'}
          </button>
        </div>
      </div>

      {/* Status strip */}
      {(saving || status || error || regenerationLoading || regenerationStatus || regenerationError) && (
        <div className="mt-4 space-y-2">
          {saving && (
            <div className="inline-flex items-center gap-2 rounded-lg border border-[#DDDCE8] bg-[#FBFAFF] px-3 py-2 text-sm font-medium text-[#6F6C82]">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="block h-4 w-4 rounded-full border-2 border-[#6C63FF] border-t-transparent"
              />
              Saving...
            </div>
          )}
          {status && (
            <div className="rounded-lg border border-[#6C63FF] bg-[#EEEDFE] px-4 py-2 text-sm font-medium text-[#3F3D56]">
              {status}
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-[#C14D72] bg-[#FFF0F4] px-4 py-2 text-sm font-medium text-[#C14D72]">
              {error}
            </div>
          )}
          {regenerationLoading && (
            <div className="inline-flex items-center gap-2 rounded-lg border border-[#DDDCE8] bg-[#FBFAFF] px-3 py-2 text-sm font-medium text-[#6F6C82]">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="block h-4 w-4 rounded-full border-2 border-[#FF6584] border-t-transparent"
              />
              Regenerating section...
            </div>
          )}
          {regenerationStatus && (
            <div className="rounded-lg border border-[#FF6584] bg-[#FFEAF0] px-4 py-2 text-sm font-medium text-[#3F3D56]">
              {regenerationStatus}
            </div>
          )}
          {regenerationError && (
            <div className="rounded-lg border border-[#C14D72] bg-[#FFF0F4] px-4 py-2 text-sm font-medium text-[#C14D72]">
              {regenerationError}
            </div>
          )}
        </div>
      )}

      {/* Day accordion */}
      <div className="mt-5 flex flex-col gap-3">
        {dailyPlans.map((day, dayIndex) => {
          const activities = Array.isArray(day.activities) ? day.activities : [];
          const firstTime = activities[0]?.time;
          const lastTime = activities[activities.length - 1]?.time;
          const currentDayNumber = day.day || dayIndex + 1;
          const isOpen = expandedDays.has(dayIndex);

          const totalCost = activities.reduce((sum, a) => {
            const c = a.estimated_cost ?? a.cost ?? 0;
            return sum + (typeof c === 'number' ? c : 0);
          }, 0);

          return (
            <div
              key={`${currentDayNumber}-${day.theme ?? 'day'}`}
              className="overflow-hidden rounded-2xl border border-[#DDDCE8] bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Day header row — always visible, click to toggle */}
              <button
                type="button"
                onClick={() => {
                  const next = new Set(expandedDays);
                  if (isOpen) next.delete(dayIndex);
                  else next.add(dayIndex);
                  setExpandedDays(next);
                }}
                className="flex w-full items-center gap-4 p-4 text-left sm:p-5"
              >
                {/* Day badge */}
                <span className="shrink-0 rounded-xl bg-[#6C63FF] px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-white">
                  Day {currentDayNumber}
                </span>

                {/* Theme + meta */}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-[#1A1726]">
                    {day.theme || `Day ${currentDayNumber}`}
                  </p>
                  <p className="mt-0.5 text-xs text-[#8A869C]">
                    {activities.length} stops
                    {firstTime && lastTime ? ` · ${firstTime} → ${lastTime}` : ''}
                    {day.date ? ` · ${day.date}` : ''}
                    {totalCost > 0 ? ` · ~$${totalCost}` : ''}
                    {day.intensity ? ` · ${day.intensity}` : ''}
                  </p>
                </div>

                {/* Reorder + regenerate — compact icon buttons */}
                <div
                  className="flex shrink-0 items-center gap-1"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    type="button"
                    title="Move day up"
                    disabled={saving || regenerationLoading || dayIndex === 0}
                    onClick={() => void moveDay(dayIndex, -1)}
                    className="rounded-lg border border-[#DDDCE8] bg-white p-1.5 text-[#6F6C82] transition hover:bg-[#F4F3FF] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronUp size={15} />
                  </button>
                  <button
                    type="button"
                    title="Move day down"
                    disabled={saving || regenerationLoading || dayIndex === dailyPlans.length - 1}
                    onClick={() => void moveDay(dayIndex, 1)}
                    className="rounded-lg border border-[#DDDCE8] bg-white p-1.5 text-[#6F6C82] transition hover:bg-[#F4F3FF] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronDown size={15} />
                  </button>
                  <button
                    type="button"
                    title="Regenerate this day"
                    disabled={saving || regenerationLoading}
                    onClick={() => openDayRegeneration(dayIndex)}
                    className="rounded-lg border border-[#DDDCE8] bg-white p-1.5 text-[#6F6C82] transition hover:bg-[#F4F3FF] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <RefreshCcw size={15} />
                  </button>
                </div>

                {/* Chevron toggle indicator */}
                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="shrink-0 text-[#8A869C]"
                >
                  <ChevronDown size={18} />
                </motion.span>
              </button>

              {/* Collapsible activity list */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 border-t border-[#DDDCE8] p-4 sm:p-5">
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
                            <ActivityCard
                              key={`${dayIndex}-${activityIndex}-${activity.name}`}
                              dayLabel={`Day ${currentDayNumber}`}
                              time={activity.time}
                              name={activity.name}
                              category={activity.category}
                              description={activity.description}
                              address={activity.address}
                              cost={cost}
                              latitude={activity.latitude}
                              longitude={activity.longitude}
                              selected={isSelected}
                              onSelect={() => onSelectActivity(isSelected ? null : flatIndex)}
                              onRegenerate={() => openClusterRegeneration(dayIndex, activityIndex)}
                              onMoveUp={
                                activityIndex === 0 ? undefined : () => void moveActivity(dayIndex, activityIndex, -1)
                              }
                              onMoveDown={
                                activityIndex === activities.length - 1
                                  ? undefined
                                  : () => void moveActivity(dayIndex, activityIndex, 1)
                              }
                              disableActions={saving || regenerationLoading}
                            />
                          );
                        })
                      ) : (
                        <div className="rounded-2xl border border-dashed border-[#DDDCE8] bg-[#FBFAFF] p-5 text-sm text-[#6F6C82]">
                          No activities for this day.
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Regeneration modal */}
      {regenerationTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-lg rounded-2xl border border-[#3F3D56] bg-white p-5 shadow-[0_30px_120px_rgba(46,40,51,0.28)] sm:p-6"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#DDDCE8] pb-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#8A869C]">
                  {regenerationTarget.scope === 'day' ? 'Regenerate day' : 'Regenerate stop'}
                </div>
                <h3 className="mt-1 text-xl font-black tracking-tight">{regenerationTarget.label}</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (regenerationLoading) return;
                  setRegenerationTarget(null);
                  setRegenerationInstruction('');
                  setRegenerationError('');
                }}
                disabled={regenerationLoading}
                className="rounded-lg border border-[#DDDCE8] bg-white px-3 py-1.5 text-sm font-semibold text-[#3F3D56] disabled:opacity-50"
              >
                Close
              </button>
            </div>

            <p className="mt-3 text-sm leading-6 text-[#6F6C82]">
              Only this section will be rewritten — the rest of your trip stays the same.
            </p>

            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.2em] text-[#6F6C82]">
                What should change?
              </label>
              <textarea
                value={regenerationInstruction}
                onChange={event => setRegenerationInstruction(event.target.value)}
                rows={5}
                placeholder="e.g. make it more relaxed, add a local food experience, keep the evening free…"
                className="w-full resize-none rounded-xl border border-[#DDDCE8] bg-[#FBFAFF] px-4 py-3 text-sm leading-6 text-[#3F3D56] outline-none placeholder:text-[#8A869C] focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20"
              />
            </div>

            {regenerationError && (
              <div className="mt-3 rounded-lg border border-[#C14D72] bg-[#FFF0F4] px-4 py-2.5 text-sm font-medium text-[#C14D72]">
                {regenerationError}
              </div>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={submitRegeneration}
                disabled={regenerationLoading}
                className="flex-1 rounded-xl bg-[#3F3D56] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#302F43] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {regenerationLoading ? 'Regenerating…' : 'Regenerate'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (regenerationLoading) return;
                  setRegenerationTarget(null);
                  setRegenerationInstruction('');
                  setRegenerationError('');
                }}
                disabled={regenerationLoading}
                className="rounded-xl border border-[#DDDCE8] bg-white px-4 py-3 text-sm font-semibold text-[#3F3D56] disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 text-xs text-[#8A869C]">
        <Save size={13} />
        Changes are saved to the trip immediately.
      </div>
    </section>
  );
}
