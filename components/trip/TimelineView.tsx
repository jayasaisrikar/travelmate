'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Save } from 'lucide-react';
import { updateTripItinerary, type Trip } from '@/lib/supabase-trips';
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

  if (dailyPlans.length === 0) {
    return (
      <section className="mt-8 rounded-[30px] border border-[#eadde5] bg-white p-5 shadow-[0_16px_48px_rgba(46,40,51,0.06)] sm:p-6">
        <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#a79aaa]">Itinerary</div>
        <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Day-by-day timeline</h2>
        <div className="mt-4 rounded-[24px] border border-dashed border-[#eadde5] bg-[#fffdf9] p-5 text-sm leading-6 text-[#756978]">
          This trip was saved without daily plans. Regenerate the itinerary once the API returns structured activities.
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-[30px] border border-[#eadde5] bg-white p-5 shadow-[0_16px_48px_rgba(46,40,51,0.06)] sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#a79aaa]">Itinerary</div>
          <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Day-by-day timeline</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#756978]">
            Reorder days or stops and save the result back to the trip. This is the first step toward a fuller editable timeline.
          </p>
        </div>

        <div className="text-sm font-medium text-[#756978]">
          {interests.length > 0 ? interests.join(' · ') : 'No interests saved'}
        </div>
      </div>

      {(saving || status || error) && (
        <div className="mt-4 space-y-2">
          {saving && (
            <div className="inline-flex items-center gap-2 border border-[#eadde5] bg-[#fffdf9] px-3 py-2 text-sm font-medium text-[#756978]">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="h-4 w-4 border-2 border-[#5aa7e8] border-t-transparent"
              />
              Saving timeline changes...
            </div>
          )}

          {status && (
            <div className="border border-[#5aa7e8] bg-[#eef7ff] px-4 py-3 text-sm font-medium text-[#2e2833]">
              {status}
            </div>
          )}

          {error && (
            <div className="border border-[#a65372] bg-[#fff3f7] px-4 py-3 text-sm font-medium text-[#a65372]">
              {error}
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
              className="overflow-hidden border border-[#eadde5] bg-white shadow-[0_16px_48px_rgba(46,40,51,0.06)]"
            >
              <div className="border-b border-[#eadde5] bg-[#fffdf9] p-5 sm:p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex bg-[#5aa7e8] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                      Day {currentDayNumber}
                    </div>
                    {day.intensity && (
                      <div className="border border-[#eadde5] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#756978]">
                        {day.intensity}
                      </div>
                    )}
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a79aaa]">
                      {activities.length} stops
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h3 className="text-xl font-black tracking-tight sm:text-2xl">
                        {day.theme || `Day ${currentDayNumber}`}
                      </h3>
                      <p className="mt-1 text-sm text-[#756978]">
                        {day.date || 'No date'}
                        {firstTime && lastTime ? ` · ${firstTime} to ${lastTime}` : ''}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={saving || dayIndex === 0}
                        onClick={() => void moveDay(dayIndex, -1)}
                        className="inline-flex items-center gap-2 border border-[#2e2833] bg-white px-3 py-2 text-sm font-semibold text-[#2e2833] transition hover:bg-[#fffdf9] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ChevronUp size={16} />
                        Move day up
                      </button>
                      <button
                        type="button"
                        disabled={saving || dayIndex === dailyPlans.length - 1}
                        onClick={() => void moveDay(dayIndex, 1)}
                        className="inline-flex items-center gap-2 border border-[#2e2833] bg-white px-3 py-2 text-sm font-semibold text-[#2e2833] transition hover:bg-[#fffdf9] disabled:cursor-not-allowed disabled:opacity-50"
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
                          isSelected ? 'border-[#5aa7e8] bg-[#eef7ff]' : 'border-[#eadde5] bg-[#fffdf9]'
                        }`}
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <button
                            type="button"
                            onClick={() => onSelectActivity(isSelected ? null : flatIndex)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="text-base font-bold text-[#2e2833]">
                              {[activity.time, activity.name].filter(Boolean).join(' · ')}
                            </div>
                            {activity.category && (
                              <div className="mt-2 inline-flex bg-[#eef7ff] px-3 py-1 text-xs font-semibold text-[#5aa7e8]">
                                {activity.category}
                              </div>
                            )}
                            {activity.description && (
                              <p className="mt-3 text-sm leading-6 text-[#756978]">{activity.description}</p>
                            )}
                            {(activity.address || activity.latitude || activity.longitude) && (
                              <div className="mt-3 border border-[#eadde5] bg-white px-3 py-2 text-xs leading-6 text-[#756978]">
                                {activity.address || 'Address unavailable'}
                                {activity.latitude && activity.longitude && (
                                  <span className="ml-2 font-semibold text-[#2e2833]">
                                    ({activity.latitude.toFixed(4)}, {activity.longitude.toFixed(4)})
                                  </span>
                                )}
                              </div>
                            )}
                          </button>

                          <div className="flex flex-wrap items-center gap-2">
                            {cost !== undefined && cost !== null && (
                              <div className="bg-[#fff4e3] px-3 py-1 text-sm font-bold text-[#ff9a45]">
                                ${cost}
                              </div>
                            )}
                            <button
                              type="button"
                              disabled={saving || activityIndex === 0}
                              onClick={() => void moveActivity(dayIndex, activityIndex, -1)}
                              className="inline-flex items-center gap-1 border border-[#2e2833] bg-white px-3 py-2 text-sm font-semibold text-[#2e2833] transition hover:bg-[#fffdf9] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <ChevronUp size={14} />
                              Up
                            </button>
                            <button
                              type="button"
                              disabled={saving || activityIndex === activities.length - 1}
                              onClick={() => void moveActivity(dayIndex, activityIndex, 1)}
                              className="inline-flex items-center gap-1 border border-[#2e2833] bg-white px-3 py-2 text-sm font-semibold text-[#2e2833] transition hover:bg-[#fffdf9] disabled:cursor-not-allowed disabled:opacity-50"
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
                  <div className="rounded-[24px] border border-dashed border-[#eadde5] bg-[#fffdf9] p-5 text-sm leading-6 text-[#756978]">
                    No activities returned for this day.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex items-center gap-2 text-sm text-[#756978]">
        <Save size={16} />
        Changes are saved back to the trip record immediately.
      </div>
    </section>
  );
}
