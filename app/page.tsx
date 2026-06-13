'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Calendar,
  MapPin,
  Users,
  Search,
  Route,
  Share2,
  Compass,
  Plane,
  ShieldCheck,
} from 'lucide-react';
import { Brand } from '@/components/common/Brand';
import { DestinationGlobe } from '@/components/home/DestinationGlobe';
import { listDestinationPulses, type DestinationPulse } from '@/services/social';

const fadeUp = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  viewport: { once: true, margin: '-60px' },
};

const SEED_PULSES: DestinationPulse[] = [
  { destination: 'Bali', destination_slug: 'bali', traveler_count: 128, room_count: 9, travel_months: [], recent_travelers: [] },
  { destination: 'Tokyo', destination_slug: 'tokyo', traveler_count: 96, room_count: 6, travel_months: [], recent_travelers: [] },
  { destination: 'Lisbon', destination_slug: 'lisbon', traveler_count: 74, room_count: 5, travel_months: [], recent_travelers: [] },
  { destination: 'Paris', destination_slug: 'paris', traveler_count: 61, room_count: 4, travel_months: [], recent_travelers: [] },
  { destination: 'Cape Town', destination_slug: 'cape-town', traveler_count: 43, room_count: 3, travel_months: [], recent_travelers: [] },
  { destination: 'Sydney', destination_slug: 'sydney', traveler_count: 38, room_count: 2, travel_months: [], recent_travelers: [] },
];

const STEPS = [
  {
    n: '01',
    tag: 'Search',
    icon: Search,
    title: 'Real destinations, real dates',
    body: 'Start from a live place and a trip window — not a template city. Wayflo grounds the whole plan in where and when you are actually going.',
  },
  {
    n: '02',
    tag: 'Plan',
    icon: Route,
    title: 'An itinerary that holds up',
    body: 'Budget, pace, and timing stay connected, so the route reads clearly and still works once you close the tab and start moving.',
  },
  {
    n: '03',
    tag: 'Connect',
    icon: Share2,
    title: 'Share it, or go together',
    body: 'Publish a clean trip page, collect suggestions, or match with travelers heading the same way and plan in a shared room.',
  },
];

const AUDIENCES = [
  {
    n: '01',
    title: 'Solo explorers',
    body: 'Build a calm, legible plan you can trust on the ground — and find verified travelers going your way when you want company.',
    icon: Compass,
  },
  {
    n: '02',
    title: 'Trip groups',
    body: 'Plan together in a shared room: one destination, one window, every traveler on the same itinerary instead of a messy thread.',
    icon: Users,
  },
];

