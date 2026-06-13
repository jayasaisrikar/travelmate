'use client';

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, List, MapPin, Maximize2, X } from 'lucide-react';
import { MapComponent } from '@/components/MapComponent';
import { StatusCard } from '@/components/common/StatusCard';
import { cn } from '@/lib/utils';

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

type Stay = {
  name: string;
  latitude: number;
  longitude: number;
  address: string | null;
} | null;

type MapViewProps = {
  activities: Activity[];
  destination: string;
  destinationCoordinates?: { latitude: number; longitude: number } | null;
  stay?: Stay;
  selectedActivityIndex?: number | null;
  focusStayTrigger?: number;
  onSelectActivity: (index: number | null) => void;
  mapSectionRef?: RefObject<HTMLElement | null>;
  onOpenStayRetry?: () => void;
  onFocusStay?: () => void;
};

type LocationGuidePanelProps = {
  activities: Activity[];
  stay?: Stay;
  selectedActivityIndex?: number | null;
  onSelectActivity: (index: number | null) => void;
  onOpenStayRetry?: () => void;
  onFocusStay?: () => void;
  compact?: boolean;
  className?: string;
};

function hasCoordinates(activity: Activity) {
  return typeof activity.latitude === 'number' && typeof activity.longitude === 'number';
}

function LocationGuidePanel({
  activities,
  stay,
  selectedActivityIndex,
  onSelectActivity,
  onOpenStayRetry,
  onFocusStay,
  compact = false,
  className,
}: LocationGuidePanelProps) {
  const mappedStopCount = activities.filter(hasCoordinates).length;

  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-col rounded-[28px] border border-[#DDDCE8] bg-white p-5 shadow-[0_16px_48px_rgba(46,40,51,0.06)] sm:p-6',
        compact ? 'rounded-[24px] lg:h-full' : 'lg:h-[360px]',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#8A869C]">Location guide</div>
          <h2 className={cn('mt-1 font-black tracking-tight text-[#3F3D56]', compact ? 'text-xl' : 'text-2xl')}>
            Places in order
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#6F6C82]">
            Use the guide to jump between pinned stops and keep the route, stay, and unpinned places in context.
          </p>
        </div>
        <div className="hidden shrink-0 items-center gap-2 rounded-2xl border border-[#DDDCE8] bg-[#FBFAFF] px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#6F6C82] sm:flex">
          <List size={14} />
          {mappedStopCount}/{activities.length || 0}
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <button
          type="button"
          onClick={onFocusStay}
          disabled={!stay || !onFocusStay}
          className="flex min-h-[58px] items-center gap-3 rounded-2xl border border-[#DDDCE8] bg-[#FBFAFF] px-3 py-2 text-left transition hover:border-[#FF6584]/50 hover:bg-[#FFEAF0] disabled:cursor-not-allowed disabled:opacity-55"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FF6584] text-white">
            <Home size={16} />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-bold uppercase tracking-[0.16em] text-[#8A869C]">Stay</span>
            <span className="mt-0.5 block truncate text-sm font-bold text-[#3F3D56]">
              {stay?.name || 'No stay pinned'}
            </span>
          </span>
        </button>

        <div className="flex min-h-[58px] items-center gap-3 rounded-2xl border border-[#DDDCE8] bg-[#FBFAFF] px-3 py-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#3F3D56] text-white">
            <MapPin size={16} />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-bold uppercase tracking-[0.16em] text-[#8A869C]">Pinned stops</span>
            <span className="mt-0.5 block text-sm font-bold text-[#3F3D56]">
              {mappedStopCount} of {activities.length || 0}
            </span>
          </span>
        </div>
      </div>

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
                  className="rounded-full border border-[#6C63FF]/20 bg-[#EEEDFE] px-4 py-2 text-sm font-semibold text-[#6C63FF]"
                >
                  Focus stay
                </button>
              )}
              {onOpenStayRetry && (
                <button
                  type="button"
                  onClick={onOpenStayRetry}
                  className="rounded-full border border-[#3F3D56] bg-[#3F3D56] px-4 py-2 text-sm font-semibold text-white"
                >
                  Retry stay
                </button>
              )}
            </>
          }
        />
      ) : (
        <div className="mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pr-2">
          {activities.map((activity, index) => {
            const isPinned = hasCoordinates(activity);
            const isSelected = selectedActivityIndex === index;

            return (
              <button
                key={`${activity.day}-${activity.activityIndex}-${activity.name}`}
                type="button"
                onClick={() => {
                  if (isPinned) {
                    onSelectActivity(isSelected ? null : index);
                  }
                }}
                disabled={!isPinned}
                aria-pressed={isSelected}
                className={cn(
                  'w-full rounded-[20px] border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(46,40,51,0.08)] disabled:hover:translate-y-0 disabled:hover:shadow-none',
                  isSelected
                    ? 'border-[#6C63FF] bg-[#EEEDFE]'
                    : isPinned
                      ? 'border-[#DDDCE8] bg-[#FBFAFF]'
                      : 'border-dashed border-[#DDDCE8] bg-white opacity-70'
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl text-sm font-black',
                      isPinned ? 'bg-[#3F3D56] text-white' : 'border border-[#DDDCE8] bg-white text-[#8A869C]'
                    )}
                  >
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-[#3F3D56]">
                      Day {activity.day} · {activity.time} · {activity.name}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8A869C]">
                        {activity.category}
                      </span>
                      {!isPinned && (
                        <span className="rounded-full border border-[#DDDCE8] bg-[#F2F2F2] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A869C]">
                          Not pinned
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm leading-6 text-[#6F6C82]">
                      {activity.address || 'No address provided'}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
  const [isExpanded, setIsExpanded] = useState(false);
  const modalScrollRef = useRef<HTMLDivElement | null>(null);
  const hasMapData = useMemo(
    () => Boolean(destinationCoordinates) || activities.some(hasCoordinates),
    [activities, destinationCoordinates]
  );

  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsExpanded(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded]);

  const focusStay = () => {
    onFocusStay?.();
    modalScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectActivity = (index: number | null) => {
    onSelectActivity(index);
    modalScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
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
          actions={
            hasMapData ? (
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[#3F3D56] bg-white px-3 text-sm font-bold text-[#3F3D56] shadow-sm transition hover:bg-[#FBFAFF]"
                aria-label="Open trip map full screen"
              >
                <Maximize2 size={16} />
                <span className="hidden sm:inline">Expand</span>
              </button>
            ) : null
          }
        />

        <LocationGuidePanel
          activities={activities}
          stay={stay}
          selectedActivityIndex={selectedActivityIndex}
          onSelectActivity={index => {
            onSelectActivity(index);
            mapSectionRef?.current?.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            });
          }}
          onOpenStayRetry={onOpenStayRetry}
          onFocusStay={onFocusStay}
        />
      </section>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-[3px] sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={event => {
              if (event.target === event.currentTarget) {
                setIsExpanded(false);
              }
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={`${destination} expanded trip map`}
              initial={{ y: 28, scale: 0.98, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 28, scale: 0.98, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 26 }}
              className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#F2F2F2] text-[#3F3D56] shadow-[0_40px_120px_rgba(46,40,51,0.32)] sm:h-[calc(100dvh-2rem)] sm:max-w-7xl sm:rounded-[28px] sm:border sm:border-[#3F3D56]"
            >
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#DDDCE8] bg-white px-4 py-4 sm:px-6">
                <div className="min-w-0">
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#8A869C]">Expanded trip map</div>
                  <h3 className="mt-1 truncate text-xl font-black tracking-tight text-[#3F3D56] sm:text-2xl">
                    {destination}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#3F3D56] bg-white text-[#3F3D56] transition hover:bg-[#FBFAFF]"
                  aria-label="Close expanded trip map"
                >
                  <X size={18} />
                </button>
              </div>

              <div ref={modalScrollRef} className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5 lg:overflow-hidden">
                <div className="grid min-h-full gap-4 lg:h-full lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
                  <MapComponent
                    activities={activities}
                    destination={destination}
                    destinationCoordinates={destinationCoordinates}
                    stay={stay}
                    selectedActivityIndex={selectedActivityIndex}
                    focusStayTrigger={focusStayTrigger}
                    variant="expanded"
                    title="Full route view"
                  />

                  <LocationGuidePanel
                    activities={activities}
                    stay={stay}
                    selectedActivityIndex={selectedActivityIndex}
                    onSelectActivity={selectActivity}
                    onOpenStayRetry={onOpenStayRetry}
                    onFocusStay={focusStay}
                    compact
                    className="lg:min-h-0"
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
