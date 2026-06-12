'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useRef, type ReactNode } from 'react';
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronRight, Scale, Sparkles } from 'lucide-react';
import { Brand } from './Brand';
import { Footer } from './Footer';

interface LegalSection {
  title: string;
  body: string[];
}

interface LegalPageShellProps {
  eyebrow: string;
  title: string;
  intro: string;
  effectiveDate: string;
  sections: LegalSection[];
  children?: ReactNode;
}

export function LegalPageShell({
  eyebrow,
  title,
  intro,
  effectiveDate,
  sections,
  children,
}: LegalPageShellProps) {
  const [activeSection, setActiveSection] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  const quickLinks = useMemo(
    () => sections.map((section, index) => ({ ...section, id: `section-${index}`, index })),
    [sections]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-index'));
            setActiveSection(index);
          }
        });
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );

    sections.forEach((_, i) => {
      const el = document.getElementById(`section-${i}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  const handleScroll = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <main className="min-h-screen bg-[#FDFDFD] text-[#3a2540] selection:bg-[#ea580c] selection:text-white">
      {/* Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#ea580c] to-[#f43f5e] origin-left z-50 rounded-r-full"
        style={{ scaleX: smoothProgress }}
      />

      <header className="fixed top-0 w-full z-40 px-4 py-4 sm:px-8 pointer-events-none">
        <div className="mx-auto flex max-w-7xl items-center justify-between pointer-events-auto">
          <div className="rounded-full bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-5 py-3">
             <Brand href="/" className="shrink-0" compact />
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-5 py-3 text-sm font-semibold text-[#5b4a55] transition hover:text-[#ea580c]"
            >
              Log in
            </Link>
          </div>
        </div>
      </header>

      <div ref={containerRef} className="mx-auto max-w-7xl px-4 sm:px-8 pt-32 lg:pt-48 flex flex-col lg:flex-row gap-12 lg:gap-24 relative">
        
        {/* Left Sticky Sidebar */}
        <aside className="lg:w-1/3 lg:sticky lg:top-48 shrink-0 h-fit">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-[#fbf1e6] border border-[#ea580c]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-[#ea580c]">
              <Sparkles className="h-3.5 w-3.5" />
              {eyebrow}
            </div>
            
            <h1 className="mt-6 text-5xl lg:text-7xl font-semibold tracking-[-0.04em] text-[#1b1220] leading-[0.9]">
              {title}
            </h1>
            
            <p className="mt-6 text-base lg:text-lg leading-relaxed text-[#7c6a72] max-w-sm">
              {intro}
            </p>

            <div className="mt-8 pt-8 border-t border-[#f0e2d0]/50 max-w-sm">
               <span className="text-xs font-bold uppercase tracking-widest text-[#A5A2B8] block mb-4">On this page</span>
               <nav className="flex flex-col gap-1">
                 {quickLinks.map((link) => (
                   <button
                     key={link.id}
                     onClick={() => handleScroll(link.id)}
                     className={`group relative flex items-center justify-between w-full text-left px-4 py-3 rounded-2xl transition-all duration-300 ${
                       activeSection === link.index 
                         ? 'bg-[#ea580c] text-white shadow-lg shadow-[#ea580c]/25' 
                         : 'text-[#7c6a72] hover:bg-[#fffbf4] hover:text-[#1b1220]'
                     }`}
                   >
                     <span className={`text-sm font-medium ${activeSection === link.index ? 'font-semibold' : ''}`}>
                       {link.title}
                     </span>
                     {activeSection === link.index && (
                       <motion.div layoutId="active-indicator" className="bg-white/20 rounded-full p-1">
                         <ArrowRight className="w-3.5 h-3.5 text-white" />
                       </motion.div>
                     )}
                   </button>
                 ))}
               </nav>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <div className="h-px bg-[#f0e2d0] flex-1" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#A5A2B8]">Updated {effectiveDate}</span>
            </div>

            {children && (
              <div className="mt-8">
                {children}
              </div>
            )}
          </motion.div>
        </aside>

        {/* Right Content Area */}
        <div className="lg:w-2/3 max-w-3xl pb-32">
          {sections.map((section, index) => (
            <motion.section
              key={index}
              id={`section-${index}`}
              data-index={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="scroll-mt-48 mb-20 relative group"
            >
              <div className="absolute -inset-x-8 -inset-y-8 bg-white rounded-3xl opacity-0 group-hover:opacity-100 group-hover:shadow-[0_40px_100px_rgba(234,88,12,0.06)] transition-all duration-700 pointer-events-none -z-10" />
              
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-[#fffbf4] to-[#ffedd5] border border-[#ea580c]/10 text-[#ea580c] font-semibold text-lg shadow-sm">
                  {index + 1}
                </div>
                <h2 className="text-3xl font-semibold tracking-tight text-[#1b1220]">
                  {section.title}
                </h2>
              </div>
              
              <div className="space-y-6 text-[#5b4a55] text-lg leading-[1.8] pl-0 sm:pl-16">
                {section.body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </motion.section>
          ))}
        </div>
      </div>

      <Footer />
    </main>
  );
}