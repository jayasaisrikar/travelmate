'use client';

import Link from 'next/link';

export function CTA() {
  return (
    <section className="px-4 pb-10 pt-2 sm:px-6 sm:pb-14">
      <div className="mx-auto max-w-6xl rounded-[34px] border border-[#D8D4F2] bg-[linear-gradient(135deg,#EEEDFE_0%,#FFFFFF_52%,#FFE9EF_100%)] p-5 shadow-[0_24px_80px_rgba(108,99,255,0.12)] sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7E7A92] sm:text-[11px] sm:tracking-[0.24em]">
              Ready to move
            </div>
            <h2 className="mt-2 text-3xl font-medium tracking-[-0.04em] text-[#3F3D56] sm:text-4xl">
              Start planning in the new wayflo system.
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#6F6C82] sm:text-base">
              Create an account, save your itinerary, and keep the route flowing from research to the trip itself.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl bg-[#FF6584] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(255,101,132,0.22)]"
            >
              Book trip
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl border border-[#6C63FF]/25 bg-white px-5 py-3.5 text-sm font-semibold text-[#6C63FF]"
            >
              Open dashboard
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
