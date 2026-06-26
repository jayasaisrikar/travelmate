'use client';

import { motion } from 'framer-motion';
import { rise, stagger } from '@/components/common/motion';

/**
 * Editorial sub-page hero: a numbered eyebrow, a serif display headline, and a
 * lede. The oversized index number + ruled line give the marketing pages a
 * magazine feel instead of the default centered-stack landing look.
 */
export function SubPageHero({
  index,
  eyebrow,
  title,
  lede,
}: {
  index: string;
  eyebrow: string;
  title: string;
  lede: string;
}) {
  return (
    <section className="px-4 pb-10 pt-28 sm:px-6 sm:pb-14 sm:pt-40">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[auto_1fr] lg:items-end lg:gap-12"
      >
        <motion.div
          variants={rise}
          className="font-display text-[64px] leading-none text-[#6C63FF]/25 sm:text-[110px]"
          aria-hidden
        >
          {index}
        </motion.div>

        <div>
          <motion.div
            variants={rise}
            className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#FF6584]"
          >
            {eyebrow}
          </motion.div>
          <motion.h1
            variants={rise}
            className="mt-3 max-w-3xl text-balance font-display text-4xl font-light leading-[1.02] tracking-[-0.02em] text-[#3F3D56] sm:text-6xl"
          >
            {title}
          </motion.h1>
          <motion.p
            variants={rise}
            className="mt-5 max-w-xl text-pretty text-base leading-8 text-[#6F6C82] sm:text-lg"
          >
            {lede}
          </motion.p>
        </div>
      </motion.div>
    </section>
  );
}
