'use client';

import Link from 'next/link';

export function CTA() {
  return (
    <section className="px-4 pb-10 pt-2 sm:px-6 sm:pb-14">
      <div className="mx-auto max-w-6xl rounded-[34px] border border-[#fed7aa] bg-[linear-gradient(135deg,#ffedd5_0%,#FFFFFF_52%,#ffe4e6_100%)] p-5 shadow-[0_24px_80px_rgba(234,88,12,0.12)] sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8c7882] sm:text-[11px] sm:tracking-[0.24em]">
              Ready to move
            </div>
            <h2 className="mt-2 text-3xl font-medium tracking-[-0.04em] text-[#3a2540] sm:text-4xl">
              Start planning in the new wayflo system.
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#7c6a72] sm:text-base">
              Create an account, save your itinerary, and keep the route flowing from research to the trip itself.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl bg-[#f43f5e] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(244,63,94,0.22)]"
            >
              Book trip
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl border border-[#ea580c]/25 bg-white px-5 py-3.5 text-sm font-semibold text-[#ea580c]"
            >
              Open dashboard
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
