import type { Metadata } from 'next';
import { AuthGate } from '@/components/auth/AuthGate';

export const metadata: Metadata = {
  title: 'Rooms',
  robots: { index: false },
};

export default function RoomsLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
