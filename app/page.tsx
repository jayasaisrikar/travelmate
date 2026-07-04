'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import {
  Counter,
  EASE,
  RevealWords,
  ScrollProgressBar,
  TiltCard,
  rise,
  stagger,
} from '@/components/common/motion';
import { ArrowRight, ArrowUpRight, Compass, Map, Route, Sparkles, Users } from 'lucide-react';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { HeroMockup } from '@/components/marketing/HeroMockup';
import { Footer } from '@/components/common/Footer';

const IMG = {
  hero: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&q=80&w=1920',
};

const stats = [
  { to: 120, suffix: '+', label: 'destinations searchable live' },
  { to: 6, suffix: '', label: 'travelers per shared trip room' },
  { to: 100, suffix: '%', label: 'plans saved for offline reuse' },
];

const explore = [
  {
    index: '01',
    title: 'How it works',
    body: 'From a real destination to a route you can reuse — without breaking momentum.',
    href: '/how-it-works',
    icon: Route,
  },
  {
    index: '02',
    title: 'Why Wayflo',
    body: 'The route, the timing, and the mood stay connected from the first input.',
    href: '/why-wayflo',
    icon: Compass,
  },
  {
    index: '03',
    title: 'Community',
    body: 'Find travelers heading to the same place. Wave to connect, plan together.',
    href: '/community',
    icon: Users,
  },
];

