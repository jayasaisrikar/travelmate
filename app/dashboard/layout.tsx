import { AuthGate } from '@/components/auth/AuthGate';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="min-h-screen bg-transparent text-[#3a2540]">
        {children}
      </div>
    </AuthGate>
  );
}
