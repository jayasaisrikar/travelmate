'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import {
  Counter,
  EASE,
  ParallaxImage,
  RevealWords,
  ScrollProgressBar,
  TiltCard,
  rise,
  stagger,
} from '@/components/common/motion';
import {
  ArrowRight,
  CalendarRange,
  Compass,
  Map,
  MapPinned,
  Route,
  Shield,
  Sparkles,
  Users,
  Wallet,
  Waves,
} from 'lucide-react';
import { Brand } from '@/components/common/Brand';
import { Footer } from '@/components/common/Footer';

const IMG = {
  hero: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&q=80&w=1920',
  coast:
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200',
  road: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&q=80&w=1200',
  community:
    'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&q=80&w=1200',
};

const navLinks = [
  { label: 'How it works', href: '#how' },
  { label: 'Why Wayflo', href: '#why' },
  { label: 'Community', href: '#community' },
];

const stats = [
  { to: 120, suffix: '+', label: 'destinations searchable live' },
  { to: 6, suffix: '', label: 'travelers per shared trip room' },
  { to: 100, suffix: '%', label: 'plans saved for offline reuse' },
];

const bentoSignals = [
  { label: 'Destination', value: 'Search a live place, not a template city.', icon: MapPinned, tone: 'primary' as const },
  { label: 'Trip window', value: 'Lock arrival and departure so the plan fits your schedule.', icon: CalendarRange, tone: 'coral' as const },
  { label: 'Budget', value: 'Shape the route around what you actually want to spend.', icon: Wallet, tone: 'primary' as const },
  { label: 'Pace', value: 'Keep days balanced instead of overloaded.', icon: Waves, tone: 'coral' as const },
];

const steps = [
  { title: 'Pick the real destination', body: 'Search a live place you actually want to go — Wayflo anchors everything to it.', icon: Compass },
  { title: 'Set your travel window', body: 'Arrival, departure, and stay context stay visible from the very first input.', icon: CalendarRange },
  { title: 'Get a route you can reuse', body: 'The itinerary forms around your pace and budget, then saves for later — phone included.', icon: Route },
];

const values = [
  { title: 'Real route inputs', body: 'Search a live destination, then anchor the trip around the dates and rhythm that matter.', icon: Map },
  { title: 'Smarter timing', body: 'Arrival windows, departures, and daily flow stay in sync from the start.', icon: Waves },
  { title: 'Saved momentum', body: 'Itinerary, map view, and notes stay together so a plan survives after you close the tab.', icon: Sparkles },
];