const STATS = [
  ['40+', 'Live destinations'],
  ['1-tap', 'Tripmate requests'],
  ['Privacy', 'first by default'],
];

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [pulses, setPulses] = useState<DestinationPulse[]>(SEED_PULSES);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let active = true;
    listDestinationPulses(6)
      .then(data => {
        if (active && data.length) setPulses(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const maxTravelers = Math.max(...pulses.map(p => p.traveler_count), 1);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0B0A0F] text-[#F5F0EA] antialiased">
      {/* ── ambient grid + glows ── */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.5]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute -top-40 right-0 h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle,rgba(234,88,12,0.16),transparent_65%)] blur-3xl" />
        <div className="absolute top-1/3 -left-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(244,63,94,0.1),transparent_65%)] blur-3xl" />
      </div>

      {/* ── nav ── */}
      <nav
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-200 ${
          scrolled ? 'border-b border-white/10 bg-[#0B0A0F]/85 py-2.5 backdrop-blur-xl sm:py-3' : 'py-3.5 sm:py-5'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 sm:px-8">
          <Brand href="/" compact className="min-w-0 shrink-0 [&_*]:!text-[#F5F0EA] sm:[&_svg]:h-12 sm:[&_svg]:w-12" />
          <div className="hidden items-center gap-8 font-mono text-[12px] uppercase tracking-[0.18em] text-[#A89B92] md:flex">
            <Link href="/explore" className="transition hover:text-[#F5F0EA]">Explore</Link>
            <a href="#how" className="transition hover:text-[#F5F0EA]">How it works</a>
            <Link href="/dashboard/community" className="transition hover:text-[#F5F0EA]">Community</Link>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-full border border-white/15 px-4 py-2 text-[13px] font-semibold text-[#F5F0EA] transition hover:bg-white/5 sm:inline-flex"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="bg-sunset rounded-full px-3.5 py-2 text-[12px] font-bold text-[#1a0d05] shadow-[0_0_28px_-6px_rgba(234,88,12,0.7)] transition hover:brightness-110 sm:px-4 sm:text-[13px]"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── hero ── */}
      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-8 px-4 pb-14 pt-24 sm:gap-10 sm:px-8 sm:pt-32 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24 lg:pt-36">
        <motion.div {...fadeUp}>
          <div className="mb-5 inline-flex max-w-full items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#fb923c] sm:mb-6 sm:text-[11px] sm:tracking-[0.32em]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#fb923c] shadow-[0_0_10px_#fb923c]" />
            Smart travel planning
          </div>
          <h1 className="max-w-[11ch] text-[clamp(2.7rem,12vw,4.25rem)] font-black leading-[0.98] tracking-tight sm:max-w-none sm:text-6xl lg:text-[76px] lg:leading-[0.95]">
            PLAN THE TRIP.
            <span className="text-sunset block">FLOW THE ROUTE.</span>
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-[#A89B92] sm:mt-7 sm:text-base">
            Wayflo turns real destinations, trip windows, and budgets into itineraries that
            stay usable on the ground — then connects you with travelers heading the same way.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row">
            <Link
              href="/signup"
              className="bg-sunset group inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold text-[#1a0d05] shadow-[0_0_36px_-8px_rgba(234,88,12,0.8)] transition hover:brightness-110"
            >
              Start planning
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/explore"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-3.5 text-sm font-semibold text-[#F5F0EA] transition hover:bg-white/5"
            >
              Browse destinations
            </Link>
          </div>

          <div className="mt-9 grid grid-cols-3 gap-3 sm:mt-12 sm:flex sm:flex-wrap sm:gap-x-10 sm:gap-y-5">
            {STATS.map(([big, small]) => (
              <div key={small} className="min-w-0">
                <div className="text-sunset text-xl font-black tracking-tight sm:text-3xl">{big}</div>
                <div className="mt-1 text-wrap font-mono text-[9px] uppercase tracking-[0.1em] text-[#8C8079] sm:text-[11px] sm:tracking-[0.18em]">{small}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* globe + floating trip card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto w-full max-w-[420px] sm:max-w-[520px]"
        >
          <DestinationGlobe />

          <div className="absolute right-0 top-2 w-[min(70vw,218px)] rounded-2xl border border-white/10 bg-[#121017]/85 p-3 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:right-2 sm:top-4 sm:w-[230px] sm:p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#fb923c]">Trip</span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[#7CDB9B]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#7CDB9B] shadow-[0_0_8px_#7CDB9B]" /> Ready
              </span>
            </div>
            <div className="mt-3 space-y-2.5">
              <Row icon={MapPin} label="Destination" value="Bali, Indonesia" />
              <Row icon={Calendar} label="Window" value="Jun 14 – Jun 21" />
              <Row icon={Users} label="Tripmates" value="3 going" />
            </div>
          </div>

          <div className="absolute -left-2 bottom-6 hidden items-center gap-2 rounded-full border border-white/10 bg-[#121017]/85 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#A89B92] backdrop-blur-xl sm:flex">
            <Plane className="h-3.5 w-3.5 -rotate-45 text-[#fb923c]" /> Live routes
          </div>
        </motion.div>
      </section>

      {/* ── trusted strip ── */}
      <section className="relative z-10 border-y border-white/10 bg-white/[0.015]">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-4 px-4 py-6 sm:flex-row sm:items-center sm:gap-10 sm:px-8 sm:py-7">
          <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.22em] text-[#8C8079]">
            Travelers planning now
          </span>
          <div className="flex max-w-full flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[12px] tracking-[0.08em] text-[#A89B92] sm:gap-x-7 sm:text-[13px] sm:tracking-[0.12em]">
            {['BALI', 'TOKYO', 'LISBON', 'PARIS', 'CAPE TOWN', 'SYDNEY', 'KYOTO'].map(d => (
              <span key={d} className="transition hover:text-[#F5F0EA]">{d}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── live destinations snapshot ── */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-8 sm:py-28">
        <motion.div {...fadeUp} className="mb-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.3em] text-[#fb923c]">Live now</div>
            <h2 className="max-w-xl text-3xl font-black leading-[1.05] tracking-tight sm:text-5xl">
              Where travelers are<span className="text-sunset"> clustering.</span>
            </h2>
          </div>
          <Link href="/explore" className="group inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.18em] text-[#fb923c]">
            Browse all
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>

        <motion.div {...fadeUp} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-white/10 px-4 py-3.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#8C8079] sm:grid-cols-[1.4fr_0.8fr_0.7fr_1.3fr] sm:px-7 sm:tracking-[0.16em]">
            <span>Destination</span>
            <span className="text-right sm:text-left">Travelers</span>
            <span className="hidden sm:block">Rooms</span>
            <span className="hidden text-right sm:block">Activity</span>
          </div>
          {pulses.map((p, i) => (
            <Link
              key={p.destination_slug}
              href={`/explore/${p.destination_slug}`}
              className={`grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-4 transition hover:bg-white/[0.03] sm:grid-cols-[1.4fr_0.8fr_0.7fr_1.3fr] sm:px-7 ${
                i !== pulses.length - 1 ? 'border-b border-white/5' : ''
              }`}
            >
              <span className="min-w-0 flex items-center gap-3 font-bold">
                <span className="text-sunset font-mono text-[11px]">{String(i + 1).padStart(2, '0')}</span>
                <span className="truncate">{p.destination}</span>
              </span>
              <span className="text-right font-mono text-sm text-[#F5F0EA] sm:text-left">{p.traveler_count}</span>
              <span className="hidden font-mono text-sm text-[#A89B92] sm:block">{p.room_count}</span>
              <span className="hidden items-center justify-end gap-3 sm:flex">
                <span className="h-1.5 w-28 overflow-hidden rounded-full bg-white/10">
                  <span
                    className="bg-sunset block h-full rounded-full"
                    style={{ width: `${Math.max(12, (p.traveler_count / maxTravelers) * 100)}%` }}
                  />
                </span>
              </span>
            </Link>
          ))}
        </motion.div>
      </section>

      {/* ── how it works ── */}
      <section id="how" className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-8 sm:py-28">
        <motion.div {...fadeUp} className="mx-auto mb-10 max-w-2xl text-left sm:mb-14 sm:text-center">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[#fb923c] sm:text-[11px] sm:tracking-[0.3em]">How it works</div>
          <h2 className="text-3xl font-black leading-[1.05] tracking-tight sm:text-5xl">
            Three steps from idea<span className="text-sunset"> to itinerary.</span>
          </h2>
        </motion.div>

        <div className="grid gap-5 lg:grid-cols-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.n}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.08 }}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-[#EA580C]/40 sm:p-7"
              >
                <div className="relative mb-5 flex h-32 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[radial-gradient(circle_at_50%_120%,rgba(234,88,12,0.22),transparent_60%)] sm:mb-7 sm:h-40">
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:22px_22px]" />
                  <Icon className="relative h-12 w-12 text-[#fb923c] transition-transform duration-500 group-hover:scale-110" strokeWidth={1.4} />
                  <span className="absolute right-3 top-3 font-mono text-[42px] font-black leading-none text-white/[0.06]">{s.n}</span>
                </div>
                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#fb923c]">
                  {s.n} / {s.tag}
                </div>
                <h3 className="mt-3 text-xl font-bold tracking-tight">{s.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#A89B92]">{s.body}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── built for ── */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-8 sm:py-28">
        <motion.div {...fadeUp} className="mb-10 max-w-2xl sm:mb-14">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[#fb923c] sm:text-[11px] sm:tracking-[0.3em]">Built for</div>
          <h2 className="text-3xl font-black leading-[1.05] tracking-tight sm:text-5xl">
            However you<span className="text-sunset"> travel.</span>
          </h2>
        </motion.div>

        <div className="space-y-5">
          {AUDIENCES.map((a, i) => {
            const Icon = a.icon;
            const reversed = i % 2 === 1;
            return (
              <motion.div
                key={a.n}
                {...fadeUp}
                className="grid items-center gap-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:gap-6 sm:p-8 lg:grid-cols-2"
              >
                <div className={reversed ? 'lg:order-2' : ''}>
                  <div className="font-mono text-[12px] uppercase tracking-[0.22em] text-[#8C8079]">{a.n}</div>
                  <h3 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">{a.title}</h3>
                  <p className="mt-4 max-w-md text-sm leading-7 text-[#A89B92] sm:text-base">{a.body}</p>
                  <Link href="/signup" className="group mt-6 inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.18em] text-[#fb923c]">
                    Get started
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
                <div className={`relative flex h-40 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[radial-gradient(circle_at_70%_120%,rgba(244,63,94,0.18),rgba(234,88,12,0.12),transparent_65%)] sm:h-52 ${reversed ? 'lg:order-1' : ''}`}>
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:26px_26px]" />
                  <Icon className="relative h-16 w-16 text-[#fdba74]" strokeWidth={1.2} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-20 sm:px-8 sm:pb-24">
        <motion.div
          {...fadeUp}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0E0C13] px-5 py-12 text-center sm:px-12 sm:py-24"
        >
          <div className="pointer-events-none absolute inset-0 opacity-60">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(234,88,12,0.18),transparent_60%)]" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(rgba(251,146,60,0.08)_1px,transparent_1px)] bg-[size:100%_18px]" />
          </div>
          <div className="relative">
            <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.32em] text-[#fb923c]">Ready when you are</div>
            <h2 className="mx-auto max-w-2xl text-[clamp(2rem,10vw,3.75rem)] font-black uppercase leading-[1] tracking-tight sm:text-6xl">
              Let&apos;s plan<br />your next trip.
            </h2>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="bg-sunset inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-[#1a0d05] shadow-[0_0_40px_-8px_rgba(234,88,12,0.8)] transition hover:brightness-110 sm:w-auto"
              >
                Create your first trip
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/15 px-7 py-3.5 text-sm font-semibold text-[#F5F0EA] transition hover:bg-white/5 sm:w-auto"
              >
                Open dashboard
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── footer ── */}
      <footer className="relative z-10 border-t border-white/10">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-8 sm:py-14 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div>
            <Brand href="/" className="[&_*]:!text-[#F5F0EA]" />
            <p className="mt-4 max-w-xs text-sm leading-6 text-[#8C8079]">
              Smart travel planning that keeps your routes, timing, and ideas in flow.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[#A89B92]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#7CDB9B]" /> Privacy-first by default
            </div>
          </div>
          {[
            { h: 'Product', links: [['Explore', '/explore'], ['Community', '/dashboard/community'], ['Dashboard', '/dashboard']] },
            { h: 'Company', links: [['Privacy', '/privacy-policy'], ['Terms', '/terms-of-service']] },
            { h: 'Get started', links: [['Log in', '/login'], ['Sign up', '/signup']] },
          ].map(col => (
            <div key={col.h}>
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8C8079]">{col.h}</div>
              <ul className="mt-4 space-y-3 text-sm text-[#A89B92]">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="transition hover:text-[#F5F0EA]">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-4 py-5 font-mono text-[10px] uppercase tracking-[0.1em] text-[#6B635D] sm:flex-row sm:items-center sm:px-8 sm:text-[11px] sm:tracking-[0.14em]">
            <span>© {new Date().getFullYear()} Wayflo</span>
            <span>Travel · Flow · Freedom</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-[#fb923c]" />
      <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-[#8C8079] sm:tracking-[0.16em]">{label}</span>
      <span className="ml-auto min-w-0 truncate text-right text-[12px] font-semibold text-[#F5F0EA]">{value}</span>
    </div>
  );
}
