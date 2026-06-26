'use client';

import { motion } from 'framer-motion';
import { Map, Sparkles, Waves } from 'lucide-react';
import { ParallaxImage, TiltCard, rise, stagger } from '@/components/common/motion';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { SubPageHero } from '@/components/marketing/SubPageHero';
import { WaitlistStrip } from '@/components/marketing/WaitlistStrip';
import { Footer } from '@/components/common/Footer';

const COAST_IMG =
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200';

const values = [
  { title: 'Real route inputs', body: 'Search a live destination, then anchor the trip around the dates and rhythm that matter.', icon: Map },
  { title: 'Smarter timing', body: 'Arrival windows, departures, and daily flow stay in sync from the start.', icon: Waves },
  { title: 'Saved momentum', body: 'Itinerary, map view, and notes stay together so a plan survives after you close the tab.', icon: Sparkles },
];

export default function WhyWayflo() {
  return (
    <main className="min-h-dvh overflow-x-hidden text-[#3F3D56]">
      <MarketingNav />

      <SubPageHero
        index="02"
        eyebrow="Why Wayflo"
        title="The route, the timing, and the mood stay connected."
        lede="Most planners hand you a generic city template. Wayflo keeps every decision tied to your real trip — so the plan feels usable instead of over-promised."
      />

      {/* ── Editorial feature row: text + image ────────────── */}
      <section className="px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7 }}
            className="order-2 lg:order-1"
          >
            <ParallaxImage
              src={COAST_IMG}
              alt="Aerial coastline view of a travel destination"
              className="aspect-[5/4] rounded-[30px] border border-white/70 shadow-[0_30px_80px_rgba(63,61,86,0.18)]"
              range={80}
              float
              overlay={<div className="absolute inset-0 bg-gradient-to-t from-[#1A1726]/40 to-transparent" />}
            />
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            className="order-1 lg:order-2"
          >
            <motion.h2 variants={rise} className="font-display text-3xl font-light leading-[1.05] tracking-[-0.02em] text-[#3F3D56] sm:text-4xl">
              The itinerary stays tied to your real timing.
            </motion.h2>
            <motion.p variants={rise} className="mt-4 text-base leading-8 text-[#6F6C82]">
              Every day reflects when you actually arrive, stay, and leave. No filler stops, no
              afternoons that ignore your flight. The whole route feels usable because it was built
              from your constraints — not a template’s assumptions.
            </motion.p>
            <motion.div variants={rise} className="mt-6 flex flex-wrap gap-2">
              {['Arrival-aware days', 'Budget-shaped routes', 'Offline-ready'].map(tag => (
                <span key={tag} className="rounded-full border border-[#E4E2F0] bg-white px-4 py-2 text-sm font-medium text-[#53506A]">
                  {tag}
                </span>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Value props ────────────────────────────────────── */}
      <section className="px-4 py-12 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            className="grid gap-4 lg:grid-cols-3"
          >
            {values.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div key={item.title} variants={rise}>
                  <TiltCard className="group h-full rounded-[28px] border border-white/80 bg-white p-7 shadow-[0_16px_48px_rgba(63,61,86,0.07)]">
                    <div className="flex items-start justify-between">
                      <span className="font-display text-3xl font-light text-[#6C63FF]/30">0{i + 1}</span>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEEDFE] text-[#6C63FF] transition group-hover:bg-[#6C63FF] group-hover:text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <h3 className="mt-7 text-xl font-medium tracking-[-0.02em] text-[#3F3D56]">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#6F6C82]">{item.body}</p>
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
