import { AuthGate } from '@/components/auth/AuthGate';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="min-h-screen bg-transparent text-[#2e2833]">
        {children}
      </div>
    </AuthGate>
  );
}
