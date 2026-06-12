'use client';

import { MapPinned, Sparkles, Waves } from 'lucide-react';

const features = [
  {
    title: 'Real route inputs',
    body: 'Search a live destination, then anchor the trip around the dates and rhythm that actually matter.',
    icon: MapPinned,
  },
  {
    title: 'Smarter timing',
    body: 'Wayflo keeps arrival windows, departures, stay context, and daily flow visible from the start.',
    icon: Waves,
  },
  {
    title: 'Saved momentum',
    body: 'Keep the itinerary, map view, and trip notes together so a plan stays usable after you close the tab.',
    icon: Sparkles,
  },
];

export function Features() {
  return (
    <section className="px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 max-w-2xl">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8c7882] sm:text-[11px] sm:tracking-[0.24em]">
            Why wayflo
          </div>
          <h2 className="mt-2 text-2xl font-medium tracking-[-0.04em] text-[#3a2540] sm:text-4xl">
            The route, the timing, and the mood stay connected.
          </h2>
          <p className="mt-3 text-sm leading-7 text-[#7c6a72] sm:text-base">
            You get a calmer way to plan, with the important details easy to spot and the next step always obvious.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {features.map((item, index) => {
            const Icon = item.icon;

            return (
              <article
                key={item.title}
                className="rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_18px_54px_rgba(58,37,64,0.08)] sm:p-6"
                style={{ transform: `translateY(${index % 2 === 0 ? 0 : 6}px)` }}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ffedd5] text-[#ea580c] sm:h-12 sm:w-12">
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <h3 className="mt-4 text-xl font-medium tracking-[-0.03em] text-[#3a2540] sm:mt-5 sm:text-2xl">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#7c6a72]">{item.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
