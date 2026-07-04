import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth/AuthForm';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export const metadata: Metadata = {
  title: 'Sign up',
  description: 'Create a free wayflo account and start planning smarter trips.',
};

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F2F2F2] text-[#3F3D56]">
          <LoadingSpinner size="lg" label="Preparing sign-up" />
        </div>
      }
    >
      <AuthForm mode="signup" />
    </Suspense>
  );
}
