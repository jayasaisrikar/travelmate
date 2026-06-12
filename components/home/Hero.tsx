'use client';

import Link from 'next/link';
import { ArrowRight, Compass, MapPinned, Sparkles } from 'lucide-react';

const highlights = [
  'Search live destinations',
  'Set timing that matches your trip',
  'Save and share a route that stays usable',
];

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl gap-8 px-4 pb-10 pt-24 sm:px-6 sm:pb-12 sm:pt-32 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#ea580c]/15 bg-[#ffedd5] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ea580c]">
          <Compass className="h-3.5 w-3.5" />
          travel. flow. freedom.
        </div>

        <div className="space-y-4">
          <h1 className="max-w-3xl text-4xl font-medium leading-[0.98] tracking-[-0.05em] text-[#3a2540] sm:text-5xl lg:text-7xl">
            Explore freely.
            <span className="block text-[#ea580c]">Plan with more flow.</span>
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-[#7c6a72] sm:text-base sm:leading-8 sm:text-lg">
            Wayflo turns real destinations, trip windows, budgets, and preferences into saved itineraries that feel calm, clear, and ready to use when travel gets real.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ea580c] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(234,88,12,0.28)]"
          >
            Explore now
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/dashboard/onboarding"
            className="inline-flex items-center justify-center rounded-xl border border-[#ea580c]/30 bg-white px-5 py-3 text-sm font-semibold text-[#ea580c]"
          >
            Start planning
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {highlights.map(point => (
            <div
              key={point}
              className="rounded-2xl border border-white/70 bg-white/85 px-4 py-4 text-sm font-medium text-[#5b4a55] shadow-[0_18px_48px_rgba(58,37,64,0.08)]"
            >
              {point}
            </div>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#fffbf4_100%)] p-5 shadow-[0_30px_90px_rgba(58,37,64,0.12)] sm:p-6">
        <div className="absolute inset-x-6 top-0 h-24 rounded-b-[28px] bg-[radial-gradient(circle,rgba(234,88,12,0.18),transparent_72%)]" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8c7882]">Trip flow</div>
            <h2 className="mt-2 text-xl font-medium tracking-[-0.03em] text-[#3a2540] sm:text-2xl">
              What wayflo keeps in sync
            </h2>
          </div>
          <div className="flex gap-1.5 pt-1">
            <span className="h-3 w-3 rounded-full bg-[#ea580c]" />
            <span className="h-3 w-3 rounded-full bg-[#f43f5e]" />
            <span className="h-3 w-3 rounded-full bg-[#3a2540]" />
          </div>
        </div>

        <div className="relative mt-6 space-y-3">
          {[
            { label: 'Destination', value: 'Search a live place', icon: MapPinned },
            { label: 'Trip window', value: 'Set arrival and departure times', icon: Sparkles },
            { label: 'Budget', value: 'Shape the plan around real spend', icon: Compass },
          ].map(item => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="rounded-2xl border border-[#f0e2d0] bg-white px-4 py-4 shadow-[0_12px_28px_rgba(58,37,64,0.05)]"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ffedd5] text-[#ea580c]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8c7882]">
                      {item.label}
                    </div>
                    <div className="mt-1 text-sm font-medium text-[#3a2540]">{item.value}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
