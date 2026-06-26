'use client';

import { motion } from 'framer-motion';
import { CalendarRange, Compass, MapPinned, Route, Waves, Wallet } from 'lucide-react';
import { EASE, ParallaxImage, TiltCard, rise, stagger } from '@/components/common/motion';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { SubPageHero } from '@/components/marketing/SubPageHero';
import { WaitlistStrip } from '@/components/marketing/WaitlistStrip';
import { Footer } from '@/components/common/Footer';

const ROAD_IMG =
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&q=80&w=1200';

const steps = [
  { title: 'Pick the real destination', body: 'Search a live place you actually want to go — Wayflo anchors everything to it.', icon: Compass },
  { title: 'Set your travel window', body: 'Arrival, departure, and stay context stay visible from the very first input.', icon: CalendarRange },
  { title: 'Get a route you can reuse', body: 'The itinerary forms around your pace and budget, then saves for later — phone included.', icon: Route },
];

const signals = [
  { label: 'Destination', value: 'Search a live place, not a template city.', icon: MapPinned },
  { label: 'Trip window', value: 'Lock arrival and departure so the plan fits your schedule.', icon: CalendarRange },
  { label: 'Budget', value: 'Shape the route around what you actually want to spend.', icon: Wallet },
  { label: 'Pace', value: 'Keep days balanced instead of overloaded.', icon: Waves },
];

export default function HowItWorks() {
  return (
    <main className="min-h-dvh overflow-x-hidden text-[#3F3D56]">
      <MarketingNav />

      <SubPageHero
        index="01"
        eyebrow="How it works"
        title="From idea to route without breaking momentum."
        lede="Wayflo keeps your destination, dates, budget, and pace in one continuous flow — so the plan you get back reflects the trip you’re actually taking."
      />

      {/* ── Stepper + parallax image ───────────────────────── */}
      <section className="px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_0.85fr] lg:items-center">
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
                    <h3 className="mt-1.5 text-xl font-medium tracking-[-0.02em] text-[#3F3D56]">{step.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-[#6F6C82]">{step.body}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.92, rotate: -1.5 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <ParallaxImage
              src={ROAD_IMG}
              alt="Open road winding through a scenic landscape"
              className="aspect-[4/5] rounded-[30px] border border-white/70 shadow-[0_30px_80px_rgba(63,61,86,0.18)]"
              range={90}
              float
              overlay={<div className="absolute inset-0 bg-gradient-to-t from-[#3F3D56]/30 to-transparent" />}
            />
          </motion.div>
        </div>
      </section>

      {/* ── What stays in sync ─────────────────────────────── */}
      <section className="px-4 py-12 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <motion.h2
            variants={rise}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="mb-8 max-w-2xl font-display text-3xl font-light tracking-[-0.02em] text-[#3F3D56] sm:text-4xl"
          >
            Four inputs Wayflo keeps tied together.
          </motion.h2>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {signals.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div key={item.label} variants={rise}>
                  <TiltCard className="h-full rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_16px_48px_rgba(63,61,86,0.07)]">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-2xl font-light text-[#6C63FF]/30">0{i + 1}</span>
                      <span
                        className="flex h-11 w-11 items-center justify-center rounded-2xl text-white"
                        style={{ background: i % 2 === 0 ? 'linear-gradient(180deg,#6C63FF,#847DFF)' : 'linear-gradient(180deg,#FF6584,#FF8AA2)' }}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                    </div>
                    <div className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7E7A92]">{item.label}</div>
                    <p className="mt-1.5 text-base font-medium leading-7 text-[#3F3D56]">{item.value}</p>
                  </TiltCard>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      <WaitlistStrip />
      <Footer />
    </main>
  );
}
