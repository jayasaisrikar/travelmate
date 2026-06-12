'use client';

import type { RefObject } from 'react';
import { MapComponent } from '@/components/MapComponent';
import { StatusCard } from '@/components/common/StatusCard';

type Activity = {
  time: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  estimated_cost: number | null;
  category: string;
  description?: string;
  address?: string | null;
  day: number;
  activityIndex: number;
};

type MapViewProps = {
  activities: Activity[];
  destination: string;
  destinationCoordinates?: { latitude: number; longitude: number } | null;
  stay?: {
    name: string;
    latitude: number;
    longitude: number;
    address: string | null;
  } | null;
  selectedActivityIndex?: number | null;
  focusStayTrigger?: number;
  onSelectActivity: (index: number | null) => void;
  mapSectionRef?: RefObject<HTMLElement | null>;
  onOpenStayRetry?: () => void;
  onFocusStay?: () => void;
};

export function MapView({
  activities,
  destination,
  destinationCoordinates,
  stay,
  selectedActivityIndex,
  focusStayTrigger,
  onSelectActivity,
  mapSectionRef,
  onOpenStayRetry,
  onFocusStay,
}: MapViewProps) {
  return (
    <section
      ref={mapSectionRef}
      className="relative z-0 mt-8 grid gap-6 lg:grid-cols-[1.12fr_0.88fr] lg:items-stretch"
    >
      <MapComponent
        activities={activities}
        destination={destination}
        destinationCoordinates={destinationCoordinates}
        stay={stay}
        selectedActivityIndex={selectedActivityIndex}
        focusStayTrigger={focusStayTrigger}
      />

      <div className="flex h-full flex-col rounded-[28px] border border-[#eaddc7] bg-white p-5 shadow-[0_16px_48px_rgba(46,40,51,0.06)] sm:p-6 lg:h-[360px] lg:min-h-0">
        <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#9b8b92]">Location guide</div>
        <h2 className="mt-1 text-2xl font-black tracking-tight">Places in order</h2>
        <p className="mt-2 text-sm leading-6 text-[#7c6a72]">
          The numbers on the map match the order below, so first-time users can quickly see where each stop sits.
        </p>

        {activities.length === 0 ? (
          <StatusCard
            className="mt-5"
            tone="primary"
            eyebrow="Map status"
            title="No geocoded stops yet"
            description="The itinerary still has usable trip details, but we could not pin all stops on the map. Open the assistant or regenerate the trip to improve the route."
            actions={
              <>
                {onFocusStay && (
                  <button
                    type="button"
                    onClick={onFocusStay}
                    className="rounded-full border border-[#ea580c]/20 bg-[#ffedd5] px-4 py-2 text-sm font-semibold text-[#ea580c]"
                  >
                    Focus stay
                  </button>
                )}
                {onOpenStayRetry && (
                  <button
                    type="button"
                    onClick={onOpenStayRetry}
                    className="rounded-full border border-[#3a2540] bg-[#3a2540] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Retry stay
                  </button>
                )}
              </>
            }
          />
        ) : (
          <div className="mt-5 flex-1 min-h-0 space-y-3 overflow-y-auto pr-2">
            {activities.map((activity, index) => (
              <button
                key={`${activity.day}-${activity.activityIndex}-${activity.name}`}
                type="button"
                onClick={() => {
                  onSelectActivity(index);
                }}
                className={`w-full rounded-[20px] border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(46,40,51,0.08)] ${
                  selectedActivityIndex === index
                    ? 'border-[#ea580c] bg-[#ffedd5]'
                    : 'border-[#eaddc7] bg-[#fffbf2]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-[#3a2540] text-sm font-black text-white">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-[#3a2540]">
                      Day {activity.day} · {activity.time} · {activity.name}
                    </div>
                    <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#9b8b92]">
                      {activity.category}
                    </div>
                    <div className="mt-1 text-sm leading-6 text-[#7c6a72]">
                      {activity.address || 'No address provided'}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
