'use client';

import { motion } from 'framer-motion';
import { Map, Shield, Users } from 'lucide-react';
import { EASE, ParallaxImage, rise, stagger } from '@/components/common/motion';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { SubPageHero } from '@/components/marketing/SubPageHero';
import { WaitlistStrip } from '@/components/marketing/WaitlistStrip';
import { Footer } from '@/components/common/Footer';

const COMMUNITY_IMG =
  'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&q=80&w=1200';

const socialFeatures = [
  { icon: Users, label: 'Wave to connect', body: 'Anonymous one-tap interest — only visible if both sides wave back.' },
  { icon: Map, label: 'Trip rooms', body: 'A shared planning space for up to 6 travelers heading the same way.' },
  { icon: Shield, label: 'Privacy first', body: 'Nothing is public until you opt in. Exact dates are never shared.' },
];

export default function Community() {
  return (
    <main className="min-h-dvh overflow-x-hidden text-[#3F3D56]">
      <MarketingNav />

      <SubPageHero
        index="03"
        eyebrow="Community"
        title="Find travelers heading to the same place."
        lede="See who else is planning a trip to your destination. Wave to connect, join a trip room, and plan the route together — or just share notes. Private by default."
      />

      {/* ── Feature panel with image ───────────────────────── */}
      <section className="px-4 py-8 sm:px-6 sm:py-12">
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
                className="space-y-5 p-6 sm:p-10"
              >
                <motion.div variants={rise} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">
                  <Users className="h-3.5 w-3.5" />
                  New — Wayflo Social
                </motion.div>
                <motion.h2 variants={rise} className="font-display text-3xl font-light leading-[1.05] tracking-[-0.02em] text-white sm:text-4xl">
                  Plan together, not alone.
                </motion.h2>

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
              </motion.div>

              <ParallaxImage
                src={COMMUNITY_IMG}
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

      <WaitlistStrip
        title="Travel’s better with company."
        body="Join the waiting list to get early access to trip rooms and destination matches when Wayflo Social opens."
      />
      <Footer />
    </main>
  );
}
