import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How it works',
  description: 'See how wayflo turns a destination and a few preferences into a complete, day-by-day travel itinerary.',
};

export default function HowItWorksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
