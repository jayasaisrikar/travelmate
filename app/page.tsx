'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const fadeInUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.45 },
  viewport: { once: true, margin: '-40px' },
};

const tripInputs = [
  {
    title: 'Destination search',
    body: 'Pick a real place from live search results instead of choosing from a preset list.',
    color: '#5aa7e8',
  },
  {
    title: 'Trip window',
    body: 'Enter your arrival date and time, then your departure date and time so the itinerary fits the actual stay.',
    color: '#f6d23c',
  },
  {
    title: 'Pace and budget',
    body: 'Choose how relaxed or packed you want the trip to feel, plus the budget you want us to respect.',
    color: '#ff9a45',
  },
  {
    title: 'Interests',
    body: 'Tell us what you care about so the places and day plans feel personal instead of generic.',
    color: '#f8e7f1',
  },
];

const tripOutputs = [
  'A day-by-day itinerary that respects your actual hours',
  'Saved trips you can reopen from the dashboard',
  'A mobile-friendly trip page with a real assistant on top',
];

const trustPoints = [
  'No hidden sample data',
  'No assumed 9:00 AM start',
  'No fake destinations',
  'No placeholder trips',
];

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };

    window.addEventListener('scroll', onScroll);
    onScroll();

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fbfaf7] text-[#2e2833] selection:bg-[#5aa7e8]/20">
      <nav
        className={`fixed top-0 z-50 w-full transition-all duration-200 ${
          isScrolled ? 'border-b border-[#eadde5] bg-[#fffdf9] py-3 shadow-sm' : 'bg-transparent py-5'
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#5aa7e8] text-xs font-black text-white shadow-sm">
              TM
            </div>
            <span className="text-xl font-black tracking-tight">TravelMate</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#inputs" className="text-sm font-medium text-[#756978] transition hover:text-[#2e2833]">
              What you enter
            </a>
            <a href="#outputs" className="text-sm font-medium text-[#756978] transition hover:text-[#2e2833]">
              What you get
            </a>
            <a href="#why" className="text-sm font-medium text-[#756978] transition hover:text-[#2e2833]">
              Why it works
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-sm font-semibold text-[#756978] transition hover:text-[#2e2833] sm:block">
              Log in
            </Link>
            <Link
              href="/signup"
              className="border border-[#2e2833] bg-[#2e2833] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1f1b23]"
            >
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-28 sm:px-6 lg:pt-36">
        <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <motion.div {...fadeInUp}>
            <span className="inline-flex rounded-full bg-[#f6d23c] px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-[#2e2833]">
              Built for real travel plans
            </span>
            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Plan around the time you actually arrive and leave.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#756978]">
              TravelMate asks for the details travelers really have: destination, arrival date and time, departure date and time, budget, pace, and interests. Then it builds a trip that fits the window you gave it.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="border border-[#2e2833] bg-[#2e2833] px-6 py-3.5 text-center font-semibold text-white transition hover:bg-[#1f1b23]"
              >
                Create account
              </Link>
              <Link
                href="/login"
                className="border border-[#2e2833] bg-white px-6 py-3.5 text-center font-semibold text-[#2e2833] transition hover:bg-[#fffdf9]"
              >
                Log in
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {trustPoints.map(point => (
                <span key={point} className="border border-[#2e2833] bg-white px-3 py-2 text-sm font-medium text-[#756978]">
                  {point}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            {...fadeInUp}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="border border-[#2e2833] bg-white p-5 shadow-none"
          >
            <div className="flex items-center justify-between border-b border-[#2e2833] pb-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.24em] text-[#a79aaa]">Trip brief</div>
                <div className="mt-1 text-lg font-black tracking-tight">What the planner needs</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 bg-[#5aa7e8]" />
                <span className="h-3 w-3 bg-[#f6d23c]" />
                <span className="h-3 w-3 bg-[#ff9a45]" />
                <span className="h-3 w-3 bg-[#f8e7f1]" />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {[
                ['Destination', 'Search a real place'],
                ['Arrival date/time', 'When you land or arrive'],
                ['Departure date/time', 'When the trip must end'],
                ['Budget', 'What you want to spend'],
                ['Interests', 'Food, nature, museums, nightlife'],
              ].map(([label, value], index) => (
                <div key={label} className="border border-[#2e2833] bg-[#fffdf9] p-4">
                  <div className="flex items-start gap-4">
                    <div
                      className="mt-0.5 h-10 w-10 shrink-0 rounded-2xl"
                      style={{ backgroundColor: tripInputs[index % tripInputs.length].color }}
                    />
                    <div>
                      <div className="text-sm font-bold text-[#2e2833]">{label}</div>
                      <div className="mt-1 text-sm leading-6 text-[#756978]">{value}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 border border-[#2e2833] bg-[#f8e7f1] p-4">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#a65372]">Important</div>
              <p className="mt-2 text-sm leading-6 text-[#2e2833]">
                We do not assume a day starts at 9:00. The itinerary will stay inside the trip window you give us.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="inputs" className="px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeInUp} className="mb-8">
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">What you enter</h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[#756978]">
              The front page is about the traveler, not the software. We keep the inputs short and specific so the trip feels realistic.
            </p>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {tripInputs.map((item, index) => (
              <motion.article
                key={item.title}
                {...fadeInUp}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                className="border border-[#2e2833] bg-white p-5 shadow-none"
              >
                <div className="h-2 w-14 rounded-full" style={{ backgroundColor: item.color }} />
                <h3 className="mt-4 text-xl font-black tracking-tight">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#756978]">{item.body}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section id="outputs" className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <motion.div
              {...fadeInUp}
              className="border border-[#2e2833] bg-white p-6 shadow-none"
            >
              <h2 className="text-3xl font-black tracking-tight">What you get</h2>
              <p className="mt-3 text-base leading-7 text-[#756978]">
                A useful trip page, a saved itinerary, and an assistant that can help when plans change.
              </p>

              <div className="mt-6 space-y-3">
                {tripOutputs.map(point => (
                  <div key={point} className="border border-[#2e2833] bg-[#fffdf9] px-4 py-4 text-sm font-medium text-[#2e2833]">
                    {point}
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              {...fadeInUp}
              transition={{ duration: 0.45, delay: 0.08 }}
              className="border border-[#2e2833] bg-[#fffdf9] p-6 shadow-none"
            >
              <h2 className="text-3xl font-black tracking-tight">Why it feels better to use</h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  'Trip days fit your actual schedule.',
                  'The assistant can adjust pacing after generation.',
                  'Saved trips come from storage, not demo data.',
                  'The design stays readable on mobile first.',
                ].map(item => (
                  <div key={item} className="border border-[#2e2833] bg-white px-4 py-4 text-sm leading-6 text-[#756978]">
                    {item}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="why" className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <motion.div
            {...fadeInUp}
            className="border border-[#2e2833] bg-[#2e2833] p-6 text-white shadow-none sm:p-10"
          >
            <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
              <div>
                <div className="inline-flex rounded-full bg-[#5aa7e8] px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-white">
                  No guesswork
                </div>
                <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">
                  The planner should respect the traveler, not the other way around.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-white">
                  That means asking for arrival and departure times, showing what is actually saved, and keeping the interface calm enough to use on a phone.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Blue', '#5aa7e8'],
                  ['Yellow', '#f6d23c'],
                  ['Orange', '#ff9a45'],
                  ['Pink', '#f8e7f1'],
                ].map(([label, color]) => (
                  <div key={label} className="border border-white bg-[#fbfaf7] p-4">
                    <div className="h-10 w-10 rounded-2xl" style={{ backgroundColor: color }} />
                    <div className="mt-4 text-sm font-semibold text-[#2e2833]">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-[#eadde5] px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-[#756978] sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 TravelMate</p>
          <div className="flex gap-5">
            <Link href="/dashboard" className="transition hover:text-[#2e2833]">
              Dashboard
            </Link>
            <Link href="/dashboard/onboarding" className="transition hover:text-[#2e2833]">
              New trip
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
