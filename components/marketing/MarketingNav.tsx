'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { EASE } from '@/components/common/motion';
import { Brand } from '@/components/common/Brand';

const navLinks = [
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Why Wayflo', href: '/why-wayflo' },
  { label: 'Community', href: '/community' },
];

export function MarketingNav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const solidBar = isScrolled || menuOpen;

  return (
    <motion.nav
      initial={{ y: -28, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: EASE }}
      className={`fixed top-0 z-50 w-full transition-colors duration-300 ${
        solidBar
          ? 'border-b border-[#DDDCE8] bg-[rgba(247,246,255,0.9)] py-3 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent py-4 sm:py-5'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="sm:hidden">
          <Brand href="/" compact showWordmark={false} className="shrink-0" />
        </div>
        <div className="hidden sm:block">
          <Brand href="/" className="shrink-0" />
        </div>

        {/* Desktop link pill */}
        <div className="hidden items-center gap-1 rounded-full border border-[#E4E2F0] bg-white/70 px-1.5 py-1.5 backdrop-blur md:flex">
          {navLinks.map(link => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-[#EEEDFE] text-[#6C63FF]'
                    : 'text-[#53506A] hover:bg-[#EEEDFE] hover:text-[#6C63FF]'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Auth disabled during pre-launch waitlist phase — restore when launching.
          <Link href="/login" className="...">Log in</Link>
          */}
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="hidden sm:block">
            <Link
              href="/#waitlist"
              className="block rounded-xl bg-[#6C63FF] px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(108,99,255,0.28)] transition hover:bg-[#5a52d5]"
            >
              Join waiting list
            </Link>
          </motion.div>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen(v => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className={`flex h-11 w-11 items-center justify-center rounded-xl border transition md:hidden ${
              solidBar
                ? 'border-[#E4E2F0] bg-white text-[#3F3D56]'
                : 'border-white/30 bg-white/15 text-white backdrop-blur-md'
            }`}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="overflow-hidden md:hidden"
          >
            <div className="mx-4 mt-3 flex flex-col gap-1 rounded-2xl border border-[#E4E2F0] bg-white p-2 shadow-[0_24px_60px_rgba(63,61,86,0.16)]">
              {navLinks.map(link => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    className={`rounded-xl px-4 py-3 text-[15px] font-medium transition ${
                      isActive ? 'bg-[#EEEDFE] text-[#6C63FF]' : 'text-[#3F3D56] hover:bg-[#F5F4FB]'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <Link
                href="/#waitlist"
                className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#6C63FF] px-4 py-3 text-[15px] font-semibold text-white shadow-[0_14px_30px_rgba(108,99,255,0.28)]"
              >
                Join waiting list
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
