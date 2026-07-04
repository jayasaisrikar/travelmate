import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Why wayflo',
  description: 'Why travelers choose wayflo: smarter routing, realistic timing, and itineraries that actually flow.',
};

export default function WhyWayfloLayout({ children }: { children: React.ReactNode }) {
  return children;
}
