'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Brand } from '@/components/common/Brand';

const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
  viewport: { once: true, margin: '-24px' },
};

const travelInputs = [
  {
    title: 'Real destination',
    body: 'Search a live place instead of picking from a preset list.',
    color: '#5aa7e8',
  },
  {
    title: 'Arrival and departure',
    body: 'Tell us when the trip starts and ends so we never assume a 9:00 AM day.',
    color: '#f6d23c',
  },
  {
    title: 'Budget and pace',
    body: 'Choose a travel style that matches the time and money you actually have.',
    color: '#ff9a45',
  },
  {
    title: 'Interests',
    body: 'Share a few simple preferences so the route feels personal.',
    color: '#f8e7f1',
  },
];

const tripOutputs = [
  'A trip window that respects your schedule',
  'A real stay and transfer context',
  'A map-backed itinerary that works on mobile',
];

const trustPoints = ['No demo trips', 'No fake start time', 'No hardcoded destinations', 'No placeholder maps'];

const highlights = [
  {
    title: 'Built for phones first',
    body: 'Large touch targets, stacked sections, and short copy make the flow usable on smaller screens.',
  },
  {
    title: 'Less friction',
    body: 'The form asks only for what the planner needs to produce a useful itinerary.',
  },
  {
    title: 'Live data only',
    body: 'Trips are based on live search, lodging, and map data instead of seeded examples.',
  },
];

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll);
    onScroll();

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fbfaf7] text-[#2e2833] selection:bg-[#5aa7e8]/20">
      <nav
        className={`fixed top-0 z-50 w-full transition-all duration-200 ${
          isScrolled ? 'border-b border-[#eadde5] bg-[#fffdf9] py-3' : 'bg-transparent py-4'
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6">
          <Brand href="/" className="shrink-0" />

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="border border-[#2e2833] bg-white px-3 py-2 text-xs font-semibold text-[#2e2833] sm:px-4 sm:text-sm"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="border border-[#2e2833] bg-[#2e2833] px-3 py-2 text-xs font-semibold text-white sm:px-4 sm:text-sm"
            >
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-4 pb-10 pt-24 sm:px-6 sm:pt-28 lg:pt-32">
        <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
          <motion.div {...fadeInUp} className="space-y-5">
            <div className="inline-flex border border-[#2e2833] bg-[#f6d23c] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em]">
              Travel planning that fits real life
            </div>
            <h1 className="max-w-2xl text-4xl font-black leading-[0.96] tracking-tight sm:text-5xl lg:text-6xl">
              Plan around the time you actually arrive and leave.
            </h1>
            <p className="max-w-xl text-base leading-7 text-[#756978] sm:text-lg sm:leading-8">
              TravelMate asks for the real trip window, live destination, budget, and interests, then builds an itinerary that respects the traveler instead of guessing.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="border border-[#2e2833] bg-[#2e2833] px-5 py-3 text-center font-semibold text-white">
                Create account
              </Link>
              <Link href="/login" className="border border-[#2e2833] bg-white px-5 py-3 text-center font-semibold text-[#2e2833]">
                Log in
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {trustPoints.map(point => (
                <div key={point} className="border border-[#2e2833] bg-white px-4 py-3 text-sm font-medium text-[#756978]">
                  {point}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div {...fadeInUp} transition={{ duration: 0.4, delay: 0.05 }} className="border border-[#2e2833] bg-white">
            <div className="flex items-center justify-between border-b border-[#2e2833] px-5 py-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#a79aaa]">Trip brief</div>
                <div className="mt-1 text-lg font-black tracking-tight">What the planner needs</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 bg-[#5aa7e8]" />
                <span className="h-3 w-3 bg-[#f6d23c]" />
                <span className="h-3 w-3 bg-[#ff9a45]" />
              </div>
            </div>

            <div className="space-y-3 p-5">
              {[
                ['Destination', 'Search a real place'],
                ['Arrival date/time', 'When you land or arrive'],
                ['Departure date/time', 'When the trip must end'],
                ['Budget', 'What you want to spend'],
                ['Interests', 'Food, nature, museums, nightlife'],
              ].map(([label, value], index) => (
                <div key={label} className="border border-[#2e2833] bg-[#fffdf9] p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 h-10 w-10 shrink-0 border border-[#2e2833]" style={{ backgroundColor: travelInputs[index % travelInputs.length].color }} />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[#2e2833]">{label}</div>
                      <div className="mt-1 text-sm leading-6 text-[#756978]">{value}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[#2e2833] bg-[#f8e7f1] px-5 py-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#a65372]">Trip window matters</div>
              <p className="mt-2 text-sm leading-6 text-[#2e2833]">
                The itinerary stays inside your arrival and departure time instead of assuming a full free day.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="inputs" className="px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeInUp} className="mb-5">
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">What you enter</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[#756978] sm:text-base">
              Keep the inputs short, live, and specific. That makes the trip easier to generate and easier to use later on a phone.
            </p>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {travelInputs.map((item, index) => (
              <motion.article
                key={item.title}
                {...fadeInUp}
                transition={{ duration: 0.35, delay: index * 0.05 }}
                className="border border-[#2e2833] bg-white p-5"
              >
                <div className="h-2 w-14 border border-[#2e2833]" style={{ backgroundColor: item.color }} />
                <h3 className="mt-4 text-xl font-black tracking-tight">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#756978]">{item.body}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section id="outputs" className="px-4 py-8 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <motion.div {...fadeInUp} className="border border-[#2e2833] bg-white p-5 sm:p-6">
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">What you get</h2>
            <p className="mt-3 text-sm leading-7 text-[#756978] sm:text-base">
              A saved itinerary, a map-backed trip page, and a travel assistant that can help when plans change.
            </p>

            <div className="mt-5 space-y-3">
              {tripOutputs.map(point => (
                <div key={point} className="border border-[#2e2833] bg-[#fffdf9] px-4 py-4 text-sm font-medium text-[#2e2833]">
                  {point}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div {...fadeInUp} transition={{ duration: 0.4, delay: 0.05 }} className="border border-[#2e2833] bg-[#fffdf9] p-5 sm:p-6">
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Why it feels better to use</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {highlights.map(item => (
                <div key={item.title} className="border border-[#2e2833] bg-white p-4">
                  <div className="text-sm font-black">{item.title}</div>
                  <p className="mt-2 text-sm leading-6 text-[#756978]">{item.body}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section id="why" className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeInUp} className="border border-[#2e2833] bg-[#2e2833] p-5 text-white sm:p-8 lg:p-10">
            <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr] lg:items-center">
              <div>
                <div className="inline-flex border border-white bg-[#5aa7e8] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white">
                  No guesswork
                </div>
                <h2 className="mt-4 max-w-xl text-3xl font-black tracking-tight sm:text-4xl">
                  The planner should fit the traveler, not the other way around.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/85 sm:text-base">
                  Arrival and departure times stay in the plan, saved trips stay in storage, and the interface stays calm enough to use from a phone.
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
                    <div className="h-10 w-10 border border-[#2e2833]" style={{ backgroundColor: color }} />
                    <div className="mt-4 text-sm font-semibold text-[#2e2833]">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-[#eadde5] px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-[#756978] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Brand href="/" compact className="shrink-0" />
            <p>© 2026 TravelMate</p>
          </div>
          <div className="flex flex-wrap gap-4">
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