export default function Home() {
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);

  async function handleWaitlistSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = waitlistEmail.trim();
    if (!email || waitlistSubmitting) return;

    setWaitlistSubmitting(true);
    setWaitlistError(null);

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || 'Something went wrong. Please try again.');
      }

      setWaitlistSubmitted(true);
    } catch (error) {
      setWaitlistError(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setWaitlistSubmitting(false);
    }
  }
  const reduceMotion = useReducedMotion();

  // Hero parallax
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroP } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroBgY = useTransform(heroP, [0, 1], reduceMotion ? ['0%', '0%'] : ['0%', '32%']);
  const heroBgScale = useTransform(heroP, [0, 1], reduceMotion ? [1, 1] : [1.05, 1.18]);
  const heroContentY = useTransform(heroP, [0, 1], reduceMotion ? [0, 0] : [0, 110]);
  const heroContentOpacity = useTransform(heroP, [0, 0.85], [1, 0]);

  return (
    <main className="min-h-dvh overflow-x-hidden text-[#3F3D56]">
      <ScrollProgressBar />
      <MarketingNav />

      {/* ── Hero (parallax + word reveal) ──────────────────── */}
      <section ref={heroRef} className="relative min-h-[94vh] overflow-hidden">
        <motion.div style={{ y: heroBgY, scale: heroBgScale }} className="absolute inset-0">
          <Image src={IMG.hero} alt="" fill priority sizes="100vw" className="object-cover" />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#1A1726]/55 via-[#1A1726]/35 to-[#F2F2F2]" />
        <motion.div
          aria-hidden
          animate={reduceMotion ? undefined : { opacity: [0.55, 0.85, 0.55] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(108,99,255,0.34),transparent_55%)]"
        />

        <motion.div
          style={{ y: heroContentY, opacity: heroContentOpacity }}
          className="relative mx-auto grid min-h-[88vh] max-w-6xl grid-cols-1 items-center gap-10 px-4 pb-16 pt-28 sm:min-h-[94vh] sm:px-6 sm:pb-24 sm:pt-32 lg:grid-cols-[1.05fr_0.95fr]"
        >
          <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-3xl">
            <motion.div
              variants={rise}
              className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/90"
            >
              <Compass className="h-3.5 w-3.5" />
              travel. flow. freedom.
            </motion.div>

            <h1 className="mt-5 text-balance font-display text-[2.7rem] font-light leading-[1.02] tracking-[-0.02em] text-white drop-shadow-[0_8px_30px_rgba(0,0,0,0.35)] sm:mt-6 sm:text-7xl sm:leading-[0.98] lg:text-[5.5rem]">
              <RevealWords text="Explore freely." />
              <motion.span
                variants={rise}
                className="mt-1 block bg-gradient-to-r from-[#C8C2FF] to-[#FFB3C4] bg-clip-text text-transparent"
              >
                Plan with flow.
              </motion.span>
            </h1>

            <motion.p
              variants={rise}
              className="mt-6 max-w-xl text-pretty text-base leading-8 text-white/85 sm:text-lg"
            >
              Wayflo turns real destinations, trip windows, budgets, and preferences into saved
              itineraries that feel calm, clear, and ready when travel gets real.
            </motion.p>

            <motion.div variants={rise} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="w-full sm:w-auto">
                <Link
                  href="#waitlist"
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#6C63FF] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(108,99,255,0.45)] transition hover:bg-[#5a52d5]"
                >
                  {/* Signup disabled during waitlist phase — was "Start planning free" → /signup */}
                  Join the waiting list
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </motion.div>
              <Link
                href="/how-it-works"
                className="inline-flex w-full items-center justify-center rounded-xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20 sm:w-auto"
              >
                See how it works
              </Link>
            </motion.div>
          </motion.div>

          {/* Animated itinerary mockup — desktop only so the mobile hero stays light. */}
          <div className="hidden lg:block">
            <HeroMockup />
          </div>
        </motion.div>
      </section>

      {/* ── Stats band ─────────────────────────────────────── */}
      <section className="px-4 sm:px-6">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="mx-auto -mt-12 grid max-w-5xl gap-4 rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_24px_70px_rgba(63,61,86,0.12)] backdrop-blur sm:grid-cols-3 sm:p-8"
        >
          {stats.map(s => (
            <motion.div key={s.label} variants={rise} className="text-center sm:text-left">
              <div className="font-display text-4xl font-light tracking-[-0.02em] text-[#6C63FF] sm:text-5xl">
                <Counter to={s.to} suffix={s.suffix} />
              </div>
              <p className="mt-1.5 text-sm leading-6 text-[#6F6C82]">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Explore: editorial index of the sub-pages ──────── */}
      <section className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
          >
            <div className="max-w-xl">
              <motion.div variants={rise} className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#FF6584]">
                The index
              </motion.div>
              <motion.h2 variants={rise} className="mt-3 font-display text-3xl font-light tracking-[-0.02em] text-[#3F3D56] sm:text-5xl">
                Three reads on how Wayflo works.
              </motion.h2>
            </div>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            className="grid gap-4 lg:grid-cols-3"
          >
            {explore.map(item => {
              const Icon = item.icon;
              return (
                <motion.div key={item.index} variants={rise}>
                  <Link href={item.href} className="group block h-full">
                    <TiltCard className="flex h-full flex-col rounded-[28px] border border-white/80 bg-white p-7 shadow-[0_16px_48px_rgba(63,61,86,0.07)] transition group-hover:shadow-[0_24px_60px_rgba(63,61,86,0.12)]">
                      <div className="flex items-start justify-between">
                        <span className="font-display text-3xl font-light text-[#6C63FF]/30">{item.index}</span>
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EEEDFE] text-[#6C63FF] transition group-hover:bg-[#6C63FF] group-hover:text-white">
                          <Icon className="h-5 w-5" />
                        </span>
                      </div>
                      <h3 className="mt-8 text-xl font-medium tracking-[-0.02em] text-[#3F3D56]">{item.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-[#6F6C82]">{item.body}</p>
                      <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#6C63FF]">
                        Read more
                        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </span>
                    </TiltCard>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Waitlist ───────────────────────────────────────── */}
      <section id="waitlist" className="scroll-mt-24 px-4 pb-16 pt-2 sm:px-6 sm:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: EASE }}
          className="mx-auto max-w-6xl overflow-hidden rounded-[34px] border border-[#D8D4F2] bg-[linear-gradient(135deg,#EEEDFE_0%,#FFFFFF_52%,#FFE9EF_100%)] p-7 shadow-[0_24px_80px_rgba(108,99,255,0.12)] sm:p-12"
        >
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#FF6584]">
                Coming soon
              </div>
              <h2 className="mt-3 font-display text-3xl font-light tracking-[-0.02em] text-[#3F3D56] sm:text-5xl">
                Join the Wayflo waiting list.
              </h2>
              <p className="mt-3 max-w-xl text-base leading-8 text-[#6F6C82]">
                We&apos;re putting the finishing touches on the new flow. Drop your email and we&apos;ll
                let you know the moment you can start planning.
              </p>
            </div>

            <div className="w-full max-w-md">
              {waitlistSubmitted ? (
                <div className="flex items-center gap-3 rounded-xl border border-[#6C63FF]/25 bg-white px-5 py-4 text-sm font-semibold text-[#3F3D56]">
                  <Sparkles className="h-5 w-5 shrink-0 text-[#6C63FF]" />
                  You&apos;re on the list — we&apos;ll be in touch soon.
                </div>
              ) : (
                <form onSubmit={handleWaitlistSubmit} className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="email"
                    required
                    value={waitlistEmail}
                    onChange={(e) => {
                      setWaitlistEmail(e.target.value);
                      if (waitlistError) setWaitlistError(null);
                    }}
                    placeholder="you@email.com"
                    aria-label="Email address"
                    disabled={waitlistSubmitting}
                    className="w-full rounded-xl border border-[#D8D4F2] bg-white px-4 py-3.5 text-sm text-[#3F3D56] outline-none transition focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20 disabled:opacity-60"
                  />
                  <motion.button
                    type="submit"
                    disabled={waitlistSubmitting}
                    whileHover={{ scale: waitlistSubmitting ? 1 : 1.04 }}
                    whileTap={{ scale: waitlistSubmitting ? 1 : 0.96 }}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#FF6584] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(255,101,132,0.28)] disabled:opacity-70"
                  >
                    {waitlistSubmitting ? 'Joining…' : 'Join waiting list'}
                    {!waitlistSubmitting && <ArrowRight className="h-4 w-4" />}
                  </motion.button>
                </form>
              )}

              {waitlistError && !waitlistSubmitted && (
                <p className="mt-3 text-sm font-medium text-[#FF6584]">{waitlistError}</p>
              )}

              {/* Auth CTAs disabled during waitlist phase — restore when launching.
              <Link href="/signup">Plan a trip</Link>
              <Link href="/dashboard">Open dashboard</Link>
              */}
            </div>
          </div>
        </motion.div>
      </section>

      <Footer />
    </main>
  );
}
