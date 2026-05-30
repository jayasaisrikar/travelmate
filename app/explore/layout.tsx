import { AuthGate } from '@/components/auth/AuthGate';

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      {children}
    </AuthGate>
  );
}
