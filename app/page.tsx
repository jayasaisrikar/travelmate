'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ArrowRight, Compass, MapPinned, Sparkles, Users, Waves } from 'lucide-react';
import { Brand } from '@/components/common/Brand';
import { BoardingPass } from '@/components/home/BoardingPass';
import { Footer } from '@/components/common/Footer';
import { listDestinationPulses, type DestinationPulse } from '@/services/social';

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
    accent: '#ea580c',
  },
  {
    eyebrow: 'Flow better',
    title: 'Plans stay connected to time, place, and stay details.',
    body: 'Each itinerary is grounded in a route, not a vague destination idea. That makes the output easier to trust and easier to reuse.',
    accent: '#f43f5e',
  },
];

const tripFlowSteps = [
  'Pick the destination you really want, not a template city.',
  'Set the arrival and departure window so the trip reflects your schedule.',
  'Let the itinerary form around your pace, budget, and interests.',
];

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [destinations, setDestinations] = useState<DestinationPulse[]>([]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    onScroll();

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let mounted = true;

    listDestinationPulses(4)
      .then(data => {
        if (mounted) {
          setDestinations(data);
        }
      })
      .catch(() => {
        if (mounted) {
          setDestinations([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden text-[#3a2540]">
      <nav
        className={`fixed top-0 z-50 w-full transition-all duration-200 ${
          isScrolled
            ? 'border-b border-[#eaddc7] bg-[rgba(251,242,230,0.85)] py-3 backdrop-blur-xl'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 sm:flex-nowrap sm:px-6">
          <div className="sm:hidden">
            <Brand href="/" compact showWordmark={false} className="shrink-0" />
          </div>
          <div className="hidden sm:block">
            <Brand href="/" className="shrink-0" />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-[#ea580c]/30 bg-white/80 px-3 py-2 text-[13px] font-semibold text-[#ea580c] shadow-[0_10px_24px_rgba(234,88,12,0.08)] sm:px-4 sm:text-sm"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="bg-sunset shadow-sunset rounded-xl px-3 py-2 text-[13px] font-semibold text-white transition hover:brightness-105 sm:px-4 sm:text-sm"
            >
              Explore now
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-4 pb-10 pt-24 sm:px-6 sm:pb-12 sm:pt-32 lg:pt-36">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <motion.div {...fadeInUp} className="space-y-6">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border-2 border-dashed border-[#ea580c]/40 bg-[#ffedd5] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#ea580c] sm:px-4 sm:text-[11px] sm:tracking-[0.24em]">
              <Compass className="h-3.5 w-3.5" />
              travel. flow. freedom.
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold leading-[0.98] tracking-[-0.05em] text-[#3a2540] sm:text-5xl lg:text-7xl">
                Explore freely.
                <span className="text-sunset block">Plan with more flow.</span>
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-[#7c6a72] sm:text-base sm:leading-8 sm:text-lg">
                Wayflo turns real destinations, trip windows, budgets, and preferences into saved itineraries that
                feel calm, clear, and ready to use when travel gets real.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="bg-sunset shadow-sunset group inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition hover:brightness-105 sm:py-3.5"
              >
                Explore now
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/dashboard/onboarding"
                className="inline-flex items-center justify-center rounded-xl border border-[#ea580c]/30 bg-white px-5 py-3 text-sm font-semibold text-[#ea580c] sm:py-3.5"
              >
                Learn more
              </Link>
            </div>

            <div className="rounded-[28px] border border-white/70 bg-white/85 p-4 shadow-[0_18px_48px_rgba(58,37,64,0.08)] backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8c7882]">
                    Live social proof
                  </div>
                  <h2 className="mt-1 text-lg font-medium tracking-[-0.03em] text-[#3a2540]">
                    Travelers are already clustering by destination.
                  </h2>
                </div>
                <Link href="/explore" className="text-sm font-semibold text-[#ea580c] hover:underline">
                  Explore
                </Link>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(destinations.length > 0 ? destinations : []).map((pulse) => (
                  <Link
                    key={pulse.destination_slug}
                    href={`/explore/${pulse.destination_slug}`}
                    className="rounded-2xl border border-[#f0e2d0] bg-white px-4 py-4 transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="text-sm font-bold text-[#1c1018]">{pulse.destination}</div>
                    <div className="mt-1 text-sm text-[#7c6a72]">
                      {pulse.traveler_count} traveler{pulse.traveler_count !== 1 ? 's' : ''} going
                      {pulse.room_count > 0 ? ` · ${pulse.room_count} room${pulse.room_count !== 1 ? 's' : ''}` : ''}
                    </div>
                  </Link>
                ))}

                {destinations.length === 0 && productMoments.map(point => (
                  <div
                    key={point}
                    className="rounded-2xl border border-[#f0e2d0] bg-white px-4 py-4 text-sm font-medium text-[#5b4a55]"
                  >
                    {point}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <div className="relative">
            <BoardingPass />
          </div>
        </div>
      </section>

      {/* ── Social / Explore feature highlight ─────────────── */}
      <section className="px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <motion.div
            {...fadeInUp}
            className="overflow-hidden rounded-[34px] border border-[#fed7aa] bg-[#3a2540] p-5 shadow-[0_24px_80px_rgba(58,37,64,0.18)] sm:p-8"
          >
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              {/* Left copy */}
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">
                  <Users className="h-3.5 w-3.5" />
                  New — Wayflo Social
                </div>
                <h2 className="text-3xl font-medium tracking-[-0.04em] text-white sm:text-4xl">
                  Find travelers heading
                  <span className="block text-[#fdba74]"> to the same place.</span>
                </h2>
                <p className="text-sm leading-7 text-white/70">
                  See who else is planning a trip to your destination. Wave to connect,
                  join a trip room, and plan the route together — or just share notes.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/signup"
                    className="bg-sunset shadow-sunset group inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition hover:brightness-105"
                  >
                    Join the community
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    href="/explore"
                    className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    Browse travelers
                  </Link>
                </div>
              </div>

              {/* Right visual — feature cards */}
              <div className="space-y-3">
                {[
                  {
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-[#fdba74]">
                        <path d="M18 11V6a2 2 0 0 0-4 0v5" />
                        <path d="M14 10V4a2 2 0 0 0-4 0v6" />
                        <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
                        <path d="M6 14a4 4 0 0 0 4 4h4a6 6 0 0 0 6-6v-1a2 2 0 0 0-4 0" />
                      </svg>
                    ),
                    label: 'Wave to connect',
                    body: 'Anonymous one-tap interest — only visible if both sides wave back.',
                  },
                  {
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-[#fdba74]">
                        <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                        <line x1="9" y1="3" x2="9" y2="18" />
                        <line x1="15" y1="6" x2="15" y2="21" />
                      </svg>
                    ),
                    label: 'Trip rooms',
                    body: 'Start a shared planning space for up to 6 travelers going the same way.',
                  },
                  {
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-[#fdba74]">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    ),
                    label: 'Privacy first',
                    body: 'Nothing is public until you opt in. Exact dates are never shared.',
                  },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
                      {item.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{item.label}</p>
                      <p className="mt-0.5 text-sm leading-6 text-white/60">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeInUp} className="mb-6 max-w-2xl">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8c7882] sm:text-[11px] sm:tracking-[0.24em]">
              Why wayflo
            </div>
            <h2 className="mt-2 text-2xl font-medium tracking-[-0.04em] text-[#3a2540] sm:text-4xl">
              The route, the timing, and the mood stay connected.
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#7c6a72] sm:text-base">
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
                  className="rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_18px_54px_rgba(58,37,64,0.08)] sm:p-6"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ffedd5] text-[#ea580c] sm:h-12 sm:w-12">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <h3 className="mt-4 text-xl font-medium tracking-[-0.03em] text-[#3a2540] sm:mt-5 sm:text-2xl">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[#7c6a72]">{item.body}</p>
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
            className="rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,#ffffff_0%,#fffbf2_100%)] p-5 shadow-[0_18px_60px_rgba(58,37,64,0.08)] sm:p-6"
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8c7882] sm:text-[11px] sm:tracking-[0.24em]">
              Feels clear
            </div>
            <h2 className="mt-2 text-2xl font-medium tracking-[-0.04em] text-[#3a2540] sm:text-3xl">
              It stays easy to read when you are planning fast.
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ['Fast to scan', '#ea580c', 'The main action stands out so you do not have to hunt for the next step.'],
                ['Easy on the eyes', '#3a2540', 'Trip details stay legible even when there is a lot to review.'],
                ['Calm background', '#fbf4ea', 'The page feels light, so the planning flow does not feel crowded.'],
                ['Helpful emphasis', '#f43f5e', 'Important moments are highlighted without making the screen feel loud.'],
              ].map(([label, color, body]) => (
                <div key={label} className="rounded-2xl border border-[#f0e2d0] bg-white p-4">
                  <div className="h-10 w-full rounded-xl sm:h-11" style={{ backgroundColor: color }} />
                  <div className="mt-3 text-sm font-medium text-[#3a2540] sm:text-base">{label}</div>
                  <p className="mt-1 text-sm leading-6 text-[#7c6a72]">{body}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            {...fadeInUp}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="rounded-[30px] border border-[#4a3354] bg-[#3a2540] p-5 text-white shadow-[0_20px_70px_rgba(58,37,64,0.18)] sm:p-6"
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60 sm:text-[11px] sm:tracking-[0.24em]">
              Journey rhythm
            </div>
            <h2 className="mt-2 text-2xl font-medium tracking-[-0.04em] sm:text-3xl">
              From idea to route without breaking momentum
            </h2>
            {/* Route map — vertical dashed flight path with pin stops */}
            <div className="relative mt-6 pl-10">
              <div
                className="absolute bottom-3 left-[14px] top-3 w-0.5"
                style={{ backgroundImage: 'repeating-linear-gradient(180deg, rgba(255,255,255,0.45) 0 6px, transparent 6px 12px)' }}
                aria-hidden
              />
              {tripFlowSteps.map((step, index) => (
                <div key={step} className="relative pb-7 last:pb-0">
                  <span
                    className={`absolute -left-10 flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black text-white shadow-lg ${
                      index === tripFlowSteps.length - 1 ? 'bg-sunset' : 'bg-white/15 ring-1 ring-white/30'
                    }`}
                  >
                    {index === tripFlowSteps.length - 1 ? '★' : index + 1}
                  </span>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#fb923c]">
                    {index === 0 ? 'Departure' : index === tripFlowSteps.length - 1 ? 'Arrival' : `Stop ${index}`}
                  </div>
                  <p className="mt-1.5 text-sm leading-6 text-white/88">{step}</p>
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
              className="rounded-[30px] border border-white/80 bg-white p-5 shadow-[0_18px_54px_rgba(58,37,64,0.08)] sm:p-6"
            >
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] sm:text-[11px] sm:tracking-[0.22em]" style={{ color: card.accent }}>
                {card.eyebrow}
              </div>
              <h3 className="mt-2 text-2xl font-medium tracking-[-0.04em] text-[#3a2540] sm:text-3xl">{card.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#7c6a72]">{card.body}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="px-4 pb-10 pt-2 sm:px-6 sm:pb-14">
        <motion.div
          {...fadeInUp}
          className="mx-auto max-w-6xl rounded-[34px] border border-[#fed7aa] bg-[linear-gradient(135deg,#ffedd5_0%,#FFFFFF_52%,#ffe4e6_100%)] p-5 shadow-[0_24px_80px_rgba(234,88,12,0.12)] sm:p-8"
        >
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
                className="bg-sunset shadow-sunset inline-flex items-center justify-center rounded-xl px-5 py-3.5 text-sm font-semibold text-white transition hover:brightness-105"
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
        </motion.div>
      </section>

      <Footer />
    </main>
  );
}
