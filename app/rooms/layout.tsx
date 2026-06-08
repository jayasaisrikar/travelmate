import { AuthGate } from '@/components/auth/AuthGate';

export default function RoomsLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
