import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/AuthForm';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#fbf4ea] text-[#3a2540]">
          <div className="border border-[#3a2540] bg-white px-6 py-5">Loading login...</div>
        </div>
      }
    >
      <AuthForm mode="login" />
    </Suspense>
  );
}
