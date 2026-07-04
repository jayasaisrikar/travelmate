import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Your trip',
  robots: { index: false },
};

export default function TripLayout({ children }: { children: React.ReactNode }) {
  return children;
}
