'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ArrowRight, Compass, MapPinned, Sparkles, Waves } from 'lucide-react';
import { Brand } from '@/components/common/Brand';

const fadeInUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.45 },
  viewport: { once: true, margin: '-40px' },
};

const planningSignals = [
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

const productMoments = [
  'Search real places instead of seeded demos',
  'Build around when the trip starts and ends',
  'Save a trip page that still works well on your phone',
  'Share a route and collect practical suggestions',
];

const showcaseCards = [
  {
    eyebrow: 'Explore freely',
    title: 'A planner that feels lighter on first use.',
    body: 'Minimal inputs, calm copy, and rounded surfaces keep the experience moving instead of making travel planning feel like paperwork.',
    accent: '#6C63FF',
  },
  {
    eyebrow: 'Flow better',
    title: 'Plans stay connected to time, place, and stay details.',
    body: 'Each itinerary is grounded in a route, not a vague destination idea. That makes the output easier to trust and easier to reuse.',
    accent: '#FF6584',
  },
];

const tripFlowSteps = [
  'Pick the destination you really want, not a template city.',
  'Set the arrival and departure window so the trip reflects your schedule.',
  'Let the itinerary form around your pace, budget, and interests.',
];

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    onScroll();

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden text-[#3F3D56]">
      <nav
        className={`fixed top-0 z-50 w-full transition-all duration-200 ${
          isScrolled
            ? 'border-b border-[#DDDCE8] bg-[rgba(242,242,242,0.9)] py-3 backdrop-blur-xl'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6">
          <Brand href="/" className="shrink-0" />

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-[#6C63FF]/30 bg-white/80 px-4 py-2 text-sm font-semibold text-[#6C63FF] shadow-[0_10px_24px_rgba(108,99,255,0.08)]"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-[#6C63FF] px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(108,99,255,0.28)]"
            >
              Explore now
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-4 pb-12 pt-28 sm:px-6 sm:pt-32 lg:pt-36">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <motion.div {...fadeInUp} className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#6C63FF]/15 bg-[#EEEDFE] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6C63FF]">
              <Compass className="h-3.5 w-3.5" />
              travel. flow. freedom.
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-5xl font-medium leading-[0.94] tracking-[-0.05em] text-[#3F3D56] sm:text-6xl lg:text-7xl">
                Explore freely.
                <span className="block text-[#6C63FF]">Plan with more flow.</span>
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[#6F6C82] sm:text-lg">
                Wayflo turns real destinations, trip windows, budgets, and preferences into saved itineraries that
                feel calm, clear, and ready to use when travel gets real.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6C63FF] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(108,99,255,0.28)]"
              >
                Explore now
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/dashboard/onboarding"
                className="inline-flex items-center justify-center rounded-xl border border-[#6C63FF]/30 bg-white px-5 py-3.5 text-sm font-semibold text-[#6C63FF]"
              >
                Learn more
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {productMoments.map((point) => (
                <div
                  key={point}
                  className="rounded-2xl border border-white/70 bg-white/85 px-4 py-4 text-sm font-medium text-[#53506A] shadow-[0_18px_48px_rgba(63,61,86,0.08)] backdrop-blur"
                >
                  {point}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            {...fadeInUp}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="relative overflow-hidden rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8f7ff_100%)] p-5 shadow-[0_30px_90px_rgba(63,61,86,0.12)] sm:p-6"
          >
            <div className="absolute inset-x-6 top-0 h-24 rounded-b-[28px] bg-[radial-gradient(circle,rgba(108,99,255,0.18),transparent_72%)]" />

            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7E7A92]">Trip flow</div>
                <h2 className="mt-2 text-2xl font-medium tracking-[-0.03em] text-[#3F3D56]">What wayflo keeps in sync</h2>
              </div>
              <div className="flex gap-2">
                <span className="h-3 w-3 rounded-full bg-[#6C63FF]" />
                <span className="h-3 w-3 rounded-full bg-[#FF6584]" />
                <span className="h-3 w-3 rounded-full bg-[#3F3D56]" />
              </div>
            </div>

            <div className="relative mt-6 space-y-3">
              {[
                ['Destination', 'Search a live place'],
                ['Trip window', 'Set arrival and departure time'],
                ['Budget', 'Shape the plan around real spend'],
                ['Pace', 'Keep the route balanced, not overloaded'],
              ].map(([label, value], index) => (
                <div
                  key={label}
                  className="rounded-2xl border border-[#E4E2F0] bg-white px-4 py-4 shadow-[0_12px_28px_rgba(63,61,86,0.05)]"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="mt-0.5 h-11 w-11 shrink-0 rounded-2xl"
                      style={{
                        background:
                          index % 2 === 0
                            ? 'linear-gradient(180deg, #6C63FF 0%, #847DFF 100%)'
                            : 'linear-gradient(180deg, #FF6584 0%, #FF8AA2 100%)',
                      }}
                    />
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7E7A92]">{label}</div>
                      <div className="mt-1 text-base font-medium text-[#3F3D56]">{value}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="relative mt-4 rounded-2xl bg-[#3F3D56] px-4 py-4 text-white">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">Why it works</div>
              <p className="mt-2 text-sm leading-6 text-white/90">
                The itinerary stays tied to your actual timing so the whole route feels usable, not over-promised.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeInUp} className="mb-6 max-w-2xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7E7A92]">Why wayflo</div>
            <h2 className="mt-2 text-3xl font-medium tracking-[-0.04em] text-[#3F3D56] sm:text-4xl">
              The route, the timing, and the mood stay connected.
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#6F6C82] sm:text-base">
              You get a calmer way to plan, with the important details easy to spot and the next step always obvious.
            </p>
          </motion.div>

          <div className="grid gap-4 lg:grid-cols-3">
            {planningSignals.map((item, index) => {
              const Icon = item.icon;

              return (
                <motion.article
                  key={item.title}
                  {...fadeInUp}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_18px_54px_rgba(63,61,86,0.08)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEEDFE] text-[#6C63FF]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-2xl font-medium tracking-[-0.03em] text-[#3F3D56]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#6F6C82]">{item.body}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <motion.div
            {...fadeInUp}
            className="rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,#ffffff_0%,#faf8ff_100%)] p-6 shadow-[0_18px_60px_rgba(63,61,86,0.08)]"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7E7A92]">Feels clear</div>
            <h2 className="mt-2 text-3xl font-medium tracking-[-0.04em] text-[#3F3D56]">
              It stays easy to read when you are planning fast.
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ['Fast to scan', '#6C63FF', 'The main action stands out so you do not have to hunt for the next step.'],
                ['Easy on the eyes', '#3F3D56', 'Trip details stay legible even when there is a lot to review.'],
                ['Calm background', '#F2F2F2', 'The page feels light, so the planning flow does not feel crowded.'],
                ['Helpful emphasis', '#FF6584', 'Important moments are highlighted without making the screen feel loud.'],
              ].map(([label, color, body]) => (
                <div key={label} className="rounded-2xl border border-[#E4E2F0] bg-white p-4">
                  <div className="h-11 w-full rounded-xl" style={{ backgroundColor: color }} />
                  <div className="mt-3 text-base font-medium text-[#3F3D56]">{label}</div>
                  <p className="mt-1 text-sm leading-6 text-[#6F6C82]">{body}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            {...fadeInUp}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="rounded-[30px] border border-[#4D4970] bg-[#3F3D56] p-6 text-white shadow-[0_20px_70px_rgba(63,61,86,0.18)]"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/60">Journey rhythm</div>
            <h2 className="mt-2 text-3xl font-medium tracking-[-0.04em]">From idea to route without breaking momentum</h2>
            <div className="mt-6 space-y-3">
              {tripFlowSteps.map((step, index) => (
                <div key={step} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FF6584]">Step {index + 1}</div>
                  <p className="mt-2 text-sm leading-6 text-white/88">{step}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-2">
          {showcaseCards.map((card, index) => (
            <motion.article
              key={card.title}
              {...fadeInUp}
              transition={{ duration: 0.4, delay: index * 0.06 }}
              className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_18px_54px_rgba(63,61,86,0.08)]"
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: card.accent }}>
                {card.eyebrow}
              </div>
              <h3 className="mt-2 text-3xl font-medium tracking-[-0.04em] text-[#3F3D56]">{card.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#6F6C82]">{card.body}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="px-4 pb-10 pt-2 sm:px-6 sm:pb-14">
        <motion.div
          {...fadeInUp}
          className="mx-auto max-w-6xl rounded-[34px] border border-[#D8D4F2] bg-[linear-gradient(135deg,#EEEDFE_0%,#FFFFFF_52%,#FFE9EF_100%)] p-6 shadow-[0_24px_80px_rgba(108,99,255,0.12)] sm:p-8"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7E7A92]">Ready to move</div>
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
        </motion.div>
      </section>

      <footer className="border-t border-white/60 px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-[#6F6C82] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Brand href="/" compact className="shrink-0" />
            <p>© 2026 wayflo</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/dashboard" className="transition hover:text-[#3F3D56]">
              Dashboard
            </Link>
            <Link href="/dashboard/onboarding" className="transition hover:text-[#3F3D56]">
              New trip
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
