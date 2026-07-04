import type { Metadata } from 'next';
import { AuthGate } from '@/components/auth/AuthGate';

export const metadata: Metadata = {
  title: 'Explore',
  robots: { index: false },
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      {children}
    </AuthGate>
  );
}