const socialFeatures = [
  { icon: Users, label: 'Wave to connect', body: 'Anonymous one-tap interest — only visible if both sides wave back.' },
  { icon: Map, label: 'Trip rooms', body: 'A shared planning space for up to 6 travelers heading the same way.' },
  { icon: Shield, label: 'Privacy first', body: 'Nothing is public until you opt in. Exact dates are never shared.' },
];

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const reduceMotion = useReducedMotion();

  // Hero parallax
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroP } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroBgY = useTransform(heroP, [0, 1], reduceMotion ? ['0%', '0%'] : ['0%', '32%']);
  const heroBgScale = useTransform(heroP, [0, 1], reduceMotion ? [1, 1] : [1.05, 1.18]);
  const heroContentY = useTransform(heroP, [0, 1], reduceMotion ? [0, 0] : [0, 110]);
  const heroContentOpacity = useTransform(heroP, [0, 0.85], [1, 0]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <main className="min-h-dvh overflow-x-hidden text-[#3F3D56]">
      <ScrollProgressBar />

      {/* ── Navigation ─────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -28, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE }}
        className={`fixed top-0 z-50 w-full transition-colors duration-300 ${
          isScrolled
            ? 'border-b border-[#DDDCE8] bg-[rgba(247,246,255,0.82)] py-3 backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent py-5'
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="sm:hidden">
            <Brand href="/" compact showWordmark={false} className="shrink-0" />
          </div>
          <div className="hidden sm:block">
            <Brand href="/" className="shrink-0" />
          </div>

          <div className="hidden items-center gap-1 rounded-full border border-[#E4E2F0] bg-white/70 px-1.5 py-1.5 backdrop-blur md:flex">
            {navLinks.map(link => (
              <Link
                key={link.label}
                href={link.href}
                className="rounded-full px-4 py-1.5 text-sm font-medium text-[#53506A] transition hover:bg-[#EEEDFE] hover:text-[#6C63FF]"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-[#6C63FF]/25 bg-white/80 px-3 py-2 text-[13px] font-semibold text-[#6C63FF] transition hover:bg-white sm:px-4 sm:text-sm"
            >
              Log in
            </Link>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              <Link
                href="/signup"
                className="block rounded-xl bg-[#6C63FF] px-3 py-2 text-[13px] font-semibold text-white shadow-[0_14px_30px_rgba(108,99,255,0.28)] transition hover:bg-[#5a52d5] sm:px-4 sm:text-sm"
              >
                Explore now
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.nav>

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
          className="relative mx-auto flex min-h-[94vh] max-w-6xl flex-col items-center justify-center px-4 pb-24 pt-32 text-center sm:px-6"
        >
          <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-3xl">
            <motion.div
              variants={rise}
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white backdrop-blur-md"
            >
              <Compass className="h-3.5 w-3.5" />
              travel. flow. freedom.
            </motion.div>

            <h1 className="mt-6 text-balance text-5xl font-medium leading-[0.95] tracking-[-0.05em] text-white drop-shadow-[0_8px_30px_rgba(0,0,0,0.35)] sm:text-6xl lg:text-7xl">
              <RevealWords text="Explore freely." />
              <span className="mt-1 block bg-gradient-to-r from-[#C8C2FF] to-[#FFB3C4] bg-clip-text text-transparent">
                <RevealWords text="Plan with more flow." />
              </span>
            </h1>

            <motion.p
              variants={rise}
              className="mx-auto mt-6 max-w-xl text-pretty text-base leading-8 text-white/85 sm:text-lg"
            >
              Wayflo turns real destinations, trip windows, budgets, and preferences into saved
              itineraries that feel calm, clear, and ready when travel gets real.
            </motion.p>

            <motion.div variants={rise} className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="w-full sm:w-auto">
                <Link
                  href="/signup"
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#6C63FF] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(108,99,255,0.45)] transition hover:bg-[#5a52d5]"
                >
                  Start planning free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </motion.div>
              <Link
                href="#how"
                className="inline-flex w-full items-center justify-center rounded-xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20 sm:w-auto"
              >
                See how it works
              </Link>
            </motion.div>
          </motion.div>

          {/* Scroll cue */}
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 sm:block"
          >
            <div className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-white/50 p-1.5">
              <motion.span
                animate={reduceMotion ? undefined : { y: [0, 8, 0], opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                className="h-1.5 w-1.5 rounded-full bg-white"
              />
            </div>
          </motion.div>
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
              <div className="bg-gradient-to-r from-[#6C63FF] to-[#FF6584] bg-clip-text text-4xl font-semibold tracking-[-0.04em] text-transparent sm:text-5xl">
                <Counter to={s.to} suffix={s.suffix} />
              </div>
              <p className="mt-1.5 text-sm leading-6 text-[#6F6C82]">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Bento: what Wayflo keeps in sync ───────────────── */}
      <section className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="mb-8 max-w-2xl"
          >
            <motion.div variants={rise} className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7E7A92]">
              Trip flow
            </motion.div>
            <motion.h2 variants={rise} className="mt-2 text-3xl font-medium tracking-[-0.04em] text-[#3F3D56] sm:text-4xl">
              Everything that makes a route trustworthy, in one place.
            </motion.h2>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            className="grid gap-4 lg:grid-cols-3"
          >
            <motion.div variants={rise} className="relative overflow-hidden rounded-[30px] border border-[#4D4970] shadow-[0_24px_70px_rgba(63,61,86,0.2)] lg:row-span-2">
              <ParallaxImage
                src={IMG.coast}
                alt="Aerial coastline view of a travel destination"
                className="absolute inset-0 h-full w-full"
                range={70}
                float
                overlay={<div className="absolute inset-0 bg-gradient-to-t from-[#1A1726]/92 via-[#1A1726]/55 to-[#1A1726]/20" />}
              />
              <div className="relative flex h-full min-h-[420px] flex-col justify-end p-6 text-white sm:p-7">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-[#6C63FF]" />
                  <span className="h-3 w-3 rounded-full bg-[#FF6584]" />
                  <span className="h-3 w-3 rounded-full bg-white/60" />
                </div>
                <h3 className="mt-5 text-2xl font-medium tracking-[-0.03em] sm:text-3xl">
                  The itinerary stays tied to your real timing.
                </h3>
                <p className="mt-3 text-sm leading-7 text-white/75">
                  That&apos;s why the whole route feels usable instead of over-promised — every day
                  reflects when you actually arrive, stay, and leave.
                </p>
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="mt-6 w-fit">
                  <Link href="/signup" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#3F3D56]">
                    Build your first route
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </motion.div>
              </div>
            </motion.div>

            {bentoSignals.map(item => {
              const Icon = item.icon;
              const isPrimary = item.tone === 'primary';
              return (
                <motion.div key={item.label} variants={rise}>
                  <TiltCard className="h-full rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_16px_48px_rgba(63,61,86,0.07)]">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-2xl text-white"
                      style={{ background: isPrimary ? 'linear-gradient(180deg,#6C63FF,#847DFF)' : 'linear-gradient(180deg,#FF6584,#FF8AA2)' }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7E7A92]">{item.label}</div>
                    <p className="mt-1.5 text-base font-medium leading-7 text-[#3F3D56]">{item.value}</p>
                  </TiltCard>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── How it works (stepper + parallax image) ────────── */}
      <section id="how" className="scroll-mt-24 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_0.85fr] lg:items-center">
          <div>
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
              className="mb-10 max-w-xl"
            >
              <motion.div variants={rise} className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7E7A92]">
                How it works
              </motion.div>
              <motion.h2 variants={rise} className="mt-2 text-3xl font-medium tracking-[-0.04em] text-[#3F3D56] sm:text-4xl">
                From idea to route without breaking momentum.
              </motion.h2>
            </motion.div>

            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-60px' }}
              className="relative space-y-6"
            >
              <motion.div
                aria-hidden
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: EASE }}
                className="absolute bottom-4 left-7 top-4 w-px origin-top bg-gradient-to-b from-[#6C63FF]/40 via-[#FF6584]/30 to-transparent"
              />
              {steps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <motion.div key={step.title} variants={rise} className="relative flex gap-5">
                    <motion.div
                      whileHover={{ scale: 1.08, rotate: -4 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                      className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white bg-white text-[#6C63FF] shadow-[0_14px_30px_rgba(108,99,255,0.16)]"
                    >
                      <Icon className="h-6 w-6" />
                    </motion.div>
                    <div className="pt-1">
                      <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FF6584]">
                        Step {i + 1}
                      </div>
                      <h3 className="mt-1.5 text-xl font-medium tracking-[-0.03em] text-[#3F3D56]">{step.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-[#6F6C82]">{step.body}</p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.92, rotate: -1.5 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <ParallaxImage
              src={IMG.road}
              alt="Open road winding through a scenic landscape"
              className="aspect-[4/5] rounded-[30px] border border-white/70 shadow-[0_30px_80px_rgba(63,61,86,0.18)]"
              range={90}
              float
              overlay={<div className="absolute inset-0 bg-gradient-to-t from-[#3F3D56]/30 to-transparent" />}
            />
          </motion.div>
        </div>
      </section>

      {/* ── Value props ────────────────────────────────────── */}
      <section id="why" className="scroll-mt-24 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="mb-8 max-w-2xl"
          >
            <motion.div variants={rise} className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7E7A92]">
              Why wayflo
            </motion.div>
            <motion.h2 variants={rise} className="mt-2 text-3xl font-medium tracking-[-0.04em] text-[#3F3D56] sm:text-4xl">
              The route, the timing, and the mood stay connected.
            </motion.h2>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            className="grid gap-4 lg:grid-cols-3"
          >
            {values.map(item => {
              const Icon = item.icon;
              return (
                <motion.div key={item.title} variants={rise}>
                  <TiltCard className="group h-full rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_16px_48px_rgba(63,61,86,0.07)]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEEDFE] text-[#6C63FF] transition group-hover:bg-[#6C63FF] group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-xl font-medium tracking-[-0.03em] text-[#3F3D56]">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#6F6C82]">{item.body}</p>
                  </TiltCard>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Community / Social ─────────────────────────────── */}
      <section id="community" className="scroll-mt-24 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: EASE }}
            className="overflow-hidden rounded-[34px] border border-[#D8D4F2] bg-[#3F3D56] shadow-[0_24px_80px_rgba(63,61,86,0.18)]"
          >
            <div className="grid lg:grid-cols-2">
              <motion.div
                variants={stagger}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-60px' }}
                className="space-y-5 p-6 sm:p-9"
              >
                <motion.div variants={rise} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">
                  <Users className="h-3.5 w-3.5" />
                  New — Wayflo Social
                </motion.div>
                <motion.h2 variants={rise} className="text-3xl font-medium tracking-[-0.04em] text-white sm:text-4xl">
                  Find travelers heading
                  <span className="block text-[#A89CFF]">to the same place.</span>
                </motion.h2>
                <motion.p variants={rise} className="text-sm leading-7 text-white/70">
                  See who else is planning a trip to your destination. Wave to connect, join a trip
                  room, and plan the route together — or just share notes.
                </motion.p>

                <div className="space-y-3 pt-1">
                  {socialFeatures.map(item => {
                    const Icon = item.icon;
                    return (
                      <motion.div
                        key={item.label}
                        variants={rise}
                        whileHover={{ x: 6 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 hover:bg-white/10"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#A89CFF]">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">{item.label}</p>
                          <p className="mt-0.5 text-sm leading-6 text-white/60">{item.body}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                <motion.div variants={rise} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-fit">
                  <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6C63FF] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(108,99,255,0.35)]">
                    Join the community
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </motion.div>
              </motion.div>

              <ParallaxImage
                src={IMG.community}
                alt="Travelers exploring together"
                className="min-h-[320px] lg:min-h-full"
                range={70}
                float
                overlay={<div className="absolute inset-0 bg-gradient-to-t from-[#3F3D56]/60 via-transparent to-[#3F3D56]/20 lg:bg-gradient-to-r lg:from-[#3F3D56]/70 lg:to-transparent" />}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────── */}
      <section className="px-4 pb-14 pt-6 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: EASE }}
          className="mx-auto max-w-6xl overflow-hidden rounded-[34px] border border-[#D8D4F2] bg-[linear-gradient(135deg,#EEEDFE_0%,#FFFFFF_52%,#FFE9EF_100%)] p-7 shadow-[0_24px_80px_rgba(108,99,255,0.12)] sm:p-10"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7E7A92]">Ready to move</div>
              <h2 className="mt-2 text-3xl font-medium tracking-[-0.04em] text-[#3F3D56] sm:text-4xl">
                Start planning in the new Wayflo flow.
              </h2>
              <p className="mt-3 text-base leading-7 text-[#6F6C82]">
                Create an account, save your itinerary, and keep the route flowing from research to
                the trip itself.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF6584] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(255,101,132,0.28)]">
                  Plan a trip
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
              <Link href="/dashboard" className="inline-flex items-center justify-center rounded-xl border border-[#6C63FF]/25 bg-white px-6 py-3.5 text-sm font-semibold text-[#6C63FF] transition hover:bg-[#EEEDFE]/60">
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
