'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, Compass, Lock, MapPinned, Sparkles, Users, Waves } from 'lucide-react';
import { Brand } from '@/components/common/Brand';
import { Footer } from '@/components/common/Footer';
import { Button } from '@/components/ui/button';
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

const socialFeatures = [
  { icon: Users, label: 'Wave to connect', body: 'Anonymous one-tap interest — only visible if both sides wave back.' },
  { icon: Compass, label: 'Trip rooms', body: 'Start a shared planning space for up to 6 travelers going the same way.' },
  { icon: Lock, label: 'Privacy first', body: 'Nothing is public until you opt in. Exact dates are never shared.' },
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
      .then(data => { if (mounted) setDestinations(data); })
      .catch(() => { if (mounted) setDestinations([]); });
    return () => { mounted = false; };
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* ── Nav ── */}
      <nav
        className={`fixed top-0 z-50 w-full transition-all duration-200 ${
          isScrolled ? 'border-b-2 border-ink bg-background/95 py-3 backdrop-blur-xl' : 'bg-transparent py-5'
        }`}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 sm:flex-nowrap sm:px-6">
          <div className="sm:hidden"><Brand href="/" compact showWordmark={false} className="shrink-0" /></div>
          <div className="hidden sm:block"><Brand href="/" className="shrink-0" /></div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild variant="brutal" size="sm">
              <Link href="/signup">Explore now</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-28 sm:px-6 sm:pt-36">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <motion.div {...fadeInUp} className="space-y-7">
            <div className="inline-flex items-center gap-2 border-2 border-ink bg-accent px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-accent-foreground shadow-brutal">
              <Compass className="h-3.5 w-3.5" />
              travel. flow. freedom.
            </div>

            <h1 className="text-display">
              Explore freely.
              <span className="block text-primary">Plan with flow.</span>
            </h1>

            <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Wayflo turns real destinations, trip windows, budgets, and preferences into saved itineraries that
              feel calm, clear, and ready to use when travel gets real.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="brutal" size="lg">
                <Link href="/signup">Explore now <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/dashboard/onboarding">Learn more</Link>
              </Button>
            </div>

            {/* Live social proof */}
            <div className="surface-brutal p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="eyebrow">Live social proof</div>
                  <h2 className="mt-1 text-lg font-extrabold tracking-tight">Travelers are clustering by destination.</h2>
                </div>
                <Link href="/explore" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
                  Explore <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {destinations.map(pulse => (
                  <Link
                    key={pulse.destination_slug}
                    href={`/explore/${pulse.destination_slug}`}
                    className="border-2 border-ink bg-background px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-brutal"
                  >
                    <div className="text-sm font-extrabold">{pulse.destination}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {pulse.traveler_count} traveler{pulse.traveler_count !== 1 ? 's' : ''} going
                      {pulse.room_count > 0 ? ` · ${pulse.room_count} room${pulse.room_count !== 1 ? 's' : ''}` : ''}
                    </div>
                  </Link>
                ))}
                {destinations.length === 0 && (
                  <div className="border-2 border-dashed border-ink/40 bg-background px-4 py-6 text-center text-sm text-muted-foreground sm:col-span-2">
                    No trending destinations yet — be the first to plan one.
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Trip-flow panel */}
          <motion.div {...fadeInUp} transition={{ duration: 0.45, delay: 0.05 }} className="surface-brutal shadow-brutal-lg p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="eyebrow">Trip flow</div>
                <h2 className="mt-2 text-title">What wayflo keeps in sync</h2>
              </div>
              <div className="flex gap-1.5 pt-1">
                <span className="h-3 w-3 rounded-full border-2 border-ink bg-primary" />
                <span className="h-3 w-3 rounded-full border-2 border-ink bg-accent" />
                <span className="h-3 w-3 rounded-full border-2 border-ink bg-secondary" />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {[
                ['Destination', 'Search a live place'],
                ['Trip window', 'Set arrival and departure time'],
                ['Budget', 'Shape the plan around real spend'],
                ['Pace', 'Keep the route balanced, not overloaded'],
              ].map(([label, value], index) => (
                <div key={label} className="flex items-start gap-3 border-2 border-ink bg-background px-4 py-3">
                  <div className={`mt-0.5 h-10 w-10 shrink-0 border-2 border-ink ${index % 2 === 0 ? 'bg-primary' : 'bg-accent'}`} />
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
                    <div className="mt-0.5 text-sm font-semibold">{value}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 border-2 border-ink bg-secondary px-4 py-4 text-secondary-foreground">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-secondary-foreground/70">Why it works</div>
              <p className="mt-2 text-sm leading-6 text-secondary-foreground/90">
                The itinerary stays tied to your actual timing so the whole route feels usable, not over-promised.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Social highlight ── */}
      <section className="px-4 py-10 sm:px-6 sm:py-14">
        <motion.div {...fadeInUp} className="mx-auto max-w-6xl border-2 border-ink bg-secondary p-6 text-secondary-foreground shadow-brutal-lg sm:p-10">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 border-2 border-secondary-foreground/30 bg-accent px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-accent-foreground">
                <Users className="h-3.5 w-3.5" /> New — Wayflo Social
              </div>
              <h2 className="text-headline">
                Find travelers heading
                <span className="block text-accent">to the same place.</span>
              </h2>
              <p className="text-sm leading-7 text-secondary-foreground/70">
                See who else is planning a trip to your destination. Wave to connect, join a trip room, and plan the
                route together — or just share notes.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild variant="brutal" size="lg">
                  <Link href="/signup">Join the community <ArrowRight className="h-4 w-4" /></Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-secondary-foreground/30 bg-transparent text-secondary-foreground hover:bg-secondary-foreground/10">
                  <Link href="/explore">Browse travelers</Link>
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {socialFeatures.map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-start gap-4 border-2 border-secondary-foreground/20 bg-secondary-foreground/5 px-4 py-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-accent bg-accent text-accent-foreground">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-extrabold">{item.label}</p>
                      <p className="mt-0.5 text-sm leading-6 text-secondary-foreground/60">{item.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Why wayflo ── */}
      <section className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeInUp} className="mb-8 max-w-2xl">
            <div className="eyebrow">Why wayflo</div>
            <h2 className="mt-2 text-headline">The route, the timing, and the mood stay connected.</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              You get a calmer way to plan, with the important details easy to spot and the next step always obvious.
            </p>
          </motion.div>

          <div className="grid gap-5 lg:grid-cols-3">
            {planningSignals.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.article
                  key={item.title}
                  {...fadeInUp}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="surface-brutal p-6 transition hover:-translate-y-1 hover:shadow-brutal-lg"
                >
                  <div className="flex h-12 w-12 items-center justify-center border-2 border-ink bg-primary text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-title">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.body}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Journey rhythm ── */}
      <section className="px-4 py-6 sm:px-6 sm:py-10">
        <motion.div {...fadeInUp} className="mx-auto max-w-6xl border-2 border-ink bg-card p-6 shadow-brutal sm:p-10">
          <div className="eyebrow">Journey rhythm</div>
          <h2 className="mt-2 text-headline">From idea to route without breaking momentum.</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {tripFlowSteps.map((step, index) => (
              <div key={step} className="border-2 border-ink bg-background px-4 py-5">
                <div className="text-3xl font-extrabold text-primary">0{index + 1}</div>
                <p className="mt-3 text-sm leading-6 text-foreground">{step}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Final CTA ── */}
      <section className="px-4 pb-14 pt-4 sm:px-6">
        <motion.div {...fadeInUp} className="mx-auto max-w-6xl border-2 border-ink bg-primary p-8 text-primary-foreground shadow-brutal-lg sm:p-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary-foreground/70">Ready to move</div>
              <h2 className="mt-2 text-headline text-primary-foreground">Start planning in the new wayflo.</h2>
              <p className="mt-3 text-base leading-7 text-primary-foreground/80">
                Create an account, save your itinerary, and keep the route flowing from research to the trip itself.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="accent" size="lg">
                <Link href="/signup">Get started</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="bg-card">
                <Link href="/dashboard">Open dashboard</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </section>

      <Footer />
    </main>
  );
}
