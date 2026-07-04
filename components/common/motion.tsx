'use client';

import {
  animate,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from 'framer-motion';
import Image from 'next/image';
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

/** Shared easing + entrance variants used across Wayflo's animated surfaces. */
export const EASE = [0.22, 1, 0.36, 1] as const;

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export const rise: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const wordVariant: Variants = {
  hidden: { y: '110%', opacity: 0, filter: 'blur(8px)' },
  show: { y: '0%', opacity: 1, filter: 'blur(0px)', transition: { duration: 0.7, ease: EASE } },
};

/** Convenience props to drop a staggered reveal onto any container. */
export const revealOnView = {
  variants: stagger,
  initial: 'hidden' as const,
  whileInView: 'show' as const,
  viewport: { once: true, margin: '-60px' },
};

/** Word-by-word masked headline reveal. Falls back to plain text under reduced motion. */
export function RevealWords({ text, className }: { text: string; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <span className={className}>{text}</span>;

  const words = text.split(' ');
  return (
    <motion.span variants={stagger} className={className}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="inline-block overflow-hidden align-bottom">
          <motion.span variants={wordVariant} className="inline-block">
            {word}
            {i < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}

/** Count-up number that animates when scrolled into view. */
export function Counter({
  to,
  suffix = '',
  prefix = '',
  className,
}: {
  to: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduce = useReducedMotion();
  const [val, setVal] = useState(reduce ? to : 0);

  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(0, to, {
      duration: 1.5,
      ease: 'easeOut',
      onUpdate: v => setVal(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, to, reduce]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {val.toLocaleString()}
      {suffix}
    </span>
  );
}

/** Pointer-tracking 3D tilt card with a glare highlight that follows the cursor. */
export function TiltCard({
  children,
  className,
  glare = 'rgba(108,99,255,0.16)',
}: {
  children: ReactNode;
  className?: string;
  glare?: string;
}) {
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [6, -6]), { stiffness: 150, damping: 16 });
  const rotateY = useSpring(useTransform(px, [0, 1], [-6, 6]), { stiffness: 150, damping: 16 });
  const glareX = useTransform(px, [0, 1], ['0%', '100%']);
  const glareY = useTransform(py, [0, 1], ['0%', '100%']);
  const glareBg = useMotionTemplate`radial-gradient(420px circle at ${glareX} ${glareY}, ${glare}, transparent 60%)`;

  if (reduce) return <div className={className}>{children}</div>;

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => {
    px.set(0.5);
    py.set(0.5);
  };

  return (
    <motion.div
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ rotateX, rotateY, transformPerspective: 900, transformStyle: 'preserve-3d' }}
      className={`relative ${className ?? ''}`}
    >
      {children}
      <motion.div style={{ background: glareBg }} className="pointer-events-none absolute inset-0 rounded-[inherit]" />
    </motion.div>
  );
}

/** Scroll-linked parallax image inside an overflow-hidden frame. */
export function ParallaxImage({
  src,
  alt,
  className,
  range = 80,
  float = false,
  priority = false,
  overlay,
}: {
  src: string;
  alt: string;
  className?: string;
  range?: number;
  float?: boolean;
  priority?: boolean;
  overlay?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-range, range]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className ?? ''}`}>
      <motion.div style={{ y }} className="absolute -inset-y-[18%] inset-x-0">
        <motion.div
          animate={reduce || !float ? undefined : { scale: [1, 1.06, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          className="h-full w-full"
        >
          <Image src={src} alt={alt} fill priority={priority} sizes="100vw" className="object-cover" />
        </motion.div>
      </motion.div>
      {overlay}
    </div>
  );
}

/** Top-of-page scroll progress bar. */
export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });
  return (
    <motion.div
      style={{ scaleX }}
      className="fixed left-0 top-0 z-[60] h-[3px] w-full origin-left bg-gradient-to-r from-[#6C63FF] via-[#9d8bff] to-[#FF6584]"
    />
  );
}

/** A parallax layer that drifts a non-image child as you scroll (e.g. a destination cover). */
export function ParallaxLayer({
  children,
  range = 60,
  className,
}: {
  children: ReactNode;
  range?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-range, range]);
  return (
    <div ref={ref} className={`relative overflow-hidden ${className ?? ''}`}>
      <motion.div style={{ y }} className="absolute -inset-y-[15%] inset-x-0">
        {children}
      </motion.div>
    </div>
  );
}
