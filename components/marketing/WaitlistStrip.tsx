'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { EASE } from '@/components/common/motion';

/** Compact end-of-page CTA that routes back to the home waitlist section. */
export function WaitlistStrip({
  title = 'Be first through the door.',
  body = 'Wayflo is in pre-launch. Join the waiting list and we’ll let you know the moment it opens.',
}: {
  title?: string;
  body?: string;
}) {
  return (
    <section className="px-4 pb-16 pt-6 sm:px-6 sm:pb-24">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.7, ease: EASE }}
        className="mx-auto flex max-w-6xl flex-col gap-6 overflow-hidden rounded-[34px] border border-[#D8D4F2] bg-[linear-gradient(135deg,#EEEDFE_0%,#FFFFFF_52%,#FFE9EF_100%)] p-7 shadow-[0_24px_80px_rgba(108,99,255,0.12)] sm:p-10 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="max-w-xl">
          <h2 className="font-display text-3xl font-light tracking-[-0.02em] text-[#3F3D56] sm:text-4xl">{title}</h2>
          <p className="mt-3 text-base leading-7 text-[#6F6C82]">{body}</p>
        </div>
        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="shrink-0">
          <Link
            href="/#waitlist"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6C63FF] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(108,99,255,0.32)]"
          >
            Join the waiting list
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
