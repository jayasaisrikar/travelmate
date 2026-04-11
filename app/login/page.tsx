import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/AuthForm';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#fbfaf7] text-[#2e2833]">
          <div className="border border-[#2e2833] bg-white px-6 py-5">Loading login...</div>
        </div>
      }
    >
      <AuthForm mode="login" />
    </Suspense>
  );
}
